//! Provider configuration storage.
//!
//! The router keeps upstream provider credentials out of process environment
//! variables once they have been imported. Records are persisted in a compact
//! `.lenv`-style key-value file under the router data directory, and saved API
//! keys are encrypted with a key derived from `TOKEN_SECRET`.

use aes_gcm::aead::{Aead, Generate, KeyInit};
use aes_gcm::{Aes256Gcm, Nonce};
use base64::Engine as _;
use base64::engine::general_purpose::STANDARD;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::collections::HashMap;
use std::fs;
use std::io;
use std::path::{Path, PathBuf};
use std::sync::{Arc, RwLock};
use std::time::Instant;

use crate::provider_acceptance::{ProviderInstallMode, ProviderInstallResult};
pub use crate::provider_config::OpenAICompatibleConfig;

/// Supported persisted provider kinds.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, Default)]
#[serde(rename_all = "kebab-case")]
pub enum ProviderKind {
    /// Generic OpenAI-compatible upstream such as `LiteLLM`.
    #[default]
    OpenAICompatible,
    /// Lefine `OpenAI` Chat Completions API with live catalog validation.
    Lefine,
    /// Personal z.ai GLM Coding Plan with client/subscriber policy gates.
    ZaiCodingPlan,
}

impl ProviderKind {
    /// Parse a provider kind from a free-form string.
    #[must_use]
    pub fn from_str_opt(value: &str) -> Option<Self> {
        match value.to_lowercase().as_str() {
            "openai" | "openai-compatible" | "open-a-i-compatible" | "openai_like" | "litellm" => {
                Some(Self::OpenAICompatible)
            }
            "lefine" => Some(Self::Lefine),
            "z.ai-coding-plan" | "zai-coding-plan" => Some(Self::ZaiCodingPlan),
            _ => None,
        }
    }

    /// Stable string form used in CLI output and persisted records.
    #[must_use]
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::OpenAICompatible => "openai-compatible",
            Self::Lefine => "lefine",
            Self::ZaiCodingPlan => "z.ai-coding-plan",
        }
    }
}

/// One persisted upstream provider record.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ProviderRecord {
    /// Stable provider key, for example `litellm`.
    pub name: String,
    /// Provider implementation kind.
    pub kind: ProviderKind,
    /// Upstream API base URL. For OpenAI-compatible providers this should be
    /// the `/v1` API base accepted by `OpenAI` SDK clients.
    pub base_url: String,
    /// Default model to inject when a caller omits `model`.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub default_model: Option<String>,
    /// Models exposed by `/v1/models` for this provider.
    #[serde(default)]
    pub models: Vec<String>,
    /// Canonical managed clients explicitly tested and allowed for an
    /// ordinary API provider. Coding Plan derives this from its reviewed
    /// policy and per-client risk acknowledgements.
    #[serde(default)]
    pub supported_clients: Vec<String>,
    /// Optional environment variable to read the upstream API key from.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub api_key_env: Option<String>,
    /// Encrypted upstream API key.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub encrypted_api_key: Option<String>,
    /// Whether this provider is available for routing.
    #[serde(default = "default_enabled")]
    pub enabled: bool,
    /// Subscriber allowed to spend this personal Coding Plan credential.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub subscriber_id: Option<String>,
    /// Explicit acknowledgement that z.ai has not documented intermediary use.
    #[serde(default)]
    pub intermediary_risk_acknowledged: bool,
    /// Exact unsupported tools separately accepted by the operator.
    #[serde(default)]
    pub unsupported_clients: Vec<String>,
}

const fn default_enabled() -> bool {
    true
}

impl ProviderRecord {
    /// Redact encrypted key material for API and CLI output.
    #[must_use]
    pub fn redacted(&self) -> RedactedProviderRecord {
        RedactedProviderRecord {
            name: self.name.clone(),
            kind: self.kind,
            base_url: self.base_url.clone(),
            default_model: self.default_model.clone(),
            models: self.models.clone(),
            supported_clients: self.effective_supported_clients(),
            api_key_env: self.api_key_env.clone(),
            has_encrypted_api_key: self.encrypted_api_key.is_some(),
            enabled: self.enabled,
            subscriber_id: self.subscriber_id.clone(),
            intermediary_risk_acknowledged: self.intermediary_risk_acknowledged,
            unsupported_clients: self.unsupported_clients.clone(),
        }
    }

    /// Effective canonical client compatibility used by management, catalogs,
    /// and dispatch.
    #[must_use]
    pub fn effective_supported_clients(&self) -> Vec<String> {
        let mut clients = match self.kind {
            ProviderKind::ZaiCodingPlan => vec!["claude".into(), "codex".into(), "opencode".into()],
            ProviderKind::Lefine => crate::lefine::COMPATIBLE_CLIENTS
                .into_iter()
                .map(str::to_string)
                .collect(),
            ProviderKind::OpenAICompatible => self.supported_clients.clone(),
        };
        if self.kind == ProviderKind::ZaiCodingPlan {
            clients.extend(self.unsupported_clients.iter().cloned());
        }
        clients.sort();
        clients.dedup();
        clients
    }
}

/// Provider record shape safe to print or return over the API.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct RedactedProviderRecord {
    pub name: String,
    pub kind: ProviderKind,
    pub base_url: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub default_model: Option<String>,
    pub models: Vec<String>,
    pub supported_clients: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub api_key_env: Option<String>,
    pub has_encrypted_api_key: bool,
    pub enabled: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub subscriber_id: Option<String>,
    pub intermediary_risk_acknowledged: bool,
    pub unsupported_clients: Vec<String>,
}

/// API / CLI input for creating or replacing a provider. Serialization keeps
/// remote `providers add` identical to the endpoint shape (issue #294).
#[derive(Debug, Clone, Deserialize, serde::Serialize)]
pub struct ProviderUpsert {
    pub name: String,
    #[serde(default)]
    pub kind: Option<String>,
    pub base_url: String,
    #[serde(default)]
    pub default_model: Option<String>,
    #[serde(default)]
    pub models: Option<Vec<String>>,
    #[serde(default)]
    pub supported_clients: Option<Vec<String>>,
    #[serde(default)]
    pub api_key: Option<String>,
    #[serde(default)]
    pub api_key_env: Option<String>,
    #[serde(default)]
    pub encrypted_api_key: Option<String>,
    #[serde(default)]
    pub enabled: Option<bool>,
    #[serde(default)]
    pub subscriber_id: Option<String>,
    #[serde(default, alias = "intermediary_risk_acknowledged")]
    pub acknowledge_intermediary_risk: Option<bool>,
    #[serde(default, alias = "unsupported_clients")]
    pub acknowledge_unsupported_clients: Option<Vec<String>>,
    /// Refuse to replace an existing provider with the same name.
    #[serde(default)]
    pub if_absent: bool,
}

/// OpenAI-compatible provider resolved for runtime forwarding.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ResolvedProvider {
    pub name: String,
    pub kind: ProviderKind,
    pub base_url: String,
    pub default_model: Option<String>,
    pub models: Vec<String>,
    pub supported_clients: Vec<String>,
    pub api_key: Option<String>,
    pub subscriber_id: Option<String>,
    pub intermediary_risk_acknowledged: bool,
    pub unsupported_clients: Vec<String>,
}

/// One exact model document returned by a provider's live catalog.
#[derive(Debug, Clone, PartialEq)]
pub(crate) struct LiveProviderModel {
    pub id: String,
    pub raw: serde_json::Map<String, serde_json::Value>,
}

/// In-memory live catalog state. Provider configuration remains file-backed;
/// discovery results are deliberately process-local and refreshed by identity.
#[derive(Debug, Clone)]
pub(crate) struct CachedProviderCatalog {
    pub fingerprint: String,
    pub models: Vec<LiveProviderModel>,
    pub last_success: Option<Instant>,
    pub last_attempt: Instant,
    pub error: Option<String>,
}

impl ResolvedProvider {
    /// Whether this provider advertises `model` by name.
    ///
    /// A declared model is what lets a stored provider win a route in
    /// automatic mode, instead of being reachable only by pinning the whole
    /// deployment to it (issue #260).
    #[must_use]
    pub fn declares(&self, model: &str) -> bool {
        self.models.iter().any(|id| id == model)
    }

    /// Whether this provider's reviewed adapter supports the exact client.
    #[must_use]
    pub fn supports_client(&self, client: crate::clients::ClientKind) -> bool {
        self.supported_clients
            .iter()
            .any(|value| value == client.canonical_name())
    }
}

/// File-backed provider store.
#[derive(Clone)]
pub struct ProviderStore {
    path: PathBuf,
    lock_path: PathBuf,
    token_secret: Arc<String>,
    inner: Arc<RwLock<HashMap<String, ProviderRecord>>>,
    entitlement_policy: Arc<RwLock<crate::client_policy::SubscriptionEntitlementPolicy>>,
    provider_catalogs: Arc<RwLock<HashMap<String, CachedProviderCatalog>>>,
}

impl ProviderStore {
    /// Open a provider store at `<data_dir>/providers.lenv`.
    pub fn open(data_dir: &Path, token_secret: &str) -> Result<Self, ProviderError> {
        let path = data_dir.join("providers.lenv");
        let lock_path = path.with_extension("lock");
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent)?;
        }
        let records = crate::durable_file::with_exclusive_lock(&lock_path, || {
            crate::durable_file::recover_transactional_write(&path)?;
            if path.exists() {
                decode_provider_lenv(&fs::read_to_string(&path)?)
            } else {
                Ok(Vec::new())
            }
        })?;
        let inner = records
            .into_iter()
            .map(|record| (record.name.clone(), record))
            .collect();
        Ok(Self {
            lock_path,
            path,
            token_secret: Arc::new(token_secret.to_string()),
            inner: Arc::new(RwLock::new(inner)),
            entitlement_policy: Arc::new(RwLock::new(
                crate::client_policy::SubscriptionEntitlementPolicy::default(),
            )),
            provider_catalogs: Arc::new(RwLock::new(HashMap::new())),
        })
    }

    /// Install the boot-validated consumer-subscription bridge policy.
    pub fn set_subscription_entitlement_policy(
        &self,
        policy: crate::client_policy::SubscriptionEntitlementPolicy,
    ) -> Result<(), ProviderError> {
        *self
            .entitlement_policy
            .write()
            .map_err(|_| ProviderError::LockPoisoned)? = policy;
        Ok(())
    }

    /// Snapshot the policy used by catalog and dispatch.
    pub fn subscription_entitlement_policy(
        &self,
    ) -> Result<crate::client_policy::SubscriptionEntitlementPolicy, ProviderError> {
        self.entitlement_policy
            .read()
            .map_err(|_| ProviderError::LockPoisoned)
            .map(|policy| policy.clone())
    }

    pub(crate) fn cached_provider_catalog(
        &self,
        name: &str,
    ) -> Result<Option<CachedProviderCatalog>, ProviderError> {
        self.provider_catalogs
            .read()
            .map_err(|_| ProviderError::LockPoisoned)
            .map(|catalogs| catalogs.get(name).cloned())
    }

    pub(crate) fn cache_provider_catalog(
        &self,
        name: &str,
        catalog: CachedProviderCatalog,
    ) -> Result<(), ProviderError> {
        self.provider_catalogs
            .write()
            .map_err(|_| ProviderError::LockPoisoned)?
            .insert(name.to_string(), catalog);
        Ok(())
    }

    /// Return all providers sorted by name.
    pub fn list(&self) -> Result<Vec<ProviderRecord>, ProviderError> {
        self.refresh()?;
        let mut records: Vec<_> = {
            let guard = self.inner.read().map_err(|_| ProviderError::LockPoisoned)?;
            guard.values().cloned().collect()
        };
        records.sort_by(|a, b| a.name.cmp(&b.name));
        Ok(records)
    }

    /// Return all providers with secrets redacted.
    pub fn list_redacted(&self) -> Result<Vec<RedactedProviderRecord>, ProviderError> {
        Ok(self.list()?.iter().map(ProviderRecord::redacted).collect())
    }

    /// Get one provider by name.
    pub fn get(&self, name: &str) -> Result<Option<ProviderRecord>, ProviderError> {
        self.refresh()?;
        let guard = self.inner.read().map_err(|_| ProviderError::LockPoisoned)?;
        Ok(guard.get(name).cloned())
    }

    /// Add or replace a provider, encrypting any inline API key.
    pub fn upsert(&self, input: ProviderUpsert) -> Result<ProviderRecord, ProviderError> {
        let record = self.stage(input)?;
        match self.promote(record, ProviderInstallMode::Replace)? {
            ProviderInstallResult::Promoted(record)
            | ProviderInstallResult::AlreadyPresent(record) => Ok(record),
        }
    }

    /// Build and encrypt a candidate without changing the active store.
    pub fn stage(&self, input: ProviderUpsert) -> Result<ProviderRecord, ProviderError> {
        self.build_record(input)
    }

    /// Atomically promote a previously validated candidate.
    pub fn promote(
        &self,
        record: ProviderRecord,
        mode: ProviderInstallMode,
    ) -> Result<ProviderInstallResult, ProviderError> {
        self.mutate(
            |records| -> (Result<ProviderInstallResult, ProviderError>, bool) {
                if mode == ProviderInstallMode::IfAbsent
                    && let Some(existing) = records.get(&record.name)
                {
                    return (
                        Ok(ProviderInstallResult::AlreadyPresent(existing.clone())),
                        false,
                    );
                }
                if record.enabled
                    && record.kind == ProviderKind::ZaiCodingPlan
                    && records.values().any(|existing| {
                        existing.enabled
                            && existing.kind == ProviderKind::ZaiCodingPlan
                            && existing.name != record.name
                    })
                {
                    return (
                        Err(ProviderError::Invalid(
                            "only one personal z.ai Coding Plan subscriber may be enabled".into(),
                        )),
                        false,
                    );
                }
                records.insert(record.name.clone(), record.clone());
                (Ok(ProviderInstallResult::Promoted(record)), true)
            },
        )?
    }

    /// Delete a provider by name.
    pub fn delete(&self, name: &str) -> Result<bool, ProviderError> {
        self.mutate(|records| {
            let removed = records.remove(name).is_some();
            (removed, removed)
        })
    }

    /// Import providers from JSON, `.lenv`, or indented Links-style config.
    pub fn import_file(&self, path: &Path) -> Result<usize, ProviderError> {
        let text = fs::read_to_string(path)?;
        let inputs = parse_provider_import(&text)?;
        let count = inputs.len();
        for input in inputs {
            self.upsert(input)?;
        }
        Ok(count)
    }

    /// Resolve a provider plus decrypted API key for forwarding.
    pub fn resolve(&self, name: &str) -> Result<Option<ResolvedProvider>, ProviderError> {
        let Some(record) = self.get(name)? else {
            return Ok(None);
        };
        if !record.enabled {
            return Ok(None);
        }
        self.resolve_record(&record).map(Some)
    }

    /// Resolve a staged record without installing it.
    pub fn resolve_record(
        &self,
        record: &ProviderRecord,
    ) -> Result<ResolvedProvider, ProviderError> {
        let api_key = record
            .api_key_env
            .as_deref()
            .and_then(|env_name| std::env::var(env_name).ok())
            .filter(|s| !s.is_empty())
            .map(Ok)
            .or_else(|| {
                record
                    .encrypted_api_key
                    .as_deref()
                    .map(|encrypted| decrypt_api_key(encrypted, &self.token_secret))
            })
            .transpose()?;
        let supported_clients = record.effective_supported_clients();
        Ok(ResolvedProvider {
            name: record.name.clone(),
            kind: record.kind,
            base_url: record.base_url.clone(),
            default_model: record.default_model.clone(),
            models: record.models.clone(),
            supported_clients,
            api_key,
            subscriber_id: record.subscriber_id.clone(),
            intermediary_risk_acknowledged: record.intermediary_risk_acknowledged,
            unsupported_clients: record.unsupported_clients.clone(),
        })
    }

    fn build_record(&self, input: ProviderUpsert) -> Result<ProviderRecord, ProviderError> {
        let name = normalize_name(&input.name)?;
        let kind = match input.kind.as_deref() {
            Some(value) => ProviderKind::from_str_opt(value)
                .ok_or_else(|| ProviderError::Invalid(format!("unknown provider kind: {value}")))?,
            None => ProviderKind::default(),
        };
        if name == "z.ai" && kind != ProviderKind::ZaiCodingPlan {
            return Err(ProviderError::Invalid(
                "provider name 'z.ai' is reserved for the Coding Plan model namespace".into(),
            ));
        }
        let base_url = input.base_url.trim_end_matches('/').to_string();
        if base_url.is_empty() {
            return Err(ProviderError::Invalid("base_url is required".into()));
        }
        let encrypted_api_key = match input.api_key.as_deref().filter(|s| !s.is_empty()) {
            Some(key) => Some(encrypt_api_key(key, &self.token_secret)?),
            None => input.encrypted_api_key.filter(|s| !s.is_empty()),
        };
        let models = input.models.unwrap_or_default();
        let mut supported_clients = input.supported_clients.unwrap_or_default();
        for value in &supported_clients {
            let client = crate::clients::ClientKind::from_str_opt(value).ok_or_else(|| {
                ProviderError::Invalid(format!("unknown supported client: {value}"))
            })?;
            if value != client.canonical_name() {
                return Err(ProviderError::Invalid(format!(
                    "supported client must use canonical name '{}'",
                    client.canonical_name()
                )));
            }
        }
        supported_clients.sort();
        supported_clients.dedup();
        let subscriber_id = input.subscriber_id.filter(|value| !value.trim().is_empty());
        let intermediary_risk_acknowledged = input.acknowledge_intermediary_risk.unwrap_or(false);
        let unsupported_clients = input.acknowledge_unsupported_clients.unwrap_or_default();
        let enabled = input.enabled.unwrap_or(kind != ProviderKind::ZaiCodingPlan);
        if kind == ProviderKind::ZaiCodingPlan {
            if !supported_clients.is_empty() {
                return Err(ProviderError::Invalid(
                    "z.ai Coding Plan client compatibility is derived from its reviewed policy; use --acknowledge-unsupported-client for a risk-accepted client".into(),
                ));
            }
            if base_url != "https://api.z.ai" && !cfg!(test) {
                return Err(ProviderError::Invalid(
                    "z.ai Coding Plan base_url must be https://api.z.ai".into(),
                ));
            }
            let subscriber = subscriber_id.as_deref().ok_or_else(|| {
                ProviderError::Invalid("z.ai Coding Plan requires --subscriber-id".into())
            })?;
            crate::zai_coding_plan::ZaiCodingPlanPolicy::new(
                subscriber,
                intermediary_risk_acknowledged,
                &unsupported_clients,
            )
            .map_err(ProviderError::Invalid)?;
            if models.iter().any(|model| model.trim().is_empty()) {
                return Err(ProviderError::Invalid(
                    "z.ai Coding Plan model identifiers cannot be empty".into(),
                ));
            }
            if enabled && !intermediary_risk_acknowledged {
                return Err(ProviderError::Invalid(
                    "enabling z.ai Coding Plan requires --acknowledge-intermediary-risk".into(),
                ));
            }
        } else {
            if kind == ProviderKind::Lefine {
                validate_lefine_config(
                    &base_url,
                    &models,
                    &supported_clients,
                    input.default_model.as_deref(),
                )?;
            }
            if subscriber_id.is_some()
                || intermediary_risk_acknowledged
                || !unsupported_clients.is_empty()
            {
                return Err(ProviderError::Invalid(
                    "Coding Plan subscriber/risk settings require kind z.ai-coding-plan".into(),
                ));
            }
        }
        Ok(ProviderRecord {
            name,
            kind,
            base_url,
            default_model: input.default_model.filter(|s| !s.is_empty()),
            models,
            supported_clients,
            api_key_env: input.api_key_env.filter(|s| !s.is_empty()),
            encrypted_api_key,
            enabled,
            subscriber_id,
            intermediary_risk_acknowledged,
            unsupported_clients,
        })
    }

    fn flush(&self, guard: &HashMap<String, ProviderRecord>) -> Result<(), ProviderError> {
        let mut records: Vec<&ProviderRecord> = guard.values().collect();
        records.sort_by(|a, b| a.name.cmp(&b.name));
        let body = encode_provider_lenv(records.iter().copied())?;
        atomic_write(&self.path, body.as_bytes())?;
        Ok(())
    }

    fn load_map(&self) -> Result<HashMap<String, ProviderRecord>, ProviderError> {
        if !self.path.exists() {
            return Ok(HashMap::new());
        }
        Ok(decode_provider_lenv(&fs::read_to_string(&self.path)?)?
            .into_iter()
            .map(|record| (record.name.clone(), record))
            .collect())
    }

    fn refresh(&self) -> Result<(), ProviderError> {
        crate::durable_file::with_exclusive_lock(&self.lock_path, || {
            crate::durable_file::recover_transactional_write(&self.path)?;
            let records = self.load_map()?;
            *self
                .inner
                .write()
                .map_err(|_| ProviderError::LockPoisoned)? = records;
            Ok(())
        })
    }

    fn mutate<T>(
        &self,
        operation: impl FnOnce(&mut HashMap<String, ProviderRecord>) -> (T, bool),
    ) -> Result<T, ProviderError> {
        crate::durable_file::with_exclusive_lock(&self.lock_path, || {
            let mut guard = self
                .inner
                .write()
                .map_err(|_| ProviderError::LockPoisoned)?;
            *guard = self.load_map()?;
            let before = guard.clone();
            let (result, changed) = operation(&mut guard);
            if !changed {
                return Ok(result);
            }
            if let Err(error) = self.flush(&guard) {
                *guard = before;
                drop(guard);
                return Err(error);
            }
            drop(guard);
            Ok(result)
        })
    }
}

/// Errors returned by provider storage and encryption.
#[derive(Debug)]
pub enum ProviderError {
    Io(io::Error),
    Json(serde_json::Error),
    Base64(base64::DecodeError),
    Crypto(String),
    Invalid(String),
    LockPoisoned,
}

impl std::fmt::Display for ProviderError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Io(e) => write!(f, "provider storage I/O error: {e}"),
            Self::Json(e) => write!(f, "provider JSON error: {e}"),
            Self::Base64(e) => write!(f, "provider secret base64 error: {e}"),
            Self::Crypto(e) => write!(f, "provider secret crypto error: {e}"),
            Self::Invalid(e) => write!(f, "invalid provider config: {e}"),
            Self::LockPoisoned => write!(f, "provider store lock poisoned"),
        }
    }
}

impl std::error::Error for ProviderError {}

impl From<io::Error> for ProviderError {
    fn from(value: io::Error) -> Self {
        Self::Io(value)
    }
}

impl From<serde_json::Error> for ProviderError {
    fn from(value: serde_json::Error) -> Self {
        Self::Json(value)
    }
}

impl From<base64::DecodeError> for ProviderError {
    fn from(value: base64::DecodeError) -> Self {
        Self::Base64(value)
    }
}

fn validate_lefine_config(
    base_url: &str,
    models: &[String],
    supported_clients: &[String],
    default_model: Option<&str>,
) -> Result<(), ProviderError> {
    if base_url != crate::lefine::BASE_URL && !cfg!(test) {
        return Err(ProviderError::Invalid(format!(
            "Lefine base_url must be {}",
            crate::lefine::BASE_URL
        )));
    }
    if !supported_clients.is_empty() {
        return Err(ProviderError::Invalid(
            "Lefine client compatibility is fixed by its native Chat Completions adapter".into(),
        ));
    }
    let mut seen = std::collections::HashSet::new();
    for model in models {
        if model.is_empty() || model != model.trim() || !seen.insert(model) {
            return Err(ProviderError::Invalid(
                "Lefine fallback models must be unique non-empty exact ids".into(),
            ));
        }
    }
    if let Some(default) = default_model {
        if default.is_empty() || default != default.trim() {
            return Err(ProviderError::Invalid(
                "Lefine default_model must be a non-empty exact id".into(),
            ));
        }
        if !models.is_empty() && !models.iter().any(|model| model == default) {
            return Err(ProviderError::Invalid(
                "Lefine default_model must occur in configured fallback models".into(),
            ));
        }
    }
    Ok(())
}

fn normalize_name(name: &str) -> Result<String, ProviderError> {
    let name = name.trim();
    if name.is_empty() {
        return Err(ProviderError::Invalid("name is required".into()));
    }
    if name
        .chars()
        .all(|c| c.is_ascii_alphanumeric() || matches!(c, '-' | '_' | '.'))
    {
        return Ok(name.to_string());
    }
    Err(ProviderError::Invalid(
        "name may contain only ASCII letters, digits, dash, underscore, and dot".into(),
    ))
}

fn cipher(token_secret: &str) -> Result<Aes256Gcm, ProviderError> {
    // The key is `SHA256(token_secret)`, so a stand-in secret wraps a vendor
    // API key in a value published in the source — `has_encrypted_api_key:
    // true` while the key is effectively in the clear (issue #300).
    crate::token_secret::ensure_real(token_secret).map_err(ProviderError::Invalid)?;
    let key = Sha256::digest(token_secret.as_bytes());
    Aes256Gcm::new_from_slice(&key)
        .map_err(|e| ProviderError::Crypto(format!("invalid AES key: {e}")))
}

fn encrypt_api_key(api_key: &str, token_secret: &str) -> Result<String, ProviderError> {
    let cipher = cipher(token_secret)?;
    let nonce = Nonce::try_generate()
        .map_err(|e| ProviderError::Crypto(format!("nonce generation failed: {e}")))?;
    let encrypted = cipher
        .encrypt(&nonce, api_key.as_bytes())
        .map_err(|e| ProviderError::Crypto(format!("encrypt failed: {e}")))?;
    let mut packed = nonce.to_vec();
    packed.extend_from_slice(&encrypted);
    Ok(format!("aes256gcm:{}", STANDARD.encode(packed)))
}

/// The key a published stand-in would have produced, for recognition only.
///
/// Never used to encrypt: `cipher` refuses every placeholder, which is the
/// whole of issue #300. This exists so a record the old build wrote can be
/// named as disclosed instead of failing opaquely.
fn legacy_cipher(placeholder: &str) -> Option<Aes256Gcm> {
    let key = Sha256::digest(placeholder.as_bytes());
    Aes256Gcm::new_from_slice(&key).ok()
}

fn decrypt_api_key(encrypted: &str, token_secret: &str) -> Result<String, ProviderError> {
    let encoded = encrypted
        .strip_prefix("aes256gcm:")
        .ok_or_else(|| ProviderError::Invalid("unsupported provider secret format".into()))?;
    let packed = STANDARD.decode(encoded)?;
    if packed.len() < 13 {
        return Err(ProviderError::Invalid(
            "encrypted provider secret is too short".into(),
        ));
    }
    let (nonce_bytes, ciphertext) = packed.split_at(12);
    let mut nonce = Nonce::default();
    nonce.copy_from_slice(nonce_bytes);
    let plaintext = match cipher(token_secret)?.decrypt(&nonce, ciphertext) {
        Ok(plaintext) => plaintext,
        Err(error) => {
            // A record that decrypts under a published stand-in was encrypted
            // under a key anyone can read out of the source. That key must be
            // considered disclosed, and the operator told so plainly rather
            // than left with an opaque failure to interpret (issue #300).
            for placeholder in crate::token_secret::LEGACY_PLACEHOLDERS {
                // Built directly rather than through `cipher`, which now
                // refuses a stand-in: the point here is to recognise a record
                // the old build wrote, so the detection must be able to derive
                // the very key that must never be used to write another.
                if legacy_cipher(placeholder)
                    .is_some_and(|legacy| legacy.decrypt(&nonce, ciphertext).is_ok())
                {
                    return Err(ProviderError::Crypto(format!(
                        "this provider's API key was encrypted under the placeholder secret \
                         `{placeholder}`, which is published in the router's own source: treat \
                         the key as disclosed, rotate it at the vendor, and re-enter it with \
                         `providers add --api-key-stdin` under a real TOKEN_SECRET"
                    )));
                }
            }
            return Err(ProviderError::Crypto(format!("decrypt failed: {error}")));
        }
    };
    String::from_utf8(plaintext)
        .map_err(|e| ProviderError::Crypto(format!("secret is not UTF-8: {e}")))
}

fn encode_provider_lenv<'a>(
    records: impl IntoIterator<Item = &'a ProviderRecord>,
) -> Result<String, ProviderError> {
    let mut out = String::new();
    out.push_str("# Link.Assistant.Router provider store\n");
    out.push_str("# Each PROVIDER value is JSON; inline API keys are encrypted.\n");
    for record in records {
        out.push_str("PROVIDER: ");
        out.push_str(&serde_json::to_string(record)?);
        out.push('\n');
    }
    Ok(out)
}

fn decode_provider_lenv(input: &str) -> Result<Vec<ProviderRecord>, ProviderError> {
    let mut records = Vec::new();
    for raw in input.lines() {
        let line = raw.trim();
        if line.is_empty() || line.starts_with('#') {
            continue;
        }
        if let Some(json) = line.strip_prefix("PROVIDER: ") {
            records.push(serde_json::from_str(json)?);
        }
    }
    Ok(records)
}

#[path = "provider_import.rs"]
mod provider_import;
pub use provider_import::parse_provider_import;

fn atomic_write(path: &Path, contents: &[u8]) -> Result<(), ProviderError> {
    crate::durable_file::transactional_write_owner_only(path, contents).map_err(Into::into)
}

#[cfg(test)]
#[path = "providers_tests.rs"]
mod tests;
