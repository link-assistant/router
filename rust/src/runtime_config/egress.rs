use axum::body::Bytes;
use axum::extract::Request;
use axum::http::{HeaderMap, Method, header};
use axum::middleware::Next;
use axum::response::Response;
use serde_json::{Value, json};

use crate::app_state::AppState;
use crate::request_log::RequestLog;
use crate::token::TokenClaims;
use crate::upstream_client::UpstreamSendError;

use super::payload::{Applied, Context, FAILURE, Rules};

tokio::task_local! {
    static SOURCE: Source;
}

struct Source {
    protocol: &'static str,
    share_geolocation: bool,
}

pub(crate) async fn scope(request: Request, next: Next) -> Response {
    let path = request.uri().path();
    let protocol = match path.strip_prefix("/api/services/").and_then(|path| path.split('/').next()) {
        Some("anthropic") => "claude",
        Some("gemini" | "vertex") => "gemini",
        Some("bedrock") => "bedrock",
        Some("openai" | "codex" | "qwen") if path.ends_with("/responses") => "responses",
        Some("openai" | "codex" | "qwen") => "openai",
        _ => "",
    };
    let source = Source {
        protocol,
        share_geolocation: crate::geolocation::shares_geolocation(request.headers()),
    };
    SOURCE.scope(source, next.run(request)).await
}

tokio::task_local! {
    static DESTINATION: &'static str;
}

pub(crate) async fn destination<T>(
    protocol: &'static str,
    future: impl std::future::Future<Output = T>,
) -> T {
    DESTINATION.scope(protocol, future).await
}

fn target_protocol(method: &Method, url: &url::Url) -> Option<&'static str> {
    if *method != Method::POST {
        return None;
    }
    let path = url.path().trim_end_matches('/');
    if path.ends_with("/messages") {
        Some("claude")
    } else if path.ends_with(":generateContent") || path.ends_with(":streamGenerateContent") {
        Some("gemini")
    } else if path.ends_with("/invoke") || path.ends_with("/invoke-with-response-stream") {
        Some("bedrock")
    } else if path.ends_with(":rawPredict") || path.ends_with(":streamRawPredict") {
        Some("vertex")
    } else if path.ends_with("/responses")
        || path.ends_with("/responses/compact")
        || path.ends_with("/chat/completions")
        || path.ends_with("/completions")
        || path.ends_with("/embeddings")
    {
        if path.contains("/codex/") || path.contains("/backend-api/") {
            Some("codex")
        } else {
            Some("openai")
        }
    } else {
        None
    }
}

fn target_model(url: &url::Url) -> &str {
    url.path().rsplit_once("/models/").map_or("", |(_, model)| {
        model.split_once(':').map_or(model, |(model, _)| model)
    })
}

pub(crate) async fn http(
    log: &RequestLog,
    correlation: &str,
    request: &mut reqwest::Request,
) -> Result<(), UpstreamSendError> {
    let Some(config) = log.runtime_config() else { return Ok(()) };
    let rules = config.rules();
    if rules.is_empty() {
        return Ok(());
    }
    let Some(protocol) = target_protocol(request.method(), request.url()) else { return Ok(()) };
    let protocol = DESTINATION.try_with(|protocol| *protocol).unwrap_or(protocol);
    let (token_id, token_label) = log.runtime_identity(correlation);
    let fail = UpstreamSendError::PayloadRule;
    let Some(bytes) = request.body().and_then(reqwest::Body::as_bytes) else {
        return Err(fail(FAILURE));
    };
    let limit = crate::config::DEFAULT_MAX_PROXY_REQUEST_BYTES;
    let encoded = request.headers().contains_key(header::CONTENT_ENCODING);
    let (mut body, native) = if encoded {
        let parsed = crate::encoded_request_body::read_native_json(
            request.headers(),
            axum::body::Body::from(bytes.to_vec()),
            limit,
            protocol == "codex",
        )
        .await
        .map_err(|_| fail(FAILURE))?;
        (parsed.value, Some(parsed.native))
    } else {
        (serde_json::from_slice(bytes).map_err(|_| fail(FAILURE))?, None)
    };
    let model = body["model"].as_str().or_else(|| body["modelId"].as_str())
        .or_else(|| body["request"]["model"].as_str()).filter(|model| !model.is_empty())
        .unwrap_or_else(|| target_model(request.url())).to_owned();
    let (from_protocol, share_geolocation) = SOURCE.try_with(|source| {
        (source.protocol, source.share_geolocation)
    }).unwrap_or_default();
    let context = Context {
        protocol, from_protocol, model: &model,
        token_id: token_id.as_deref(), token_label: token_label.as_deref(),
    };
    let applied = apply(&rules, &mut body, &context, share_geolocation).map_err(fail)?;
    if applied.is_empty() {
        return Ok(());
    }
    let bytes = serde_json::to_vec(&body).map_err(|_| fail(FAILURE))?;
    if bytes.len() > limit {
        return Err(fail(FAILURE));
    }
    let bytes = if let Some(native) = native {
        native.encode(&body).map_err(|_| fail(FAILURE))?
    } else {
        bytes
    };
    if bytes.len() > limit {
        return Err(fail(FAILURE));
    }
    *request.body_mut() = Some(bytes.into());
    request.headers_mut().remove(header::CONTENT_LENGTH);
    log.record(correlation, "payload_rules_applied", json!({"protocol": protocol, "changes": applied}));
    Ok(())
}

fn apply(
    rules: &Rules,
    body: &mut Value,
    context: &Context<'_>,
    share_geolocation: bool,
) -> Result<Vec<Applied>, &'static str> {
    let applied = rules.apply(body, context)?;
    if !applied.is_empty() && crate::geolocation::sanitize(body, share_geolocation) {
        return Err("runtime payload rules introduced geolocation without request consent");
    }
    Ok(applied)
}

pub(crate) fn websocket(
    state: &AppState,
    correlation: &str,
    headers: &HeaderMap,
    claims: &TokenClaims,
    provider: crate::config::UpstreamProvider,
    body: &mut Value,
) -> Result<bool, &'static str> {
    let log = &state.request_log;
    let Some(config) = log.runtime_config() else { return Ok(false) };
    let rules = config.rules();
    if rules.is_empty() {
        return Ok(false);
    }
    let protocol = if provider == crate::config::UpstreamProvider::Codex {
        "codex"
    } else {
        "openai"
    };
    let model = body["model"].as_str().unwrap_or_default().to_owned();
    let context = Context {
        protocol, from_protocol: "responses", model: &model,
        token_id: Some(&claims.sub), token_label: Some(&claims.label),
    };
    let applied = apply(&rules, body, &context, crate::geolocation::shares_geolocation(headers))?;
    if applied.is_empty() {
        return Ok(false);
    }
    if serde_json::to_vec(body).map_err(|_| FAILURE)?.len() > state.max_proxy_request_bytes {
        return Err(FAILURE);
    }
    log.record_websocket_rules(correlation, headers, claims, json!({
        "protocol": protocol, "changes": applied
    }));
    Ok(true)
}

struct ForgeFed {
    log: std::sync::Arc<RequestLog>,
    correlation: String,
    token_id: String,
    token_label: String,
    share_geolocation: bool,
}

tokio::task_local! {
    static FORGEFED: ForgeFed;
}

pub(crate) fn forgefed_scope<F: std::future::Future>(
    state: &AppState,
    headers: &HeaderMap,
    claims: &TokenClaims,
    future: F,
) -> impl std::future::Future<Output = F::Output> + use<F> {
    let context = ForgeFed {
        log: std::sync::Arc::clone(&state.request_log),
        correlation: crate::request_log::correlation_id(headers),
        token_id: claims.sub.clone(),
        token_label: claims.label.clone(),
        share_geolocation: crate::geolocation::shares_geolocation(headers),
    };
    FORGEFED.scope(context, future)
}

pub(crate) fn forgefed(model: &str, activity: &mut Value) -> Result<(), &'static str> {
    FORGEFED.try_with(|request| {
        let Some(config) = request.log.runtime_config() else {
            return Ok(());
        };
        let rules = config.rules();
        if rules.is_empty() {
            return Ok(());
        }
        let context = Context {
            protocol: "forgefed",
            from_protocol: "openai",
            model,
            token_id: Some(&request.token_id),
            token_label: Some(&request.token_label),
        };
        let applied = apply(&rules, activity, &context, request.share_geolocation)?;
        if serde_json::to_vec(activity).map_err(|_| FAILURE)?.len()
            > crate::config::DEFAULT_MAX_PROXY_REQUEST_BYTES
        {
            return Err(FAILURE);
        }
        if !applied.is_empty() {
            request.log.record(
                &request.correlation,
                "payload_rules_applied",
                json!({"protocol": "forgefed", "changes": applied}),
            );
        }
        Ok(())
    }).unwrap_or(Ok(()))
}

pub(crate) struct NativeContext {
    log: std::sync::Arc<RequestLog>,
    limit: usize,
    correlation: String,
    headers: HeaderMap,
    claims: TokenClaims,
    protocol: &'static str,
}

impl NativeContext {
    pub(crate) fn new(
        state: &AppState,
        headers: &HeaderMap,
        claims: TokenClaims,
        protocol: &'static str,
    ) -> Self {
        Self {
            log: std::sync::Arc::clone(&state.request_log),
            limit: state.max_proxy_request_bytes,
            correlation: crate::request_log::correlation_id(headers),
            headers: headers.clone(),
            claims,
            protocol,
        }
    }

    fn context<'a>(&'a self, source: &'a str, model: &'a str) -> Context<'a> {
        Context {
            protocol: self.protocol,
            from_protocol: source,
            model,
            token_id: Some(&self.claims.sub),
            token_label: Some(&self.claims.label),
        }
    }

    fn changes(
        &self,
        rules: &Rules,
        source: &str,
        body: &mut Value,
    ) -> Result<Vec<Applied>, &'static str> {
        let model = body.get("model").or_else(|| body.pointer("/session/model"))
            .or_else(|| body.pointer("/response/model"))
            .and_then(Value::as_str).unwrap_or_default().to_owned();
        apply(
            rules, body, &self.context(source, &model),
            crate::geolocation::shares_geolocation(&self.headers),
        )
    }

    pub(crate) fn http(
        &self,
        bytes: Option<&Bytes>,
        batch: bool,
    ) -> Result<Option<Bytes>, &'static str> {
        let Some(config) = self.log.runtime_config() else {
            return Ok(None);
        };
        let rules = config.rules();
        if !rules.could_apply(&self.context(self.protocol, "")) {
            return Ok(None);
        }
        let mut body = bytes
            .and_then(|bytes| serde_json::from_slice::<Value>(bytes).ok())
            .filter(Value::is_object)
            .ok_or("applicable runtime payload rules require a native JSON payload")?;
        let mut changes = Vec::new();
        if batch {
            let requests = body.get_mut("requests").and_then(Value::as_array_mut).ok_or(FAILURE)?;
            for (index, request) in requests.iter_mut().enumerate() {
                let params = request.get_mut("params").ok_or(FAILURE)?;
                let applied = self.changes(&rules, self.protocol, params)?;
                if !applied.is_empty() {
                    changes.push(json!({"batch_index": index, "changes": applied}));
                }
            }
        } else {
            changes = self.changes(&rules, self.protocol, &mut body)?.into_iter()
                .map(|change| json!(change)).collect();
        }
        self.encoded(&body, changes)
    }

    pub(crate) fn realtime(&self, bytes: &[u8]) -> Result<Option<Bytes>, &'static str> {
        let Some(config) = self.log.runtime_config() else {
            return Ok(None);
        };
        let rules = config.rules();
        if !rules.could_apply(&self.context("realtime", "")) {
            return Ok(None);
        }
        let mut body: Value = serde_json::from_slice(bytes).map_err(|_| FAILURE)?;
        if !matches!(body["type"].as_str(), Some("response.create" | "session.update")) {
            return Ok(None);
        }
        let applied = self.changes(&rules, "realtime", &mut body)?;
        self.encoded(&body, applied.into_iter().map(|change| json!(change)).collect())
    }

    fn encoded(&self, body: &Value, changes: Vec<Value>) -> Result<Option<Bytes>, &'static str> {
        if changes.is_empty() {
            return Ok(None);
        }
        let bytes = serde_json::to_vec(body).map_err(|_| FAILURE)?;
        if bytes.len() > self.limit {
            return Err(FAILURE);
        }
        self.log.record_websocket_rules(&self.correlation, &self.headers, &self.claims, json!({
            "protocol": self.protocol, "changes": changes
        }));
        Ok(Some(bytes.into()))
    }
}
