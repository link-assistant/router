//! Append-only per-token audit log.
//!
//! Issue #45 asks for "each task a separate token … for
//! audit/monitoring/security/isolation". Per-token counters live in
//! [`crate::metrics`]; this module adds the durable half: one JSON object per
//! line (JSONL), appended as requests are authorised, so an operator can
//! reconstruct after the fact which task token did what.
//!
//! The log is **off by default** and only writes when a path is configured
//! (`--audit-log` / `AUDIT_LOG`). It records the token *id* (the JWT `sub`)
//! and its label — never the token string, never any upstream credential — so
//! the file is safe to ship to a log collector.
//!
//! # Why this one is still JSON
//!
//! Router-owned state is links notation, and the per-token request log moved
//! to it as well (issue #336). This file did not, deliberately: it is an
//! outbound stream whose reader is somebody else's log collector, and the
//! recipes this project publishes for it pipe it into `jq`. Changing its
//! format would break those readers to make a file this project never parses
//! look consistent. The decision is recorded here rather than left to be
//! inferred from which module the write lives in (issue #346).

use std::fs::OpenOptions;
use std::io::Write as _;
use std::path::PathBuf;

#[cfg(unix)]
use std::os::unix::fs::{OpenOptionsExt as _, PermissionsExt as _};

use serde::Serialize;

/// One audit record, serialised as a single JSON line.
#[derive(Debug, Clone, Serialize)]
pub struct AuditEvent {
    /// RFC 3339 timestamp of the authorisation.
    pub time: String,
    /// Router token id (JWT `sub`) — not the token itself.
    pub token_id: String,
    /// Human label given when the token was issued.
    pub label: String,
    /// Upstream provider that served the request.
    pub provider: String,
    /// Client-facing API surface (`anthropic`, `openai_chat`, …).
    pub surface: String,
    /// Request path as seen by the router.
    pub path: String,
    /// Signed managed-client adapter, when this was a bound token.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub client_kind: Option<String>,
    /// Exact risk-accepted matrix cell, when native entitlement was not used.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub subscription_override: Option<String>,
    /// Model requested by the client, when the body carried one.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub model: Option<String>,
}

/// Append-only JSONL audit sink.
///
/// Cloning is cheap; every call re-opens the file in append mode so an
/// external rotator (logrotate, `copytruncate`, …) can move it underneath a
/// running router without restarting the process.
#[derive(Debug, Clone, Default)]
pub struct AuditLog {
    path: Option<PathBuf>,
}

impl AuditLog {
    /// An audit log that discards everything (the default).
    #[must_use]
    pub const fn disabled() -> Self {
        Self { path: None }
    }

    /// An audit log appending to `path`. An empty path disables the log.
    #[must_use]
    pub fn to_path(path: Option<&str>) -> Self {
        Self {
            path: path.filter(|p| !p.is_empty()).map(PathBuf::from),
        }
    }

    /// Whether any record will actually be written.
    #[must_use]
    pub const fn is_enabled(&self) -> bool {
        self.path.is_some()
    }

    /// Configured destination, if any.
    #[must_use]
    pub fn path(&self) -> Option<&std::path::Path> {
        self.path.as_deref()
    }

    /// Append one event. Failures are logged and otherwise ignored: auditing
    /// must never take the proxy down.
    pub fn record(&self, event: &AuditEvent) {
        let Some(path) = self.path.as_ref() else {
            return;
        };
        let Ok(line) = serde_json::to_string(event) else {
            return;
        };
        let write = open_append_only(path).and_then(|mut file| writeln!(file, "{line}"));
        if let Err(e) = write {
            tracing::warn!("audit log write failed ({}): {e}", path.display());
        }
    }
}

fn open_append_only(path: &std::path::Path) -> std::io::Result<std::fs::File> {
    let mut options = OpenOptions::new();
    options.create(true).append(true);
    #[cfg(unix)]
    options.mode(0o600);
    let file = options.open(path)?;
    #[cfg(unix)]
    file.set_permissions(std::fs::Permissions::from_mode(0o600))?;
    Ok(file)
}

/// Build an event for `claims` at the current wall-clock time.
#[must_use]
pub fn event(
    token_id: &str,
    label: &str,
    provider: &str,
    surface: &str,
    path: &str,
    model: Option<&str>,
) -> AuditEvent {
    AuditEvent {
        time: chrono::Utc::now().to_rfc3339(),
        token_id: token_id.to_string(),
        label: label.to_string(),
        provider: provider.to_string(),
        surface: surface.to_string(),
        path: path.to_string(),
        client_kind: None,
        subscription_override: None,
        model: model.map(String::from),
    }
}

/// Name used for a surface in audit records.
#[must_use]
pub const fn surface_name(surface: crate::metrics::Surface) -> &'static str {
    match surface {
        crate::metrics::Surface::Anthropic => "anthropic",
        crate::metrics::Surface::OpenAIChat => "openai_chat",
        crate::metrics::Surface::OpenAIResponses => "openai_responses",
    }
}

/// Record one authorised request against its router token.
///
/// This is the single place that keeps the two halves of issue #45's
/// "separate token per task" requirement in sync: the in-memory counter served
/// by `/metrics` and `/v1/usage`, and the optional durable JSONL trail. Call
/// it once per request, immediately after the token has been validated (and,
/// where applicable, its budget consumed).
pub fn record_authorised_request(
    state: &crate::app_state::AppState,
    claims: &crate::token::TokenClaims,
    surface: crate::metrics::Surface,
    path: &str,
    body: Option<&serde_json::Value>,
) {
    state
        .metrics
        .record_token_request(&claims.sub, &claims.label);
    if !state.audit.is_enabled() {
        return;
    }
    let model = body
        .and_then(|b| b.get("model"))
        .and_then(serde_json::Value::as_str);
    let mut event = event(
        &claims.sub,
        &claims.label,
        state.upstream_provider.as_str(),
        surface_name(surface),
        path,
        model,
    );
    event.client_kind.clone_from(&claims.client_kind);
    if let (Some(client), Some(provider)) = (
        claims
            .client_kind
            .as_deref()
            .and_then(crate::clients::ClientKind::from_str_opt),
        state.upstream_provider.subscription_provider(),
    ) {
        let protocol = match surface {
            crate::metrics::Surface::Anthropic => {
                crate::client_policy::ClientProtocol::AnthropicMessages
            }
            crate::metrics::Surface::OpenAIChat => crate::client_policy::ClientProtocol::OpenAIChat,
            crate::metrics::Surface::OpenAIResponses => {
                crate::client_policy::ClientProtocol::OpenAIResponses
            }
        };
        if state
            .provider_store
            .subscription_entitlement_policy()
            .is_ok_and(|policy| {
                policy.decide(Some(client), provider, protocol)
                    == crate::client_policy::EntitlementDecision::Override
            })
        {
            event.subscription_override = Some(format!("{client}:{provider}"));
        }
    }
    if state.upstream_provider == crate::config::UpstreamProvider::ZaiCodingPlan
        && let Some(client) = claims
            .client_kind
            .as_deref()
            .and_then(crate::clients::ClientKind::from_str_opt)
        && crate::zai_coding_plan::resolve(state).is_ok_and(|provider| {
            provider.is_some_and(|provider| {
                crate::zai_coding_plan::ZaiCodingPlanPolicy::new(
                    provider.subscriber_id.as_deref().unwrap_or_default(),
                    provider.intermediary_risk_acknowledged,
                    &provider.unsupported_clients,
                )
                .is_ok_and(|policy| policy.is_unsupported_override(client))
            })
        })
    {
        event.subscription_override = Some(format!("{client}:z.ai-coding-plan"));
    }
    state.audit.record(&event);
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn disabled_log_writes_nothing() {
        let log = AuditLog::disabled();
        assert!(!log.is_enabled());
        // Must not panic or create files.
        log.record(&event(
            "id",
            "task-1",
            "codex",
            "anthropic",
            "/v1/messages",
            None,
        ));
    }

    #[test]
    fn empty_path_is_treated_as_disabled() {
        assert!(!AuditLog::to_path(Some("")).is_enabled());
        assert!(!AuditLog::to_path(None).is_enabled());
    }

    #[test]
    fn enabled_log_appends_one_json_line_per_event() {
        let dir = std::env::temp_dir().join(format!("la-audit-{}", uuid::Uuid::new_v4()));
        std::fs::create_dir_all(&dir).expect("temp dir");
        let file = dir.join("audit.jsonl");
        let log = AuditLog::to_path(file.to_str());
        assert!(log.is_enabled());

        log.record(&event(
            "tok-1",
            "task-a",
            "codex",
            "anthropic",
            "/v1/messages",
            Some("claude-sonnet-4"),
        ));
        log.record(&event(
            "tok-2",
            "task-b",
            "anthropic",
            "anthropic",
            "/v1/messages",
            None,
        ));

        let body = std::fs::read_to_string(&file).expect("read audit log");
        let lines: Vec<&str> = body.lines().collect();
        assert_eq!(lines.len(), 2);

        let first: serde_json::Value = serde_json::from_str(lines[0]).expect("json line");
        assert_eq!(first["token_id"], "tok-1");
        assert_eq!(first["label"], "task-a");
        assert_eq!(first["provider"], "codex");
        assert_eq!(first["model"], "claude-sonnet-4");
        assert!(first["time"].as_str().is_some_and(|t| t.contains('T')));

        let second: serde_json::Value = serde_json::from_str(lines[1]).expect("json line");
        assert_eq!(second["token_id"], "tok-2");
        // `model` is omitted rather than written as null.
        assert!(second.get("model").is_none());

        std::fs::remove_dir_all(&dir).ok();
    }

    #[cfg(unix)]
    #[test]
    fn enabled_log_is_owner_only() {
        use std::os::unix::fs::PermissionsExt as _;

        let dir = tempfile::tempdir().expect("tempdir");
        let file = dir.path().join("audit.jsonl");
        std::fs::write(&file, "").expect("seed audit log");
        std::fs::set_permissions(&file, std::fs::Permissions::from_mode(0o644))
            .expect("set permissive mode");
        let log = AuditLog::to_path(file.to_str());

        log.record(&event(
            "tok-1",
            "task-a",
            "anthropic",
            "anthropic",
            "/v1/messages",
            None,
        ));

        let mode = std::fs::metadata(file)
            .expect("audit metadata")
            .permissions()
            .mode()
            & 0o777;
        assert_eq!(mode, 0o600);
    }

    #[test]
    fn events_never_carry_the_token_string_or_credentials() {
        let e = event(
            "tok-1",
            "task-a",
            "codex",
            "anthropic",
            "/v1/messages",
            None,
        );
        let json = serde_json::to_string(&e).expect("serialize");
        assert!(!json.contains("la_sk_"));
        assert!(!json.contains("Bearer"));
    }

    #[test]
    fn authorised_bridge_events_name_the_signed_client_and_exact_override() {
        let dir = tempfile::tempdir().expect("tempdir");
        let file = dir.path().join("audit.jsonl");
        let mut state = crate::app_state::AppState::for_tests(dir.path());
        state.upstream_provider = crate::config::UpstreamProvider::Anthropic;
        state.audit = std::sync::Arc::new(AuditLog::to_path(file.to_str()));
        state
            .provider_store
            .set_subscription_entitlement_policy(
                crate::client_policy::SubscriptionEntitlementPolicy::parse(["codex:claude"])
                    .unwrap(),
            )
            .unwrap();
        let claims = crate::token::TokenClaims {
            sub: "token-id".into(),
            iat: 1,
            exp: i64::MAX,
            label: "managed".into(),
            scope: String::new(),
            github_repos: Vec::new(),
            client_kind: Some("codex".into()),
            principal_id: Some("primary".into()),
        };

        record_authorised_request(
            &state,
            &claims,
            crate::metrics::Surface::OpenAIResponses,
            "/v1/responses",
            None,
        );

        let event: serde_json::Value =
            serde_json::from_str(&std::fs::read_to_string(file).unwrap()).unwrap();
        assert_eq!(event["client_kind"], "codex");
        assert_eq!(event["subscription_override"], "codex:claude");
    }
}
