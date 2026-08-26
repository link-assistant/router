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

mod upstream_headers;
pub use upstream_headers::MAX_PROXY_REQUEST_BYTES;
pub(crate) use upstream_headers::build_upstream_headers;
pub use upstream_headers::{DEFAULT_ANTHROPIC_VERSION, OAUTH_BETA_FLAG, merge_oauth_beta};
mod upstream_path;

pub use upstream_path::resolve_upstream_path;

use axum::body::Body;
use axum::extract::rejection::JsonRejection;
use axum::extract::{Query, Request, State};
use axum::http::{HeaderMap, HeaderValue, StatusCode};
use axum::response::{IntoResponse, Response};
use futures_util::StreamExt;
use std::collections::{BTreeMap, HashSet};

use crate::accounts::RoutingContext;
pub(crate) use crate::api_error::error_response;
use crate::api_error::malformed_json_response;
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
///
/// `x-claude-code-session-id` is deliberately absent. It is a stable
/// identifier minted on the caller's machine that correlates requests into
/// sessions no matter which token carried them, so relaying it undid the
/// separation per-token issuance exists to provide (issue #332). The router
/// still reads it for its own routing; it just does not pass it on.
pub const REQUIRED_FORWARD_HEADERS: &[&str] = &["anthropic-beta", "anthropic-version"];

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
    "x-goog-api-key",
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
            || is_operator_subscription_header(name_lower)
            || name_lower == "content-length"
            || connection_headers.contains(name_lower)
        {
            continue;
        }
        relayed.append(name.clone(), value.clone());
    }
    relayed
}

fn is_operator_subscription_header(name: &str) -> bool {
    matches!(
        name,
        "x-codex-plan-type"
            | "x-codex-active-limit"
            | "x-codex-credits-balance"
            | "x-codex-entitlement"
            | "x-codex-entitlements"
            | "x-codex-state-token"
    ) || name.starts_with("x-codex-credits-")
        || name.starts_with("x-codex-entitlement-")
}

/// Liveness endpoint: is this process up and serving?
///
/// Deliberately independent of subscription health. `/health` is wired to both
/// the liveness *and* readiness probes in `deploy/k8s/router.yaml`, so failing
/// it for a revoked credential would make Kubernetes restart a container that
/// is running perfectly — and a restart cannot mint a new OAuth token, so the
/// deployment would crash-loop instead of serving the providers that still
/// work. Subscription health is reported by
/// [`crate::subscription_health::subscription_health`] and by the
/// `link_assistant_subscription_healthy` gauge on `/metrics` (issue #318).
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

/// Whether `token` is an administrator credential that is not itself a JWT —
/// the flat `TOKEN_ADMIN_KEY` or a legacy claimed `la_admin_…` value.
fn is_admin_credential(state: &AppState, token: &str) -> bool {
    if state.admin.verify(token) {
        return true;
    }
    state
        .admin_key
        .as_deref()
        .is_some_and(|required| crate::token::constant_time_eq(token, required))
}

/// Synthetic claims describing a non-JWT administrator credential, so the
/// proxy path downstream can treat every caller uniformly. The subject is
/// stable and carries no stored budget, matching how the flat key has always
/// behaved on the admin endpoints.
fn admin_credential_claims(token: &str) -> crate::token::TokenClaims {
    crate::token::TokenClaims {
        sub: format!("admin-credential-{}", crate::admin::sha256_hex(token)),
        iat: 0,
        exp: i64::MAX,
        label: "admin credential".to_string(),
        scope: crate::token::ADMIN_SCOPE.to_string(),
        // An administrative credential is the operator themselves, so it is
        // never narrowed to a repository subset.
        github_repos: Vec::new(),
    }
}

/// Bearer credential presented for an administrative request, if any.
pub(crate) fn extract_admin_bearer(headers: &HeaderMap) -> Option<&str> {
    extract_bearer_token(headers)
}

fn extract_bearer_token(headers: &HeaderMap) -> Option<&str> {
    headers
        .get("authorization")
        .and_then(|v| v.to_str().ok())
        .and_then(|value| {
            let (scheme, token) = value.split_once(' ')?;
            (scheme.eq_ignore_ascii_case("bearer") || scheme.eq_ignore_ascii_case("token"))
                .then_some(token)
        })
        .filter(|token| !token.is_empty())
}

/// Headers that may carry the router's own client token.
///
/// Every vendor dialect names its credential differently, and a client sends
/// the name its own SDK uses: Anthropic's send `x-api-key`, Google's send
/// `x-goog-api-key` (which is what `GEMINI_API_KEY` becomes), and everything
/// else sends `Authorization: Bearer`. The router speaks all of these dialects,
/// so it accepts the credential in whichever one the caller chose — a valid
/// token in the wrong header was a `401` that cost real time to diagnose
/// (issue #206).
///
/// These are checked after `Authorization`, in order. Keep
/// [`ACCEPTED_CREDENTIAL_CARRIERS`] and [`CREDENTIAL_CARRIER_HINT`] in step:
/// the hint is what an unauthenticated caller is told, and it is only useful
/// while it names exactly what is accepted.
pub(crate) const ACCEPTED_CREDENTIAL_CARRIERS: &[&str] = &["x-api-key", "x-goog-api-key"];

/// What a caller presenting no recognised credential is told.
pub(crate) const CREDENTIAL_CARRIER_HINT: &str = "Missing client token. Present it as `Authorization: Bearer <token>`, `x-api-key: <token>` \
     or `x-goog-api-key: <token>`. The `?key=` query parameter is deliberately not accepted, \
     because a URL is recorded by proxies and server logs.";

pub(crate) fn extract_client_token(headers: &HeaderMap) -> Option<&str> {
    extract_bearer_token(headers).or_else(|| {
        ACCEPTED_CREDENTIAL_CARRIERS.iter().find_map(|carrier| {
            headers
                .get(*carrier)
                .and_then(|value| value.to_str().ok())
                .filter(|value| !value.is_empty())
        })
    })
}

/// Why a caller credential was refused, before it is rendered in any dialect.
///
/// Kept separate from the rendered response so the same verdict can be
/// presented in the vendor dialect of whichever surface the caller used: a
/// Gemini client must receive a Gemini error envelope even when the failure is
/// authentication (issue #206).
pub(crate) struct ClientAuthError {
    pub status: StatusCode,
    pub message: String,
}

impl ClientAuthError {
    pub(crate) fn render(&self, dialect: crate::api_error::ApiDialect) -> Response {
        crate::api_error::PresentedError {
            status: self.status,
            error_type: "authentication_error",
            message: &self.message,
        }
        .render(dialect)
    }
}

/// Validate the caller credential, returning the verdict unrendered.
///
/// This is the primitive: [`authenticate_client`] renders the same verdict in
/// the Anthropic dialect for callers that have no surface context.
pub(crate) fn authenticate_client_error(
    state: &AppState,
    headers: &HeaderMap,
) -> Result<crate::token::TokenClaims, ClientAuthError> {
    let Some(token) = extract_client_token(headers) else {
        state.logger.debug(|| "Missing client credential");
        return Err(ClientAuthError {
            status: StatusCode::UNAUTHORIZED,
            message: CREDENTIAL_CARRIER_HINT.to_string(),
        });
    };
    // An administrator credential is a superset of client access: the person
    // who administers the router must be able to call the models with the same
    // credential they manage tokens with. Admin-scoped JWTs already validate
    // below; this covers the flat `TOKEN_ADMIN_KEY` and a legacy claimed
    // `la_admin_` credential. Anonymous admin access is deliberately *not*
    // consulted — it opens the admin surface, never the proxy.
    if is_admin_credential(state, token) {
        return Ok(admin_credential_claims(token));
    }
    state.token_manager.validate_token(token).map_err(|error| {
        let status = if matches!(error, crate::token::TokenError::Revoked) {
            StatusCode::FORBIDDEN
        } else {
            StatusCode::UNAUTHORIZED
        };
        state
            .logger
            .debug(|| format!("Token validation failed: {error}"));
        ClientAuthError {
            status,
            message: error.client_message().to_string(),
        }
    })
}

/// Validate the caller credential without exposing token parser internals.
pub(crate) fn authenticate_client(
    state: &AppState,
    headers: &HeaderMap,
) -> Result<crate::token::TokenClaims, Box<Response>> {
    authenticate_client_error(state, headers)
        .map_err(|error| Box::new(error.render(crate::api_error::ApiDialect::Anthropic)))
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
        let body_bytes =
            match axum::body::to_bytes(req.into_body(), state.max_proxy_request_bytes).await {
                Ok(bytes) => bytes,
                Err(e) => {
                    return error_response(
                        StatusCode::PAYLOAD_TOO_LARGE,
                        "invalid_request_error",
                        &format!(
                            "request body exceeds the {} byte proxy limit: {e}",
                            state.max_proxy_request_bytes
                        ),
                    );
                }
            };
        let body = match serde_json::from_slice(&body_bytes) {
            Ok(body) => body,
            Err(error) => return malformed_json_response(&error.to_string()),
        };
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

    // Read the body before account selection so the router gets a copy of
    // stable request metadata and can preserve conversation affinity. It is
    // also what the spend reservation below is computed from.
    let mut body_bytes =
        match axum::body::to_bytes(req.into_body(), state.max_proxy_request_bytes).await {
            Ok(bytes) => bytes,
            Err(e) => {
                return error_response(
                    StatusCode::PAYLOAD_TOO_LARGE,
                    "invalid_request_error",
                    &format!(
                        "request body exceeds the {} byte proxy limit: {e}",
                        state.max_proxy_request_bytes
                    ),
                );
            }
        };
    let routing_body = match serde_json::from_slice(&body_bytes) {
        Ok(body) => body,
        Err(error) => return malformed_json_response(&error.to_string()),
    };

    // Enforce the per-token budgets (max_requests, rate limit, and the token
    // spend cap). The spend cap reserves this request's declared output budget
    // so one response cannot push the persisted total past it (issue #195).
    let reservation = crate::token_reservation::estimate(&routing_body).total();
    if let Err(e) = state
        .token_manager
        .enforce_request_budget_reserving(&claims.sub, reservation)
    {
        state
            .logger
            .debug(|| format!("Token budget check failed: {e}"));
        return crate::token_http::budget_error_response(&e);
    }
    // Every early return from here on must release the reservation, so bind it
    // to a guard that settles on drop.
    let mut reservation = crate::usage::ReservationGuard::new(
        state.token_manager.clone(),
        claims.sub.clone(),
        reservation,
    );

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
    if status.as_u16() == 429
        && let (Some(router), Some(name)) =
            (state.account_router.as_ref(), selected_account.as_deref())
    {
        router.report_failure_with_retry_after(name, "upstream returned 429", retry_after);
    }

    // Build the response -- stream it back to preserve SSE
    let response_headers = relay_response_headers(upstream_resp.headers());

    // Stream the response body
    let response_log = std::sync::Arc::clone(&state.request_log);
    // On success the reservation follows the response body and is settled with
    // the real usage; otherwise dropping the guard releases it immediately.
    let mut usage = status
        .is_success()
        .then(|| reservation.take().into_tracker());
    // Track how the stream ends, not only how it started: `status` above was
    // decided by the response headers, so it cannot report a turn that is cut
    // mid-flight (issue #230).
    let started = std::time::Instant::now();
    // A single-shot JSON reply has no terminator to miss, so settling it as a
    // cut stream warned once per successful request and filled `logs anomalies`
    // with healthy traffic (issue #252).
    let outcome = std::sync::Arc::new(std::sync::Mutex::new(crate::request_log::StreamOutcome {
        streamed: crate::request_log::response_is_streamed(upstream_resp.headers()),
        terminated: false,
        // A compressed body is relayed byte for byte, so its frames cannot be
        // scanned for a terminator (issue #255).
        inspectable: crate::request_log::body_is_inspectable(upstream_resp.headers()),
        detail: None,
        frames: 0,
        bytes: 0,
        duration_ms: 0,
    }));
    let end_outcome = std::sync::Arc::clone(&outcome);
    let end_log = std::sync::Arc::clone(&response_log);
    let end_id = correlation_id.clone();
    let logger = state.logger.clone();
    let stream = upstream_resp
        .bytes_stream()
        .map(move |chunk| {
            let mut state = outcome.lock().expect("stream outcome lock");
            match &chunk {
                Ok(bytes) => {
                    response_log.record_upstream_body(&correlation_id, bytes);
                    state.frames += 1;
                    state.bytes += bytes.len() as u64;
                    if crate::request_log::frame_terminates_stream(bytes) {
                        state.terminated = true;
                    }
                    if let Some(tracker) = &mut usage {
                        tracker.feed(bytes);
                    }
                }
                Err(error) => state.detail = Some(error.to_string()),
            }
            drop(state);
            chunk.map_err(std::io::Error::other)
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
        });

    let body = Body::from_stream(stream);

    let mut response = Response::new(body);
    *response.status_mut() = status;
    *response.headers_mut() = response_headers;

    response
}

/// Resolve the OAuth token and the name of the account that produced it.
///
/// When `state.account_router` is set we delegate to the multi-account
/// router; otherwise we fall back to the single-account legacy provider.
///
/// Either way an expired access token is refreshed via
/// `state.subscription_cache`, which persists a rotated refresh token back to
/// the credential file so the rotation survives a restart (issue #239). The
/// write is best effort, so a read-only `CLAUDE_CODE_HOME` mount still
/// survives expiry from memory without a Claude CLI in the image.
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
#[path = "proxy_openai.rs"]
mod openai_handlers;

pub use openai_handlers::{openai_chat_completions, openai_responses};

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
    stream_options: (bool, OpenAIShape, bool),
) -> Response {
    let (stream_requested, shape, include_usage) = stream_options;
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
        let mut translator = openai::OpenAIStreamTranslator::new(stream_shape, &served_model)
            .with_include_usage(include_usage);
        let response_log = std::sync::Arc::clone(&state.request_log);
        let mut usage = reservation.take().into_tracker();
        let stream = upstream_resp.bytes_stream().map(move |chunk| match chunk {
            Ok(bytes) => {
                response_log.record_upstream_body(&correlation_id, &bytes);
                usage.feed(&bytes);
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
    reservation
        .take()
        .settle(crate::usage::token_count(&anthropic).unwrap_or(0));

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
