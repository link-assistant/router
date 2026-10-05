//! The Claude Code feature matrix (#675).
//!
//! Every Messages feature Claude Code sends — vision (base64 and URL images),
//! PDF and text documents with citations, extended thinking with signed
//! thinking history and tool use, server tools (web search, code execution,
//! tool search with deferred tools), structured outputs, `count_tokens`, and
//! the 1M-context beta header — is sent through the in-process Router.
//!
//! On the native Anthropic surface the upstream must receive exactly what the
//! client sent. Bridged to a Codex subscription, each feature must either be
//! translated (the evidence is asserted on the upstream request) or be
//! refused before any upstream call, with an Anthropic `invalid_request_error`
//! and nothing charged — never silently dropped.

#[path = "support/replay_router.rs"]
mod replay_router;

use link_assistant_router::config::UpstreamProvider;
use replay_router::{BRIDGE_MODEL, Cassette, ReplayRouter, Surface, sse_events};
use serde_json::{Value, json};

const CLAUDE_MODEL: &str = "claude-sonnet-4-5-20250929";
/// A 1x1 transparent PNG.
const PNG: &str = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
/// A minimal PDF header; Router never parses document bytes.
const PDF: &str = "JVBERi0xLjQKJcOkw7zDtsOfCjEgMCBvYmoKPDwvVHlwZS9DYXRhbG9nPj4KZW5kb2JqCnRyYWlsZXIKPDwvUm9vdCAxIDAgUj4+CiUlRU9G";

/// One feature: a name, the Messages request and extra headers.
struct Feature {
    name: &'static str,
    body: Value,
    headers: Vec<(&'static str, &'static str)>,
}

fn user(content: &Value) -> Value {
    json!([{"role": "user", "content": content}])
}

fn features(model: &str) -> Vec<Feature> {
    let base = |messages: Value| json!({"model": model, "max_tokens": 1024, "messages": messages});
    let with = |mut body: Value, key: &str, value: Value| {
        body[key] = value;
        body
    };
    vec![
        Feature {
            name: "vision-base64",
            body: base(user(&json!([
                {"type": "image", "source": {"type": "base64", "media_type": "image/png", "data": PNG}},
                {"type": "text", "text": "What is in this image?"}
            ]))),
            headers: vec![],
        },
        Feature {
            name: "vision-url",
            body: base(user(&json!([
                {"type": "image", "source": {"type": "url", "url": "https://example.com/cat.png"}},
                {"type": "text", "text": "Describe it."}
            ]))),
            headers: vec![],
        },
        Feature {
            name: "pdf-document",
            body: base(user(&json!([
                {"type": "document", "source": {"type": "base64", "media_type": "application/pdf", "data": PDF}, "title": "Report"},
                {"type": "text", "text": "Summarize the report."}
            ]))),
            headers: vec![],
        },
        Feature {
            name: "citations",
            body: base(user(&json!([
                {
                    "type": "document",
                    "source": {"type": "text", "media_type": "text/plain", "data": "The sky is blue."},
                    "title": "Facts",
                    "citations": {"enabled": true}
                },
                {"type": "text", "text": "What colour is the sky? Cite the source."}
            ]))),
            headers: vec![],
        },
        Feature {
            name: "thinking-tool-history",
            body: with(
                base(json!([
                    {"role": "user", "content": "Weather in Paris?"},
                    {"role": "assistant", "content": [
                        {"type": "thinking", "thinking": "I should call the tool.", "signature": "c2lnbmF0dXJlLWZpeHR1cmU="},
                        {"type": "tool_use", "id": "toolu_01", "name": "get_weather", "input": {"city": "Paris"}}
                    ]},
                    {"role": "user", "content": [
                        {"type": "tool_result", "tool_use_id": "toolu_01", "content": "18C, sunny"}
                    ]}
                ])),
                "thinking",
                json!({"type": "enabled", "budget_tokens": 1024}),
            ),
            headers: vec![],
        },
        Feature {
            name: "thinking-effort-tool-history",
            body: with(
                with(
                    base(json!([
                        {"role": "user", "content": "Weather in Paris?"},
                        {"role": "assistant", "content": [
                            {"type": "thinking", "thinking": "I should call the tool.", "signature": "c2lnbmF0dXJlLWZpeHR1cmU="},
                            {"type": "tool_use", "id": "toolu_01", "name": "get_weather", "input": {"city": "Paris"}}
                        ]},
                        {"role": "user", "content": [
                            {"type": "tool_result", "tool_use_id": "toolu_01", "content": "18C, sunny"}
                        ]}
                    ])),
                    "thinking",
                    json!({"type": "adaptive"}),
                ),
                "output_config",
                json!({"effort": "high"}),
            ),
            headers: vec![],
        },
        Feature {
            name: "thinking-effort",
            body: with(
                with(
                    base(user(&json!("Think, then answer."))),
                    "thinking",
                    json!({"type": "adaptive"}),
                ),
                "output_config",
                json!({"effort": "high"}),
            ),
            headers: vec![],
        },
        Feature {
            name: "tool-use-history",
            body: base(json!([
                {"role": "user", "content": "Weather in Paris?"},
                {"role": "assistant", "content": [
                    {"type": "tool_use", "id": "toolu_01", "name": "get_weather", "input": {"city": "Paris"}}
                ]},
                {"role": "user", "content": [
                    {"type": "tool_result", "tool_use_id": "toolu_01", "content": "18C, sunny"}
                ]}
            ])),
            headers: vec![],
        },
        Feature {
            name: "structured-output-config",
            body: with(
                base(user(&json!("Give me a city."))),
                "output_config",
                json!({"format": {
                    "type": "json_schema",
                    "schema": {
                        "type": "object",
                        "properties": {"city": {"type": "string"}},
                        "required": ["city"],
                        "additionalProperties": false
                    }
                }}),
            ),
            headers: vec![],
        },
        Feature {
            name: "web-search-server-tool",
            body: with(
                base(user(&json!("Latest Rust release?"))),
                "tools",
                json!([{"type": "web_search_20250305", "name": "web_search", "max_uses": 3}]),
            ),
            headers: vec![],
        },
        Feature {
            name: "code-execution-server-tool",
            body: with(
                base(user(&json!("Compute 2**64."))),
                "tools",
                json!([{"type": "code_execution_20250825", "name": "code_execution"}]),
            ),
            headers: vec![("anthropic-beta", "code-execution-2025-08-25")],
        },
        Feature {
            name: "tool-search-deferred-tools",
            body: with(
                base(user(&json!("Find the weather tool."))),
                "tools",
                json!([
                    {"type": "tool_search_tool_regex_20251119", "name": "tool_search_tool_regex"},
                    {
                        "name": "get_weather",
                        "description": "Weather for a city",
                        "input_schema": {"type": "object", "properties": {"city": {"type": "string"}}},
                        "defer_loading": true
                    }
                ]),
            ),
            headers: vec![("anthropic-beta", "advanced-tool-use-2025-11-20")],
        },
        Feature {
            name: "structured-output",
            body: with(
                base(user(&json!("Give me a city."))),
                "output_format",
                json!({
                    "type": "json_schema",
                    "schema": {
                        "type": "object",
                        "properties": {"city": {"type": "string"}},
                        "required": ["city"],
                        "additionalProperties": false
                    }
                }),
            ),
            headers: vec![("anthropic-beta", "structured-outputs-2025-11-13")],
        },
        Feature {
            name: "context-1m",
            body: base(user(&json!("Hello."))),
            headers: vec![("anthropic-beta", "context-1m-2025-08-07")],
        },
    ]
}

/// Server-Sent Events carrying `events`, each named by its `type`.
fn sse_body(events: &[Value]) -> String {
    use std::fmt::Write as _;
    let mut body = String::new();
    for event in events {
        let kind = event["type"].as_str().unwrap();
        write!(body, "event: {kind}\ndata: {event}\n\n").unwrap();
    }
    body
}

fn anthropic_reply() -> Cassette {
    Cassette::json(
        "anthropic/feature-reply",
        200,
        &json!({
            "id": "msg_feature", "type": "message", "role": "assistant", "model": CLAUDE_MODEL,
            "content": [{"type": "text", "text": "ok"}],
            "stop_reason": "end_turn", "stop_sequence": null,
            "usage": {"input_tokens": 10, "output_tokens": 2}
        }),
    )
}

fn codex_reply() -> Cassette {
    let response = json!({
        "id": "resp_feature", "object": "response", "status": "completed", "model": BRIDGE_MODEL,
        "output": [{"type": "message", "id": "msg_1", "role": "assistant", "status": "completed",
            "content": [{"type": "output_text", "text": "ok", "annotations": []}]}],
        "usage": {"input_tokens": 10, "output_tokens": 2, "total_tokens": 12}
    });
    let events = [
        json!({"type": "response.created", "response": {"id": "resp_feature", "model": BRIDGE_MODEL, "status": "in_progress", "output": []}}),
        json!({"type": "response.output_item.added", "output_index": 0, "item": {"type": "message", "id": "msg_1", "role": "assistant", "content": []}}),
        json!({"type": "response.output_text.delta", "output_index": 0, "content_index": 0, "item_id": "msg_1", "delta": "ok"}),
        json!({"type": "response.output_item.done", "output_index": 0, "item": response["output"][0]}),
        json!({"type": "response.completed", "response": response}),
    ];
    let body = sse_body(&events);
    Cassette::sse("openai_responses/feature-reply", body)
}

async fn send(
    router: &ReplayRouter,
    feature: &Feature,
    path_surface: Surface,
) -> (u16, Value, String) {
    let (token, id) = router.issue(path_surface.client(), Some(1_000_000));
    let mut request = router.post(path_surface, &token, &feature.body);
    for (name, value) in &feature.headers {
        request = request.header(*name, *value);
    }
    let response = request.send().await.expect("send feature request");
    let status = response.status().as_u16();
    let text = response.text().await.expect("read feature response");
    let body = serde_json::from_str(&text).unwrap_or(Value::Null);
    (status, body, id)
}

#[tokio::test]
async fn native_surface_forwards_every_feature_exactly() {
    let router = ReplayRouter::start(UpstreamProvider::Anthropic).await;
    for feature in features(CLAUDE_MODEL) {
        router.replay([anthropic_reply()]);
        router.clear_requests();
        let (status, body, _) = send(&router, &feature, Surface::AnthropicMessages).await;
        assert_eq!(status, 200, "{}: {body}", feature.name);
        let upstream = router.requests();
        assert_eq!(upstream.len(), 1, "{}", feature.name);
        let upstream = &upstream[0];
        assert!(
            upstream.path.starts_with("/v1/messages"),
            "{}: {}",
            feature.name,
            upstream.path
        );
        assert_eq!(
            upstream.body, feature.body,
            "{}: body must pass through unchanged",
            feature.name
        );
        for (name, value) in &feature.headers {
            let sent = upstream
                .headers
                .get_all(*name)
                .iter()
                .filter_map(|value| value.to_str().ok())
                .collect::<Vec<_>>()
                .join(",");
            assert!(
                sent.split(',').any(|part| part.trim() == *value),
                "{}: upstream {name} {sent:?} must keep {value}",
                feature.name
            );
        }
    }
}

#[tokio::test]
async fn native_count_tokens_forwards_every_feature_exactly() {
    let router = ReplayRouter::start(UpstreamProvider::Anthropic).await;
    for feature in features(CLAUDE_MODEL) {
        let mut feature = feature;
        feature.body.as_object_mut().unwrap().remove("max_tokens");
        router.replay([Cassette::json("count", 200, &json!({"input_tokens": 1234}))]);
        router.clear_requests();
        let (status, body, id) = send(&router, &feature, Surface::AnthropicCountTokens).await;
        assert_eq!(status, 200, "{}: {body}", feature.name);
        assert_eq!(body, json!({"input_tokens": 1234}), "{}", feature.name);
        let upstream = router.requests();
        assert_eq!(upstream.len(), 1, "{}", feature.name);
        assert!(upstream[0].path.starts_with("/v1/messages/count_tokens"));
        assert_eq!(upstream[0].body, feature.body, "{}", feature.name);
        // Counting is not inference: nothing is charged.
        assert_eq!(router.used_tokens(&id), (0, 0), "{}", feature.name);
    }
}

#[tokio::test]
async fn native_stream_preserves_thinking_signatures_and_citations() {
    let router = ReplayRouter::start(UpstreamProvider::Anthropic).await;
    let events = [
        json!({"type": "message_start", "message": {"id": "msg_1", "type": "message", "role": "assistant", "model": CLAUDE_MODEL, "content": [], "stop_reason": null, "usage": {"input_tokens": 10, "output_tokens": 1}}}),
        json!({"type": "content_block_start", "index": 0, "content_block": {"type": "thinking", "thinking": "", "signature": ""}}),
        json!({"type": "content_block_delta", "index": 0, "delta": {"type": "thinking_delta", "thinking": "Cite it."}}),
        json!({"type": "content_block_delta", "index": 0, "delta": {"type": "signature_delta", "signature": "c2lnbmVkLXRoaW5raW5n"}}),
        json!({"type": "content_block_stop", "index": 0}),
        json!({"type": "content_block_start", "index": 1, "content_block": {"type": "text", "text": ""}}),
        json!({"type": "content_block_delta", "index": 1, "delta": {"type": "citations_delta", "citation": {"type": "char_location", "cited_text": "The sky is blue.", "document_index": 0, "document_title": "Facts", "start_char_index": 0, "end_char_index": 16}}}),
        json!({"type": "content_block_delta", "index": 1, "delta": {"type": "text_delta", "text": "Blue."}}),
        json!({"type": "content_block_stop", "index": 1}),
        json!({"type": "message_delta", "delta": {"stop_reason": "end_turn"}, "usage": {"output_tokens": 9}}),
        json!({"type": "message_stop"}),
    ];
    let sse = sse_body(&events);
    router.replay([Cassette::sse("anthropic/citations-stream", sse)]);
    let mut feature = features(CLAUDE_MODEL)
        .into_iter()
        .find(|feature| feature.name == "citations")
        .unwrap();
    feature.body["stream"] = json!(true);
    feature.body["thinking"] = json!({"type": "enabled", "budget_tokens": 1024});
    let (token, id) = router.issue(Surface::AnthropicMessages.client(), Some(1_000_000));
    let response = router
        .post(Surface::AnthropicMessages, &token, &feature.body)
        .send()
        .await
        .unwrap();
    assert_eq!(response.status(), 200);
    let received = sse_events(&response.text().await.unwrap());
    assert_eq!(
        received, events,
        "native stream must reach the client unchanged"
    );
    assert_eq!(router.used_tokens(&id), (19, 0));
}

/// What bridging a feature to a Codex subscription must do.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum Bridged {
    /// Translated; the upstream request must contain this marker.
    Translated(&'static str),
    /// Refused before any upstream call.
    Refused,
}

fn bridged_expectation(name: &str) -> Bridged {
    match name {
        "vision-base64" => Bridged::Translated(r#""image_url":"data:image/png;base64,"#),
        "vision-url" => Bridged::Translated(r#""image_url":"https://example.com/cat.png""#),
        "pdf-document" => Bridged::Translated(r#""file_data":"data:application/pdf;base64,"#),
        "thinking-effort" => Bridged::Translated(r#""reasoning":{"effort":"high"}"#),
        "tool-use-history" => Bridged::Translated(r#""type":"function_call_output""#),
        "web-search-server-tool" => Bridged::Translated(r#""tools":[{"type":"web_search"}]"#),
        "structured-output-config" => Bridged::Translated(r#""type":"json_schema""#),
        // The beta header is Anthropic-only; the turn itself translates.
        "context-1m" => Bridged::Translated(r#""text":"Hello.""#),
        // Signed thinking history only the issuing vendor can continue,
        // thinking without an effort, document citations, Anthropic-only
        // server tools and the legacy `output_format` field have no lossless
        // Responses form.
        "citations"
        | "thinking-tool-history"
        | "thinking-effort-tool-history"
        | "code-execution-server-tool"
        | "tool-search-deferred-tools"
        | "structured-output" => Bridged::Refused,
        other => panic!("feature {other} has no bridged expectation"),
    }
}

#[tokio::test]
async fn codex_bridge_translates_or_refuses_every_feature_cleanly() {
    let router = ReplayRouter::start(UpstreamProvider::Codex).await;
    let mut report = Vec::new();
    for feature in features(BRIDGE_MODEL) {
        router.replay([codex_reply()]);
        router.clear_requests();
        let (status, body, id) = send(&router, &feature, Surface::AnthropicMessages).await;
        let upstream = router.requests();
        let outcome = match bridged_expectation(feature.name) {
            Bridged::Translated(marker) => {
                assert_eq!(status, 200, "{}: {body}", feature.name);
                assert_eq!(upstream.len(), 1, "{}", feature.name);
                let sent = String::from_utf8_lossy(&upstream[0].raw);
                assert!(
                    sent.contains(marker),
                    "{}: upstream request must carry {marker:?}: {sent}",
                    feature.name
                );
                assert_eq!(body["content"][0]["text"], "ok", "{}", feature.name);
                assert_eq!(router.used_tokens(&id), (12, 0), "{}", feature.name);
                "translated"
            }
            Bridged::Refused => {
                assert_eq!(status, 400, "{}: {body}", feature.name);
                assert_eq!(body["type"], "error", "{}", feature.name);
                assert_eq!(
                    body["error"]["type"], "invalid_request_error",
                    "{}",
                    feature.name
                );
                assert!(
                    upstream.is_empty(),
                    "{}: a refused feature must not reach the vendor",
                    feature.name
                );
                assert_eq!(router.used_tokens(&id), (0, 0), "{}", feature.name);
                "refused"
            }
        };
        report.push(format!("{}: {outcome}", feature.name));
    }
    println!("{}", report.join("\n"));
}

#[tokio::test]
async fn codex_bridge_count_tokens_never_runs_inference() {
    let router = ReplayRouter::start(UpstreamProvider::Codex).await;
    for feature in features(BRIDGE_MODEL) {
        let mut feature = feature;
        feature.body.as_object_mut().unwrap().remove("max_tokens");
        router.replay([codex_reply()]);
        router.clear_requests();
        let (status, body, id) = send(&router, &feature, Surface::AnthropicCountTokens).await;
        // Codex has no counting endpoint; Router says so instead of
        // estimating or spending an inference on it.
        assert_eq!(status, 503, "{}: {body}", feature.name);
        assert_eq!(body["type"], "error", "{}", feature.name);
        assert!(
            body["error"]["message"]
                .as_str()
                .is_some_and(|message| message.contains("token counting is unavailable")),
            "{}: {body}",
            feature.name
        );
        assert!(router.requests().is_empty(), "{}", feature.name);
        assert_eq!(router.used_tokens(&id), (0, 0), "{}", feature.name);
    }
}
