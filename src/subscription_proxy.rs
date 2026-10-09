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

use axum::http::{HeaderMap, HeaderValue, StatusCode};
use axum::response::Response;

use crate::metrics::Surface;
use crate::proxy::{AppState, error_response, maybe_mpp_challenge, request_routing_context};
use crate::subscription::{SubscriptionProvider, SubscriptionToken};

#[path = "subscription_proxy_sse.rs"]
mod sse;
use sse::codex_sse_to_response_json;

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
        None,
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
        None,
    )
    .await
}

#[allow(clippy::too_many_arguments)]
pub(crate) async fn forward_subscription_openai_routed_native(
    state: &AppState,
    headers: &HeaderMap,
    body: serde_json::Value,
    routing_body: &serde_json::Value,
    path: &str,
    surface: Surface,
    context: RoutedSubscriptionContext<'_>,
    native_body: Option<crate::encoded_request_body::NativeBody>,
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
        native_body,
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
        None,
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
        None,
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
    native_body: Option<crate::encoded_request_body::NativeBody>,
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
    let requested_model_for_policy = routing_body
        .get("model")
        .and_then(serde_json::Value::as_str)
        .unwrap_or_default();
    let model_policy = if requested_model_for_policy.is_empty() {
        match crate::proxy::model_policy_for_claims(state, &claims) {
            Ok(policy) if policy.allowed_models.is_empty() => policy,
            Ok(_) => {
                return error_response(
                    StatusCode::BAD_REQUEST,
                    "model_required",
                    "a pinned credential requires a non-empty exact model",
                );
            }
            Err(error) => {
                return error_response(
                    StatusCode::SERVICE_UNAVAILABLE,
                    "model_policy_unavailable",
                    &error.to_string(),
                );
            }
        }
    } else {
        match crate::proxy::authorize_model_for_claims(
            state,
            &claims,
            requested_model_for_policy,
            crate::api_error::ApiDialect::OpenAi,
        ) {
            Ok(policy) => policy,
            Err(response) => return response,
        }
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
    let client_path = match (surface, native_route, provider) {
        (Surface::OpenAIResponses, true, SubscriptionProvider::Codex) => {
            "/api/services/codex/v1/responses"
        }
        (Surface::Anthropic, _, _) => "/v1/messages",
        (Surface::OpenAIChat, _, _) => "/v1/chat/completions",
        (Surface::OpenAIResponses, _, _) => "/v1/responses",
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
    if provider == SubscriptionProvider::Qwen && path.ends_with("/chat/completions") {
        let model = routing_body
            .get("model")
            .and_then(serde_json::Value::as_str)
            .unwrap_or_default();
        if crate::thinking::suffix_applies(
            routing_body,
            model,
            crate::thinking::ThinkingProtocol::Qwen,
        ) && let Err(reason) = crate::thinking::apply_thinking(
            &mut body,
            routing_body,
            model,
            crate::thinking::ThinkingProtocol::Qwen,
            crate::thinking::ThinkingProtocol::Qwen,
            None,
        ) {
            return error_response(StatusCode::BAD_REQUEST, "invalid_request_error", &reason);
        }
    }
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
    let reservation = crate::usage::ReservationGuard::new(
        state.token_manager.clone(),
        claims.sub.clone(),
        reserved,
    );
    let resolved_model = body
        .get("model")
        .and_then(serde_json::Value::as_str)
        .map(str::to_string);
    crate::audit::record_authorised_request_with_resolved_model_and_entitlement(
        state,
        &claims,
        surface,
        path,
        Some(routing_body),
        resolved_model.as_deref(),
        Some(entitlement),
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
    if let Some(validated) = validated
        && validated.provider != provider
    {
        return error_response(
            StatusCode::INTERNAL_SERVER_ERROR,
            "api_error",
            "validated subscription does not match the routed provider",
        );
    }

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

    let correlation_id = crate::request_log::correlation_id(headers);
    let dispatched = match Box::pin(dispatch::dispatch(dispatch::CodexDispatch {
        state,
        provider,
        headers,
        path,
        surface,
        body: &body,
        native_body: native_body.filter(|_| native_protocol),
        native_protocol,
        from_thinking_suffix: crate::thinking::suffix_applies(
            routing_body,
            requested_model_for_policy,
            match surface {
                Surface::Anthropic => crate::thinking::ThinkingProtocol::Anthropic,
                Surface::OpenAIChat
                    if provider == SubscriptionProvider::Qwen
                        && path.ends_with("/chat/completions") =>
                {
                    crate::thinking::ThinkingProtocol::Qwen
                }
                Surface::OpenAIChat => crate::thinking::ThinkingProtocol::OpenAIChat,
                Surface::OpenAIResponses => crate::thinking::ThinkingProtocol::OpenAIResponses,
            },
        ),
        responses_mode,
        validated,
        context: routing_context,
        correlation_id: &correlation_id,
    }))
    .await
    {
        Ok(dispatched) => dispatched,
        Err(response) => return response,
    };
    let selector_kind = state.model_catalogs.selector_kind_for(
        provider,
        &dispatched.account,
        requested_model_for_policy,
    );
    let status = StatusCode::from_u16(dispatched.response.status().as_u16())
        .unwrap_or(StatusCode::INTERNAL_SERVER_ERROR);
    state
        .metrics
        .record_request(surface, status.as_u16(), Some(&dispatched.account));
    Box::pin(relay::relay(
        relay::Relay {
            state,
            claims: &claims,
            surface,
            path,
            routing_body,
            provider,
            native_protocol,
            response_shape,
            model_policy,
            selector_kind,
            emulated_output_limit,
            resolved_model,
            selected_account: Some(dispatched.account),
            base_url: dispatched.base_url,
            correlation_id,
            stream_requested,
            bytes_sent: dispatched.bytes_sent,
            reservation,
        },
        status,
        dispatched.response,
    ))
    .await
}
/// Map a route to a flat Codex endpoint or an `OpenAI`-compatible `/v1` base.
pub(crate) fn join_subscription_url(
    provider: SubscriptionProvider,
    base_url: &str,
    path: &str,
) -> String {
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

#[path = "subscription_proxy_headers.rs"]
mod upstream_headers;
use upstream_headers::subscription_headers;

#[path = "subscription_proxy_normalize.rs"]
mod normalize;
#[cfg(test)]
use normalize::normalize_codex_responses_body;
use normalize::normalize_subscription_request;

#[cfg(test)]
#[path = "subscription_proxy_tests.rs"]
mod tests;

#[path = "subscription_proxy_dispatch.rs"]
mod dispatch;

#[path = "subscription_proxy_relay.rs"]
mod relay;
