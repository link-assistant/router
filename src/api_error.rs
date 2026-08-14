use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};

/// Protocol-independent failure data. Rendering is selected only at the API
/// boundary, keeping diagnosis separate from vendor presentation.
#[derive(Clone, Copy, Debug)]
pub struct PresentedError<'a> {
    pub status: StatusCode,
    pub error_type: &'a str,
    pub message: &'a str,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum ApiDialect {
    Anthropic,
    OpenAi,
    Gemini,
    GitHub,
}

#[must_use]
pub fn dialect_for_path(path: &str) -> ApiDialect {
    if path.starts_with("/api/gemini/") || path.starts_with("/api/vertex/") {
        ApiDialect::Gemini
    } else if path.starts_with("/api/v3") || path == "/api/graphql" || path == "/graphql" {
        ApiDialect::GitHub
    } else if path.ends_with("/chat/completions") || path.ends_with("/responses") {
        ApiDialect::OpenAi
    } else {
        ApiDialect::Anthropic
    }
}

impl PresentedError<'_> {
    pub fn render(self, dialect: ApiDialect) -> Response {
        let body = match dialect {
            ApiDialect::Anthropic => serde_json::json!({
                "type": "error",
                "error": {"type": self.error_type, "message": self.message}
            }),
            ApiDialect::OpenAi => serde_json::json!({
                "error": {"type": self.error_type, "message": self.message}
            }),
            ApiDialect::Gemini => serde_json::json!({
                "error": {
                    "code": self.status.as_u16(),
                    "message": self.message,
                    "status": google_status(self.status),
                }
            }),
            ApiDialect::GitHub => serde_json::json!({"message": self.message}),
        };
        (self.status, axum::Json(body)).into_response()
    }
}

const fn google_status(status: StatusCode) -> &'static str {
    match status.as_u16() {
        400 => "INVALID_ARGUMENT",
        401 => "UNAUTHENTICATED",
        403 => "PERMISSION_DENIED",
        404 => "NOT_FOUND",
        429 => "RESOURCE_EXHAUSTED",
        503 => "UNAVAILABLE",
        _ => "INTERNAL",
    }
}

/// Build the shared JSON error envelope used by all client API dialects.
pub fn error_response(status: StatusCode, error_type: &str, message: &str) -> Response {
    PresentedError {
        status,
        error_type,
        message,
    }
    .render(ApiDialect::Anthropic)
}

pub fn error_response_for_surface(
    surface: crate::metrics::Surface,
    status: StatusCode,
    error_type: &str,
    message: &str,
) -> Response {
    let dialect = match surface {
        crate::metrics::Surface::Anthropic => ApiDialect::Anthropic,
        crate::metrics::Surface::OpenAIChat | crate::metrics::Surface::OpenAIResponses => {
            ApiDialect::OpenAi
        }
    };
    PresentedError {
        status,
        error_type,
        message,
    }
    .render(dialect)
}

pub fn malformed_json_response(error: &str) -> Response {
    error_response(
        StatusCode::BAD_REQUEST,
        "invalid_request_error",
        &format!("Failed to parse request body as JSON: {error}"),
    )
}

pub fn malformed_json_response_for_surface(
    surface: crate::metrics::Surface,
    error: &str,
) -> Response {
    error_response_for_surface(
        surface,
        StatusCode::BAD_REQUEST,
        "invalid_request_error",
        &format!("Failed to parse request body as JSON: {error}"),
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn one_error_renders_in_each_vendor_dialect() {
        for (dialect, required, forbidden) in [
            (ApiDialect::Anthropic, "\"type\":\"error\"", "\"code\":"),
            (ApiDialect::OpenAi, "\"error\":", "\"type\":\"error\""),
            (ApiDialect::Gemini, "INVALID_ARGUMENT", "documentation_url"),
            (ApiDialect::GitHub, "\"message\":\"bad\"", "\"error\":"),
        ] {
            let response = PresentedError {
                status: StatusCode::BAD_REQUEST,
                error_type: "invalid_request_error",
                message: "bad",
            }
            .render(dialect);
            let body = axum::body::to_bytes(response.into_body(), 4096)
                .await
                .unwrap();
            let body = String::from_utf8(body.to_vec()).unwrap();
            assert!(body.contains(required), "{dialect:?}: {body}");
            assert!(!body.contains(forbidden), "{dialect:?}: {body}");
        }
    }
}
