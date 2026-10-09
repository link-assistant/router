//! Optional routing rules stored beside each account's vendor credential.

use std::collections::{BTreeMap, BTreeSet};
use std::path::Path;

use axum::http::{HeaderMap, HeaderName, HeaderValue};
use serde::{Deserialize, Serialize};

/// Credential-adjacent file, independent of vendor-owned credential formats.
pub const POLICY_FILE: &str = "routing-policy.json";
/// Positive weights are bounded as in `CLIProxyAPI`; non-positive disables weighted selection.
pub const MAX_WEIGHT: i32 = 1_000_000;
/// Upper bound on an account's retry override.
pub const MAX_RETRIES: u32 = 100;

/// One explicitly configured account model alias.
#[derive(Clone, Debug, PartialEq, Eq, Deserialize, Serialize, schemars::JsonSchema)]
#[serde(deny_unknown_fields)]
pub struct ModelAlias {
    /// Exact upstream model, which must appear in the account's live catalog.
    #[serde(alias = "name")]
    pub model: String,
    /// Client-facing name.
    pub alias: String,
    /// Keep the upstream name visible as well as the alias.
    #[serde(default)]
    pub fork: bool,
}

/// Action of the first matching request-scoped error rule.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Deserialize, Serialize, schemars::JsonSchema)]
#[serde(rename_all = "kebab-case")]
pub enum ErrorAction {
    /// Cool this account and relay the response.
    Cooldown,
    /// Try another eligible account before returning any response bytes.
    RetryNext,
    /// Relay unchanged, suppressing automatic cooldown and retry.
    Relay,
}

/// Upstream status and a literal body substring, evaluated in declaration order.
#[derive(Clone, Debug, PartialEq, Eq, Deserialize, Serialize, schemars::JsonSchema)]
#[serde(deny_unknown_fields)]
pub struct RequestScopedError {
    pub status: u16,
    #[serde(rename = "match")]
    pub body_match: String,
    pub action: ErrorAction,
}

/// Backward-compatible per-credential traffic policy.
#[derive(Clone, Debug, PartialEq, Eq, Deserialize, Serialize, schemars::JsonSchema)]
#[serde(default, deny_unknown_fields)]
pub struct AccountRoutingPolicy {
    pub weight: i32,
    pub prefix: Option<String>,
    pub disable_cooling: bool,
    /// Number of retries after the first attempt. Zero disables retries.
    pub request_retry: Option<u32>,
    pub request_scoped_errors: Vec<RequestScopedError>,
    /// Static values, or `$Header-Name` copies from the reviewed allow-list.
    pub headers: BTreeMap<String, String>,
    pub model_aliases: Vec<ModelAlias>,
    /// Case-sensitive glob patterns: `*` matches any sequence, `?` one character.
    pub excluded_models: Vec<String>,
}

impl Default for AccountRoutingPolicy {
    fn default() -> Self {
        Self {
            weight: 1,
            prefix: None,
            disable_cooling: false,
            request_retry: None,
            request_scoped_errors: Vec::new(),
            headers: BTreeMap::new(),
            model_aliases: Vec::new(),
            excluded_models: Vec::new(),
        }
    }
}

/// The only client fields a `$Header` value may read.
pub const COPY_HEADER_ALLOW_LIST: &[&str] = &[
    "x-request-id",
    "x-correlation-id",
    "traceparent",
    "tracestate",
    "x-claude-code-session-id",
    "x-codex-session-id",
    "x-session-id",
    "session-id",
];

fn permitted_destination(name: &str) -> bool {
    !matches!(
        name,
        "authorization"
            | "proxy-authorization"
            | "cookie"
            | "set-cookie"
            | "x-api-key"
            | "x-goog-api-key"
            | "anthropic-auth-token"
            | "chatgpt-account-id"
            | "host"
            | "connection"
            | "content-length"
            | "content-encoding"
            | "transfer-encoding"
            | "upgrade"
            | "te"
            | "trailer"
            | "proxy-authenticate"
            | "keep-alive"
    ) && !name.starts_with("x-router-")
        && !name.starts_with("x-link-assistant-")
}

impl AccountRoutingPolicy {
    /// Validate before saving or using a policy; invalid files fail closed.
    pub fn validate(&self) -> Result<(), String> {
        if self.weight > MAX_WEIGHT {
            return Err(format!("weight must not exceed {MAX_WEIGHT}"));
        }
        if self.request_retry.is_some_and(|n| n > MAX_RETRIES) {
            return Err(format!("request_retry must not exceed {MAX_RETRIES}"));
        }
        if self
            .prefix
            .as_deref()
            .is_some_and(|p| p.is_empty() || p.contains('/') || p.chars().any(char::is_whitespace))
        {
            return Err("prefix must be a non-empty model path segment".into());
        }
        let mut aliases = BTreeSet::new();
        for entry in &self.model_aliases {
            if entry.model.trim().is_empty()
                || entry.alias.trim().is_empty()
                || entry.alias == entry.model
                || !aliases.insert(&entry.alias)
            {
                return Err("model aliases require non-empty models and unique aliases".into());
            }
        }
        for rule in &self.request_scoped_errors {
            if !(100..=599).contains(&rule.status) || rule.body_match.len() > 16 * 1024 {
                return Err(
                    "error rules require a valid HTTP status and a match of at most 16384 bytes"
                        .into(),
                );
            }
        }
        for (destination, value) in &self.headers {
            let name = HeaderName::from_bytes(destination.as_bytes())
                .map_err(|_| "invalid header name")?;
            if !permitted_destination(name.as_str()) {
                return Err(format!("header {name} is protected"));
            }
            if let Some(source) = value.strip_prefix('$') {
                let source = HeaderName::from_bytes(source.as_bytes())
                    .map_err(|_| "invalid copied header name")?;
                if !COPY_HEADER_ALLOW_LIST.contains(&source.as_str()) {
                    return Err(format!("copying client header {source} is not allowed"));
                }
            } else {
                HeaderValue::from_str(value).map_err(|_| "invalid static header value")?;
            }
        }
        Ok(())
    }

    /// Read the sidecar, defaulting only when it is absent.
    pub fn load(home: &Path) -> Result<Self, String> {
        let bytes = match std::fs::read(home.join(POLICY_FILE)) {
            Ok(bytes) => bytes,
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => return Ok(Self::default()),
            Err(e) => return Err(e.to_string()),
        };
        let policy: Self = serde_json::from_slice(&bytes).map_err(|e| e.to_string())?;
        policy.validate()?;
        Ok(policy)
    }

    /// Atomically save a validated policy with private file permissions.
    pub fn save(&self, home: &Path) -> Result<(), String> {
        use std::io::Write as _;
        self.validate()?;
        let mut file = tempfile::NamedTempFile::new_in(home).map_err(|e| e.to_string())?;
        serde_json::to_writer_pretty(&mut file, self).map_err(|e| e.to_string())?;
        file.write_all(b"\n").map_err(|e| e.to_string())?;
        file.as_file().sync_all().map_err(|e| e.to_string())?;
        file.persist(home.join(POLICY_FILE))
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    /// Resolve a visible model to its upstream identity, or reject its prefix/exclusion.
    #[must_use]
    pub fn resolve_model(&self, requested: &str, force_prefix: bool) -> Option<String> {
        let model = if let Some(prefix) = &self.prefix {
            if let Some(model) = requested.strip_prefix(&format!("{prefix}/")) {
                model
            } else if force_prefix {
                return None;
            } else {
                requested
            }
        } else {
            requested
        };
        let upstream = self
            .model_aliases
            .iter()
            .find(|a| a.alias == model)
            .map_or(model, |a| a.model.as_str());
        // Retain the original spelling when any alias explicitly forks it.
        if upstream == model
            && self.model_aliases.iter().any(|a| a.model == model)
            && !self
                .model_aliases
                .iter()
                .any(|a| a.model == model && a.fork)
        {
            return None;
        }
        (!model.is_empty()
            && !self.excluded(upstream)
            && !self.excluded(model)
            && !self.excluded(requested))
        .then(|| upstream.to_string())
    }

    /// Visible spellings of a live upstream model; aliases never invent catalog entries.
    #[must_use]
    pub fn visible_models(&self, upstream: &str, force_prefix: bool) -> Vec<String> {
        if self.excluded(upstream) {
            return Vec::new();
        }
        let aliases: Vec<_> = self
            .model_aliases
            .iter()
            .filter(|a| a.model == upstream)
            .collect();
        let mut models = aliases.iter().map(|a| a.alias.clone()).collect::<Vec<_>>();
        if aliases.is_empty() || aliases.iter().any(|a| a.fork) {
            models.push(upstream.to_string());
        }
        let mut visible = Vec::new();
        for model in models {
            if self.excluded(&model) {
                continue;
            }
            if !force_prefix || self.prefix.is_none() {
                visible.push(model.clone());
            }
            if let Some(prefix) = &self.prefix {
                let prefixed = format!("{prefix}/{model}");
                if !self.excluded(&prefixed) {
                    visible.push(prefixed);
                }
            }
        }
        visible
    }

    #[must_use]
    pub fn excluded(&self, model: &str) -> bool {
        self.excluded_models
            .iter()
            .any(|pattern| wildcard_match(pattern, model))
    }

    /// Copy only reviewed fields, after upstream authentication has been installed.
    pub fn apply_headers(&self, incoming: &HeaderMap, outgoing: &mut HeaderMap) {
        for (name, value) in &self.headers {
            let Ok(name) = HeaderName::from_bytes(name.as_bytes()) else {
                continue;
            };
            if !permitted_destination(name.as_str()) {
                continue;
            }
            let value = if let Some(source) = value.strip_prefix('$') {
                let source = source.to_ascii_lowercase();
                if !COPY_HEADER_ALLOW_LIST.contains(&source.as_str()) {
                    continue;
                }
                incoming.get(&source).cloned()
            } else {
                HeaderValue::from_str(value).ok()
            };
            if let Some(value) = value {
                outgoing.insert(name, value);
            }
        }
    }

    /// First rule whose status and literal UTF-8 bytes match the bounded upstream prefix.
    #[must_use]
    pub fn error_action(&self, status: u16, body: &[u8]) -> Option<ErrorAction> {
        self.request_scoped_errors
            .iter()
            .find(|rule| {
                rule.status == status
                    && (rule.body_match.is_empty()
                        || body
                            .windows(rule.body_match.len())
                            .any(|part| part == rule.body_match.as_bytes()))
            })
            .map(|rule| rule.action)
    }
}

/// Linear-space glob matching; finite input and no recursive backtracking.
#[must_use]
pub fn wildcard_match(pattern: &str, value: &str) -> bool {
    let chars: Vec<_> = value.chars().collect();
    let mut previous = vec![false; chars.len() + 1];
    previous[0] = true;
    for token in pattern.chars() {
        let mut next = vec![false; chars.len() + 1];
        next[0] = token == '*' && previous[0];
        for (i, ch) in chars.iter().enumerate() {
            next[i + 1] = match token {
                '*' => previous[i + 1] || next[i],
                '?' => previous[i],
                literal => previous[i] && literal == *ch,
            };
        }
        previous = next;
    }
    previous[chars.len()]
}
