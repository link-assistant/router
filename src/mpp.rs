//! Machine Payments Protocol helpers for paid OpenAI-compatible endpoints.
//!
//! MPP uses HTTP `402 Payment Required` plus a `WWW-Authenticate: Payment`
//! challenge. The router exposes this as an optional gate in front of the
//! `OpenAI` surface so agents can discover payment requirements without relying
//! on the ForgeFed/ActivityPub metadata path.

use axum::body::Body;
use axum::http::{HeaderValue, StatusCode};
use axum::response::{IntoResponse, Response};
use serde_json::json;

/// Runtime configuration for MPP charge challenges.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct MppConfig {
    /// Whether `OpenAI` endpoints should return MPP 402 challenges when the
    /// caller has not supplied a payment credential.
    pub enabled: bool,
    /// Price per `OpenAI` request, encoded as a decimal string.
    pub amount: String,
    /// ISO currency or payment-method-specific asset symbol.
    pub currency: String,
    /// Recipient wallet, merchant, account, or payment address.
    pub recipient: String,
    /// Optional payment method identifier, for example `tempo`, `stripe`, or
    /// `lightning`.
    pub method: Option<String>,
}

impl MppConfig {
    /// Return true when the config has enough data to challenge callers.
    #[must_use]
    pub fn is_configured(&self) -> bool {
        self.enabled
            && !self.amount.trim().is_empty()
            && !self.currency.trim().is_empty()
            && !self.recipient.trim().is_empty()
    }
}

/// Return true when the request carries an MPP payment credential.
#[must_use]
pub fn has_payment_credential(headers: &axum::http::HeaderMap) -> bool {
    headers
        .get("authorization")
        .and_then(|v| v.to_str().ok())
        .is_some_and(|v| v.trim_start().starts_with("Payment "))
}

/// Build an MPP `402 Payment Required` response for an unpaid endpoint.
#[must_use]
pub fn payment_required(config: &MppConfig, path: &str) -> Response {
    let challenge = challenge_header(config, path);
    let mut resp = (
        StatusCode::PAYMENT_REQUIRED,
        axum::Json(json!({
            "type": "error",
            "error": {
                "type": "payment_required",
                "message": "Payment required for OpenAI-compatible endpoint",
                "protocol": "mpp",
                "intent": "charge",
                "amount": config.amount,
                "currency": config.currency,
                "recipient": config.recipient,
                "method": config.method,
                "resource": path,
            }
        })),
    )
        .into_response();

    resp.headers_mut()
        .insert("content-type", HeaderValue::from_static("application/json"));
    if let Ok(value) = HeaderValue::from_str(&challenge) {
        resp.headers_mut().insert("www-authenticate", value);
    }
    resp
}

fn challenge_header(config: &MppConfig, path: &str) -> String {
    let mut params = vec![
        ("protocol", "mpp".to_string()),
        ("intent", "charge".to_string()),
        ("amount", config.amount.clone()),
        ("currency", config.currency.clone()),
        ("recipient", config.recipient.clone()),
        ("resource", path.to_string()),
    ];
    if let Some(method) = config.method.as_ref().filter(|s| !s.trim().is_empty()) {
        params.push(("method", method.clone()));
    }

    let encoded = params
        .into_iter()
        .map(|(k, v)| format!(r#"{k}="{}""#, escape_header_value(&v)))
        .collect::<Vec<_>>()
        .join(", ");
    format!("Payment {encoded}")
}

fn escape_header_value(value: &str) -> String {
    value.replace('\\', r"\\").replace('"', r#"\""#)
}

/// Convert a consumed payment credential into a clear unsupported response.
///
/// Full settlement verification is method-specific and should be provided by
/// an MPP SDK or payment-method adapter. Until then, returning 501 is safer
/// than accepting unaudited payment proofs.
#[must_use]
pub fn unsupported_payment_verification() -> Response {
    let mut resp = Response::new(Body::from(
        json!({
            "type": "error",
            "error": {
                "type": "payment_verification_unavailable",
                "message": "MPP payment credential verification is not configured"
            }
        })
        .to_string(),
    ));
    *resp.status_mut() = StatusCode::NOT_IMPLEMENTED;
    resp.headers_mut()
        .insert("content-type", HeaderValue::from_static("application/json"));
    resp
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::http::HeaderMap;

    fn config() -> MppConfig {
        MppConfig {
            enabled: true,
            amount: "0.01".into(),
            currency: "USD".into(),
            recipient: "acct_123".into(),
            method: Some("stripe".into()),
        }
    }

    #[test]
    fn challenge_response_uses_http_402_and_payment_auth_scheme() {
        let resp = payment_required(&config(), "/v1/chat/completions");

        assert_eq!(resp.status(), StatusCode::PAYMENT_REQUIRED);
        let header = resp
            .headers()
            .get("www-authenticate")
            .and_then(|v| v.to_str().ok())
            .expect("challenge header");
        assert!(header.starts_with("Payment "));
        assert!(header.contains(r#"protocol="mpp""#));
        assert!(header.contains(r#"intent="charge""#));
        assert!(header.contains(r#"resource="/v1/chat/completions""#));
    }

    #[test]
    fn detects_payment_authorization_credentials() {
        let mut headers = HeaderMap::new();
        assert!(!has_payment_credential(&headers));

        headers.insert(
            "authorization",
            HeaderValue::from_static("Payment credential-token"),
        );
        assert!(has_payment_credential(&headers));
    }

    #[test]
    fn requires_enabled_and_charge_details() {
        assert!(config().is_configured());

        let mut missing = config();
        missing.recipient.clear();
        assert!(!missing.is_configured());
    }
}
