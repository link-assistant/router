use super::{IntoResponse, Response, StatusCode, Value, json};

pub(super) fn anthropic_error(status: StatusCode, body: &[u8]) -> Response {
    let text = serde_json::from_slice::<Value>(body).map_or_else(
        |_| String::from_utf8_lossy(body).to_string(),
        |value| {
            value
                .get("error")
                .and_then(|e| e.get("message"))
                .and_then(Value::as_str)
                .map_or_else(|| value.to_string(), String::from)
        },
    );
    let error_type = match status {
        StatusCode::UNAUTHORIZED | StatusCode::FORBIDDEN => "authentication_error",
        StatusCode::TOO_MANY_REQUESTS => "rate_limit_error",
        StatusCode::BAD_REQUEST => "invalid_request_error",
        _ => "api_error",
    };
    (
        status,
        axum::Json(json!({
            "type": "error",
            "error": {"type": error_type, "message": text},
        })),
    )
        .into_response()
}
