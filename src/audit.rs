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
    /// Lifecycle point for this record (`request_authorized` or
    /// `response_completed`).
    pub phase: String,
    /// RFC 3339 timestamp of the authorisation.
    pub time: String,
    /// Router token id (JWT `sub`) — not the token itself.
    pub token_id: String,
    /// Human label given when the token was issued.
    pub label: String,
    /// Upstream provider that served the request.
    pub provider: String,
    /// Exact provider account/principal selected for the exchange, when the
    /// route has an account dimension.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub provider_account: Option<String>,
    /// Exact upstream endpoint selected for the exchange, when known.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub provider_endpoint: Option<String>,
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
    /// Native client identity accepted through an operator-enabled proxy.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub proxied_client_override: Option<String>,
    /// Model requested by the client, when the body carried one.
    pub model: Option<String>,
    /// Canonical model sent upstream when it differs from the requested id.
    pub resolved_model: Option<String>,
    /// Evidence-backed semantics of the exact requested selector.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub selector_kind: Option<crate::model_contract::ModelSelectorKind>,
    /// Why the requested and served identities were accepted together.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub resolution_reason: Option<String>,
    /// Durable exact-selector authority applied before routing this request.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub model_policy: Option<crate::model_contract::ModelAccessPolicy>,
    /// Concrete identity reported by the upstream response, when this record
    /// represents a completed buffered exchange.
    pub served_model: Option<String>,
    /// Canonical descriptor shared with launch and model diagnostics. The
    /// legacy flat fields above remain for existing JSONL consumers.
    pub model_descriptor: crate::model_contract::ModelTruthDescriptor,
}

impl AuditEvent {
    fn refresh_model_descriptor(&mut self) {
        let policy = self.model_policy.as_ref();
        self.model_descriptor = crate::model_contract::ModelTruthDescriptor {
            requested_selector: self.model.clone(),
            selector_kind: self.selector_kind.unwrap_or_default(),
            route: crate::model_contract::ModelRouteScope {
                provider: (!self.provider.is_empty()).then(|| self.provider.clone()),
                account: self.provider_account.clone(),
                endpoint: self.provider_endpoint.clone(),
                protocols: if self.surface == "control_plane" {
                    Vec::new()
                } else {
                    vec![self.surface.clone()]
                },
            },
            upstream_request_model: self.resolved_model.clone().or_else(|| self.model.clone()),
            upstream_served_model: self.served_model.clone(),
            capabilities: serde_json::Value::Null,
            capability_provenance: serde_json::Value::Null,
            allow_substitution: policy.is_some_and(|policy| policy.allow_substitution),
            substitution_source: policy.and_then(|policy| policy.substitution_source.clone()),
        };
    }
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
    let mut event = AuditEvent {
        phase: "request_authorized".to_string(),
        time: chrono::Utc::now().to_rfc3339(),
        token_id: token_id.to_string(),
        label: label.to_string(),
        provider: provider.to_string(),
        provider_account: None,
        provider_endpoint: None,
        surface: surface.to_string(),
        path: path.to_string(),
        client_kind: None,
        subscription_override: None,
        proxied_client_override: None,
        model: model.map(String::from),
        resolved_model: None,
        selector_kind: None,
        resolution_reason: None,
        model_policy: None,
        served_model: None,
        model_descriptor: crate::model_contract::ModelTruthDescriptor::default(),
    };
    event.refresh_model_descriptor();
    event
}

fn record_response_model(audit: &ResponseModelAudit, served_model: &str, phase: &str) {
    let state = &audit.state;
    if !state.audit.is_enabled() {
        return;
    }
    let mut event = event(
        &audit.claims.sub,
        &audit.claims.label,
        audit
            .provider
            .as_deref()
            .unwrap_or_else(|| state.upstream_provider.as_str()),
        surface_name(audit.surface),
        &audit.path,
        audit.requested_model.as_deref(),
    );
    event.phase = phase.to_string();
    event.resolved_model.clone_from(&audit.resolved_model);
    event.served_model = Some(served_model.to_string());
    event.model_policy = crate::proxy::model_policy_for_claims(state, &audit.claims).ok();
    event.provider_account.clone_from(&audit.provider_account);
    event.provider_endpoint.clone_from(&audit.provider_endpoint);
    event.selector_kind = Some(audit.selector_kind);
    event.resolution_reason = Some(resolution_reason(
        audit.requested_model.as_deref(),
        served_model,
        audit.selector_kind,
        event.model_policy.as_ref(),
    ));
    event.client_kind.clone_from(&audit.claims.client_kind);
    event.refresh_model_descriptor();
    state.audit.record(&event);
}

/// Owned audit context for a translated response.
///
/// A stream can prove identity before it completes, so the first validated
/// identity-bearing event is recorded as `response_model_verified` without
/// claiming terminal success.
#[derive(Clone)]
pub struct ResponseModelAudit {
    state: crate::app_state::AppState,
    claims: crate::token::TokenClaims,
    surface: crate::metrics::Surface,
    path: String,
    requested_model: Option<String>,
    resolved_model: Option<String>,
    provider: Option<String>,
    provider_account: Option<String>,
    provider_endpoint: Option<String>,
    selector_kind: crate::model_contract::ModelSelectorKind,
}

impl ResponseModelAudit {
    #[must_use]
    pub fn new(
        state: &crate::app_state::AppState,
        claims: &crate::token::TokenClaims,
        surface: crate::metrics::Surface,
        path: &str,
    ) -> Self {
        Self {
            state: state.clone(),
            claims: claims.clone(),
            surface,
            path: path.to_string(),
            requested_model: None,
            resolved_model: None,
            provider: None,
            provider_account: None,
            provider_endpoint: None,
            selector_kind: crate::model_contract::ModelSelectorKind::Unknown,
        }
    }

    #[must_use]
    pub fn with_provider(mut self, provider: Option<&str>) -> Self {
        self.provider = provider.map(str::to_string);
        self
    }

    #[must_use]
    pub fn with_models(
        mut self,
        requested_model: Option<&str>,
        resolved_model: Option<&str>,
    ) -> Self {
        self.requested_model = requested_model.map(str::to_string);
        self.resolved_model = resolved_model.map(str::to_string);
        self
    }

    #[must_use]
    pub fn with_provider_account(mut self, provider_account: Option<&str>) -> Self {
        self.provider_account = provider_account.map(str::to_string);
        self
    }

    #[must_use]
    pub fn with_provider_endpoint(mut self, provider_endpoint: Option<&str>) -> Self {
        self.provider_endpoint = provider_endpoint.map(str::to_string);
        self
    }

    #[must_use]
    pub const fn with_selector_kind(
        mut self,
        selector_kind: crate::model_contract::ModelSelectorKind,
    ) -> Self {
        self.selector_kind = selector_kind;
        self
    }

    /// Record a completed buffered response carrying all three model
    /// identities after the upstream has proved its concrete model.
    pub fn record_completed(&self, served_model: &str) {
        record_response_model(self, served_model, "response_completed");
    }

    /// Record the first concrete identity after the stream validator accepts
    /// it. Callers guard this so exactly one record is written per stream.
    pub fn record_verified(&self, served_model: &str) {
        record_response_model(self, served_model, "response_model_verified");
    }
}

fn resolution_reason(
    requested_model: Option<&str>,
    served_model: &str,
    selector_kind: crate::model_contract::ModelSelectorKind,
    policy: Option<&crate::model_contract::ModelAccessPolicy>,
) -> String {
    if requested_model == Some(served_model) {
        return "exact_match".to_string();
    }
    match selector_kind {
        crate::model_contract::ModelSelectorKind::ProviderDynamicAlias => {
            "provider_dynamic_alias".to_string()
        }
        crate::model_contract::ModelSelectorKind::OperatorAlias => "operator_alias".to_string(),
        crate::model_contract::ModelSelectorKind::Concrete
        | crate::model_contract::ModelSelectorKind::Unknown => policy
            .filter(|policy| policy.allow_substitution)
            .and_then(|policy| policy.substitution_source.clone())
            .unwrap_or_else(|| "unpinned_provider_selection".to_string()),
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
    record_authorised_request_with_resolved_model(state, claims, surface, path, body, None);
}

/// Record a provider control-plane operation without treating it as inference.
///
/// `operation` must be a fixed public operation name, never a caller-supplied
/// resource id or request field. Private history, notes, paths, session ids,
/// account ids, and response data consequently never reach the audit stream.
pub fn record_control_plane_request(
    state: &crate::app_state::AppState,
    claims: &crate::token::TokenClaims,
    provider: &str,
    operation: &str,
) {
    state
        .metrics
        .record_token_request(&claims.sub, &claims.label);
    if !state.audit.is_enabled() {
        return;
    }
    let mut event = event(
        &claims.sub,
        &claims.label,
        provider,
        "control_plane",
        operation,
        None,
    );
    event.client_kind.clone_from(&claims.client_kind);
    event.refresh_model_descriptor();
    state.audit.record(&event);
}

/// Record an authorised request with both client and canonical model identity.
pub fn record_authorised_request_with_resolved_model(
    state: &crate::app_state::AppState,
    claims: &crate::token::TokenClaims,
    surface: crate::metrics::Surface,
    path: &str,
    body: Option<&serde_json::Value>,
    resolved_model: Option<&str>,
) {
    record_authorised_request_with_resolved_model_and_entitlement(
        state,
        claims,
        surface,
        path,
        body,
        resolved_model,
        None,
    );
}

/// Record an authorised subscription request including how its client
/// evidence was accepted.
pub(crate) fn record_authorised_request_with_resolved_model_and_entitlement(
    state: &crate::app_state::AppState,
    claims: &crate::token::TokenClaims,
    surface: crate::metrics::Surface,
    path: &str,
    body: Option<&serde_json::Value>,
    resolved_model: Option<&str>,
    entitlement: Option<crate::client_policy::EntitlementDecision>,
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
    event.resolved_model = resolved_model
        .filter(|resolved| Some(*resolved) != model)
        .map(str::to_string);
    event.model_policy = crate::proxy::model_policy_for_claims(state, claims).ok();
    event.client_kind.clone_from(&claims.client_kind);
    if entitlement == Some(crate::client_policy::EntitlementDecision::Proxied) {
        event
            .proxied_client_override
            .clone_from(&claims.client_kind);
    }
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
    event.refresh_model_descriptor();
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
        // Unknown identity is explicit, so audit consumers can distinguish it
        // from an older record that never implemented the field.
        assert!(second["model"].is_null());

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

    #[test]
    fn proxied_client_evidence_is_explicit_in_the_audit_record() {
        let dir = tempfile::tempdir().expect("tempdir");
        let file = dir.path().join("audit.jsonl");
        let mut state = crate::app_state::AppState::for_tests(dir.path());
        state.upstream_provider = crate::config::UpstreamProvider::Codex;
        state.audit = std::sync::Arc::new(AuditLog::to_path(file.to_str()));
        let claims = crate::token::TokenClaims {
            sub: "token-id".into(),
            iat: 1,
            exp: i64::MAX,
            label: "proxied-codex".into(),
            scope: String::new(),
            github_repos: Vec::new(),
            client_kind: Some("codex".into()),
            principal_id: Some("primary".into()),
        };

        record_authorised_request_with_resolved_model_and_entitlement(
            &state,
            &claims,
            crate::metrics::Surface::OpenAIResponses,
            "/v1/responses",
            None,
            Some("gpt-5.5"),
            Some(crate::client_policy::EntitlementDecision::Proxied),
        );

        let event: serde_json::Value =
            serde_json::from_str(&std::fs::read_to_string(file).unwrap()).unwrap();
        assert_eq!(event["client_kind"], "codex");
        assert_eq!(event["proxied_client_override"], "codex");
        assert!(event.get("subscription_override").is_none());
        assert_eq!(
            crate::metrics::usage_snapshot(&state.metrics).token_calls["token-id"].requests,
            1,
            "recording the evidence decision must not double-count token usage"
        );
    }

    #[test]
    fn authorised_events_keep_requested_and_resolved_model_identity() {
        let dir = tempfile::tempdir().expect("tempdir");
        let file = dir.path().join("audit.jsonl");
        let mut state = crate::app_state::AppState::for_tests(dir.path());
        state.upstream_provider = crate::config::UpstreamProvider::OpenAICompatible;
        state.audit = std::sync::Arc::new(AuditLog::to_path(file.to_str()));
        let claims = crate::token::TokenClaims {
            sub: "token-id".into(),
            iat: 1,
            exp: i64::MAX,
            label: "managed".into(),
            scope: String::new(),
            github_repos: Vec::new(),
            client_kind: Some("opencode".into()),
            principal_id: Some("primary".into()),
        };

        record_authorised_request_with_resolved_model(
            &state,
            &claims,
            crate::metrics::Surface::OpenAIChat,
            "/v1/chat/completions",
            Some(&serde_json::json!({"model": "stored/shared-future"})),
            Some("shared-future"),
        );

        let event: serde_json::Value =
            serde_json::from_str(&std::fs::read_to_string(file).unwrap()).unwrap();
        assert_eq!(event["model"], "stored/shared-future");
        assert_eq!(event["resolved_model"], "shared-future");
        assert_eq!(
            event["model_descriptor"]["requested_selector"],
            "stored/shared-future"
        );
        assert_eq!(
            event["model_descriptor"]["upstream_request_model"],
            "shared-future"
        );
        assert_eq!(
            event["model_descriptor"]["route"]["protocols"],
            serde_json::json!(["openai_chat"])
        );
        assert!(event["model_descriptor"]["upstream_served_model"].is_null());
    }

    #[test]
    fn response_events_complete_the_canonical_model_descriptor() {
        let dir = tempfile::tempdir().expect("tempdir");
        let file = dir.path().join("audit.jsonl");
        let mut state = crate::app_state::AppState::for_tests(dir.path());
        state.upstream_provider = crate::config::UpstreamProvider::OpenAICompatible;
        state.audit = std::sync::Arc::new(AuditLog::to_path(file.to_str()));
        let claims = crate::token::TokenClaims {
            sub: "token-id".into(),
            iat: 1,
            exp: i64::MAX,
            label: "managed".into(),
            scope: String::new(),
            github_repos: Vec::new(),
            client_kind: Some("opencode".into()),
            principal_id: Some("primary".into()),
        };

        ResponseModelAudit::new(
            &state,
            &claims,
            crate::metrics::Surface::OpenAIChat,
            "/v1/chat/completions",
        )
        .with_provider(Some("openai-compatible"))
        .with_provider_account(Some("primary"))
        .with_provider_endpoint(Some("https://provider.example/v1"))
        .with_models(Some("provider/latest"), Some("provider/model-2026"))
        .with_selector_kind(crate::model_contract::ModelSelectorKind::ProviderDynamicAlias)
        .record_completed("provider/model-2026");

        let event: serde_json::Value =
            serde_json::from_str(&std::fs::read_to_string(file).unwrap()).unwrap();
        let descriptor = &event["model_descriptor"];
        assert_eq!(descriptor["requested_selector"], "provider/latest");
        assert_eq!(descriptor["selector_kind"], "provider_dynamic_alias");
        assert_eq!(descriptor["route"]["provider"], "openai-compatible");
        assert_eq!(descriptor["route"]["account"], "primary");
        assert_eq!(
            descriptor["route"]["endpoint"],
            "https://provider.example/v1"
        );
        assert_eq!(descriptor["upstream_request_model"], "provider/model-2026");
        assert_eq!(descriptor["upstream_served_model"], "provider/model-2026");
    }
}
