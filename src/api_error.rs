use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};

/// Build the shared JSON error envelope used by all client API dialects.
pub fn error_response(status: StatusCode, error_type: &str, message: &str) -> Response {
    (
        status,
        axum::Json(serde_json::json!({
            "type": "error",
            "error": {"type": error_type, "message": message}
        })),
    )
        .into_response()
}

pub fn malformed_json_response(error: &str) -> Response {
    error_response(
        StatusCode::BAD_REQUEST,
        "invalid_request_error",
        &format!("Failed to parse request body as JSON: {error}"),
    )
}
