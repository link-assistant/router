#![allow(clippy::unused_async)]

use axum::Json;
use axum::extract::{DefaultBodyLimit, Path, State};
use axum::http::{StatusCode, header};
use axum::response::{IntoResponse as _, Response};
use axum::routing::{get, post};
use axum::{Extension, Router};
use serde_json::Value;

use crate::app_state::AppState;
use crate::proxy::error_response;
use crate::route_contract::{RouteId, route_template};

use super::{Edit, Failure, RuntimeConfig, pointer, storage};

#[derive(Clone)]
pub struct Writer(pub String);

pub fn routes() -> Router<AppState> {
    Router::new()
        .route(
            route_template(RouteId::RuntimeConfig),
            get(document).put(replace).patch(merge),
        )
        .route(route_template(RouteId::RuntimeConfigYaml), get(yaml))
        .route(route_template(RouteId::RuntimeConfigSchema), get(schema))
        .route(route_template(RouteId::RuntimeConfigStatus), get(status))
        .route(route_template(RouteId::RuntimeConfigReload), post(reload))
        .route(
            route_template(RouteId::RuntimeConfigPointer),
            get(get_pointer).put(put_pointer).delete(delete_pointer),
        )
        .layer(DefaultBodyLimit::max(storage::MAX_BYTES))
}

async fn document(State(state): State<AppState>) -> Response {
    read(&state, &[])
}

async fn yaml(State(state): State<AppState>) -> Response {
    match config(&state).and_then(|config| config.document(&[]).map_err(failure)) {
        Ok(document) => {
            // JSON is a YAML 1.2 serialization. This keeps keys, nulls, and
            // precise JSON scalars interoperable without a second parser.
            let text = serde_json::to_string_pretty(&document).expect("JSON document serializes");
            ([(header::CONTENT_TYPE, "application/yaml")], text).into_response()
        }
        Err(response) => response,
    }
}

async fn schema() -> Json<&'static Value> {
    Json(super::schema())
}

async fn status(State(state): State<AppState>) -> Response {
    config(&state).map_or_else(
        |response| response,
        |config| Json(config.status()).into_response(),
    )
}

async fn replace(
    State(state): State<AppState>,
    Extension(writer): Extension<Writer>,
    Json(value): Json<Value>,
) -> Response {
    update(state, writer, Edit::Replace(value)).await
}

async fn merge(
    State(state): State<AppState>,
    Extension(writer): Extension<Writer>,
    Json(value): Json<Value>,
) -> Response {
    update(state, writer, Edit::Merge(value)).await
}

async fn get_pointer(State(state): State<AppState>, Path(path): Path<String>) -> Response {
    match split_pointer(&path) {
        Ok(path) => read(&state, &path),
        Err(response) => response,
    }
}

async fn put_pointer(
    State(state): State<AppState>,
    Extension(writer): Extension<Writer>,
    Path(path): Path<String>,
    Json(value): Json<Value>,
) -> Response {
    match split_pointer(&path) {
        Ok(path) => update(state, writer, Edit::Put(path, value)).await,
        Err(response) => response,
    }
}

async fn delete_pointer(
    State(state): State<AppState>,
    Extension(writer): Extension<Writer>,
    Path(path): Path<String>,
) -> Response {
    match split_pointer(&path) {
        Ok(path) => update(state, writer, Edit::Delete(path)).await,
        Err(response) => response,
    }
}

async fn reload(State(state): State<AppState>, Extension(writer): Extension<Writer>) -> Response {
    let config = match config(&state) {
        Ok(config) => config.clone(),
        Err(response) => return response,
    };
    complete(tokio::task::spawn_blocking(move || config.reload_as(&writer.0)).await)
}

fn split_pointer(path: &str) -> Result<Vec<String>, Response> {
    pointer::segments(&format!("/{path}")).map_err(|error| failure(error.into()))
}

fn config(state: &AppState) -> Result<&std::sync::Arc<RuntimeConfig>, Response> {
    state.request_log.runtime_config().ok_or_else(|| {
        error_response(
            StatusCode::SERVICE_UNAVAILABLE,
            "api_error",
            "runtime configuration is unavailable",
        )
    })
}

fn read(state: &AppState, path: &[String]) -> Response {
    config(state)
        .and_then(|config| config.document(path).map_err(failure))
        .map_or_else(|response| response, |value| Json(value).into_response())
}

async fn update(state: AppState, writer: Writer, edit: Edit) -> Response {
    let config = match config(&state) {
        Ok(config) => config.clone(),
        Err(response) => return response,
    };
    complete(tokio::task::spawn_blocking(move || config.edit(edit, &writer.0)).await)
}

fn complete(result: Result<Result<Value, Failure>, tokio::task::JoinError>) -> Response {
    result
        .unwrap_or(Err(Failure::Io))
        .map_or_else(failure, |value| Json(value).into_response())
}

fn failure(error: Failure) -> Response {
    let (status, kind, message) = match error {
        Failure::Missing => (
            StatusCode::NOT_FOUND,
            "not_found_error",
            "configuration path does not exist",
        ),
        Failure::Invalid(message) => (StatusCode::BAD_REQUEST, "invalid_request_error", message),
        Failure::Conflict(message) => (StatusCode::CONFLICT, "invalid_request_error", message),
        Failure::Io => (
            StatusCode::INTERNAL_SERVER_ERROR,
            "api_error",
            "runtime configuration or audit write failed",
        ),
    };
    error_response(status, kind, message)
}
