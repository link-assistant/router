//! `Crater` `ForgeFed` task provider.
//!
//! Crater accepts `OpenAI` Chat Completions requests at the router edge, opens
//! a `ForgeFed` `Ticket` by delivering an `Offer` activity, then polls the
//! returned task URI until the remote ticket is resolved.

use async_trait::async_trait;
use axum::body::Body;
use axum::http::{HeaderMap, HeaderValue, StatusCode};
use axum::response::{IntoResponse, Response};
use bytes::Bytes;
use reqwest::Client;
use serde_json::{Value, json};
use std::sync::Arc;
use std::time::{Duration, Instant};

const ACTIVITY_JSON: &str = "application/activity+json";
const LINKED_DATA_JSON: &str =
    "application/ld+json; profile=\"https://www.w3.org/ns/activitystreams\"";
const DEFAULT_MODEL: &str = "crater-forgefed";

/// Runtime config for the `ForgeFed`-backed crater provider.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CraterConfig {
    /// Remote `ForgeFed` inbox that receives `Offer{Ticket}` activities.
    pub inbox: Option<String>,
    /// Local actor URI used as the `actor` and default `attributedTo`.
    pub actor: String,
    /// Ticket tracker or project URI used as the `Offer.target`.
    pub target: Option<String>,
    /// Delay between task-resolution polls.
    pub poll_interval: Duration,
    /// Maximum time to wait for `isResolved:true`.
    pub poll_timeout: Duration,
}

impl CraterConfig {
    /// Build config from explicit values.
    #[must_use]
    pub fn new(
        inbox: Option<String>,
        actor: &str,
        target: Option<String>,
        poll_interval: Duration,
        poll_timeout: Duration,
    ) -> Self {
        Self {
            inbox: inbox.filter(|value| !value.trim().is_empty()),
            actor: actor.trim_end_matches('/').to_string(),
            target: target.filter(|value| !value.trim().is_empty()),
            poll_interval,
            poll_timeout,
        }
    }

    /// Return the configured inbox or an actionable error.
    pub fn inbox(&self) -> Result<&str, CraterError> {
        self.inbox
            .as_deref()
            .ok_or(CraterError::MissingConfig("CRATER_FORGEFED_INBOX"))
    }

    fn target(&self) -> Result<&str, CraterError> {
        self.target
            .as_deref()
            .or(self.inbox.as_deref())
            .ok_or(CraterError::MissingConfig(
                "CRATER_FORGEFED_TARGET or CRATER_FORGEFED_INBOX",
            ))
    }
}

/// Normalized task data extracted from an `OpenAI` chat request.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CraterTaskRequest {
    pub model: String,
    pub title: String,
    pub content: String,
    pub assignee: Option<String>,
    pub attributed_to: String,
}

/// Resolved task content mapped back to an `OpenAI` response.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CraterTaskResult {
    pub task_uri: String,
    pub model: String,
    pub content: String,
    pub raw: Value,
}

/// Swappable async task backend used by the crater provider.
#[async_trait]
pub trait TaskProvider: Send + Sync {
    /// Submit a task and return the remote task URI from `Accept.result`.
    async fn submit_task(&self, request: &CraterTaskRequest) -> Result<String, CraterError>;

    /// Poll a remote task URI until it resolves.
    async fn poll_task(&self, task_uri: &str) -> Result<Value, CraterError>;

    /// Submit, poll, and extract task output.
    async fn complete_task(
        &self,
        request: CraterTaskRequest,
    ) -> Result<CraterTaskResult, CraterError> {
        let task_uri = self.submit_task(&request).await?;
        let raw = self.poll_task(&task_uri).await?;
        let content = extract_result_content(&raw);
        Ok(CraterTaskResult {
            task_uri,
            model: request.model,
            content,
            raw,
        })
    }
}

/// HTTP `ForgeFed` implementation of [`TaskProvider`].
#[derive(Debug, Clone)]
pub struct ForgeFedTaskProvider {
    client: Client,
    config: CraterConfig,
}

impl ForgeFedTaskProvider {
    /// Create a provider using the shared application HTTP client.
    #[must_use]
    pub const fn new(client: Client, config: CraterConfig) -> Self {
        Self { client, config }
    }
}

#[async_trait]
impl TaskProvider for ForgeFedTaskProvider {
    async fn submit_task(&self, request: &CraterTaskRequest) -> Result<String, CraterError> {
        let inbox = self.config.inbox()?;
        let activity = build_offer_activity(request, &self.config)?;
        let response = self
            .client
            .post(inbox)
            .header("content-type", LINKED_DATA_JSON)
            .header("accept", format!("{ACTIVITY_JSON}, {LINKED_DATA_JSON}"))
            .json(&activity)
            .send()
            .await
            .map_err(|source| CraterError::Upstream(source.to_string()))?;

        let status = response.status();
        let body = response
            .text()
            .await
            .map_err(|source| CraterError::Upstream(source.to_string()))?;
        if !status.is_success() {
            return Err(CraterError::Delivery {
                status: status.as_u16(),
                message: body,
            });
        }
        let accept: Value = serde_json::from_str(&body)
            .map_err(|source| CraterError::InvalidResponse(source.to_string()))?;
        parse_accept_result(&accept)
    }

    async fn poll_task(&self, task_uri: &str) -> Result<Value, CraterError> {
        let start = Instant::now();
        loop {
            let response = self
                .client
                .get(task_uri)
                .header("accept", format!("{ACTIVITY_JSON}, {LINKED_DATA_JSON}"))
                .send()
                .await
                .map_err(|source| CraterError::Upstream(source.to_string()))?;
            let status = response.status();
            let body = response
                .text()
                .await
                .map_err(|source| CraterError::Upstream(source.to_string()))?;
            if !status.is_success() {
                return Err(CraterError::Delivery {
                    status: status.as_u16(),
                    message: body,
                });
            }
            let task: Value = serde_json::from_str(&body)
                .map_err(|source| CraterError::InvalidResponse(source.to_string()))?;
            if is_resolved(&task) {
                return Ok(task);
            }
            if start.elapsed() >= self.config.poll_timeout {
                return Err(CraterError::Timeout {
                    task_uri: task_uri.to_string(),
                    timeout: self.config.poll_timeout,
                });
            }
            tokio::time::sleep(self.config.poll_interval).await;
        }
    }
}

/// Errors returned by the crater provider.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum CraterError {
    MissingConfig(&'static str),
    InvalidRequest(String),
    InvalidResponse(String),
    Delivery { status: u16, message: String },
    Upstream(String),
    Timeout { task_uri: String, timeout: Duration },
}

impl CraterError {
    /// HTTP status for this provider error.
    #[must_use]
    pub const fn status_code(&self) -> StatusCode {
        match self {
            Self::MissingConfig(_) | Self::InvalidResponse(_) | Self::Upstream(_) => {
                StatusCode::BAD_GATEWAY
            }
            Self::InvalidRequest(_) => StatusCode::BAD_REQUEST,
            Self::Delivery { .. } => StatusCode::BAD_GATEWAY,
            Self::Timeout { .. } => StatusCode::GATEWAY_TIMEOUT,
        }
    }
}

impl std::fmt::Display for CraterError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::MissingConfig(name) => write!(f, "{name} is required for crater provider"),
            Self::InvalidRequest(message) | Self::InvalidResponse(message) => {
                write!(f, "{message}")
            }
            Self::Delivery { status, message } => {
                if message.is_empty() {
                    write!(f, "ForgeFed delivery failed with HTTP {status}")
                } else {
                    write!(f, "ForgeFed delivery failed with HTTP {status}: {message}")
                }
            }
            Self::Upstream(message) => write!(f, "ForgeFed upstream request failed: {message}"),
            Self::Timeout { task_uri, timeout } => write!(
                f,
                "task {task_uri} did not resolve within {} seconds",
                timeout.as_secs()
            ),
        }
    }
}

impl std::error::Error for CraterError {}

/// Convert an `OpenAI` chat completion JSON body to a `ForgeFed` task request.
pub fn normalize_chat_request(
    body: &Value,
    default_actor: &str,
) -> Result<CraterTaskRequest, CraterError> {
    let model = body
        .get("model")
        .and_then(Value::as_str)
        .filter(|value| !value.trim().is_empty())
        .ok_or_else(|| CraterError::InvalidRequest("model is required".to_string()))?
        .to_string();
    let messages = body
        .get("messages")
        .and_then(Value::as_array)
        .ok_or_else(|| CraterError::InvalidRequest("messages array is required".to_string()))?;
    let metadata = body.get("metadata").and_then(Value::as_object);
    let mut lines = Vec::new();
    let mut first_user = None;
    for message in messages {
        let role = message
            .get("role")
            .and_then(Value::as_str)
            .unwrap_or("user");
        let text = extract_openai_content(message.get("content"));
        if text.is_empty() {
            continue;
        }
        if role == "user" && first_user.is_none() {
            first_user = Some(text.clone());
        }
        lines.push(format!("{role}: {text}"));
    }

    let title = metadata
        .and_then(|map| map.get("title"))
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map_or_else(
            || {
                first_user
                    .as_deref()
                    .unwrap_or("OpenAI chat request")
                    .lines()
                    .next()
                    .unwrap_or("OpenAI chat request")
                    .to_string()
            },
            ToString::to_string,
        );
    let assignee = metadata
        .and_then(|map| map.get("assignee"))
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(ToString::to_string);
    let attributed_to = metadata
        .and_then(|map| {
            map.get("attributedTo")
                .or_else(|| map.get("attributed_to"))
                .and_then(Value::as_str)
        })
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .unwrap_or(default_actor)
        .to_string();

    Ok(CraterTaskRequest {
        model,
        title,
        content: lines.join("\n"),
        assignee,
        attributed_to,
    })
}

/// Build a `ForgeFed` `Offer` activity containing a `Ticket`.
pub fn build_offer_activity(
    request: &CraterTaskRequest,
    config: &CraterConfig,
) -> Result<Value, CraterError> {
    let suffix = uuid::Uuid::new_v4();
    let target = config.target()?;
    let mut ticket = json!({
        "type": "Ticket",
        "context": target,
        "attributedTo": request.attributed_to,
        "summary": request.title,
        "content": request.content,
        "mediaType": "text/plain",
        "source": {
            "mediaType": "text/plain",
            "content": request.content,
        },
        "model": request.model,
    });
    if let Some(assignee) = request.assignee.as_deref() {
        ticket["assignee"] = Value::String(assignee.to_string());
    }

    Ok(json!({
        "@context": [
            "https://www.w3.org/ns/activitystreams",
            "https://forgefed.org/ns"
        ],
        "id": format!("{}/activities/offer-{suffix}", config.actor),
        "type": "Offer",
        "actor": config.actor,
        "to": [target],
        "target": target,
        "object": ticket,
    }))
}

/// Extract a task URI from an `ActivityPub` `Accept.result`.
pub fn parse_accept_result(accept: &Value) -> Result<String, CraterError> {
    if accept.get("type").and_then(Value::as_str) == Some("Reject") {
        return Err(CraterError::InvalidResponse(
            "ForgeFed inbox rejected the Offer".to_string(),
        ));
    }
    let Some(result) = accept.get("result") else {
        return Err(CraterError::InvalidResponse(
            "ForgeFed Accept response missing result".to_string(),
        ));
    };
    match result {
        Value::String(uri) if !uri.is_empty() => Ok(uri.clone()),
        Value::Object(map) => map
            .get("id")
            .and_then(Value::as_str)
            .filter(|uri| !uri.is_empty())
            .map(ToString::to_string)
            .ok_or_else(|| {
                CraterError::InvalidResponse("ForgeFed Accept.result object missing id".to_string())
            }),
        _ => Err(CraterError::InvalidResponse(
            "ForgeFed Accept.result must be a URI or object with id".to_string(),
        )),
    }
}

/// Return `OpenAI`-shaped model data for crater.
#[must_use]
pub fn list_models() -> Value {
    json!({
        "object": "list",
        "data": [{
            "id": DEFAULT_MODEL,
            "object": "model",
            "owned_by": "crater"
        }]
    })
}

/// Build a non-streaming `OpenAI` Chat Completions response.
#[must_use]
pub fn chat_completion_response(result: &CraterTaskResult) -> Value {
    json!({
        "id": format!("chatcmpl-{}", uuid::Uuid::new_v4()),
        "object": "chat.completion",
        "created": chrono::Utc::now().timestamp(),
        "model": result.model,
        "choices": [{
            "index": 0,
            "message": {
                "role": "assistant",
                "content": result.content,
            },
            "finish_reason": "stop"
        }],
        "usage": usage_from_result(&result.raw),
    })
}

/// Build `OpenAI` Chat Completions SSE frames for a resolved crater task.
#[must_use]
pub fn chat_completion_stream_frames(model: &str, content: &str) -> Vec<String> {
    let id = format!("chatcmpl-{}", uuid::Uuid::new_v4());
    let created = chrono::Utc::now().timestamp();
    vec![
        sse_frame(&json!({
            "id": id,
            "object": "chat.completion.chunk",
            "created": created,
            "model": model,
            "choices": [{
                "index": 0,
                "delta": {"role": "assistant"},
                "finish_reason": null
            }]
        })),
        sse_frame(&json!({
            "id": id,
            "object": "chat.completion.chunk",
            "created": created,
            "model": model,
            "choices": [{
                "index": 0,
                "delta": {"content": content},
                "finish_reason": null
            }]
        })),
        sse_frame(&json!({
            "id": id,
            "object": "chat.completion.chunk",
            "created": created,
            "model": model,
            "choices": [{
                "index": 0,
                "delta": {},
                "finish_reason": "stop"
            }]
        })),
        "data: [DONE]\n\n".to_string(),
    ]
}

/// Convert a crater error into an `OpenAI`-shaped JSON response.
#[must_use]
pub fn provider_error(error: &CraterError) -> Response {
    (
        error.status_code(),
        axum::Json(json!({
            "error": {
                "type": "forgefed_task_error",
                "message": error.to_string()
            }
        })),
    )
        .into_response()
}

/// Convert an async stream error into an `OpenAI` SSE error frame.
#[must_use]
pub fn error_stream_frame(error: &CraterError) -> String {
    sse_frame(&json!({
        "error": {
            "type": "forgefed_task_error",
            "message": error.to_string()
        }
    }))
}

/// Build an SSE response from a stream body.
#[must_use]
pub fn sse_response(body: Body) -> Response {
    let mut response = Response::new(body);
    *response.status_mut() = StatusCode::OK;
    response.headers_mut().insert(
        "content-type",
        HeaderValue::from_static("text/event-stream; charset=utf-8"),
    );
    response
}

/// Forward an `OpenAI` Chat Completions request through the crater provider.
pub async fn forward_chat_completions(
    state: &crate::proxy::AppState,
    headers: &HeaderMap,
    body: Value,
    stream_requested: bool,
) -> Response {
    let path = "/v1/chat/completions";
    if let Some(resp) = crate::proxy::maybe_mpp_challenge(state, headers, path) {
        return resp;
    }

    let Some(token) = crate::proxy::extract_client_token(headers) else {
        return crate::proxy::error_response(
            StatusCode::UNAUTHORIZED,
            "authentication_error",
            "Missing Authorization Bearer token or x-api-key",
        );
    };
    let claims = match state.token_manager.validate_token(token) {
        Ok(claims) => claims,
        Err(e) => {
            let status = match &e {
                crate::token::TokenError::Revoked => StatusCode::FORBIDDEN,
                _ => StatusCode::UNAUTHORIZED,
            };
            return crate::proxy::error_response(status, "authentication_error", &format!("{e}"));
        }
    };
    if let Err(e) = state.token_manager.enforce_request_budget(&claims.sub) {
        return crate::proxy::token_budget_error_response(&e);
    }
    crate::audit::record_authorised_request(
        state,
        &claims,
        crate::metrics::Surface::OpenAIChat,
        path,
        Some(&body),
    );

    let Some(provider) = state.crater.as_ref().map(Arc::clone) else {
        return provider_error(&CraterError::MissingConfig("CRATER_FORGEFED_INBOX"));
    };
    let default_actor = format!(
        "{}/actor/code",
        state.activitypub_actor_base_url.trim_end_matches('/')
    );
    let request = match normalize_chat_request(&body, &default_actor) {
        Ok(request) => request,
        Err(error) => return provider_error(&error),
    };

    if stream_requested {
        return stream_chat_completion(provider, request, Arc::clone(&state.metrics));
    }

    match provider.complete_task(request).await {
        Ok(result) => {
            state
                .metrics
                .record_request(crate::metrics::Surface::OpenAIChat, 200, None);
            (
                StatusCode::OK,
                axum::Json(chat_completion_response(&result)),
            )
                .into_response()
        }
        Err(error) => {
            state.metrics.record_request(
                crate::metrics::Surface::OpenAIChat,
                error.status_code().as_u16(),
                None,
            );
            provider_error(&error)
        }
    }
}

fn stream_chat_completion(
    provider: Arc<dyn TaskProvider>,
    request: CraterTaskRequest,
    metrics: Arc<crate::metrics::Metrics>,
) -> Response {
    let (tx, rx) = tokio::sync::mpsc::channel::<Result<Bytes, std::io::Error>>(4);
    tokio::spawn(async move {
        let model = request.model.clone();
        let frames = match provider.complete_task(request).await {
            Ok(result) => {
                metrics.record_request(crate::metrics::Surface::OpenAIChat, 200, None);
                chat_completion_stream_frames(&model, &result.content)
            }
            Err(error) => {
                metrics.record_request(
                    crate::metrics::Surface::OpenAIChat,
                    error.status_code().as_u16(),
                    None,
                );
                vec![error_stream_frame(&error), "data: [DONE]\n\n".to_string()]
            }
        };
        for frame in frames {
            if tx.send(Ok(Bytes::from(frame))).await.is_err() {
                break;
            }
        }
    });
    let stream = futures_util::stream::unfold(rx, |mut rx| async {
        rx.recv().await.map(|item| (item, rx))
    });
    sse_response(Body::from_stream(stream))
}

fn extract_openai_content(node: Option<&Value>) -> String {
    match node {
        Some(Value::String(value)) => value.trim().to_string(),
        Some(Value::Array(parts)) => parts
            .iter()
            .filter_map(|part| {
                part.get("text")
                    .or_else(|| part.get("content"))
                    .and_then(Value::as_str)
            })
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .collect::<Vec<_>>()
            .join("\n"),
        Some(other) => other.to_string(),
        None => String::new(),
    }
}

fn is_resolved(task: &Value) -> bool {
    task.get("isResolved")
        .and_then(Value::as_bool)
        .unwrap_or(false)
}

fn extract_result_content(task: &Value) -> String {
    for path in [
        &["result", "content"][..],
        &["result", "output_text"][..],
        &["output_text"][..],
        &["content"][..],
        &["summary"][..],
        &["name"][..],
    ] {
        if let Some(value) = get_path(task, path).and_then(Value::as_str) {
            if !value.trim().is_empty() {
                return value.to_string();
            }
        }
    }
    task.get("choices")
        .and_then(Value::as_array)
        .and_then(|choices| choices.first())
        .and_then(|choice| choice.get("message"))
        .and_then(|message| message.get("content"))
        .and_then(Value::as_str)
        .map_or_else(|| task.to_string(), ToString::to_string)
}

fn usage_from_result(task: &Value) -> Value {
    task.get("usage").cloned().unwrap_or_else(|| {
        json!({
            "prompt_tokens": 0,
            "completion_tokens": 0,
            "total_tokens": 0
        })
    })
}

fn get_path<'a>(value: &'a Value, path: &[&str]) -> Option<&'a Value> {
    path.iter().try_fold(value, |current, key| current.get(key))
}

fn sse_frame(value: &Value) -> String {
    format!("data: {value}\n\n")
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::{Arc, Mutex};

    fn config() -> CraterConfig {
        CraterConfig::new(
            Some("https://tracker.example/inbox".to_string()),
            "https://router.example/actor/code",
            Some("https://tracker.example/projects/demo".to_string()),
            Duration::from_millis(1),
            Duration::from_millis(50),
        )
    }

    #[test]
    fn normalizes_chat_request_into_ticket_fields() {
        let body = json!({
            "model": "gpt-4o-mini",
            "metadata": {
                "title": "Implement crater provider",
                "assignee": "https://tracker.example/actors/dev",
                "attributedTo": "https://tracker.example/actors/triage"
            },
            "messages": [
                {"role": "system", "content": "be concise"},
                {"role": "user", "content": [
                    {"type": "text", "text": "Build the ForgeFed adapter"},
                    {"type": "text", "text": "Return OpenAI JSON"}
                ]}
            ]
        });

        let request = normalize_chat_request(&body, "https://router.example/actor/code")
            .expect("request should normalize");

        assert_eq!(request.model, "gpt-4o-mini");
        assert_eq!(request.title, "Implement crater provider");
        assert_eq!(
            request.assignee.as_deref(),
            Some("https://tracker.example/actors/dev")
        );
        assert_eq!(
            request.attributed_to,
            "https://tracker.example/actors/triage"
        );
        assert!(request.content.contains("system: be concise"));
        assert!(request.content.contains("user: Build the ForgeFed adapter"));
        assert!(request.content.contains("Return OpenAI JSON"));
    }

    #[test]
    fn builds_forgefed_offer_with_ticket_without_ticket_id() {
        let request = CraterTaskRequest {
            model: "gpt-4o-mini".into(),
            title: "Issue title".into(),
            content: "Issue content".into(),
            assignee: Some("https://tracker.example/actors/dev".into()),
            attributed_to: "https://router.example/actor/code".into(),
        };

        let activity = build_offer_activity(&request, &config()).expect("activity");
        let ticket = &activity["object"];

        assert_eq!(activity["type"], "Offer");
        assert_eq!(activity["actor"], "https://router.example/actor/code");
        assert_eq!(activity["target"], "https://tracker.example/projects/demo");
        assert_eq!(activity["to"][0], "https://tracker.example/projects/demo");
        assert_eq!(ticket["type"], "Ticket");
        assert_eq!(ticket["summary"], "Issue title");
        assert_eq!(ticket["content"], "Issue content");
        assert_eq!(ticket["attributedTo"], "https://router.example/actor/code");
        assert_eq!(ticket["assignee"], "https://tracker.example/actors/dev");
        assert!(ticket.get("id").is_none());
    }

    #[test]
    fn parses_accept_result_uri_or_object_id() {
        assert_eq!(
            parse_accept_result(
                &json!({"type": "Accept", "result": "https://tracker.example/tasks/1"})
            )
            .expect("uri result"),
            "https://tracker.example/tasks/1"
        );
        assert_eq!(
            parse_accept_result(
                &json!({"type": "Accept", "result": {"id": "https://tracker.example/tasks/2"}})
            )
            .expect("object result"),
            "https://tracker.example/tasks/2"
        );
    }

    #[test]
    fn maps_resolved_task_to_openai_response() {
        let result = CraterTaskResult {
            task_uri: "https://tracker.example/tasks/1".into(),
            model: "gpt-4o-mini".into(),
            content: "Task result".into(),
            raw: json!({"isResolved": true}),
        };

        let response = chat_completion_response(&result);

        assert_eq!(response["object"], "chat.completion");
        assert_eq!(response["model"], "gpt-4o-mini");
        assert_eq!(response["choices"][0]["message"]["role"], "assistant");
        assert_eq!(response["choices"][0]["message"]["content"], "Task result");
        assert_eq!(response["choices"][0]["finish_reason"], "stop");
    }

    #[tokio::test]
    async fn task_provider_trait_submits_and_polls() {
        #[derive(Default)]
        struct StubProvider {
            submitted: Arc<Mutex<Vec<String>>>,
        }

        #[async_trait]
        impl TaskProvider for StubProvider {
            async fn submit_task(
                &self,
                request: &CraterTaskRequest,
            ) -> Result<String, CraterError> {
                self.submitted
                    .lock()
                    .expect("lock")
                    .push(request.title.clone());
                Ok("https://tracker.example/tasks/1".into())
            }

            async fn poll_task(&self, task_uri: &str) -> Result<Value, CraterError> {
                Ok(json!({
                    "id": task_uri,
                    "isResolved": true,
                    "result": {"content": "resolved output"}
                }))
            }
        }

        let provider = StubProvider::default();
        let request = CraterTaskRequest {
            model: "gpt-4o-mini".into(),
            title: "Task title".into(),
            content: "Task content".into(),
            assignee: None,
            attributed_to: "https://router.example/actor/code".into(),
        };

        let result = provider
            .complete_task(request)
            .await
            .expect("task should complete");

        assert_eq!(result.task_uri, "https://tracker.example/tasks/1");
        assert_eq!(result.content, "resolved output");
        assert_eq!(
            provider.submitted.lock().expect("lock").as_slice(),
            &["Task title".to_string()]
        );
    }
}
