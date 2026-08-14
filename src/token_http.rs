//! HTTP mapping for token admission failures.

use axum::http::StatusCode;
use axum::response::Response;

pub fn budget_error_response(error: &crate::token::TokenError) -> Response {
    match error {
        crate::token::TokenError::LimitExceeded
        | crate::token::TokenError::TokenLimitExceeded
        | crate::token::TokenError::RateLimitExceeded => crate::api_error::error_response(
            StatusCode::TOO_MANY_REQUESTS,
            "rate_limit_error",
            &error.to_string(),
        ),
        crate::token::TokenError::Storage(_) => crate::api_error::error_response(
            StatusCode::INTERNAL_SERVER_ERROR,
            "storage_error",
            &error.to_string(),
        ),
        _ => crate::api_error::error_response(
            StatusCode::INTERNAL_SERVER_ERROR,
            "api_error",
            &error.to_string(),
        ),
    }
}
