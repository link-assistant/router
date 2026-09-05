//! Gonka upstream provider support.
//!
//! Gonka exposes OpenAI-compatible inference routes. The router keeps the
//! client-facing `la_sk_...` auth model, then authenticates an explicitly
//! configured broker with its API key instead of forwarding client credentials.

use axum::body::Body;
use axum::http::{HeaderMap, HeaderValue, StatusCode};
use axum::response::{IntoResponse, Response};
use futures_util::{Stream, StreamExt as _};
use serde_json::{Value, json};
use std::collections::HashSet;
use std::pin::Pin;
use std::sync::{Arc, Mutex, RwLock};
use std::task::{Context, Poll};
use std::time::{Duration, Instant};

use crate::providers::LiveProviderModel;
use crate::proxy::AppState;

/// Error shown when Gonka is selected without a broker/API key.
pub const MISSING_API_KEY_MESSAGE: &str = "Gonka broker mode requires GONKA_API_KEY";
const CATALOG_TTL: Duration = Duration::from_secs(5 * 60);
const CATALOG_REQUEST_TIMEOUT: Duration = Duration::from_secs(15);
const FAILED_REFRESH_RETRY: Duration = Duration::from_secs(15);
const MAX_CATALOG_BYTES: usize = 4 * 1024 * 1024;
const MAX_SSE_CARRY_BYTES: usize = 64 * 1024;

#[derive(Clone, Debug)]
struct CachedCatalog {
    models: Vec<LiveProviderModel>,
    last_success: Option<Instant>,
    last_attempt: Instant,
    failed: bool,
}

/// Gonka runtime configuration copied from the application config.
#[derive(Clone)]
pub struct GonkaConfig {
    api_key: String,
    pub source_url: String,
    pub model: String,
    catalog: Arc<RwLock<Option<CachedCatalog>>>,
}

impl std::fmt::Debug for GonkaConfig {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        formatter
            .debug_struct("GonkaConfig")
            .field("api_key", &"[REDACTED]")
            .field("source_url", &self.source_url)
            .field("model", &self.model)
            .finish_non_exhaustive()
    }
}

impl GonkaConfig {
    /// Create Gonka config if all required fields are present.
    #[must_use]
    pub fn new(api_key: Option<String>, source_url: Option<&str>, model: String) -> Option<Self> {
        let api_key = api_key.filter(|key| !key.is_empty())?;
        let source_url = source_url.filter(|url| !url.is_empty())?;
        Some(Self {
            api_key,
            source_url: source_url.trim_end_matches('/').to_string(),
            model,
            catalog: Arc::new(RwLock::new(None)),
        })
    }

    /// Resolve an OpenAI-compatible Gonka endpoint.
    #[must_use]
    pub fn endpoint(&self, path: &str) -> String {
        format!("{}{}", self.source_url, path)
    }
}

/// Ensure an `OpenAI` request body has a model, using `GONKA_MODEL` when omitted.
#[must_use]
pub fn with_default_model(mut body: Value, default_model: &str) -> Value {
    if !default_model.is_empty()
        && !matches!(body.get("model").and_then(Value::as_str), Some(s) if !s.is_empty())
    {
        body["model"] = Value::String(default_model.to_string());
    }
    body
}

/// Whether this OpenAI-compatible broker can serve requests from `client`.
#[must_use]
pub(crate) const fn supports_client(client: crate::clients::ClientKind) -> bool {
    matches!(
        client,
        crate::clients::ClientKind::Codex
            | crate::clients::ClientKind::GrokCli
            | crate::clients::ClientKind::Opencode
            | crate::clients::ClientKind::QwenCode
    )
}

impl GonkaConfig {
    /// Return a fresh-enough authenticated model catalog, never an expired one.
    pub(crate) async fn live_catalog(
        &self,
        client: &reqwest::Client,
    ) -> Result<Vec<LiveProviderModel>, String> {
        let cached = self
            .catalog
            .read()
            .map_err(|_| "Gonka catalog cache is unavailable")?
            .clone();
        if let Some(cached) = cached {
            if !cached.failed
                && cached
                    .last_success
                    .is_some_and(|at| at.elapsed() < CATALOG_TTL)
            {
                return Ok(cached.models);
            }
            if cached.failed && cached.last_attempt.elapsed() < FAILED_REFRESH_RETRY {
                return Err("Gonka live model catalog is unavailable".into());
            }
        }
        self.refresh_catalog(client).await
    }

    async fn refresh_catalog(
        &self,
        client: &reqwest::Client,
    ) -> Result<Vec<LiveProviderModel>, String> {
        self.refresh_catalog_with_timeout(client, CATALOG_REQUEST_TIMEOUT)
            .await
    }

    pub(crate) async fn refresh_catalog_with_timeout(
        &self,
        client: &reqwest::Client,
        timeout: Duration,
    ) -> Result<Vec<LiveProviderModel>, String> {
        let fetched = tokio::time::timeout(timeout, self.fetch_catalog(client))
            .await
            .map_err(|_| "catalog request exceeded its total timeout".to_string())
            .and_then(|result| result);
        let models = fetched.map_err(|detail| {
            tracing::warn!("Gonka catalog refresh failed: {detail}");
            let previous = self.catalog.read().ok().and_then(|entry| entry.clone());
            let last_success = previous.as_ref().and_then(|entry| entry.last_success);
            let models = previous.map_or_else(Vec::new, |entry| entry.models);
            if let Ok(mut cache) = self.catalog.write() {
                *cache = Some(CachedCatalog {
                    models,
                    last_success,
                    last_attempt: Instant::now(),
                    failed: true,
                });
            }
            "Gonka live model catalog is unavailable".to_string()
        })?;
        let now = Instant::now();
        *self
            .catalog
            .write()
            .map_err(|_| "Gonka catalog cache is unavailable")? = Some(CachedCatalog {
            models: models.clone(),
            last_success: Some(now),
            last_attempt: now,
            failed: false,
        });
        Ok(models)
    }

    async fn fetch_catalog(
        &self,
        client: &reqwest::Client,
    ) -> Result<Vec<LiveProviderModel>, String> {
        let response = client
            .get(self.endpoint("/v1/models"))
            .bearer_auth(&self.api_key)
            .send()
            .await
            .map_err(|error| error.to_string())?;
        if !response.status().is_success() {
            return Err(format!(
                "non-inference endpoint returned {}",
                response.status()
            ));
        }
        let mut bytes = Vec::new();
        let mut stream = response.bytes_stream();
        while let Some(chunk) = stream.next().await {
            let chunk = chunk.map_err(|error| error.to_string())?;
            if bytes.len().saturating_add(chunk.len()) > MAX_CATALOG_BYTES {
                return Err("catalog response exceeded the size limit".into());
            }
            bytes.extend_from_slice(&chunk);
        }
        let payload: Value = serde_json::from_slice(&bytes).map_err(|error| error.to_string())?;
        let entries = payload
            .get("data")
            .and_then(Value::as_array)
            .ok_or("catalog response has no data array")?;
        let mut seen = HashSet::new();
        let mut models = Vec::new();
        for entry in entries {
            let mut raw = entry
                .as_object()
                .cloned()
                .ok_or("catalog model record is not an object")?;
            let id = raw
                .get("id")
                .and_then(Value::as_str)
                .filter(|id| !id.is_empty())
                .ok_or("catalog model record has no exact id")?;
            if !seen.insert(id.to_string()) {
                continue;
            }
            if self.model.is_empty() || self.model == id {
                let id = id.to_string();
                raw.insert("id".into(), Value::String(id.clone()));
                models.push(LiveProviderModel { id, raw });
            }
        }
        Ok(models)
    }
}

/// Project exact live entries into an OpenAI-shaped catalog.
#[must_use]
pub(crate) fn catalog_json(models: Vec<LiveProviderModel>) -> Value {
    let data = models
        .into_iter()
        .map(|model| {
            let mut raw = model.raw;
            raw.insert("id".into(), Value::String(model.id));
            raw.entry("object")
                .or_insert_with(|| Value::String("model".into()));
            raw.entry("owned_by")
                .or_insert_with(|| Value::String("gonka".into()));
            Value::Object(raw)
        })
        .collect::<Vec<_>>();
    json!({"object": "list", "data": data})
}

/// Add Gonka's exact IDs after existing catalogs, omitting canonical collisions.
/// Existing providers intentionally win so listing and automatic dispatch use
/// one deterministic precedence rule.
pub(crate) fn merge_catalog(catalog: &mut Value, models: Vec<LiveProviderModel>) {
    let Some(data) = catalog.get_mut("data").and_then(Value::as_array_mut) else {
        return;
    };
    for model in models {
        if data
            .iter()
            .any(|entry| entry.get("id").and_then(Value::as_str) == Some(model.id.as_str()))
        {
            continue;
        }
        let mut raw = model.raw;
        raw.insert("id".into(), Value::String(model.id));
        raw.entry("object")
            .or_insert_with(|| Value::String("model".into()));
        raw.entry("owned_by")
            .or_insert_with(|| Value::String("gonka".into()));
        data.push(Value::Object(raw));
    }
}

#[derive(Default)]
struct SseTerminalDetector {
    carry: Vec<u8>,
    terminal_in_discarded_prefix: bool,
}

impl SseTerminalDetector {
    fn push(&mut self, chunk: &[u8]) -> bool {
        let mut terminal = false;
        for block in crate::sse::push_blocks(&mut self.carry, chunk) {
            terminal |= self.terminal_in_discarded_prefix
                || crate::request_log::text_terminates_stream(&block);
            self.terminal_in_discarded_prefix = false;
        }
        if self.carry.len() > MAX_SSE_CARRY_BYTES {
            self.terminal_in_discarded_prefix |=
                crate::request_log::text_terminates_stream(&String::from_utf8_lossy(&self.carry));
            let discard = self.carry.len() - MAX_SSE_CARRY_BYTES;
            self.carry.drain(..discard);
        }
        terminal
    }
}

struct GonkaRelayStream {
    upstream: Pin<Box<dyn Stream<Item = Result<bytes::Bytes, reqwest::Error>> + Send>>,
    request_log: Arc<crate::request_log::RequestLog>,
    correlation_id: String,
    logger: log_lazy::LogLazy,
    usage: Option<crate::usage::UsageTracker>,
    metrics: Arc<crate::metrics::Metrics>,
    bytes_sent: u64,
    outcome: Mutex<crate::request_log::StreamOutcome>,
    terminal: SseTerminalDetector,
    started: Instant,
    settled: bool,
}

impl GonkaRelayStream {
    fn new(
        upstream: reqwest::Response,
        state: &AppState,
        correlation_id: String,
        usage: Option<crate::usage::UsageTracker>,
        bytes_sent: u64,
    ) -> Self {
        let outcome = crate::request_log::StreamOutcome {
            streamed: true,
            terminated: false,
            inspectable: crate::request_log::body_is_inspectable(upstream.headers()),
            detail: None,
            frames: 0,
            bytes: 0,
            duration_ms: 0,
        };
        Self {
            upstream: Box::pin(upstream.bytes_stream()),
            request_log: Arc::clone(&state.request_log),
            correlation_id,
            logger: state.logger.clone(),
            usage,
            metrics: Arc::clone(&state.metrics),
            bytes_sent,
            outcome: Mutex::new(outcome),
            terminal: SseTerminalDetector::default(),
            started: Instant::now(),
            settled: false,
        }
    }

    fn settle(&mut self) {
        if self.settled {
            return;
        }
        self.settled = true;
        let received = self.outcome.lock().map_or(0, |outcome| outcome.bytes);
        self.metrics.record_bytes(self.bytes_sent, received);
        crate::request_log::settle_stream(
            &self.request_log,
            &self.correlation_id,
            &self.outcome,
            self.started.elapsed().as_millis(),
            &self.logger,
        );
    }
}

impl Stream for GonkaRelayStream {
    type Item = Result<bytes::Bytes, std::io::Error>;

    fn poll_next(self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Option<Self::Item>> {
        let this = self.get_mut();
        match this.upstream.as_mut().poll_next(cx) {
            Poll::Ready(Some(Ok(bytes))) => {
                this.request_log
                    .record_upstream_body(&this.correlation_id, &bytes);
                if let Ok(mut outcome) = this.outcome.lock() {
                    outcome.frames += 1;
                    outcome.bytes += bytes.len() as u64;
                    if this.terminal.push(&bytes) {
                        outcome.terminated = true;
                    }
                }
                if let Some(usage) = &mut this.usage {
                    usage.feed(&bytes);
                }
                Poll::Ready(Some(Ok(bytes)))
            }
            Poll::Ready(Some(Err(error))) => {
                if let Ok(mut outcome) = this.outcome.lock() {
                    outcome.detail = Some(error.to_string());
                }
                this.settle();
                Poll::Ready(Some(Err(std::io::Error::other(error))))
            }
            Poll::Ready(None) => {
                this.settle();
                Poll::Ready(None)
            }
            Poll::Pending => Poll::Pending,
        }
    }
}

impl Drop for GonkaRelayStream {
    fn drop(&mut self) {
        self.settle();
    }
}

/// Convert a Gonka provider error into an OpenAI-shaped JSON response.
#[must_use]
pub fn provider_error(status: StatusCode, message: &str) -> Response {
    (
        status,
        axum::Json(json!({
            "error": {
                "type": "api_error",
                "message": message
            }
        })),
    )
        .into_response()
}

/// Forward an `OpenAI`-dialect request to the Gonka upstream.
///
/// Client auth stays on the router's own `la_sk_...` tokens; the upstream call
/// uses the separately configured broker API key.
pub(crate) async fn forward_openai(
    state: &AppState,
    headers: &HeaderMap,
    body: serde_json::Value,
    path: &str,
    surface: crate::metrics::Surface,
) -> Response {
    if let Some(resp) = crate::proxy::maybe_mpp_challenge(state, headers, path) {
        return resp;
    }

    let Some(gonka) = state.gonka.as_ref() else {
        return provider_error(
            StatusCode::INTERNAL_SERVER_ERROR,
            crate::gonka::MISSING_API_KEY_MESSAGE,
        );
    };

    let claims = match crate::proxy::authenticate_client(state, headers) {
        Ok(claims) => claims,
        Err(response) => return *response,
    };
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
    crate::audit::record_authorised_request(state, &claims, surface, path, Some(&body));

    let body = with_default_model(body, &gonka.model);
    if !matches!(body.get("model").and_then(Value::as_str), Some(model) if !model.is_empty()) {
        return crate::proxy::error_response(
            StatusCode::BAD_REQUEST,
            "invalid_request_error",
            "Gonka requests must name `model` unless the operator explicitly configures GONKA_MODEL",
        );
    }
    let model = body
        .get("model")
        .and_then(Value::as_str)
        .unwrap_or_default();
    let live = match gonka.live_catalog(&state.client).await {
        Ok(live) => live,
        Err(error) => {
            return crate::proxy::error_response(
                StatusCode::SERVICE_UNAVAILABLE,
                "api_error",
                &error,
            );
        }
    };
    if !live.iter().any(|candidate| candidate.id == model) {
        return crate::proxy::error_response(
            StatusCode::NOT_FOUND,
            "not_found_error",
            &format!("model '{model}' is not available from Gonka"),
        );
    }
    let stream_requested = body.get("stream").and_then(Value::as_bool).unwrap_or(false);
    let serialized = match serde_json::to_vec(&body) {
        Ok(v) => v,
        Err(e) => {
            return crate::proxy::error_response(
                StatusCode::INTERNAL_SERVER_ERROR,
                "api_error",
                &format!("failed to serialize Gonka body: {e}"),
            );
        }
    };
    let bytes_sent = serialized.len() as u64;

    let upstream_request = state
        .client
        .post(gonka.endpoint(path))
        .header("content-type", "application/json")
        .bearer_auth(&gonka.api_key)
        .body(serialized);
    let correlation_id = crate::request_log::correlation_id(headers);
    let upstream_resp = match state
        .request_log
        .send_upstream(&correlation_id, &state.client, upstream_request)
        .await
    {
        Ok(resp) => resp,
        Err(e) => {
            state.metrics.record_request(surface, 502, None);
            return crate::proxy::error_response(
                StatusCode::BAD_GATEWAY,
                "api_error",
                &format!("Gonka upstream request failed: {e}"),
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
    let response_headers = crate::proxy::relay_response_headers(upstream_resp.headers());
    if stream_requested || crate::request_log::response_is_streamed(upstream_resp.headers()) {
        let usage = status
            .is_success()
            .then(|| reservation.take().into_tracker());
        let stream = GonkaRelayStream::new(upstream_resp, state, correlation_id, usage, bytes_sent);
        let mut response = Response::new(Body::from_stream(stream));
        *response.status_mut() = status;
        *response.headers_mut() = response_headers;
        response.headers_mut().insert("content-type", content_type);
        return response;
    }
    let upstream_body = match upstream_resp.bytes().await {
        Ok(bytes) => bytes,
        Err(e) => {
            state.metrics.record_request(surface, 502, None);
            return crate::proxy::error_response(
                StatusCode::BAD_GATEWAY,
                "api_error",
                &format!("Gonka upstream body read failed: {e}"),
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

    let mut response = Response::new(Body::from(upstream_body));
    *response.status_mut() = status;
    *response.headers_mut() = response_headers;
    response.headers_mut().insert("content-type", content_type);
    response
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn unconfigured_gonka_injects_no_default() {
        let body = with_default_model(json!({"messages": []}), "");
        assert!(body.get("model").is_none());
    }

    #[test]
    fn a_missing_or_blank_model_is_filled_from_the_configured_default() {
        let filled = with_default_model(json!({"messages": []}), "quillon-4-vector");
        assert_eq!(filled["model"], "quillon-4-vector");

        let blank = with_default_model(json!({"model": ""}), "quillon-4-vector");
        assert_eq!(blank["model"], "quillon-4-vector");
    }

    #[test]
    fn an_explicit_model_is_left_alone() {
        let explicit = with_default_model(json!({"model": "aurora-2-base"}), "quillon-4-vector");
        assert_eq!(explicit["model"], "aurora-2-base");
    }

    #[test]
    fn provider_errors_carry_their_status_and_message() {
        let response = provider_error(StatusCode::BAD_GATEWAY, "upstream is unreachable");
        assert_eq!(response.status(), StatusCode::BAD_GATEWAY);
    }

    #[test]
    fn gonka_config_requires_a_broker_api_key() {
        assert!(GonkaConfig::new(None, Some("https://broker.test"), "m".into()).is_none());
        assert!(
            GonkaConfig::new(Some(String::new()), Some("https://broker.test"), "m".into())
                .is_none(),
            "an empty API key is not a credential"
        );
        assert!(
            GonkaConfig::new(Some("k".into()), None, "m".into()).is_none(),
            "broker mode has no implicit direct-wallet endpoint"
        );
        let configured =
            GonkaConfig::new(Some("k".into()), Some("https://broker.test/"), "m".into())
                .expect("a configured provider");
        // The trailing slash is normalised away so endpoints join cleanly.
        assert_eq!(
            configured.endpoint("/v1/models"),
            "https://broker.test/v1/models"
        );
        let debug = format!("{configured:?}");
        assert!(debug.contains("[REDACTED]"));
        assert!(!debug.contains("api_key: \"k\""));
    }

    #[test]
    fn terminal_detection_is_chunk_safe_and_bounded() {
        let mut detector = SseTerminalDetector::default();
        assert!(!detector.push(b"data: [DO"));
        assert!(!detector.push(b"NE]\r\n"));
        assert!(detector.push(b"\r\n"));

        let mut detector = SseTerminalDetector::default();
        assert!(!detector.push(&vec![b'x'; MAX_SSE_CARRY_BYTES + 128]));
        assert_eq!(detector.carry.len(), MAX_SSE_CARRY_BYTES);
    }

    #[test]
    fn automatic_catalog_keeps_existing_owner_and_deduplicates_gonka() {
        let mut catalog = json!({"data":[{
            "id":"shared-id",
            "owned_by":"subscription",
            "source":"existing"
        }]});
        merge_catalog(
            &mut catalog,
            vec![
                LiveProviderModel {
                    id: "shared-id".into(),
                    raw: json!({"id":"shared-id","source":"gonka"})
                        .as_object()
                        .unwrap()
                        .clone(),
                },
                LiveProviderModel {
                    id: "gonka-only".into(),
                    raw: json!({"id":"gonka-only","tier":"live"})
                        .as_object()
                        .unwrap()
                        .clone(),
                },
            ],
        );
        assert_eq!(catalog["data"].as_array().unwrap().len(), 2);
        assert_eq!(catalog["data"][0]["source"], "existing");
        assert_eq!(catalog["data"][0]["owned_by"], "subscription");
        assert_eq!(catalog["data"][1]["id"], "gonka-only");
        assert_eq!(catalog["data"][1]["owned_by"], "gonka");
        assert_eq!(catalog["data"][1]["tier"], "live");
    }

    #[tokio::test]
    async fn live_catalog_is_authenticated_cached_exact_and_narrowed() {
        use axum::routing::get;
        use std::sync::atomic::{AtomicUsize, Ordering};

        let phase = Arc::new(AtomicUsize::new(0));
        let requests = Arc::new(AtomicUsize::new(0));
        let app = axum::Router::new().route(
            "/v1/models",
            get({
                let phase = Arc::clone(&phase);
                let requests = Arc::clone(&requests);
                move |headers: HeaderMap| {
                    let phase = Arc::clone(&phase);
                    let requests = Arc::clone(&requests);
                    async move {
                        assert_eq!(
                            headers
                                .get("authorization")
                                .and_then(|value| value.to_str().ok()),
                            Some("Bearer broker-secret")
                        );
                        requests.fetch_add(1, Ordering::SeqCst);
                        let data = if phase.load(Ordering::SeqCst) == 0 {
                            json!([
                                {"id":"Exact-A","tier":"preview"},
                                {"id":"Exact-B","tier":"stable"}
                            ])
                        } else {
                            json!([
                                {"id":"Exact-B","tier":"stable"},
                                {"id":"Exact-C","tier":"new"},
                                {"id":"Exact-C","tier":"duplicate"}
                            ])
                        };
                        axum::Json(json!({"object":"list","data":data}))
                    }
                }
            }),
        );
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let base_url = format!("http://{}", listener.local_addr().unwrap());
        let server = tokio::spawn(async move { axum::serve(listener, app).await.unwrap() });
        let config = GonkaConfig::new(Some("broker-secret".into()), Some(&base_url), String::new())
            .expect("broker configuration");

        let first = config.live_catalog(&reqwest::Client::new()).await.unwrap();
        assert_eq!(
            first
                .iter()
                .map(|model| model.id.as_str())
                .collect::<Vec<_>>(),
            ["Exact-A", "Exact-B"]
        );
        assert_eq!(first[0].raw["tier"], "preview");
        assert_eq!(
            config.live_catalog(&reqwest::Client::new()).await.unwrap(),
            first,
            "a fresh catalog is served from the bounded cache"
        );
        assert_eq!(requests.load(Ordering::SeqCst), 1);

        phase.store(1, Ordering::SeqCst);
        let refreshed = config
            .refresh_catalog(&reqwest::Client::new())
            .await
            .unwrap();
        assert_eq!(
            refreshed
                .iter()
                .map(|model| model.id.as_str())
                .collect::<Vec<_>>(),
            ["Exact-B", "Exact-C"],
            "additions and removals replace, rather than extend, the snapshot"
        );

        let data_dir = tempfile::tempdir().unwrap();
        let mut state = AppState::for_tests(data_dir.path());
        state.gonka = Some(config.clone());
        let token = state
            .token_manager
            .issue(&crate::token::IssueRequest {
                ttl_hours: 1,
                label: "gonka-catalog",
                client_kind: Some("codex"),
                principal_id: Some("gonka-catalog-principal"),
                ..crate::token::IssueRequest::default()
            })
            .unwrap();
        let mut headers = HeaderMap::new();
        headers.insert(
            "authorization",
            HeaderValue::from_str(&format!("Bearer {token}")).unwrap(),
        );
        headers.insert("x-link-assistant-client", HeaderValue::from_static("codex"));
        let response = crate::model_routing::models(
            axum::extract::State(state.clone()),
            axum::extract::OriginalUri("/api/services/codex/v1/models".parse().unwrap()),
            headers,
        )
        .await;
        assert_eq!(response.status(), StatusCode::OK);
        let body = axum::body::to_bytes(response.into_body(), 1024 * 1024)
            .await
            .unwrap();
        let catalog: Value = serde_json::from_slice(&body).unwrap();
        let ids = catalog["data"]
            .as_array()
            .unwrap()
            .iter()
            .filter_map(|entry| entry["id"].as_str())
            .collect::<Vec<_>>();
        assert_eq!(ids, ["Exact-B", "Exact-C"]);
        assert_eq!(catalog["healthy_providers"], json!(["gonka"]));
        let routed = crate::model_routing::route_state_with_subscription_for_client(
            &state,
            &json!({"model":"Exact-C"}),
            &[],
            Some(crate::clients::ClientKind::Codex),
            false,
        )
        .await
        .unwrap();
        assert_eq!(
            routed.state.upstream_provider,
            crate::config::UpstreamProvider::Gonka
        );

        let narrowed = GonkaConfig::new(
            Some("broker-secret".into()),
            Some(&base_url),
            "not-live".into(),
        )
        .unwrap()
        .live_catalog(&reqwest::Client::new())
        .await
        .unwrap();
        assert!(
            narrowed.is_empty(),
            "configuration cannot invent availability"
        );
        assert_eq!(requests.load(Ordering::SeqCst), 3);
        server.abort();
        let _ = server.await;
        if let Some(cached) = config.catalog.write().unwrap().as_mut() {
            cached.last_success = Some(
                Instant::now()
                    .checked_sub(CATALOG_TTL.saturating_add(Duration::from_secs(1)))
                    .expect("test clock supports a five-minute stale catalog"),
            );
        }
        assert!(
            config.live_catalog(&reqwest::Client::new()).await.is_err(),
            "an expired snapshot is not served after refresh failure"
        );
    }

    #[tokio::test]
    async fn streaming_returns_first_frame_and_settles_on_disconnect() {
        use axum::routing::{get, post};
        use http_body_util::BodyExt as _;
        use std::sync::atomic::Ordering;

        let app = axum::Router::new()
            .route(
                "/v1/models",
                get(|headers: HeaderMap| async move {
                    assert_eq!(headers["authorization"], "Bearer broker-secret");
                    axum::Json(json!({"data":[{"id":"live-model"}]}))
                }),
            )
            .route(
                "/v1/chat/completions",
                post(|headers: HeaderMap| async move {
                    assert_eq!(headers["authorization"], "Bearer broker-secret");
                    let first = futures_util::stream::iter([Ok::<_, std::io::Error>(
                        bytes::Bytes::from_static(
                            b"data: {\"choices\":[],\"usage\":{\"total_tokens\":3}}\n\n",
                        ),
                    )]);
                    let last = futures_util::stream::once(async {
                        tokio::time::sleep(Duration::from_secs(2)).await;
                        Ok::<_, std::io::Error>(bytes::Bytes::from_static(b"data: [DONE]\n\n"))
                    });
                    Response::builder()
                        .status(StatusCode::ACCEPTED)
                        .header("content-type", "text/event-stream")
                        .header("x-request-id", "gonka-request")
                        .header("connection", "x-hidden")
                        .header("x-hidden", "must-not-relay")
                        .header("x-api-key", "must-not-relay")
                        .body(Body::from_stream(first.chain(last)))
                        .unwrap()
                }),
            );
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let base_url = format!("http://{}", listener.local_addr().unwrap());
        let server = tokio::spawn(async move { axum::serve(listener, app).await.unwrap() });
        let directory = tempfile::tempdir().unwrap();
        let mut state = AppState::for_tests(directory.path());
        state.upstream_provider = crate::config::UpstreamProvider::Gonka;
        state.gonka =
            GonkaConfig::new(Some("broker-secret".into()), Some(&base_url), String::new());
        let (token, token_id) = state
            .token_manager
            .issue_with_id(&crate::token::IssueRequest {
                ttl_hours: 1,
                label: "gonka-stream",
                ..crate::token::IssueRequest::default()
            })
            .unwrap();
        let mut headers = HeaderMap::new();
        headers.insert(
            "authorization",
            HeaderValue::from_str(&format!("Bearer {token}")).unwrap(),
        );
        headers.insert("x-request-id", HeaderValue::from_static("gonka-stream"));

        let response = tokio::time::timeout(
            Duration::from_millis(500),
            forward_openai(
                &state,
                &headers,
                json!({"model":"live-model","messages":[],"stream":true}),
                "/v1/chat/completions",
                crate::metrics::Surface::OpenAIChat,
            ),
        )
        .await
        .expect("response headers must not wait for stream completion");
        assert_eq!(response.status(), StatusCode::ACCEPTED);
        assert_eq!(response.headers()["x-request-id"], "gonka-request");
        assert!(!response.headers().contains_key("x-hidden"));
        assert!(!response.headers().contains_key("x-api-key"));
        let mut body = response.into_body();
        let first = tokio::time::timeout(Duration::from_millis(500), body.frame())
            .await
            .expect("first frame must be incremental")
            .unwrap()
            .unwrap()
            .into_data()
            .unwrap();
        assert!(String::from_utf8_lossy(&first).contains("total_tokens"));
        drop(body);

        assert_eq!(
            state
                .token_manager
                .store()
                .get(&token_id)
                .unwrap()
                .unwrap()
                .used_tokens,
            3,
            "disconnect still settles usage observed before it"
        );
        assert!(state.metrics.bytes_in.load(Ordering::Relaxed) > 0);
        let written = std::fs::read_to_string(
            directory
                .path()
                .join("requests/unauthenticated/requests.lino"),
        )
        .unwrap();
        let settled = written
            .lines()
            .filter_map(crate::lino_json::decode_line)
            .find(|record| record["phase"] == "stream_end")
            .expect("dropping the client body must settle the stream");
        assert_eq!(settled["outcome"], "ended_without_terminator");
        server.abort();
    }

    #[tokio::test]
    async fn upstream_transport_error_is_relayed_and_settled() {
        use futures_util::StreamExt as _;
        use tokio::io::{AsyncReadExt as _, AsyncWriteExt as _};

        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let url = format!("http://{}/", listener.local_addr().unwrap());
        let upstream = tokio::spawn(async move {
            let (mut socket, _) = listener.accept().await.unwrap();
            let mut request = [0_u8; 1024];
            let _ = socket.read(&mut request).await.unwrap();
            let frame = b"data: {\"choices\":[]}\n\n";
            socket
                .write_all(
                    format!(
                        "HTTP/1.1 200 OK\r\ncontent-type: text/event-stream\r\ntransfer-encoding: chunked\r\n\r\n{:X}\r\n",
                        frame.len()
                    )
                    .as_bytes(),
                )
                .await
                .unwrap();
            socket.write_all(frame).await.unwrap();
            socket.write_all(b"\r\n").await.unwrap();
            tokio::time::sleep(Duration::from_millis(25)).await;
            socket.write_all(b"not-a-chunk-size\r\n").await.unwrap();
        });
        let response = reqwest::get(url).await.unwrap();
        let directory = tempfile::tempdir().unwrap();
        let state = AppState::for_tests(directory.path());
        let mut stream = Box::pin(GonkaRelayStream::new(
            response,
            &state,
            "gonka-error".into(),
            None,
            0,
        ));
        assert!(stream.next().await.unwrap().is_ok());
        assert!(stream.next().await.unwrap().is_err());
        drop(stream);
        upstream.await.unwrap();

        let written = std::fs::read_to_string(
            directory
                .path()
                .join("requests/unauthenticated/requests.lino"),
        )
        .unwrap();
        let settled = written
            .lines()
            .filter_map(crate::lino_json::decode_line)
            .find(|record| record["phase"] == "stream_end")
            .expect("transport failure must settle the stream");
        assert_eq!(settled["outcome"], "upstream_error");
        assert!(!settled["complete"].as_bool().unwrap());
    }
}
