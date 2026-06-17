//! Gonka upstream provider support.
//!
//! Gonka exposes OpenAI-compatible inference routes. The router keeps the
//! client-facing `la_sk_...` auth model, then signs upstream requests with the
//! configured Gonka private key instead of forwarding client credentials.

use axum::http::{HeaderMap, HeaderValue, StatusCode};
use axum::response::{IntoResponse, Response};
use serde_json::{Value, json};
use sha2::{Digest, Sha256};

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
