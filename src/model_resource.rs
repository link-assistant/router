//! Authenticated single-model retrieval from native or fresh live catalogs.

use axum::body::{Body, Bytes};
use axum::extract::{OriginalUri, Path, State};
use axum::http::{HeaderMap, HeaderValue, StatusCode, Uri};
use axum::response::{IntoResponse, Response};
use futures_util::StreamExt;

use crate::app_state::AppState;
use crate::route_contract::ApiDialect;

pub async fn retrieve(
    State(state): State<AppState>,
    Path(model_id): Path<String>,
    OriginalUri(uri): OriginalUri,
    headers: HeaderMap,
) -> Response {
    let dialect = crate::route_contract::dialect_for_path(uri.path()).unwrap_or(ApiDialect::OpenAi);
    let claims = match crate::proxy::authenticate_client_error(&state, &headers) {
        Ok(claims) => claims,
        Err(error) => return error.render(dialect),
    };
    let (client, _) = match crate::client_policy::bound_client(&claims) {
        Ok(bound) => bound,
        Err(error) => {
            return error_response(dialect, StatusCode::FORBIDDEN, "permission_error", &error);
        }
    };
    if !valid_model_id(&model_id)
        || !crate::client_policy::request_evidence(
            client,
            crate::client_policy::ClientProtocol::Catalog,
            uri.path(),
            &headers,
        )
    {
        return model_not_found(dialect, &model_id);
    }

    let listed = crate::model_routing::models(
        State(state.clone()),
        OriginalUri(uri.clone()),
        headers.clone(),
    )
    .await;
    if !listed.status().is_success() {
        return listed;
    }
    let bytes = match axum::body::to_bytes(listed.into_body(), state.max_proxy_request_bytes).await
    {
        Ok(bytes) => bytes,
        Err(error) => {
            return error_response(
                dialect,
                StatusCode::BAD_GATEWAY,
                "api_error",
                &format!("model catalog response is too large: {error}"),
            );
        }
    };
    let catalog: serde_json::Value = match serde_json::from_slice(&bytes) {
        Ok(catalog) => catalog,
        Err(error) => {
            return error_response(
                dialect,
                StatusCode::BAD_GATEWAY,
                "api_error",
                &format!("model catalog response is invalid: {error}"),
            );
        }
    };
    let Some(entry) = catalog
        .get("data")
        .and_then(serde_json::Value::as_array)
        .and_then(|models| {
            models.iter().find(|model| {
                model.get("id").and_then(serde_json::Value::as_str) == Some(&model_id)
            })
        })
        .cloned()
    else {
        return model_not_found(dialect, &model_id);
    };

    if uri.path().starts_with("/api/services/openai/")
        && let Some(response) =
            retrieve_openai_native(&state, client, &headers, &model_id, &entry, &uri).await
    {
        return response;
    }
    project_catalog_entry(dialect, entry)
}

async fn retrieve_openai_native(
    state: &AppState,
    client: crate::clients::ClientKind,
    headers: &HeaderMap,
    model_id: &str,
    entry: &serde_json::Value,
    uri: &Uri,
) -> Option<Response> {
    let owner = entry.get("owned_by").and_then(serde_json::Value::as_str)?;
    let provider = state.provider_store.resolve(owner).ok().flatten()?;
    if provider.kind != crate::providers::ProviderKind::OpenAICompatible
        || !provider.supports_client(client)
    {
        return None;
    }
    let api_key = provider.api_key.as_deref()?;
    let path = format!(
        "/v1/models/{}",
        crate::responses_lifecycle::percent_encode_segment(model_id)
    );
    let path = uri
        .query()
        .map_or_else(|| path.clone(), |query| format!("{path}?{query}"));
    let request = state
        .client
        .get(crate::provider_proxy::join_openai_compatible_url(
            &provider.base_url,
            &path,
        ))
        .headers(crate::proxy::native_request_headers(headers, api_key));
    let correlation_id = crate::request_log::correlation_id(headers);
    let Ok(upstream) = state
        .request_log
        .send_upstream(&correlation_id, &state.client, request)
        .await
    else {
        return None;
    };
    if matches!(
        upstream.status(),
        reqwest::StatusCode::NOT_FOUND
            | reqwest::StatusCode::METHOD_NOT_ALLOWED
            | reqwest::StatusCode::NOT_IMPLEMENTED
    ) {
        return None;
    }
    Some(
        bounded_native_response(state, upstream, &correlation_id)
            .await
            .unwrap_or_else(|message| {
                error_response(
                    ApiDialect::OpenAi,
                    StatusCode::BAD_GATEWAY,
                    "api_error",
                    &message,
                )
            }),
    )
}

async fn bounded_native_response(
    state: &AppState,
    upstream: reqwest::Response,
    correlation_id: &str,
) -> Result<Response, String> {
    let status = StatusCode::from_u16(upstream.status().as_u16())
        .unwrap_or(StatusCode::INTERNAL_SERVER_ERROR);
    let headers = crate::proxy::relay_response_headers(upstream.headers());
    let mut stream = upstream.bytes_stream();
    let mut body = Vec::new();
    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|error| format!("upstream model response failed: {error}"))?;
        if body.len().saturating_add(chunk.len()) > state.max_proxy_request_bytes {
            return Err("upstream model response exceeds the proxy limit".into());
        }
        body.extend_from_slice(&chunk);
    }
    state
        .request_log
        .record_upstream_body(correlation_id, &body);
    state.metrics.record_request(
        crate::metrics::Surface::OpenAIResponses,
        status.as_u16(),
        None,
    );
    state.metrics.record_bytes(0, body.len() as u64);
    let mut response = Response::new(Body::from(Bytes::from(body)));
    *response.status_mut() = status;
    *response.headers_mut() = headers;
    Ok(response)
}

fn project_catalog_entry(dialect: ApiDialect, mut entry: serde_json::Value) -> Response {
    let Some(model) = entry.as_object_mut() else {
        return error_response(
            dialect,
            StatusCode::BAD_GATEWAY,
            "api_error",
            "live model catalog contained a non-object entry",
        );
    };
    for private in ["canonical_id", "provider", "router_fetched_at"] {
        model.remove(private);
    }
    if dialect == ApiDialect::Anthropic {
        model.remove("object");
        model.remove("owned_by");
        model
            .entry("type")
            .or_insert_with(|| serde_json::Value::String("model".into()));
        if let Some(id) = model
            .get("id")
            .and_then(serde_json::Value::as_str)
            .map(str::to_string)
        {
            model
                .entry("display_name")
                .or_insert_with(|| serde_json::Value::String(id));
        }
    } else {
        model
            .entry("object")
            .or_insert_with(|| serde_json::Value::String("model".into()));
    }
    let mut response = axum::Json(entry).into_response();
    response
        .headers_mut()
        .insert("content-type", HeaderValue::from_static("application/json"));
    response
}

fn valid_model_id(model_id: &str) -> bool {
    !model_id.is_empty()
        && model_id.len() <= 512
        && !model_id.contains('/')
        && !model_id.chars().any(char::is_control)
}

fn model_not_found(dialect: ApiDialect, model_id: &str) -> Response {
    error_response(
        dialect,
        StatusCode::NOT_FOUND,
        if dialect == ApiDialect::Anthropic {
            "not_found_error"
        } else {
            "invalid_request_error"
        },
        &format!("model '{model_id}' was not found"),
    )
}

fn error_response(
    dialect: ApiDialect,
    status: StatusCode,
    error_type: &str,
    message: &str,
) -> Response {
    crate::api_error::PresentedError {
        status,
        error_type,
        message,
    }
    .render(dialect)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn catalog_projection_removes_router_metadata_in_both_dialects() {
        let source = serde_json::json!({
            "id":"future-model",
            "object":"model",
            "owned_by":"stored-label",
            "provider":"codex",
            "canonical_id":"future-model",
            "router_fetched_at":1
        });
        let openai = project_catalog_entry(ApiDialect::OpenAi, source.clone());
        assert_eq!(openai.status(), StatusCode::OK);
        let anthropic = project_catalog_entry(ApiDialect::Anthropic, source);
        assert_eq!(anthropic.status(), StatusCode::OK);
    }
}
