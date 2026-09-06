//! Capture provider-owned resource identities before exposing stored creates.

#![allow(clippy::redundant_pub_crate)]

use axum::body::{Body, Bytes};
use axum::http::{HeaderMap, HeaderValue, StatusCode};
use axum::response::Response;
use futures_util::StreamExt;

use crate::app_state::AppState;
use crate::response_affinity::{AffinityDestination, ResponseNamespace, ResponseOwner};

const MAX_BUFFERED_ID_PREFIX: usize = 1024 * 1024;
const MAX_BUFFERED_JSON_RESPONSE: usize = 32 * 1024 * 1024;

#[derive(Clone)]
pub(crate) struct CaptureContext {
    namespace: ResponseNamespace,
    owner: ResponseOwner,
    destination: AffinityDestination,
    parent_id: Option<String>,
}

impl CaptureContext {
    pub(crate) const fn native(
        namespace: ResponseNamespace,
        owner: ResponseOwner,
        destination: AffinityDestination,
        parent_id: Option<String>,
    ) -> Self {
        Self {
            namespace,
            owner,
            destination,
            parent_id,
        }
    }
}

pub(crate) async fn prepare(
    state: &AppState,
    headers: &HeaderMap,
    namespace: ResponseNamespace,
) -> Result<CaptureContext, Response> {
    let claims = crate::proxy::authenticate_client_error(state, headers)
        .map_err(|error| error.render(crate::api_error::ApiDialect::OpenAi))?;
    let owner = ResponseOwner::from_claims(&claims)
        .map_err(|message| openai_error(StatusCode::FORBIDDEN, "permission_error", &message))?;
    let destination = destination_for_claims(state, &claims).await?;
    Ok(CaptureContext {
        namespace,
        owner,
        destination,
        parent_id: None,
    })
}

pub(crate) async fn destination_for_claims(
    state: &AppState,
    claims: &crate::token::TokenClaims,
) -> Result<AffinityDestination, Response> {
    if state.upstream_provider == crate::config::UpstreamProvider::OpenAICompatible {
        let provider = crate::provider_proxy::resolve_openai_compatible_provider(state)
            .map_err(|error| unavailable(&format!("provider lookup failed: {error}")))?;
        return Ok(AffinityDestination::StoredProvider {
            name: provider.name,
            provider_kind: provider.kind,
            base_url: provider.base_url,
        });
    }
    let Some(provider) = state.upstream_provider.subscription_provider() else {
        return Err(openai_error(
            StatusCode::BAD_REQUEST,
            "invalid_request_error",
            "the selected provider does not support persistent response resources",
        ));
    };
    let pin = state
        .token_manager
        .account_for(&claims.sub)
        .map_err(|error| unavailable(&format!("failed to resolve account binding: {error}")))?;
    let account = match (state.account_router.as_ref(), pin) {
        (Some(router), Some(account)) if router.provider() == provider => account,
        (Some(_), Some(_)) => {
            return Err(unavailable(
                "the token account is not configured for the selected subscription",
            ));
        }
        (Some(_), None) => {
            return Err(openai_error(
                StatusCode::CONFLICT,
                "invalid_request_error",
                "stored resources require an exact subscription account binding",
            ));
        }
        (None, Some(account)) if account != crate::credential_recovery_store::PRIMARY_ACCOUNT => {
            return Err(unavailable(
                "the token's bound subscription account is unavailable",
            ));
        }
        (None, _) => crate::credential_recovery_store::PRIMARY_ACCOUNT.to_string(),
    };
    crate::responses_lifecycle::register_exact_reader(state, provider, &account);
    let token = state
        .subscription_cache
        .load_authoritative(provider, &account)
        .await
        .map_err(|_| unavailable("the exact subscription account is unavailable"))?
        .ok_or_else(|| unavailable("the exact subscription account is unavailable"))?;
    let token = state
        .subscription_cache
        .get_fresh_loaded(
            &state.client,
            provider,
            &account,
            token,
            chrono::Utc::now().timestamp_millis(),
        )
        .await
        .map_err(|_| unavailable("the exact subscription account cannot refresh"))?;
    let base_url = state
        .subscription_base_url
        .clone()
        .unwrap_or_else(|| token.base_url(provider));
    Ok(AffinityDestination::Subscription {
        provider,
        account,
        upstream_account_id: token.account_id,
        base_url,
    })
}

pub(crate) fn pin_state(
    state: &AppState,
    affinity: &crate::response_affinity::ResponseAffinity,
) -> Result<AppState, Response> {
    let mut pinned = state.clone();
    match &affinity.destination {
        AffinityDestination::StoredProvider {
            name,
            provider_kind,
            base_url,
        } => {
            let provider = state
                .provider_store
                .resolve(name)
                .map_err(|error| unavailable(&format!("provider lookup failed: {error}")))?
                .or_else(|| {
                    (state.openai_compatible.provider_name == *name)
                        .then(|| state.openai_compatible.resolve())
                })
                .filter(|provider| {
                    provider.kind == *provider_kind && provider.base_url == *base_url
                })
                .ok_or_else(|| unavailable("the response's exact provider is unavailable"))?;
            pinned.upstream_provider = crate::config::UpstreamProvider::OpenAICompatible;
            pinned.openai_compatible.provider_name = provider.name;
        }
        AffinityDestination::Subscription { provider, .. } => {
            pinned.upstream_provider = match provider {
                crate::subscription::SubscriptionProvider::Claude => {
                    crate::config::UpstreamProvider::Anthropic
                }
                crate::subscription::SubscriptionProvider::Codex => {
                    crate::config::UpstreamProvider::Codex
                }
                crate::subscription::SubscriptionProvider::Gemini => {
                    crate::config::UpstreamProvider::Gemini
                }
                crate::subscription::SubscriptionProvider::Qwen => {
                    crate::config::UpstreamProvider::Qwen
                }
            };
        }
    }
    Ok(pinned)
}

pub(crate) async fn capture(
    state: &AppState,
    context: CaptureContext,
    response: Response,
) -> Response {
    capture_with_json_fields(state, context, response, &["id"]).await
}

pub(crate) async fn capture_with_json_fields(
    state: &AppState,
    context: CaptureContext,
    response: Response,
    id_fields: &[&str],
) -> Response {
    if !response.status().is_success() {
        return response;
    }
    let event_stream = response
        .headers()
        .get("content-type")
        .and_then(|value| value.to_str().ok())
        .is_some_and(|value| value.to_ascii_lowercase().contains("text/event-stream"));
    if event_stream {
        return capture_stream(state, context, response).await;
    }
    let (parts, body) = response.into_parts();
    let bytes = match axum::body::to_bytes(body, MAX_BUFFERED_JSON_RESPONSE).await {
        Ok(bytes) => bytes,
        Err(error) => return upstream_error(&format!("stored response is too large: {error}")),
    };
    let Some(response_id) =
        json_id_from_fields(&bytes, id_fields).or_else(|| location_id(&parts.headers))
    else {
        return upstream_error("stored response did not include a resource id");
    };
    if let Err(error) = record_context(state, context, &response_id) {
        return affinity_error(&error);
    }
    Response::from_parts(parts, Body::from(bytes))
}

async fn capture_stream(state: &AppState, context: CaptureContext, response: Response) -> Response {
    let (parts, body) = response.into_parts();
    let mut source = body.into_data_stream();
    let mut held = Vec::new();
    let mut framed = Vec::new();
    let response_id = loop {
        let Some(chunk) = source.next().await else {
            return upstream_error("stored stream ended before exposing a resource id");
        };
        let bytes = match chunk {
            Ok(bytes) => bytes,
            Err(error) => return upstream_error(&format!("upstream stream failed: {error}")),
        };
        held.extend_from_slice(&bytes);
        let blocks = crate::sse::push_blocks(&mut framed, &bytes);
        if let Some(response_id) = blocks.iter().find_map(|block| sse_id(block)) {
            break response_id;
        }
        if held.len() > MAX_BUFFERED_ID_PREFIX {
            return upstream_error("stored stream did not expose a bounded resource id");
        }
    };
    if let Err(error) = record_context(state, context, &response_id) {
        return affinity_error(&error);
    }
    let prefix = futures_util::stream::once(async move { Ok::<_, axum::Error>(Bytes::from(held)) });
    let stream = prefix.chain(source);
    Response::from_parts(parts, Body::from_stream(stream))
}

#[cfg(test)]
fn json_id(bytes: &[u8]) -> Option<String> {
    json_id_from_fields(bytes, &["id"])
}

fn json_id_from_fields(bytes: &[u8], fields: &[&str]) -> Option<String> {
    let value = serde_json::from_slice::<serde_json::Value>(bytes).ok()?;
    fields.iter().find_map(|field| {
        value
            .get(*field)?
            .as_str()
            .filter(|id| !id.is_empty())
            .map(str::to_string)
    })
}

fn location_id(headers: &HeaderMap) -> Option<String> {
    let location = headers.get("location")?.to_str().ok()?;
    let path = location.split('?').next()?.trim_end_matches('/');
    path.rsplit('/')
        .next()
        .filter(|id| !id.is_empty())
        .map(str::to_string)
}

fn record_context(
    state: &AppState,
    context: CaptureContext,
    response_id: &str,
) -> Result<crate::response_affinity::RecordOutcome, crate::response_affinity::StoreError> {
    let store = state.provider_store.response_affinities();
    if let Some(parent_id) = context.parent_id {
        store.record_child(
            context.namespace,
            response_id,
            &parent_id,
            context.owner,
            context.destination,
        )
    } else {
        store.record(
            context.namespace,
            response_id,
            context.owner,
            context.destination,
        )
    }
}

fn sse_id(block: &str) -> Option<String> {
    block.lines().find_map(|line| {
        let payload = line.strip_prefix("data:")?.trim();
        let value = serde_json::from_str::<serde_json::Value>(payload).ok()?;
        value
            .get("id")
            .or_else(|| value.pointer("/response/id"))
            .and_then(serde_json::Value::as_str)
            .filter(|id| !id.is_empty())
            .map(str::to_string)
    })
}

fn affinity_error(error: &impl std::fmt::Display) -> Response {
    openai_error(
        StatusCode::SERVICE_UNAVAILABLE,
        "api_error",
        &format!("could not persist resource ownership: {error}"),
    )
}

fn unavailable(message: &str) -> Response {
    openai_error(StatusCode::SERVICE_UNAVAILABLE, "api_error", message)
}

fn upstream_error(message: &str) -> Response {
    openai_error(StatusCode::BAD_GATEWAY, "api_error", message)
}

fn openai_error(status: StatusCode, error_type: &str, message: &str) -> Response {
    let body = serde_json::json!({
        "error": {
            "message": message,
            "type": error_type,
            "param": serde_json::Value::Null,
            "code": serde_json::Value::Null,
        }
    });
    let mut response = Response::new(Body::from(
        serde_json::to_vec(&body).expect("JSON values always serialize"),
    ));
    *response.status_mut() = status;
    response
        .headers_mut()
        .insert("content-type", HeaderValue::from_static("application/json"));
    response
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn ids_are_found_in_json_and_both_stream_shapes() {
        assert_eq!(json_id(br#"{"id":"resp_1"}"#).as_deref(), Some("resp_1"));
        assert_eq!(
            sse_id("event: response.created\ndata: {\"response\":{\"id\":\"resp_2\"}}").as_deref(),
            Some("resp_2")
        );
        assert_eq!(
            sse_id("data: {\"id\":\"chatcmpl-3\",\"choices\":[]}").as_deref(),
            Some("chatcmpl-3")
        );
    }
}
