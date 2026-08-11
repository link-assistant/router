//! Gonka upstream provider support.
//!
//! Gonka exposes OpenAI-compatible inference routes. The router keeps the
//! client-facing `la_sk_...` auth model, then signs upstream requests with the
//! configured Gonka private key instead of forwarding client credentials.

use axum::body::Body;
use axum::http::{HeaderMap, HeaderValue, StatusCode};
use axum::response::{IntoResponse, Response};
use serde_json::{Value, json};
use sha2::{Digest, Sha256};

use crate::proxy::AppState;

/// Error shown when Gonka is selected without a private key.
pub const MISSING_PRIVATE_KEY_MESSAGE: &str = "Gonka provider requires GONKA_PRIVATE_KEY. Make sure your Gonka account is activated for inference, funded, and has a published on-chain public key.";

/// Gonka runtime configuration copied from the application config.
#[derive(Debug, Clone)]
pub struct GonkaConfig {
    pub private_key: String,
    pub source_url: String,
    pub model: String,
}

impl GonkaConfig {
    /// Create Gonka config if all required fields are present.
    #[must_use]
    pub fn new(private_key: Option<String>, source_url: &str, model: String) -> Option<Self> {
        private_key.filter(|s| !s.is_empty()).map(|key| Self {
            private_key: key,
            source_url: source_url.trim_end_matches('/').to_string(),
            model,
        })
    }

    /// Resolve an OpenAI-compatible Gonka endpoint.
    #[must_use]
    pub fn endpoint(&self, path: &str) -> String {
        format!("{}{}", self.source_url, path)
    }
}

/// Ensure an `OpenAI` request body has a model, using `GONKA_MODEL` when omitted.
#[must_use]
pub fn with_default_model(mut body: Value, default_model: &str) -> Value {
    if !matches!(body.get("model").and_then(Value::as_str), Some(s) if !s.is_empty()) {
        body["model"] = Value::String(default_model.to_string());
    }
    body
}

/// OpenAI-shaped Gonka model list.
#[must_use]
pub fn list_models(model: &str) -> Value {
    json!({
        "object": "list",
        "data": [
            {
                "id": model,
                "object": "model",
                "owned_by": "gonka"
            }
        ]
    })
}

/// Add Gonka signing headers to a request.
///
/// This is a deterministic HTTP signature over method, path, body hash, and
/// timestamp. It avoids forwarding client auth and keeps the private key out of
/// logs. If Gonka changes the exact required header names, this single function
/// is the compatibility point.
pub fn sign_headers(
    headers: &mut HeaderMap,
    method: &str,
    path: &str,
    body: &[u8],
    private_key: &str,
) -> Result<(), http::header::InvalidHeaderValue> {
    let timestamp = chrono::Utc::now().timestamp().to_string();
    let body_hash = hex::encode(Sha256::digest(body));
    let payload = format!("{method}\n{path}\n{body_hash}\n{timestamp}");
    let signature = hex::encode(Sha256::digest(format!("{private_key}:{payload}")));

    headers.insert("x-gonka-timestamp", HeaderValue::from_str(&timestamp)?);
    headers.insert("x-gonka-signature", HeaderValue::from_str(&signature)?);
    Ok(())
}

/// Convert a Gonka provider error into an OpenAI-shaped JSON response.
#[must_use]
pub fn provider_error(status: StatusCode, message: &str) -> Response {
    (
        status,
        axum::Json(json!({
            "error": {
                "type": "api_error",
                "message": message
            }
        })),
    )
        .into_response()
}

/// Forward an `OpenAI`-dialect request to the Gonka upstream.
///
/// Client auth stays on the router's own `la_sk_...` tokens; the upstream call
/// is signed with the configured Gonka private key.
pub(crate) async fn forward_openai(
    state: &AppState,
    headers: &HeaderMap,
    body: serde_json::Value,
    path: &str,
    surface: crate::metrics::Surface,
) -> Response {
    if let Some(resp) = crate::proxy::maybe_mpp_challenge(state, headers, path) {
        return resp;
    }

    let Some(gonka) = state.gonka.as_ref() else {
        return provider_error(
            StatusCode::INTERNAL_SERVER_ERROR,
            crate::gonka::MISSING_PRIVATE_KEY_MESSAGE,
        );
    };

    let Some(token) = crate::proxy::extract_client_token(headers) else {
        return crate::proxy::error_response(
            StatusCode::UNAUTHORIZED,
            "authentication_error",
            "Missing Authorization Bearer token or x-api-key",
        );
    };
    let claims = match state.token_manager.validate_token(token) {
        Ok(claims) => claims,
        Err(e) => {
            let status = match &e {
                crate::token::TokenError::Revoked => StatusCode::FORBIDDEN,
                _ => StatusCode::UNAUTHORIZED,
            };
            return crate::proxy::error_response(status, "authentication_error", &format!("{e}"));
        }
    };
    if let Err(e) = state.token_manager.enforce_request_budget(&claims.sub) {
        return crate::proxy::error_response(
            StatusCode::TOO_MANY_REQUESTS,
            "rate_limit_error",
            &format!("{e}"),
        );
    }
    crate::audit::record_authorised_request(state, &claims, surface, path, Some(&body));

    let body = with_default_model(body, &gonka.model);
    let serialized = match serde_json::to_vec(&body) {
        Ok(v) => v,
        Err(e) => {
            return crate::proxy::error_response(
                StatusCode::INTERNAL_SERVER_ERROR,
                "api_error",
                &format!("failed to serialize Gonka body: {e}"),
            );
        }
    };
    let bytes_sent = serialized.len() as u64;

    let mut upstream_headers = HeaderMap::new();
    upstream_headers.insert("content-type", HeaderValue::from_static("application/json"));
    if let Err(e) = sign_headers(
        &mut upstream_headers,
        "POST",
        path,
        &serialized,
        &gonka.private_key,
    ) {
        return crate::proxy::error_response(
            StatusCode::INTERNAL_SERVER_ERROR,
            "api_error",
            &format!("failed to sign Gonka request: {e}"),
        );
    }

    let upstream_request = state
        .client
        .post(gonka.endpoint(path))
        .headers(upstream_headers)
        .body(serialized);
    let correlation_id = crate::request_log::correlation_id(headers);
    let upstream_resp = match state
        .request_log
        .send_upstream(&correlation_id, &state.client, upstream_request)
        .await
    {
        Ok(resp) => resp,
        Err(e) => {
            state.metrics.record_request(surface, 502, None);
            return crate::proxy::error_response(
                StatusCode::BAD_GATEWAY,
                "api_error",
                &format!("Gonka upstream request failed: {e}"),
            );
        }
    };

    let status = StatusCode::from_u16(upstream_resp.status().as_u16())
        .unwrap_or(StatusCode::INTERNAL_SERVER_ERROR);
    let content_type = upstream_resp
        .headers()
        .get("content-type")
        .cloned()
        .unwrap_or_else(|| HeaderValue::from_static("application/json"));
    let upstream_body = match upstream_resp.bytes().await {
        Ok(bytes) => bytes,
        Err(e) => {
            state.metrics.record_request(surface, 502, None);
            return crate::proxy::error_response(
                StatusCode::BAD_GATEWAY,
                "api_error",
                &format!("Gonka upstream body read failed: {e}"),
            );
        }
    };
    state
        .request_log
        .record_upstream_body(&correlation_id, &upstream_body);
    state
        .metrics
        .record_bytes(bytes_sent, upstream_body.len() as u64);
    state.metrics.record_request(surface, status.as_u16(), None);

    let mut response = Response::new(Body::from(upstream_body));
    *response.status_mut() = status;
    response.headers_mut().insert("content-type", content_type);
    response
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn default_model_is_added_when_missing() {
        let body = with_default_model(json!({"messages": []}), "gonka-default");
        assert_eq!(body["model"], "gonka-default");
    }

    #[test]
    fn existing_model_is_preserved() {
        let body = with_default_model(json!({"model": "caller-model"}), "gonka-default");
        assert_eq!(body["model"], "caller-model");
    }

    #[test]
    fn models_endpoint_uses_gonka_owner() {
        let models = list_models("gonka-model");
        assert_eq!(models["data"][0]["id"], "gonka-model");
        assert_eq!(models["data"][0]["owned_by"], "gonka");
    }

    #[test]
    fn signing_headers_do_not_include_private_key() {
        let mut headers = HeaderMap::new();
        sign_headers(
            &mut headers,
            "POST",
            "/v1/chat/completions",
            b"{}",
            "secret-key",
        )
        .expect("headers should sign");
        let signature = headers
            .get("x-gonka-signature")
            .and_then(|v| v.to_str().ok())
            .expect("signature");
        assert!(!signature.contains("secret-key"));
        assert!(headers.contains_key("x-gonka-timestamp"));
    }
}
