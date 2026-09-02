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
    crate::route_contract::dialect_for_path(path).unwrap_or(ApiDialect::Anthropic)
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

/// `OpenAI` error `type` for an upstream status.
///
/// Mirrors the mappings the Anthropic and Gemini surfaces already apply
/// (`anthropic_bridge::anthropic_error`, `gemini_bridge::openai_error_to_gemini`)
/// so one upstream failure is classified the same way on every surface.
const fn openai_error_type(status: u16) -> &'static str {
    match status {
        400 | 404 | 422 => "invalid_request_error",
        401 => "authentication_error",
        403 => "permission_error",
        429 => "rate_limit_error",
        _ => "api_error",
    }
}

/// The `code` an `OpenAI` client reads to classify a failure programmatically.
const fn openai_error_code(status: u16) -> Option<&'static str> {
    match status {
        401 => Some("invalid_api_key"),
        403 => Some("permission_denied"),
        404 => Some("model_not_found"),
        429 => Some("rate_limit_exceeded"),
        _ => None,
    }
}

/// Re-shape an upstream vendor error as an `OpenAI` error envelope.
///
/// The `OpenAI` surfaces used to relay the vendor's body verbatim, which had two
/// consequences (issue #213): a client written against the `OpenAI` SDK could not
/// classify the failure, because the vendor's `type` is not an `OpenAI` error
/// type; and the body carried fields describing the *router operator's*
/// subscription — `plan_type`, `eligible_promo`, `resets_at` — which say nothing
/// about the caller's request and, in a shared deployment, disclose the
/// operator's billing posture to every caller who triggers a `429`.
///
/// Only what the caller can act on is preserved: the status, the message, and
/// retry timing. The full upstream body is still captured by the request log
/// (`record_upstream_body`), so nothing is lost for diagnosis.
#[must_use]
pub fn openai_error_body(status: u16, upstream: &[u8]) -> serde_json::Value {
    let parsed = serde_json::from_slice::<serde_json::Value>(upstream).ok();
    let vendor_message = parsed.as_ref().and_then(|value| {
        value
            .pointer("/error/message")
            .or_else(|| value.pointer("/message"))
            .and_then(serde_json::Value::as_str)
            .map(str::to_string)
    });
    let message = vendor_message.unwrap_or_else(|| {
        let text = String::from_utf8_lossy(upstream);
        let text = text.trim();
        if text.is_empty() {
            "upstream request failed".to_string()
        } else {
            text.to_string()
        }
    });
    serde_json::json!({
        "error": {
            "message": message,
            "type": openai_error_type(status),
            "param": serde_json::Value::Null,
            "code": openai_error_code(status),
        }
    })
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

pub fn malformed_json_response_for_dialect(dialect: ApiDialect, error: &str) -> Response {
    let message = format!("Failed to parse request body as JSON: {error}");
    PresentedError {
        status: StatusCode::BAD_REQUEST,
        error_type: "invalid_request_error",
        message: &message,
    }
    .render(dialect)
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
