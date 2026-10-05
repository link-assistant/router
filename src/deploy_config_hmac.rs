//! Keyed fingerprints for deploy settings that must never be printed.
//!
//! A runtime environment value or a provider key changes the launch
//! specification, so a deployment must notice the change and reconcile, yet
//! neither may appear in a container label, a log or the JSON report. Both
//! are identified by HMAC-SHA256 keyed by the deployment's `TOKEN_SECRET`,
//! truncated to 128 bits: equal inputs give equal fingerprints, and nobody
//! without the signing secret can test a guess against one.

use base64::Engine as _;
use jsonwebtoken::{Algorithm, EncodingKey};

const ENV_CONTEXT: &[u8] = b"link-assistant-router/deploy/runtime-env-fingerprint/v1\0";
const VALUE_CONTEXT: &[u8] = b"link-assistant-router/deploy/provider-key-fingerprint/v1\0";

/// HMAC-SHA256 of `message` keyed by `key`, hex encoded.
#[must_use]
pub fn hmac_sha256_hex(key: &[u8], message: &[u8]) -> String {
    let signature =
        jsonwebtoken::crypto::sign(message, &EncodingKey::from_secret(key), Algorithm::HS256)
            .expect("HMAC-SHA256 accepts any key");
    let bytes = base64::engine::general_purpose::URL_SAFE_NO_PAD
        .decode(signature)
        .expect("jsonwebtoken returns base64url");
    hex::encode(bytes)
}

fn truncated(key: &str, message: &[u8]) -> String {
    let digest = hmac_sha256_hex(key.as_bytes(), message);
    format!("hmac-sha256:{}", &digest[..32])
}

/// Fingerprint of a runtime environment, `None` when it is empty.
///
/// Order-independent: the entries are sorted by name first. `None` for an
/// empty environment keeps the launch specification of a deployment without
/// passthrough exactly what it was before passthrough existed.
#[must_use]
pub fn env_fingerprint(token_secret: &str, entries: &[(String, String)]) -> Option<String> {
    if entries.is_empty() {
        return None;
    }
    let mut sorted: Vec<&(String, String)> = entries.iter().collect();
    sorted.sort_by(|left, right| left.0.cmp(&right.0));
    let mut message = ENV_CONTEXT.to_vec();
    for (name, value) in sorted {
        message.extend_from_slice(name.as_bytes());
        message.push(0);
        message.extend_from_slice(value.as_bytes());
        message.push(0);
    }
    Some(truncated(token_secret, &message))
}

/// Fingerprint of one provider key, reported instead of the key.
#[must_use]
pub fn value_fingerprint(token_secret: &str, value: &str) -> String {
    let mut message = VALUE_CONTEXT.to_vec();
    message.extend_from_slice(value.as_bytes());
    truncated(token_secret, &message)
}
