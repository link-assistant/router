//! Stored Chat Completions collection and resource lifecycle.

use std::collections::HashSet;

use axum::body::{Body, Bytes};
use axum::extract::{OriginalUri, Path, Request, State};
use axum::http::{HeaderMap, StatusCode, Uri};
use axum::response::{IntoResponse, Response};

use crate::app_state::AppState;
use crate::response_affinity::{
    AffinityDestination, ResponseAffinity, ResponseNamespace, ResponseOwner,
};

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
enum Operation {
    Retrieve,
    Update,
    Delete,
    Messages,
}

impl Operation {
    fn suffix(self) -> &'static str {
        if self == Self::Messages {
            "/messages"
        } else {
            ""
        }
    }
}

pub async fn list(
    State(state): State<AppState>,
    OriginalUri(uri): OriginalUri,
    request: Request,
) -> Response {
    let claims = match authenticate(&state, request.headers()) {
        Ok(claims) => claims,
        Err(response) => return response,
    };
    let owner = match owner(&claims) {
        Ok(owner) => owner,
        Err(response) => return response,
    };
    let Some(namespace) = ResponseNamespace::from_path(uri.path()) else {
        return not_found();
    };
    if state.upstream_provider != crate::config::UpstreamProvider::OpenAICompatible {
        return openai_error(
            StatusCode::CONFLICT,
            "invalid_request_error",
            "listing stored Chat Completions requires one explicitly selected native provider",
        );
    }
    let provider = match crate::provider_proxy::resolve_openai_compatible_provider(&state) {
        Ok(provider) => provider,
        Err(error) => return unavailable(&format!("provider lookup failed: {error}")),
    };
    if let Err(response) = authorize_provider(&claims, request.headers(), uri.path(), &provider) {
        return response;
    }
    let affinities = match state
        .provider_store
        .response_affinities()
        .list(namespace, &owner)
    {
        Ok(affinities) => affinities,
        Err(error) => return unavailable(&format!("resource affinity is unavailable: {error}")),
    };
    let allowed = affinities
        .iter()
        .filter_map(|affinity| match &affinity.destination {
            AffinityDestination::StoredProvider {
                name,
                provider_kind,
                base_url,
            } if name == &provider.name
                && provider_kind == &provider.kind
                && base_url == &provider.base_url =>
            {
                Some(affinity.response_id.clone())
            }
            _ => None,
        })
        .collect::<HashSet<_>>();
    let Some(api_key) = provider.api_key.as_deref() else {
        return unavailable("the selected provider credential is unavailable");
    };
    let path = uri.query().map_or_else(
        || "/v1/chat/completions".to_string(),
        |query| format!("/v1/chat/completions?{query}"),
    );
    let correlation_id = crate::request_log::correlation_id(request.headers());
    let upstream = state
        .client
        .get(crate::provider_proxy::join_openai_compatible_url(
            &provider.base_url,
            &path,
        ))
        .headers(crate::proxy::native_request_headers(
            request.headers(),
            api_key,
        ));
    let upstream = match state
        .request_log
        .send_upstream(&correlation_id, &state.client, upstream)
        .await
    {
        Ok(response) => response,
        Err(error) => return bad_gateway(&format!("provider request failed: {error}")),
    };
    relay_list(&state, upstream, &allowed, &correlation_id).await
}

pub async fn retrieve(
    State(state): State<AppState>,
    Path(completion_id): Path<String>,
    OriginalUri(uri): OriginalUri,
    request: Request,
) -> Response {
    forward(state, completion_id, uri, request, Operation::Retrieve).await
}

pub async fn update(
    State(state): State<AppState>,
    Path(completion_id): Path<String>,
    OriginalUri(uri): OriginalUri,
    request: Request,
) -> Response {
    forward(state, completion_id, uri, request, Operation::Update).await
}

pub async fn delete(
    State(state): State<AppState>,
    Path(completion_id): Path<String>,
    OriginalUri(uri): OriginalUri,
    request: Request,
) -> Response {
    forward(state, completion_id, uri, request, Operation::Delete).await
}

pub async fn messages(
    State(state): State<AppState>,
    Path(completion_id): Path<String>,
    OriginalUri(uri): OriginalUri,
    request: Request,
) -> Response {
    forward(state, completion_id, uri, request, Operation::Messages).await
}

async fn forward(
    state: AppState,
    completion_id: String,
    uri: Uri,
    request: Request,
    operation: Operation,
) -> Response {
    let claims = match authenticate(&state, request.headers()) {
        Ok(claims) => claims,
        Err(response) => return response,
    };
    let owner = match owner(&claims) {
        Ok(owner) => owner,
        Err(response) => return response,
    };
    let Some(namespace) = ResponseNamespace::from_path(uri.path()) else {
        return not_found();
    };
    let affinity =
        match state
            .provider_store
            .response_affinities()
            .lookup(namespace, &completion_id, &owner)
        {
            Ok(Some(affinity)) => affinity,
            Ok(None) => return not_found(),
            Err(error) => {
                return unavailable(&format!("resource affinity is unavailable: {error}"));
            }
        };
    let AffinityDestination::StoredProvider {
        name,
        provider_kind,
        base_url,
    } = &affinity.destination
    else {
        return unavailable("the stored Chat Completion has no exact native lifecycle mapping");
    };
    let provider = match state.provider_store.resolve(name) {
        Ok(Some(provider)) if provider.kind == *provider_kind && provider.base_url == *base_url => {
            provider
        }
        Ok(None) => match (state.openai_compatible.provider_name == *name)
            .then(|| state.openai_compatible.resolve())
            .filter(|provider| provider.kind == *provider_kind && provider.base_url == *base_url)
        {
            Some(provider) => provider,
            None => return unavailable("the response's exact provider is unavailable"),
        },
        Ok(Some(_)) => return unavailable("the response's exact provider has changed"),
        Err(error) => return unavailable(&format!("provider lookup failed: {error}")),
    };
    if let Err(response) = authorize_provider(&claims, request.headers(), uri.path(), &provider) {
        return response;
    }
    let Some(api_key) = provider.api_key.as_deref() else {
        return unavailable("the response's provider credential is unavailable");
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
    let path = resource_path(&completion_id, operation, uri.query());
    let correlation_id = crate::request_log::correlation_id(&parts.headers);
    let upstream = state
        .client
        .request(
            reqwest::Method::from_bytes(parts.method.as_str().as_bytes())
                .expect("HTTP methods accepted by axum are valid for reqwest"),
            crate::provider_proxy::join_openai_compatible_url(&provider.base_url, &path),
        )
        .headers(crate::proxy::native_request_headers(
            &parts.headers,
            api_key,
        ))
        .body(body.clone());
    let upstream = match state
        .request_log
        .send_upstream(&correlation_id, &state.client, upstream)
        .await
    {
        Ok(response) => response,
        Err(error) => return bad_gateway(&format!("provider request failed: {error}")),
    };
    relay_resource(
        &state,
        affinity,
        operation,
        upstream,
        body.len() as u64,
        &correlation_id,
    )
    .await
}

fn authorize_provider(
    claims: &crate::token::TokenClaims,
    headers: &HeaderMap,
    path: &str,
    provider: &crate::providers::ResolvedProvider,
) -> Result<(), Response> {
    let (client, _) = crate::client_policy::bound_client(claims)
        .map_err(|error| openai_error(StatusCode::FORBIDDEN, "permission_error", &error))?;
    if provider.supports_client(client)
        && crate::client_policy::request_evidence(
            client,
            crate::client_policy::ClientProtocol::OpenAIChat,
            path,
            headers,
        )
    {
        Ok(())
    } else {
        Err(openai_error(
            StatusCode::FORBIDDEN,
            "permission_error",
            "the stored provider has no tested adapter for this signed client request",
        ))
    }
}

async fn relay_resource(
    state: &AppState,
    affinity: ResponseAffinity,
    operation: Operation,
    upstream: reqwest::Response,
    bytes_sent: u64,
    correlation_id: &str,
) -> Response {
    let status = status(&upstream);
    let headers = crate::proxy::relay_response_headers(upstream.headers());
    let body = match upstream.bytes().await {
        Ok(body) => body,
        Err(error) => return bad_gateway(&format!("upstream body read failed: {error}")),
    };
    record(state, status, bytes_sent, &body, correlation_id);
    if matches!(status, StatusCode::NOT_FOUND | StatusCode::GONE) {
        let _ = state
            .provider_store
            .response_affinities()
            .remove_if_matches(&affinity);
        return not_found();
    }
    if operation == Operation::Delete
        && status.is_success()
        && let Err(error) = state
            .provider_store
            .response_affinities()
            .remove_if_matches(&affinity)
    {
        return unavailable(&format!("resource affinity is unavailable: {error}"));
    }
    response(status, headers, body)
}

async fn relay_list(
    state: &AppState,
    upstream: reqwest::Response,
    allowed: &HashSet<String>,
    correlation_id: &str,
) -> Response {
    let status = status(&upstream);
    let headers = crate::proxy::relay_response_headers(upstream.headers());
    let body = match upstream.bytes().await {
        Ok(body) => body,
        Err(error) => return bad_gateway(&format!("upstream body read failed: {error}")),
    };
    record(state, status, 0, &body, correlation_id);
    if !status.is_success() {
        return response(status, headers, body);
    }
    let Ok(mut payload) = serde_json::from_slice::<serde_json::Value>(&body) else {
        return bad_gateway("provider returned an invalid Chat Completions list");
    };
    let Some(data) = payload
        .get_mut("data")
        .and_then(serde_json::Value::as_array_mut)
    else {
        return bad_gateway("provider returned an invalid Chat Completions list");
    };
    data.retain(|item| {
        item.get("id")
            .and_then(serde_json::Value::as_str)
            .is_some_and(|id| allowed.contains(id))
    });
    let first = data
        .first()
        .and_then(|item| item.get("id"))
        .cloned()
        .unwrap_or(serde_json::Value::Null);
    let last = data
        .last()
        .and_then(|item| item.get("id"))
        .cloned()
        .unwrap_or(serde_json::Value::Null);
    if let Some(object) = payload.as_object_mut() {
        object.insert("first_id".into(), first);
        object.insert("last_id".into(), last);
    }
    response(
        status,
        headers,
        Bytes::from(serde_json::to_vec(&payload).expect("JSON values always serialize")),
    )
}

fn record(state: &AppState, status: StatusCode, sent: u64, body: &[u8], correlation_id: &str) {
    state.request_log.record_upstream_body(correlation_id, body);
    state
        .metrics
        .record_request(crate::metrics::Surface::OpenAIChat, status.as_u16(), None);
    state.metrics.record_bytes(sent, body.len() as u64);
}

fn resource_path(completion_id: &str, operation: Operation, query: Option<&str>) -> String {
    let query = query.map_or(String::new(), |query| format!("?{query}"));
    format!(
        "/v1/chat/completions/{}{}{query}",
        crate::responses_lifecycle::percent_encode_segment(completion_id),
        operation.suffix()
    )
}

fn authenticate(
    state: &AppState,
    headers: &HeaderMap,
) -> Result<crate::token::TokenClaims, Response> {
    crate::proxy::authenticate_client_error(state, headers)
        .map_err(|error| error.render(crate::api_error::ApiDialect::OpenAi))
}

fn owner(claims: &crate::token::TokenClaims) -> Result<ResponseOwner, Response> {
    ResponseOwner::from_claims(claims)
        .map_err(|error| openai_error(StatusCode::FORBIDDEN, "permission_error", &error))
}

fn status(response: &reqwest::Response) -> StatusCode {
    StatusCode::from_u16(response.status().as_u16()).unwrap_or(StatusCode::INTERNAL_SERVER_ERROR)
}

fn response(status: StatusCode, headers: HeaderMap, body: Bytes) -> Response {
    let mut response = Response::new(Body::from(body));
    *response.status_mut() = status;
    *response.headers_mut() = headers;
    response
}

fn not_found() -> Response {
    let body = serde_json::json!({
        "error": {
            "message": "Chat completion not found",
            "type": "invalid_request_error",
            "param": serde_json::Value::Null,
            "code": "chat_completion_not_found",
        }
    });
    (StatusCode::NOT_FOUND, axum::Json(body)).into_response()
}

fn unavailable(message: &str) -> Response {
    openai_error(StatusCode::SERVICE_UNAVAILABLE, "api_error", message)
}

fn bad_gateway(message: &str) -> Response {
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
    fn opaque_chat_id_and_query_are_forwarded_without_path_breakout() {
        assert_eq!(
            resource_path(
                "chatcmpl.?#+:% unicode",
                Operation::Messages,
                Some("after=msg_1&limit=20&order=asc")
            ),
            "/v1/chat/completions/chatcmpl.%3F%23%2B%3A%25%20unicode/messages?after=msg_1&limit=20&order=asc"
        );
    }
}
