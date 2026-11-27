use axum::body::Bytes;
use axum::extract::{Request, State};
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
    limit: usize,
}

pub async fn scope(State(state): State<AppState>, request: Request, next: Next) -> Response {
    let path = request.uri().path();
    let protocol = match path
        .strip_prefix("/api/services/")
        .and_then(|path| path.split('/').next())
    {
        Some("anthropic") => "claude",
        Some("vertex") if path.contains("/publishers/anthropic/") => "claude",
        Some("gemini" | "vertex") => "gemini",
        Some("bedrock") => "bedrock",
        Some("openai" | "codex" | "qwen")
            if path.ends_with("/responses") || path.ends_with("/responses/compact") =>
        {
            "responses"
        }
        Some("openai" | "codex" | "qwen") => "openai",
        _ => "",
    };
    let source = Source {
        protocol,
        share_geolocation: crate::geolocation::shares_geolocation(request.headers()),
        limit: state.max_proxy_request_bytes,
    };
    SOURCE.scope(source, next.run(request)).await
}

tokio::task_local! {
    static DESTINATION: Destination;
}

#[derive(Clone, Copy)]
struct Destination {
    protocol: &'static str,
    emulated_output_limit: Option<u64>,
}

pub async fn destination<T>(
    protocol: &'static str,
    emulated_output_limit: Option<u64>,
    future: impl std::future::Future<Output = T>,
) -> T {
    DESTINATION
        .scope(
            Destination {
                protocol,
                emulated_output_limit,
            },
            future,
        )
        .await
}

/// The effective cap for the response to an individual upstream attempt.
/// A filter can clear a cap inherited from the original client request.
#[derive(Clone, Copy)]
pub struct CodexOutputLimit(pub Option<u64>);

fn canonical_codex(url: &url::Url) -> bool {
    url.host_str() == Some("chatgpt.com") && url.path().starts_with("/backend-api/codex/")
}

fn check_codex_sampling(body: &Value, applied: &[Applied]) -> Result<(), &'static str> {
    if [("temperature", "/temperature"), ("top_p", "/top_p")]
        .iter()
        .any(|(field, path)| {
            body.get(*field).is_some() && applied.iter().any(|change| change.affects(path))
        })
    {
        return Err("the Codex subscription backend does not support configured sampling parameters");
    }
    Ok(())
}

fn take_output_limit(body: &mut Value) -> Option<u64> {
    body.as_object_mut()
        .and_then(|object| object.remove("max_output_tokens"))
        .and_then(|value| value.as_u64())
}

fn target_protocol(method: &Method, url: &url::Url) -> Option<&'static str> {
    if *method != Method::POST {
        return None;
    }
    let path = url.path().trim_end_matches('/');
    if path.ends_with("/messages") {
        Some("claude")
    } else if path.ends_with(":generateContent")
        || path.ends_with(":streamGenerateContent")
        || path.ends_with(":embedContent")
        || path.ends_with(":batchEmbedContents")
    {
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
    let path = url.path();
    if let Some((_, invoke)) = path.rsplit_once("/model/") {
        return invoke.split_once('/').map_or("", |(model, _)| model);
    }
    path.rsplit_once("/models/").map_or("", |(_, model)| {
        model.split_once(':').map_or(model, |(model, _)| model)
    })
}

pub async fn http(
    log: &RequestLog,
    correlation: &str,
    request: &mut reqwest::Request,
) -> Result<Option<CodexOutputLimit>, UpstreamSendError> {
    let Some(config) = log.runtime_config() else {
        return Ok(None);
    };
    let rules = config.rules();
    if rules.is_empty() {
        return Ok(None);
    }
    let Some(protocol) = target_protocol(request.method(), request.url()) else {
        return Ok(None);
    };
    let destination = DESTINATION.try_with(|destination| *destination).ok();
    let protocol = destination.map_or(protocol, |destination| destination.protocol);
    let (token_id, token_label) = log.runtime_identity(correlation);
    let (from_protocol, share_geolocation, limit) = SOURCE
        .try_with(|source| (source.protocol, source.share_geolocation, source.limit))
        .unwrap_or(("", false, crate::config::DEFAULT_MAX_PROXY_REQUEST_BYTES));
    let mut context = Context {
        protocol,
        from_protocol,
        model: "",
        token_id: token_id.as_deref(),
        token_label: token_label.as_deref(),
    };
    if !rules.could_apply(&context) {
        return Ok(None);
    }
    let fail = UpstreamSendError::PayloadRule;
    let Some(bytes) = request.body().and_then(reqwest::Body::as_bytes) else {
        return Err(fail(FAILURE));
    };
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
        (
            serde_json::from_slice(bytes).map_err(|_| fail(FAILURE))?,
            None,
        )
    };
    let codex = destination.filter(|destination| destination.protocol == "codex");
    let virtual_limit = if let Some(limit) = codex.and_then(|target| target.emulated_output_limit)
        && let Some(object) = body.as_object_mut()
        && !object.contains_key("max_output_tokens")
    {
        object.insert("max_output_tokens".into(), json!(limit));
        true
    } else {
        false
    };
    let model = body["model"]
        .as_str()
        .or_else(|| body["modelId"].as_str())
        .or_else(|| body["request"]["model"].as_str())
        .filter(|model| !model.is_empty())
        .unwrap_or_else(|| target_model(request.url()))
        .to_owned();
    context.model = &model;
    let applied = apply(&rules, &mut body, &context, share_geolocation).map_err(fail)?;
    if applied.is_empty() {
        return Ok(None);
    }
    if codex.is_some() && canonical_codex(request.url()) {
        check_codex_sampling(&body, &applied).map_err(fail)?;
    }
    let changed_limit = codex.is_some()
        && applied
            .iter()
            .any(|change| change.affects("/max_output_tokens"));
    let output_limit = if virtual_limit || changed_limit {
        let limit = take_output_limit(&mut body);
        changed_limit.then_some(CodexOutputLimit(limit))
    } else {
        None
    };
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
    log.record(
        correlation,
        "payload_rules_applied",
        json!({"protocol": protocol, "changes": applied}),
    );
    Ok(output_limit)
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

pub fn websocket(
    state: &AppState,
    correlation: &str,
    headers: &HeaderMap,
    claims: &TokenClaims,
    provider: crate::config::UpstreamProvider,
    url: &str,
    body: &mut Value,
) -> Result<(bool, Option<u64>), &'static str> {
    let log = &state.request_log;
    let Some(config) = log.runtime_config() else {
        return Ok((false, None));
    };
    let rules = config.rules();
    if rules.is_empty() {
        return Ok((false, None));
    }
    let protocol = if provider == crate::config::UpstreamProvider::Codex {
        "codex"
    } else {
        "openai"
    };
    let model = body["model"].as_str().unwrap_or_default().to_owned();
    let context = Context {
        protocol,
        from_protocol: "responses",
        model: &model,
        token_id: Some(&claims.sub),
        token_label: Some(&claims.label),
    };
    let result = apply(
        &rules,
        body,
        &context,
        crate::geolocation::shares_geolocation(headers),
    )
    .and_then(|applied| {
        if applied.is_empty() {
            return Ok((applied, None));
        }
        let mut output_limit = None;
        if protocol == "codex" && url::Url::parse(url).as_ref().is_ok_and(canonical_codex) {
            check_codex_sampling(body, &applied)?;
            if applied
                .iter()
                .any(|change| change.affects("/max_output_tokens"))
            {
                output_limit = take_output_limit(body);
            }
        }
        if serde_json::to_vec(body).map_err(|_| FAILURE)?.len() > state.max_proxy_request_bytes {
            return Err(FAILURE);
        }
        Ok((applied, output_limit))
    });
    match result {
        Ok((applied, _)) if applied.is_empty() => Ok((false, None)),
        Ok((applied, output_limit)) => {
            log.record_payload_rules(
                correlation,
                headers,
                claims,
                "payload_rules_applied",
                json!({"protocol": protocol, "changes": applied}),
            );
            Ok((true, output_limit))
        }
        Err(reason) => {
            log.record_payload_rules(
                correlation,
                headers,
                claims,
                "payload_rules_rejected",
                json!({"protocol": protocol, "error": reason}),
            );
            Err(reason)
        }
    }
}

struct ForgeFed {
    log: std::sync::Arc<RequestLog>,
    correlation: String,
    token_id: String,
    token_label: String,
    share_geolocation: bool,
    limit: usize,
}

tokio::task_local! {
    static FORGEFED: ForgeFed;
}

pub fn forgefed_scope<F: std::future::Future>(
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
        limit: state.max_proxy_request_bytes,
    };
    FORGEFED.scope(context, future)
}

pub fn forgefed(model: &str, activity: &mut Value) -> Result<(), &'static str> {
    FORGEFED
        .try_with(|request| {
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
            let applied = apply(&rules, activity, &context, request.share_geolocation)
                .and_then(|applied| {
                    if !applied.is_empty()
                        && serde_json::to_vec(activity).map_err(|_| FAILURE)?.len() > request.limit
                    {
                        return Err(FAILURE);
                    }
                    Ok(applied)
                })
                .inspect_err(|reason| {
                    request.log.record(
                        &request.correlation,
                        "payload_rules_rejected",
                        json!({"protocol": "forgefed", "error": reason}),
                    );
                })?;
            if applied.is_empty() {
                return Ok(());
            }
            request.log.record(
                &request.correlation,
                "payload_rules_applied",
                json!({"protocol": "forgefed", "changes": applied}),
            );
            Ok(())
        })
        .unwrap_or(Ok(()))
}

pub struct NativeContext {
    log: std::sync::Arc<RequestLog>,
    limit: usize,
    correlation: String,
    headers: HeaderMap,
    claims: TokenClaims,
    protocol: &'static str,
    default_model: String,
}

impl NativeContext {
    pub(crate) fn new(
        state: &AppState,
        headers: &HeaderMap,
        claims: TokenClaims,
        protocol: &'static str,
        target_url: &str,
    ) -> Self {
        let default_model = url::Url::parse(target_url)
            .ok()
            .and_then(|url| {
                url.query_pairs()
                    .find(|(key, _)| key == "model")
                    .map(|(_, model)| model.into_owned())
            })
            .unwrap_or_default();
        Self {
            log: std::sync::Arc::clone(&state.request_log),
            limit: state.max_proxy_request_bytes,
            correlation: crate::request_log::correlation_id(headers),
            headers: headers.clone(),
            claims,
            protocol,
            default_model,
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
        let model = ["/model", "/session/model", "/response/model"]
            .into_iter()
            .filter_map(|pointer| body.pointer(pointer).and_then(Value::as_str))
            .find(|model| !model.is_empty())
            .unwrap_or(&self.default_model)
            .to_owned();
        apply(
            rules,
            body,
            &self.context(source, &model),
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
            let requests = body
                .get_mut("requests")
                .and_then(Value::as_array_mut)
                .ok_or(FAILURE)?;
            for (index, request) in requests.iter_mut().enumerate() {
                let params = request.get_mut("params").ok_or(FAILURE)?;
                let applied = self.changes(&rules, self.protocol, params)?;
                if !applied.is_empty() {
                    changes.push(json!({"batch_index": index, "changes": applied}));
                }
            }
        } else {
            changes = self
                .changes(&rules, self.protocol, &mut body)?
                .into_iter()
                .map(|change| json!(change))
                .collect();
        }
        self.encoded(&body, &changes)
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
        if !matches!(
            body["type"].as_str(),
            Some("response.create" | "session.update")
        ) {
            return Ok(None);
        }
        let applied = self.changes(&rules, "realtime", &mut body)?;
        let changes: Vec<_> = applied.into_iter().map(|change| json!(change)).collect();
        self.encoded(&body, &changes)
    }

    fn encoded(&self, body: &Value, changes: &[Value]) -> Result<Option<Bytes>, &'static str> {
        if changes.is_empty() {
            return Ok(None);
        }
        let bytes = serde_json::to_vec(body).map_err(|_| FAILURE)?;
        if bytes.len() > self.limit {
            return Err(FAILURE);
        }
        self.record(
            "payload_rules_applied",
            json!({"protocol": self.protocol, "changes": changes}),
        );
        Ok(Some(bytes.into()))
    }

    pub(crate) fn rejected(&self, reason: &str) {
        self.record(
            "payload_rules_rejected",
            json!({"protocol": self.protocol, "error": reason}),
        );
    }

    fn record(&self, phase: &str, fields: Value) {
        self.log.record_payload_rules(
            &self.correlation,
            &self.headers,
            &self.claims,
            phase,
            fields,
        );
    }
}
