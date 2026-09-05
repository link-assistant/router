//! Stored `OpenAI Responses` resource lifecycle proxying.

use axum::body::{Body, Bytes};
use axum::extract::{OriginalUri, Path, Request, State};
use axum::http::{HeaderMap, HeaderValue, Method, StatusCode, Uri};
use axum::response::{IntoResponse, Response};

use crate::app_state::AppState;
use crate::response_affinity::{
    AffinityDestination, ResponseAffinity, ResponseNamespace, ResponseOwner,
};
use crate::subscription::{SubscriptionProvider, SubscriptionToken};

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
enum Operation {
    Retrieve,
    Delete,
    Cancel,
    InputItems,
}

impl Operation {
    const fn suffix(self) -> &'static str {
        match self {
            Self::Retrieve | Self::Delete => "",
            Self::Cancel => "/cancel",
            Self::InputItems => "/input_items",
        }
    }
}

pub async fn retrieve(
    State(state): State<AppState>,
    Path(response_id): Path<String>,
    OriginalUri(uri): OriginalUri,
    request: Request,
) -> Response {
    forward(state, response_id, uri, request, Operation::Retrieve).await
}

pub async fn delete(
    State(state): State<AppState>,
    Path(response_id): Path<String>,
    OriginalUri(uri): OriginalUri,
    request: Request,
) -> Response {
    forward(state, response_id, uri, request, Operation::Delete).await
}

pub async fn cancel(
    State(state): State<AppState>,
    Path(response_id): Path<String>,
    OriginalUri(uri): OriginalUri,
    request: Request,
) -> Response {
    forward(state, response_id, uri, request, Operation::Cancel).await
}

pub async fn input_items(
    State(state): State<AppState>,
    Path(response_id): Path<String>,
    OriginalUri(uri): OriginalUri,
    request: Request,
) -> Response {
    forward(state, response_id, uri, request, Operation::InputItems).await
}

async fn forward(
    state: AppState,
    response_id: String,
    uri: Uri,
    request: Request,
    operation: Operation,
) -> Response {
    let claims = match crate::proxy::authenticate_client_error(&state, request.headers()) {
        Ok(claims) => claims,
        Err(error) => return error.render(crate::api_error::ApiDialect::OpenAi),
    };
    let owner = match ResponseOwner::from_claims(&claims) {
        Ok(owner) => owner,
        Err(error) => return openai_error(StatusCode::FORBIDDEN, "permission_error", &error),
    };
    let Some(namespace) = ResponseNamespace::from_path(uri.path()) else {
        return response_not_found();
    };
    let affinity =
        match state
            .provider_store
            .response_affinities()
            .lookup(namespace, &response_id, &owner)
        {
            Ok(Some(affinity)) => affinity,
            Ok(None) => return response_not_found(),
            Err(error) => return affinity_storage_error(&error),
        };
    let (parts, body) = request.into_parts();
    let body = match axum::body::to_bytes(body, state.max_proxy_request_bytes).await {
        Ok(body) => body,
        Err(error) => {
            return openai_error(
                StatusCode::PAYLOAD_TOO_LARGE,
                "invalid_request_error",
                &format!("request body exceeds the proxy limit: {error}"),
            );
        }
    };
    let upstream_path = upstream_path(&response_id, operation, uri.query());
    let correlation_id = crate::request_log::correlation_id(&parts.headers);
    let outcome = match &affinity.destination {
        AffinityDestination::StoredProvider {
            name,
            provider_kind,
            base_url,
        } => forward_stored_provider(
            &state,
            &claims,
            &parts.method,
            &parts.headers,
            &body,
            uri.path(),
            &upstream_path,
            name,
            *provider_kind,
            base_url,
            &correlation_id,
        )
        .await
        .map(|response| (response, None)),
        AffinityDestination::Subscription {
            provider,
            account,
            upstream_account_id,
            base_url,
        } => forward_subscription(
            &state,
            &claims,
            &parts.method,
            &parts.headers,
            &body,
            uri.path(),
            &upstream_path,
            *provider,
            account,
            upstream_account_id.as_deref(),
            base_url,
            &correlation_id,
        )
        .await
        .map(|response| (response, Some(account.clone()))),
    };
    let (upstream, account) = match outcome {
        Ok(outcome) => outcome,
        Err(response) => return response,
    };
    relay(
        &state,
        affinity,
        operation,
        upstream,
        account.as_deref(),
        body.len() as u64,
        &correlation_id,
    )
    .await
}

#[allow(clippy::too_many_arguments)]
async fn forward_stored_provider(
    state: &AppState,
    claims: &crate::token::TokenClaims,
    method: &Method,
    headers: &HeaderMap,
    body: &Bytes,
    client_path: &str,
    upstream_path: &str,
    name: &str,
    expected_kind: crate::providers::ProviderKind,
    expected_base_url: &str,
    correlation_id: &str,
) -> Result<reqwest::Response, Response> {
    let provider = state
        .provider_store
        .resolve(name)
        .map_err(|error| unavailable(&format!("provider lookup failed: {error}")))?
        .or_else(|| {
            (state.openai_compatible.provider_name == name)
                .then(|| state.openai_compatible.resolve())
        })
        .filter(|provider| provider.kind == expected_kind && provider.base_url == expected_base_url)
        .ok_or_else(|| unavailable("the response's exact provider is no longer available"))?;
    let (client, _) = crate::client_policy::bound_client(claims)
        .map_err(|error| openai_error(StatusCode::FORBIDDEN, "permission_error", &error))?;
    if !provider.supports_client(client)
        || !crate::client_policy::request_evidence(
            client,
            crate::client_policy::ClientProtocol::OpenAIResponses,
            client_path,
            headers,
        )
    {
        return Err(openai_error(
            StatusCode::FORBIDDEN,
            "permission_error",
            "the stored provider has no tested adapter for this signed client request",
        ));
    }
    let api_key = provider
        .api_key
        .as_deref()
        .ok_or_else(|| unavailable("the response's provider credential is unavailable"))?;
    let request = state
        .client
        .request(
            reqwest::Method::from_bytes(method.as_str().as_bytes())
                .expect("HTTP methods accepted by axum are valid for reqwest"),
            crate::provider_proxy::join_openai_compatible_url(&provider.base_url, upstream_path),
        )
        .headers(crate::proxy::native_request_headers(headers, api_key))
        .body(body.clone());
    state
        .request_log
        .send_upstream(correlation_id, &state.client, request)
        .await
        .map_err(|error| upstream_error(&format!("provider request failed: {error}")))
}

#[allow(clippy::too_many_arguments)]
async fn forward_subscription(
    state: &AppState,
    claims: &crate::token::TokenClaims,
    method: &Method,
    headers: &HeaderMap,
    body: &Bytes,
    client_path: &str,
    upstream_path: &str,
    provider: SubscriptionProvider,
    account: &str,
    expected_account_id: Option<&str>,
    expected_base_url: &str,
    correlation_id: &str,
) -> Result<reqwest::Response, Response> {
    crate::client_policy::enforce_subscription_for_claims(
        state,
        claims,
        headers,
        provider,
        crate::client_policy::ClientProtocol::OpenAIResponses,
        client_path,
    )?;
    let pinned = state
        .token_manager
        .account_for(&claims.sub)
        .map_err(|error| unavailable(&format!("failed to resolve account binding: {error}")))?;
    if pinned
        .as_deref()
        .unwrap_or(crate::credential_recovery_store::PRIMARY_ACCOUNT)
        != account
    {
        return Err(response_not_found());
    }
    register_exact_reader(state, provider, account);
    let token = state
        .subscription_cache
        .load_authoritative(provider, account)
        .await
        .map_err(|_| unavailable("the response's exact subscription account is unavailable"))?
        .ok_or_else(|| unavailable("the response's exact subscription account is unavailable"))?;
    let token = state
        .subscription_cache
        .get_fresh_loaded(
            &state.client,
            provider,
            account,
            token,
            chrono::Utc::now().timestamp_millis(),
        )
        .await
        .map_err(|_| unavailable("the response's exact subscription account cannot refresh"))?;
    verify_subscription_destination(
        state,
        provider,
        &token,
        expected_account_id,
        expected_base_url,
    )?;
    let url = crate::subscription_proxy::join_subscription_url(
        provider,
        expected_base_url,
        upstream_path,
    );
    let build = |token: &SubscriptionToken| {
        let mut native = crate::proxy::native_request_headers(headers, &token.access_token);
        if provider == SubscriptionProvider::Codex
            && let Some(account_id) = token.account_id.as_deref()
            && let Ok(value) = HeaderValue::from_str(account_id)
        {
            native.insert("chatgpt-account-id", value);
        }
        state
            .client
            .request(
                reqwest::Method::from_bytes(method.as_str().as_bytes())
                    .expect("HTTP methods accepted by axum are valid for reqwest"),
                &url,
            )
            .headers(native)
            .body(body.clone())
    };
    let mut response = state
        .request_log
        .send_upstream(correlation_id, &state.client, build(&token))
        .await
        .map_err(|error| upstream_error(&format!("subscription request failed: {error}")))?;
    if response.status() == reqwest::StatusCode::UNAUTHORIZED
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
        verify_subscription_destination(
            state,
            provider,
            &refreshed,
            expected_account_id,
            expected_base_url,
        )?;
        response = state
            .request_log
            .send_upstream(correlation_id, &state.client, build(&refreshed))
            .await
            .map_err(|error| upstream_error(&format!("subscription retry failed: {error}")))?;
    }
    Ok(response)
}

pub(crate) fn register_exact_reader(
    state: &AppState,
    provider: SubscriptionProvider,
    account: &str,
) {
    if let Some(router) = state
        .account_router
        .as_ref()
        .filter(|router| router.provider() == provider)
    {
        for (candidate, reader) in router.subscription_readers() {
            if candidate == account {
                state.subscription_cache.register_reader(account, &reader);
            }
        }
    } else if account == crate::credential_recovery_store::PRIMARY_ACCOUNT
        && let Some(reader) = state
            .subscription_readers
            .iter()
            .find(|reader| reader.provider() == provider)
            .or_else(|| {
                state
                    .subscription_reader
                    .as_ref()
                    .filter(|reader| reader.provider() == provider)
            })
    {
        state.subscription_cache.register_reader(account, reader);
    }
}

fn verify_subscription_destination(
    state: &AppState,
    provider: SubscriptionProvider,
    token: &SubscriptionToken,
    expected_account_id: Option<&str>,
    expected_base_url: &str,
) -> Result<(), Response> {
    let base_url = state
        .subscription_base_url
        .clone()
        .unwrap_or_else(|| token.base_url(provider));
    if base_url != expected_base_url || token.account_id.as_deref() != expected_account_id {
        return Err(unavailable(
            "the response's exact subscription destination has changed",
        ));
    }
    Ok(())
}

async fn relay(
    state: &AppState,
    affinity: ResponseAffinity,
    operation: Operation,
    upstream: reqwest::Response,
    account: Option<&str>,
    bytes_sent: u64,
    correlation_id: &str,
) -> Response {
    let status = StatusCode::from_u16(upstream.status().as_u16())
        .unwrap_or(StatusCode::INTERNAL_SERVER_ERROR);
    let headers = crate::proxy::relay_response_headers(upstream.headers());
    let body = match upstream.bytes().await {
        Ok(body) => body,
        Err(error) => return upstream_error(&format!("upstream body read failed: {error}")),
    };
    state
        .request_log
        .record_upstream_body(correlation_id, &body);
    state.metrics.record_request(
        crate::metrics::Surface::OpenAIResponses,
        status.as_u16(),
        account,
    );
    state.metrics.record_bytes(bytes_sent, body.len() as u64);
    if matches!(status, StatusCode::NOT_FOUND | StatusCode::GONE) {
        let _ = state
            .provider_store
            .response_affinities()
            .remove_if_matches(&affinity);
        return response_not_found();
    }
    if operation == Operation::Delete
        && status.is_success()
        && let Err(error) = state
            .provider_store
            .response_affinities()
            .remove_if_matches(&affinity)
    {
        return affinity_storage_error(&error);
    }
    let mut response = Response::new(Body::from(body));
    *response.status_mut() = status;
    *response.headers_mut() = headers;
    response
}

fn upstream_path(response_id: &str, operation: Operation, query: Option<&str>) -> String {
    let encoded_id = percent_encode_segment(response_id);
    let query = query.map_or(String::new(), |query| format!("?{query}"));
    format!("/v1/responses/{encoded_id}{}{query}", operation.suffix())
}

pub(crate) fn percent_encode_segment(segment: &str) -> String {
    const HEX: &[u8; 16] = b"0123456789ABCDEF";
    let mut encoded = String::with_capacity(segment.len());
    for byte in segment.bytes() {
        if byte.is_ascii_alphanumeric() || matches!(byte, b'-' | b'.' | b'_' | b'~') {
            encoded.push(char::from(byte));
        } else {
            encoded.push('%');
            encoded.push(char::from(HEX[(byte >> 4) as usize]));
            encoded.push(char::from(HEX[(byte & 0x0f) as usize]));
        }
    }
    encoded
}

pub(crate) fn response_not_found() -> Response {
    (
        StatusCode::NOT_FOUND,
        axum::Json(serde_json::json!({
            "error": {
                "message": "Response not found",
                "type": "invalid_request_error",
                "param": serde_json::Value::Null,
                "code": "response_not_found",
            }
        })),
    )
        .into_response()
}

fn affinity_storage_error(error: &impl std::fmt::Display) -> Response {
    openai_error(
        StatusCode::SERVICE_UNAVAILABLE,
        "api_error",
        &format!("response affinity is unavailable: {error}"),
    )
}

fn unavailable(message: &str) -> Response {
    openai_error(StatusCode::SERVICE_UNAVAILABLE, "api_error", message)
}

fn upstream_error(message: &str) -> Response {
    openai_error(StatusCode::BAD_GATEWAY, "api_error", message)
}

fn openai_error(status: StatusCode, error_type: &str, message: &str) -> Response {
    crate::api_error::PresentedError {
        status,
        error_type,
        message,
    }
    .render(crate::api_error::ApiDialect::OpenAi)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn response_id_is_encoded_as_one_path_segment_and_query_is_unchanged() {
        assert_eq!(
            upstream_path(
                "resp.?#+:% unicode",
                Operation::InputItems,
                Some("include[]=message.input_image&limit=20")
            ),
            "/v1/responses/resp.%3F%23%2B%3A%25%20unicode/input_items?include[]=message.input_image&limit=20"
        );
    }
}
