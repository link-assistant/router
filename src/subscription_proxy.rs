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
use std::collections::BTreeMap;

use crate::metrics::Surface;
use crate::proxy::{
    AppState, error_response, extract_client_token, maybe_mpp_challenge, request_routing_context,
    retry_after_duration,
};
use crate::subscription::{SubscriptionProvider, SubscriptionToken};

/// Forward one `OpenAI`-shaped request to the active subscription upstream.
///
/// `path` is the router's own route (e.g. `/v1/chat/completions` or
/// `/v1/responses`); it is rewritten to the provider's upstream path.
pub async fn forward_subscription_openai(
    state: &AppState,
    headers: &HeaderMap,
    body: serde_json::Value,
    routing_body: &serde_json::Value,
    path: &str,
    surface: Surface,
) -> Response {
    forward_subscription_openai_inner(
        state,
        headers,
        body,
        routing_body,
        path,
        surface,
        SubscriptionResponseShape::Passthrough,
    )
    .await
}

/// Forward a Chat Completions request translated to the Codex Responses API,
/// then translate the upstream response back to the caller's requested shape.
pub async fn forward_codex_chat_completions(
    state: &AppState,
    headers: &HeaderMap,
    body: serde_json::Value,
    routing_body: &serde_json::Value,
    surface: Surface,
) -> Response {
    forward_subscription_openai_inner(
        state,
        headers,
        body,
        routing_body,
        "/v1/responses",
        surface,
        SubscriptionResponseShape::ChatCompletion,
    )
    .await
}

#[derive(Clone, Copy, PartialEq, Eq)]
enum SubscriptionResponseShape {
    Passthrough,
    ChatCompletion,
}

async fn forward_subscription_openai_inner(
    state: &AppState,
    headers: &HeaderMap,
    mut body: serde_json::Value,
    routing_body: &serde_json::Value,
    path: &str,
    surface: Surface,
    response_shape: SubscriptionResponseShape,
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
    let claims = match state.token_manager.validate_token(token) {
        Ok(claims) => claims,
        Err(e) => {
            let status = match &e {
                crate::token::TokenError::Revoked => StatusCode::FORBIDDEN,
                _ => StatusCode::UNAUTHORIZED,
            };
            return error_response(status, "authentication_error", &format!("{e}"));
        }
    };
    if let Err(e) = state.token_manager.enforce_request_budget(&claims.sub) {
        return error_response(
            StatusCode::TOO_MANY_REQUESTS,
            "rate_limit_error",
            &format!("{e}"),
        );
    }
    crate::audit::record_authorised_request(state, &claims, surface, path, Some(routing_body));

    let Some(provider) = state.upstream_provider.subscription_provider() else {
        return error_response(
            StatusCode::INTERNAL_SERVER_ERROR,
            "api_error",
            "active upstream is not a subscription provider",
        );
    };
    let pinned_account = match state.token_manager.account_for(&claims.sub) {
        Ok(account) => account,
        Err(error) => {
            return error_response(
                StatusCode::INTERNAL_SERVER_ERROR,
                "api_error",
                &format!("failed to resolve token account binding: {error}"),
            );
        }
    };
    let routing_context = request_routing_context(headers, routing_body, pinned_account);
    let selected = if let Some(router) = state.account_router.as_ref() {
        match router.select_subscription(&routing_context) {
            Ok(selected) => selected,
            Err(error) => {
                return error_response(
                    StatusCode::SERVICE_UNAVAILABLE,
                    "account_unavailable",
                    &error.to_string(),
                );
            }
        }
    } else {
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
        crate::accounts::SelectedSubscriptionAccount {
            name: "primary".to_string(),
            token: disk_token,
        }
    };
    // Refresh in memory if the on-disk token has expired; vendor files stay
    // read-only.
    let now_ms = chrono::Utc::now().timestamp_millis();
    let sub_token = state
        .subscription_cache
        .get_fresh_for(
            &state.client,
            provider,
            &selected.name,
            selected.token,
            now_ms,
        )
        .await;
    let selected_account = Some(selected.name);

    let stream_requested = body
        .get("stream")
        .and_then(serde_json::Value::as_bool)
        .unwrap_or(false);

    // The ChatGPT Codex backend is stricter than the generic Responses API, so
    // reshape the body before forwarding (see `normalize_codex_responses_body`).
    normalize_subscription_request(provider, &mut body);

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

    let correlation_id = crate::request_log::correlation_id(headers);
    let upstream_resp = match state
        .request_log
        .send_upstream(&correlation_id, &state.client, upstream_req)
        .await
    {
        Ok(resp) => resp,
        Err(e) => {
            state
                .metrics
                .record_request(surface, 502, selected_account.as_deref());
            return error_response(
                StatusCode::BAD_GATEWAY,
                "api_error",
                &format!("{provider} subscription upstream request failed: {e}"),
            );
        }
    };
    let status = StatusCode::from_u16(upstream_resp.status().as_u16())
        .unwrap_or(StatusCode::INTERNAL_SERVER_ERROR);
    state
        .metrics
        .record_request(surface, status.as_u16(), selected_account.as_deref());
    state
        .subscription_cache
        .record_status(provider, status.as_u16());
    let retry_after = retry_after_duration(upstream_resp.headers());
    if status == StatusCode::TOO_MANY_REQUESTS {
        if let (Some(router), Some(account)) =
            (state.account_router.as_ref(), selected_account.as_deref())
        {
            router.report_failure_with_retry_after(
                account,
                "subscription upstream returned 429",
                retry_after,
            );
        }
    }

    let content_type = upstream_resp
        .headers()
        .get("content-type")
        .cloned()
        .unwrap_or_else(|| HeaderValue::from_static("application/json"));
    // Preserve rate-limit signals (Retry-After, x-ratelimit-*) so clients can
    // back off intelligently when a subscription upstream throttles us.
    let rate_limit_headers = rate_limit_headers(upstream_resp.headers());

    let codex = provider == SubscriptionProvider::Codex;
    if stream_requested || (!codex && is_event_stream(&content_type)) {
        // The Codex backend streams SSE but labels it `application/json`; re-label
        // so SSE-aware clients treat the body as the stream it is.
        let stream_content_type = if codex {
            HeaderValue::from_static("text/event-stream")
        } else {
            content_type
        };
        let requested_model = routing_body
            .get("model")
            .and_then(serde_json::Value::as_str)
            .unwrap_or_default();
        let mut translator = crate::responses::ResponsesChatStreamTranslator::new(requested_model);
        let response_log = std::sync::Arc::clone(&state.request_log);
        let stream = upstream_resp.bytes_stream().map(move |chunk| {
            chunk.map_or_else(
                |error| Err(std::io::Error::other(error)),
                |bytes| {
                    response_log.record_upstream_body(&correlation_id, &bytes);
                    if codex && response_shape == SubscriptionResponseShape::ChatCompletion {
                        Ok(bytes::Bytes::from(translator.push(&bytes).join("")))
                    } else {
                        Ok(bytes)
                    }
                },
            )
        });
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
            state
                .metrics
                .record_request(surface, 502, selected_account.as_deref());
            return error_response(
                StatusCode::BAD_GATEWAY,
                "api_error",
                &format!("{provider} subscription upstream body read failed: {e}"),
            );
        }
    };
    state
        .request_log
        .record_upstream_body(&correlation_id, &upstream_body);
    state
        .metrics
        .record_bytes(bytes_sent, upstream_body.len() as u64);

    // The Codex backend always streams Server-Sent Events even when the client
    // asked for a non-streaming (`stream:false`) response, and labels that SSE
    // body `application/json`. A non-streaming client (e.g. OpenClaw's gateway)
    // then parses the raw event stream as a single JSON object and fails with an
    // incomplete result. Collapse the SSE into the final `response.completed`
    // payload and return it as a normal JSON Responses object.
    let mut response_body = upstream_body;
    if codex && status.is_success() {
        if let Some(json) = codex_sse_to_response_json(&response_body) {
            response_body = bytes::Bytes::from(json);
        }
        if response_shape == SubscriptionResponseShape::ChatCompletion {
            let requested_model = routing_body
                .get("model")
                .and_then(serde_json::Value::as_str)
                .unwrap_or_default();
            let parsed = match serde_json::from_slice::<serde_json::Value>(&response_body) {
                Ok(value) => value,
                Err(error) => {
                    return error_response(
                        StatusCode::BAD_GATEWAY,
                        "api_error",
                        &format!(
                            "Codex subscription upstream returned an invalid response: {error}"
                        ),
                    );
                }
            };
            let translated =
                crate::responses::response_to_chat_completion(&parsed, requested_model);
            response_body = bytes::Bytes::from(
                serde_json::to_vec(&translated).expect("JSON values always serialize"),
            );
        }

        let mut response = Response::new(Body::from(response_body));
        *response.status_mut() = status;
        response
            .headers_mut()
            .insert("content-type", HeaderValue::from_static("application/json"));
        apply_headers(response.headers_mut(), rate_limit_headers);
        return response;
    }

    let mut response = Response::new(Body::from(response_body));
    *response.status_mut() = status;
    response.headers_mut().insert("content-type", content_type);
    apply_headers(response.headers_mut(), rate_limit_headers);
    response
}

/// Collapse a Codex Responses SSE body into the final Responses JSON object.
///
/// The `ChatGPT` Codex backend only streams (`text/event-stream`-style `event:` /
/// `data:` lines). For non-streaming clients we extract the `response` object
/// carried by the terminal `response.completed` event and return it verbatim, so
/// the client receives the single JSON object it expects. Returns `None` if no
/// completed event is present (caller falls back to the raw body).
fn codex_sse_to_response_json(body: &[u8]) -> Option<Vec<u8>> {
    let text = std::str::from_utf8(body).ok()?;
    let mut completed: Option<serde_json::Value> = None;
    let mut output = BTreeMap::<u64, serde_json::Value>::new();
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
        match event.get("type").and_then(serde_json::Value::as_str) {
            Some("response.output_item.added" | "response.output_item.done") => {
                if let Some(item) = event.get("item") {
                    let index = event
                        .get("output_index")
                        .and_then(serde_json::Value::as_u64)
                        .unwrap_or(output.len() as u64);
                    output.insert(index, item.clone());
                }
            }
            Some("response.output_text.delta") => {
                update_codex_output_text(&mut output, &event, false);
            }
            Some("response.output_text.done") => {
                update_codex_output_text(&mut output, &event, true);
            }
            Some("response.completed") => {
                if let Some(response) = event.get("response") {
                    completed = Some(response.clone());
                }
            }
            _ => {}
        }
    }
    if let Some(response) = completed.as_mut() {
        let missing_output = response
            .get("output")
            .and_then(serde_json::Value::as_array)
            .is_none_or(Vec::is_empty);
        if missing_output && !output.is_empty() {
            response["output"] = serde_json::Value::Array(output.into_values().collect());
        }
    }
    completed.and_then(|value| serde_json::to_vec(&value).ok())
}

fn update_codex_output_text(
    output: &mut BTreeMap<u64, serde_json::Value>,
    event: &serde_json::Value,
    done: bool,
) {
    let output_index = event
        .get("output_index")
        .and_then(serde_json::Value::as_u64)
        .unwrap_or(0);
    let content_index = event
        .get("content_index")
        .and_then(serde_json::Value::as_u64)
        .and_then(|index| usize::try_from(index).ok())
        .unwrap_or(0);
    let item_id = event
        .get("item_id")
        .and_then(serde_json::Value::as_str)
        .unwrap_or("");
    let item = output.entry(output_index).or_insert_with(|| {
        serde_json::json!({
            "id": item_id,
            "type": "message",
            "status": "in_progress",
            "role": "assistant",
            "content": []
        })
    });
    let Some(content) = item
        .get_mut("content")
        .and_then(serde_json::Value::as_array_mut)
    else {
        return;
    };
    content.resize(content_index + 1, serde_json::Value::Null);
    if content[content_index].is_null() {
        content[content_index] =
            serde_json::json!({"type": "output_text", "text": "", "annotations": []});
    }
    let text = if done {
        event.get("text")
    } else {
        event.get("delta")
    }
    .and_then(serde_json::Value::as_str)
    .unwrap_or("");
    if done {
        content[content_index]["text"] = serde_json::Value::String(text.to_string());
        item["status"] = serde_json::Value::String("completed".to_string());
    } else if let Some(current) = content[content_index]["text"].as_str() {
        content[content_index]["text"] = serde_json::Value::String(format!("{current}{text}"));
    }
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
        // Codex gates newer models (e.g. gpt-5.6-luna) behind a recent client version
        // advertised via the `version` header; without it the backend replies "Model not
        // found". Mirror the Codex CLI. Overridable via CODEX_CLIENT_VERSION.
        out.push((
            "version",
            std::env::var("CODEX_CLIENT_VERSION").unwrap_or_else(|_| "0.144.1".to_string()),
        ));
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
pub async fn subscription_models(state: &AppState) -> serde_json::Value {
    match state.upstream_provider.subscription_provider() {
        Some(provider) => crate::model_routing::pinned_model_catalog(state, provider).await,
        None => serde_json::json!({"object": "list", "data": []}),
    }
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

/// Apply provider capability rules, then any provider-specific body shaping.
fn normalize_subscription_request(provider: SubscriptionProvider, body: &mut serde_json::Value) {
    crate::openai::reconcile_subscription_parameters(provider, body);
    if provider == SubscriptionProvider::Codex {
        normalize_codex_responses_body(body);
    }
}

/// Shape a Responses-API request body for the `ChatGPT` Codex backend.
///
/// The Codex backend is stricter than the generic `OpenAI` Responses API: it
/// always streams, rejects `max_output_tokens` and system/developer input
/// messages, and requires non-empty top-level `instructions`. System turns are
/// hoisted into `instructions`; a default is used only if nothing remains.
fn normalize_codex_responses_body(body: &mut serde_json::Value) {
    let Some(obj) = body.as_object_mut() else {
        return;
    };
    // Codex always streams from the ChatGPT backend.
    obj.insert("stream".to_string(), serde_json::Value::Bool(true));
    // ChatGPT subscription inference does not permit stored responses.
    obj.insert("store".to_string(), serde_json::Value::Bool(false));
    // `max_output_tokens` is not accepted by the Codex backend.
    obj.remove("max_output_tokens");
    // The backend rejects a bare-string `input` ("Input must be a list"), so
    // normalise both documented forms to the typed list shape.
    if let Some(input) = obj.get("input") {
        let normalized = crate::responses::normalize_input_items(input);
        obj.insert("input".to_string(), normalized);
    }

    // Hoist system/developer turns out of `input` (Codex forbids them there).
    let mut hoisted: Vec<String> = Vec::new();
    if let Some(serde_json::Value::Array(items)) = obj.get_mut("input") {
        items.retain(
            |item| match item.get("role").and_then(serde_json::Value::as_str) {
                Some("system" | "developer") => {
                    if let Some(text) = input_item_text(item) {
                        hoisted.push(text);
                    }
                    false
                }
                _ => true,
            },
        );
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
    obj.insert(
        "instructions".to_string(),
        serde_json::Value::String(instructions),
    );
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
            "store": true,
            "temperature": 0.7,
            "max_output_tokens": 8192,
            "reasoning": {"effort": "none"}
        });
        normalize_subscription_request(SubscriptionProvider::Codex, &mut body);
        assert_eq!(body["stream"], serde_json::Value::Bool(true));
        assert!(
            body.get("max_output_tokens").is_none(),
            "max_output_tokens must be stripped for Codex"
        );
        assert_eq!(body["instructions"], "You are a helpful assistant.");
        // ChatGPT subscription inference requires stateless requests.
        assert_eq!(body["store"], serde_json::Value::Bool(false));
        assert!(
            body.get("temperature").is_none(),
            "temperature must be stripped for the ChatGPT subscription backend"
        );
        // Untouched fields are preserved.
        assert_eq!(body["reasoning"]["effort"], "none");
    }

    /// Both documented `input` forms must reach the `ChatGPT` backend as a list;
    /// the string form previously went through unchanged and drew a 400
    /// ("Input must be a list").
    #[test]
    fn codex_normalizes_both_documented_input_forms_to_a_list() {
        let typed = serde_json::json!([{
            "type": "message",
            "role": "user",
            "content": [{"type": "input_text", "text": "скажи ок"}],
        }]);

        let mut string_form = serde_json::json!({
            "model": "gpt-5.6-sol",
            "input": "скажи ок",
        });
        normalize_codex_responses_body(&mut string_form);
        assert_eq!(string_form["input"], typed);

        // The list form is already correct and must survive untouched.
        let mut list_form = serde_json::json!({
            "model": "gpt-5.6-sol",
            "input": typed,
        });
        normalize_codex_responses_body(&mut list_form);
        assert_eq!(list_form["input"], typed);

        // A bare string inside the list is the same defect one level down.
        let mut mixed = serde_json::json!({
            "model": "gpt-5.6-sol",
            "input": ["скажи ок"],
        });
        normalize_codex_responses_body(&mut mixed);
        assert_eq!(mixed["input"], typed);
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
            "data: {\"type\":\"response.output_text.delta\",\"item_id\":\"msg_1\",\"output_index\":0,\"content_index\":0,\"delta\":\"hi\"}\n\n",
            "event: response.output_text.done\n",
            "data: {\"type\":\"response.output_text.done\",\"item_id\":\"msg_1\",\"output_index\":0,\"content_index\":0,\"text\":\"hi\"}\n\n",
            "event: response.completed\n",
            "data: {\"type\":\"response.completed\",\"response\":{\"id\":\"resp_1\",\"model\":\"gpt-5.6-sol\",\"status\":\"completed\",\"output\":[]}}\n\n"
        );
        let out = codex_sse_to_response_json(sse.as_bytes()).expect("completed payload");
        let value: serde_json::Value = serde_json::from_slice(&out).unwrap();
        assert_eq!(value["id"], "resp_1");
        assert_eq!(value["status"], "completed");
        assert_eq!(value["output"][0]["type"], "message");
        assert_eq!(value["output"][0]["role"], "assistant");
        assert_eq!(value["output"][0]["content"][0]["text"], "hi");
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
    fn codex_headers_include_version() {
        let token = SubscriptionToken {
            access_token: "a".into(),
            refresh_token: None,
            expires_at_ms: None,
            account_id: Some("acct_9".into()),
            resource_url: None,
        };
        let headers = subscription_headers(SubscriptionProvider::Codex, &token);
        // The Codex backend gates newer models behind a recent client version
        // advertised via the `version` header.
        assert!(
            headers
                .iter()
                .any(|(k, v)| *k == "version" && !v.is_empty())
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
