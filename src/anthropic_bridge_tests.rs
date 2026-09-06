//! Unit tests for [`crate::anthropic_bridge`].
//!
//! Kept in their own file so `anthropic_bridge.rs` stays under the 1000-line
//! ceiling enforced by `scripts/check-file-size.rs`.

use serde_json::json;

use crate::anthropic_bridge::*;
use crate::config::UpstreamProvider;
use axum::body::Body;
use axum::http::{HeaderMap, HeaderValue, StatusCode};
use axum::response::Response;

#[test]
fn translates_system_and_messages() {
    let body = json!({
        "model": "claude-sonnet-4-5",
        "max_tokens": 128,
        "system": "be terse",
        "messages": [
            {"role": "user", "content": "hi"},
            {"role": "assistant", "content": [{"type": "text", "text": "hello"}]}
        ],
        "temperature": 0.2,
        "stop_sequences": ["STOP"],
        "stream": true
    });
    let chat = anthropic_to_chat_request(&body, "gpt-5-codex");
    assert_eq!(chat["model"], "gpt-5-codex");
    assert_eq!(chat["max_tokens"], 128);
    assert_eq!(chat["messages"][0]["role"], "system");
    assert_eq!(chat["messages"][0]["content"], "be terse");
    assert_eq!(chat["messages"][1]["content"], "hi");
    assert_eq!(chat["messages"][2]["content"], "hello");
    assert_eq!(chat["temperature"], 0.2);
    assert_eq!(chat["stop"][0], "STOP");
    assert_eq!(chat["stream"], true);
}

#[test]
fn system_block_array_is_joined() {
    let body = json!({
        "system": [{"type": "text", "text": "a"}, {"type": "text", "text": "b"}],
        "messages": []
    });
    let chat = anthropic_to_chat_request(&body, "m");
    assert_eq!(chat["messages"][0]["content"], "a\n\nb");
}

#[test]
fn defaults_max_tokens_when_absent() {
    let chat = anthropic_to_chat_request(&json!({"messages": []}), "m");
    assert_eq!(chat["max_tokens"], DEFAULT_MAX_TOKENS);
}

#[test]
fn translates_tools_and_tool_choice() {
    let body = json!({
        "messages": [],
        "tools": [{
            "name": "get_time",
            "description": "current time",
            "input_schema": {"type": "object", "properties": {"tz": {"type": "string"}}}
        }],
        "tool_choice": {"type": "tool", "name": "get_time"}
    });
    let chat = anthropic_to_chat_request(&body, "m");
    assert_eq!(chat["tools"][0]["type"], "function");
    assert_eq!(chat["tools"][0]["function"]["name"], "get_time");
    assert_eq!(
        chat["tools"][0]["function"]["parameters"]["properties"]["tz"]["type"],
        "string"
    );
    assert_eq!(chat["tool_choice"]["function"]["name"], "get_time");
}

#[test]
fn anthropic_web_search_stays_server_side_for_codex_projection() {
    let body = json!({
        "messages": [{"role": "user", "content": "search"}],
        "tools": [{"type": "web_search_20250305", "name": "web_search", "max_uses": 2}]
    });
    let chat = anthropic_to_chat_request(&body, "gpt-5.6-sol");
    assert_eq!(chat["tools"][0]["type"], "web_search");
    let responses = crate::responses::chat_completion_to_responses(&chat);
    assert_eq!(responses["tools"][0]["type"], "web_search");
    assert!(responses["tools"][0].get("function").is_none());

    let translated = openai_json_to_anthropic_message(
        &json!({
            "id": "resp_1",
            "model": "gpt-5.6-sol",
            "status": "completed",
            "output": [{
                "type": "web_search_call",
                "id": "ws_1",
                "status": "completed",
                "action": {"query": "Rust"}
            }],
            "usage": {"input_tokens": 2, "output_tokens": 3}
        }),
        "gpt-5.6-sol",
    );
    assert_eq!(translated["content"][0]["type"], "server_tool_use");
    assert_eq!(translated["content"][1]["type"], "web_search_tool_result");
    assert_eq!(
        translated["usage"]["server_tool_use"]["web_search_requests"],
        1
    );
}

#[test]
fn tool_choice_any_becomes_required() {
    let chat = anthropic_to_chat_request(
        &json!({"messages": [], "tool_choice": {"type": "any"}}),
        "m",
    );
    assert_eq!(chat["tool_choice"], "required");
}

#[test]
fn malformed_or_unknown_tools_fail_validation_instead_of_disappearing() {
    for (body, expected) in [
        (
            json!({"tools":[{"input_schema":{}}]}),
            "missing a string name",
        ),
        (
            json!({"tools":[{"type":"computer_20990101","name":"computer"}]}),
            "unsupported Anthropic tool type",
        ),
        (
            json!({"tool_choice":{"type":"future"}}),
            "unsupported Anthropic tool_choice type",
        ),
    ] {
        assert!(
            untranslatable_anthropic_tool(&body)
                .as_deref()
                .is_some_and(|reason| reason.contains(expected)),
            "{body} must fail with {expected}"
        );
    }
}

#[test]
fn translates_tool_use_and_tool_result_blocks() {
    let body = json!({
        "messages": [
            {"role": "assistant", "content": [
                {"type": "text", "text": "checking"},
                {"type": "tool_use", "id": "toolu_1", "name": "get_time", "input": {"tz": "UTC"}}
            ]},
            {"role": "user", "content": [
                {"type": "tool_result", "tool_use_id": "toolu_1", "content": "12:00"}
            ]}
        ]
    });
    let chat = anthropic_to_chat_request(&body, "m");
    let messages = chat["messages"].as_array().unwrap();
    assert_eq!(messages.len(), 2);
    assert_eq!(messages[0]["role"], "assistant");
    assert_eq!(messages[0]["tool_calls"][0]["id"], "toolu_1");
    assert_eq!(
        messages[0]["tool_calls"][0]["function"]["arguments"],
        "{\"tz\":\"UTC\"}"
    );
    assert_eq!(messages[1]["role"], "tool");
    assert_eq!(messages[1]["tool_call_id"], "toolu_1");
    assert_eq!(messages[1]["content"], "12:00");
}

#[test]
fn codex_projection_uses_native_responses_tool_items() {
    let body = json!({
        "tools": [{
            "name": "get_time",
            "description": "current time",
            "input_schema": {"type": "object", "properties": {"tz": {"type": "string"}}}
        }],
        "messages": [
            {"role": "assistant", "content": [
                {"type": "tool_use", "id": "toolu_1", "name": "get_time", "input": {"tz": "UTC"}}
            ]},
            {"role": "user", "content": [
                {"type": "tool_result", "tool_use_id": "toolu_1", "content": "12:00"}
            ]}
        ]
    });

    let chat = anthropic_to_chat_request(&body, "gpt-5.6-sol");
    let responses = crate::responses::chat_completion_to_responses(&chat);

    assert_eq!(responses["tools"][0]["name"], "get_time");
    assert!(responses["tools"][0].get("function").is_none());
    assert_eq!(responses["input"][0]["type"], "function_call");
    assert_eq!(responses["input"][0]["call_id"], "toolu_1");
    assert_eq!(responses["input"][1]["type"], "function_call_output");
    assert_eq!(responses["input"][1]["call_id"], "toolu_1");
}

#[test]
fn translated_routes_reject_thinking_blocks_without_exposing_them() {
    let body = json!({
        "messages": [{"role": "assistant", "content": [
            {"type": "thinking", "thinking": "secret"},
            {"type": "text", "text": "visible"}
        ]}]
    });
    let error = crate::bridge_request::validate_anthropic_request(
        &body,
        crate::bridge_request::BridgeTarget::Chat,
    )
    .unwrap_err();
    assert!(!error.contains("secret"));
}

#[test]
fn translates_base64_images() {
    let body = json!({
        "messages": [{"role": "user", "content": [
            {"type": "image", "source": {"type": "base64", "media_type": "image/png", "data": "AAA"}},
            {"type": "text", "text": "what is this"}
        ]}]
    });
    let chat = anthropic_to_chat_request(&body, "m");
    let parts = chat["messages"][0]["content"].as_array().unwrap();
    assert_eq!(parts[0]["image_url"]["url"], "data:image/png;base64,AAA");
    assert_eq!(parts[1]["text"], "what is this");
}

#[test]
fn chat_completion_becomes_anthropic_message() {
    let payload = json!({
        "id": "chatcmpl-1",
        "object": "chat.completion",
        "choices": [{
            "index": 0,
            "message": {"role": "assistant", "content": "hello"},
            "finish_reason": "stop"
        }],
        "usage": {"prompt_tokens": 7, "completion_tokens": 2}
    });
    let msg = openai_json_to_anthropic_message(&payload, "claude-sonnet-4-5");
    assert_eq!(msg["type"], "message");
    assert_eq!(msg["role"], "assistant");
    assert_eq!(msg["model"], "claude-sonnet-4-5");
    assert_eq!(msg["content"][0]["type"], "text");
    assert_eq!(msg["content"][0]["text"], "hello");
    assert_eq!(msg["stop_reason"], "end_turn");
    assert_eq!(msg["usage"]["input_tokens"], 7);
    assert_eq!(msg["usage"]["output_tokens"], 2);
}

#[test]
fn chat_tool_calls_become_tool_use_blocks() {
    let payload = json!({
        "choices": [{
            "message": {
                "role": "assistant",
                "content": "",
                "tool_calls": [{
                    "id": "call_1",
                    "type": "function",
                    "function": {"name": "get_time", "arguments": "{\"tz\":\"UTC\"}"}
                }]
            },
            "finish_reason": "tool_calls"
        }]
    });
    let msg = openai_json_to_anthropic_message(&payload, "claude-sonnet-4-5");
    assert_eq!(msg["content"][0]["type"], "tool_use");
    assert_eq!(msg["content"][0]["id"], "call_1");
    assert_eq!(msg["content"][0]["name"], "get_time");
    assert_eq!(msg["content"][0]["input"]["tz"], "UTC");
    assert_eq!(msg["stop_reason"], "tool_use");
}

#[test]
fn responses_object_becomes_anthropic_message() {
    let payload = json!({
        "id": "resp_1",
        "object": "response",
        "status": "completed",
        "output": [
            {"type": "message", "content": [{"type": "output_text", "text": "hi there"}]},
            {"type": "function_call", "call_id": "fc_1", "name": "lookup", "arguments": "{\"q\":1}"}
        ],
        "usage": {"input_tokens": 5, "output_tokens": 9}
    });
    let msg = openai_json_to_anthropic_message(&payload, "claude-opus-4-7");
    assert_eq!(msg["content"][0]["text"], "hi there");
    assert_eq!(msg["content"][1]["type"], "tool_use");
    assert_eq!(msg["content"][1]["input"]["q"], 1);
    assert_eq!(msg["stop_reason"], "tool_use");
    assert_eq!(msg["usage"]["input_tokens"], 5);
}

#[test]
fn refusal_only_response_becomes_visible_anthropic_text() {
    let payload = json!({
        "id": "resp_refusal",
        "object": "response",
        "status": "completed",
        "output": [{"type": "message", "content": [
            {"type": "refusal", "refusal": "cannot comply"}
        ]}]
    });

    let msg = openai_json_to_anthropic_message(&payload, "claude-opus-4-7");

    assert_eq!(
        msg["content"][0],
        json!({"type":"text","text":"cannot comply"})
    );
    assert_eq!(msg["stop_reason"], "end_turn");
}

#[test]
fn mixed_response_keeps_text_and_refusal_in_display_order() {
    let payload = json!({
        "id": "resp_mixed",
        "object": "response",
        "status": "completed",
        "output": [
            {"type": "message", "content": [
                {"type": "output_text", "text": "before "},
                {"type": "refusal", "refusal": "cannot comply"},
                {"type": "output_text", "text": " after"}
            ]},
            {"type": "message", "content": [
                {"type": "refusal", "refusal": "second refusal"}
            ]}
        ]
    });

    let msg = openai_json_to_anthropic_message(&payload, "claude-opus-4-7");

    assert_eq!(msg["content"][0]["text"], "before cannot comply after");
    assert_eq!(msg["content"][1]["text"], "second refusal");
    assert_eq!(msg["stop_reason"], "end_turn");
}

#[tokio::test]
async fn buffered_responses_reject_provider_specific_output_instead_of_dropping_it() {
    use axum::response::IntoResponse as _;
    use http_body_util::BodyExt as _;

    for (item, marker, private_value) in [
        (
            json!({
                "id": "rs_1",
                "type": "reasoning",
                "summary": [{"type": "summary_text", "text": "checked the constraints"}],
                "encrypted_content": "private-reasoning-state"
            }),
            "reasoning",
            "private-reasoning-state",
        ),
        (
            json!({
                "id": "ct_1",
                "type": "custom_tool_call",
                "call_id": "call_1",
                "name": "apply_patch",
                "input": "private-tool-input"
            }),
            "custom_tool_call",
            "private-tool-input",
        ),
    ] {
        let upstream = (
            StatusCode::OK,
            axum::Json(json!({
                "id": "resp_unsupported",
                "object": "response",
                "status": "completed",
                "output": [item]
            })),
        )
            .into_response();

        let response =
            translate_upstream_response(upstream, "claude-test", "upstream-test", false, &[]).await;
        assert_eq!(response.status(), StatusCode::BAD_GATEWAY, "{marker}");
        let bytes = response.into_body().collect().await.unwrap().to_bytes();
        let body = String::from_utf8_lossy(&bytes);
        assert!(body.contains(marker), "{marker}: {body}");
        assert!(!body.contains(private_value), "{marker}: {body}");
    }
}

#[tokio::test]
async fn buffered_bridge_preserves_requested_without_private_metadata() {
    use axum::response::IntoResponse as _;
    use http_body_util::BodyExt as _;

    let upstream = (
        StatusCode::OK,
        axum::Json(json!({
            "id": "chatcmpl-1",
            "model": "future-upstream-model",
            "choices": [{
                "message": {"role": "assistant", "content": "hello"},
                "finish_reason": "stop"
            }],
            "usage": {"prompt_tokens": 1, "completion_tokens": 1}
        })),
    )
        .into_response();
    let response = translate_upstream_response(
        upstream,
        "claude/catalog-alias",
        "future-upstream-model",
        false,
        &[],
    )
    .await;
    assert_eq!(response.status(), StatusCode::OK);
    assert!(response.headers().get("x-router-upstream-model").is_none());
    let body = response.into_body().collect().await.unwrap().to_bytes();
    let payload: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(payload["model"], "claude/catalog-alias");
    assert!(payload.get("x_router_upstream_model").is_none());
}

/// Streaming translation carries only the requested vendor-standard model.
#[tokio::test]
async fn streaming_bridge_preserves_requested_without_private_metadata() {
    use http_body_util::BodyExt as _;

    let mut upstream = Response::new(Body::from(concat!(
        "data: {\"id\":\"chatcmpl-1\",\"model\":\"future-upstream-model\",",
        "\"choices\":[{\"delta\":{\"role\":\"assistant\",\"content\":\"hello\"},",
        "\"finish_reason\":null}]}\n\n",
        "data: {\"id\":\"chatcmpl-1\",\"model\":\"future-upstream-model\",",
        "\"choices\":[{\"delta\":{},\"finish_reason\":\"stop\"}]}\n\n",
        "data: [DONE]\n\n"
    )));
    upstream.headers_mut().insert(
        "content-type",
        HeaderValue::from_static("text/event-stream"),
    );

    let response = translate_upstream_response(
        upstream,
        "claude/catalog-alias",
        "future-upstream-model",
        true,
        &[],
    )
    .await;
    assert_eq!(response.status(), StatusCode::OK);
    assert_eq!(response.headers()["content-type"], "text/event-stream");
    assert!(response.headers().get("x-router-upstream-model").is_none());
    let payload = String::from_utf8(
        response
            .into_body()
            .collect()
            .await
            .expect("translated stream body")
            .to_bytes()
            .to_vec(),
    )
    .expect("UTF-8 SSE");
    assert!(payload.contains("message_start"));
    assert!(payload.contains("content_block_delta"));
    assert!(payload.contains("message_stop"));
    assert!(payload.contains("claude/catalog-alias"));
    assert!(!payload.contains("future-upstream-model"));
    assert!(!payload.contains("x_router_"));
}

#[test]
fn max_tokens_finish_reason_maps_to_anthropic() {
    let payload = json!({
        "choices": [{"message": {"content": "x"}, "finish_reason": "length"}]
    });
    let msg = openai_json_to_anthropic_message(&payload, "m");
    assert_eq!(msg["stop_reason"], "max_tokens");
}

#[test]
fn bridged_providers_are_the_non_anthropic_openai_dialect_ones() {
    assert!(is_bridged(UpstreamProvider::Codex));
    assert!(is_bridged(UpstreamProvider::Qwen));
    assert!(is_bridged(UpstreamProvider::Gemini));
    assert!(is_bridged(UpstreamProvider::OpenAICompatible));
    assert!(!is_bridged(UpstreamProvider::Anthropic));
    assert!(!is_bridged(UpstreamProvider::Gonka));
    assert!(!is_bridged(UpstreamProvider::Crater));
}

/// `count_tokens` is answered locally, so it must authenticate the caller
/// itself — no upstream forwarder does it on this path.
mod count_tokens_auth {
    use super::*;
    use crate::token::TokenManager;

    fn bearer(token: &str) -> HeaderMap {
        let mut headers = HeaderMap::new();
        headers.insert(
            "authorization",
            HeaderValue::from_str(&format!("Bearer {token}")).unwrap(),
        );
        headers
    }

    #[test]
    fn accepts_a_valid_token_and_returns_its_claims() {
        let manager = TokenManager::new("test-secret");
        let token = manager.issue_token(1, "bridge-test").unwrap();
        let claims = count_tokens_claims(&manager, &bearer(&token))
            .unwrap_or_else(|_| panic!("valid token must be accepted"));
        assert_eq!(claims.label, "bridge-test");
    }

    #[test]
    fn rejects_a_missing_token_with_401() {
        let manager = TokenManager::new("test-secret");
        let err = count_tokens_claims(&manager, &HeaderMap::new())
            .expect_err("a request without credentials must be rejected");
        assert_eq!(err.status(), StatusCode::UNAUTHORIZED);
    }

    #[test]
    fn rejects_a_forged_token_with_401() {
        let manager = TokenManager::new("test-secret");
        let forged = TokenManager::new("other-secret")
            .issue_token(1, "forged")
            .unwrap();
        let err = count_tokens_claims(&manager, &bearer(&forged))
            .expect_err("a token signed with another secret must be rejected");
        assert_eq!(err.status(), StatusCode::UNAUTHORIZED);
    }

    #[test]
    fn rejects_a_revoked_token_with_403() {
        let manager = TokenManager::new("test-secret");
        let token = manager.issue_token(1, "revoked").unwrap();
        let claims = count_tokens_claims(&manager, &bearer(&token)).unwrap_or_else(|_| {
            panic!("valid token must be accepted before revocation");
        });
        manager.revoke_token(&claims.sub).unwrap();
        let err = count_tokens_claims(&manager, &bearer(&token))
            .expect_err("a revoked token must be rejected");
        assert_eq!(err.status(), StatusCode::FORBIDDEN);
    }
}
