//! Admin-only persisted logs, runtime diagnostics, and queue visibility.
use crate::app_state::AppState;
use axum::extract::{Path, State};
use axum::http::StatusCode;
use axum::response::{IntoResponse as _, Response};
use serde::Deserialize;
use serde_json::json;
use std::sync::Arc;

async fn storage<T: Send + 'static>(
    operation: impl FnOnce() -> std::io::Result<T> + Send + 'static,
) -> Result<T, Response> {
    match tokio::task::spawn_blocking(operation).await {
        Ok(Ok(result)) => Ok(result),
        Ok(Err(error)) => {
            tracing::warn!("management log operation failed: {error}");
            Err(crate::proxy::error_response(
                match error.kind() {
                    std::io::ErrorKind::NotFound => StatusCode::NOT_FOUND,
                    std::io::ErrorKind::InvalidInput => StatusCode::BAD_REQUEST,
                    _ => StatusCode::INTERNAL_SERVER_ERROR,
                },
                "log_error",
                "log operation failed",
            ))
        }
        Err(_) => Err(crate::proxy::error_response(
            StatusCode::INTERNAL_SERVER_ERROR,
            "log_error",
            "log worker failed",
        )),
    }
}

/// Retrieve retained request phases by correlation id from links-notation files.
pub async fn request(State(state): State<AppState>, Path(id): Path<String>) -> Response {
    let log = Arc::clone(&state.request_log);
    let lookup_id = id.clone();
    match storage(move || log.lookup(&lookup_id)).await {
        Ok(records) if records.is_empty() => crate::proxy::error_response(
            StatusCode::NOT_FOUND,
            "not_found_error",
            "request id is not retained",
        ),
        Ok(records) => axum::Json(json!({"id": id, "records": records})).into_response(),
        Err(response) => response,
    }
}

/// List available error captures; disabled capture returns an empty list.
pub async fn errors(State(state): State<AppState>) -> Response {
    let log = state.request_log.error_log().cloned();
    let enabled = log.is_some();
    match storage(move || log.map_or_else(|| Ok(Vec::new()), |log| log.list())).await {
        Ok(files) => axum::Json(json!({"enabled": enabled, "files": files})).into_response(),
        Err(response) => response,
    }
}

/// Download one private, redacted upstream-error document.
pub async fn error(State(state): State<AppState>, Path(name): Path<String>) -> Response {
    let Some(log) = state.request_log.error_log().cloned() else {
        return crate::proxy::error_response(
            StatusCode::NOT_FOUND,
            "not_found_error",
            "error capture is disabled",
        );
    };
    match storage(move || log.read(&name)).await {
        Ok(contents) => (
            [
                ("content-type", "application/json"),
                ("content-disposition", "attachment"),
                ("cache-control", "no-store"),
            ],
            contents,
        )
            .into_response(),
        Err(response) => response,
    }
}

/// Clear persisted request/error captures without deleting audit or operational logs.
pub async fn clear(State(state): State<AppState>) -> Response {
    let log = Arc::clone(&state.request_log);
    match storage(move || log.clear()).await {
        Ok(()) => {
            state.audit.record_log_clear();
            tracing::info!("management request and error logs cleared");
            axum::Json(json!({"cleared": true})).into_response()
        }
        Err(response) => response,
    }
}

/// A bounded runtime debug lease. Disabling restores the complete startup filter.
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub struct LoggingPatch {
    /// Whether to temporarily enable debug tracing.
    pub debug: bool,
}

/// Enable debug until `LOG_DEBUG_TTL_SECS` expires (300 seconds by default).
pub async fn logging(
    State(state): State<AppState>,
    axum::Json(patch): axum::Json<LoggingPatch>,
) -> Response {
    let Some(control) = crate::logging::runtime_debug::CONTROL.get() else {
        return crate::proxy::error_response(
            StatusCode::SERVICE_UNAVAILABLE,
            "logging_unavailable",
            "runtime logging control is not installed",
        );
    };
    let ttl = crate::operation_context::var("LOG_DEBUG_TTL_SECS")
        .ok()
        .and_then(|value| value.parse::<u64>().ok())
        .filter(|ttl| (1..=86400).contains(ttl))
        .unwrap_or(300);
    match control.set(
        patch.debug,
        std::time::Duration::from_secs(ttl),
        Arc::clone(&state.audit),
    ) {
        Ok(()) => {
            axum::Json(json!({"debug": patch.debug, "ttl_secs": if patch.debug { ttl } else { 0 }}))
                .into_response()
        }
        Err(_) => crate::proxy::error_response(
            StatusCode::INTERNAL_SERVER_ERROR,
            "logging_error",
            "could not reload logging filter",
        ),
    }
}

/// Active exchanges per account; dispatch has no application request queue.
pub async fn queue(State(state): State<AppState>) -> Response {
    let configured = state.account_router.as_ref().map_or_else(
        || vec!["primary".to_owned()],
        |router| {
            router
                .subscription_readers()
                .into_iter()
                .map(|(name, _)| name)
                .collect()
        },
    );
    axum::Json(state.request_log.queue_snapshot(configured)).into_response()
}

/// Fetch the latest published Router release through the shared diagnostics helper.
pub async fn latest_version(State(state): State<AppState>) -> Response {
    match crate::doctor::latest_version(&state.client).await {
        Ok(version) => axum::Json(version).into_response(),
        Err(error) => {
            tracing::warn!("latest version check failed: {error}");
            crate::proxy::error_response(
                StatusCode::BAD_GATEWAY,
                "version_check_failed",
                "latest release could not be checked",
            )
        }
    }
}
