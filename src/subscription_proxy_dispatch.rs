//! Account selection and the upstream send for subscription (Codex, Qwen)
//! requests, with opt-in pre-first-byte failover across the account pool
//! (issue #676).
//!
//! Without failover this sends once — plus the established single replay
//! after a `401` refresh — exactly as before. With
//! `POOL_FAILOVER=pre-first-byte` a `429`, `529`, retryable `5xx`, `401` or
//! transport error is answered by sending the same request on the next
//! eligible account, before any byte reaches the client. The loop honours the
//! same bounds as the Anthropic path: `POOL_FAILOVER_MAX_ATTEMPTS`,
//! `POOL_FAILOVER_BUDGET_SECS`, no other eligible account, a token-pinned
//! account, and a client that went away (axum drops the handler).

use std::time::Instant;

use axum::http::{HeaderMap, HeaderValue, StatusCode};
use axum::response::Response;
use bytes::Bytes;
use serde_json::Value;

use super::{CodexResponsesMode, join_subscription_url, subscription_headers};
use crate::accounts::{RoutingContext, UpstreamObservation};
use crate::metrics::Surface;
use crate::pool_failover::{RetryReason, classify_status};
use crate::proxy::{AppState, error_response, log_stop, note_failover, retry_after_duration};
use crate::subscription::{SubscriptionProvider, SubscriptionToken};

/// Everything one dispatch needs from the handler.
pub(super) struct CodexDispatch<'a> {
    pub state: &'a AppState,
    pub provider: SubscriptionProvider,
    pub headers: &'a HeaderMap,
    pub path: &'a str,
    pub surface: Surface,
    /// The normalized request body.
    pub body: &'a Value,
    /// The client's native bytes, when the request is forwarded natively.
    pub native_body: Option<crate::encoded_request_body::NativeBody>,
    pub native_protocol: bool,
    pub responses_mode: CodexResponsesMode,
    pub validated: Option<&'a crate::model_routing::ValidatedSubscription>,
    pub context: RoutingContext,
    pub correlation_id: &'a str,
}

/// The upstream response the client will receive.
pub(super) struct Dispatched {
    pub response: reqwest::Response,
    /// The account that produced it.
    pub account: String,
    pub base_url: String,
    pub bytes_sent: u64,
}

/// A selection failure: the response for a first attempt, the reason for a
/// later one.
struct SelectError {
    status: StatusCode,
    code: &'static str,
    message: String,
}

impl SelectError {
    fn new(status: StatusCode, code: &'static str, message: impl Into<String>) -> Self {
        Self {
            status,
            code,
            message: message.into(),
        }
    }
}

/// Select an account, send, and — with failover on — retry on another account
/// until a response can be relayed.
pub(super) async fn dispatch(request: CodexDispatch<'_>) -> Result<Dispatched, Response> {
    let state = request.state;
    let policy = crate::pool_failover::current();
    let router = state.account_router.as_ref();
    // A token-pinned account never falls back.
    let failover = router.is_some_and(crate::accounts::AccountRouter::failover_enabled)
        && request.context.pinned_account.is_none();
    let max_attempts = if failover {
        policy.max_attempts.max(1)
    } else {
        1
    };
    let deadline = Instant::now() + policy.budget;
    let encode = |value: &Value| {
        request.native_body.as_ref().map_or_else(
            || {
                serde_json::to_vec(value)
                    .map_err(|error| format!("failed to serialize request JSON: {error}"))
            },
            |native| native.encode(value),
        )
    };
    let payload = match encode(request.body) {
        Ok(bytes) => Bytes::from(bytes),
        Err(error) => {
            return Err(error_response(
                StatusCode::INTERNAL_SERVER_ERROR,
                "api_error",
                &error,
            ));
        }
    };
    // Reasoning items carry `encrypted_content` only the producing account
    // can read; a request moved to another account must leave them out.
    let mut stripped: Option<Bytes> = None;
    // The account whose encrypted reasoning the conversation history carries.
    let origin = router.and_then(|router| router.session_account(&request.context));
    let mut context = request.context.clone();
    let mut last: Option<Result<Dispatched, (String, String)>> = None;
    for attempt in 1..=max_attempts {
        if attempt > 1 && Instant::now() >= deadline {
            log_stop(state, request.correlation_id, attempt, "budget exhausted");
            break;
        }
        let (account, token) =
            match select_account(state, request.provider, request.validated, &context).await {
                Ok(selected) => selected,
                Err(error) if attempt > 1 => {
                    log_stop(state, request.correlation_id, attempt, &error.message);
                    break;
                }
                Err(error) => return Err(error_response(error.status, error.code, &error.message)),
            };
        // An already-bound account cannot move; do not send twice.
        if attempt > 1 && context.exclude.contains(&account) {
            log_stop(state, request.correlation_id, attempt, "no other account");
            break;
        }
        let history_account = origin.clone().or_else(|| context.exclude.first().cloned());
        let body = if failover && history_account.is_some_and(|origin| origin != account) {
            if stripped.is_none() {
                let mut value = request.body.clone();
                let changed = crate::pool_failover::strip_codex_encrypted_reasoning(&mut value);
                stripped = Some(if changed {
                    encode(&value).map_or_else(|_| payload.clone(), Bytes::from)
                } else {
                    payload.clone()
                });
            }
            stripped.clone().unwrap_or_else(|| payload.clone())
        } else {
            payload.clone()
        };
        let base_url = state
            .subscription_base_url
            .clone()
            .unwrap_or_else(|| token.base_url(request.provider));
        let bytes_sent = body.len() as u64;
        let attempt_outcome = send_attempt(&request, &account, token, &base_url, body);
        let outcome = if attempt > 1 {
            let bounded =
                tokio::time::timeout_at(tokio::time::Instant::from_std(deadline), attempt_outcome)
                    .await;
            let Ok(outcome) = bounded else {
                log_stop(state, request.correlation_id, attempt, "budget exhausted");
                break;
            };
            outcome
        } else {
            attempt_outcome.await
        };
        let response = match outcome {
            Ok(response) => response,
            Err(error) => {
                if failover && attempt < max_attempts {
                    note_failover(
                        state,
                        request.correlation_id,
                        attempt,
                        Some(&account),
                        RetryReason::Transport,
                    );
                    context.exclude.push(account.clone());
                    last = Some(Err((account, error)));
                    continue;
                }
                return Err(transport_error(&request, Some(&account), &error));
            }
        };
        let status = response.status().as_u16();
        if let Some(router) = router {
            router.observe_upstream(&UpstreamObservation {
                account: &account,
                model: context.model.as_deref(),
                status,
                headers: response.headers(),
                body: &[],
                retry_after: retry_after_duration(response.headers()),
            });
        }
        let dispatched = Dispatched {
            response,
            account,
            base_url,
            bytes_sent,
        };
        match classify_status(status) {
            Some(reason) if failover && attempt < max_attempts => {
                note_failover(
                    state,
                    request.correlation_id,
                    attempt,
                    Some(&dispatched.account),
                    reason,
                );
                context.exclude.push(dispatched.account.clone());
                // Dropping an earlier failure closes its connection.
                last = Some(Ok(dispatched));
            }
            _ => return Ok(dispatched),
        }
    }
    match last {
        Some(Ok(dispatched)) => Ok(dispatched),
        Some(Err((account, error))) => Err(transport_error(&request, Some(&account), &error)),
        None => Err(error_response(
            StatusCode::SERVICE_UNAVAILABLE,
            "account_unavailable",
            "no subscription account could serve the request",
        )),
    }
}

/// Send one attempt on `account`, replaying it once with a refreshed token
/// when the vendor rejects an unexpired one, and record the credential
/// evidence for the response.
async fn send_attempt(
    request: &CodexDispatch<'_>,
    account: &str,
    token: SubscriptionToken,
    base_url: &str,
    body: Bytes,
) -> Result<reqwest::Response, String> {
    let state = request.state;
    let provider = request.provider;
    let upstream_url = join_subscription_url(provider, base_url, request.path);
    let upstream_client = crate::upstream_client::subscription_client(
        &state.client,
        provider,
        state.subscription_base_url.is_some(),
    );
    let build_request = |token: &SubscriptionToken| {
        let mut builder = upstream_client.post(upstream_url.clone());
        if request.native_protocol {
            let mut native_headers =
                crate::proxy::native_request_headers(request.headers, &token.access_token);
            if provider == SubscriptionProvider::Codex
                && let Some(account_id) = token.account_id.as_deref()
                && let Ok(value) = HeaderValue::from_str(account_id)
            {
                native_headers.insert("chatgpt-account-id", value);
            }
            builder = builder.headers(native_headers);
        } else {
            builder = builder
                .header("content-type", "application/json")
                .header("authorization", format!("Bearer {}", token.access_token));
            if let Some(request_id) = crate::proxy::translated_request_id(request.headers) {
                builder = builder.header("x-request-id", request_id);
            }
            for (name, value) in subscription_headers(provider, token, request.responses_mode) {
                builder = builder.header(name, value);
            }
        }
        builder.body(body.clone())
    };
    let mut response = state
        .request_log
        .send_upstream(
            request.correlation_id,
            upstream_client,
            build_request(&token),
        )
        .await
        .map_err(|error| error.to_string())?;
    // Evidence must name the credential that produced the final upstream
    // response. A successful reactive retry replaces this below.
    let mut evidence_token = Some(token.clone());
    // A validated automatic route owns one account/catalog decision for the
    // whole request. Its 401 is returned unchanged: the ordinary recovery
    // ladder could adopt a different account that appeared after validation.
    // A non-validated pinned route keeps the established reactive refresh.
    // A `401` is the vendor disproving the token's own `exp` claim: it may have
    // invalidated the access token early, and the stored expiry is no evidence
    // to the contrary. Refresh and replay the request exactly once, so a
    // recoverable credential is not reported as dead (issue #205).
    if request.validated.is_none()
        && response.status() == reqwest::StatusCode::UNAUTHORIZED
        && let Some(refreshed) = state
            .subscription_cache
            .refresh_rejected(
                &state.client,
                provider,
                account,
                token,
                chrono::Utc::now().timestamp_millis(),
            )
            .await
    {
        tracing::info!(
            "{provider} rejected an unexpired access token; retrying once with a refreshed one"
        );
        match state
            .request_log
            .send_upstream(
                request.correlation_id,
                upstream_client,
                build_request(&refreshed),
            )
            .await
        {
            // Only one retry: a second 401 is surfaced rather than looped.
            Ok(retried) => {
                response = retried;
                evidence_token = Some(refreshed);
            }
            Err(error) => {
                tracing::warn!("{provider} retry after refresh failed: {error}");
                // B produced no HTTP status. The retained A response is still
                // returned to the caller, but its verdict was superseded by
                // the successful rotation and must not be attributed to B.
                evidence_token = None;
            }
        }
    }
    if let Some(evidence_token) = evidence_token.as_ref() {
        state
            .subscription_cache
            .record_status_for_credential(
                provider,
                account,
                evidence_token,
                response.status().as_u16(),
            )
            .await;
    }
    Ok(response)
}

fn transport_error(request: &CodexDispatch<'_>, account: Option<&str>, error: &str) -> Response {
    request
        .state
        .metrics
        .record_request(request.surface, 502, account);
    error_response(
        StatusCode::BAD_GATEWAY,
        "api_error",
        &format!(
            "{} subscription upstream request failed: {error}",
            request.provider
        ),
    )
}

/// Pick the account for one attempt and return it with a token ready to send.
async fn select_account(
    state: &AppState,
    provider: SubscriptionProvider,
    validated: Option<&crate::model_routing::ValidatedSubscription>,
    context: &RoutingContext,
) -> Result<(String, SubscriptionToken), SelectError> {
    let selected = if let Some(validated) = validated {
        let selected = validated
            .for_dispatch_with_context(state, context)
            .await
            .map_err(|error| {
                SelectError::new(
                    StatusCode::SERVICE_UNAVAILABLE,
                    "authentication_error",
                    error,
                )
            })?;
        // Automatic model routing already refreshed and validated this exact
        // token. Refreshing again here could adopt a credential that appeared
        // after catalog validation, recreating the account-crossing race.
        return Ok((selected.name, selected.token));
    } else if let Some(router) = state.account_router.as_ref() {
        router
            .select_subscription_where_authoritative(context, &state.subscription_cache, |_| true)
            .await
            .map_err(|error| {
                SelectError::new(
                    StatusCode::SERVICE_UNAVAILABLE,
                    "account_unavailable",
                    error.to_string(),
                )
            })?
    } else {
        let Some(reader) = state.subscription_reader.as_ref() else {
            return Err(SelectError::new(
                StatusCode::INTERNAL_SERVER_ERROR,
                "api_error",
                "subscription credentials reader is not configured",
            ));
        };
        state
            .subscription_cache
            .register_reader(crate::credential_recovery_store::PRIMARY_ACCOUNT, reader);
        let Ok(Some(disk_token)) = state
            .subscription_cache
            .load_authoritative(provider, crate::credential_recovery_store::PRIMARY_ACCOUNT)
            .await
        else {
            return Err(SelectError::new(
                StatusCode::BAD_GATEWAY,
                "authentication_error",
                format!("failed to read {provider} subscription credentials"),
            ));
        };
        crate::accounts::SelectedSubscriptionAccount {
            name: "primary".to_string(),
            token: disk_token,
        }
    };
    // Pinned routing performs its ordinary serving-path refresh here.
    let token = state
        .subscription_cache
        .get_fresh_loaded(
            &state.client,
            provider,
            &selected.name,
            selected.token,
            chrono::Utc::now().timestamp_millis(),
        )
        .await
        .map_err(|error| {
            SelectError::new(
                StatusCode::SERVICE_UNAVAILABLE,
                "authentication_error",
                error,
            )
        })?;
    Ok((selected.name, token))
}
