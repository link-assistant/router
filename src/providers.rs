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

/// Supported persisted provider kinds.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, Default)]
#[serde(rename_all = "kebab-case")]
pub enum ProviderKind {
    /// Generic OpenAI-compatible upstream such as `LiteLLM`.
    #[default]
    OpenAICompatible,
    /// Personal z.ai GLM Coding Plan with client/subscriber policy gates.
    ZaiCodingPlan,
}

impl ProviderKind {
    /// Parse a provider kind from a free-form string.
    #[must_use]
    pub fn from_str_opt(value: &str) -> Option<Self> {
        match value.to_lowercase().as_str() {
            "openai" | "openai-compatible" | "openai_like" | "litellm" => {
                Some(Self::OpenAICompatible)
            }
            "z.ai-coding-plan" | "zai-coding-plan" => Some(Self::ZaiCodingPlan),
            _ => None,
        }
    }

    /// Stable string form used in CLI output and persisted records.
    #[must_use]
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::OpenAICompatible => "openai-compatible",
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
            api_key_env: self.api_key_env.clone(),
            has_encrypted_api_key: self.encrypted_api_key.is_some(),
            enabled: self.enabled,
            subscriber_id: self.subscriber_id.clone(),
            intermediary_risk_acknowledged: self.intermediary_risk_acknowledged,
            unsupported_clients: self.unsupported_clients.clone(),
        }
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
    #[serde(skip_serializing_if = "Option::is_none")]
    pub api_key_env: Option<String>,
    pub has_encrypted_api_key: bool,
    pub enabled: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub subscriber_id: Option<String>,
    pub intermediary_risk_acknowledged: bool,
    pub unsupported_clients: Vec<String>,
}

/// API / CLI input for creating or replacing a provider.
///
/// `Serialize` as well as `Deserialize` so a remote `providers add` sends
/// exactly the shape the endpoint parses, rather than a hand-built JSON object
/// that could drift from it (issue #294).
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
    pub api_key: Option<String>,
    #[serde(default)]
    pub api_key_env: Option<String>,
    #[serde(default)]
    pub encrypted_api_key: Option<String>,
    #[serde(default)]
    pub enabled: Option<bool>,
    #[serde(default)]
    pub subscriber_id: Option<String>,
    #[serde(default)]
    pub acknowledge_intermediary_risk: Option<bool>,
    #[serde(default)]
    pub acknowledge_unsupported_clients: Option<Vec<String>>,
}

/// OpenAI-compatible provider resolved for runtime forwarding.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ResolvedProvider {
    pub name: String,
    pub kind: ProviderKind,
    pub base_url: String,
    pub default_model: Option<String>,
    pub models: Vec<String>,
    pub api_key: Option<String>,
    pub subscriber_id: Option<String>,
    pub intermediary_risk_acknowledged: bool,
    pub unsupported_clients: Vec<String>,
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
}

/// File-backed provider store.
#[derive(Clone)]
pub struct ProviderStore {
    path: PathBuf,
    lock_path: PathBuf,
    token_secret: Arc<String>,
    inner: Arc<RwLock<HashMap<String, ProviderRecord>>>,
    entitlement_policy: Arc<RwLock<crate::client_policy::SubscriptionEntitlementPolicy>>,
}

impl ProviderStore {
    /// Open a provider store at `<data_dir>/providers.lenv`.
    pub fn open(data_dir: &Path, token_secret: &str) -> Result<Self, ProviderError> {
        let path = data_dir.join("providers.lenv");
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent)?;
        }
        let records = if path.exists() {
            decode_provider_lenv(&fs::read_to_string(&path)?)?
        } else {
            Vec::new()
        };
        let inner = records
            .into_iter()
            .map(|record| (record.name.clone(), record))
            .collect();
        Ok(Self {
            lock_path: path.with_extension("lock"),
            path,
            token_secret: Arc::new(token_secret.to_string()),
            inner: Arc::new(RwLock::new(inner)),
            entitlement_policy: Arc::new(RwLock::new(
                crate::client_policy::SubscriptionEntitlementPolicy::default(),
            )),
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
        let record = self.build_record(input)?;
        if record.enabled
            && record.kind == ProviderKind::ZaiCodingPlan
            && self.list()?.into_iter().any(|existing| {
                existing.enabled
                    && existing.kind == ProviderKind::ZaiCodingPlan
                    && existing.name != record.name
            })
        {
            return Err(ProviderError::Invalid(
                "only one personal z.ai Coding Plan subscriber may be enabled".into(),
            ));
        }
        self.mutate(|records| {
            records.insert(record.name.clone(), record.clone());
        })?;
        Ok(record)
    }

    /// Delete a provider by name.
    pub fn delete(&self, name: &str) -> Result<bool, ProviderError> {
        self.mutate(|records| records.remove(name).is_some())
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
        Ok(Some(ResolvedProvider {
            name: record.name,
            kind: record.kind,
            base_url: record.base_url,
            default_model: record.default_model,
            models: record.models,
            api_key,
            subscriber_id: record.subscriber_id,
            intermediary_risk_acknowledged: record.intermediary_risk_acknowledged,
            unsupported_clients: record.unsupported_clients,
        }))
    }

    fn build_record(&self, input: ProviderUpsert) -> Result<ProviderRecord, ProviderError> {
        let name = normalize_name(&input.name)?;
        let kind = match input.kind.as_deref() {
            Some(value) => ProviderKind::from_str_opt(value)
                .ok_or_else(|| ProviderError::Invalid(format!("unknown provider kind: {value}")))?,
            None => ProviderKind::default(),
        };
        let base_url = input.base_url.trim_end_matches('/').to_string();
        if base_url.is_empty() {
            return Err(ProviderError::Invalid("base_url is required".into()));
        }
        let encrypted_api_key = match input.api_key.as_deref().filter(|s| !s.is_empty()) {
            Some(key) => Some(encrypt_api_key(key, &self.token_secret)?),
            None => input.encrypted_api_key.filter(|s| !s.is_empty()),
        };
        let models = input.models.unwrap_or_default();
        let subscriber_id = input.subscriber_id.filter(|value| !value.trim().is_empty());
        let intermediary_risk_acknowledged = input.acknowledge_intermediary_risk.unwrap_or(false);
        let unsupported_clients = input.acknowledge_unsupported_clients.unwrap_or_default();
        let enabled = input.enabled.unwrap_or(kind != ProviderKind::ZaiCodingPlan);
        if kind == ProviderKind::ZaiCodingPlan {
            let subscriber = subscriber_id.as_deref().ok_or_else(|| {
                ProviderError::Invalid("z.ai Coding Plan requires --subscriber-id".into())
            })?;
            crate::zai_coding_plan::ZaiCodingPlanPolicy::new(
                subscriber,
                intermediary_risk_acknowledged,
                &unsupported_clients,
            )
            .map_err(ProviderError::Invalid)?;
            for model in &models {
                if !crate::zai_coding_plan::REVIEWED_MODELS.contains(&model.as_str()) {
                    return Err(ProviderError::Invalid(format!(
                        "unreviewed z.ai Coding Plan model: {model}"
                    )));
                }
            }
            if enabled && !intermediary_risk_acknowledged {
                return Err(ProviderError::Invalid(
                    "enabling z.ai Coding Plan requires --acknowledge-intermediary-risk".into(),
                ));
            }
        } else if subscriber_id.is_some()
            || intermediary_risk_acknowledged
            || !unsupported_clients.is_empty()
        {
            return Err(ProviderError::Invalid(
                "Coding Plan subscriber/risk settings require kind z.ai-coding-plan".into(),
            ));
        }
        Ok(ProviderRecord {
            name,
            kind,
            base_url,
            default_model: input.default_model.filter(|s| !s.is_empty()),
            models,
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
        operation: impl FnOnce(&mut HashMap<String, ProviderRecord>) -> T,
    ) -> Result<T, ProviderError> {
        crate::durable_file::with_exclusive_lock(&self.lock_path, || {
            let mut guard = self
                .inner
                .write()
                .map_err(|_| ProviderError::LockPoisoned)?;
            *guard = self.load_map()?;
            let before = guard.clone();
            let result = operation(&mut guard);
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

/// Runtime provider config supplied by CLI/env/.lenv.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct OpenAICompatibleConfig {
    pub provider_name: String,
    pub base_url: String,
    pub api_key: Option<String>,
    pub api_key_env: Option<String>,
    pub default_model: Option<String>,
    pub models: Vec<String>,
}

impl OpenAICompatibleConfig {
    /// Convert this boot config to a resolved provider without writing it.
    #[must_use]
    pub fn resolve(&self) -> ResolvedProvider {
        let api_key = self.api_key.clone().or_else(|| {
            self.api_key_env
                .as_deref()
                .and_then(|name| std::env::var(name).ok())
                .filter(|value| !value.is_empty())
        });
        ResolvedProvider {
            name: self.provider_name.clone(),
            kind: ProviderKind::OpenAICompatible,
            base_url: self.base_url.trim_end_matches('/').to_string(),
            default_model: self.default_model.clone(),
            models: self.models.clone(),
            api_key,
            subscriber_id: None,
            intermediary_risk_acknowledged: false,
            unsupported_clients: Vec::new(),
        }
    }

    /// Convert this config into an upsert record for persistent import.
    #[must_use]
    pub fn as_upsert(&self) -> ProviderUpsert {
        ProviderUpsert {
            name: self.provider_name.clone(),
            kind: Some(ProviderKind::OpenAICompatible.as_str().to_string()),
            base_url: self.base_url.clone(),
            default_model: self.default_model.clone(),
            models: Some(self.models.clone()),
            api_key: self.api_key.clone(),
            api_key_env: self.api_key_env.clone(),
            encrypted_api_key: None,
            enabled: Some(true),
            subscriber_id: None,
            acknowledge_intermediary_risk: None,
            acknowledge_unsupported_clients: None,
        }
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

/// Parse a provider manifest without a store to write it into.
///
/// Public so a remote `providers import` can read the manifest on *this*
/// machine and declare each provider on the selected deployment, which is what
/// importing into another router means (issue #294).
///
/// # Errors
///
/// Returns the parse error when the manifest is not readable as provider
/// declarations.
pub fn parse_provider_import(input: &str) -> Result<Vec<ProviderUpsert>, ProviderError> {
    let trimmed = input.trim_start();
    if trimmed.starts_with('{') {
        let doc: serde_json::Value = serde_json::from_str(input)?;
        if let Some(providers) = doc.get("providers").and_then(serde_json::Value::as_array) {
            return providers
                .iter()
                .cloned()
                .map(serde_json::from_value)
                .collect::<Result<Vec<_>, _>>()
                .map_err(ProviderError::Json);
        }
        return serde_json::from_value(doc)
            .map(|provider| vec![provider])
            .map_err(ProviderError::Json);
    }
    if trimmed.starts_with('[') {
        return serde_json::from_str(input).map_err(ProviderError::Json);
    }
    parse_lenv_or_indented(input)
}

fn parse_lenv_or_indented(input: &str) -> Result<Vec<ProviderUpsert>, ProviderError> {
    if input.lines().any(|line| line.starts_with("PROVIDER: ")) {
        let mut providers = Vec::new();
        for raw in input.lines() {
            if let Some(json) = raw.trim().strip_prefix("PROVIDER: ") {
                providers.push(serde_json::from_str(json)?);
            }
        }
        return Ok(providers);
    }
    parse_indented_provider_config(input)
}

fn parse_indented_provider_config(input: &str) -> Result<Vec<ProviderUpsert>, ProviderError> {
    let mut providers = Vec::new();
    let mut current: Option<ProviderUpsert> = None;
    for raw in input.lines() {
        let line = raw.trim_end();
        if line.trim().is_empty() || line.trim_start().starts_with('#') {
            continue;
        }
        if !line.starts_with(' ') && !line.starts_with('\t') {
            if let Some(provider) = current.take() {
                providers.push(provider);
            }
            current = Some(ProviderUpsert {
                name: line.trim().to_string(),
                kind: Some("openai-compatible".into()),
                base_url: String::new(),
                default_model: None,
                models: Some(Vec::new()),
                api_key: None,
                api_key_env: None,
                encrypted_api_key: None,
                enabled: Some(true),
                subscriber_id: None,
                acknowledge_intermediary_risk: None,
                acknowledge_unsupported_clients: None,
            });
            continue;
        }
        let Some(provider) = current.as_mut() else {
            return Err(ProviderError::Invalid(
                "indented provider field without provider name".into(),
            ));
        };
        let (key, value) = split_indented_field(line.trim())?;
        match key {
            "kind" => provider.kind = Some(value),
            "base_url" | "base-url" | "api_base" | "api-base" => provider.base_url = value,
            "model" | "default_model" | "default-model" => provider.default_model = Some(value),
            "models" => {
                provider.models = Some(
                    value
                        .split(',')
                        .map(str::trim)
                        .filter(|s| !s.is_empty())
                        .map(ToString::to_string)
                        .collect(),
                );
            }
            "api_key" | "api-key" => provider.api_key = Some(value),
            "api_key_env" | "api-key-env" => provider.api_key_env = Some(value),
            "enabled" => provider.enabled = Some(matches!(value.as_str(), "true" | "1" | "yes")),
            "subscriber_id" | "subscriber-id" => provider.subscriber_id = Some(value),
            "acknowledge_intermediary_risk" | "acknowledge-intermediary-risk" => {
                provider.acknowledge_intermediary_risk =
                    Some(matches!(value.as_str(), "true" | "1" | "yes"));
            }
            "acknowledge_unsupported_clients" | "acknowledge-unsupported-clients" => {
                provider.acknowledge_unsupported_clients = Some(
                    value
                        .split(',')
                        .map(str::trim)
                        .filter(|entry| !entry.is_empty())
                        .map(ToString::to_string)
                        .collect(),
                );
            }
            other => {
                return Err(ProviderError::Invalid(format!(
                    "unknown provider field: {other}"
                )));
            }
        }
    }
    if let Some(provider) = current {
        providers.push(provider);
    }
    if providers.is_empty() {
        return Err(ProviderError::Invalid(
            "provider import did not contain any providers".into(),
        ));
    }
    Ok(providers)
}

fn split_indented_field(line: &str) -> Result<(&str, String), ProviderError> {
    let Some((key, raw_value)) = line.split_once(char::is_whitespace) else {
        return Err(ProviderError::Invalid(format!(
            "provider field must be key value: {line}"
        )));
    };
    let value = raw_value.trim();
    Ok((key, unquote(value)))
}

fn unquote(value: &str) -> String {
    value
        .strip_prefix('"')
        .and_then(|v| v.strip_suffix('"'))
        .unwrap_or(value)
        .to_string()
}

fn atomic_write(path: &Path, contents: &[u8]) -> Result<(), ProviderError> {
    crate::durable_file::atomic_write_owner_only(path, contents).map_err(Into::into)
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    fn upsert() -> ProviderUpsert {
        ProviderUpsert {
            name: "litellm".into(),
            kind: Some("openai-compatible".into()),
            base_url: "http://localhost:4000/v1/".into(),
            default_model: Some("claude-sonnet".into()),
            models: Some(vec!["claude-sonnet".into()]),
            api_key: Some("sk-test".into()),
            api_key_env: None,
            encrypted_api_key: None,
            enabled: Some(true),
            subscriber_id: None,
            acknowledge_intermediary_risk: None,
            acknowledge_unsupported_clients: None,
        }
    }

    #[test]
    fn provider_store_encrypts_and_resolves_api_key() {
        let dir = tempdir().unwrap();
        let store = ProviderStore::open(dir.path(), "secret").unwrap();
        let record = store.upsert(upsert()).unwrap();

        assert!(record.encrypted_api_key.is_some());
        assert_ne!(record.encrypted_api_key.as_deref(), Some("sk-test"));

        let resolved = store.resolve("litellm").unwrap().unwrap();
        assert_eq!(resolved.api_key.as_deref(), Some("sk-test"));
        assert_eq!(resolved.base_url, "http://localhost:4000/v1");

        let reopened = ProviderStore::open(dir.path(), "secret").unwrap();
        assert_eq!(
            reopened
                .resolve("litellm")
                .unwrap()
                .unwrap()
                .api_key
                .as_deref(),
            Some("sk-test")
        );
    }

    #[test]
    fn provider_store_redacts_saved_secret() {
        let dir = tempdir().unwrap();
        let store = ProviderStore::open(dir.path(), "secret").unwrap();
        store.upsert(upsert()).unwrap();

        let redacted = store.list_redacted().unwrap();
        assert!(redacted[0].has_encrypted_api_key);
    }

    fn zai_upsert(enabled: Option<bool>, acknowledged: bool) -> ProviderUpsert {
        ProviderUpsert {
            name: "z-ai-personal".into(),
            kind: Some("z.ai-coding-plan".into()),
            base_url: "https://api.z.ai".into(),
            default_model: Some("glm-5".into()),
            models: Some(vec!["glm-5".into()]),
            api_key: Some("zai-secret".into()),
            api_key_env: None,
            encrypted_api_key: None,
            enabled,
            subscriber_id: Some("owner-a".into()),
            acknowledge_intermediary_risk: Some(acknowledged),
            acknowledge_unsupported_clients: Some(Vec::new()),
        }
    }

    #[test]
    fn coding_plan_defaults_disabled_and_requires_explicit_risk_acknowledgement() {
        let dir = tempdir().unwrap();
        let store = ProviderStore::open(dir.path(), "secret").unwrap();
        let disabled = store.upsert(zai_upsert(None, false)).unwrap();
        assert!(!disabled.enabled);
        assert!(store.resolve("z-ai-personal").unwrap().is_none());

        let error = store.upsert(zai_upsert(Some(true), false)).unwrap_err();
        assert!(error.to_string().contains("acknowledge-intermediary-risk"));
        let enabled = store.upsert(zai_upsert(Some(true), true)).unwrap();
        assert!(enabled.enabled);
        assert!(enabled.encrypted_api_key.is_some());
        assert!(
            !serde_json::to_string(&enabled.redacted())
                .unwrap()
                .contains("zai-secret")
        );
    }

    #[test]
    fn coding_plan_rejects_unreviewed_models_and_multiple_enabled_subscribers() {
        let dir = tempdir().unwrap();
        let store = ProviderStore::open(dir.path(), "secret").unwrap();
        let mut future = zai_upsert(Some(true), true);
        future.models = Some(vec!["glm-future".into()]);
        assert!(
            store
                .upsert(future)
                .unwrap_err()
                .to_string()
                .contains("unreviewed")
        );

        store.upsert(zai_upsert(Some(true), true)).unwrap();
        let mut second = zai_upsert(Some(true), true);
        second.name = "another-subscriber".into();
        second.subscriber_id = Some("owner-b".into());
        assert!(
            store
                .upsert(second)
                .unwrap_err()
                .to_string()
                .contains("only one personal")
        );
    }

    #[test]
    fn independently_opened_provider_stores_do_not_lose_updates() {
        let dir = tempdir().unwrap();
        let first = ProviderStore::open(dir.path(), "secret").unwrap();
        let second = ProviderStore::open(dir.path(), "secret").unwrap();
        first.upsert(upsert()).unwrap();
        let mut other = upsert();
        other.name = "other".into();
        other.base_url = "https://other.example/v1".into();
        second.upsert(other).unwrap();

        assert_eq!(first.list().unwrap().len(), 2);
        assert_eq!(second.list().unwrap().len(), 2);
    }

    #[test]
    fn import_indented_provider_config() {
        let input = r#"
litellm
  kind "openai-compatible"
  base-url "http://litellm:4000/v1"
  model "claude-sonnet"
  models "claude-sonnet,gpt-4o"
  api-key "sk-local"
"#;
        let parsed = parse_provider_import(input).unwrap();
        assert_eq!(parsed.len(), 1);
        assert_eq!(parsed[0].name, "litellm");
        assert_eq!(parsed[0].base_url, "http://litellm:4000/v1");
        assert_eq!(
            parsed[0].models.as_ref().unwrap(),
            &vec!["claude-sonnet".to_string(), "gpt-4o".to_string()]
        );
    }

    #[test]
    fn import_json_provider_config() {
        let input = r#"{"providers":[{"name":"litellm","base_url":"http://litellm:4000/v1"}]}"#;
        let parsed = parse_provider_import(input).unwrap();
        assert_eq!(parsed[0].name, "litellm");
    }

    #[test]
    fn import_provider_store_lenv_preserves_encrypted_key() {
        let source_dir = tempdir().unwrap();
        let source = ProviderStore::open(source_dir.path(), "secret").unwrap();
        source.upsert(upsert()).unwrap();

        let target_dir = tempdir().unwrap();
        let target = ProviderStore::open(target_dir.path(), "secret").unwrap();
        let imported = target
            .import_file(&source_dir.path().join("providers.lenv"))
            .unwrap();

        assert_eq!(imported, 1);
        assert_eq!(
            target
                .resolve("litellm")
                .unwrap()
                .unwrap()
                .api_key
                .as_deref(),
            Some("sk-test")
        );
    }

    /// A record encrypted under a published stand-in is named as disclosed,
    /// not surfaced as an opaque decryption failure: that key can be read out
    /// of the router's own source, so it has to be rotated (issue #300).
    #[test]
    fn a_key_encrypted_under_a_placeholder_is_reported_as_disclosed() {
        use aes_gcm::aead::Aead as _;

        let placeholder = crate::token_secret::LEGACY_PLACEHOLDERS[0];
        // What the old build wrote: encryption under a key published in the
        // source. `cipher` refuses to produce this now, which is the fix; the
        // record it already wrote still has to be recognised.
        let legacy = legacy_cipher(placeholder).expect("legacy key");
        let nonce = Nonce::default();
        let ciphertext = legacy
            .encrypt(&nonce, b"sk-real-vendor-key".as_ref())
            .expect("encrypt under the placeholder");
        let mut packed = nonce.to_vec();
        packed.extend_from_slice(&ciphertext);
        let encrypted = format!("aes256gcm:{}", STANDARD.encode(&packed));

        let error = decrypt_api_key(&encrypted, "a-real-signing-secret")
            .expect_err("a real secret cannot decrypt it");
        let message = error.to_string();

        assert!(
            message.contains("disclosed"),
            "the operator must be told the key is compromised: {message}"
        );
        assert!(
            message.contains(placeholder),
            "and which stand-in it was encrypted under: {message}"
        );
        assert!(
            message.contains("rotate"),
            "and what to do about it: {message}"
        );
        // A genuinely wrong secret still fails plainly, without crying wolf.
        let sound = encrypt_api_key("sk-real-vendor-key", "the-right-secret").expect("encrypt");
        let error = decrypt_api_key(&sound, "the-wrong-secret").expect_err("wrong key");
        assert!(
            !error.to_string().contains("disclosed"),
            "an ordinary mismatch is not a disclosure: {error}"
        );
    }
}
