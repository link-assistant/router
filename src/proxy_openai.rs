use super::{
    AppState, BTreeMap, HeaderMap, JsonRejection, OpenAIShape, Query, Response, State, StatusCode,
    UpstreamProvider, forward_openai, openai, responses,
};

/// Names the tools that were dropped on the way to Anthropic.
///
/// A silent drop is the failure mode issue #215 warns about: an agent that
/// "just doesn't use sub-agents" gives the user nothing to search for. The
/// header is additive, so a client that ignores it is unaffected.
pub const DROPPED_TOOLS_HEADER: &str = "x-router-dropped-tools";

/// Attach the dropped-tool report to a response, and log it.
fn report_dropped_tools(state: &AppState, mut response: Response, dropped: &[String]) -> Response {
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
    if let Ok(value) = axum::http::HeaderValue::from_str(&summary) {
        response.headers_mut().insert(DROPPED_TOOLS_HEADER, value);
    }
    response
}

pub async fn openai_chat_completions(
    State(state): State<AppState>,
    Query(query): Query<BTreeMap<String, String>>,
    headers: HeaderMap,
    body: Result<axum::Json<serde_json::Value>, JsonRejection>,
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
    let include_usage = body
        .pointer("/stream_options/include_usage")
        .and_then(serde_json::Value::as_bool)
        .unwrap_or(false);
    let stream_from_query = openai::query_stream_requested(&query);
    if stream_from_query {
        body["stream"] = serde_json::json!(true);
    }
    let state = match crate::model_routing::route_state(&state, &body).await {
        Ok(state) => state,
        Err(error) => return crate::model_routing::model_route_error_response(&error),
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
    if state.upstream_provider == UpstreamProvider::OpenAICompatible {
        return crate::provider_proxy::forward_openai_compatible(
            &state,
            &headers,
            body,
            "/v1/chat/completions",
            crate::metrics::Surface::OpenAIChat,
        )
        .await;
    }
    if state.upstream_provider == UpstreamProvider::Qwen {
        let routing_body = body.clone();
        return crate::subscription_proxy::forward_subscription_openai(
            &state,
            &headers,
            body,
            &routing_body,
            "/v1/chat/completions",
            crate::metrics::Surface::OpenAIChat,
        )
        .await;
    }
    if state.upstream_provider == UpstreamProvider::Gemini {
        return crate::gemini::forward_chat_completions(&state, &headers, body).await;
    }
    if state.upstream_provider == UpstreamProvider::Codex {
        // The ChatGPT backend speaks only the Responses API; translate the
        // Chat Completions request before forwarding.
        let responses_body = responses::chat_completion_to_responses(&body);
        return crate::subscription_proxy::forward_codex_chat_completions(
            &state,
            &headers,
            responses_body,
            &body,
            crate::metrics::Surface::OpenAIChat,
        )
        .await;
    }
    let routing_body = body.clone();
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
        &routing_body,
        crate::metrics::Surface::OpenAIChat,
        (stream_requested, OpenAIShape::Chat, include_usage),
    )
    .await;
    report_dropped_tools(&state, response, &dropped_tools)
}

/// `POST /v1/responses` — `OpenAI` Responses API.
pub async fn openai_responses(
    State(state): State<AppState>,
    headers: HeaderMap,
    body: Result<axum::Json<serde_json::Value>, JsonRejection>,
) -> Response {
    let body = match body {
        Ok(axum::Json(body)) => body,
        Err(error) => {
            return crate::api_error::malformed_json_response_for_surface(
                crate::metrics::Surface::OpenAIResponses,
                &error.body_text(),
            );
        }
    };
    let state = match crate::model_routing::route_state(&state, &body).await {
        Ok(state) => state,
        Err(error) => return crate::model_routing::model_route_error_response(&error),
    };
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
    if state.upstream_provider == UpstreamProvider::OpenAICompatible {
        return crate::provider_proxy::forward_openai_compatible(
            &state,
            &headers,
            body,
            "/v1/responses",
            crate::metrics::Surface::OpenAIResponses,
        )
        .await;
    }
    if matches!(
        state.upstream_provider,
        UpstreamProvider::Codex | UpstreamProvider::Qwen
    ) {
        let routing_body = body.clone();
        return crate::subscription_proxy::forward_subscription_openai(
            &state,
            &headers,
            body,
            &routing_body,
            "/v1/responses",
            crate::metrics::Surface::OpenAIResponses,
        )
        .await;
    }
    if state.upstream_provider == UpstreamProvider::Gemini {
        return crate::gemini::forward_responses(&state, &headers, body).await;
    }
    let routing_body = body.clone();
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
        &routing_body,
        crate::metrics::Surface::OpenAIResponses,
        (stream_requested, OpenAIShape::Response, false),
    )
    .await;
    report_dropped_tools(&state, response, &dropped_tools)
}
