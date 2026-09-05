use super::{
    AppState, BTreeMap, HeaderMap, JsonRejection, OpenAIForwardContext, OpenAIShape, Query,
    Response, State, StatusCode, UpstreamProvider, forward_openai, openai, responses,
};

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

async fn route_openai_request(
    state: &AppState,
    headers: &HeaderMap,
    body: &serde_json::Value,
    protocol: crate::client_policy::ClientProtocol,
    path: &str,
) -> Result<crate::model_routing::RoutedState, Response> {
    if state.upstream_provider != UpstreamProvider::Auto {
        return crate::model_routing::route_state_with_subscription(state, body)
            .await
            .map_err(|error| crate::model_routing::model_route_error_response(&error));
    }
    let claims = crate::proxy::authenticate_client(state, headers).map_err(|response| *response)?;
    let entitled = crate::client_policy::entitled_subscription_providers_for_claims(
        state, &claims, headers, protocol, path,
    )?;
    let client = crate::client_policy::bound_client(&claims)
        .map(|(client, _)| client)
        .map_err(|error| {
            crate::proxy::error_response(StatusCode::FORBIDDEN, "permission_error", &error)
        })?;
    crate::model_routing::route_state_with_subscription_for_client(
        state,
        body,
        &entitled,
        Some(client),
        crate::zai_coding_plan::authorize_automatic_discovery(
            state, &claims, headers, protocol, path,
        ),
    )
    .await
    .map_err(|error| crate::model_routing::model_route_error_response(&error))
}

fn rewrite_routed_model(
    body: &mut serde_json::Value,
    state: &AppState,
    subscription: Option<&crate::model_routing::ValidatedSubscription>,
) {
    let Some(requested) = body
        .get("model")
        .and_then(serde_json::Value::as_str)
        .map(str::to_string)
    else {
        return;
    };
    let canonical = canonical_openai_model(
        state.upstream_provider,
        subscription.is_some(),
        state.bridge_model.as_deref(),
        &requested,
    );
    if !canonical.is_empty() && canonical != requested {
        body["model"] = serde_json::Value::String(canonical.to_string());
    }
}

/// Resolve only the model alias owned by this `OpenAI` request route.
///
/// `bridge_model` configures Anthropic-dialect translation to a non-Anthropic
/// provider. It is not a native OpenAI-request default. Stored providers use
/// the same field request-locally for their reversible qualified alias, while
/// subscription aliases are canonicalized from the selected catalog identity.
fn canonical_openai_model<'a>(
    provider: UpstreamProvider,
    has_subscription: bool,
    routed_stored_model: Option<&'a str>,
    requested: &'a str,
) -> &'a str {
    if has_subscription {
        return crate::model_routing::subscription_model_identity(requested).1;
    }
    if provider == UpstreamProvider::OpenAICompatible {
        return routed_stored_model.unwrap_or(requested);
    }
    requested
}

/// Record dropped tools locally without extending a public vendor protocol.
fn report_dropped_tools(
    state: &AppState,
    headers: &HeaderMap,
    response: Response,
    dropped: &[String],
) -> Response {
    if dropped.is_empty() {
        return response;
    }
    let summary = dropped.join(", ");
    state.logger.debug(|| {
        format!(
            "dropped {} tool(s) Anthropic cannot represent: {summary}",
            dropped.len()
        )
    });
    state.request_log.record(
        &crate::request_log::correlation_id(headers),
        "translation_diagnostic",
        serde_json::json!({"dropped_tools": dropped}),
    );
    response
}

pub async fn openai_chat_completions(
    State(state): State<AppState>,
    Query(query): Query<BTreeMap<String, String>>,
    headers: HeaderMap,
    body: Result<axum::Json<serde_json::Value>, JsonRejection>,
) -> Response {
    openai_chat_completions_with_subscription(state, query, headers, body, None, None, false).await
}

/// Native Qwen Chat Completions route. A matching signed Qwen client keeps
/// application-protocol transparency through its own subscription upstream.
pub async fn openai_chat_completions_native(
    State(state): State<AppState>,
    Query(query): Query<BTreeMap<String, String>>,
    headers: HeaderMap,
    body: Result<axum::Json<serde_json::Value>, JsonRejection>,
) -> Response {
    openai_chat_completions_with_subscription(state, query, headers, body, None, None, true).await
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
    )
    .await
}

async fn openai_chat_completions_with_subscription(
    state: AppState,
    query: BTreeMap<String, String>,
    headers: HeaderMap,
    body: Result<axum::Json<serde_json::Value>, JsonRejection>,
    initial_subscription: Option<crate::model_routing::ValidatedSubscription>,
    initial_entitlement: Option<crate::client_policy::EntitlementDecision>,
    native_route: bool,
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
        return crate::provider_proxy::forward_openai_compatible_routed(
            &state,
            &headers,
            body,
            &routing_body,
            "/v1/chat/completions",
            crate::metrics::Surface::OpenAIChat,
        )
        .await;
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
        // The ChatGPT backend speaks only the Responses API; translate the
        // Chat Completions request before forwarding.
        let responses_body = responses::chat_completion_to_responses(&body);
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
    openai_responses_with_route(state, headers, body, false).await
}

/// Native Codex Responses route. A matching signed Codex client keeps the
/// exact request and upstream response semantics on this dedicated namespace.
pub async fn openai_responses_native(
    State(state): State<AppState>,
    headers: HeaderMap,
    body: Result<axum::Json<serde_json::Value>, JsonRejection>,
) -> Response {
    openai_responses_with_route(state, headers, body, true).await
}

async fn openai_responses_with_route(
    state: AppState,
    headers: HeaderMap,
    body: Result<axum::Json<serde_json::Value>, JsonRejection>,
    native_route: bool,
) -> Response {
    let mut body = match body {
        Ok(axum::Json(body)) => body,
        Err(error) => {
            return crate::api_error::malformed_json_response_for_surface(
                crate::metrics::Surface::OpenAIResponses,
                &error.body_text(),
            );
        }
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
        return crate::provider_proxy::forward_openai_compatible_routed(
            &state,
            &headers,
            body,
            &routing_body,
            "/v1/responses",
            crate::metrics::Surface::OpenAIResponses,
        )
        .await;
    }
    if matches!(
        state.upstream_provider,
        UpstreamProvider::Codex | UpstreamProvider::Qwen
    ) {
        return crate::subscription_proxy::forward_subscription_openai_routed(
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
        )
        .await;
    }
    if let Some(reason) = crate::bridge_controls::unknown_responses_field(&body) {
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
mod routed_model_tests {
    use super::*;

    #[test]
    fn native_claude_routes_ignore_the_anthropic_bridge_override() {
        assert_eq!(
            canonical_openai_model(
                UpstreamProvider::Anthropic,
                true,
                Some("unrelated-codex-bridge-model"),
                "claude-future-native",
            ),
            "claude-future-native"
        );
    }

    #[test]
    fn dropped_tools_are_logged_locally_without_a_wire_header() {
        let data = tempfile::tempdir().expect("data dir");
        let state = AppState::for_tests(data.path());
        let response = report_dropped_tools(
            &state,
            &HeaderMap::new(),
            Response::new(axum::body::Body::empty()),
            &["multi_agent_v1".to_string()],
        );

        assert!(response.headers().get("x-router-dropped-tools").is_none());
        let written = std::fs::read_to_string(
            state
                .request_log
                .path()
                .join("unauthenticated/requests.lino"),
        )
        .expect("translation diagnostic");
        assert!(written.contains("translation_diagnostic"));
        assert!(written.contains("multi_agent_v1"));
    }
}
