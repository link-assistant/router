//! Explicit, bounded emergency mode that accepts any incoming Router token
//! (issue #645).
//!
//! The mode exists for an operator recovering their own deployment: a client
//! holding an old, unknown, expired, revoked, foreign or malformed Router token
//! keeps working while the real token store is repaired. It is never the
//! default and never switches itself on.
//!
//! What it changes, and nothing more:
//!
//! - **Client (inference, model discovery, usage, run lease) routes.** Any
//!   *non-empty* credential in any accepted carrier (`Authorization: Bearer`,
//!   `x-api-key`, `x-goog-api-key`; `la_sk_`, `at-` or anything else) is
//!   accepted. The caller receives synthetic claims whose id is
//!   `emergency-bypass-<fingerprint>`, so no durable token record is read for
//!   authority, charged, renewed, revoked or revived. Budgets, rate limits and
//!   per-token model pins therefore do not apply to bypassed requests.
//! - **No credential at all** is still `401`: the mode accepts any *token*, not
//!   anonymous callers.
//! - **Management routes** keep ordinary administrator authentication. An
//!   emergency token can neither mint, rotate nor revoke credentials, which is
//!   what keeps the mode non-destructive.
//! - **Consumer subscriptions** keep their entitlement matrix and request
//!   evidence rules, because those protect the provider account rather than
//!   the Router. The client binding the matrix needs is inferred from the
//!   request (its user agent and client headers, the `at-` Codex carrier) and
//!   only then from the unverified token payload.
//! - **Upstream credentials** are untouched and must still be valid.
//!
//! Every bypass is counted by reason and logged with a token fingerprint, never
//! the token itself. The mode ends when its bounded duration lapses, when an
//! administrator calls `POST /api/management/emergency-auth/disable`, or when
//! the process restarts without the flag.

use std::collections::BTreeMap;
use std::net::SocketAddr;
use std::sync::Mutex;
use std::sync::atomic::{AtomicI64, AtomicU64, Ordering};

use axum::http::HeaderMap;

use crate::clients::ClientKind;
use crate::token::TokenClaims;

/// Command-line flag that turns the mode on.
pub const FLAG: &str = "--emergency-accept-any-token";
/// Environment variable that turns the mode on.
pub const ENV: &str = "EMERGENCY_ACCEPT_ANY_TOKEN";
/// Environment variable acknowledging exposure beyond loopback.
pub const ALLOW_NON_LOOPBACK_ENV: &str = "EMERGENCY_ALLOW_NON_LOOPBACK";
/// Environment variable bounding how long the mode stays on.
pub const DURATION_ENV: &str = "EMERGENCY_DURATION_MINUTES";
/// Every environment variable that configures the mode. Deployment launchers
/// strip these so an ordinary deployment never inherits the mode silently.
pub const ENV_VARS: [&str; 3] = [ENV, ALLOW_NON_LOOPBACK_ENV, DURATION_ENV];
/// Default lifetime of the mode once enabled.
pub const DEFAULT_DURATION_MINUTES: u64 = 60;
/// Longest lifetime an operator may request. A forgotten mode lapses within a
/// day even if nobody disables it.
pub const MAX_DURATION_MINUTES: u64 = 24 * 60;
/// Prefix of the synthetic token id given to every bypassed request.
pub const SUBJECT_PREFIX: &str = "emergency-bypass-";
/// Label given to every bypassed request, visible in the request log.
pub const LABEL: &str = "emergency-bypass";
/// Response header set on `/api/health` while the mode is active.
pub const HEALTH_HEADER: &str = "x-link-assistant-emergency-auth";

/// Operator configuration for the mode, resolved from CLI, env and `.lenv`.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct EmergencyAuthConfig {
    /// Whether the mode starts enabled.
    pub enabled: bool,
    /// Explicit acknowledgement that a non-loopback listener may serve it.
    pub allow_non_loopback: bool,
    /// How long it stays on after start-up.
    pub duration_minutes: u64,
}

impl Default for EmergencyAuthConfig {
    fn default() -> Self {
        Self {
            enabled: false,
            allow_non_loopback: false,
            duration_minutes: DEFAULT_DURATION_MINUTES,
        }
    }
}

impl EmergencyAuthConfig {
    /// Refuse a configuration that would silently expose the mode.
    ///
    /// # Errors
    ///
    /// Returns an operator-facing message when the duration is out of bounds
    /// or when a listener is not loopback and exposure was not acknowledged.
    pub fn check(&self, listeners: &[SocketAddr]) -> Result<(), String> {
        if !self.enabled {
            return Ok(());
        }
        if self.duration_minutes == 0 || self.duration_minutes > MAX_DURATION_MINUTES {
            return Err(format!(
                "{DURATION_ENV} must be between 1 and {MAX_DURATION_MINUTES} minutes"
            ));
        }
        let exposed = listeners
            .iter()
            .filter(|address| !address.ip().is_loopback())
            .map(ToString::to_string)
            .collect::<Vec<_>>();
        if exposed.is_empty() || self.allow_non_loopback {
            return Ok(());
        }
        Err(format!(
            "{FLAG} accepts any Router token, but the router would listen on non-loopback \
             address(es) {}. Bind to 127.0.0.1 (for example `--host 127.0.0.1`) or acknowledge \
             the exposure with --emergency-allow-non-loopback / {ALLOW_NON_LOOPBACK_ENV}=true.",
            exposed.join(", ")
        ))
    }
}

/// Live state of the mode, shared by every request through the token manager.
#[derive(Debug, Default)]
pub struct EmergencyAuth {
    /// Unix second until which the mode is active; `0` means off.
    active_until: AtomicI64,
    bypassed: AtomicU64,
    reasons: Mutex<BTreeMap<&'static str, u64>>,
}

/// Point-in-time view of the mode for diagnostics.
#[derive(Clone, Debug, Default, serde::Serialize)]
pub struct EmergencyAuthStatus {
    pub active: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub expires_at: Option<i64>,
    pub bypassed_requests: u64,
    pub bypassed_by_reason: BTreeMap<&'static str, u64>,
}

impl EmergencyAuth {
    /// Turn the mode on for a bounded number of minutes and return the unix
    /// second at which it lapses.
    pub fn enable_for_minutes(&self, minutes: u64) -> i64 {
        let minutes = minutes.clamp(1, MAX_DURATION_MINUTES);
        let seconds = i64::try_from(minutes * 60).unwrap_or(i64::MAX);
        let until = now().saturating_add(seconds);
        self.active_until.store(until, Ordering::SeqCst);
        until
    }

    /// Turn the mode off at once. Returns whether it was on.
    pub fn disable(&self) -> bool {
        let previous = self.active_until.swap(0, Ordering::SeqCst);
        previous > now()
    }

    /// When the mode lapses, if it is on right now.
    #[must_use]
    pub fn active_until(&self) -> Option<i64> {
        let until = self.active_until.load(Ordering::SeqCst);
        (until > now()).then_some(until)
    }

    /// Whether the mode is on right now.
    #[must_use]
    pub fn is_active(&self) -> bool {
        self.active_until().is_some()
    }

    /// Count one bypassed request under the check it bypassed.
    pub fn record_bypass(&self, reason: &'static str) {
        self.bypassed.fetch_add(1, Ordering::Relaxed);
        if let Ok(mut reasons) = self.reasons.lock() {
            *reasons.entry(reason).or_default() += 1;
        }
    }

    /// Snapshot for status endpoints.
    #[must_use]
    pub fn status(&self) -> EmergencyAuthStatus {
        let expires_at = self.active_until();
        EmergencyAuthStatus {
            active: expires_at.is_some(),
            expires_at,
            bypassed_requests: self.bypassed.load(Ordering::Relaxed),
            bypassed_by_reason: self
                .reasons
                .lock()
                .map(|reasons| reasons.clone())
                .unwrap_or_default(),
        }
    }

    /// Prometheus lines for the mode.
    #[must_use]
    pub fn render_prometheus(&self) -> String {
        let status = self.status();
        let mut body = String::from(
            "# HELP link_assistant_emergency_auth_active 1 while the emergency any-token mode is on.\n\
             # TYPE link_assistant_emergency_auth_active gauge\n",
        );
        body.push_str(&format!(
            "link_assistant_emergency_auth_active {}\n",
            u8::from(status.active)
        ));
        body.push_str(
            "# HELP link_assistant_emergency_auth_bypassed_total Requests admitted by the emergency any-token mode, by the check they bypassed.\n\
             # TYPE link_assistant_emergency_auth_bypassed_total counter\n",
        );
        if status.bypassed_by_reason.is_empty() {
            body.push_str("link_assistant_emergency_auth_bypassed_total 0\n");
        }
        for (reason, count) in &status.bypassed_by_reason {
            body.push_str(&format!(
                "link_assistant_emergency_auth_bypassed_total{{reason=\"{reason}\"}} {count}\n"
            ));
        }
        body
    }
}

/// Stable, non-reversible fingerprint of a token for logs and diagnostics.
#[must_use]
pub fn token_fingerprint(token: &str) -> String {
    use sha2::Digest;
    let digest = sha2::Sha256::digest(token.as_bytes());
    hex::encode(&digest[..6])
}

/// Claims given to a request the emergency mode admits.
///
/// The id is derived from the token fingerprint, never from the token's own
/// `sub`, so budget admission, usage settlement and run-lease renewal find no
/// durable record and change nothing.
#[must_use]
pub fn synthetic_claims(token: &str, headers: &HeaderMap) -> TokenClaims {
    let payload = unverified_payload(token);
    let payload_field = |name: &str| {
        payload
            .as_ref()
            .and_then(|value| value.get(name))
            .and_then(serde_json::Value::as_str)
            .map(str::to_string)
    };
    let client = infer_client(token, headers).or_else(|| {
        payload_field("client_kind")
            .as_deref()
            .and_then(ClientKind::from_str_opt)
    });
    let fingerprint = token_fingerprint(token);
    let now = now();
    TokenClaims {
        sub: format!("{SUBJECT_PREFIX}{fingerprint}"),
        iat: now,
        exp: now.saturating_add(60),
        label: LABEL.to_string(),
        // Never administrative: management routes keep their own checks.
        scope: String::new(),
        github_repos: Vec::new(),
        client_kind: client.map(|client| client.canonical_name().to_string()),
        principal_id: client.map(|_| {
            payload_field("principal_id")
                .filter(|principal| !principal.trim().is_empty())
                .unwrap_or_else(|| format!("emergency-{fingerprint}"))
        }),
    }
}

/// Whether claims were produced by [`synthetic_claims`].
#[must_use]
pub fn is_synthetic(claims: &TokenClaims) -> bool {
    is_synthetic_id(&claims.sub) && claims.label == LABEL
}

/// Whether a token id is the synthetic id of a bypassed request. Real ids are
/// UUIDs, so the prefix can never name a durable record.
#[must_use]
pub fn is_synthetic_id(token_id: &str) -> bool {
    token_id.starts_with(SUBJECT_PREFIX)
}

/// Decode a JWT payload without verifying it. Used only to keep a bypassed
/// request's client binding and subscriber continuity; never as authority.
fn unverified_payload(token: &str) -> Option<serde_json::Value> {
    use base64::Engine;
    let jwt = crate::token::token_jwt(token).unwrap_or(token);
    let payload = jwt.split('.').nth(1)?;
    let bytes = base64::engine::general_purpose::URL_SAFE_NO_PAD
        .decode(payload.trim_end_matches('='))
        .ok()?;
    serde_json::from_slice(&bytes).ok()
}

/// Infer the calling client from what the request itself says.
fn infer_client(token: &str, headers: &HeaderMap) -> Option<ClientKind> {
    let header = |name: &str| {
        headers
            .get(name)
            .and_then(|value| value.to_str().ok())
            .filter(|value| !value.is_empty())
    };
    if let Some(client) = header("x-link-assistant-client").and_then(ClientKind::from_str_opt) {
        return Some(client);
    }
    let agent = header("user-agent").map(str::to_ascii_lowercase);
    let agent = agent.as_deref().unwrap_or_default();
    if agent.starts_with("claude") {
        Some(ClientKind::ClaudeCode)
    } else if agent.starts_with("codex") || token.starts_with(crate::token::CODEX_TOKEN_PREFIX) {
        Some(ClientKind::Codex)
    } else if agent.starts_with("opencode/") {
        Some(ClientKind::Opencode)
    } else if agent.starts_with("grok") {
        Some(ClientKind::GrokCli)
    } else if header("x-goog-api-client").is_some() || header("x-goog-api-key").is_some() {
        Some(ClientKind::GeminiCli)
    } else if header("x-stainless-package-version").is_some() {
        Some(ClientKind::QwenCode)
    } else {
        None
    }
}

fn now() -> i64 {
    chrono::Utc::now().timestamp()
}

#[cfg(test)]
#[path = "emergency_auth_tests.rs"]
mod tests;
