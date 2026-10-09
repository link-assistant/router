//! One pre-first-byte policy loop shared by every subscription protocol.
use crate::account_http::CookieMode;
use crate::account_routing_policy::ErrorAction;
use crate::upstream_client::UpstreamSendError;
use axum::http::HeaderValue;
use bytes::{Bytes, BytesMut};
use futures_util::{StreamExt, stream};
use reqwest::ResponseBuilderExt as _;
use serde_json::Value;
use std::time::Instant;

const MAX_ERROR_BYTES: usize = 16 * 1024;

pub async fn send(
    log: &crate::request_log::RequestLog,
    correlation: &str,
    fallback_client: &reqwest::Client,
    original: reqwest::Request,
) -> Result<reqwest::Response, UpstreamSendError> {
    let scope = crate::account_policy_scope::current().expect("policy scope");
    let router = scope.state.account_router.as_ref().expect("policy pool");
    let mut selected = scope
        .selected
        .lock()
        .unwrap_or_else(std::sync::PoisonError::into_inner)
        .clone();
    // The handler may already have refreshed this selected credential.
    if let Some(access_token) = original
        .headers()
        .get("authorization")
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.strip_prefix("Bearer "))
    {
        selected.token.access_token = access_token.to_string();
    }
    let initial_base = selected.token.base_url(router.provider());
    let initial_model = scope.upstream_model.clone();
    let initial_policy = router
        .routing_policy(&selected.name)
        .map_err(UpstreamSendError::Egress)?;
    let pool = crate::pool_failover::current();
    let max_attempts = initial_policy
        .request_retry
        .map_or_else(|| pool.max_attempts.max(1), |n| n + 1);
    let ordinary_retry =
        router.inner_failover_enabled() || initial_policy.request_retry.is_some_and(|n| n > 0);
    let deadline = pool.deadline(Instant::now());
    let mut context = scope.context.clone();
    let model = context.model.clone().unwrap_or_default();
    let mut last_response = None;
    for attempt in 1..=max_attempts {
        let policy = router
            .routing_policy(&selected.name)
            .map_err(UpstreamSendError::Egress)?;
        let upstream_model = replay_model(router, &selected.name, &model, &initial_model)
            .ok_or_else(|| {
                UpstreamSendError::Egress("account excludes the requested model".into())
            })?;
        if !crate::account_policy_catalog::permitted(
            &scope.model_policy,
            router.provider(),
            &upstream_model,
        ) {
            return Err(UpstreamSendError::Egress(
                "model policy denies upstream model".into(),
            ));
        }
        let mut request = original
            .try_clone()
            .ok_or_else(|| UpstreamSendError::Egress("request body cannot be replayed".into()))?;
        prepare(
            &mut request,
            if router.provider() == crate::subscription::SubscriptionProvider::Gemini {
                upstream_model
                    .strip_prefix("models/")
                    .unwrap_or(&upstream_model)
            } else {
                &upstream_model
            },
            attempt > 1,
            scope.state.max_proxy_request_bytes,
        )?;
        if attempt > 1 {
            request.headers_mut().insert(
                "authorization",
                HeaderValue::from_str(&format!("Bearer {}", selected.token.access_token))
                    .map_err(|e| UpstreamSendError::Egress(e.to_string()))?,
            );
            if request.headers_mut().remove("chatgpt-account-id").is_some()
                && let Some(account_id) = &selected.token.account_id
            {
                request.headers_mut().insert(
                    "chatgpt-account-id",
                    HeaderValue::from_str(account_id)
                        .map_err(|e| UpstreamSendError::Egress(e.to_string()))?,
                );
            }
            if scope.state.subscription_base_url.is_none()
                && router.provider() != crate::subscription::SubscriptionProvider::Claude
            {
                let first = &initial_base;
                let next = selected.token.base_url(router.provider());
                if first != &next
                    && let Some(suffix) = request
                        .url()
                        .as_str()
                        .strip_prefix(first.trim_end_matches('/'))
                {
                    *request.url_mut() = format!("{}{suffix}", next.trim_end_matches('/'))
                        .parse()
                        .map_err(|e: url::ParseError| UpstreamSendError::Egress(e.to_string()))?;
                }
            }
        }
        policy.apply_headers(&scope.headers, request.headers_mut());
        if upstream_model != model {
            request.headers_mut().remove("accept-encoding");
        }
        let cookies = if router.provider() == crate::subscription::SubscriptionProvider::Codex
            && scope.state.subscription_base_url.is_none()
        {
            CookieMode::CodexCloudflare
        } else {
            CookieMode::None
        };
        let client = crate::account_http::pooled_client(
            Some(router),
            Some(&selected.name),
            fallback_client,
            cookies,
        )
        .map_err(UpstreamSendError::Egress)?;
        let sending = log.send_prepared(correlation, &client, request);
        let result = if attempt == 1 {
            sending.await
        } else {
            match tokio::time::timeout_at(tokio::time::Instant::from_std(deadline), sending).await {
                Ok(result) => result,
                Err(_) => break,
            }
        };
        let mut retry = ordinary_retry;
        let mut retry_reason = crate::pool_failover::RetryReason::Transport;
        match result {
            Ok(response) => {
                *scope
                    .selected
                    .lock()
                    .unwrap_or_else(std::sync::PoisonError::into_inner) = selected.clone();
                let status = response.status().as_u16();
                retry_reason = crate::pool_failover::classify_status(status)
                    .unwrap_or(crate::pool_failover::RetryReason::Transport);
                let inspect = policy
                    .request_scoped_errors
                    .iter()
                    .find(|r| r.status == status)
                    .is_some_and(|r| !r.body_match.is_empty());
                let (response, prefix) = if inspect {
                    peek(response, deadline).await
                } else {
                    (response, Bytes::new())
                };
                let action = policy.error_action(status, &prefix);
                tracing::debug!(account = %selected.name, status, ?action, attempt, max_attempts,
                    "account routing policy upstream verdict");
                *scope
                    .last_action
                    .lock()
                    .unwrap_or_else(std::sync::PoisonError::into_inner) = action;
                router.observe_upstream(&crate::accounts::UpstreamObservation {
                    account: &selected.name,
                    model: Some(&upstream_model),
                    status,
                    headers: response.headers(),
                    body: &prefix,
                    retry_after: crate::request_routing::retry_after_duration(response.headers()),
                });
                match action {
                    Some(ErrorAction::Cooldown) => {
                        router.report_failure(&selected.name, "request-scoped cooldown rule");
                        retry = false;
                    }
                    Some(ErrorAction::Relay) => retry = false,
                    Some(ErrorAction::RetryNext) => retry = true,
                    None => retry &= crate::pool_failover::classify_status(status).is_some(),
                }
                scope
                    .state
                    .subscription_cache
                    .record_status_for_credential(
                        router.provider(),
                        &selected.name,
                        &selected.token,
                        status,
                    )
                    .await;
                if !retry || attempt == max_attempts || context.pinned_account.is_some() {
                    *scope
                        .selected
                        .lock()
                        .unwrap_or_else(std::sync::PoisonError::into_inner) = selected;
                    return Ok(response);
                }
                last_response = Some(response);
            }
            Err(error) => {
                if !retry || attempt == max_attempts || context.pinned_account.is_some() {
                    return last_response.ok_or(error);
                }
            }
        }
        if Instant::now() >= deadline {
            break;
        }
        context.exclude.push(selected.name.clone());
        let next = tokio::time::timeout_at(
            tokio::time::Instant::from_std(deadline),
            router.select_subscription_where_authoritative(
                &context,
                &scope.state.subscription_cache,
                |account| {
                    let Some(upstream) = replay_model(router, account, &model, &initial_model)
                    else {
                        return false;
                    };
                    // Preserve the validated upstream selector during replay.
                    upstream == initial_model
                        && crate::account_policy_catalog::permitted(
                            &scope.model_policy,
                            router.provider(),
                            &upstream,
                        )
                        && router.serves_upstream_model(account, &upstream)
                        && (upstream == model
                            && scope.state.upstream_provider
                                != crate::config::UpstreamProvider::Auto
                            || scope
                                .state
                                .model_catalogs
                                .status_for(router.provider(), account)
                                .routable_models()
                                .contains(&upstream))
                },
            ),
        )
        .await;
        let Ok(Ok(mut next)) = next else {
            break;
        };
        let client = router
            .http_client(&next.name, CookieMode::None)
            .map_err(UpstreamSendError::Egress)?;
        let token = tokio::time::timeout_at(
            tokio::time::Instant::from_std(deadline),
            scope.state.subscription_cache.get_fresh_loaded(
                &client,
                router.provider(),
                &next.name,
                next.token.clone(),
                crate::operation_context::now().timestamp_millis(),
            ),
        )
        .await;
        let Ok(Ok(token)) = token else {
            break;
        };
        next.token = token;
        crate::proxy::note_failover(
            &scope.state,
            correlation,
            attempt,
            Some(&selected.name),
            retry_reason,
        );
        selected = next;
    }
    last_response.ok_or_else(|| {
        UpstreamSendError::Egress("no eligible account within the request retry budget".into())
    })
}

fn replay_model(
    router: &crate::accounts::AccountRouter,
    account: &str,
    requested: &str,
    native: &str,
) -> Option<String> {
    let resolved = router.upstream_model(account, requested)?;
    if resolved == requested && native != requested {
        (!router.routing_policy(account).ok()?.excluded(native)).then(|| native.to_string())
    } else {
        Some(resolved)
    }
}

fn prepare(
    request: &mut reqwest::Request,
    model: &str,
    moved: bool,
    limit: usize,
) -> Result<(), UpstreamSendError> {
    let Some(bytes) = request.body().and_then(reqwest::Body::as_bytes) else {
        return Ok(());
    };
    let zstd = request
        .headers()
        .get("content-encoding")
        .is_some_and(|v| v == "zstd");
    let decoded = if zstd {
        use std::io::Read as _;
        let reader = zstd::stream::read::Decoder::new(bytes)
            .map_err(|e| UpstreamSendError::Egress(e.to_string()))?;
        let mut decoded = Vec::new();
        reader
            .take(limit as u64 + 1)
            .read_to_end(&mut decoded)
            .map_err(|e| UpstreamSendError::Egress(e.to_string()))?;
        if decoded.len() > limit {
            return Err(UpstreamSendError::Egress(
                "replayed body exceeds request limit".into(),
            ));
        }
        decoded
    } else {
        bytes.to_vec()
    };
    let Ok(mut body) = serde_json::from_slice::<Value>(&decoded) else {
        return Ok(());
    };
    let original = body.clone();
    if body.get("model").is_some() {
        body["model"] = Value::String(model.to_string());
    }
    if moved {
        crate::pool_failover::strip_anthropic_thinking(&mut body);
        crate::pool_failover::strip_codex_encrypted_reasoning(&mut body);
    }
    if original == body {
        return Ok(());
    }
    let mut bytes =
        serde_json::to_vec(&body).map_err(|e| UpstreamSendError::Egress(e.to_string()))?;
    if zstd {
        bytes = zstd::encode_all(bytes.as_slice(), 0)
            .map_err(|e| UpstreamSendError::Egress(e.to_string()))?;
    }
    *request.body_mut() = Some(bytes.into());
    request.headers_mut().remove("content-length");
    Ok(())
}

/// Inspect only a bounded prefix, preserving every byte and any transport error.
async fn peek(response: reqwest::Response, deadline: Instant) -> (reqwest::Response, Bytes) {
    let status = response.status();
    let headers = response.headers().clone();
    let version = response.version();
    let url = response.url().clone();
    let mut stream = response.bytes_stream().boxed();
    let mut prefix = BytesMut::new();
    let mut rest = Vec::new();
    while prefix.len() < MAX_ERROR_BYTES {
        let Ok(next) =
            tokio::time::timeout_at(tokio::time::Instant::from_std(deadline), stream.next()).await
        else {
            break;
        };
        match next {
            Some(Ok(chunk)) => {
                let take = chunk.len().min(MAX_ERROR_BYTES - prefix.len());
                prefix.extend_from_slice(&chunk[..take]);
                if take < chunk.len() {
                    rest.push(Ok(chunk.slice(take..)));
                }
            }
            Some(Err(error)) => {
                rest.push(Err(error));
                break;
            }
            None => break,
        }
    }
    let prefix = prefix.freeze();
    let body = reqwest::Body::wrap_stream(
        stream::iter([Ok::<_, reqwest::Error>(prefix.clone())])
            .chain(stream::iter(rest))
            .chain(stream),
    );
    let mut response = http::Response::builder()
        .status(status)
        .version(version)
        .url(url)
        .body(body)
        .expect("valid upstream status");
    *response.headers_mut() = headers;
    (response.into(), prefix)
}
