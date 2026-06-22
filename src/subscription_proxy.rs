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

    // The Codex backend *always* streams Server-Sent Events (we force
    // `stream:true` in `normalize_codex_responses_body`) but labels the response
    // `application/json`. If we let that fall through to the buffered branch,
    // SSE-aware clients (e.g. OpenClaw's gateway) receive a `application/json`
    // body they parse as a single JSON object, failing with an incomplete result
    // even though the stream ends with a proper `response.completed` event. So
    // always stream Codex responses and re-label them `text/event-stream`.
    let codex = provider == SubscriptionProvider::Codex;
    if codex || stream_requested || is_event_stream(&content_type) {
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

    let mut response = Response::new(Body::from(upstream_body));
    *response.status_mut() = status;
    response.headers_mut().insert("content-type", content_type);
    apply_headers(response.headers_mut(), rate_limit_headers);
    response
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

/// Shape a Responses-API body for the `ChatGPT` Codex backend.
///
/// The Codex backend is stricter than the generic `OpenAI` Responses API:
/// it always streams, **rejects** `max_output_tokens` (HTTP 400 "Unsupported
/// parameter: max_output_tokens"), and **requires** a non-empty `instructions`
/// field (HTTP 400 "Instructions are required"). Standard Responses clients such
/// as OpenClaw send `max_output_tokens` and omit `instructions`, so without this
/// shaping the backend rejects every request. We only add a default
/// `instructions` when the caller did not supply one, preserving caller intent.
fn normalize_codex_responses_body(body: &mut serde_json::Value) {
    let Some(obj) = body.as_object_mut() else {
        return;
    };
    // Codex always streams from the ChatGPT backend; reflect that into the body
    // so the upstream emits SSE we pass straight through.
    obj.insert("stream".to_string(), serde_json::Value::Bool(true));
    // `max_output_tokens` is not accepted by the Codex backend.
    obj.remove("max_output_tokens");
    // `instructions` is mandatory and must be non-empty.
    let has_instructions = obj
        .get("instructions")
        .and_then(serde_json::Value::as_str)
        .is_some_and(|s| !s.trim().is_empty());
    if !has_instructions {
        obj.insert(
            "instructions".to_string(),
            serde_json::Value::String("You are a helpful assistant.".to_string()),
        );
    }
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
