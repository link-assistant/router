//! Recorded vendor exchanges replayed through every client surface (#671).
//!
//! Each cassette under `tests/fixtures/vendor/` is a real vendor response
//! shape (SSE event order, `ping`s, thinking signatures, cache usage fields,
//! error envelopes). A stub upstream replays it byte for byte while a client
//! talks to the in-process Router on each surface that can reach that vendor.
//! The tests assert the translated output and, above all, that the token's
//! budget is charged the same amount no matter which surface the client used.
//!
//! Re-record with `rust-script scripts/record-vendor-fixtures.rs` (see
//! `tests/fixtures/vendor/README.md`).

#[path = "support/replay_router.rs"]
mod replay_router;

use link_assistant_router::config::UpstreamProvider;
use replay_router::{
    BRIDGE_MODEL, Cassette, ReplayRouter, Surface, sse_events, streamed_text, vendor_fixture_root,
};
use serde_json::{Value, json};

/// The model the Anthropic cassettes were served by; asking for it keeps
/// the substitution guard satisfied.
const CLAUDE_MODEL: &str = "claude-sonnet-4-5-20250929";
const PROMPT: &str = "What's the weather in Paris?";

/// The request a client of `surface` sends for a cassette.
fn client_body(surface: Surface, cassette: &Cassette, model: &str, stream: bool) -> Value {
    match surface {
        Surface::AnthropicMessages if cassette.name.starts_with("anthropic/") => {
            let mut body = cassette.document["request"].clone();
            body["model"] = json!(model);
            body
        }
        Surface::AnthropicMessages | Surface::AnthropicCountTokens => json!({
            "model": model, "max_tokens": 256, "stream": stream,
            "messages": [{"role": "user", "content": PROMPT}],
        }),
        Surface::OpenAIChat => {
            let mut body = json!({
                "model": model, "stream": stream,
                "messages": [{"role": "user", "content": PROMPT}],
            });
            if stream {
                body["stream_options"] = json!({"include_usage": true});
            }
            body
        }
        Surface::OpenAIResponses | Surface::CodexResponses => json!({
            "model": model, "stream": stream, "store": false, "input": PROMPT,
        }),
    }
}

struct Outcome {
    status: u16,
    body: String,
    used: u64,
    reserved: u64,
}

async fn run(
    router: &ReplayRouter,
    surface: Surface,
    cassette: &Cassette,
    model: &str,
    stream: bool,
) -> Outcome {
    router.replay([cassette.clone()]);
    let (token, id) = router.issue(surface.client(), Some(1_000_000));
    let body = client_body(surface, cassette, model, stream);
    let response = router
        .post(surface, &token, &body)
        .send()
        .await
        .expect("send replay request");
    let status = response.status().as_u16();
    let body = response.text().await.expect("read replay response");
    // Settlement runs when the response body completes; give the spawned
    // settlement a moment to persist.
    let mut used = router.used_tokens(&id);
    for _ in 0..50 {
        if used.1 == 0 {
            break;
        }
        tokio::time::sleep(std::time::Duration::from_millis(20)).await;
        used = router.used_tokens(&id);
    }
    Outcome {
        status,
        body,
        used: used.0,
        reserved: used.1,
    }
}

fn assert_charged(outcome: &Outcome, cassette: &Cassette, surface: Surface) {
    let expected = cassette.expect()["charged_tokens"]
        .as_u64()
        .expect("cassette declares charged_tokens");
    assert_eq!(
        outcome.status, 200,
        "{} on {surface:?}: {}",
        cassette.name, outcome.body
    );
    assert_eq!(
        (outcome.used, outcome.reserved),
        (expected, 0),
        "{} on {surface:?} must charge every vendor-reported token, cached ones included",
        cassette.name
    );
}

/// Text a non-streamed response carries, in any client dialect.
fn json_text(body: &Value) -> String {
    if let Some(content) = body["content"].as_array() {
        return content
            .iter()
            .filter_map(|block| block["text"].as_str())
            .collect();
    }
    if let Some(choices) = body["choices"].as_array() {
        return choices
            .iter()
            .filter_map(|choice| choice["message"]["content"].as_str())
            .collect();
    }
    body["output"]
        .as_array()
        .into_iter()
        .flatten()
        .flat_map(|item| item["content"].as_array().cloned().unwrap_or_default())
        .filter_map(|part| part["text"].as_str().map(str::to_string))
        .collect()
}

fn assert_text(outcome: &Outcome, cassette: &Cassette, stream: bool, surface: Surface) {
    let expected = cassette.expect()["text"].as_str().expect("expected text");
    let text = if stream {
        streamed_text(&sse_events(&outcome.body))
    } else {
        json_text(&serde_json::from_str(&outcome.body).expect("JSON response"))
    };
    assert_eq!(
        text, expected,
        "{} on {surface:?}: {}",
        cassette.name, outcome.body
    );
}

#[tokio::test]
async fn anthropic_stream_with_thinking_tool_and_cache_is_identical_on_every_surface() {
    let cassette = Cassette::load("anthropic/messages-stream-thinking-tool-cache.json");
    let router = ReplayRouter::start(UpstreamProvider::Anthropic).await;

    // Native surface: the upstream request is the client request, and the
    // client receives the vendor's events — signature included — verbatim.
    let outcome = run(
        &router,
        Surface::AnthropicMessages,
        &cassette,
        CLAUDE_MODEL,
        true,
    )
    .await;
    assert_charged(&outcome, &cassette, Surface::AnthropicMessages);
    assert_text(&outcome, &cassette, true, Surface::AnthropicMessages);
    let upstream = router.requests().pop().expect("upstream request");
    let mut sent = cassette.document["request"].clone();
    sent["model"] = json!(CLAUDE_MODEL);
    assert_eq!(
        upstream.body, sent,
        "native surface must not rewrite the body"
    );
    let events = sse_events(&outcome.body);
    assert!(events.iter().any(|event| {
        event["delta"]["type"] == "signature_delta"
            && event["delta"]["signature"]
                .as_str()
                .is_some_and(|signature| !signature.is_empty())
    }));
    let tool_json: String = events
        .iter()
        .filter_map(|event| event["delta"]["partial_json"].as_str())
        .collect();
    assert_eq!(
        serde_json::from_str::<Value>(&tool_json).expect("tool arguments"),
        cassette.expect()["tool_arguments"]
    );

    // Bridged surfaces translate the same bytes and charge the same tokens.
    for surface in [Surface::OpenAIChat, Surface::OpenAIResponses] {
        let outcome = run(&router, surface, &cassette, CLAUDE_MODEL, true).await;
        assert_charged(&outcome, &cassette, surface);
        assert_text(&outcome, &cassette, true, surface);
        let events = sse_events(&outcome.body);
        let (name, arguments) = streamed_tool_call(&events);
        assert_eq!(name, "get_weather", "{surface:?}");
        assert_eq!(
            serde_json::from_str::<Value>(&arguments).expect("tool arguments"),
            cassette.expect()["tool_arguments"],
            "{surface:?}"
        );
    }
}

/// The function name and concatenated arguments of a translated tool call.
fn streamed_tool_call(events: &[Value]) -> (String, String) {
    let mut name = String::new();
    let mut arguments = String::new();
    for event in events {
        for choice in event["choices"].as_array().into_iter().flatten() {
            for call in choice["delta"]["tool_calls"]
                .as_array()
                .into_iter()
                .flatten()
            {
                if let Some(part) = call["function"]["name"].as_str() {
                    name.push_str(part);
                }
                if let Some(part) = call["function"]["arguments"].as_str() {
                    arguments.push_str(part);
                }
            }
        }
        if event["type"] == "response.output_item.done" && event["item"]["type"] == "function_call"
        {
            name = event["item"]["name"].as_str().unwrap_or_default().into();
            arguments = event["item"]["arguments"]
                .as_str()
                .unwrap_or_default()
                .into();
        }
    }
    (name, arguments)
}

#[tokio::test]
async fn anthropic_cache_read_without_streaming_charges_equally_everywhere() {
    let cassette = Cassette::load("anthropic/messages-cache-read.json");
    let router = ReplayRouter::start(UpstreamProvider::Anthropic).await;
    for surface in [
        Surface::AnthropicMessages,
        Surface::OpenAIChat,
        Surface::OpenAIResponses,
    ] {
        let outcome = run(&router, surface, &cassette, CLAUDE_MODEL, false).await;
        assert_charged(&outcome, &cassette, surface);
        assert_text(&outcome, &cassette, false, surface);
    }
}

#[tokio::test]
async fn anthropic_error_envelopes_keep_status_and_charge_nothing() {
    let router = ReplayRouter::start(UpstreamProvider::Anthropic).await;
    for name in [
        "anthropic/error-400-invalid-request-error.json",
        "anthropic/error-429-rate-limit-error.json",
        "anthropic/error-500-api-error.json",
        "anthropic/error-529-overloaded-error.json",
    ] {
        let cassette = Cassette::load(name);
        let expected_status = cassette.expect()["status"].as_u64().expect("status");
        let expected_type = cassette.expect()["error_type"].as_str().expect("type");
        for surface in [
            Surface::AnthropicMessages,
            Surface::OpenAIChat,
            Surface::OpenAIResponses,
        ] {
            let outcome = run(&router, surface, &cassette, CLAUDE_MODEL, false).await;
            assert_eq!(
                u64::from(outcome.status),
                expected_status,
                "{name} on {surface:?}: {}",
                outcome.body
            );
            assert_eq!(
                (outcome.used, outcome.reserved),
                (0, 0),
                "{name} on {surface:?} must release its reservation"
            );
            let body: Value = serde_json::from_str(&outcome.body).expect("JSON error body");
            let error_type = body["error"]["type"].as_str().unwrap_or_default();
            if surface == Surface::AnthropicMessages {
                assert_eq!(body["type"], "error", "{name}");
                assert_eq!(error_type, expected_type, "{name}");
            } else {
                assert!(!error_type.is_empty(), "{name} on {surface:?}: {body}");
            }
        }
        if expected_status == 429 {
            // The native surface keeps the vendor's back-off hint.
            router.replay([cassette.clone()]);
            let (token, _) = router.issue(Surface::AnthropicMessages.client(), None);
            let body = client_body(Surface::AnthropicMessages, &cassette, CLAUDE_MODEL, false);
            let response = router
                .post(Surface::AnthropicMessages, &token, &body)
                .send()
                .await
                .expect("send 429 replay");
            assert_eq!(
                response
                    .headers()
                    .get("retry-after")
                    .and_then(|value| value.to_str().ok()),
                Some("17")
            );
        }
    }
}

#[tokio::test]
async fn codex_responses_stream_with_cached_input_charges_equally_everywhere() {
    let cassette = Cassette::load("openai_responses/responses-stream-cached.json");
    let router = ReplayRouter::start(UpstreamProvider::Codex).await;
    for surface in [
        Surface::CodexResponses,
        Surface::OpenAIChat,
        Surface::OpenAIResponses,
    ] {
        let outcome = run(&router, surface, &cassette, BRIDGE_MODEL, true).await;
        assert_charged(&outcome, &cassette, surface);
        assert_text(&outcome, &cassette, true, surface);
    }

    // The recorded stream opens with a `reasoning` item whose encrypted state
    // only the producing account can read. The Anthropic surface fails closed
    // on it instead of inventing a thinking signature — and the tokens the
    // vendor already spent are still charged.
    let outcome = run(
        &router,
        Surface::AnthropicMessages,
        &cassette,
        BRIDGE_MODEL,
        true,
    )
    .await;
    assert_charged(&outcome, &cassette, Surface::AnthropicMessages);
    let events = sse_events(&outcome.body);
    let error = events
        .iter()
        .find(|event| event["type"] == "error")
        .expect("reasoning output fails the Anthropic stream");
    assert!(
        error["error"]["message"]
            .as_str()
            .is_some_and(|message| message.contains("reasoning")),
        "{error}"
    );
    assert!(!outcome.body.contains("encrypted_content"));
}

#[tokio::test]
async fn openai_compatible_chat_with_cached_prompt_charges_equally() {
    let router = ReplayRouter::start(UpstreamProvider::OpenAICompatible).await;
    for (name, stream) in [
        ("openai_chat/chat-cached.json", false),
        ("openai_chat/chat-stream-cached.json", true),
    ] {
        let cassette = Cassette::load(name);
        let outcome = run(
            &router,
            Surface::OpenAIChat,
            &cassette,
            BRIDGE_MODEL,
            stream,
        )
        .await;
        assert_charged(&outcome, &cassette, Surface::OpenAIChat);
        assert_text(&outcome, &cassette, stream, Surface::OpenAIChat);
    }
}

/// Recorded cassettes must never carry a credential or a live identifier.
#[test]
fn cassettes_are_scrubbed() {
    let forbidden = [
        "sk-ant-",
        "sk-proj-",
        "Bearer ",
        "ya29.",
        "AIza",
        "x-api-key\":\"sk",
        "anthropic-organization-id",
        "openai-organization",
        "set-cookie",
    ];
    let mut checked = 0;
    for dir in std::fs::read_dir(vendor_fixture_root()).expect("vendor fixtures") {
        let dir = dir.expect("fixture dir").path();
        if !dir.is_dir() {
            continue;
        }
        for file in std::fs::read_dir(&dir).expect("vendor dir") {
            let path = file.expect("fixture").path();
            if path.extension().and_then(|ext| ext.to_str()) != Some("json") {
                continue;
            }
            let text = std::fs::read_to_string(&path).expect("read cassette");
            let lower = text.to_ascii_lowercase();
            for needle in forbidden {
                assert!(
                    !lower.contains(&needle.to_ascii_lowercase()),
                    "{} contains {needle:?}",
                    path.display()
                );
            }
            let document: Value = serde_json::from_str(&text).expect("cassette JSON");
            assert_eq!(
                document["schema"],
                "link-assistant-router/vendor-cassette/v1",
                "{}",
                path.display()
            );
            assert_eq!(
                document["request"]["model"].as_str().unwrap_or("{model}"),
                "{model}"
            );
            checked += 1;
        }
    }
    assert!(
        checked >= 10,
        "expected the recorded cassette set, saw {checked}"
    );
}
