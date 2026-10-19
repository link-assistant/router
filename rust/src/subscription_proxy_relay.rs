//! Relay a subscription upstream response to the client: stream rewriting and
//! translation, non-streaming collapse and validation, and error re-shaping.

use axum::body::Body;
use axum::http::{HeaderValue, StatusCode};
use axum::response::Response;
use futures_util::StreamExt;

use super::{SubscriptionResponseShape, codex_sse_to_response_json, is_event_stream};
use crate::metrics::Surface;
use crate::proxy::{AppState, error_response, relay_response_headers};
use crate::subscription::SubscriptionProvider;

/// What the relay needs from the request that produced the response.
pub(super) struct Relay<'a> {
    pub state: &'a AppState,
    pub claims: &'a crate::token::TokenClaims,
    pub surface: Surface,
    pub path: &'a str,
    pub routing_body: &'a serde_json::Value,
    pub provider: SubscriptionProvider,
    pub native_protocol: bool,
    pub response_shape: SubscriptionResponseShape,
    pub model_policy: crate::model_contract::ModelAccessPolicy,
    pub selector_kind: crate::model_contract::ModelSelectorKind,
    pub emulated_output_limit: Option<u64>,
    pub resolved_model: Option<String>,
    pub selected_account: Option<String>,
    pub base_url: String,
    pub correlation_id: String,
    pub stream_requested: bool,
    pub bytes_sent: u64,
    pub reservation: crate::usage::ReservationGuard,
}

/// Turn the final upstream response into the client's response.
pub(super) async fn relay(
    relay: Relay<'_>,
    status: StatusCode,
    upstream_resp: crate::pool_response::PoolResponse,
) -> Response {
    let Relay {
        state,
        claims,
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
        selected_account,
        base_url,
        correlation_id,
        stream_requested,
        bytes_sent,
        mut reservation,
    } = relay;
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
        let translator = crate::responses::ResponsesChatStreamTranslator::new(requested_model)
            .with_include_usage(include_usage)
            .with_stop_sequences(stop_sequences)
            .with_output_token_limit(emulated_output_limit);
        let rewriter = crate::output_limit::ResponsesStreamRewriter::new(
            requested_model,
            emulated_output_limit,
        )
        .with_model_policy(&model_policy)
        .with_selector_kind(selector_kind);
        // Native responses remain byte-transparent. Translated streams are
        // inspected before content so the first concrete identity is truthful
        // and later identity drift terminates the stream.
        let rewrite_passthrough = !native_protocol
            && response_shape == SubscriptionResponseShape::Passthrough
            && rewriter.active();
        let response_log = std::sync::Arc::clone(&state.request_log);
        let completion_audit = (!native_protocol && status.is_success()).then(|| {
            crate::audit::ResponseModelAudit::new(state, claims, surface, path)
                .with_models(Some(requested_model), resolved_model.as_deref())
                .with_provider(Some(provider.as_str()))
                .with_provider_account(selected_account.as_deref())
                .with_provider_endpoint(Some(&base_url))
                .with_selector_kind(selector_kind)
        });
        let rewrite_state =
            std::sync::Arc::new(std::sync::Mutex::new((rewriter, translator, false)));
        let chunk_rewrite_state = std::sync::Arc::clone(&rewrite_state);
        let chunk_completion_audit = completion_audit.clone();
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
                    let output = {
                        let mut rewrite = chunk_rewrite_state
                            .lock()
                            .expect("stream rewrite state lock");
                        let (rewriter, translator, model_audited) = &mut *rewrite;
                        let output = if codex
                            && response_shape == SubscriptionResponseShape::ChatCompletion
                        {
                            let verified = rewriter.push(&bytes);
                            bytes::Bytes::from(translator.push(verified.as_bytes()).join(""))
                        } else if rewrite_passthrough {
                            bytes::Bytes::from(rewriter.push(&bytes))
                        } else {
                            bytes
                        };
                        let served_model = rewriter.upstream_model().map(str::to_string);
                        if !*model_audited
                            && let (Some(audit), Some(served_model)) =
                                (chunk_completion_audit.as_ref(), served_model.as_deref())
                        {
                            audit.record_verified(served_model);
                            *model_audited = true;
                        }
                        drop(rewrite);
                        output
                    };
                    Ok(output)
                },
            )
        });
        let finish_rewrite = codex && response_shape == SubscriptionResponseShape::ChatCompletion
            || rewrite_passthrough;
        let stream = stream.chain(futures_util::stream::once(async move {
            let output = {
                let mut rewrite = rewrite_state.lock().expect("stream rewrite state lock");
                let (rewriter, translator, model_audited) = &mut *rewrite;
                let verified = if finish_rewrite {
                    rewriter.finish()
                } else {
                    String::new()
                };
                let output = if codex && response_shape == SubscriptionResponseShape::ChatCompletion
                {
                    translator.push(verified.as_bytes()).join("")
                } else {
                    verified
                };
                let served_model = rewriter.upstream_model().map(str::to_string);
                if !*model_audited
                    && let (Some(audit), Some(served_model)) =
                        (completion_audit.as_ref(), served_model.as_deref())
                {
                    audit.record_verified(served_model);
                    *model_audited = true;
                }
                drop(rewrite);
                output
            };
            Ok::<bytes::Bytes, std::io::Error>(bytes::Bytes::from(output))
        }));
        let dialect = (codex
            && status.is_success()
            && crate::request_log::body_is_inspectable(&response_headers))
        .then_some(
            if response_shape == SubscriptionResponseShape::ChatCompletion {
                crate::stream_termination::StreamDialect::OpenAiChat
            } else {
                crate::stream_termination::StreamDialect::Responses
            },
        );
        let stream = crate::stream_termination::in_band_errors(stream, dialect);
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

    // Codex returns SSE even for `stream:false`, labelled as JSON. Collapse it
    // to the final Responses object for non-streaming clients.
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
            let served_model =
                match crate::model_contract::validate_translated_response_for_selector(
                    requested_model,
                    &parsed,
                    &model_policy,
                    selector_kind,
                ) {
                    Ok(served_model) => served_model,
                    Err(error) => {
                        return error_response(
                            StatusCode::BAD_GATEWAY,
                            &error.code,
                            &error.to_string(),
                        );
                    }
                };
            if let Some(served_model) = served_model.as_deref() {
                crate::audit::ResponseModelAudit::new(state, claims, surface, path)
                    .with_models(Some(requested_model), resolved_model.as_deref())
                    .with_provider(Some(provider.as_str()))
                    .with_provider_account(selected_account.as_deref())
                    .with_provider_endpoint(Some(&base_url))
                    .with_selector_kind(selector_kind)
                    .record_completed(served_model);
            }
            let mut translated =
                crate::responses::response_to_chat_completion(&parsed, requested_model);
            crate::responses::enforce_chat_stop(
                &mut translated,
                &crate::stop_sequences::from_value(routing_body.get("stop")),
            );
            if let Some(limit) = emulated_output_limit {
                crate::output_limit::enforce_chat_limit(&mut translated, limit);
            }
            response_body = bytes::Bytes::from(
                serde_json::to_vec(&translated).expect("JSON values always serialize"),
            );
        } else if let Ok(mut parsed) = serde_json::from_slice::<serde_json::Value>(&response_body) {
            let requested_model = routing_body
                .get("model")
                .and_then(serde_json::Value::as_str)
                .unwrap_or_default();
            let served_model =
                match crate::model_contract::validate_translated_response_for_selector(
                    requested_model,
                    &parsed,
                    &model_policy,
                    selector_kind,
                ) {
                    Ok(served_model) => served_model,
                    Err(error) => {
                        return error_response(
                            StatusCode::BAD_GATEWAY,
                            &error.code,
                            &error.to_string(),
                        );
                    }
                };
            if let Some(served_model) = served_model.as_deref() {
                crate::audit::ResponseModelAudit::new(state, claims, surface, path)
                    .with_models(Some(requested_model), resolved_model.as_deref())
                    .with_provider(Some(provider.as_str()))
                    .with_provider_account(selected_account.as_deref())
                    .with_provider_endpoint(Some(&base_url))
                    .with_selector_kind(selector_kind)
                    .record_completed(served_model);
            }
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
        return response;
    }

    if status.is_success()
        && response_shape == SubscriptionResponseShape::Passthrough
        && let Ok(parsed) = serde_json::from_slice::<serde_json::Value>(&response_body)
    {
        let requested_model = routing_body
            .get("model")
            .and_then(serde_json::Value::as_str)
            .unwrap_or_default();
        let served_model = match crate::model_contract::validate_translated_response_for_selector(
            requested_model,
            &parsed,
            &model_policy,
            selector_kind,
        ) {
            Ok(served_model) => served_model,
            Err(error) => {
                return error_response(StatusCode::BAD_GATEWAY, &error.code, &error.to_string());
            }
        };
        if let Some(served_model) = served_model.as_deref() {
            crate::audit::ResponseModelAudit::new(state, claims, surface, path)
                .with_models(Some(requested_model), resolved_model.as_deref())
                .with_provider(Some(provider.as_str()))
                .with_provider_account(selected_account.as_deref())
                .with_provider_endpoint(Some(&base_url))
                .with_selector_kind(selector_kind)
                .record_completed(served_model);
        }
        response_body =
            bytes::Bytes::from(serde_json::to_vec(&parsed).expect("JSON values always serialize"));
    }

    // Re-shape failures to the caller's dialect and remove operator subscription
    // metadata. The raw body stays in the request log for diagnosis (#213).
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
    response
}
