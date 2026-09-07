//! Authenticated native `OpenAI` Conversations and conversation-items lifecycle.

use axum::body::{Body, Bytes};
use axum::extract::{OriginalUri, Path, Request, State};
use axum::http::{HeaderMap, Method, StatusCode, Uri};
use axum::response::{IntoResponse, Response};
use futures_util::StreamExt;

use crate::app_state::AppState;
use crate::response_affinity::{
    AffinityDestination, ResponseAffinity, ResponseNamespace, ResponseOwner,
};

struct Forwarded {
    status: StatusCode,
    headers: HeaderMap,
    body: Bytes,
}

pub async fn create(
    State(state): State<AppState>,
    OriginalUri(uri): OriginalUri,
    request: Request,
) -> Response {
    let (claims, owner) = match authenticate(&state, request.headers()) {
        Ok(authenticated) => authenticated,
        Err(response) => return response,
    };
    let Some((conversation_namespace, _)) = ResponseNamespace::conversations_from_path(uri.path())
    else {
        return conversation_not_found();
    };
    if conversation_namespace == ResponseNamespace::QwenConversations {
        return unsupported();
    }
    let destination = match crate::resource_capture::destination_for_claims(&state, &claims).await {
        Ok(destination) if destination_matches(conversation_namespace, &destination) => destination,
        Ok(_) => return unsupported(),
        Err(response) => return response,
    };
    let (parts, body) = request.into_parts();
    let body = match bounded_request_body(&state, body).await {
        Ok(body) => body,
        Err(response) => return response,
    };
    let upstream_path = with_query("/v1/conversations", &uri);
    let forwarded = match forward(
        &state,
        &claims,
        &parts.method,
        &parts.headers,
        &body,
        uri.path(),
        &upstream_path,
        &destination,
    )
    .await
    {
        Ok(forwarded) => forwarded,
        Err(response) => return response,
    };
    if forwarded.status.is_success() {
        let Some(conversation_id) = root_id(&forwarded.body) else {
            return upstream_error("conversation create response did not contain an id");
        };
        if let Err(error) = state.provider_store.response_affinities().record(
            conversation_namespace,
            &conversation_id,
            owner,
            destination,
        ) {
            return affinity_error(&error);
        }
    }
    native_response(forwarded)
}

pub async fn conversation(
    State(state): State<AppState>,
    Path(conversation_id): Path<String>,
    OriginalUri(uri): OriginalUri,
    request: Request,
) -> Response {
    let (claims, owner) = match authenticate(&state, request.headers()) {
        Ok(authenticated) => authenticated,
        Err(response) => return response,
    };
    let Some((conversation_namespace, item_namespace)) =
        ResponseNamespace::conversations_from_path(uri.path())
    else {
        return conversation_not_found();
    };
    if conversation_namespace == ResponseNamespace::QwenConversations {
        return unsupported();
    }
    let affinity = match lookup(
        &state,
        conversation_namespace,
        &conversation_id,
        &owner,
        conversation_not_found,
    ) {
        Ok(affinity) => affinity,
        Err(response) => return response,
    };
    if !matches!(
        request.method(),
        &Method::GET | &Method::PATCH | &Method::DELETE
    ) {
        return method_not_allowed();
    }
    let (parts, body) = request.into_parts();
    let body = match bounded_request_body(&state, body).await {
        Ok(body) => body,
        Err(response) => return response,
    };
    let path = format!(
        "/v1/conversations/{}",
        crate::responses_lifecycle::percent_encode_segment(&conversation_id)
    );
    let forwarded = match forward(
        &state,
        &claims,
        &parts.method,
        &parts.headers,
        &body,
        uri.path(),
        &with_query(&path, &uri),
        &affinity.destination,
    )
    .await
    {
        Ok(forwarded) => forwarded,
        Err(response) => return response,
    };
    if matches!(forwarded.status, StatusCode::NOT_FOUND | StatusCode::GONE) {
        let _ = remove_conversation(&state, &affinity, item_namespace);
        return conversation_not_found();
    }
    if parts.method == Method::DELETE
        && forwarded.status.is_success()
        && let Err(response) = remove_conversation(&state, &affinity, item_namespace)
    {
        return response;
    }
    native_response(forwarded)
}

pub async fn items(
    State(state): State<AppState>,
    Path(conversation_id): Path<String>,
    OriginalUri(uri): OriginalUri,
    request: Request,
) -> Response {
    let (claims, owner) = match authenticate(&state, request.headers()) {
        Ok(authenticated) => authenticated,
        Err(response) => return response,
    };
    let Some((conversation_namespace, item_namespace)) =
        ResponseNamespace::conversations_from_path(uri.path())
    else {
        return conversation_not_found();
    };
    if conversation_namespace == ResponseNamespace::QwenConversations {
        return unsupported();
    }
    let affinity = match lookup(
        &state,
        conversation_namespace,
        &conversation_id,
        &owner,
        conversation_not_found,
    ) {
        Ok(affinity) => affinity,
        Err(response) => return response,
    };
    if !matches!(request.method(), &Method::GET | &Method::POST) {
        return method_not_allowed();
    }
    let (parts, body) = request.into_parts();
    let body = match bounded_request_body(&state, body).await {
        Ok(body) => body,
        Err(response) => return response,
    };
    let path = format!(
        "/v1/conversations/{}/items",
        crate::responses_lifecycle::percent_encode_segment(&conversation_id)
    );
    let forwarded = match forward(
        &state,
        &claims,
        &parts.method,
        &parts.headers,
        &body,
        uri.path(),
        &with_query(&path, &uri),
        &affinity.destination,
    )
    .await
    {
        Ok(forwarded) => forwarded,
        Err(response) => return response,
    };
    if matches!(forwarded.status, StatusCode::NOT_FOUND | StatusCode::GONE) {
        let _ = remove_conversation(&state, &affinity, item_namespace);
        return conversation_not_found();
    }
    if forwarded.status.is_success() {
        for item_id in list_ids(&forwarded.body) {
            if let Err(error) = state.provider_store.response_affinities().record_child(
                item_namespace,
                &item_id,
                &conversation_id,
                owner.clone(),
                affinity.destination.clone(),
            ) {
                return affinity_error(&error);
            }
        }
    }
    native_response(forwarded)
}

pub async fn item(
    State(state): State<AppState>,
    Path((conversation_id, item_id)): Path<(String, String)>,
    OriginalUri(uri): OriginalUri,
    request: Request,
) -> Response {
    let (claims, owner) = match authenticate(&state, request.headers()) {
        Ok(authenticated) => authenticated,
        Err(response) => return response,
    };
    let Some((conversation_namespace, item_namespace)) =
        ResponseNamespace::conversations_from_path(uri.path())
    else {
        return item_not_found();
    };
    if conversation_namespace == ResponseNamespace::QwenConversations {
        return unsupported();
    }
    let conversation = match lookup(
        &state,
        conversation_namespace,
        &conversation_id,
        &owner,
        conversation_not_found,
    ) {
        Ok(affinity) => affinity,
        Err(response) => return response,
    };
    let item = match lookup(&state, item_namespace, &item_id, &owner, item_not_found) {
        Ok(affinity)
            if affinity.parent_id.as_deref() == Some(conversation_id.as_str())
                && affinity.destination == conversation.destination =>
        {
            affinity
        }
        Ok(_) => return item_not_found(),
        Err(response) => return response,
    };
    if !matches!(request.method(), &Method::GET | &Method::DELETE) {
        return method_not_allowed();
    }
    let (parts, body) = request.into_parts();
    let body = match bounded_request_body(&state, body).await {
        Ok(body) => body,
        Err(response) => return response,
    };
    let path = format!(
        "/v1/conversations/{}/items/{}",
        crate::responses_lifecycle::percent_encode_segment(&conversation_id),
        crate::responses_lifecycle::percent_encode_segment(&item_id)
    );
    let forwarded = match forward(
        &state,
        &claims,
        &parts.method,
        &parts.headers,
        &body,
        uri.path(),
        &with_query(&path, &uri),
        &item.destination,
    )
    .await
    {
        Ok(forwarded) => forwarded,
        Err(response) => return response,
    };
    if matches!(forwarded.status, StatusCode::NOT_FOUND | StatusCode::GONE) {
        let _ = state
            .provider_store
            .response_affinities()
            .remove_if_matches(&item);
        return item_not_found();
    }
    if parts.method == Method::DELETE
        && forwarded.status.is_success()
        && let Err(error) = state
            .provider_store
            .response_affinities()
            .remove_if_matches(&item)
    {
        return affinity_error(&error);
    }
    native_response(forwarded)
}

fn authenticate(
    state: &AppState,
    headers: &HeaderMap,
) -> Result<(crate::token::TokenClaims, ResponseOwner), Response> {
    let claims = crate::proxy::authenticate_client_error(state, headers)
        .map_err(|error| error.render(crate::api_error::ApiDialect::OpenAi))?;
    let owner = ResponseOwner::from_claims(&claims)
        .map_err(|error| openai_error(StatusCode::FORBIDDEN, "permission_error", &error))?;
    Ok((claims, owner))
}

const fn destination_matches(
    namespace: ResponseNamespace,
    destination: &AffinityDestination,
) -> bool {
    matches!(
        (namespace, destination),
        (
            ResponseNamespace::OpenAiConversations,
            AffinityDestination::StoredProvider {
                provider_kind: crate::providers::ProviderKind::OpenAICompatible,
                ..
            }
        ) | (
            ResponseNamespace::CodexConversations,
            AffinityDestination::Subscription {
                provider: crate::subscription::SubscriptionProvider::Codex,
                ..
            }
        )
    )
}

fn lookup(
    state: &AppState,
    namespace: ResponseNamespace,
    id: &str,
    owner: &ResponseOwner,
    missing: fn() -> Response,
) -> Result<ResponseAffinity, Response> {
    match state
        .provider_store
        .response_affinities()
        .lookup(namespace, id, owner)
    {
        Ok(Some(affinity)) => Ok(affinity),
        Ok(None) => Err(missing()),
        Err(error) => Err(affinity_error(&error)),
    }
}

#[allow(clippy::too_many_arguments)]
async fn forward(
    state: &AppState,
    claims: &crate::token::TokenClaims,
    method: &Method,
    headers: &HeaderMap,
    body: &Bytes,
    client_path: &str,
    upstream_path: &str,
    destination: &AffinityDestination,
) -> Result<Forwarded, Response> {
    let correlation_id = crate::request_log::correlation_id(headers);
    let (upstream, account) = match destination {
        AffinityDestination::StoredProvider {
            name,
            provider_kind,
            base_url,
        } => (
            crate::responses_lifecycle::forward_stored_provider(
                state,
                claims,
                method,
                headers,
                body,
                client_path,
                upstream_path,
                name,
                *provider_kind,
                base_url,
                &correlation_id,
            )
            .await?,
            None,
        ),
        AffinityDestination::Subscription {
            provider,
            account,
            upstream_account_id,
            base_url,
        } => (
            crate::responses_lifecycle::forward_subscription(
                state,
                claims,
                method,
                headers,
                body,
                client_path,
                upstream_path,
                *provider,
                account,
                upstream_account_id.as_deref(),
                base_url,
                &correlation_id,
            )
            .await?,
            Some(account.as_str()),
        ),
    };
    read_upstream(state, upstream, account, body.len() as u64, &correlation_id).await
}

async fn read_upstream(
    state: &AppState,
    upstream: reqwest::Response,
    account: Option<&str>,
    bytes_sent: u64,
    correlation_id: &str,
) -> Result<Forwarded, Response> {
    let status = StatusCode::from_u16(upstream.status().as_u16())
        .unwrap_or(StatusCode::INTERNAL_SERVER_ERROR);
    let headers = crate::proxy::relay_response_headers(upstream.headers());
    let mut stream = upstream.bytes_stream();
    let mut body = Vec::new();
    while let Some(chunk) = stream.next().await {
        let chunk = chunk
            .map_err(|error| upstream_error(&format!("upstream body read failed: {error}")))?;
        if body.len().saturating_add(chunk.len()) > state.max_proxy_request_bytes {
            return Err(upstream_error("upstream response exceeds the proxy limit"));
        }
        body.extend_from_slice(&chunk);
    }
    state
        .request_log
        .record_upstream_body(correlation_id, &body);
    state.metrics.record_request(
        crate::metrics::Surface::OpenAIResponses,
        status.as_u16(),
        account,
    );
    state.metrics.record_bytes(bytes_sent, body.len() as u64);
    Ok(Forwarded {
        status,
        headers,
        body: Bytes::from(body),
    })
}

async fn bounded_request_body(state: &AppState, body: Body) -> Result<Bytes, Response> {
    axum::body::to_bytes(body, state.max_proxy_request_bytes)
        .await
        .map_err(|error| {
            openai_error(
                StatusCode::PAYLOAD_TOO_LARGE,
                "invalid_request_error",
                &format!("request body exceeds the proxy limit: {error}"),
            )
        })
}

fn remove_conversation(
    state: &AppState,
    affinity: &ResponseAffinity,
    item_namespace: ResponseNamespace,
) -> Result<(), Response> {
    let store = state.provider_store.response_affinities();
    store
        .remove_children(
            item_namespace,
            &affinity.response_id,
            &affinity.owner,
            &affinity.destination,
        )
        .map_err(|error| affinity_error(&error))?;
    store
        .remove_if_matches(affinity)
        .map_err(|error| affinity_error(&error))?;
    Ok(())
}

fn root_id(body: &[u8]) -> Option<String> {
    serde_json::from_slice::<serde_json::Value>(body)
        .ok()?
        .get("id")?
        .as_str()
        .filter(|id| !id.is_empty())
        .map(str::to_string)
}

fn list_ids(body: &[u8]) -> Vec<String> {
    serde_json::from_slice::<serde_json::Value>(body)
        .ok()
        .and_then(|value| {
            value
                .get("data")
                .and_then(serde_json::Value::as_array)
                .cloned()
        })
        .unwrap_or_default()
        .into_iter()
        .filter_map(|item| {
            item.get("id")
                .and_then(serde_json::Value::as_str)
                .map(str::to_string)
        })
        .filter(|id| !id.is_empty())
        .collect()
}

fn with_query(path: &str, uri: &Uri) -> String {
    uri.query()
        .map_or_else(|| path.to_string(), |query| format!("{path}?{query}"))
}

fn native_response(forwarded: Forwarded) -> Response {
    let mut response = Response::new(Body::from(forwarded.body));
    *response.status_mut() = forwarded.status;
    *response.headers_mut() = forwarded.headers;
    response
}

fn conversation_not_found() -> Response {
    resource_not_found("Conversation", "conversation_not_found")
}

fn item_not_found() -> Response {
    resource_not_found("Conversation item", "conversation_item_not_found")
}

fn resource_not_found(message: &str, code: &str) -> Response {
    (
        StatusCode::NOT_FOUND,
        axum::Json(serde_json::json!({
            "error": {
                "message": format!("{message} not found"),
                "type": "invalid_request_error",
                "param": serde_json::Value::Null,
                "code": code,
            }
        })),
    )
        .into_response()
}

fn unsupported() -> Response {
    openai_error(
        StatusCode::BAD_REQUEST,
        "invalid_request_error",
        "the selected service does not support native Conversations resources",
    )
}

fn method_not_allowed() -> Response {
    openai_error(
        StatusCode::METHOD_NOT_ALLOWED,
        "invalid_request_error",
        "the requested Conversations operation is not supported",
    )
}

fn affinity_error(error: &impl std::fmt::Display) -> Response {
    openai_error(
        StatusCode::SERVICE_UNAVAILABLE,
        "api_error",
        &format!("resource affinity is unavailable: {error}"),
    )
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
    fn paths_encode_ids_as_single_segments_and_keep_queries() {
        assert_eq!(
            with_query(
                "/v1/conversations/conv.%3Fopaque/items",
                &"/ignored?after=item_1&limit=20&order=desc".parse().unwrap()
            ),
            "/v1/conversations/conv.%3Fopaque/items?after=item_1&limit=20&order=desc"
        );
    }
}
