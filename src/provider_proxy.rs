//! OpenAI-compatible provider API and forwarding helpers.

#![allow(clippy::unused_async)]

use axum::body::Body;
use axum::extract::{Path, State};
use axum::http::{HeaderMap, HeaderValue, StatusCode};
use axum::response::{IntoResponse, Response};
use futures_util::StreamExt;

use crate::metrics::Surface;
use crate::providers::{ProviderError, ProviderUpsert, ResolvedProvider};
use crate::proxy::{AppState, error_response, is_admin_authorised, maybe_mpp_challenge};

/// List configured upstream providers with secrets redacted.
#[allow(clippy::needless_pass_by_value)]
pub async fn list_providers(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> impl IntoResponse {
    if !is_admin_authorised(&state, &headers) {
        return error_response(
            StatusCode::UNAUTHORIZED,
            "authentication_error",
            "admin Bearer key required",
        );
    }
    match state.provider_store.list_redacted() {
        Ok(records) => (
            StatusCode::OK,
            axum::Json(serde_json::json!({"data": records})),
        )
            .into_response(),
        Err(e) => error_response(
            StatusCode::INTERNAL_SERVER_ERROR,
            "api_error",
            &format!("{e}"),
        ),
    }
}

/// Show one configured upstream provider with secrets redacted.
#[allow(clippy::needless_pass_by_value)]
pub async fn show_provider(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(name): Path<String>,
) -> impl IntoResponse {
    if !is_admin_authorised(&state, &headers) {
        return error_response(
            StatusCode::UNAUTHORIZED,
            "authentication_error",
            "admin Bearer key required",
        );
    }
    match state.provider_store.get(&name) {
        Ok(Some(record)) => (StatusCode::OK, axum::Json(record.redacted())).into_response(),
        Ok(None) => error_response(
            StatusCode::NOT_FOUND,
            "not_found_error",
            "provider not found",
        ),
        Err(e) => error_response(
            StatusCode::INTERNAL_SERVER_ERROR,
            "api_error",
            &format!("{e}"),
        ),
    }
}

/// Add or replace an upstream provider, encrypting inline API keys at rest.
#[allow(clippy::needless_pass_by_value)]
pub async fn upsert_provider(
    State(state): State<AppState>,
    headers: HeaderMap,
    axum::Json(input): axum::Json<ProviderUpsert>,
) -> impl IntoResponse {
    if !is_admin_authorised(&state, &headers) {
        return error_response(
            StatusCode::UNAUTHORIZED,
            "authentication_error",
            "admin Bearer key required",
        );
    }
    match state.provider_store.upsert(input) {
        Ok(record) => (StatusCode::OK, axum::Json(record.redacted())).into_response(),
        Err(e) => error_response(
            StatusCode::BAD_REQUEST,
            "invalid_request_error",
            &format!("{e}"),
        ),
    }
}

/// Delete one upstream provider.
#[allow(clippy::needless_pass_by_value)]
pub async fn delete_provider(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(name): Path<String>,
) -> impl IntoResponse {
    if !is_admin_authorised(&state, &headers) {
        return error_response(
            StatusCode::UNAUTHORIZED,
            "authentication_error",
            "admin Bearer key required",
        );
    }
    match state.provider_store.delete(&name) {
        Ok(true) => (
            StatusCode::OK,
            axum::Json(serde_json::json!({"deleted": name})),
        )
            .into_response(),
        Ok(false) => error_response(
            StatusCode::NOT_FOUND,
            "not_found_error",
            "provider not found",
        ),
        Err(e) => error_response(
            StatusCode::INTERNAL_SERVER_ERROR,
            "api_error",
            &format!("{e}"),
        ),
    }
}

/// Forward one OpenAI-compatible request to the selected provider.
pub async fn forward_openai_compatible(
    state: &AppState,
    headers: &HeaderMap,
    body: serde_json::Value,
    path: &str,
    surface: Surface,
) -> Response {
    let routing_body = body.clone();
    forward_provider_at_routed(
        state,
        headers,
        body,
        &routing_body,
        path,
        path,
        surface,
        false,
    )
    .await
}

pub(crate) async fn forward_openai_compatible_routed(
    state: &AppState,
    headers: &HeaderMap,
    body: serde_json::Value,
    routing_body: &serde_json::Value,
    path: &str,
    surface: Surface,
) -> Response {
    forward_provider_at_routed(
        state,
        headers,
        body,
        routing_body,
        path,
        path,
        surface,
        false,
    )
    .await
}

pub(crate) async fn forward_provider_at_routed(
    state: &AppState,
    headers: &HeaderMap,
    mut body: serde_json::Value,
    routing_body: &serde_json::Value,
    path: &str,
    upstream_path: &str,
    surface: Surface,
    copy_anthropic_headers: bool,
) -> Response {
    if let Some(resp) = maybe_mpp_challenge(state, headers, path) {
        return resp;
    }

    let claims = match crate::proxy::authenticate_client(state, headers) {
        Ok(claims) => claims,
        Err(response) => return *response,
    };
    // Per-token request budgets apply to every upstream, not just the
    // subscription ones, so a task token cannot escape its cap by being
    // pointed at an OpenAI-compatible gateway.
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
    let provider = match resolve_openai_compatible_provider(state) {
        Ok(provider) => provider,
        Err(e) => {
            return error_response(
                StatusCode::INTERNAL_SERVER_ERROR,
                "api_error",
                &format!("provider lookup failed: {e}"),
            );
        }
    };

    if !matches!(body.get("model").and_then(serde_json::Value::as_str), Some(s) if !s.is_empty())
        && let Some(model) = provider.default_model.as_deref()
    {
        body["model"] = serde_json::Value::String(model.to_string());
    }
    let requested_model = routing_body
        .get("model")
        .and_then(serde_json::Value::as_str)
        .unwrap_or_default()
        .to_string();
    let resolved_model = body
        .get("model")
        .and_then(serde_json::Value::as_str)
        .unwrap_or_default()
        .to_string();
    crate::audit::record_authorised_request_with_resolved_model(
        state,
        &claims,
        surface,
        path,
        Some(routing_body),
        (!resolved_model.is_empty()).then_some(resolved_model.as_str()),
    );
    let stream_requested = body
        .get("stream")
        .and_then(serde_json::Value::as_bool)
        .unwrap_or(false);
    let serialized = match serde_json::to_vec(&body) {
        Ok(v) => v,
        Err(e) => {
            return error_response(
                StatusCode::INTERNAL_SERVER_ERROR,
                "api_error",
                &format!("failed to serialize OpenAI-compatible body: {e}"),
            );
        }
    };
    let bytes_sent = serialized.len() as u64;

    let upstream_url = join_openai_compatible_url(&provider.base_url, upstream_path);
    let mut upstream_req = state
        .client
        .post(upstream_url)
        .header("content-type", "application/json")
        .body(serialized);
    if let Some(api_key) = provider.api_key.as_deref() {
        upstream_req = upstream_req.header("authorization", format!("Bearer {api_key}"));
    }
    if copy_anthropic_headers {
        for name in ["anthropic-version", "anthropic-beta"] {
            if let Some(value) = headers.get(name) {
                upstream_req = upstream_req.header(name, value);
            }
        }
    }

    let correlation_id = crate::request_log::correlation_id(headers);
    let upstream_resp = match state
        .request_log
        .send_upstream(&correlation_id, &state.client, upstream_req)
        .await
    {
        Ok(resp) => resp,
        Err(e) => {
            state.metrics.record_request(surface, 502, None);
            return error_response(
                StatusCode::BAD_GATEWAY,
                "api_error",
                &format!("OpenAI-compatible upstream request failed: {e}"),
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

    if stream_requested || is_event_stream(&content_type) {
        let response_log = std::sync::Arc::clone(&state.request_log);
        let mut usage = status
            .is_success()
            .then(|| reservation.take().into_tracker());
        // Settle the stream the way the Anthropic relay does. Without this the
        // turn reached the log with no terminal record at all, so how it ended
        // could only be guessed at — and every such exchange was reported as
        // ending in an unknown state (issue #258).
        let stream = settled_relay_stream(
            upstream_resp,
            response_log,
            correlation_id,
            state.logger.clone(),
            usage.take(),
            Some(requested_model.clone()),
        );
        let mut response = Response::new(Body::from_stream(stream));
        *response.status_mut() = status;
        response.headers_mut().insert("content-type", content_type);
        if !resolved_model.is_empty()
            && resolved_model != requested_model
            && let Ok(value) = HeaderValue::from_str(&resolved_model)
        {
            response
                .headers_mut()
                .insert(crate::output_limit::UPSTREAM_MODEL_HEADER, value);
        }
        return response;
    }

    let upstream_body = match upstream_resp.bytes().await {
        Ok(bytes) => bytes,
        Err(e) => {
            state.metrics.record_request(surface, 502, None);
            return error_response(
                StatusCode::BAD_GATEWAY,
                "api_error",
                &format!("OpenAI-compatible upstream body read failed: {e}"),
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

    let mut response_body = upstream_body;
    let mut served_model = None;
    if status.is_success()
        && let Ok(mut payload) = serde_json::from_slice::<serde_json::Value>(&response_body)
    {
        served_model = crate::output_limit::preserve_model_identity(&mut payload, &requested_model);
        response_body =
            bytes::Bytes::from(serde_json::to_vec(&payload).expect("JSON values always serialize"));
    }

    let mut response = Response::new(Body::from(response_body));
    *response.status_mut() = status;
    response.headers_mut().insert("content-type", content_type);
    if let Some(served) = served_model.as_deref()
        && let Ok(value) = HeaderValue::from_str(served)
    {
        response
            .headers_mut()
            .insert(crate::output_limit::UPSTREAM_MODEL_HEADER, value);
    }
    response
}

/// Return OpenAI-shaped model data for the selected OpenAI-compatible provider.
#[must_use]
pub fn openai_compatible_models(state: &AppState) -> serde_json::Value {
    let provider = resolve_openai_compatible_provider(state)
        .ok()
        .unwrap_or_else(|| state.openai_compatible.resolve());
    let now = chrono::Utc::now().timestamp();
    let ResolvedProvider {
        name: owner,
        default_model,
        mut models,
        ..
    } = provider;
    if models.is_empty()
        && let Some(model) = default_model
    {
        models.push(model);
    }
    let data: Vec<serde_json::Value> = models
        .into_iter()
        .map(|id| {
            serde_json::json!({
                "id": id,
                "object": "model",
                "created": now,
                "owned_by": owner.clone(),
            })
        })
        .collect();
    serde_json::json!({"object": "list", "data": data})
}

fn resolve_openai_compatible_provider(state: &AppState) -> Result<ResolvedProvider, ProviderError> {
    if state.upstream_provider == crate::config::UpstreamProvider::ZaiCodingPlan {
        return crate::zai_coding_plan::resolve(state)
            .map_err(ProviderError::Invalid)?
            .ok_or_else(|| ProviderError::Invalid("z.ai Coding Plan is not enabled".into()));
    }
    state
        .provider_store
        .resolve(&state.openai_compatible.provider_name)
        .map(|provider| provider.unwrap_or_else(|| state.openai_compatible.resolve()))
}

fn join_openai_compatible_url(base_url: &str, path: &str) -> String {
    let base = base_url.trim_end_matches('/');
    if base.ends_with("/v1") {
        let suffix = path.strip_prefix("/v1").unwrap_or(path);
        format!("{base}{suffix}")
    } else {
        format!("{base}{path}")
    }
}

/// Relay an upstream stream, recording each frame and settling it at the end.
///
/// Split out so the settlement can be exercised directly: this is the code path
/// whose absence left every `OpenAI` and Gemini stream without a terminal record
/// (issue #258), and a defect here is invisible until a log is read days later.
fn settled_relay_stream(
    upstream: reqwest::Response,
    response_log: std::sync::Arc<crate::request_log::RequestLog>,
    correlation_id: String,
    logger: log_lazy::LogLazy,
    mut usage: Option<crate::usage::UsageTracker>,
    requested_model: Option<String>,
) -> impl futures_util::Stream<Item = Result<bytes::Bytes, std::io::Error>> {
    let started = std::time::Instant::now();
    let outcome = std::sync::Arc::new(std::sync::Mutex::new(new_stream_outcome(
        upstream.headers(),
    )));
    let end_outcome = std::sync::Arc::clone(&outcome);
    let end_log = std::sync::Arc::clone(&response_log);
    let end_id = correlation_id.clone();
    let mut identity = crate::output_limit::ResponsesStreamRewriter::new(
        requested_model.as_deref().unwrap_or_default(),
        None,
    );
    upstream
        .bytes_stream()
        .map(move |chunk| {
            let mut settled = outcome.lock().expect("stream outcome lock");
            match &chunk {
                Ok(bytes) => {
                    response_log.record_upstream_body(&correlation_id, bytes);
                    account_for_frame(&mut settled, bytes);
                    if let Some(tracker) = &mut usage {
                        tracker.feed(bytes);
                    }
                }
                Err(error) => settled.detail = Some(error.to_string()),
            }
            drop(settled);
            chunk
                .map(|bytes| {
                    if identity.active() {
                        bytes::Bytes::from(identity.push(&bytes))
                    } else {
                        bytes
                    }
                })
                .map_err(std::io::Error::other)
        })
        .chain(futures_util::stream::once(async move {
            crate::request_log::settle_stream(
                &end_log,
                &end_id,
                &end_outcome,
                started.elapsed().as_millis(),
                &logger,
            );
            Err(std::io::Error::other(
                crate::request_log::STREAM_END_MARKER,
            ))
        }))
        .take_while(|item| {
            futures_util::future::ready(
                !matches!(item, Err(error) if error.to_string() == crate::request_log::STREAM_END_MARKER),
            )
        })
}

/// Fold one relayed frame into the outcome being accumulated.
///
/// Counting the frame is bookkeeping; noticing the dialect's terminator is the
/// part that matters, since it is what lets the terminal record say the turn
/// completed rather than leaving its ending unknown (issue #258).
fn account_for_frame(outcome: &mut crate::request_log::StreamOutcome, bytes: &[u8]) {
    outcome.frames += 1;
    outcome.bytes += bytes.len() as u64;
    if crate::request_log::frame_terminates_stream(bytes) {
        outcome.terminated = true;
    }
}

/// The starting outcome for a stream this relay is about to forward.
///
/// A relay that never settles its streams leaves every one of its exchanges
/// with no terminal record, so the log can only report the ending as unknown
/// (issue #258). `inspectable` comes from the upstream headers, since a
/// compressed body cannot be scanned for a terminator (issue #255).
fn new_stream_outcome(headers: &reqwest::header::HeaderMap) -> crate::request_log::StreamOutcome {
    crate::request_log::StreamOutcome {
        streamed: true,
        terminated: false,
        inspectable: crate::request_log::body_is_inspectable(headers),
        detail: None,
        frames: 0,
        bytes: 0,
        duration_ms: 0,
    }
}

fn is_event_stream(content_type: &HeaderValue) -> bool {
    content_type
        .to_str()
        .is_ok_and(|value| value.to_ascii_lowercase().contains("text/event-stream"))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn an_unconfigured_openai_compatible_catalog_is_empty() {
        let data = tempfile::tempdir().expect("provider data");
        let mut state = crate::app_state::AppState::for_tests(data.path());
        state.upstream_provider = crate::config::UpstreamProvider::OpenAICompatible;
        state.openai_compatible.default_model = None;
        state.openai_compatible.models.clear();

        let catalog = openai_compatible_models(&state);
        assert_eq!(catalog["data"], serde_json::json!([]));
        assert!(
            !catalog.to_string().contains("default"),
            "Router must not invent a model absent from live or operator configuration"
        );
    }

    /// `/v1` in the configured base URL must not be duplicated by the request
    /// path, and a base without it keeps the path verbatim.
    #[test]
    fn base_urls_are_joined_without_duplicating_the_version_segment() {
        assert_eq!(
            join_openai_compatible_url("https://api.example/v1", "/v1/chat/completions"),
            "https://api.example/v1/chat/completions"
        );
        assert_eq!(
            join_openai_compatible_url("https://api.example/v1/", "/v1/chat/completions"),
            "https://api.example/v1/chat/completions"
        );
        assert_eq!(
            join_openai_compatible_url("https://api.example", "/v1/chat/completions"),
            "https://api.example/v1/chat/completions"
        );
        // A path that does not start with /v1 is appended as-is.
        assert_eq!(
            join_openai_compatible_url("https://api.example/v1", "/responses"),
            "https://api.example/v1/responses"
        );
        assert_eq!(
            join_openai_compatible_url("https://api.example/", "/responses"),
            "https://api.example/responses"
        );
    }

    #[test]
    fn event_stream_content_types_are_detected_case_insensitively() {
        for value in [
            "text/event-stream",
            "text/event-stream; charset=utf-8",
            "TEXT/EVENT-STREAM",
        ] {
            assert!(
                is_event_stream(&HeaderValue::from_str(value).expect("header")),
                "{value} should be recognised as a stream"
            );
        }
        for value in ["application/json", "text/plain"] {
            assert!(
                !is_event_stream(&HeaderValue::from_str(value).expect("header")),
                "{value} should not be recognised as a stream"
            );
        }
    }

    /// A stream this relay forwards starts as a stream it will settle.
    ///
    /// Before issue #258 this path recorded every frame and then simply
    /// stopped, so its exchanges reached the log with no terminal record and
    /// were reported as ending in an unknown state.
    #[test]
    fn a_forwarded_stream_starts_settled_as_a_stream() {
        let outcome = new_stream_outcome(&reqwest::header::HeaderMap::new());

        assert!(outcome.streamed, "this path only handles streams");
        assert!(
            outcome.inspectable,
            "an unencoded body can be scanned for a terminator"
        );
        assert!(!outcome.terminated, "nothing has been seen yet");
        assert_eq!(outcome.frames, 0);
        assert_eq!(outcome.bytes, 0);
        assert!(outcome.detail.is_none());
    }

    /// A compressed stream is marked unreadable up front, so its frames are
    /// never mistaken for evidence of a truncation (issue #255).
    #[test]
    fn a_compressed_stream_starts_uninspectable() {
        let mut headers = reqwest::header::HeaderMap::new();
        headers.insert(
            reqwest::header::CONTENT_ENCODING,
            reqwest::header::HeaderValue::from_static("gzip"),
        );

        let outcome = new_stream_outcome(&headers);

        assert!(outcome.streamed);
        assert!(!outcome.inspectable);
        assert_eq!(outcome.label(), "encoded_not_verifiable");
    }

    /// An event-stream content type is recognised however it is spelled, since
    /// it is what routes a response into the streaming path at all.
    #[test]
    fn an_event_stream_content_type_is_recognised() {
        for value in [
            "text/event-stream",
            "text/event-stream; charset=utf-8",
            "TEXT/EVENT-STREAM",
        ] {
            assert!(
                is_event_stream(&HeaderValue::from_str(value).unwrap()),
                "{value} should route into the streaming path"
            );
        }
        assert!(!is_event_stream(&HeaderValue::from_static(
            "application/json"
        )));
    }

    /// Relaying a finished stream must leave an outcome that says so.
    ///
    /// The terminal record is derived from this accumulation, so a terminator
    /// missed here becomes an exchange whose ending the log cannot account for.
    #[test]
    fn a_terminating_frame_completes_the_outcome() {
        let mut outcome = new_stream_outcome(&reqwest::header::HeaderMap::new());

        account_for_frame(&mut outcome, b"data: {\"choices\":[{\"delta\":{}}]}\n\n");
        assert!(!outcome.terminated, "an ordinary frame ends nothing");
        assert_eq!(outcome.frames, 1);

        account_for_frame(&mut outcome, b"data: [DONE]\n\n");
        assert!(outcome.terminated, "[DONE] ends an OpenAI stream");
        assert_eq!(outcome.frames, 2);
        assert!(outcome.is_complete());
        assert_eq!(outcome.label(), "completed");
    }

    /// Every dialect this relay can carry must be recognised, including Gemini,
    /// which names no terminating event and marks a finished turn with
    /// `finishReason` on its last chunk.
    #[test]
    fn every_dialect_terminator_completes_the_outcome() {
        for frame in [
            &b"data: [DONE]\n\n"[..],
            b"event: message_stop\ndata: {}\n\n",
            b"event: response.completed\ndata: {}\n\n",
            b"data: {\"candidates\":[{\"finishReason\":\"STOP\"}]}\n\n",
        ] {
            let mut outcome = new_stream_outcome(&reqwest::header::HeaderMap::new());
            account_for_frame(&mut outcome, frame);
            assert!(
                outcome.terminated,
                "unrecognised terminator: {}",
                String::from_utf8_lossy(frame)
            );
        }
    }

    /// A stream that stops without a terminator must stay incomplete, so a real
    /// truncation is still reported (issue #230).
    #[test]
    fn a_stream_without_a_terminator_stays_incomplete() {
        let mut outcome = new_stream_outcome(&reqwest::header::HeaderMap::new());

        account_for_frame(&mut outcome, b"data: {\"choices\":[{\"delta\":{}}]}\n\n");

        assert!(!outcome.is_complete());
        assert_eq!(outcome.label(), "ended_without_terminator");
        assert_eq!(outcome.bytes, 34);
    }

    /// Relaying a real stream must record every frame and settle the turn.
    ///
    /// Driven through an actual HTTP response rather than a constructed value:
    /// the defect in issue #258 was that this path forwarded bytes and then
    /// simply stopped, which only shows up when the stream is consumed to its
    /// end.
    #[tokio::test]
    async fn relaying_a_stream_records_frames_and_settles_the_turn() {
        use futures_util::StreamExt as _;

        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let port = listener.local_addr().unwrap().port();
        tokio::spawn(async move {
            if let Ok((mut socket, _)) = listener.accept().await {
                use tokio::io::{AsyncReadExt as _, AsyncWriteExt as _};
                let mut scratch = [0; 1024];
                let _ = socket.read(&mut scratch).await;
                let body = "data: {\"choices\":[{\"delta\":{}}]}\n\ndata: [DONE]\n\n";
                let _ = socket
                    .write_all(
                        format!(
                            "HTTP/1.1 200 OK\r\ncontent-type: text/event-stream\r\n\
                             content-length: {}\r\nconnection: close\r\n\r\n{body}",
                            body.len()
                        )
                        .as_bytes(),
                    )
                    .await;
            }
        });

        let directory = tempfile::tempdir().expect("temporary log directory");
        let log = std::sync::Arc::new(crate::request_log::RequestLog::new(
            directory.path().to_path_buf(),
            1024 * 1024,
        ));
        let upstream = reqwest::get(format!("http://127.0.0.1:{port}/"))
            .await
            .expect("reach the upstream");

        let mut stream = Box::pin(settled_relay_stream(
            upstream,
            std::sync::Arc::clone(&log),
            "relayed".to_string(),
            log_lazy::LogLazy::default(),
            None,
            None,
        ));
        let mut relayed = Vec::new();
        while let Some(chunk) = stream.next().await {
            relayed.extend_from_slice(&chunk.expect("the relay must forward its bytes"));
        }

        // The client sees the body unchanged: the terminal marker is filtered
        // out, never forwarded.
        let forwarded = String::from_utf8_lossy(&relayed);
        assert!(forwarded.contains("[DONE]"), "{forwarded}");
        assert!(
            !forwarded.contains(crate::request_log::STREAM_END_MARKER),
            "the sentinel must not reach the client: {forwarded}"
        );

        let written =
            std::fs::read_to_string(directory.path().join("unauthenticated/requests.lino"))
                .expect("read the log");
        let settled: serde_json::Value = written
            .lines()
            .filter_map(crate::lino_json::decode_line)
            .find(|record| record.get("phase").and_then(|p| p.as_str()) == Some("stream_end"))
            .expect("the relay must settle the stream it forwarded");

        assert_eq!(settled["outcome"], "completed", "{settled}");
        assert_eq!(settled["complete"], serde_json::Value::Bool(true));
        assert_eq!(settled["streamed"], serde_json::Value::Bool(true));
        assert!(
            settled["frames"].as_u64().unwrap_or(0) >= 1,
            "every frame is counted: {settled}"
        );
    }
}
