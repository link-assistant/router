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
    AppState, error_response, maybe_mpp_challenge, relay_response_headers, request_routing_context,
    retry_after_duration,
};
use crate::subscription::{SubscriptionProvider, SubscriptionToken};

const CODEX_RESPONSES_LITE_HEADER: &str = "x-openai-internal-codex-responses-lite";

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
enum CodexResponsesMode {
    Standard,
    Lite,
}

fn codex_responses_mode(provider: SubscriptionProvider, headers: &HeaderMap) -> CodexResponsesMode {
    let enabled = provider == SubscriptionProvider::Codex
        && headers
            .get(CODEX_RESPONSES_LITE_HEADER)
            .and_then(|value| value.to_str().ok())
            .is_some_and(|value| value.trim().eq_ignore_ascii_case("true"));
    if enabled {
        CodexResponsesMode::Lite
    } else {
        CodexResponsesMode::Standard
    }
}

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
        ForwardOptions {
            path,
            surface,
            response_shape: SubscriptionResponseShape::Passthrough,
            validated: None,
            entitlement: None,
            native_route: false,
        },
    )
    .await
}

/// Internal automatic-routing entry point carrying the credential snapshot
/// whose account was validated against the selected catalog.
#[derive(Clone, Copy)]
pub(crate) struct RoutedSubscriptionContext<'a> {
    pub(crate) validated: Option<&'a crate::model_routing::ValidatedSubscription>,
    pub(crate) entitlement: Option<crate::client_policy::EntitlementDecision>,
    pub(crate) native_route: bool,
}

pub(crate) async fn forward_subscription_openai_routed(
    state: &AppState,
    headers: &HeaderMap,
    body: serde_json::Value,
    routing_body: &serde_json::Value,
    path: &str,
    surface: Surface,
    context: RoutedSubscriptionContext<'_>,
) -> Response {
    forward_subscription_openai_inner(
        state,
        headers,
        body,
        routing_body,
        ForwardOptions {
            path,
            surface,
            response_shape: SubscriptionResponseShape::Passthrough,
            validated: context.validated,
            entitlement: context.entitlement,
            native_route: context.native_route,
        },
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
        ForwardOptions {
            path: "/v1/responses",
            surface,
            response_shape: SubscriptionResponseShape::ChatCompletion,
            validated: None,
            entitlement: None,
            native_route: false,
        },
    )
    .await
}

pub(crate) async fn forward_codex_chat_completions_routed(
    state: &AppState,
    headers: &HeaderMap,
    body: serde_json::Value,
    routing_body: &serde_json::Value,
    surface: Surface,
    context: RoutedSubscriptionContext<'_>,
) -> Response {
    forward_subscription_openai_inner(
        state,
        headers,
        body,
        routing_body,
        ForwardOptions {
            path: "/v1/responses",
            surface,
            response_shape: SubscriptionResponseShape::ChatCompletion,
            validated: context.validated,
            entitlement: context.entitlement,
            native_route: context.native_route,
        },
    )
    .await
}

#[derive(Clone, Copy, PartialEq, Eq)]
enum SubscriptionResponseShape {
    Passthrough,
    ChatCompletion,
}

struct ForwardOptions<'a> {
    path: &'a str,
    surface: Surface,
    response_shape: SubscriptionResponseShape,
    validated: Option<&'a crate::model_routing::ValidatedSubscription>,
    entitlement: Option<crate::client_policy::EntitlementDecision>,
    native_route: bool,
}

async fn forward_subscription_openai_inner(
    state: &AppState,
    headers: &HeaderMap,
    mut body: serde_json::Value,
    routing_body: &serde_json::Value,
    options: ForwardOptions<'_>,
) -> Response {
    let ForwardOptions {
        path,
        surface,
        response_shape,
        validated,
        entitlement,
        native_route,
    } = options;
    if let Some(resp) = maybe_mpp_challenge(state, headers, path) {
        return resp;
    }

    let claims = match crate::proxy::authenticate_client(state, headers) {
        Ok(claims) => claims,
        Err(response) => return *response,
    };
    let Some(provider) = state.upstream_provider.subscription_provider() else {
        return error_response(
            StatusCode::INTERNAL_SERVER_ERROR,
            "api_error",
            "active upstream is not a subscription provider",
        );
    };
    let protocol = match surface {
        Surface::Anthropic => crate::client_policy::ClientProtocol::AnthropicMessages,
        Surface::OpenAIChat => crate::client_policy::ClientProtocol::OpenAIChat,
        Surface::OpenAIResponses => crate::client_policy::ClientProtocol::OpenAIResponses,
    };
    // `path` names the provider endpoint after protocol translation. Request
    // evidence must instead be checked against the client-facing protocol;
    // otherwise a legitimate Claude request bridged to Codex is compared with
    // `/v1/responses` and denied before dispatch.
    let client_path = match surface {
        Surface::Anthropic => "/v1/messages",
        Surface::OpenAIChat => "/v1/chat/completions",
        Surface::OpenAIResponses => "/v1/responses",
    };
    let entitlement = match entitlement {
        Some(entitlement) => entitlement,
        None => match crate::client_policy::enforce_subscription_for_claims(
            state,
            &claims,
            headers,
            provider,
            protocol,
            client_path,
        ) {
            Ok(decision) => decision,
            Err(response) => return response,
        },
    };
    let native_protocol = native_route
        && response_shape == SubscriptionResponseShape::Passthrough
        && entitlement == crate::client_policy::EntitlementDecision::Native;
    let reserved = crate::token_reservation::estimate(routing_body).total();
    if let Err(e) = state
        .token_manager
        .enforce_request_budget_reserving(&claims.sub, reserved)
    {
        return crate::token_http::budget_error_response(&e);
    }
    let mut reservation = crate::usage::ReservationGuard::new(
        state.token_manager.clone(),
        claims.sub.clone(),
        reserved,
    );
    let resolved_model = body.get("model").and_then(serde_json::Value::as_str);
    crate::audit::record_authorised_request_with_resolved_model(
        state,
        &claims,
        surface,
        path,
        Some(routing_body),
        resolved_model,
    );

    let responses_mode = codex_responses_mode(provider, headers);
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
    let selected = if let Some(validated) = validated {
        if validated.provider != provider {
            return error_response(
                StatusCode::INTERNAL_SERVER_ERROR,
                "api_error",
                "validated subscription does not match the routed provider",
            );
        }
        match validated
            .for_dispatch_with_context(state, &routing_context)
            .await
        {
            Ok(selected) => selected,
            Err(error) => {
                return error_response(
                    StatusCode::SERVICE_UNAVAILABLE,
                    "authentication_error",
                    &error,
                );
            }
        }
    } else if let Some(router) = state.account_router.as_ref() {
        match router
            .select_subscription_where_authoritative(
                &routing_context,
                &state.subscription_cache,
                |_| true,
            )
            .await
        {
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
        state
            .subscription_cache
            .register_reader(crate::credential_recovery_store::PRIMARY_ACCOUNT, reader);
        let Ok(Some(disk_token)) = state
            .subscription_cache
            .load_authoritative(provider, crate::credential_recovery_store::PRIMARY_ACCOUNT)
            .await
        else {
            return error_response(
                StatusCode::BAD_GATEWAY,
                "authentication_error",
                &format!("failed to read {provider} subscription credentials"),
            );
        };
        crate::accounts::SelectedSubscriptionAccount {
            name: "primary".to_string(),
            token: disk_token,
        }
    };
    // Automatic model routing already refreshed and validated this exact
    // token. Refreshing again here could adopt a credential that appeared
    // after catalog validation, recreating the account-crossing race.
    let sub_token = if validated.is_some() {
        selected.token
    } else {
        // Pinned routing performs its ordinary serving-path refresh here.
        let now_ms = chrono::Utc::now().timestamp_millis();
        match state
            .subscription_cache
            .get_fresh_loaded(
                &state.client,
                provider,
                &selected.name,
                selected.token,
                now_ms,
            )
            .await
        {
            Ok(token) => token,
            Err(error) => {
                return error_response(
                    StatusCode::SERVICE_UNAVAILABLE,
                    "authentication_error",
                    &error,
                );
            }
        }
    };
    let selected_account = Some(selected.name);
    // Evidence must name the credential that produced the final upstream
    // response. A successful reactive retry replaces this below.
    let mut evidence_token = Some(sub_token.clone());

    // The Codex backend rejects every explicit output cap, so the field is
    // stripped below and enforced locally instead of refusing the request
    // (see `crate::output_limit`). Providers that accept the field keep it.
    let emulated_output_limit = (!native_protocol
        && crate::capabilities::subscription(provider, None).output_token_limit
            == crate::capabilities::Capability::Emulated)
        .then(|| {
            body.get("max_output_tokens")
                .and_then(serde_json::Value::as_u64)
        })
        .flatten();

    let stream_requested = body
        .get("stream")
        .and_then(serde_json::Value::as_bool)
        .unwrap_or(false);

    // The ChatGPT Codex backend is stricter than the generic Responses API, so
    // reshape the body before forwarding (see `normalize_codex_responses_body`).
    if !native_protocol {
        normalize_subscription_request(provider, &mut body, responses_mode);
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

    let base_url = state
        .subscription_base_url
        .clone()
        .unwrap_or_else(|| sub_token.base_url(provider));
    let upstream_url = join_subscription_url(provider, &base_url, path);

    let build_request = |token: &crate::subscription::SubscriptionToken| {
        let mut request = state.client.post(upstream_url.clone());
        if native_protocol {
            let mut native_headers =
                crate::proxy::native_request_headers(headers, &token.access_token);
            if provider == SubscriptionProvider::Codex
                && let Some(account_id) = token.account_id.as_deref()
                && let Ok(value) = HeaderValue::from_str(account_id)
            {
                native_headers.insert("chatgpt-account-id", value);
            }
            request = request.headers(native_headers);
        } else {
            request = request
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", token.access_token));
            for (name, value) in subscription_headers(provider, token, responses_mode) {
                request = request.header(name, value);
            }
        }
        request.body(serialized.clone())
    };

    let correlation_id = crate::request_log::correlation_id(headers);
    let mut upstream_resp = match state
        .request_log
        .send_upstream(&correlation_id, &state.client, build_request(&sub_token))
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
    // A validated automatic route owns one account/catalog decision for the
    // whole request. Its 401 is returned unchanged: the ordinary recovery
    // ladder could adopt a different account that appeared after validation.
    // A non-validated pinned route keeps the established reactive refresh.
    // A `401` is the vendor disproving the token's own `exp` claim: it may have
    // invalidated the access token early, and the stored expiry is no evidence
    // to the contrary. Refresh and replay the request exactly once, so a
    // recoverable credential is not reported as dead (issue #205).
    if validated.is_none()
        && upstream_resp.status() == reqwest::StatusCode::UNAUTHORIZED
        && let Some(account) = selected_account.as_deref()
        && let Some(refreshed) = state
            .subscription_cache
            .refresh_rejected(
                &state.client,
                provider,
                account,
                sub_token.clone(),
                chrono::Utc::now().timestamp_millis(),
            )
            .await
    {
        tracing::info!(
            "{provider} rejected an unexpired access token; retrying once with a refreshed one"
        );
        match state
            .request_log
            .send_upstream(&correlation_id, &state.client, build_request(&refreshed))
            .await
        {
            // Only one retry: a second 401 is surfaced rather than looped.
            Ok(retried) => {
                upstream_resp = retried;
                evidence_token = Some(refreshed);
            }
            Err(error) => {
                tracing::warn!("{provider} retry after refresh failed: {error}");
                // B produced no HTTP status. The retained A response is still
                // returned to the caller, but its verdict was superseded by
                // the successful rotation and must not be attributed to B.
                evidence_token = None;
            }
        }
    }

    let status = StatusCode::from_u16(upstream_resp.status().as_u16())
        .unwrap_or(StatusCode::INTERNAL_SERVER_ERROR);
    state
        .metrics
        .record_request(surface, status.as_u16(), selected_account.as_deref());
    if let Some(evidence_token) = evidence_token.as_ref() {
        state
            .subscription_cache
            .record_status_for_credential(
                provider,
                selected_account
                    .as_deref()
                    .unwrap_or(crate::credential_recovery_store::PRIMARY_ACCOUNT),
                evidence_token,
                status.as_u16(),
            )
            .await;
    }
    let retry_after = retry_after_duration(upstream_resp.headers());
    if status == StatusCode::TOO_MANY_REQUESTS
        && let (Some(router), Some(account)) =
            (state.account_router.as_ref(), selected_account.as_deref())
    {
        router.report_failure_with_retry_after(
            account,
            "subscription upstream returned 429",
            retry_after,
        );
    }

    let content_type = upstream_resp
        .headers()
        .get("content-type")
        .cloned()
        .unwrap_or_else(|| HeaderValue::from_static("application/json"));
    // Relay the same safe end-to-end response fields as the Claude path,
    // including provider-specific quota signals and request IDs.
    let response_headers = relay_response_headers(upstream_resp.headers());

    let codex = provider == SubscriptionProvider::Codex;
    if stream_requested || ((!codex || native_protocol) && is_event_stream(&content_type)) {
        // The Codex backend streams SSE but labels it `application/json`; re-label
        // so SSE-aware clients treat the body as the stream it is.
        let stream_content_type = if codex && !native_protocol {
            HeaderValue::from_static("text/event-stream")
        } else {
            content_type
        };
        let requested_model = routing_body
            .get("model")
            .and_then(serde_json::Value::as_str)
            .unwrap_or_default();
        let include_usage = routing_body
            .pointer("/stream_options/include_usage")
            .and_then(serde_json::Value::as_bool)
            .unwrap_or(false);
        let stop_sequences = crate::stop_sequences::from_value(routing_body.get("stop"));
        let mut translator = crate::responses::ResponsesChatStreamTranslator::new(requested_model)
            .with_include_usage(include_usage)
            .with_stop_sequences(stop_sequences)
            .with_output_token_limit(emulated_output_limit);
        let mut rewriter = crate::output_limit::ResponsesStreamRewriter::new(
            requested_model,
            emulated_output_limit,
        );
        let rewrite_passthrough = !native_protocol
            && response_shape == SubscriptionResponseShape::Passthrough
            && rewriter.active();
        let response_log = std::sync::Arc::clone(&state.request_log);
        let mut usage = status
            .is_success()
            .then(|| reservation.take().into_tracker());
        let stream = upstream_resp.bytes_stream().map(move |chunk| {
            chunk.map_or_else(
                |error| Err(std::io::Error::other(error)),
                |bytes| {
                    response_log.record_upstream_body(&correlation_id, &bytes);
                    if let Some(tracker) = &mut usage {
                        tracker.feed(&bytes);
                    }
                    if codex && response_shape == SubscriptionResponseShape::ChatCompletion {
                        Ok(bytes::Bytes::from(translator.push(&bytes).join("")))
                    } else if rewrite_passthrough {
                        Ok(bytes::Bytes::from(rewriter.push(&bytes)))
                    } else {
                        Ok(bytes)
                    }
                },
            )
        });
        let mut response = Response::new(Body::from_stream(stream));
        *response.status_mut() = status;
        *response.headers_mut() = response_headers;
        response
            .headers_mut()
            .insert("content-type", stream_content_type);
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
    if status.is_success() {
        let mut usage = reservation.take().into_tracker();
        usage.feed(&upstream_body);
    }

    if native_protocol {
        let mut response = Response::new(Body::from(upstream_body));
        *response.status_mut() = status;
        *response.headers_mut() = response_headers;
        return response;
    }

    // The Codex backend always streams Server-Sent Events even when the client
    // asked for a non-streaming (`stream:false`) response, and labels that SSE
    // body `application/json`. A non-streaming client (e.g. OpenClaw's gateway)
    // then parses the raw event stream as a single JSON object and fails with an
    // incomplete result. Collapse the SSE into the final `response.completed`
    // payload and return it as a normal JSON Responses object.
    let mut response_body = upstream_body;
    let mut upstream_model: Option<String> = None;
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
            let mut translated =
                crate::responses::response_to_chat_completion(&parsed, requested_model);
            crate::responses::enforce_chat_stop(
                &mut translated,
                &crate::stop_sequences::from_value(routing_body.get("stop")),
            );
            if let Some(limit) = emulated_output_limit {
                crate::output_limit::enforce_chat_limit(&mut translated, limit);
            }
            upstream_model = translated
                .get(crate::output_limit::UPSTREAM_MODEL_FIELD)
                .and_then(serde_json::Value::as_str)
                .map(str::to_string);
            response_body = bytes::Bytes::from(
                serde_json::to_vec(&translated).expect("JSON values always serialize"),
            );
        } else if let Ok(mut parsed) = serde_json::from_slice::<serde_json::Value>(&response_body) {
            let requested_model = routing_body
                .get("model")
                .and_then(serde_json::Value::as_str)
                .unwrap_or_default();
            upstream_model =
                crate::output_limit::preserve_model_identity(&mut parsed, requested_model);
            if let Some(limit) = emulated_output_limit {
                crate::output_limit::enforce_response_limit(&mut parsed, limit);
            }
            response_body = bytes::Bytes::from(
                serde_json::to_vec(&parsed).expect("JSON values always serialize"),
            );
        }

        let mut response = Response::new(Body::from(response_body));
        *response.status_mut() = status;
        *response.headers_mut() = response_headers;
        response
            .headers_mut()
            .insert("content-type", HeaderValue::from_static("application/json"));
        if let Some(served) = upstream_model.as_deref()
            && let Ok(value) = HeaderValue::from_str(served)
        {
            response
                .headers_mut()
                .insert(crate::output_limit::UPSTREAM_MODEL_HEADER, value);
        }
        return response;
    }

    if status.is_success()
        && response_shape == SubscriptionResponseShape::Passthrough
        && let Ok(mut parsed) = serde_json::from_slice::<serde_json::Value>(&response_body)
    {
        let requested_model = routing_body
            .get("model")
            .and_then(serde_json::Value::as_str)
            .unwrap_or_default();
        upstream_model = crate::output_limit::preserve_model_identity(&mut parsed, requested_model);
        response_body =
            bytes::Bytes::from(serde_json::to_vec(&parsed).expect("JSON values always serialize"));
    }

    // An upstream failure is re-shaped into the dialect of the surface the
    // caller used, as the Anthropic and Gemini surfaces already do. Relaying the
    // vendor body verbatim left an OpenAI client unable to classify the error,
    // and forwarded fields describing the operator's own subscription
    // (`plan_type`, `eligible_promo`) to a caller who is often a different party
    // (issue #213). The raw body stays in the request log for diagnosis.
    let (response_body, content_type) = if status.is_success() {
        (response_body, content_type)
    } else {
        let rendered = crate::api_error::openai_error_body(status.as_u16(), &response_body);
        (
            bytes::Bytes::from(
                serde_json::to_vec(&rendered).expect("JSON values always serialize"),
            ),
            HeaderValue::from_static("application/json"),
        )
    };

    let mut response = Response::new(Body::from(response_body));
    *response.status_mut() = status;
    *response.headers_mut() = response_headers;
    response.headers_mut().insert("content-type", content_type);
    if let Some(served) = upstream_model.as_deref()
        && let Ok(value) = HeaderValue::from_str(served)
    {
        response
            .headers_mut()
            .insert(crate::output_limit::UPSTREAM_MODEL_HEADER, value);
    }
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

/// Provider-specific extra headers required by the upstream.
fn subscription_headers(
    provider: SubscriptionProvider,
    token: &SubscriptionToken,
    responses_mode: CodexResponsesMode,
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
        if responses_mode == CodexResponsesMode::Lite {
            out.push((CODEX_RESPONSES_LITE_HEADER, "true".to_string()));
        }
        // Codex gates some catalog models behind a recent client version
        // advertised via the `version` header; without it the backend replies "Model not
        // found". Mirror the Codex CLI. Overridable via CODEX_CLIENT_VERSION.
        out.push((
            "version",
            std::env::var("CODEX_CLIENT_VERSION").unwrap_or_else(|_| "0.153.3".to_string()),
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

#[path = "subscription_proxy_normalize.rs"]
mod normalize;
#[cfg(test)]
use normalize::normalize_codex_responses_body;
use normalize::normalize_subscription_request;

#[cfg(test)]
#[path = "subscription_proxy_tests.rs"]
mod tests;
