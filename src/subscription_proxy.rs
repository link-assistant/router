//! Forward `OpenAI`-style requests to vendor *subscription* upstreams.
//!
//! Codex (`ChatGPT`) and Qwen authenticate with the user's subscription OAuth
//! token (read by [`crate::subscription`]) and speak `OpenAI`-shaped wire
//! formats — Qwen via `DashScope`'s `OpenAI`-compatible API, Codex via the
//! `ChatGPT` backend Responses API. This module substitutes the client's
//! router token for the subscription bearer token and forwards the request,
//! streaming SSE through untouched, exactly like [`crate::provider_proxy`] does
//! for configured `OpenAI`-compatible providers.
//!
//! Gemini speaks a different dialect and is handled separately in
//! [`crate::gemini`].

#![allow(clippy::unused_async)]

use axum::body::Body;
use axum::http::{HeaderMap, HeaderValue, StatusCode};
use axum::response::Response;
use futures_util::StreamExt;

use crate::config::UpstreamProvider;
use crate::metrics::Surface;
use crate::proxy::{AppState, error_response, extract_client_token, maybe_mpp_challenge};
use crate::subscription::{SubscriptionProvider, SubscriptionToken};

/// Forward one `OpenAI`-shaped request to the active subscription upstream.
///
/// `path` is the router's own route (e.g. `/v1/chat/completions` or
/// `/v1/responses`); it is rewritten to the provider's upstream path.
pub async fn forward_subscription_openai(
    state: &AppState,
    headers: &HeaderMap,
    mut body: serde_json::Value,
    path: &str,
    surface: Surface,
) -> Response {
    if let Some(resp) = maybe_mpp_challenge(state, headers, path) {
        return resp;
    }

    let Some(token) = extract_client_token(headers) else {
        return error_response(
            StatusCode::UNAUTHORIZED,
            "authentication_error",
            "Missing Authorization Bearer token or x-api-key",
        );
    };
    if let Err(e) = state.token_manager.validate_token(token) {
        let status = match &e {
            crate::token::TokenError::Revoked => StatusCode::FORBIDDEN,
            _ => StatusCode::UNAUTHORIZED,
        };
        return error_response(status, "authentication_error", &format!("{e}"));
    }

    let Some(provider) = state.upstream_provider.subscription_provider() else {
        return error_response(
            StatusCode::INTERNAL_SERVER_ERROR,
            "api_error",
            "active upstream is not a subscription provider",
        );
    };
    let Some(reader) = state.subscription_reader.as_ref() else {
        return error_response(
            StatusCode::INTERNAL_SERVER_ERROR,
            "api_error",
            "subscription credentials reader is not configured",
        );
    };
    let disk_token = match reader.read_token() {
        Ok(token) => token,
        Err(e) => {
            return error_response(
                StatusCode::BAD_GATEWAY,
                "authentication_error",
                &format!("failed to read {provider} subscription credentials: {e}"),
            );
        }
    };
    // Refresh in memory if the on-disk token has expired; vendor files stay
    // read-only.
    let now_ms = chrono::Utc::now().timestamp_millis();
    let sub_token = state
        .subscription_cache
        .get_fresh(&state.client, provider, disk_token, now_ms)
        .await;

    let stream_requested = body
        .get("stream")
        .and_then(serde_json::Value::as_bool)
        .unwrap_or(false);

    // The ChatGPT Codex backend is stricter than the generic Responses API, so
    // reshape the body before forwarding (see `normalize_codex_responses_body`).
    if provider == SubscriptionProvider::Codex {
        normalize_codex_responses_body(&mut body);
    }

    let serialized = match serde_json::to_vec(&body) {
        Ok(v) => v,
        Err(e) => {
            return error_response(
                StatusCode::INTERNAL_SERVER_ERROR,
                "api_error",
                &format!("failed to serialize subscription request body: {e}"),
            );
        }
    };
    let bytes_sent = serialized.len() as u64;

    let base_url = sub_token.base_url(provider);
    let upstream_url = join_subscription_url(provider, &base_url, path);

    let mut upstream_req = state
        .client
        .post(upstream_url)
        .header("content-type", "application/json")
        .header(
            "authorization",
            format!("Bearer {}", sub_token.access_token),
        )
        .body(serialized);
    for (name, value) in subscription_headers(provider, &sub_token) {
        upstream_req = upstream_req.header(name, value);
    }

    let upstream_resp = match upstream_req.send().await {
        Ok(resp) => resp,
        Err(e) => {
            state.metrics.record_request(surface, 502, None);
            return error_response(
                StatusCode::BAD_GATEWAY,
                "api_error",
                &format!("{provider} subscription upstream request failed: {e}"),
            );
        }
    };
    let status = StatusCode::from_u16(upstream_resp.status().as_u16())
        .unwrap_or(StatusCode::INTERNAL_SERVER_ERROR);
    state.metrics.record_request(surface, status.as_u16(), None);

    let content_type = upstream_resp
        .headers()
        .get("content-type")
        .cloned()
        .unwrap_or_else(|| HeaderValue::from_static("application/json"));
    // Preserve rate-limit signals (Retry-After, x-ratelimit-*) so clients can
    // back off intelligently when a subscription upstream throttles us.
    let rate_limit_headers = rate_limit_headers(upstream_resp.headers());

    let codex = provider == SubscriptionProvider::Codex;
    if stream_requested || is_event_stream(&content_type) {
        // The Codex backend streams SSE but labels it `application/json`; re-label
        // so SSE-aware clients treat the body as the stream it is.
        let stream_content_type = if codex {
            HeaderValue::from_static("text/event-stream")
        } else {
            content_type
        };
        let stream = upstream_resp
            .bytes_stream()
            .map(|chunk| chunk.map_err(std::io::Error::other));
        let mut response = Response::new(Body::from_stream(stream));
        *response.status_mut() = status;
        response
            .headers_mut()
            .insert("content-type", stream_content_type);
        apply_headers(response.headers_mut(), rate_limit_headers);
        return response;
    }

    let upstream_body = match upstream_resp.bytes().await {
        Ok(bytes) => bytes,
        Err(e) => {
            state.metrics.record_request(surface, 502, None);
            return error_response(
                StatusCode::BAD_GATEWAY,
                "api_error",
                &format!("{provider} subscription upstream body read failed: {e}"),
            );
        }
    };
    state
        .metrics
        .record_bytes(bytes_sent, upstream_body.len() as u64);

    // The Codex backend always streams Server-Sent Events even when the client
    // asked for a non-streaming (`stream:false`) response, and labels that SSE
    // body `application/json`. A non-streaming client (e.g. OpenClaw's gateway)
    // then parses the raw event stream as a single JSON object and fails with an
    // incomplete result. Collapse the SSE into the final `response.completed`
    // payload and return it as a normal JSON Responses object.
    if codex && status.is_success() {
        if let Some(json) = codex_sse_to_response_json(&upstream_body) {
            let mut response = Response::new(Body::from(json));
            *response.status_mut() = status;
            response
                .headers_mut()
                .insert("content-type", HeaderValue::from_static("application/json"));
            apply_headers(response.headers_mut(), rate_limit_headers);
            return response;
        }
    }

    let mut response = Response::new(Body::from(upstream_body));
    *response.status_mut() = status;
    response.headers_mut().insert("content-type", content_type);
    apply_headers(response.headers_mut(), rate_limit_headers);
    response
}

/// Collapse a Codex Responses SSE body into the final Responses JSON object.
///
/// The ChatGPT Codex backend only streams (`text/event-stream`-style `event:` /
/// `data:` lines). For non-streaming clients we extract the `response` object
/// carried by the terminal `response.completed` event and return it verbatim, so
/// the client receives the single JSON object it expects. Returns `None` if no
/// completed event is present (caller falls back to the raw body).
fn codex_sse_to_response_json(body: &[u8]) -> Option<Vec<u8>> {
    let text = std::str::from_utf8(body).ok()?;
    let mut completed: Option<serde_json::Value> = None;
    for line in text.lines() {
        let Some(payload) = line.strip_prefix("data:") else {
            continue;
        };
        let payload = payload.trim();
        if payload.is_empty() || payload == "[DONE]" {
            continue;
        }
        let Ok(event) = serde_json::from_str::<serde_json::Value>(payload) else {
            continue;
        };
        if event.get("type").and_then(serde_json::Value::as_str) == Some("response.completed") {
            if let Some(response) = event.get("response") {
                completed = Some(response.clone());
            }
        }
    }
    completed.and_then(|value| serde_json::to_vec(&value).ok())
}

/// Collect rate-limit-related headers (`retry-after`, `x-ratelimit-*`) from an
/// upstream response so they can be relayed to the client.
fn rate_limit_headers(headers: &HeaderMap) -> Vec<(axum::http::HeaderName, HeaderValue)> {
    headers
        .iter()
        .filter(|(name, _)| {
            let n = name.as_str();
            n == "retry-after" || n.starts_with("x-ratelimit")
        })
        .map(|(name, value)| (name.clone(), value.clone()))
        .collect()
}

/// Insert collected headers into an outgoing response header map.
fn apply_headers(out: &mut HeaderMap, headers: Vec<(axum::http::HeaderName, HeaderValue)>) {
    for (name, value) in headers {
        out.insert(name, value);
    }
}

/// Provider-specific extra headers required by the upstream.
fn subscription_headers(
    provider: SubscriptionProvider,
    token: &SubscriptionToken,
) -> Vec<(&'static str, String)> {
    let mut out = Vec::new();
    if provider == SubscriptionProvider::Codex {
        if let Some(account_id) = token.account_id.as_deref() {
            out.push(("chatgpt-account-id", account_id.to_string()));
        }
        // The Codex backend gates the Responses API behind a beta opt-in and
        // identifies the originating client.
        out.push(("openai-beta", "responses=experimental".to_string()));
        out.push(("originator", "codex_cli_rs".to_string()));
    }
    out
}

/// Map a router route to the provider's upstream path.
///
/// Qwen mirrors the `OpenAI`-compatible scheme (base already ends in `/v1`), so
/// the router's `/v1/...` prefix is stripped. Codex exposes a flat
/// `.../codex/responses` endpoint, so `/v1/responses` collapses to
/// `/responses`.
fn join_subscription_url(provider: SubscriptionProvider, base_url: &str, path: &str) -> String {
    let base = base_url.trim_end_matches('/');
    match provider {
        SubscriptionProvider::Codex => {
            let suffix = path.strip_prefix("/v1").unwrap_or(path);
            format!("{base}{suffix}")
        }
        _ => {
            if base.ends_with("/v1") {
                let suffix = path.strip_prefix("/v1").unwrap_or(path);
                format!("{base}{suffix}")
            } else {
                format!("{base}{path}")
            }
        }
    }
}

/// `OpenAI`-shaped model listing for a subscription provider.
#[must_use]
pub fn subscription_models(state: &AppState) -> serde_json::Value {
    let provider = state.upstream_provider;
    let now = chrono::Utc::now().timestamp();
    let (owner, ids): (&str, &[&str]) = match provider {
        UpstreamProvider::Codex => ("openai", &["gpt-5-codex", "gpt-5", "codex-mini-latest"]),
        UpstreamProvider::Qwen => (
            "qwen",
            &[
                "qwen3-coder-plus",
                "qwen3-coder-flash",
                "qwen-max",
                "qwen-plus",
            ],
        ),
        _ => ("subscription", &["default"]),
    };
    let data: Vec<serde_json::Value> = ids
        .iter()
        .map(|id| {
            serde_json::json!({
                "id": id,
                "object": "model",
                "created": now,
                "owned_by": owner,
            })
        })
        .collect();
    serde_json::json!({"object": "list", "data": data})
}

fn is_event_stream(content_type: &HeaderValue) -> bool {
    content_type
        .to_str()
        .is_ok_and(|value| value.to_ascii_lowercase().contains("text/event-stream"))
}

/// Extract the concatenated text from a Responses `input` message item.
fn input_item_text(item: &serde_json::Value) -> Option<String> {
    match item.get("content") {
        Some(serde_json::Value::String(s)) => Some(s.clone()),
        Some(serde_json::Value::Array(parts)) => {
            let text: String = parts
                .iter()
                .filter_map(|p| p.get("text").and_then(serde_json::Value::as_str))
                .collect::<Vec<_>>()
                .join("");
            (!text.is_empty()).then_some(text)
        }
        _ => None,
    }
}

/// Shape a Responses-API request body for the `ChatGPT` Codex backend.
///
/// The Codex backend is stricter than the generic `OpenAI` Responses API:
/// - it always streams,
/// - **rejects** `max_output_tokens` (HTTP 400 "Unsupported parameter"),
/// - **rejects** `system`/`developer` messages inside `input`
///   (HTTP 400 "System messages are not allowed") — they must be carried in the
///   top-level `instructions` field,
/// - **requires** a non-empty `instructions` field (HTTP 400 "Instructions are
///   required").
///
/// Standard Responses clients (e.g. OpenClaw's gateway) send `max_output_tokens`
/// and put the system prompt as a `system` message in `input`, so without this
/// shaping the backend rejects every request. System turns are hoisted into
/// `instructions`; a default is used only if nothing remains.
fn normalize_codex_responses_body(body: &mut serde_json::Value) {
    let Some(obj) = body.as_object_mut() else {
        return;
    };
    // Codex always streams from the ChatGPT backend.
    obj.insert("stream".to_string(), serde_json::Value::Bool(true));
    // `max_output_tokens` is not accepted by the Codex backend.
    obj.remove("max_output_tokens");

    // Hoist system/developer turns out of `input` (Codex forbids them there).
    let mut hoisted: Vec<String> = Vec::new();
    if let Some(serde_json::Value::Array(items)) = obj.get_mut("input") {
        items.retain(|item| {
            match item.get("role").and_then(serde_json::Value::as_str) {
                Some("system" | "developer") => {
                    if let Some(text) = input_item_text(item) {
                        hoisted.push(text);
                    }
                    false
                }
                _ => true,
            }
        });
    }

    // Merge existing instructions + hoisted system turns; fall back to a default.
    let mut parts: Vec<String> = Vec::new();
    if let Some(existing) = obj.get("instructions").and_then(serde_json::Value::as_str) {
        if !existing.trim().is_empty() {
            parts.push(existing.to_string());
        }
    }
    parts.extend(hoisted);
    let instructions = if parts.is_empty() {
        "You are a helpful assistant.".to_string()
    } else {
        parts.join("\n\n")
    };
    obj.insert("instructions".to_string(), serde_json::Value::String(instructions));
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn codex_normalizes_responses_body_for_chatgpt_backend() {
        // OpenClaw-style Responses body: omits `instructions`, sends
        // `max_output_tokens`. Both trip the Codex backend without shaping.
        let mut body = serde_json::json!({
            "model": "gpt-5.5",
            "input": [{"role": "user", "content": [{"type": "input_text", "text": "hi"}]}],
            "store": false,
            "max_output_tokens": 8192,
            "reasoning": {"effort": "none"}
        });
        normalize_codex_responses_body(&mut body);
        assert_eq!(body["stream"], serde_json::Value::Bool(true));
        assert!(
            body.get("max_output_tokens").is_none(),
            "max_output_tokens must be stripped for Codex"
        );
        assert_eq!(body["instructions"], "You are a helpful assistant.");
        // Untouched fields are preserved.
        assert_eq!(body["store"], serde_json::Value::Bool(false));
        assert_eq!(body["reasoning"]["effort"], "none");
    }

    #[test]
    fn codex_hoists_system_messages_into_instructions() {
        // OpenClaw gateway shape: system prompt as a `system` message in `input`.
        let mut body = serde_json::json!({
            "model": "gpt-5.5",
            "input": [
                {"type":"message","role":"system","content":[{"type":"input_text","text":"be terse"}]},
                {"type":"message","role":"user","content":[{"type":"input_text","text":"hi"}]}
            ],
            "stream": true,
            "max_output_tokens": 8192
        });
        normalize_codex_responses_body(&mut body);
        // System turn moved out of input (Codex forbids it there)...
        let input = body["input"].as_array().unwrap();
        assert_eq!(input.len(), 1);
        assert_eq!(input[0]["role"], "user");
        // ...and merged into instructions.
        assert_eq!(body["instructions"], "be terse");
        assert!(body.get("max_output_tokens").is_none());
    }

    #[test]
    fn codex_preserves_caller_instructions() {
        let mut body = serde_json::json!({
            "model": "gpt-5-codex",
            "input": [],
            "instructions": "be terse",
            "max_output_tokens": 100
        });
        normalize_codex_responses_body(&mut body);
        assert_eq!(body["instructions"], "be terse");
        assert!(body.get("max_output_tokens").is_none());
        assert_eq!(body["stream"], serde_json::Value::Bool(true));
    }

    #[test]
    fn codex_sse_collapses_to_completed_response() {
        let sse = concat!(
            "event: response.created\n",
            "data: {\"type\":\"response.created\",\"response\":{\"status\":\"in_progress\"}}\n\n",
            "event: response.output_text.delta\n",
            "data: {\"type\":\"response.output_text.delta\",\"delta\":\"hi\"}\n\n",
            "event: response.completed\n",
            "data: {\"type\":\"response.completed\",\"response\":{\"id\":\"resp_1\",\"status\":\"completed\",\"output\":[{\"type\":\"message\"}]}}\n\n"
        );
        let out = codex_sse_to_response_json(sse.as_bytes()).expect("completed payload");
        let value: serde_json::Value = serde_json::from_slice(&out).unwrap();
        assert_eq!(value["id"], "resp_1");
        assert_eq!(value["status"], "completed");
        assert_eq!(value["output"][0]["type"], "message");
    }

    #[test]
    fn codex_sse_without_completed_returns_none() {
        let sse = "event: response.created\ndata: {\"type\":\"response.created\"}\n\n";
        assert!(codex_sse_to_response_json(sse.as_bytes()).is_none());
    }

    #[test]
    fn codex_url_collapses_v1_responses() {
        let url = join_subscription_url(
            SubscriptionProvider::Codex,
            "https://chatgpt.com/backend-api/codex",
            "/v1/responses",
        );
        assert_eq!(url, "https://chatgpt.com/backend-api/codex/responses");
    }

    #[test]
    fn qwen_url_strips_v1_against_compatible_base() {
        let url = join_subscription_url(
            SubscriptionProvider::Qwen,
            "https://dashscope.aliyuncs.com/compatible-mode/v1",
            "/v1/chat/completions",
        );
        assert_eq!(
            url,
            "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions"
        );
    }

    #[test]
    fn codex_headers_include_account_id() {
        let token = SubscriptionToken {
            access_token: "a".into(),
            refresh_token: None,
            expires_at_ms: None,
            account_id: Some("acct_9".into()),
            resource_url: None,
        };
        let headers = subscription_headers(SubscriptionProvider::Codex, &token);
        assert!(
            headers
                .iter()
                .any(|(k, v)| *k == "chatgpt-account-id" && v == "acct_9")
        );
    }

    #[test]
    fn rate_limit_headers_are_selected() {
        let mut headers = HeaderMap::new();
        headers.insert("retry-after", HeaderValue::from_static("30"));
        headers.insert(
            "x-ratelimit-remaining-requests",
            HeaderValue::from_static("0"),
        );
        headers.insert("content-type", HeaderValue::from_static("application/json"));
        let selected = rate_limit_headers(&headers);
        assert_eq!(selected.len(), 2);
        assert!(selected.iter().any(|(n, _)| n.as_str() == "retry-after"));
        assert!(
            selected
                .iter()
                .any(|(n, _)| n.as_str() == "x-ratelimit-remaining-requests")
        );
    }

    #[test]
    fn qwen_has_no_extra_headers() {
        let token = SubscriptionToken {
            access_token: "a".into(),
            refresh_token: None,
            expires_at_ms: None,
            account_id: None,
            resource_url: None,
        };
        assert!(subscription_headers(SubscriptionProvider::Qwen, &token).is_empty());
    }
}
