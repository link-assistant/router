//! Durable ownership and upstream affinity for provider-owned `OpenAI` resources.

#![allow(clippy::redundant_pub_crate)]

use std::fmt;
use std::fs;
use std::path::{Path, PathBuf};
use std::time::Duration;

use serde::{Deserialize, Serialize};

const FILE_NAME: &str = "response-affinities.lino";
const STORE_VERSION: u32 = 1;
const DEFAULT_TTL: Duration = Duration::from_secs(30 * 24 * 60 * 60);
const DEFAULT_MAX_RECORDS: usize = 10_000;
const MAX_RESPONSE_ID_BYTES: usize = 256;

#[derive(Clone, Copy, Debug, Eq, Hash, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub(crate) enum ResponseNamespace {
    OpenAiResponses,
    CodexResponses,
    QwenResponses,
    OpenAiChat,
    CodexChat,
    QwenChat,
    OpenAiConversations,
    CodexConversations,
    QwenConversations,
    OpenAiConversationItems,
    CodexConversationItems,
    QwenConversationItems,
}

impl ResponseNamespace {
    pub(crate) fn from_path(path: &str) -> Option<Self> {
        if path.starts_with("/api/services/openai/v1/responses") {
            Some(Self::OpenAiResponses)
        } else if path.starts_with("/api/services/codex/v1/responses") {
            Some(Self::CodexResponses)
        } else if path.starts_with("/api/services/qwen/v1/responses") {
            Some(Self::QwenResponses)
        } else if path.starts_with("/api/services/openai/v1/chat/completions") {
            Some(Self::OpenAiChat)
        } else if path.starts_with("/api/services/codex/v1/chat/completions") {
            Some(Self::CodexChat)
        } else if path.starts_with("/api/services/qwen/v1/chat/completions") {
            Some(Self::QwenChat)
        } else {
            None
        }
    }

    pub(crate) fn conversations_from_path(path: &str) -> Option<(Self, Self)> {
        if path.starts_with("/api/services/openai/v1/conversations") {
            Some((Self::OpenAiConversations, Self::OpenAiConversationItems))
        } else if path.starts_with("/api/services/codex/v1/conversations") {
            Some((Self::CodexConversations, Self::CodexConversationItems))
        } else if path.starts_with("/api/services/qwen/v1/conversations") {
            Some((Self::QwenConversations, Self::QwenConversationItems))
        } else {
            None
        }
    }
}

#[derive(Clone, Debug, Eq, Hash, PartialEq, Serialize, Deserialize)]
pub(crate) struct ResponseOwner {
    pub(crate) client_kind: String,
    pub(crate) principal_id: String,
}

impl ResponseOwner {
    pub(crate) fn new(client_kind: impl Into<String>, principal_id: impl Into<String>) -> Self {
        Self {
            client_kind: client_kind.into(),
            principal_id: principal_id.into(),
        }
    }

    pub(crate) fn from_claims(claims: &crate::token::TokenClaims) -> Result<Self, String> {
        let (client, principal) = crate::client_policy::bound_client(claims)?;
        Ok(Self::new(client.canonical_name(), principal))
    }
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub(crate) enum AffinityDestination {
    StoredProvider {
        name: String,
        provider_kind: crate::providers::ProviderKind,
        base_url: String,
    },
    Subscription {
        provider: crate::subscription::SubscriptionProvider,
        account: String,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        upstream_account_id: Option<String>,
        base_url: String,
    },
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
pub(crate) struct ResponseAffinity {
    pub(crate) namespace: ResponseNamespace,
    pub(crate) response_id: String,
    pub(crate) owner: ResponseOwner,
    pub(crate) destination: AffinityDestination,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub(crate) parent_id: Option<String>,
    pub(crate) created_at: i64,
    pub(crate) expires_at: i64,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub(crate) enum RecordOutcome {
    Inserted,
    Existing,
}

#[derive(Debug)]
pub(crate) enum StoreError {
    Io(std::io::Error),
    Decode(serde_json::Error),
    Collision,
    Invalid(String),
}

impl fmt::Display for StoreError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Io(error) => write!(formatter, "response-affinity storage failed: {error}"),
            Self::Decode(error) => {
                write!(formatter, "response-affinity document is invalid: {error}")
            }
            Self::Collision => {
                formatter.write_str("response id is already bound to another upstream")
            }
            Self::Invalid(message) => formatter.write_str(message),
        }
    }
}

impl std::error::Error for StoreError {}

impl From<std::io::Error> for StoreError {
    fn from(error: std::io::Error) -> Self {
        Self::Io(error)
    }
}

impl From<serde_json::Error> for StoreError {
    fn from(error: serde_json::Error) -> Self {
        Self::Decode(error)
    }
}

#[derive(Debug, Default, Serialize, Deserialize)]
struct AffinityFile {
    version: u32,
    records: Vec<ResponseAffinity>,
}

#[derive(Clone, Debug)]
pub(crate) struct ResponseAffinityStore {
    path: PathBuf,
    lock_path: PathBuf,
    ttl: Duration,
    max_records: usize,
}

impl ResponseAffinityStore {
    pub(crate) fn open(data_dir: &Path) -> Result<Self, StoreError> {
        Self::open_with_limits(data_dir, DEFAULT_TTL, DEFAULT_MAX_RECORDS)
    }

    pub(crate) fn open_with_limits(
        data_dir: &Path,
        ttl: Duration,
        max_records: usize,
    ) -> Result<Self, StoreError> {
        if ttl.is_zero() || max_records == 0 {
            return Err(StoreError::Invalid(
                "response-affinity TTL and capacity must be non-zero".into(),
            ));
        }
        fs::create_dir_all(data_dir)?;
        let path = data_dir.join(FILE_NAME);
        let store = Self {
            lock_path: path.with_extension("lock"),
            path,
            ttl,
            max_records,
        };
        crate::durable_file::with_exclusive_lock(&store.lock_path, || {
            crate::durable_file::recover_transactional_write(&store.path)?;
            if store.path.exists() {
                let _ = store.load()?;
            }
            Ok::<_, StoreError>(())
        })?;
        Ok(store)
    }

    pub(crate) fn record(
        &self,
        namespace: ResponseNamespace,
        response_id: &str,
        owner: ResponseOwner,
        destination: AffinityDestination,
    ) -> Result<RecordOutcome, StoreError> {
        self.record_at_with_parent(
            namespace,
            response_id,
            owner,
            destination,
            None,
            chrono::Utc::now().timestamp(),
        )
    }

    pub(crate) fn record_child(
        &self,
        namespace: ResponseNamespace,
        response_id: &str,
        parent_id: &str,
        owner: ResponseOwner,
        destination: AffinityDestination,
    ) -> Result<RecordOutcome, StoreError> {
        validate_response_id(parent_id)?;
        self.record_at_with_parent(
            namespace,
            response_id,
            owner,
            destination,
            Some(parent_id.to_string()),
            chrono::Utc::now().timestamp(),
        )
    }

    #[cfg(test)]
    pub(crate) fn record_at(
        &self,
        namespace: ResponseNamespace,
        response_id: &str,
        owner: ResponseOwner,
        destination: AffinityDestination,
        now: i64,
    ) -> Result<RecordOutcome, StoreError> {
        self.record_at_with_parent(namespace, response_id, owner, destination, None, now)
    }

    fn record_at_with_parent(
        &self,
        namespace: ResponseNamespace,
        response_id: &str,
        owner: ResponseOwner,
        destination: AffinityDestination,
        parent_id: Option<String>,
        now: i64,
    ) -> Result<RecordOutcome, StoreError> {
        validate_response_id(response_id)?;
        validate_owner(&owner)?;
        crate::durable_file::with_exclusive_lock(&self.lock_path, || {
            crate::durable_file::recover_transactional_write(&self.path)?;
            let mut file = self.load()?;
            prune(&mut file.records, now);
            if let Some(existing) = file.records.iter().find(|record| {
                record.namespace == namespace
                    && record.response_id == response_id
                    && record.owner == owner
            }) {
                return if existing.destination == destination && existing.parent_id == parent_id {
                    Ok(RecordOutcome::Existing)
                } else {
                    Err(StoreError::Collision)
                };
            }
            let ttl = i64::try_from(self.ttl.as_secs()).unwrap_or(i64::MAX);
            file.records.push(ResponseAffinity {
                namespace,
                response_id: response_id.to_string(),
                owner,
                destination,
                parent_id,
                created_at: now,
                expires_at: now.saturating_add(ttl),
            });
            if file.records.len() > self.max_records {
                file.records.sort_by_key(|record| record.created_at);
                let remove = file.records.len() - self.max_records;
                file.records.drain(..remove);
            }
            self.flush(&file)?;
            Ok(RecordOutcome::Inserted)
        })
    }

    pub(crate) fn lookup(
        &self,
        namespace: ResponseNamespace,
        response_id: &str,
        owner: &ResponseOwner,
    ) -> Result<Option<ResponseAffinity>, StoreError> {
        self.lookup_at(
            namespace,
            response_id,
            owner,
            chrono::Utc::now().timestamp(),
        )
    }

    pub(crate) fn lookup_at(
        &self,
        namespace: ResponseNamespace,
        response_id: &str,
        owner: &ResponseOwner,
        now: i64,
    ) -> Result<Option<ResponseAffinity>, StoreError> {
        if validate_response_id(response_id).is_err() || validate_owner(owner).is_err() {
            return Ok(None);
        }
        crate::durable_file::with_exclusive_lock(&self.lock_path, || {
            crate::durable_file::recover_transactional_write(&self.path)?;
            let mut file = self.load()?;
            let before = file.records.len();
            prune(&mut file.records, now);
            let found = file
                .records
                .iter()
                .find(|record| {
                    record.namespace == namespace
                        && record.response_id == response_id
                        && &record.owner == owner
                })
                .cloned();
            if file.records.len() != before {
                self.flush(&file)?;
            }
            Ok(found)
        })
    }

    pub(crate) fn remove_if_matches(
        &self,
        affinity: &ResponseAffinity,
    ) -> Result<bool, StoreError> {
        crate::durable_file::with_exclusive_lock(&self.lock_path, || {
            crate::durable_file::recover_transactional_write(&self.path)?;
            let mut file = self.load()?;
            let before = file.records.len();
            file.records.retain(|record| record != affinity);
            let removed = file.records.len() != before;
            if removed {
                self.flush(&file)?;
            }
            Ok(removed)
        })
    }

    pub(crate) fn remove_children(
        &self,
        namespace: ResponseNamespace,
        parent_id: &str,
        owner: &ResponseOwner,
        destination: &AffinityDestination,
    ) -> Result<usize, StoreError> {
        crate::durable_file::with_exclusive_lock(&self.lock_path, || {
            crate::durable_file::recover_transactional_write(&self.path)?;
            let mut file = self.load()?;
            let before = file.records.len();
            file.records.retain(|record| {
                record.namespace != namespace
                    || record.parent_id.as_deref() != Some(parent_id)
                    || &record.owner != owner
                    || &record.destination != destination
            });
            let removed = before - file.records.len();
            if removed != 0 {
                self.flush(&file)?;
            }
            Ok(removed)
        })
    }

    pub(crate) fn list(
        &self,
        namespace: ResponseNamespace,
        owner: &ResponseOwner,
    ) -> Result<Vec<ResponseAffinity>, StoreError> {
        crate::durable_file::with_exclusive_lock(&self.lock_path, || {
            crate::durable_file::recover_transactional_write(&self.path)?;
            let mut file = self.load()?;
            let before = file.records.len();
            prune(&mut file.records, chrono::Utc::now().timestamp());
            let found = file
                .records
                .iter()
                .filter(|record| record.namespace == namespace && &record.owner == owner)
                .cloned()
                .collect();
            if file.records.len() != before {
                self.flush(&file)?;
            }
            Ok(found)
        })
    }

    fn load(&self) -> Result<AffinityFile, StoreError> {
        if !self.path.exists() {
            return Ok(AffinityFile {
                version: STORE_VERSION,
                records: Vec::new(),
            });
        }
        let file: AffinityFile = crate::lino_json::decode(&fs::read_to_string(&self.path)?)?;
        if file.version != STORE_VERSION {
            return Err(StoreError::Invalid(format!(
                "unsupported response-affinity document version {}",
                file.version
            )));
        }
        Ok(file)
    }

    fn flush(&self, file: &AffinityFile) -> Result<(), StoreError> {
        let encoded = crate::lino_json::encode(file)?;
        crate::durable_file::transactional_write_owner_only(&self.path, encoded.as_bytes())?;
        Ok(())
    }
}

fn prune(records: &mut Vec<ResponseAffinity>, now: i64) {
    records.retain(|record| record.expires_at > now);
}

fn validate_owner(owner: &ResponseOwner) -> Result<(), StoreError> {
    if owner.client_kind.trim().is_empty() || owner.principal_id.trim().is_empty() {
        return Err(StoreError::Invalid(
            "response affinity requires a stable managed-client owner".into(),
        ));
    }
    Ok(())
}

fn validate_response_id(response_id: &str) -> Result<(), StoreError> {
    if response_id.is_empty()
        || response_id.len() > MAX_RESPONSE_ID_BYTES
        || response_id.contains('/')
        || response_id.chars().any(char::is_control)
    {
        return Err(StoreError::Invalid("invalid response id".into()));
    }
    Ok(())
}
