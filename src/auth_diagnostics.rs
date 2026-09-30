//! Protected diagnostics that tell token authentication failures apart
//! (issue #644).
//!
//! After a rollback a live client's token stopped working, and the only
//! evidence was a generic `401 invalid token`. That one sentence covered a
//! token signed by another issuer secret, a record missing from the durable
//! store, an expired or revoked token, a budget or model-policy denial and a
//! legacy server without the run-lease endpoint. Each of those has a different
//! repair, so each is counted and remembered here under its own reason.
//!
//! Nothing here holds a token value: entries carry a truncated SHA-256
//! fingerprint and, when the payload could be read, the token id that the
//! operator already sees in `router tokens list`. The client-facing error text
//! is unchanged; the detail is served only on admin-protected endpoints.

use std::collections::{BTreeMap, VecDeque};
use std::sync::Mutex;

use crate::token::TokenError;

/// How many recent failures are kept. Bounded so a flood of bad tokens cannot
/// grow memory.
pub const RECENT_CAPACITY: usize = 64;

/// Stable reason codes. Kept in one place so docs, metrics and tests agree.
pub mod reason {
    pub const MISSING_CREDENTIAL: &str = "missing_credential";
    pub const INVALID_PREFIX: &str = "invalid_prefix";
    pub const MALFORMED: &str = "malformed";
    pub const SIGNATURE_INVALID: &str = "signature_invalid";
    pub const ISSUER_SECRET_UNSET: &str = "issuer_secret_unset";
    pub const EXPIRED: &str = "expired";
    pub const REVOKED: &str = "revoked";
    pub const MISSING_RECORD: &str = "missing_record";
    pub const BINDING_MISMATCH: &str = "binding_mismatch";
    pub const REQUEST_BUDGET: &str = "request_budget";
    pub const TOKEN_BUDGET: &str = "token_budget";
    pub const RATE_LIMIT: &str = "rate_limit";
    pub const MODEL_POLICY: &str = "model_policy";
    pub const INSUFFICIENT_SCOPE: &str = "insufficient_scope";
    pub const RUN_LEASE_UNRENEWABLE: &str = "run_lease_unrenewable";
    pub const UNSUPPORTED_LEASE_ENDPOINT: &str = "unsupported_lease_endpoint";
    pub const STORAGE: &str = "storage";
    pub const NOT_FOUND: &str = "not_found";
}

impl TokenError {
    /// Stable diagnostic reason for this failure.
    #[must_use]
    pub const fn reason_code(&self) -> &'static str {
        match self {
            Self::InvalidPrefix => reason::INVALID_PREFIX,
            Self::Invalid(_) => reason::MALFORMED,
            Self::SignatureInvalid => reason::SIGNATURE_INVALID,
            Self::IssuerSecretUnset => reason::ISSUER_SECRET_UNSET,
            Self::Expired(_) => reason::EXPIRED,
            Self::Revoked => reason::REVOKED,
            Self::MissingRecord => reason::MISSING_RECORD,
            Self::BindingMismatch => reason::BINDING_MISMATCH,
            Self::NotFound(_) => reason::NOT_FOUND,
            Self::InsufficientScope => reason::INSUFFICIENT_SCOPE,
            Self::LimitExceeded(_) => reason::REQUEST_BUDGET,
            Self::TokenLimitExceeded(_) => reason::TOKEN_BUDGET,
            Self::RateLimitExceeded => reason::RATE_LIMIT,
            Self::Storage(_) => reason::STORAGE,
        }
    }
}

/// One remembered failure.
#[derive(Clone, Debug, serde::Serialize)]
pub struct AuthFailure {
    /// Unix second of the failure.
    pub at: i64,
    /// Stable reason code, see [`reason`].
    pub reason: &'static str,
    /// Truncated SHA-256 of the presented token, if one was presented.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub fingerprint: Option<String>,
    /// Token id read from the (possibly unverified) payload.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub token_id: Option<String>,
}

/// Per-reason counters plus a bounded list of recent failures.
#[derive(Debug, Default)]
pub struct AuthDiagnostics {
    counts: Mutex<BTreeMap<&'static str, u64>>,
    recent: Mutex<VecDeque<AuthFailure>>,
}

/// Snapshot served by the protected diagnostics endpoint.
#[derive(Clone, Debug, serde::Serialize)]
pub struct AuthDiagnosticsSnapshot {
    pub failures_by_reason: BTreeMap<&'static str, u64>,
    pub recent_failures: Vec<AuthFailure>,
}

impl AuthDiagnostics {
    /// Remember one failure. `token` is used only to derive a fingerprint and
    /// the payload's token id; it is never stored.
    pub fn record(&self, reason: &'static str, token: Option<&str>) {
        let fingerprint = token.map(crate::emergency_auth::token_fingerprint);
        let token_id = token.and_then(unverified_subject);
        tracing::debug!(
            reason,
            fingerprint = fingerprint.as_deref().unwrap_or("-"),
            token_id = token_id.as_deref().unwrap_or("-"),
            "Router token authentication failed"
        );
        if let Ok(mut counts) = self.counts.lock() {
            *counts.entry(reason).or_default() += 1;
        }
        if let Ok(mut recent) = self.recent.lock() {
            if recent.len() == RECENT_CAPACITY {
                recent.pop_front();
            }
            recent.push_back(AuthFailure {
                at: chrono::Utc::now().timestamp(),
                reason,
                fingerprint,
                token_id,
            });
        }
    }

    /// Record a [`TokenError`] under its reason code.
    pub fn record_error(&self, error: &TokenError, token: Option<&str>) {
        self.record(error.reason_code(), token);
    }

    /// Point-in-time copy for the protected endpoint.
    #[must_use]
    pub fn snapshot(&self) -> AuthDiagnosticsSnapshot {
        AuthDiagnosticsSnapshot {
            failures_by_reason: self
                .counts
                .lock()
                .map(|counts| counts.clone())
                .unwrap_or_default(),
            recent_failures: self
                .recent
                .lock()
                .map(|recent| recent.iter().rev().cloned().collect())
                .unwrap_or_default(),
        }
    }

    /// Prometheus counter lines, one per reason seen.
    #[must_use]
    pub fn render_prometheus(&self) -> String {
        let mut body = String::from(
            "# HELP link_assistant_auth_failures_total Router token authentication failures by reason.\n\
             # TYPE link_assistant_auth_failures_total counter\n",
        );
        let snapshot = self.snapshot();
        if snapshot.failures_by_reason.is_empty() {
            body.push_str("link_assistant_auth_failures_total 0\n");
        }
        for (reason, count) in &snapshot.failures_by_reason {
            body.push_str(&format!(
                "link_assistant_auth_failures_total{{reason=\"{reason}\"}} {count}\n"
            ));
        }
        body
    }
}

/// The `sub` of a JWT payload, read without verifying the signature. Only a
/// UUID-shaped id is kept, so an attacker-supplied payload cannot write
/// arbitrary text into the diagnostics.
fn unverified_subject(token: &str) -> Option<String> {
    use base64::Engine;
    let jwt = crate::token::token_jwt(token)?;
    let payload = jwt.split('.').nth(1)?;
    let bytes = base64::engine::general_purpose::URL_SAFE_NO_PAD
        .decode(payload.trim_end_matches('='))
        .ok()?;
    let value: serde_json::Value = serde_json::from_slice(&bytes).ok()?;
    let sub = value.get("sub")?.as_str()?;
    uuid::Uuid::parse_str(sub).ok().map(|id| id.to_string())
}

#[cfg(test)]
#[path = "auth_diagnostics_tests.rs"]
mod tests;
