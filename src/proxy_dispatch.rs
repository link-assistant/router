//! Account selection and the upstream send for the Anthropic pass-through,
//! with opt-in pre-first-byte failover across the account pool (issue #676).
//!
//! Without failover this sends exactly once, as before. With
//! `POOL_FAILOVER=pre-first-byte` a `429`, `529`, retryable `5xx`, `401` or
//! transport error is answered by sending the same request on the next
//! eligible account. Every attempt happens before a byte of the response is
//! relayed, so the client sees one response — the first success, or the last
//! failure. The loop stops at `POOL_FAILOVER_MAX_ATTEMPTS`, after
//! `POOL_FAILOVER_BUDGET_SECS`, when no other account can serve, for a
//! token-pinned account, and — because axum drops a handler whose client
//! disconnected — as soon as the client goes away.

use std::time::Instant;

use axum::http::{HeaderMap, Method, StatusCode};
use axum::response::Response;
use bytes::{Bytes, BytesMut};
use futures_util::StreamExt;
use futures_util::stream::BoxStream;
use serde_json::{Value, json};

use super::{AppState, build_upstream_headers, error_response, retry_after_duration};
use crate::account_http::CookieMode;
use crate::accounts::{RoutingContext, UpstreamObservation};
use crate::pool_failover::{RetryReason, classify_status};
use crate::request_routing::ResolvedUpstreamCredential;
use crate::subscription::SubscriptionProvider;
use crate::upstream_client::UpstreamSendError;

/// Bytes of a failed response read before deciding whether to retry it. Error
/// bodies are small; a larger one is still relayed whole.
const MAX_PEEKED_ERROR_BYTES: usize = 16 * 1024;

/// Everything one dispatch needs from the handler.
pub(super) struct Dispatch<'a> {
    pub state: &'a AppState,
    pub method: &'a Method,
    pub upstream_url: &'a str,
    pub incoming_headers: &'a HeaderMap,
    pub body: Bytes,
    pub routing_body: &'a Value,
    pub context: RoutingContext,
    pub subscription: Option<&'a crate::model_routing::ValidatedSubscription>,
    pub correlation_id: &'a str,
}

/// The upstream response the client will receive.
pub(super) struct UpstreamReply {
    pub status: StatusCode,
    pub headers: HeaderMap,
    /// The pooled account that produced it, if any.
    pub account: Option<String>,
    pub body: BoxStream<'static, reqwest::Result<Bytes>>,
}

impl UpstreamReply {
    fn live(response: reqwest::Response, account: Option<String>) -> Self {
        Self {
            status: StatusCode::from_u16(response.status().as_u16())
                .unwrap_or(StatusCode::INTERNAL_SERVER_ERROR),
            headers: response.headers().clone(),
            account,
            body: response.bytes_stream().boxed(),
        }
    }

    /// Read up to [`MAX_PEEKED_ERROR_BYTES`] of the body for classification,
    /// keeping every byte for the relay.
    async fn peeked(response: reqwest::Response, account: Option<String>) -> (Self, Bytes) {
        let mut reply = Self::live(response, account);
        let mut stream =
            std::mem::replace(&mut reply.body, futures_util::stream::empty().boxed()).fuse();
        let mut prefix = BytesMut::new();
        let mut pending = None;
        while prefix.len() < MAX_PEEKED_ERROR_BYTES {
            match stream.next().await {
                Some(Ok(chunk)) => prefix.extend_from_slice(&chunk),
                Some(Err(error)) => {
                    pending = Some(error);
                    break;
                }
                None => break,
            }
        }
        let prefix = prefix.freeze();
        reply.body = futures_util::stream::iter([Ok(prefix.clone())])
            .chain(futures_util::stream::iter(pending.map(Err)))
            .chain(stream)
            .boxed();
        (reply, prefix)
    }
}

/// The last thing that went wrong, relayed when no attempt succeeds.
enum Failure {
    Reply(UpstreamReply),
    Transport(String),
}

/// Select an account, send, and — with failover on — retry on another account
/// until a response can be relayed.
pub(super) async fn dispatch(request: Dispatch<'_>) -> Result<UpstreamReply, Response> {
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
    let deadline = policy.deadline(Instant::now());
    // The account whose signatures the conversation history carries.
    let origin = router.and_then(|router| router.session_account(&request.context));
    let mut context = request.context;
    let mut last: Option<Failure> = None;
    let mut stripped: Option<Bytes> = None;
    for attempt in 1..=max_attempts {
        if attempt > 1 && Instant::now() >= deadline {
            log_stop(state, request.correlation_id, attempt, "budget exhausted");
            break;
        }
        let resolved =
            match resolve_upstream_credentials(state, &context, request.subscription).await {
                Ok(resolved) => resolved,
                Err(error) if attempt > 1 => {
                    log_stop(state, request.correlation_id, attempt, &error.to_string());
                    break;
                }
                Err(error) => {
                    if let Some(error) = request.subscription.and_then(|subscription| {
                        subscription.unavailable_error(state, context.pinned_account.as_deref())
                    }) {
                        return Err(crate::model_routing::model_route_error_response(&error));
                    }
                    tracing::error!("Failed to resolve upstream credentials: {error}");
                    return Err(error_response(
                        StatusCode::BAD_GATEWAY,
                        "api_error",
                        "Upstream authentication unavailable",
                    ));
                }
            };
        let account = resolved.account.clone();
        // An already-bound subscription cannot move; do not send twice.
        if attempt > 1
            && account
                .as_ref()
                .is_none_or(|account| context.exclude.contains(account))
        {
            log_stop(state, request.correlation_id, attempt, "no other account");
            break;
        }
        let history_account = origin.clone().or_else(|| context.exclude.first().cloned());
        let body = if failover
            && account.is_some()
            && history_account.is_some_and(|origin| Some(origin) != account)
        {
            stripped
                .get_or_insert_with(|| strip_signed_history(request.routing_body, &request.body))
                .clone()
        } else {
            request.body.clone()
        };
        let headers = build_upstream_headers(
            request.incoming_headers,
            &resolved.access_token,
            &state.logger,
        );
        state.logger.verbose(|| {
            format!(
                "Forwarding {} {} ({} bytes, attempt {attempt})",
                request.method,
                request.upstream_url,
                body.len()
            )
        });
        // Each pooled account sends on its own connections, through its own
        // egress proxy when it has one (issue #678).
        let upstream_call = async {
            let client = crate::account_http::pooled_client(
                router,
                account.as_deref(),
                &state.client,
                CookieMode::None,
            )
            .map_err(UpstreamSendError::Egress)?;
            let builder = client
                .request(request.method.clone(), request.upstream_url)
                .headers(headers)
                .body(body);
            state
                .request_log
                .send_upstream(request.correlation_id, &client, builder)
                .await
        };
        let outcome = if attempt > 1 {
            let bounded =
                tokio::time::timeout_at(tokio::time::Instant::from_std(deadline), upstream_call)
                    .await;
            let Ok(outcome) = bounded else {
                log_stop(state, request.correlation_id, attempt, "budget exhausted");
                break;
            };
            outcome
        } else {
            upstream_call.await
        };
        let response = match outcome {
            Ok(response) => response,
            Err(error) => {
                tracing::error!("Upstream request failed: {error}");
                if failover && attempt < max_attempts {
                    note_failover(
                        state,
                        request.correlation_id,
                        attempt,
                        account.as_deref(),
                        RetryReason::Transport,
                    );
                    // A vendor reply (with its Retry-After) beats a later
                    // connection failure as the answer to relay.
                    if !matches!(last, Some(Failure::Reply(_))) {
                        last = Some(Failure::Transport(error.to_string()));
                    }
                    context.exclude.extend(account);
                    continue;
                }
                if let Some(Failure::Reply(reply)) = last {
                    return Ok(reply);
                }
                return Err(transport_error(&error.to_string()));
            }
        };
        let status = response.status().as_u16();
        if status >= 400 {
            tracing::warn!(
                request_id = request.correlation_id,
                upstream_status = status,
                error_class = crate::logging::http_failure(status),
                "upstream request rejected"
            );
        }
        let retry_after = retry_after_duration(response.headers());
        crate::request_routing::record_claude_evidence(
            state,
            account.as_deref(),
            resolved.evidence_token.as_ref(),
            status,
        )
        .await;
        state
            .logger
            .verbose(|| format!("Upstream responded: {status} (attempt {attempt})"));
        let reason = classify_status(status);
        let (reply, peeked) = if status == 429 || (failover && reason.is_some()) {
            UpstreamReply::peeked(response, account.clone()).await
        } else {
            (UpstreamReply::live(response, account.clone()), Bytes::new())
        };
        // Every response, `count_tokens` included, updates the vendor
        // rate-limit state (issue #677).
        if let (Some(router), Some(name)) = (router, account.as_deref()) {
            router.observe_upstream(&UpstreamObservation {
                account: name,
                model: context.model.as_deref(),
                status,
                headers: &reply.headers,
                body: &peeked,
                retry_after,
            });
        }
        match reason {
            Some(reason) if failover && attempt < max_attempts => {
                note_failover(
                    state,
                    request.correlation_id,
                    attempt,
                    account.as_deref(),
                    reason,
                );
                // Dropping the earlier failure closes its connection.
                last = Some(Failure::Reply(reply));
                context.exclude.extend(account);
            }
            _ => return Ok(reply),
        }
    }
    match last {
        Some(Failure::Reply(reply)) => Ok(reply),
        Some(Failure::Transport(error)) => Err(transport_error(&error)),
        None => Err(error_response(
            StatusCode::BAD_GATEWAY,
            "api_error",
            "Upstream authentication unavailable",
        )),
    }
}

fn transport_error(error: &str) -> Response {
    error_response(
        StatusCode::BAD_GATEWAY,
        "api_error",
        &format!("Upstream request failed: {error}"),
    )
}

/// The request body without Claude thinking blocks, whose signatures only the
/// account that produced them accepts. Unchanged bytes when there were none.
fn strip_signed_history(routing_body: &Value, original: &Bytes) -> Bytes {
    let mut body = routing_body.clone();
    if !crate::pool_failover::strip_anthropic_thinking(&mut body) {
        return original.clone();
    }
    serde_json::to_vec(&body).map_or_else(|_| original.clone(), Bytes::from)
}

/// Record one failed attempt that is being retried, under the request's
/// correlation id.
pub fn note_failover(
    state: &AppState,
    correlation_id: &str,
    attempt: u32,
    account: Option<&str>,
    reason: RetryReason,
) {
    state.metrics.record_pool_failover();
    tracing::info!(
        correlation_id,
        attempt,
        account = account.unwrap_or("primary"),
        reason = reason.as_str(),
        "pool failover: retrying on another account before the first byte"
    );
    state.request_log.record(
        correlation_id,
        "pool_failover",
        json!({"attempt": attempt, "account": account, "reason": reason.as_str()}),
    );
}

pub fn log_stop(state: &AppState, correlation_id: &str, attempt: u32, why: &str) {
    tracing::info!(correlation_id, attempt, "pool failover stopped: {why}");
    state.request_log.record(
        correlation_id,
        "pool_failover_stopped",
        json!({"attempt": attempt, "reason": why}),
    );
}

/// Resolve and refresh the selected OAuth credential, retaining the full token
/// so inference evidence can be bound to the generation that produced it.
pub(super) async fn resolve_upstream_credentials(
    state: &AppState,
    context: &RoutingContext,
    validated: Option<&crate::model_routing::ValidatedSubscription>,
) -> Result<ResolvedUpstreamCredential, Box<dyn std::error::Error + Send + Sync>> {
    if let Some(validated) = validated {
        if validated.provider != SubscriptionProvider::Claude {
            return Err("validated subscription does not match the Anthropic provider".into());
        }
        let selected = validated
            .for_dispatch_with_context(state, context)
            .await
            .map_err(std::io::Error::other)?;
        return Ok(ResolvedUpstreamCredential {
            access_token: selected.token.access_token.clone(),
            account: Some(selected.name),
            evidence_token: Some(selected.token),
        });
    }
    if let Some(router) = state.account_router.as_ref() {
        let sel = router
            .select_subscription_where_authoritative(context, &state.subscription_cache, |_| true)
            .await?;
        let now_ms = crate::operation_context::now().timestamp_millis();
        // The refresh leaves through the account's own egress as well.
        let client = router
            .http_client(&sel.name, CookieMode::None)
            .map_err(std::io::Error::other)?;
        let token = state
            .subscription_cache
            .get_fresh_loaded(&client, router.provider(), &sel.name, sel.token, now_ms)
            .await
            .map_err(std::io::Error::other)?;
        return Ok(ResolvedUpstreamCredential {
            access_token: token.access_token.clone(),
            account: Some(sel.name),
            evidence_token: Some(token),
        });
    }
    if state
        .subscription_cache
        .store_for_subscription(
            SubscriptionProvider::Claude,
            crate::credential_recovery_store::PRIMARY_ACCOUNT,
        )
        .is_some()
    {
        let token = state
            .subscription_cache
            .get_fresh_registered(
                &state.client,
                SubscriptionProvider::Claude,
                crate::credential_recovery_store::PRIMARY_ACCOUNT,
                crate::operation_context::now().timestamp_millis(),
            )
            .await
            .map_err(std::io::Error::other)?;
        return Ok(ResolvedUpstreamCredential {
            access_token: token.access_token.clone(),
            account: None,
            evidence_token: Some(token),
        });
    }
    let token = state
        .oauth_provider
        .get_fresh_token(&state.client, &state.subscription_cache)
        .await?;
    Ok(ResolvedUpstreamCredential {
        access_token: token,
        account: None,
        evidence_token: None,
    })
}
