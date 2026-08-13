//! Transparent API proxy for forwarding requests to upstream APIs.
//!
//! Supports three API formats required by the Claude Code LLM Gateway spec:
//! - Anthropic Messages (`/v1/messages`, `/v1/messages/count_tokens`)
//! - Bedrock `InvokeModel` (`/invoke`, `/invoke-with-response-stream`)
//! - Vertex AI rawPredict (`:rawPredict`, `:streamRawPredict`)
//!
//! Handles token swap (custom -> OAuth), header forwarding, and
//! pass-through of streaming (SSE) responses.

// Several handlers are `async fn` purely to match axum's handler signature
// even when their body is currently synchronous; they may grow await points
// later, and removing `async` would force a uniform sync signature here.
#![allow(clippy::unused_async)]

use axum::body::Body;
use axum::extract::{Query, Request, State};
use axum::http::{HeaderMap, HeaderValue, StatusCode};
use axum::response::{IntoResponse, Response};
use futures_util::StreamExt;
use log_lazy::LogLazy;
use std::collections::{BTreeMap, HashSet};

use crate::accounts::RoutingContext;
pub use crate::app_state::AppState;
use crate::config::UpstreamProvider;
pub use crate::model_routing::models as openai_models;
pub use crate::monitoring_api::{accounts_endpoint, metrics_endpoint, usage_endpoint};
use crate::openai;
pub(crate) use crate::request_routing::{request_routing_context, retry_after_duration};
use crate::responses;
use crate::subscription::SubscriptionProvider;

/// The legacy API path prefix used to route requests through the proxy.
pub const API_PREFIX: &str = "/api/latest/anthropic/";

/// Headers that Claude Code LLM Gateway spec requires to be forwarded.
pub const REQUIRED_FORWARD_HEADERS: &[&str] = &[
    "anthropic-beta",
    "anthropic-version",
    "x-claude-code-session-id",
];

/// Default Anthropic API version injected when a client omits the
/// `anthropic-version` header (the Messages API requires it).
pub const DEFAULT_ANTHROPIC_VERSION: &str = "2023-06-01";

/// Anthropic `anthropic-beta` flag for Claude MAX OAuth access tokens.
///
/// Claude MAX OAuth access tokens are only accepted for inference on the
/// Messages API when this beta flag is present. Standard Anthropic SDK
/// clients do not send it, so the proxy injects it when substituting the
/// OAuth credential — otherwise upstream rejects the request.
pub const OAUTH_BETA_FLAG: &str = "oauth-2025-04-20";

/// Merge [`OAUTH_BETA_FLAG`] into an optional existing `anthropic-beta` header
/// value without creating duplicates.
#[must_use]
pub fn merge_oauth_beta(existing: Option<&str>) -> String {
    match existing {
        Some(v) if v.split(',').map(str::trim).any(|f| f == OAUTH_BETA_FLAG) => v.to_string(),
        Some(v) if !v.trim().is_empty() => format!("{v},{OAUTH_BETA_FLAG}"),
        _ => OAUTH_BETA_FLAG.to_string(),
    }
}

/// Hop-by-hop headers that must not be forwarded.
const HOP_BY_HOP_HEADERS: &[&str] = &[
    "host",
    "connection",
    "keep-alive",
    "proxy-authenticate",
    "proxy-authorization",
    "te",
    "trailer",
    "transfer-encoding",
    "upgrade",
];

/// Upstream response fields that can contain credentials or establish client state.
const RESPONSE_CREDENTIAL_HEADERS: &[&str] = &[
    "authorization",
    "proxy-authorization",
    "set-cookie",
    "set-cookie2",
    "x-api-key",
];

/// Select end-to-end upstream response headers that are safe to relay to a client.
///
/// This policy is shared by Claude and subscription provider paths so vendor
/// quota fields and request IDs are preserved consistently. Besides standard
/// hop-by-hop fields, it removes fields named by `Connection`, upstream
/// credentials, and `Content-Length` (response bodies may be translated).
pub(crate) fn relay_response_headers(headers: &HeaderMap) -> HeaderMap {
    let connection_headers: HashSet<String> = headers
        .get_all("connection")
        .iter()
        .filter_map(|value| value.to_str().ok())
        .flat_map(|value| value.split(','))
        .map(|name| name.trim().to_ascii_lowercase())
        .filter(|name| !name.is_empty())
        .collect();
    let mut relayed = HeaderMap::new();

    for (name, value) in headers {
        let name_lower = name.as_str();
        if HOP_BY_HOP_HEADERS.contains(&name_lower)
            || RESPONSE_CREDENTIAL_HEADERS.contains(&name_lower)
            || name_lower == "content-length"
            || connection_headers.contains(name_lower)
        {
            continue;
        }
        relayed.append(name.clone(), value.clone());
    }

    relayed
}

/// Health check endpoint.
#[allow(clippy::unused_async)]
pub async fn health() -> impl IntoResponse {
    (StatusCode::OK, "ok")
}

/// Decide whether a request may touch the administrative endpoints.
///
/// Thin HTTP wrapper over [`crate::admin_auth::admin_access_granted`], which
/// documents and tests the rule itself.
pub(crate) fn is_admin_authorised(state: &AppState, headers: &HeaderMap) -> bool {
    let provided = extract_bearer_token(headers);
    // A credential claimed through the admin UI (see [`crate::admin`]) is an
    // admin credential everywhere, not only on the admin port.
    if provided.is_some_and(|token| state.admin.verify(token)) {
        return true;
    }
    crate::admin_auth::admin_access_granted(
        &state.token_manager,
        provided,
        state.admin_key.as_deref(),
        state.allow_anonymous_admin,
    )
}

/// Bearer credential presented for an administrative request, if any.
pub(crate) fn extract_admin_bearer(headers: &HeaderMap) -> Option<&str> {
    extract_bearer_token(headers)
}

fn extract_bearer_token(headers: &HeaderMap) -> Option<&str> {
    headers
        .get("authorization")
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.strip_prefix("Bearer "))
}

pub(crate) fn extract_client_token(headers: &HeaderMap) -> Option<&str> {
    extract_bearer_token(headers).or_else(|| {
        headers
            .get("x-api-key")
            .and_then(|value| value.to_str().ok())
            .filter(|value| !value.is_empty())
    })
}

/// Validate the caller credential without exposing token parser internals.
pub(crate) fn authenticate_client(
    state: &AppState,
    headers: &HeaderMap,
) -> Result<crate::token::TokenClaims, Box<Response>> {
    let Some(token) = extract_client_token(headers) else {
        state.logger.debug(|| "Missing Authorization header");
        return Err(Box::new(error_response(
            StatusCode::UNAUTHORIZED,
            "authentication_error",
            "Missing Authorization Bearer token or x-api-key",
        )));
    };
    state.token_manager.validate_token(token).map_err(|error| {
        let status = if matches!(error, crate::token::TokenError::Revoked) {
            StatusCode::FORBIDDEN
        } else {
            StatusCode::UNAUTHORIZED
        };
        state
            .logger
            .debug(|| format!("Token validation failed: {error}"));
        Box::new(error_response(
            status,
            "authentication_error",
            error.client_message(),
        ))
    })
}

/// Proxy handler for upstream API forwarding.
///
/// Catches all requests, validates the custom token, swaps it for OAuth
/// credentials, and forwards the request upstream -- preserving SSE streaming.
///
/// Supports all three Claude Code LLM Gateway API formats:
/// - Anthropic Messages: `/v1/messages`, `/v1/messages/count_tokens`
/// - Bedrock `InvokeModel`: `/invoke`, `/invoke-with-response-stream`
/// - Vertex rawPredict: paths ending in `:rawPredict`, `:streamRawPredict`
/// - Legacy: `/api/latest/anthropic/*`
pub async fn proxy_handler(State(state): State<AppState>, req: Request) -> Response {
    let path = req.uri().path().to_string();
    let method = req.method().clone();
    let incoming_headers = req.headers().clone();

    if state.upstream_provider == UpstreamProvider::Auto {
        if let Err(response) = authenticate_client(&state, &incoming_headers) {
            return *response;
        }
        let (routed, request) =
            match crate::model_routing::route_anthropic_request(&state, req).await {
                Ok(routed) => routed,
                Err(response) => return response,
            };
        return Box::pin(proxy_handler(State(routed), request)).await;
    }

    state.logger.verbose(|| format!("Incoming {method} {path}"));

    // Resolve the upstream path based on which API format the request matches
    let upstream_path = resolve_upstream_path(&path);

    state
        .logger
        .debug(|| format!("Resolved upstream path: {upstream_path}"));

    // Build upstream URL
    let upstream_url = format!(
        "{}{}",
        state.upstream_base_url.trim_end_matches('/'),
        upstream_path
    );

    let upstream_url = if let Some(query) = req.uri().query() {
        format!("{upstream_url}?{query}")
    } else {
        upstream_url
    };

    // Log session tracking header if present
    if let Some(session_id) = incoming_headers.get("x-claude-code-session-id") {
        state
            .logger
            .verbose(|| format!("Session: {}", session_id.to_str().unwrap_or("<invalid>")));
    }

    // Anthropic-dialect requests aimed at a non-Anthropic upstream are handed
    // to the bridge, which translates both directions and delegates to the
    // provider's own forwarder (that forwarder owns token validation, budget
    // enforcement, and account selection, so none of it is done twice here).
    // Every other provider keeps the pass-through path below unchanged.
    if crate::anthropic_bridge::is_bridged(state.upstream_provider) {
        let body_bytes = match axum::body::to_bytes(req.into_body(), 10 * 1024 * 1024).await {
            Ok(bytes) => bytes,
            Err(e) => {
                return error_response(
                    StatusCode::BAD_REQUEST,
                    "invalid_request_error",
                    &format!("Failed to read request body: {e}"),
                );
            }
        };
        let body = serde_json::from_slice(&body_bytes).unwrap_or(serde_json::Value::Null);
        return crate::anthropic_bridge::handle_anthropic_surface(
            &state,
            &incoming_headers,
            &path,
            body,
        )
        .await;
    }

    let claims = match authenticate_client(&state, &incoming_headers) {
        Ok(claims) => claims,
        Err(response) => return *response,
    };

    // Enforce the per-token request budget (max_requests). This is what lets
    // an operator cap how much of the shared subscription a single task can
    // consume. Tokens issued without a cap are always permitted.
    if let Err(e) = state.token_manager.enforce_request_budget(&claims.sub) {
        state
            .logger
            .debug(|| format!("Token budget check failed: {e}"));
        return error_response(
            StatusCode::TOO_MANY_REQUESTS,
            "rate_limit_error",
            &format!("{e}"),
        );
    }

    // Read the body before account selection so the router gets a copy of
    // stable request metadata and can preserve conversation affinity.
    let mut body_bytes = match axum::body::to_bytes(req.into_body(), 10 * 1024 * 1024).await {
        Ok(bytes) => bytes,
        Err(e) => {
            return error_response(
                StatusCode::BAD_REQUEST,
                "invalid_request_error",
                &format!("Failed to read request body: {e}"),
            );
        }
    };
    let routing_body = serde_json::from_slice(&body_bytes).unwrap_or(serde_json::Value::Null);
    crate::audit::record_authorised_request(
        &state,
        &claims,
        crate::metrics::Surface::Anthropic,
        &path,
        Some(&routing_body),
    );
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
    let routing_context = request_routing_context(&incoming_headers, &routing_body, pinned_account);

    // Get the real OAuth token (multi-account aware).
    let (oauth_token, selected_account) =
        match resolve_upstream_credentials(&state, &routing_context).await {
            Ok(pair) => pair,
            Err(e) => {
                tracing::error!("Failed to resolve upstream credentials: {e}");
                return error_response(
                    StatusCode::BAD_GATEWAY,
                    "api_error",
                    "Upstream authentication unavailable",
                );
            }
        };

    // Same requirement as above: a client that is not Claude Code would be rejected
    // by the upstream with a misleading 429. Idempotent for Claude Code itself.
    let mut upstream_body = routing_body.clone();
    openai::reconcile_subscription_parameters(SubscriptionProvider::Claude, &mut upstream_body);
    if upstream_body != routing_body {
        body_bytes = serde_json::to_vec(&upstream_body)
            .map(bytes::Bytes::from)
            .unwrap_or(body_bytes);
    }
    let body_bytes = if crate::claude_identity::is_oauth_credential(&oauth_token) {
        crate::claude_identity::ensure_claude_code_system_bytes(&upstream_body, body_bytes)
    } else {
        body_bytes
    };

    // Build upstream headers
    let upstream_headers = build_upstream_headers(&incoming_headers, &oauth_token, &state.logger);

    state.logger.verbose(|| {
        format!(
            "Forwarding {method} {upstream_url} ({} bytes)",
            body_bytes.len()
        )
    });

    // Forward request to upstream
    let upstream_req = state
        .client
        .request(method, &upstream_url)
        .headers(upstream_headers)
        .body(body_bytes);

    let correlation_id = crate::request_log::correlation_id(&incoming_headers);
    let upstream_resp = match state
        .request_log
        .send_upstream(&correlation_id, &state.client, upstream_req)
        .await
    {
        Ok(resp) => resp,
        Err(e) => {
            tracing::error!("Upstream request failed: {e}");
            return error_response(
                StatusCode::BAD_GATEWAY,
                "api_error",
                &format!("Upstream request failed: {e}"),
            );
        }
    };

    let status = StatusCode::from_u16(upstream_resp.status().as_u16())
        .unwrap_or(StatusCode::INTERNAL_SERVER_ERROR);
    let retry_after = retry_after_duration(upstream_resp.headers());
    crate::request_routing::record_claude_evidence(&state, status.as_u16());
    state
        .logger
        .verbose(|| format!("Upstream responded: {status}"));

    // Record metrics; flag account as cooling-down on 429/insufficient_quota.
    state.metrics.record_request(
        crate::metrics::Surface::Anthropic,
        status.as_u16(),
        selected_account.as_deref(),
    );
    if status.as_u16() == 429 {
        if let (Some(router), Some(name)) =
            (state.account_router.as_ref(), selected_account.as_deref())
        {
            router.report_failure_with_retry_after(name, "upstream returned 429", retry_after);
        }
    }

    // Build the response -- stream it back to preserve SSE
    let response_headers = relay_response_headers(upstream_resp.headers());

    // Stream the response body
    let response_log = std::sync::Arc::clone(&state.request_log);
    let stream = upstream_resp.bytes_stream().map(move |chunk| {
        if let Ok(bytes) = &chunk {
            response_log.record_upstream_body(&correlation_id, bytes);
        }
        chunk.map_err(std::io::Error::other)
    });

    let body = Body::from_stream(stream);

    let mut response = Response::new(body);
    *response.status_mut() = status;
    *response.headers_mut() = response_headers;

    response
}

/// Resolve the upstream path from the incoming request path.
///
/// Maps all supported API format paths to the correct upstream path:
/// - `/v1/messages` -> `/v1/messages` (Anthropic Messages)
/// - `/v1/messages/count_tokens` -> `/v1/messages/count_tokens` (Anthropic Messages)
/// - `/invoke` -> `/invoke` (Bedrock)
/// - `/invoke-with-response-stream` -> `/invoke-with-response-stream` (Bedrock)
/// - Paths ending in `:rawPredict` or `:streamRawPredict` -> pass through (Vertex)
/// - `/api/latest/anthropic/*` -> `/*` (legacy)
#[must_use]
pub fn resolve_upstream_path(path: &str) -> String {
    if let Some(rest) = path.strip_prefix("/api/anthropic") {
        return rest.to_string();
    }
    // Legacy prefix: strip and forward
    if let Some(rest) = path.strip_prefix("/api/latest/anthropic") {
        return rest.to_string();
    }

    // All other paths (Anthropic /v1/*, Bedrock /invoke*, Vertex *:rawPredict)
    // are forwarded as-is to the upstream
    path.to_string()
}

/// Build the upstream request headers.
///
/// Copies all headers except hop-by-hop and authorization, then sets the
/// real OAuth authorization. Ensures required LLM Gateway headers
/// (`anthropic-beta`, `anthropic-version`, `x-claude-code-session-id`)
/// are always forwarded.
pub(crate) fn build_upstream_headers(
    incoming: &HeaderMap,
    oauth_token: &str,
    logger: &LogLazy,
) -> HeaderMap {
    let mut headers = HeaderMap::new();

    for (name, value) in incoming {
        let name_lower = name.as_str().to_lowercase();
        // `content-length` is dropped on purpose: the forwarded body may differ
        // in length from the client's (the Claude Code identity block is
        // prepended for OAuth upstreams), and the HTTP client recomputes it.
        if matches!(
            name_lower.as_str(),
            "authorization" | "x-api-key" | "content-length"
        ) || HOP_BY_HOP_HEADERS.contains(&name_lower.as_str())
        {
            continue;
        }
        headers.insert(name.clone(), value.clone());
    }

    // Set the real OAuth authorization
    if let Ok(auth_val) = HeaderValue::from_str(&format!("Bearer {oauth_token}")) {
        headers.insert("authorization", auth_val);
    }

    // Ensure the headers Claude MAX OAuth requires are present even when the
    // client (e.g. a plain Anthropic SDK) omits them. This is what makes the
    // proxy transparent against an OAuth-backed upstream.
    if !headers.contains_key("anthropic-version") {
        headers.insert(
            "anthropic-version",
            HeaderValue::from_static(DEFAULT_ANTHROPIC_VERSION),
        );
    }
    let existing_beta = headers
        .get("anthropic-beta")
        .and_then(|v| v.to_str().ok())
        .map(String::from);
    if let Ok(beta_val) = HeaderValue::from_str(&merge_oauth_beta(existing_beta.as_deref())) {
        headers.insert("anthropic-beta", beta_val);
    }

    // Log required headers for observability
    for &header_name in REQUIRED_FORWARD_HEADERS {
        if let Some(val) = headers.get(header_name) {
            logger.trace(|| {
                format!(
                    "Forwarding {header_name}: {}",
                    val.to_str().unwrap_or("<non-utf8>")
                )
            });
        }
    }

    headers
}

/// Resolve the OAuth token and the name of the account that produced it.
///
/// When `state.account_router` is set we delegate to the multi-account
/// router; otherwise we fall back to the single-account legacy provider.
///
/// Either way an expired access token is refreshed in memory via
/// `state.subscription_cache` — the vendor credential file is never written
/// back to, so a read-only `CLAUDE_CODE_HOME` mount survives expiry without a
/// Claude CLI in the image.
async fn resolve_upstream_credentials(
    state: &AppState,
    context: &RoutingContext,
) -> Result<(String, Option<String>), Box<dyn std::error::Error + Send + Sync>> {
    if let Some(router) = state.account_router.as_ref() {
        let sel = router.select_subscription(context)?;
        let now_ms = chrono::Utc::now().timestamp_millis();
        let token = state
            .subscription_cache
            .get_fresh_for(
                &state.client,
                router.provider(),
                &sel.name,
                sel.token,
                now_ms,
            )
            .await;
        return Ok((token.access_token, Some(sel.name)));
    }
    let token = state
        .oauth_provider
        .get_fresh_token(&state.client, &state.subscription_cache)
        .await?;
    Ok((token, None))
}

/// `POST /v1/chat/completions` — `OpenAI` Chat Completions.
///
/// Translates to Anthropic Messages, forwards via the same OAuth-substituting
/// pipeline used by [`proxy_handler`], and converts the response back.
pub async fn openai_chat_completions(
    State(state): State<AppState>,
    Query(query): Query<BTreeMap<String, String>>,
    headers: HeaderMap,
    axum::Json(mut body): axum::Json<serde_json::Value>,
) -> Response {
    let stream_from_query = openai::query_stream_requested(&query);
    if stream_from_query {
        body["stream"] = serde_json::json!(true);
    }
    let state = match crate::model_routing::route_state(&state, &body).await {
        Ok(state) => state,
        Err(error) => return crate::model_routing::model_route_error_response(&error),
    };
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
            return error_response(
                StatusCode::BAD_REQUEST,
                "invalid_request_error",
                &format!("invalid OpenAI chat completion request: {e}"),
            );
        }
    };
    let stream_requested = req.stream.unwrap_or(false) || stream_from_query;
    if openai::resolve_model(&req.model).is_none() {
        return crate::model_routing::model_not_found_response(&req.model);
    }
    let body = openai::chat_completion_to_anthropic(&req);
    forward_openai(
        &state,
        &headers,
        body,
        &routing_body,
        crate::metrics::Surface::OpenAIChat,
        stream_requested,
        OpenAIShape::Chat,
    )
    .await
}

/// `POST /v1/responses` — `OpenAI` Responses API.
pub async fn openai_responses(
    State(state): State<AppState>,
    headers: HeaderMap,
    axum::Json(body): axum::Json<serde_json::Value>,
) -> Response {
    let state = match crate::model_routing::route_state(&state, &body).await {
        Ok(state) => state,
        Err(error) => return crate::model_routing::model_route_error_response(&error),
    };
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
            return error_response(
                StatusCode::BAD_REQUEST,
                "invalid_request_error",
                &format!("invalid OpenAI responses request: {e}"),
            );
        }
    };
    let stream_requested = req.stream.unwrap_or(false);
    if openai::resolve_model(&req.model).is_none() {
        return crate::model_routing::model_not_found_response(&req.model);
    }
    let body = responses::response_to_anthropic(&req);
    forward_openai(
        &state,
        &headers,
        body,
        &routing_body,
        crate::metrics::Surface::OpenAIResponses,
        stream_requested,
        OpenAIShape::Response,
    )
    .await
}

#[derive(Clone, Copy)]
enum OpenAIShape {
    Chat,
    Response,
}

async fn forward_openai(
    state: &AppState,
    headers: &HeaderMap,
    body: serde_json::Value,
    routing_body: &serde_json::Value,
    surface: crate::metrics::Surface,
    stream_requested: bool,
    shape: OpenAIShape,
) -> Response {
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
    if let Err(e) = state.token_manager.enforce_request_budget(&claims.sub) {
        return error_response(
            StatusCode::TOO_MANY_REQUESTS,
            "rate_limit_error",
            &format!("{e}"),
        );
    }
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
    let (oauth_token, selected_account) =
        match resolve_upstream_credentials(state, &routing_context).await {
            Ok(p) => p,
            Err(e) => {
                tracing::error!("openai: upstream credentials unavailable: {e}");
                return error_response(
                    StatusCode::BAD_GATEWAY,
                    "api_error",
                    "Upstream authentication unavailable",
                );
            }
        };

    let upstream_url = format!(
        "{}/v1/messages",
        state.upstream_base_url.trim_end_matches('/')
    );
    // Claude MAX OAuth inference requires Claude Code's identity as the first
    // system block; OpenAI-dialect clients such as Codex never send it.
    let mut body = body;
    if crate::claude_identity::is_oauth_credential(&oauth_token) {
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
        let mut translator = openai::OpenAIStreamTranslator::new(stream_shape, &served_model);
        let response_log = std::sync::Arc::clone(&state.request_log);
        let stream = upstream_resp.bytes_stream().map(move |chunk| match chunk {
            Ok(bytes) => {
                response_log.record_upstream_body(&correlation_id, &bytes);
                Ok::<bytes::Bytes, std::io::Error>(bytes::Bytes::from(
                    translator.push(&bytes).join(""),
                ))
            }
            Err(e) => Err(std::io::Error::other(e)),
        });
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
        if upstream_status.as_u16() == 429 {
            if let (Some(router), Some(name)) =
                (state.account_router.as_ref(), selected_account.as_deref())
            {
                router.report_failure_with_retry_after(name, "upstream returned 429", retry_after);
            }
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

    let translated = match shape {
        OpenAIShape::Chat => openai::anthropic_to_chat_completion(&anthropic, &served_model),
        OpenAIShape::Response => responses::anthropic_to_response(&anthropic, &served_model),
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

pub(crate) fn maybe_mpp_challenge(
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

/// Build an Anthropic-format error response.
pub(crate) fn error_response(status: StatusCode, error_type: &str, message: &str) -> Response {
    (
        status,
        axum::Json(serde_json::json!({
            "type": "error",
            "error": {
                "type": error_type,
                "message": message
            }
        })),
    )
        .into_response()
}
