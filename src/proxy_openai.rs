#![allow(clippy::redundant_pub_crate)]

use super::{
    AppState, BTreeMap, HeaderMap, JsonRejection, OpenAIForwardContext, OpenAIShape, Query,
    Response, State, StatusCode, UpstreamProvider, forward_openai, openai, responses,
};

#[path = "proxy_openai_resource.rs"]
mod resource;
use resource::{capture_created_resource, state_for_previous_response};
pub(crate) use resource::{rewrite_routed_model, route_openai_request};

/// Provider-independent fields owned by the Chat Completions surface.
///
/// Passthrough providers may accept extensions and some provide a default
/// model, so validating the entire normalized request here would narrow their
/// public contract. `messages`, however, belongs to Chat Completions itself and
/// must exist before routing or translating to any upstream dialect (#387).
#[derive(serde::Deserialize)]
struct RequiredChatFields {
    #[allow(dead_code)]
    messages: Vec<openai::ChatMessage>,
}

include!("proxy_openai_diagnostics.rs");

pub async fn openai_chat_completions(
    State(state): State<AppState>,
    Query(query): Query<BTreeMap<String, String>>,
    headers: HeaderMap,
    body: Result<axum::Json<serde_json::Value>, JsonRejection>,
) -> Response {
    openai_chat_completions_with_subscription(
        state,
        query,
        headers,
        body,
        None,
        None,
        false,
        crate::response_affinity::ResponseNamespace::OpenAiChat,
    )
    .await
}

/// Native Qwen Chat Completions route. A matching signed Qwen client keeps
/// application-protocol transparency through its own subscription upstream.
pub async fn openai_chat_completions_native(
    State(state): State<AppState>,
    Query(query): Query<BTreeMap<String, String>>,
    headers: HeaderMap,
    body: Result<axum::Json<serde_json::Value>, JsonRejection>,
) -> Response {
    openai_chat_completions_with_subscription(
        state,
        query,
        headers,
        body,
        None,
        None,
        true,
        crate::response_affinity::ResponseNamespace::QwenChat,
    )
    .await
}

pub async fn openai_chat_completions_route(
    State(state): State<AppState>,
    axum::extract::OriginalUri(uri): axum::extract::OriginalUri,
    Query(query): Query<BTreeMap<String, String>>,
    headers: HeaderMap,
    body: Result<axum::Json<serde_json::Value>, JsonRejection>,
) -> Response {
    let Some(namespace) = crate::response_affinity::ResponseNamespace::from_path(uri.path()) else {
        return crate::responses_lifecycle::response_not_found();
    };
    openai_chat_completions_with_subscription(
        state,
        query,
        headers,
        body,
        None,
        None,
        namespace == crate::response_affinity::ResponseNamespace::QwenChat,
        namespace,
    )
    .await
}

pub async fn openai_chat_completions_routed(
    state: AppState,
    headers: HeaderMap,
    body: serde_json::Value,
    subscription: Option<crate::model_routing::ValidatedSubscription>,
    entitlement: crate::client_policy::EntitlementDecision,
) -> Response {
    openai_chat_completions_with_subscription(
        state,
        BTreeMap::new(),
        headers,
        Ok(axum::Json(body)),
        subscription,
        Some(entitlement),
        false,
        crate::response_affinity::ResponseNamespace::OpenAiChat,
    )
    .await
}

#[allow(clippy::too_many_arguments)]
async fn openai_chat_completions_with_subscription(
    state: AppState,
    query: BTreeMap<String, String>,
    headers: HeaderMap,
    body: Result<axum::Json<serde_json::Value>, JsonRejection>,
    initial_subscription: Option<crate::model_routing::ValidatedSubscription>,
    initial_entitlement: Option<crate::client_policy::EntitlementDecision>,
    native_route: bool,
    namespace: crate::response_affinity::ResponseNamespace,
) -> Response {
    let mut body = match body {
        Ok(axum::Json(body)) => body,
        Err(error) => {
            return crate::api_error::malformed_json_response_for_surface(
                crate::metrics::Surface::OpenAIChat,
                &error.body_text(),
            );
        }
    };
    if let Err(error) = serde_json::from_value::<RequiredChatFields>(body.clone()) {
        return crate::api_error::error_response_for_surface(
            crate::metrics::Surface::OpenAIChat,
            StatusCode::BAD_REQUEST,
            "invalid_request_error",
            &format!("invalid OpenAI chat completion request: {error}"),
        );
    }
    let include_usage = body
        .pointer("/stream_options/include_usage")
        .and_then(serde_json::Value::as_bool)
        .unwrap_or(false);
    let stream_from_query = openai::query_stream_requested(&query);
    if stream_from_query {
        body["stream"] = serde_json::json!(true);
    }
    let routing_body = body.clone();
    let routed = if let Some(subscription) = initial_subscription {
        crate::model_routing::RoutedState {
            state,
            subscription: Some(subscription),
        }
    } else {
        match route_openai_request(
            &state,
            &headers,
            &body,
            crate::client_policy::ClientProtocol::OpenAIChat,
            "/v1/chat/completions",
        )
        .await
        {
            Ok(routed) => routed,
            Err(response) => return response,
        }
    };
    let state = routed.state;
    let subscription = routed.subscription;
    rewrite_routed_model(&mut body, &state, subscription.as_ref());
    let store_requested = body.get("store").and_then(serde_json::Value::as_bool) == Some(true);
    if store_requested && state.upstream_provider != UpstreamProvider::OpenAICompatible {
        return crate::api_error::error_response_for_surface(
            crate::metrics::Surface::OpenAIChat,
            StatusCode::BAD_REQUEST,
            "invalid_request_error",
            "the selected provider cannot preserve the stored Chat Completions lifecycle",
        );
    }
    let capture = if store_requested {
        match crate::resource_capture::prepare(&state, &headers, namespace).await {
            Ok(capture) => Some(capture),
            Err(response) => return response,
        }
    } else {
        None
    };
    let entitlement = if let Some(provider) = state.upstream_provider.subscription_provider() {
        match initial_entitlement {
            Some(entitlement) => Some(entitlement),
            None => match crate::client_policy::enforce_subscription(
                &state,
                &headers,
                provider,
                crate::client_policy::ClientProtocol::OpenAIChat,
                "/v1/chat/completions",
            ) {
                Ok(entitlement) => Some(entitlement),
                Err(response) => return response,
            },
        }
    } else {
        None
    };
    if let Some(provider) = state.upstream_provider.subscription_provider()
        && let Some(kind) =
            crate::capabilities::unsupported_server_tool_type(provider, body.get("tools"))
    {
        return crate::api_error::error_response_for_surface(
            crate::metrics::Surface::OpenAIChat,
            StatusCode::BAD_REQUEST,
            "invalid_request_error",
            &format!("Unsupported server-side tool for selected provider: {kind}"),
        );
    }
    if let Some(reason) = crate::capabilities::unhonourable_server_tool_request(
        body.get("tools"),
        body.get("tool_choice"),
    ) {
        return crate::api_error::error_response_for_surface(
            crate::metrics::Surface::OpenAIChat,
            StatusCode::BAD_REQUEST,
            "invalid_request_error",
            &reason,
        );
    }
    if state.upstream_provider == UpstreamProvider::Gonka {
        return crate::gonka::forward_openai(
            &state,
            &headers,
            body,
            "/v1/chat/completions",
            crate::metrics::Surface::OpenAIChat,
        )
        .await;
    }
    if state.upstream_provider == UpstreamProvider::Crater {
        let stream_requested = body
            .get("stream")
            .and_then(serde_json::Value::as_bool)
            .unwrap_or(false);
        return crate::crater::forward_chat_completions(&state, &headers, body, stream_requested)
            .await;
    }
    if state.upstream_provider == UpstreamProvider::ZaiCodingPlan {
        return crate::zai_coding_plan::forward(
            &state,
            &headers,
            body,
            "/v1/chat/completions",
            crate::client_policy::ClientProtocol::OpenAIChat,
            crate::metrics::Surface::OpenAIChat,
        )
        .await;
    }
    if state.upstream_provider == UpstreamProvider::OpenAICompatible {
        let response = crate::provider_proxy::forward_openai_compatible_routed(
            &state,
            &headers,
            body,
            &routing_body,
            "/v1/chat/completions",
            crate::metrics::Surface::OpenAIChat,
        )
        .await;
        return capture_created_resource(&state, capture, response).await;
    }
    if state.upstream_provider == UpstreamProvider::Qwen {
        return crate::subscription_proxy::forward_subscription_openai_routed(
            &state,
            &headers,
            body,
            &routing_body,
            "/v1/chat/completions",
            crate::metrics::Surface::OpenAIChat,
            crate::subscription_proxy::RoutedSubscriptionContext {
                validated: subscription.as_ref(),
                entitlement,
                native_route,
            },
        )
        .await;
    }
    if let Some(reason) = crate::bridge_controls::unknown_chat_field(&body) {
        return crate::api_error::error_response_for_surface(
            crate::metrics::Surface::OpenAIChat,
            StatusCode::BAD_REQUEST,
            "invalid_request_error",
            &reason,
        );
    }
    if let Some(reason) =
        crate::bridge_controls::untranslatable_chat_prediction(body.get("prediction"))
    {
        return crate::api_error::error_response_for_surface(
            crate::metrics::Surface::OpenAIChat,
            StatusCode::BAD_REQUEST,
            "invalid_request_error",
            &reason,
        );
    }
    if let Some(reason) = crate::bridge_controls::untranslatable_chat_participant_name(&body) {
        return crate::api_error::error_response_for_surface(
            crate::metrics::Surface::OpenAIChat,
            StatusCode::BAD_REQUEST,
            "invalid_request_error",
            &reason,
        );
    }
    if state.upstream_provider == UpstreamProvider::Gemini {
        if let Some(reason) =
            crate::bridge_controls::untranslatable_openai_service_tier(body.get("service_tier"))
        {
            return crate::api_error::error_response_for_surface(
                crate::metrics::Surface::OpenAIChat,
                StatusCode::BAD_REQUEST,
                "invalid_request_error",
                &reason,
            );
        }
        if let Some(reason) =
            crate::bridge_controls::untranslatable_moderation(body.get("moderation"))
        {
            return crate::api_error::error_response_for_surface(
                crate::metrics::Surface::OpenAIChat,
                StatusCode::BAD_REQUEST,
                "invalid_request_error",
                &reason,
            );
        }
        if let Err(reason) = crate::bridge_controls::validate_openai_prompt_cache(&body, false) {
            return crate::api_error::error_response_for_surface(
                crate::metrics::Surface::OpenAIChat,
                StatusCode::BAD_REQUEST,
                "invalid_request_error",
                &reason,
            );
        }
        return crate::gemini::forward_chat_completions_routed(
            &state,
            &headers,
            body,
            &routing_body,
            subscription.as_ref(),
        )
        .await;
    }
    if state.upstream_provider == UpstreamProvider::Codex {
        if let Some(reason) = crate::bridge_controls::codex_instruction_cache_breakpoint(&body) {
            return crate::api_error::error_response_for_surface(
                crate::metrics::Surface::OpenAIChat,
                StatusCode::BAD_REQUEST,
                "invalid_request_error",
                &reason,
            );
        }
        if let Err(reason) =
            crate::safety_identifier::validate_openai_value(body.get("safety_identifier"))
        {
            return crate::api_error::error_response_for_surface(
                crate::metrics::Surface::OpenAIChat,
                StatusCode::BAD_REQUEST,
                "invalid_request_error",
                &reason,
            );
        }
        if let Err(reason) = crate::safety_identifier::validate_openai_user_value(body.get("user"))
        {
            return crate::api_error::error_response_for_surface(
                crate::metrics::Surface::OpenAIChat,
                StatusCode::BAD_REQUEST,
                "invalid_request_error",
                &reason,
            );
        }
        let request =
            match serde_json::from_value::<openai::OpenAIChatCompletionRequest>(body.clone()) {
                Ok(request) => request,
                Err(error) => {
                    return crate::api_error::error_response_for_surface(
                        crate::metrics::Surface::OpenAIChat,
                        StatusCode::BAD_REQUEST,
                        "invalid_request_error",
                        &format!("invalid OpenAI chat completion request: {error}"),
                    );
                }
            };
        if let Err(reason) =
            crate::structured_output::chat_to_responses_format(request.response_format.as_ref())
        {
            return crate::api_error::error_response_for_surface(
                crate::metrics::Surface::OpenAIChat,
                StatusCode::BAD_REQUEST,
                "invalid_request_error",
                &reason,
            );
        }
        if let Some(reason) = crate::structured_output::unsupported_chat_output_contract(&request) {
            return crate::api_error::error_response_for_surface(
                crate::metrics::Surface::OpenAIChat,
                StatusCode::BAD_REQUEST,
                "invalid_request_error",
                &reason,
            );
        }
        if let Some(reason) =
            crate::structured_output::unsupported_chat_generation_control(&request)
        {
            return crate::api_error::error_response_for_surface(
                crate::metrics::Surface::OpenAIChat,
                StatusCode::BAD_REQUEST,
                "invalid_request_error",
                &reason,
            );
        }
        // The ChatGPT backend speaks only the Responses API; translate the
        // Chat Completions request before forwarding.
        let responses_body = match responses::try_chat_completion_to_responses(&body) {
            Ok(body) => body,
            Err(reason) => {
                return crate::api_error::error_response_for_surface(
                    crate::metrics::Surface::OpenAIChat,
                    StatusCode::BAD_REQUEST,
                    "invalid_request_error",
                    &reason,
                );
            }
        };
        return crate::subscription_proxy::forward_codex_chat_completions_routed(
            &state,
            &headers,
            responses_body,
            &routing_body,
            crate::metrics::Surface::OpenAIChat,
            crate::subscription_proxy::RoutedSubscriptionContext {
                validated: subscription.as_ref(),
                entitlement,
                native_route,
            },
        )
        .await;
    }
    if let Some(reason) =
        crate::bridge_controls::untranslatable_openai_service_tier(body.get("service_tier"))
    {
        return crate::api_error::error_response_for_surface(
            crate::metrics::Surface::OpenAIChat,
            StatusCode::BAD_REQUEST,
            "invalid_request_error",
            &reason,
        );
    }
    if let Some(reason) = crate::bridge_controls::untranslatable_moderation(body.get("moderation"))
    {
        return crate::api_error::error_response_for_surface(
            crate::metrics::Surface::OpenAIChat,
            StatusCode::BAD_REQUEST,
            "invalid_request_error",
            &reason,
        );
    }
    if let Err(reason) = crate::bridge_controls::validate_openai_prompt_cache(&body, true) {
        return crate::api_error::error_response_for_surface(
            crate::metrics::Surface::OpenAIChat,
            StatusCode::BAD_REQUEST,
            "invalid_request_error",
            &reason,
        );
    }
    let req = match serde_json::from_value::<openai::OpenAIChatCompletionRequest>(body) {
        Ok(req) => req,
        Err(e) => {
            return crate::api_error::error_response_for_surface(
                crate::metrics::Surface::OpenAIChat,
                StatusCode::BAD_REQUEST,
                "invalid_request_error",
                &format!("invalid OpenAI chat completion request: {e}"),
            );
        }
    };
    let stream_requested = req.stream.unwrap_or(false) || stream_from_query;
    if let Err(reason) = crate::safety_identifier::validate_openai(req.safety_identifier.as_deref())
    {
        return crate::api_error::error_response_for_surface(
            crate::metrics::Surface::OpenAIChat,
            StatusCode::BAD_REQUEST,
            "invalid_request_error",
            &reason,
        );
    }
    if let Err(reason) = crate::safety_identifier::validate_openai_user(req.user.as_deref()) {
        return crate::api_error::error_response_for_surface(
            crate::metrics::Surface::OpenAIChat,
            StatusCode::BAD_REQUEST,
            "invalid_request_error",
            &reason,
        );
    }
    if let Err(reason) = crate::structured_output::chat_format(req.response_format.as_ref()) {
        return crate::api_error::error_response_for_surface(
            crate::metrics::Surface::OpenAIChat,
            StatusCode::BAD_REQUEST,
            "invalid_request_error",
            &reason,
        );
    }
    if let Some(reason) = crate::structured_output::unsupported_chat_output_contract(&req) {
        return crate::api_error::error_response_for_surface(
            crate::metrics::Surface::OpenAIChat,
            StatusCode::BAD_REQUEST,
            "invalid_request_error",
            &reason,
        );
    }
    if let Some(reason) = crate::structured_output::unsupported_chat_generation_control(&req) {
        return crate::api_error::error_response_for_surface(
            crate::metrics::Surface::OpenAIChat,
            StatusCode::BAD_REQUEST,
            "invalid_request_error",
            &reason,
        );
    }
    // Validate against the account's live catalog rather than a built-in alias
    // table (issue #192). An account that has discovered nothing cannot judge
    // the name, so the upstream is left to decide.
    let catalog = state
        .model_catalogs
        .models(crate::subscription::SubscriptionProvider::Claude);
    if openai::resolve_model_with(&req.model, &BTreeMap::new(), &catalog).is_none() {
        return crate::model_routing::model_not_found_response(&req.model, &catalog);
    }
    // A tool entry Anthropic cannot represent is dropped, not fatal. Codex CLI
    // sends `namespace`, `custom` and `tool_search` in its ordinary tool set, so
    // rejecting the request refused nine usable tools over one that did not fit
    // — and made a documented client unable to drive Claude models at all
    // (issue #215). The drop is reported below so it is discoverable.
    let dropped_tools = req
        .tools
        .as_ref()
        .map(openai::untranslatable_anthropic_tools)
        .unwrap_or_default();
    if let Some(reason) = req
        .tools
        .as_ref()
        .and_then(openai::invalid_anthropic_tool_definition)
    {
        return crate::api_error::error_response_for_surface(
            crate::metrics::Surface::OpenAIChat,
            StatusCode::BAD_REQUEST,
            "invalid_request_error",
            &reason,
        );
    }
    if let Some(reason) = req
        .tool_choice
        .as_ref()
        .and_then(openai::untranslatable_anthropic_tool_choice)
    {
        return crate::api_error::error_response_for_surface(
            crate::metrics::Surface::OpenAIChat,
            StatusCode::BAD_REQUEST,
            "invalid_request_error",
            &reason,
        );
    }
    if let Some(reason) = openai::untranslatable_chat_tool_history(&req.messages) {
        return crate::api_error::error_response_for_surface(
            crate::metrics::Surface::OpenAIChat,
            StatusCode::BAD_REQUEST,
            "invalid_request_error",
            &reason,
        );
    }
    let body = openai::chat_completion_to_anthropic(&req);
    let response = forward_openai(
        &state,
        &headers,
        body,
        OpenAIForwardContext {
            routing_body: &routing_body,
            surface: crate::metrics::Surface::OpenAIChat,
            stream_options: (stream_requested, OpenAIShape::Chat, include_usage),
            validated: subscription.as_ref(),
            entitlement_granted: true,
        },
    )
    .await;
    report_dropped_tools(&state, &headers, response, &dropped_tools)
}

/// `POST /v1/responses` — `OpenAI` Responses API.
pub async fn openai_responses(
    State(state): State<AppState>,
    headers: HeaderMap,
    body: Result<axum::Json<serde_json::Value>, JsonRejection>,
) -> Response {
    openai_responses_with_route(
        state,
        headers,
        extracted_responses_body(body),
        false,
        crate::response_affinity::ResponseNamespace::OpenAiResponses,
    )
    .await
}

/// Native Codex Responses route. A matching signed Codex client keeps the
/// exact request and upstream response semantics on this dedicated namespace.
pub async fn openai_responses_native(
    State(state): State<AppState>,
    headers: HeaderMap,
    body: Result<axum::Json<serde_json::Value>, JsonRejection>,
) -> Response {
    openai_responses_with_route(
        state,
        headers,
        extracted_responses_body(body),
        true,
        crate::response_affinity::ResponseNamespace::CodexResponses,
    )
    .await
}

pub async fn openai_responses_route(
    State(state): State<AppState>,
    axum::extract::OriginalUri(uri): axum::extract::OriginalUri,
    request: axum::extract::Request,
) -> Response {
    let Some(namespace) = crate::response_affinity::ResponseNamespace::from_path(uri.path()) else {
        return crate::responses_lifecycle::response_not_found();
    };
    let native_route = namespace == crate::response_affinity::ResponseNamespace::CodexResponses;
    let headers = request.headers().clone();
    if let Err(response) = crate::proxy::authenticate_client(&state, &headers) {
        return *response;
    }
    let parsed = match crate::encoded_request_body::read_native_json(
        &headers,
        request.into_body(),
        state.max_proxy_request_bytes,
        native_route,
    )
    .await
    {
        Ok(parsed) => parsed,
        Err(response) => return response,
    };
    openai_responses_with_route(
        state,
        headers,
        Ok((parsed.value, native_route.then_some(parsed.native))),
        native_route,
        namespace,
    )
    .await
}

fn extracted_responses_body(
    body: Result<axum::Json<serde_json::Value>, JsonRejection>,
) -> Result<
    (
        serde_json::Value,
        Option<crate::encoded_request_body::NativeBody>,
    ),
    Response,
> {
    body.map(|axum::Json(value)| (value, None))
        .map_err(|error| {
            crate::api_error::malformed_json_response_for_surface(
                crate::metrics::Surface::OpenAIResponses,
                &error.body_text(),
            )
        })
}

async fn openai_responses_with_route(
    state: AppState,
    headers: HeaderMap,
    body: Result<
        (
            serde_json::Value,
            Option<crate::encoded_request_body::NativeBody>,
        ),
        Response,
    >,
    native_route: bool,
    namespace: crate::response_affinity::ResponseNamespace,
) -> Response {
    let (mut body, native_body) = match body {
        Ok(body) => body,
        Err(response) => return response,
    };
    let state = match state_for_previous_response(&state, &headers, namespace, &body) {
        Ok(state) => state,
        Err(response) => return response,
    };
    let routing_body = body.clone();
    let routed = match route_openai_request(
        &state,
        &headers,
        &body,
        crate::client_policy::ClientProtocol::OpenAIResponses,
        "/v1/responses",
    )
    .await
    {
        Ok(routed) => routed,
        Err(response) => return response,
    };
    let state = routed.state;
    let subscription = routed.subscription;
    rewrite_routed_model(&mut body, &state, subscription.as_ref());
    let store_requested = body.get("store").and_then(serde_json::Value::as_bool) == Some(true);
    let persistent_response_capable = matches!(
        state.upstream_provider,
        UpstreamProvider::OpenAICompatible | UpstreamProvider::Codex | UpstreamProvider::Qwen
    );
    if store_requested && !persistent_response_capable {
        return crate::api_error::error_response_for_surface(
            crate::metrics::Surface::OpenAIResponses,
            StatusCode::BAD_REQUEST,
            "invalid_request_error",
            "the selected provider cannot preserve the stored Responses lifecycle",
        );
    }
    // The native Responses protocol stores by default; `store: false` is the
    // only opt-out. Translated providers retain their historical stateless
    // default and reject an explicit storage request above.
    let should_capture = persistent_response_capable
        && body.get("store").and_then(serde_json::Value::as_bool) != Some(false);
    let capture = if should_capture {
        match crate::resource_capture::prepare(&state, &headers, namespace).await {
            Ok(capture) => Some(capture),
            Err(response) => return response,
        }
    } else {
        None
    };
    if let Some(provider) = state.upstream_provider.subscription_provider()
        && let Err(response) = crate::client_policy::enforce_subscription(
            &state,
            &headers,
            provider,
            crate::client_policy::ClientProtocol::OpenAIResponses,
            "/v1/responses",
        )
    {
        return response;
    }
    if let Some(provider) = state.upstream_provider.subscription_provider()
        && let Some(kind) =
            crate::capabilities::unsupported_server_tool_type(provider, body.get("tools"))
    {
        return crate::api_error::error_response_for_surface(
            crate::metrics::Surface::OpenAIResponses,
            StatusCode::BAD_REQUEST,
            "invalid_request_error",
            &format!("Unsupported server-side tool for selected provider: {kind}"),
        );
    }
    if let Some(reason) = crate::capabilities::unhonourable_server_tool_request(
        body.get("tools"),
        body.get("tool_choice"),
    ) {
        return crate::api_error::error_response_for_surface(
            crate::metrics::Surface::OpenAIResponses,
            StatusCode::BAD_REQUEST,
            "invalid_request_error",
            &reason,
        );
    }
    if state.upstream_provider == UpstreamProvider::Gonka {
        return crate::gonka::forward_openai(
            &state,
            &headers,
            body,
            "/v1/responses",
            crate::metrics::Surface::OpenAIResponses,
        )
        .await;
    }
    if state.upstream_provider == UpstreamProvider::ZaiCodingPlan {
        return crate::zai_coding_plan::forward(
            &state,
            &headers,
            body,
            "/v1/responses",
            crate::client_policy::ClientProtocol::OpenAIResponses,
            crate::metrics::Surface::OpenAIResponses,
        )
        .await;
    }
    if state.upstream_provider == UpstreamProvider::OpenAICompatible {
        let response = crate::provider_proxy::forward_openai_compatible_routed(
            &state,
            &headers,
            body,
            &routing_body,
            "/v1/responses",
            crate::metrics::Surface::OpenAIResponses,
        )
        .await;
        return capture_created_resource(&state, capture, response).await;
    }
    if matches!(
        state.upstream_provider,
        UpstreamProvider::Codex | UpstreamProvider::Qwen
    ) {
        let response = crate::subscription_proxy::forward_subscription_openai_routed_native(
            &state,
            &headers,
            body,
            &routing_body,
            "/v1/responses",
            crate::metrics::Surface::OpenAIResponses,
            crate::subscription_proxy::RoutedSubscriptionContext {
                validated: subscription.as_ref(),
                entitlement: None,
                native_route,
            },
            native_body,
        )
        .await;
        return capture_created_resource(&state, capture, response).await;
    }
    if let Some(reason) = crate::bridge_controls::unknown_responses_field(&body) {
        return crate::api_error::error_response_for_surface(
            crate::metrics::Surface::OpenAIResponses,
            StatusCode::BAD_REQUEST,
            "invalid_request_error",
            &reason,
        );
    }
    if let Err(reason) = crate::bridge_controls::validate_responses_resource_selectors(&body) {
        return crate::api_error::error_response_for_surface(
            crate::metrics::Surface::OpenAIResponses,
            StatusCode::BAD_REQUEST,
            "invalid_request_error",
            &reason,
        );
    }
    if let Some(reason) =
        crate::bridge_controls::untranslatable_openai_service_tier(body.get("service_tier"))
    {
        return crate::api_error::error_response_for_surface(
            crate::metrics::Surface::OpenAIResponses,
            StatusCode::BAD_REQUEST,
            "invalid_request_error",
            &reason,
        );
    }
    if let Some(reason) = crate::bridge_controls::untranslatable_moderation(body.get("moderation"))
    {
        return crate::api_error::error_response_for_surface(
            crate::metrics::Surface::OpenAIResponses,
            StatusCode::BAD_REQUEST,
            "invalid_request_error",
            &reason,
        );
    }
    if let Err(reason) = crate::bridge_controls::validate_openai_prompt_cache(
        &body,
        state.upstream_provider != UpstreamProvider::Gemini,
    ) {
        return crate::api_error::error_response_for_surface(
            crate::metrics::Surface::OpenAIResponses,
            StatusCode::BAD_REQUEST,
            "invalid_request_error",
            &reason,
        );
    }
    if state.upstream_provider == UpstreamProvider::Gemini {
        return crate::gemini::forward_responses_routed(
            &state,
            &headers,
            body,
            &routing_body,
            subscription.as_ref(),
        )
        .await;
    }
    if let Some(reason) = crate::bridge_request::untranslatable_responses_state(&body) {
        return crate::api_error::error_response_for_surface(
            crate::metrics::Surface::OpenAIResponses,
            StatusCode::BAD_REQUEST,
            "invalid_request_error",
            &reason,
        );
    }
    let req = match serde_json::from_value::<responses::OpenAIResponseRequest>(body) {
        Ok(req) => req,
        Err(e) => {
            return crate::api_error::error_response_for_surface(
                crate::metrics::Surface::OpenAIResponses,
                StatusCode::BAD_REQUEST,
                "invalid_request_error",
                &format!("invalid OpenAI responses request: {e}"),
            );
        }
    };
    let stream_requested = req.stream.unwrap_or(false);
    if let Err(reason) = crate::structured_output::responses_format(req.text.as_ref()) {
        return crate::api_error::error_response_for_surface(
            crate::metrics::Surface::OpenAIResponses,
            StatusCode::BAD_REQUEST,
            "invalid_request_error",
            &reason,
        );
    }
    if let Err(reason) = crate::bridge_controls::validate_responses(&req) {
        return crate::api_error::error_response_for_surface(
            crate::metrics::Surface::OpenAIResponses,
            StatusCode::BAD_REQUEST,
            "invalid_request_error",
            &reason,
        );
    }
    // Validate against the account's live catalog rather than a built-in alias
    // table (issue #192). An account that has discovered nothing cannot judge
    // the name, so the upstream is left to decide.
    let catalog = state
        .model_catalogs
        .models(crate::subscription::SubscriptionProvider::Claude);
    if openai::resolve_model_with(&req.model, &BTreeMap::new(), &catalog).is_none() {
        return crate::model_routing::model_not_found_response(&req.model, &catalog);
    }
    // A tool entry Anthropic cannot represent is dropped, not fatal. Codex CLI
    // sends `namespace`, `custom` and `tool_search` in its ordinary tool set, so
    // rejecting the request refused nine usable tools over one that did not fit
    // — and made a documented client unable to drive Claude models at all
    // (issue #215). The drop is reported below so it is discoverable.
    let dropped_tools = req
        .tools
        .as_ref()
        .map(openai::untranslatable_anthropic_tools)
        .unwrap_or_default();
    if let Some(reason) = req
        .tools
        .as_ref()
        .and_then(openai::invalid_anthropic_tool_definition)
    {
        return crate::api_error::error_response_for_surface(
            crate::metrics::Surface::OpenAIResponses,
            StatusCode::BAD_REQUEST,
            "invalid_request_error",
            &reason,
        );
    }
    if let Some(reason) = req
        .tool_choice
        .as_ref()
        .and_then(openai::untranslatable_anthropic_tool_choice)
    {
        return crate::api_error::error_response_for_surface(
            crate::metrics::Surface::OpenAIResponses,
            StatusCode::BAD_REQUEST,
            "invalid_request_error",
            &reason,
        );
    }
    if let Some(reason) = responses::untranslatable_tool_history(&req.input) {
        return crate::api_error::error_response_for_surface(
            crate::metrics::Surface::OpenAIResponses,
            StatusCode::BAD_REQUEST,
            "invalid_request_error",
            &reason,
        );
    }
    let body = responses::response_to_anthropic(&req);
    let response = forward_openai(
        &state,
        &headers,
        body,
        OpenAIForwardContext {
            routing_body: &routing_body,
            surface: crate::metrics::Surface::OpenAIResponses,
            stream_options: (stream_requested, OpenAIShape::Response, false),
            validated: subscription.as_ref(),
            entitlement_granted: true,
        },
    )
    .await;
    report_dropped_tools(&state, &headers, response, &dropped_tools)
}

#[cfg(test)]
#[path = "proxy_openai_tests.rs"]
mod routed_model_tests;
