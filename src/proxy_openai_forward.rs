use super::{
    AppState, Body, DEFAULT_ANTHROPIC_VERSION, HeaderMap, HeaderValue, IntoResponse, Response,
    StatusCode, StreamExt, authenticate_client, error_response, merge_oauth_beta, openai,
    relay_response_headers, request_routing_context, resolve_upstream_credentials, responses,
    retry_after_duration,
};

#[derive(Clone, Copy)]
pub(super) enum OpenAIShape {
    Chat,
    Response,
}

pub(super) struct OpenAIForwardContext<'a> {
    pub(super) routing_body: &'a serde_json::Value,
    pub(super) surface: crate::metrics::Surface,
    pub(super) stream_options: (bool, OpenAIShape, bool),
    pub(super) validated: Option<&'a crate::model_routing::ValidatedSubscription>,
    pub(super) entitlement_granted: bool,
}

pub(super) async fn forward_openai(
    state: &AppState,
    headers: &HeaderMap,
    body: serde_json::Value,
    context: OpenAIForwardContext<'_>,
) -> Response {
    let OpenAIForwardContext {
        routing_body,
        surface,
        stream_options: (stream_requested, shape, include_usage),
        validated,
        entitlement_granted,
    } = context;
    let served_model = body["model"].as_str().unwrap_or_default().to_string();
    let path = match shape {
        OpenAIShape::Chat => "/v1/chat/completions",
        OpenAIShape::Response => "/v1/responses",
    };
    if let Some(resp) = maybe_mpp_challenge(state, headers, path) {
        return resp;
    }

    // Validate caller token.
    let claims = match authenticate_client(state, headers) {
        Ok(claims) => claims,
        Err(response) => return *response,
    };
    let requested_model = routing_body
        .get("model")
        .and_then(serde_json::Value::as_str)
        .unwrap_or_default();
    let model_policy = if requested_model.is_empty() {
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
            requested_model,
            crate::api_error::ApiDialect::OpenAi,
        ) {
            Ok(policy) => policy,
            Err(response) => return response,
        }
    };
    if !entitlement_granted {
        return error_response(
            StatusCode::FORBIDDEN,
            "permission_error",
            "consumer-subscription entitlement was not checked at ingress",
        );
    }
    let reserved = crate::token_reservation::estimate(&body).total();
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
    crate::audit::record_authorised_request(state, &claims, surface, path, Some(routing_body));

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

    // Resolve OAuth credentials.
    let resolved = match resolve_upstream_credentials(state, &routing_context, validated).await {
        Ok(resolved) => resolved,
        Err(e) => {
            tracing::error!("openai: upstream credentials unavailable: {e}");
            return error_response(
                StatusCode::BAD_GATEWAY,
                "api_error",
                "Upstream authentication unavailable",
            );
        }
    };
    let oauth_token = resolved.access_token;
    let selected_account = resolved.account;
    let evidence_token = resolved.evidence_token;
    let selector_kind = selected_account.as_deref().map_or(
        crate::model_contract::ModelSelectorKind::Unknown,
        |account| {
            state.model_catalogs.selector_kind_for(
                crate::subscription::SubscriptionProvider::Claude,
                account,
                requested_model,
            )
        },
    );

    let upstream_url = format!(
        "{}/v1/messages",
        state.upstream_base_url.trim_end_matches('/')
    );
    // Claude MAX OAuth inference requires Claude Code's identity as the first
    // system block; OpenAI-dialect clients such as Codex never send it.
    let mut body = body;
    if entitlement_granted && crate::claude_identity::is_oauth_credential(&oauth_token) {
        crate::claude_identity::ensure_claude_code_system(&mut body);
    }
    let serialized = match serde_json::to_vec(&body) {
        Ok(v) => v,
        Err(e) => {
            return error_response(
                StatusCode::INTERNAL_SERVER_ERROR,
                "api_error",
                &format!("failed to serialize translated body: {e}"),
            );
        }
    };
    let bytes_sent = serialized.len() as u64;

    let mut req_builder = state
        .client
        .post(&upstream_url)
        .header("authorization", format!("Bearer {oauth_token}"))
        .header("content-type", "application/json")
        .header("anthropic-version", DEFAULT_ANTHROPIC_VERSION)
        .body(serialized);
    if let Some(request_id) = crate::proxy::translated_request_id(headers) {
        req_builder = req_builder.header("x-request-id", request_id);
    }
    // Ensure the Claude MAX OAuth beta flag is present, merging any value the
    // caller supplied (OpenAI clients rarely send one).
    let merged_beta = merge_oauth_beta(headers.get("anthropic-beta").and_then(|v| v.to_str().ok()));
    req_builder = req_builder.header("anthropic-beta", merged_beta);
    let correlation_id = crate::request_log::correlation_id(headers);
    let upstream_resp = match state
        .request_log
        .send_upstream(&correlation_id, &state.client, req_builder)
        .await
    {
        Ok(r) => r,
        Err(e) => {
            state
                .metrics
                .record_request(surface, 502, selected_account.as_deref());
            return error_response(
                StatusCode::BAD_GATEWAY,
                "api_error",
                &format!("upstream request failed: {e}"),
            );
        }
    };
    let upstream_status = upstream_resp.status();
    crate::request_routing::record_claude_evidence(
        state,
        selected_account.as_deref(),
        evidence_token.as_ref(),
        upstream_status.as_u16(),
    )
    .await;
    let retry_after = retry_after_duration(upstream_resp.headers());
    let response_headers = relay_response_headers(upstream_resp.headers());
    if stream_requested && upstream_status.is_success() {
        state
            .metrics
            .record_request(surface, 200, selected_account.as_deref());
        let stream_shape = match shape {
            OpenAIShape::Chat => openai::OpenAIStreamShape::ChatCompletion,
            OpenAIShape::Response => openai::OpenAIStreamShape::Response,
        };
        let translator = openai::OpenAIStreamTranslator::new(stream_shape, &served_model)
            .with_include_usage(include_usage);
        let identity = crate::output_limit::ResponsesStreamRewriter::new(requested_model, None)
            .with_model_policy(&model_policy)
            .with_selector_kind(selector_kind);
        let completion_audit = crate::audit::ResponseModelAudit::new(state, &claims, surface, path)
            .with_models(Some(requested_model), Some(&served_model))
            .with_provider(Some("claude"))
            .with_provider_account(selected_account.as_deref())
            .with_provider_endpoint(Some(&state.upstream_base_url))
            .with_selector_kind(selector_kind);
        let translation_state =
            std::sync::Arc::new(std::sync::Mutex::new((translator, identity, false)));
        let chunk_translation_state = std::sync::Arc::clone(&translation_state);
        let chunk_completion_audit = completion_audit.clone();
        let response_log = std::sync::Arc::clone(&state.request_log);
        let mut usage = reservation.take().into_tracker();
        let stream = upstream_resp.bytes_stream().map(move |chunk| match chunk {
            Ok(bytes) => {
                response_log.record_upstream_body(&correlation_id, &bytes);
                usage.feed(&bytes);
                let output = {
                    let mut state = chunk_translation_state
                        .lock()
                        .expect("stream translation state lock");
                    let (translator, identity, model_audited) = &mut *state;
                    let verified = identity.push(&bytes);
                    let served_model = identity.upstream_model().map(str::to_string);
                    if !*model_audited && let Some(served_model) = served_model.as_deref() {
                        chunk_completion_audit.record_verified(served_model);
                        *model_audited = true;
                    }
                    let output = translator.push(verified.as_bytes()).join("");
                    drop(state);
                    output
                };
                Ok::<bytes::Bytes, std::io::Error>(bytes::Bytes::from(output))
            }
            Err(e) => Err(std::io::Error::other(e)),
        });
        let stream = stream.chain(futures_util::stream::once(async move {
            let output = {
                let mut state = translation_state
                    .lock()
                    .expect("stream translation state lock");
                let (translator, identity, model_audited) = &mut *state;
                let verified = identity.finish();
                let served_model = identity.upstream_model().map(str::to_string);
                if !*model_audited && let Some(served_model) = served_model.as_deref() {
                    completion_audit.record_verified(served_model);
                    *model_audited = true;
                }
                let output = translator.push(verified.as_bytes()).join("");
                drop(state);
                output
            };
            Ok::<bytes::Bytes, std::io::Error>(bytes::Bytes::from(output))
        }));
        let mut response = Response::new(Body::from_stream(stream));
        *response.status_mut() = StatusCode::OK;
        *response.headers_mut() = response_headers;
        response.headers_mut().insert(
            "content-type",
            HeaderValue::from_static("text/event-stream; charset=utf-8"),
        );
        return response;
    }
    let upstream_body = match upstream_resp.bytes().await {
        Ok(b) => b,
        Err(e) => {
            state
                .metrics
                .record_request(surface, 502, selected_account.as_deref());
            return error_response(
                StatusCode::BAD_GATEWAY,
                "api_error",
                &format!("upstream body read failed: {e}"),
            );
        }
    };
    state
        .request_log
        .record_upstream_body(&correlation_id, &upstream_body);
    let bytes_received = upstream_body.len() as u64;
    state.metrics.record_bytes(bytes_sent, bytes_received);

    if !upstream_status.is_success() {
        if upstream_status.as_u16() == 429
            && let (Some(router), Some(name)) =
                (state.account_router.as_ref(), selected_account.as_deref())
        {
            router.report_failure_with_retry_after(name, "upstream returned 429", retry_after);
        }
        state.metrics.record_request(
            surface,
            upstream_status.as_u16(),
            selected_account.as_deref(),
        );
        let parsed: serde_json::Value =
            serde_json::from_slice(&upstream_body).unwrap_or_else(|_| serde_json::json!({}));
        let mut resp = (
            StatusCode::from_u16(upstream_status.as_u16()).unwrap_or(StatusCode::BAD_GATEWAY),
            axum::Json(parsed),
        )
            .into_response();
        *resp.headers_mut() = response_headers;
        resp.headers_mut()
            .insert("content-type", HeaderValue::from_static("application/json"));
        return resp;
    }

    let anthropic: serde_json::Value = match serde_json::from_slice(&upstream_body) {
        Ok(v) => v,
        Err(e) => {
            state
                .metrics
                .record_request(surface, 502, selected_account.as_deref());
            return error_response(
                StatusCode::BAD_GATEWAY,
                "api_error",
                &format!("upstream returned non-JSON: {e}"),
            );
        }
    };
    let concrete_served_model =
        match crate::model_contract::validate_translated_response_for_selector(
            requested_model,
            &anthropic,
            &model_policy,
            selector_kind,
        ) {
            Ok(served_model) => served_model,
            Err(error) => {
                return error_response(StatusCode::BAD_GATEWAY, &error.code, &error.to_string());
            }
        };
    if let Some(concrete_served_model) = concrete_served_model.as_deref() {
        crate::audit::ResponseModelAudit::new(state, &claims, surface, path)
            .with_models(Some(requested_model), Some(&served_model))
            .with_provider(Some("claude"))
            .with_provider_account(selected_account.as_deref())
            .with_provider_endpoint(Some(&state.upstream_base_url))
            .with_selector_kind(selector_kind)
            .record_completed(concrete_served_model);
    }
    if let Err(error) =
        crate::bridge_response::validate_anthropic_response_citations(anthropic.get("content"))
    {
        return error_response(
            StatusCode::BAD_GATEWAY,
            "api_error",
            &format!("upstream returned an unrepresentable citation: {error}"),
        );
    }
    reservation
        .take()
        .settle(crate::usage::token_count(&anthropic).unwrap_or(0));

    let concrete_served_model = concrete_served_model.as_deref().unwrap_or_default();
    let translated = match shape {
        OpenAIShape::Chat => {
            openai::anthropic_to_chat_completion(&anthropic, concrete_served_model)
        }
        OpenAIShape::Response => {
            responses::anthropic_to_response(&anthropic, concrete_served_model)
        }
    };

    state
        .metrics
        .record_request(surface, 200, selected_account.as_deref());

    let mut response = (StatusCode::OK, axum::Json(translated)).into_response();
    *response.headers_mut() = response_headers;
    response
        .headers_mut()
        .insert("content-type", HeaderValue::from_static("application/json"));
    response
}

pub(super) fn maybe_mpp_challenge(
    state: &AppState,
    headers: &HeaderMap,
    path: &str,
) -> Option<Response> {
    if !state.mpp.is_configured() {
        return None;
    }
    if crate::mpp::has_payment_credential(headers) {
        return Some(crate::mpp::unsupported_payment_verification());
    }
    Some(crate::mpp::payment_required(&state.mpp, path))
}
