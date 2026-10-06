//! Vendor rate-limit state for pooled subscription accounts (issue #677).
//!
//! Anthropic reports a subscription's quota on every response in the
//! `anthropic-ratelimit-unified-*` headers: one `-status`/`-reset` pair for the
//! credential overall and one per window (`5h`, `7d`, and model-family windows
//! such as `7d_opus`), each with an optional `-utilization` fraction. Status is
//! `allowed`, `allowed_warning` or `rejected`; reset is unix seconds.
//!
//! Router used to cool a rejected account for `Retry-After` or a fixed default,
//! so a weekly limit was retried every minute for days and a limit on one model
//! took the whole account out of rotation. This module reads those headers and
//! decides three things:
//!
//! - **how long** a rejected account stays out: until the longest rejected
//!   window resets (bounded by [`MAX_VENDOR_COOLDOWN`]);
//! - **what** it is out for: one model, or the whole credential
//!   ([`classify_scope`] documents the heuristic);
//! - whether to **pause** it early, before the vendor rejects it, when the
//!   operator set `ACCOUNT_PAUSE_AT_PERCENT` ([`threshold_decision`]).
//!
//! The decisions are kept per account and persisted in [`STATE_FILE`] so a
//! restart, `router doctor` and `deploy --status` see what the serving process
//! learned. The file holds account names, windows and timestamps, never a
//! credential.

use std::collections::BTreeMap;
use std::fmt::Write as _;
use std::path::{Path, PathBuf};
use std::time::{Duration, SystemTime};

use axum::http::HeaderMap;
use serde::{Deserialize, Serialize};

/// Header prefix shared by every unified rate-limit header.
const UNIFIED_PREFIX: &str = "anthropic-ratelimit-unified-";

/// Longest cooldown accepted from a vendor reset time.
///
/// The weekly window plus a day of slack. A reset further out is treated as this bound, so a corrupt
/// or hostile header cannot remove an account for longer.
pub const MAX_VENDOR_COOLDOWN: Duration = Duration::from_secs(8 * 24 * 60 * 60);

/// The data-directory file that keeps per-account cooldowns and pauses.
pub const STATE_FILE: &str = "account-limits.json";

/// Model families a model-scoped vendor limit can name.
const MODEL_FAMILIES: [&str; 3] = ["opus", "sonnet", "haiku"];

/// What the vendor said about one window.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "snake_case")]
pub enum LimitStatus {
    Allowed,
    AllowedWarning,
    Rejected,
}

impl LimitStatus {
    /// Parse a header value; unknown values are not guessed at.
    #[must_use]
    pub fn parse(value: &str) -> Option<Self> {
        match value.trim().to_ascii_lowercase().as_str() {
            "allowed" => Some(Self::Allowed),
            "allowed_warning" => Some(Self::AllowedWarning),
            "rejected" => Some(Self::Rejected),
            _ => None,
        }
    }

    #[must_use]
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Allowed => "allowed",
            Self::AllowedWarning => "allowed_warning",
            Self::Rejected => "rejected",
        }
    }
}

/// One vendor rate-limit window as last reported.
#[derive(Clone, Debug, Default, PartialEq, Serialize, Deserialize, schemars::JsonSchema)]
pub struct WindowLimit {
    /// `overall` for the credential-wide pair, otherwise the header infix
    /// (`5h`, `7d`, `7d_opus`, ...), lowercased.
    pub name: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub status: Option<LimitStatus>,
    /// Unix seconds at which the window resets.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub reset_unix: Option<u64>,
    /// Fraction of the window used, `0.0..=1.0` (values above one are kept:
    /// the vendor may report overage).
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub utilization: Option<f64>,
}

impl WindowLimit {
    /// Whether this window names a model family rather than the credential.
    #[must_use]
    pub fn model_family(&self) -> Option<&'static str> {
        MODEL_FAMILIES
            .into_iter()
            .find(|family| self.name.contains(family))
    }
}

/// Every unified window one response carried, plus the representative claim.
#[derive(Clone, Debug, Default, PartialEq)]
pub struct UnifiedLimits {
    pub windows: Vec<WindowLimit>,
    /// `anthropic-ratelimit-unified-representative-claim`, lowercased: the
    /// window the vendor says is binding (e.g. `five_hour`, `seven_day_opus`).
    pub representative_claim: Option<String>,
}

impl UnifiedLimits {
    /// Whether the response carried no unified rate-limit information.
    #[must_use]
    pub const fn is_empty(&self) -> bool {
        self.windows.is_empty() && self.representative_claim.is_none()
    }

    /// Windows the vendor reported as rejected.
    pub fn rejected(&self) -> impl Iterator<Item = &WindowLimit> {
        self.windows
            .iter()
            .filter(|window| window.status == Some(LimitStatus::Rejected))
    }
}

/// Read the unified rate-limit headers of one response.
///
/// Header names are matched case-insensitively (`HeaderMap` stores them
/// lowercased) and so are the status values. A window is recorded when any of
/// its status, reset or utilization parsed; unparseable values are dropped
/// rather than guessed.
#[must_use]
pub fn parse_unified(headers: &HeaderMap) -> UnifiedLimits {
    let mut windows: BTreeMap<String, WindowLimit> = BTreeMap::new();
    let mut representative_claim = None;
    for (name, value) in headers {
        let Some(rest) = name.as_str().strip_prefix(UNIFIED_PREFIX) else {
            continue;
        };
        let Ok(value) = value.to_str() else {
            continue;
        };
        if rest == "representative-claim" {
            representative_claim = Some(value.trim().to_ascii_lowercase());
            continue;
        }
        let (window, field) = match rest {
            "status" | "reset" | "utilization" => ("overall", rest),
            _ => match rest.rsplit_once('-') {
                // `overage-*` describes paid usage beyond the plan, not a
                // usage window: `rejected` there only means overage is off.
                Some(("overage", _)) => continue,
                Some((window, field @ ("status" | "reset" | "utilization"))) => (window, field),
                _ => continue,
            },
        };
        let entry = windows
            .entry(window.to_string())
            .or_insert_with(|| WindowLimit {
                name: window.to_string(),
                ..WindowLimit::default()
            });
        match field {
            "status" => entry.status = LimitStatus::parse(value),
            "reset" => entry.reset_unix = value.trim().parse().ok(),
            _ => {
                entry.utilization = value
                    .trim()
                    .parse::<f64>()
                    .ok()
                    .filter(|fraction| fraction.is_finite() && *fraction >= 0.0);
            }
        }
    }
    windows.retain(|_, window| {
        window.status.is_some() || window.reset_unix.is_some() || window.utilization.is_some()
    });
    UnifiedLimits {
        windows: windows.into_values().collect(),
        representative_claim,
    }
}

/// Seconds since the unix epoch, now.
#[must_use]
pub fn now_unix() -> u64 {
    SystemTime::now()
        .duration_since(SystemTime::UNIX_EPOCH)
        .map_or(0, |elapsed| elapsed.as_secs())
}

/// The cooldown a rejected response asks for: until the **longest** rejected
/// window resets, bounded by [`MAX_VENDOR_COOLDOWN`].
///
/// `None` when no rejected window carried a usable reset, so the caller falls
/// back to `Retry-After` or its configured default. A reset already in the past
/// is ignored for the same reason.
#[must_use]
pub fn rejected_until(limits: &UnifiedLimits, now: u64) -> Option<u64> {
    limits
        .rejected()
        .filter_map(|window| window.reset_unix)
        .filter(|reset| *reset > now)
        .max()
        .map(|reset| reset.min(now.saturating_add(MAX_VENDOR_COOLDOWN.as_secs())))
}

/// What a rejection blocks.
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum LimitScope {
    /// Every model on the account.
    Credential,
    /// Only models whose lowercased id contains this key (a family such as
    /// `opus`, or the full requested model id).
    Model(String),
}

/// Decide whether a `429` blocks one model or the whole credential.
///
/// The heuristic, in order:
///
/// 1. A rejected credential-wide window (`5h`, `7d` or any window that names
///    no model family) blocks the **credential**, whatever else was rejected.
/// 2. Otherwise a rejected model-family window (`7d_opus`) blocks that
///    **family**.
/// 3. Otherwise a representative claim naming a model family (for example
///    `seven_day_opus`) that the requested model belongs to blocks that
///    **family**.
/// 4. Otherwise an error message that names the requested model id blocks
///    **that model**; one that names only the requested model's family blocks
///    the **family**.
/// 5. Anything else — no headers, an unrelated message — blocks the
///    **credential**, which is the behaviour before this heuristic existed.
///
/// The overall `-status` pair is not consulted for scope: the vendor reports it
/// rejected for a model-family limit too, so it cannot tell them apart.
#[must_use]
pub fn classify_scope(limits: &UnifiedLimits, body: &[u8], model: Option<&str>) -> LimitScope {
    let mut family_rejection = None;
    for window in limits.rejected().filter(|window| window.name != "overall") {
        match window.model_family() {
            None => return LimitScope::Credential,
            Some(family) => family_rejection = Some(family),
        }
    }
    if let Some(family) = family_rejection {
        return LimitScope::Model(family.to_string());
    }
    let model = model.map(str::to_ascii_lowercase);
    let requested_family = model
        .as_deref()
        .and_then(|model| MODEL_FAMILIES.into_iter().find(|f| model.contains(f)));
    if let (Some(claim), Some(family)) = (limits.representative_claim.as_deref(), requested_family)
        && claim.contains(family)
    {
        return LimitScope::Model(family.to_string());
    }
    let message = error_message(body).to_ascii_lowercase();
    if let Some(model) = model.as_deref()
        && !model.is_empty()
        && message.contains(model)
    {
        return LimitScope::Model(model.to_string());
    }
    if let Some(family) = requested_family
        && message.contains(family)
    {
        return LimitScope::Model(family.to_string());
    }
    LimitScope::Credential
}

/// The vendor's error message, or the raw body when it is not the usual shape.
fn error_message(body: &[u8]) -> String {
    serde_json::from_slice::<serde_json::Value>(body)
        .ok()
        .and_then(|value| {
            value
                .pointer("/error/message")
                .and_then(serde_json::Value::as_str)
                .map(str::to_string)
        })
        .unwrap_or_else(|| String::from_utf8_lossy(body).into_owned())
}

/// What a utilization reading means for a threshold pause.
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum ThresholdDecision {
    /// A window is at or above the threshold: pause until it resets.
    Pause { until_unix: u64, window: String },
    /// Every readable window is below the threshold: lift a threshold pause.
    Clear,
    /// Nothing readable, or a window over the threshold with no reset time to
    /// resume at: leave the current state alone.
    Ignore,
}

/// Apply `ACCOUNT_PAUSE_AT_PERCENT` to one set of readings.
///
/// - A window whose utilization is at or above `percent` pauses the account
///   until that window resets; with several, the latest reset wins.
/// - A reading of 0% — a window that has just reset — is below any threshold,
///   so it lifts the pause even before the recorded reset time.
/// - A window with no readable utilization is ignored; when no window is
///   readable the state is left alone rather than guessed.
/// - A window over the threshold that carries no reset (or a reset in the
///   past) cannot say when to resume, so it is ignored too.
#[must_use]
pub fn threshold_decision(windows: &[WindowLimit], percent: u8, now: u64) -> ThresholdDecision {
    let threshold = f64::from(percent);
    let mut readable = false;
    let mut pause: Option<(u64, &str)> = None;
    let mut over_without_reset = false;
    for window in windows {
        let Some(utilization) = window.utilization else {
            continue;
        };
        readable = true;
        if utilization.mul_add(100.0, f64::EPSILON) < threshold {
            continue;
        }
        match window.reset_unix.filter(|reset| *reset > now) {
            Some(reset) if pause.is_none_or(|(current, _)| reset > current) => {
                pause = Some((reset, &window.name));
            }
            Some(_) => {}
            None => over_without_reset = true,
        }
    }
    match pause {
        Some((until, window)) => ThresholdDecision::Pause {
            until_unix: until.min(now.saturating_add(MAX_VENDOR_COOLDOWN.as_secs())),
            window: window.to_string(),
        },
        None if readable && !over_without_reset => ThresholdDecision::Clear,
        None => ThresholdDecision::Ignore,
    }
}

/// Why an account is paused.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "snake_case")]
pub enum PauseKind {
    /// An operator paused it through the accounts API.
    Manual,
    /// `ACCOUNT_PAUSE_AT_PERCENT` paused it until a window resets.
    Threshold,
}

/// An active pause.
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize, schemars::JsonSchema)]
pub struct Pause {
    pub kind: PauseKind,
    /// When the pause lifts on its own; `None` for a manual pause that lasts
    /// until it is resumed.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub until_unix: Option<u64>,
    pub reason: String,
}

/// The vendor-limit state Router keeps for one account.
#[derive(Clone, Debug, Default, PartialEq, Serialize, Deserialize, schemars::JsonSchema)]
pub struct AccountLimitState {
    /// Credential-wide cooldown taken from a vendor reset time.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub cooldown_until_unix: Option<u64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub cooldown_reason: Option<String>,
    /// Model-scoped cooldowns: lowercased model key to unix reset.
    #[serde(default, skip_serializing_if = "BTreeMap::is_empty")]
    pub model_cooldowns: BTreeMap<String, u64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub pause: Option<Pause>,
    /// The windows the vendor last reported for this account.
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub windows: Vec<WindowLimit>,
}

impl AccountLimitState {
    /// Drop every entry that has already expired.
    pub fn expire(&mut self, now: u64) {
        if self.cooldown_until_unix.is_some_and(|until| until <= now) {
            self.cooldown_until_unix = None;
            self.cooldown_reason = None;
        }
        self.model_cooldowns.retain(|_, until| *until > now);
        if self
            .pause
            .as_ref()
            .is_some_and(|pause| pause.until_unix.is_some_and(|until| until <= now))
        {
            self.pause = None;
        }
    }

    /// Whether the account is paused right now.
    #[must_use]
    pub fn paused_at(&self, now: u64) -> bool {
        self.pause
            .as_ref()
            .is_some_and(|pause| pause.until_unix.is_none_or(|until| until > now))
    }

    /// Whether a model-scoped cooldown blocks `model` right now.
    #[must_use]
    pub fn blocks_model(&self, model: &str, now: u64) -> bool {
        let model = model.to_ascii_lowercase();
        self.model_cooldowns
            .iter()
            .any(|(key, until)| *until > now && model.contains(key.as_str()))
    }

    /// Whether this state is worth persisting.
    #[must_use]
    pub fn is_empty(&self) -> bool {
        self.cooldown_until_unix.is_none()
            && self.model_cooldowns.is_empty()
            && self.pause.is_none()
    }

    /// Record a model-scoped cooldown, never shortening an existing one.
    pub fn cool_model(&mut self, key: &str, until: u64) {
        let entry = self
            .model_cooldowns
            .entry(key.to_ascii_lowercase())
            .or_insert(until);
        *entry = (*entry).max(until);
    }

    /// Record a credential-wide vendor cooldown, never shortening one.
    pub fn cool_credential(&mut self, until: u64, reason: &str) {
        if self
            .cooldown_until_unix
            .is_none_or(|current| current < until)
        {
            self.cooldown_until_unix = Some(until);
            self.cooldown_reason = Some(reason.to_string());
        }
    }
}

/// The persisted file: provider plus state by account name.
#[derive(Debug, Default, Serialize, Deserialize, schemars::JsonSchema)]
struct PersistedLimits {
    #[serde(default)]
    provider: String,
    #[serde(default)]
    accounts: BTreeMap<String, AccountLimitState>,
}

/// The state recorded under `data_dir` for `provider`, with expired entries
/// dropped. A missing, unreadable or other-provider file means none.
#[must_use]
pub fn load(data_dir: &Path, provider: &str) -> BTreeMap<String, AccountLimitState> {
    let now = now_unix();
    load_any(data_dir)
        .filter(|persisted| persisted.provider == provider)
        .map(|persisted| persisted.accounts)
        .unwrap_or_default()
        .into_iter()
        .filter_map(|(name, mut state)| {
            state.expire(now);
            (!state.is_empty()).then_some((name, state))
        })
        .collect()
}

fn load_any(data_dir: &Path) -> Option<PersistedLimits> {
    let text = std::fs::read_to_string(data_dir.join(STATE_FILE)).ok()?;
    serde_json::from_str(&text).ok()
}

/// Replace the recorded state under `data_dir`; nothing to record removes the
/// file. Failures are logged, not fatal: the in-memory state still answers.
pub fn save(data_dir: &Path, provider: &str, accounts: &BTreeMap<String, AccountLimitState>) {
    let path = data_dir.join(STATE_FILE);
    let accounts = accounts
        .iter()
        .filter(|(_, state)| !state.is_empty())
        .map(|(name, state)| (name.clone(), state.clone()))
        .collect::<BTreeMap<_, _>>();
    let result = if accounts.is_empty() {
        match std::fs::remove_file(&path) {
            Err(error) if error.kind() != std::io::ErrorKind::NotFound => Err(error),
            _ => Ok(()),
        }
    } else {
        let persisted = PersistedLimits {
            provider: provider.to_string(),
            accounts,
        };
        serde_json::to_vec(&persisted)
            .map_err(std::io::Error::other)
            .and_then(|bytes| crate::durable_file::atomic_write_owner_only(&path, &bytes))
    };
    if let Err(error) = result {
        tracing::warn!(path = %path.display(), "could not persist account limits: {error}");
    }
}

/// One newline-terminated `key=value` line per account with an active vendor
/// cooldown, model cooldown or pause under `data_dir`, for `deploy --status`
/// and `router doctor`; empty when none.
#[must_use]
pub fn status_report(data_dir: &Path) -> String {
    let Some(persisted) = load_any(data_dir) else {
        return String::new();
    };
    let now = now_unix();
    let mut report = String::new();
    for (name, mut state) in persisted.accounts {
        state.expire(now);
        let provider = &persisted.provider;
        if let Some(until) = state.cooldown_until_unix {
            let _ = writeln!(
                report,
                "account_cooldown provider={provider} account={name} until_unix={until} reason={}",
                serde_json::to_string(state.cooldown_reason.as_deref().unwrap_or("rate limited"))
                    .unwrap_or_default()
            );
        }
        for (model, until) in &state.model_cooldowns {
            let _ = writeln!(
                report,
                "account_model_cooldown provider={provider} account={name} model={model} until_unix={until}"
            );
        }
        if let Some(pause) = &state.pause {
            let until = pause
                .until_unix
                .map_or_else(|| "manual-resume".to_string(), |until| until.to_string());
            let _ = writeln!(
                report,
                "account_paused provider={provider} account={name} kind={} until_unix={until} reason={}",
                match pause.kind {
                    PauseKind::Manual => "manual",
                    PauseKind::Threshold => "threshold",
                },
                serde_json::to_string(&pause.reason).unwrap_or_default()
            );
        }
    }
    report
}

/// The account-limit section of `router doctor`, and whether anything is
/// recorded. Each candidate data directory is inspected and named, as
/// [`crate::zai_upstream_error::doctor_report`] does.
#[must_use]
pub fn doctor_report(data_dirs: &[PathBuf]) -> (String, bool) {
    let mut report = String::new();
    let mut seen = std::collections::HashSet::new();
    let mut found = false;
    for data_dir in data_dirs.iter().filter(|dir| seen.insert(dir.as_path())) {
        let lines = status_report(data_dir);
        let result = if lines.is_empty() {
            "none recorded"
        } else {
            found = true;
            "recorded"
        };
        let _ = write!(
            report,
            "account limits          : {result} in {}\n{lines}",
            data_dir.display()
        );
    }
    (report, found)
}

#[cfg(test)]
#[path = "account_limits_tests.rs"]
mod tests;
