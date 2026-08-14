//! Token persistence backends.
//!
//! Issued-token state can be persisted as real Links Notation text, a native
//! file-mapped doublets graph, or both.
//!
//! This module provides:
//!
//! - The [`TokenStore`] trait — a small async-ish (sync, for now) API for
//!   listing, persisting, and revoking [`TokenRecord`]s.
//! - [`MemoryTokenStore`] — an in-memory implementation, used in tests and
//!   for [`StoragePolicy::Memory`].
//! - [`TextTokenStore`] — persists records through `lino-objects-codec` at
//!   `<data_dir>/tokens.lino`.
//! - [`BinaryTokenStore`] — persists the same `Type → SubType → Value` graph
//!   in a `doublets` store backed by `platform-mem` at
//!   `<data_dir>/tokens.bin`.
//! - [`DualTokenStore`] — fans writes out to two stores (typically text +
//!   binary) and reads from the *first* store, falling back to the second
//!   on miss. This is the default when [`StoragePolicy::Both`] is set.
//! - [`build_token_store`] — factory that picks the right combination of
//!   stores based on the [`StoragePolicy`] from configuration.
//!
//! All persistence operations are best-effort: failures are surfaced as
//! [`StorageError`] but never panic, and all read paths gracefully tolerate
//! missing files (returning an empty record set).

// We intentionally hold a write guard across the (insert + flush) pair for
// atomicity; clippy's `significant_drop_tightening` would push us into
// chained calls that lose readability without helping contention in practice.
#![allow(clippy::significant_drop_tightening)]

use std::collections::HashMap;
use std::fs;
use std::io;
use std::path::{Path, PathBuf};
use std::sync::{Arc, RwLock};

use serde::{Deserialize, Serialize};

use crate::config::StoragePolicy;

mod associative;
#[allow(unsafe_code)]
mod file_mapped;
mod legacy;

/// One persisted token record.
///
/// `id` is the JWT `sub` (a UUID); the JWT itself is NOT stored — only the
/// metadata required to list/expire/revoke.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct TokenRecord {
    pub id: String,
    pub label: String,
    pub issued_at: i64,
    pub expires_at: i64,
    pub revoked: bool,
    /// Optional account identifier the token is bound to (multi-account mode).
    #[serde(default)]
    pub account: Option<String>,
    /// Optional cap on the number of upstream requests this token may make.
    /// `None` means unlimited. Used to bound how much a task can consume.
    #[serde(default)]
    pub max_requests: Option<u64>,
    /// Number of upstream requests already made with this token.
    #[serde(default)]
    pub used_requests: u64,
    /// Optional cap on tokens reported by successful upstream responses.
    /// `None` means unlimited.
    #[serde(default)]
    pub max_tokens: Option<u64>,
    /// Total input and output tokens reported for this credential.
    #[serde(default)]
    pub used_tokens: u64,
    /// Optional fixed-window request rate limit. `None` means unlimited.
    #[serde(default)]
    pub rate_limit_per_minute: Option<u64>,
    /// Unix timestamp at which the current rate-limit window began.
    #[serde(default)]
    pub rate_window_started_at: i64,
    /// Requests admitted during the current rate-limit window.
    #[serde(default)]
    pub rate_window_requests: u64,
    /// Privilege scope carried by the token. Empty (the default) means an
    /// ordinary client token that may only proxy inference; `"admin"` marks a
    /// credential that also unlocks the administrative endpoints. See
    /// [`crate::token::ADMIN_SCOPE`].
    #[serde(default)]
    pub scope: String,
}

/// Errors a [`TokenStore`] can return.
#[derive(Debug)]
pub enum StorageError {
    Io(io::Error),
    Codec(String),
    LockPoisoned,
}

impl std::fmt::Display for StorageError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Io(e) => write!(f, "storage I/O error: {e}"),
            Self::Codec(msg) => write!(f, "storage codec error: {msg}"),
            Self::LockPoisoned => write!(f, "storage lock poisoned"),
        }
    }
}

impl std::error::Error for StorageError {}

impl From<io::Error> for StorageError {
    fn from(e: io::Error) -> Self {
        Self::Io(e)
    }
}

/// Persistent token store API.
///
/// Implementations must be cheap to clone (use `Arc` internally) — the
/// router shares them across handler tasks.
pub trait TokenStore: Send + Sync {
    fn list(&self) -> Result<Vec<TokenRecord>, StorageError>;
    fn get(&self, id: &str) -> Result<Option<TokenRecord>, StorageError>;
    fn put(&self, record: TokenRecord) -> Result<(), StorageError>;
    fn delete(&self, id: &str) -> Result<bool, StorageError>;
    fn revoke(&self, id: &str) -> Result<bool, StorageError> {
        if let Some(mut rec) = self.get(id)? {
            if rec.revoked {
                return Ok(false);
            }
            rec.revoked = true;
            self.put(rec)?;
            return Ok(true);
        }
        Ok(false)
    }
    fn revoked_ids(&self) -> Result<Vec<String>, StorageError> {
        Ok(self
            .list()?
            .into_iter()
            .filter(|r| r.revoked)
            .map(|r| r.id)
            .collect())
    }

    /// Atomically check the request budget for `id` and, when there is room,
    /// increment the used-request counter.
    ///
    /// Returns `Ok(true)` when the request is permitted (and was recorded),
    /// or `Ok(false)` when the token is already at or over its `max_requests`
    /// budget. Tokens that have no stored record, or whose record has no
    /// limit (`max_requests == None`), are always permitted.
    ///
    /// Note: the default implementation performs a `get` then a `put`, which
    /// is not strictly atomic across concurrent callers, so a small number of
    /// requests may slip over the limit under heavy parallelism. This is an
    /// acceptable trade-off for a per-task usage cap; backends that need exact
    /// enforcement can override this with a locked read-modify-write.
    fn try_consume_request(&self, id: &str) -> Result<bool, StorageError> {
        if let Some(mut rec) = self.get(id)? {
            if let Some(max) = rec.max_requests {
                if rec.used_requests >= max {
                    return Ok(false);
                }
            }
            rec.used_requests = rec.used_requests.saturating_add(1);
            self.put(rec)?;
        }
        Ok(true)
    }

    /// Atomically enforce every pre-request limit and record an admitted call.
    fn try_admit_request(&self, id: &str, now: i64) -> Result<RequestAdmission, StorageError> {
        let Some(mut record) = self.get(id)? else {
            return Ok(RequestAdmission::Admitted);
        };
        let admission = admit_request(Some(&mut record), now);
        if admission == RequestAdmission::Admitted {
            self.put(record)?;
        }
        Ok(admission)
    }

    /// Add actual input and output usage reported by an upstream response.
    fn record_token_usage(&self, id: &str, tokens: u64) -> Result<(), StorageError> {
        if let Some(mut record) = self.get(id)? {
            record.used_tokens = record.used_tokens.saturating_add(tokens);
            self.put(record)?;
        }
        Ok(())
    }
}

/// Result of applying a token's request, spend, and rate controls.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum RequestAdmission {
    Admitted,
    RequestLimitExceeded,
    TokenLimitExceeded,
    RateLimitExceeded,
}

/// Trivial in-memory store. No persistence. Useful for tests.
#[derive(Default, Clone)]
pub struct MemoryTokenStore {
    inner: Arc<RwLock<HashMap<String, TokenRecord>>>,
}

impl MemoryTokenStore {
    #[must_use]
    pub fn new() -> Self {
        Self::default()
    }
}

impl TokenStore for MemoryTokenStore {
    fn list(&self) -> Result<Vec<TokenRecord>, StorageError> {
        let guard = self.inner.read().map_err(|_| StorageError::LockPoisoned)?;
        Ok(guard.values().cloned().collect())
    }

    fn get(&self, id: &str) -> Result<Option<TokenRecord>, StorageError> {
        let guard = self.inner.read().map_err(|_| StorageError::LockPoisoned)?;
        Ok(guard.get(id).cloned())
    }

    fn put(&self, record: TokenRecord) -> Result<(), StorageError> {
        let mut guard = self.inner.write().map_err(|_| StorageError::LockPoisoned)?;
        guard.insert(record.id.clone(), record);
        Ok(())
    }

    fn delete(&self, id: &str) -> Result<bool, StorageError> {
        let mut guard = self.inner.write().map_err(|_| StorageError::LockPoisoned)?;
        Ok(guard.remove(id).is_some())
    }

    fn try_consume_request(&self, id: &str) -> Result<bool, StorageError> {
        let mut guard = self.inner.write().map_err(|_| StorageError::LockPoisoned)?;
        Ok(consume_request(guard.get_mut(id)))
    }

    fn try_admit_request(&self, id: &str, now: i64) -> Result<RequestAdmission, StorageError> {
        let mut guard = self.inner.write().map_err(|_| StorageError::LockPoisoned)?;
        Ok(admit_request(guard.get_mut(id), now))
    }

    fn record_token_usage(&self, id: &str, tokens: u64) -> Result<(), StorageError> {
        let mut guard = self.inner.write().map_err(|_| StorageError::LockPoisoned)?;
        add_token_usage(guard.get_mut(id), tokens);
        Ok(())
    }
}

/// Links Notation text token store.
///
/// Existing hand-built files are read once and atomically migrated to the
/// official `lino-objects-codec` representation.
#[derive(Clone)]
pub struct TextTokenStore {
    path: PathBuf,
    lock_path: PathBuf,
    inner: Arc<RwLock<HashMap<String, TokenRecord>>>,
}

impl TextTokenStore {
    pub fn open(path: impl Into<PathBuf>) -> Result<Self, StorageError> {
        let path = path.into();
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent)?;
        }
        let (records, migrated) = if path.exists() {
            let contents = fs::read_to_string(&path)?;
            match associative::decode_text(&contents) {
                Ok(records) => (records, false),
                Err(_) => (
                    legacy::decode_text(&contents).map_err(StorageError::Codec)?,
                    true,
                ),
            }
        } else {
            (Vec::new(), false)
        };
        let map: HashMap<_, _> = records.into_iter().map(|r| (r.id.clone(), r)).collect();
        let store = Self {
            lock_path: path.with_extension("lock"),
            path,
            inner: Arc::new(RwLock::new(map)),
        };
        if migrated {
            let guard = store.inner.read().map_err(|_| StorageError::LockPoisoned)?;
            store.flush(&guard)?;
        }
        Ok(store)
    }

    fn flush(&self, guard: &HashMap<String, TokenRecord>) -> Result<(), StorageError> {
        let mut sorted: Vec<&TokenRecord> = guard.values().collect();
        sorted.sort_by(|a, b| a.id.cmp(&b.id));
        let body = associative::encode_text(sorted.iter().copied());
        atomic_write(&self.path, body.as_bytes())
    }

    fn load_map(&self) -> Result<HashMap<String, TokenRecord>, StorageError> {
        if !self.path.exists() {
            return Ok(HashMap::new());
        }
        let contents = fs::read_to_string(&self.path)?;
        let records = associative::decode_text(&contents)
            .or_else(|_| legacy::decode_text(&contents))
            .map_err(StorageError::Codec)?;
        Ok(records
            .into_iter()
            .map(|record| (record.id.clone(), record))
            .collect())
    }

    fn refresh(&self) -> Result<(), StorageError> {
        crate::durable_file::with_exclusive_lock(&self.lock_path, || {
            let map = self.load_map()?;
            *self.inner.write().map_err(|_| StorageError::LockPoisoned)? = map;
            Ok(())
        })
    }

    fn mutate<T>(
        &self,
        operation: impl FnOnce(&mut HashMap<String, TokenRecord>) -> T,
    ) -> Result<T, StorageError> {
        crate::durable_file::with_exclusive_lock(&self.lock_path, || {
            let mut guard = self.inner.write().map_err(|_| StorageError::LockPoisoned)?;
            *guard = self.load_map()?;
            let before = guard.clone();
            let result = operation(&mut guard);
            if let Err(error) = self.flush(&guard) {
                *guard = before;
                return Err(error);
            }
            Ok(result)
        })
    }

    fn replace_all(&self, records: &[TokenRecord]) -> Result<(), StorageError> {
        self.mutate(|current| {
            current.clear();
            current.extend(
                records
                    .iter()
                    .cloned()
                    .map(|record| (record.id.clone(), record)),
            );
        })
    }
}

impl TokenStore for TextTokenStore {
    fn list(&self) -> Result<Vec<TokenRecord>, StorageError> {
        self.refresh()?;
        let guard = self.inner.read().map_err(|_| StorageError::LockPoisoned)?;
        Ok(guard.values().cloned().collect())
    }

    fn get(&self, id: &str) -> Result<Option<TokenRecord>, StorageError> {
        self.refresh()?;
        let guard = self.inner.read().map_err(|_| StorageError::LockPoisoned)?;
        Ok(guard.get(id).cloned())
    }

    fn put(&self, record: TokenRecord) -> Result<(), StorageError> {
        self.mutate(|records| {
            records.insert(record.id.clone(), record);
        })
    }

    fn delete(&self, id: &str) -> Result<bool, StorageError> {
        self.mutate(|records| records.remove(id).is_some())
    }

    fn try_consume_request(&self, id: &str) -> Result<bool, StorageError> {
        self.mutate(|records| consume_request(records.get_mut(id)))
    }

    fn try_admit_request(&self, id: &str, now: i64) -> Result<RequestAdmission, StorageError> {
        self.mutate(|records| admit_request(records.get_mut(id), now))
    }

    fn record_token_usage(&self, id: &str, tokens: u64) -> Result<(), StorageError> {
        self.mutate(|records| add_token_usage(records.get_mut(id), tokens))
    }
}

/// Native file-mapped doublets token store.
///
/// Existing `LARTOK01` length-prefixed JSON files are read once and
/// atomically migrated to the doublets representation.
#[derive(Clone)]
pub struct BinaryTokenStore {
    path: PathBuf,
    lock_path: PathBuf,
    inner: Arc<RwLock<HashMap<String, TokenRecord>>>,
}

impl BinaryTokenStore {
    pub fn open(path: impl Into<PathBuf>) -> Result<Self, StorageError> {
        let path = path.into();
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent)?;
        }
        let (records, migrated) = if path.exists() {
            if legacy::is_binary(&path)? {
                (legacy::decode_binary(&path)?, true)
            } else {
                (associative::read_binary(&path)?, false)
            }
        } else {
            (Vec::new(), false)
        };
        let map: HashMap<_, _> = records.into_iter().map(|r| (r.id.clone(), r)).collect();
        let store = Self {
            lock_path: path.with_extension("lock"),
            path,
            inner: Arc::new(RwLock::new(map)),
        };
        if migrated {
            let guard = store.inner.read().map_err(|_| StorageError::LockPoisoned)?;
            store.flush(&guard)?;
        }
        Ok(store)
    }

    fn flush(&self, guard: &HashMap<String, TokenRecord>) -> Result<(), StorageError> {
        let mut sorted: Vec<&TokenRecord> = guard.values().collect();
        sorted.sort_by(|a, b| a.id.cmp(&b.id));
        associative::write_binary(&self.path, sorted)
    }

    fn load_map(&self) -> Result<HashMap<String, TokenRecord>, StorageError> {
        if !self.path.exists() {
            return Ok(HashMap::new());
        }
        let records = if legacy::is_binary(&self.path)? {
            legacy::decode_binary(&self.path)?
        } else {
            associative::read_binary(&self.path)?
        };
        Ok(records
            .into_iter()
            .map(|record| (record.id.clone(), record))
            .collect())
    }

    fn refresh(&self) -> Result<(), StorageError> {
        crate::durable_file::with_exclusive_lock(&self.lock_path, || {
            let map = self.load_map()?;
            *self.inner.write().map_err(|_| StorageError::LockPoisoned)? = map;
            Ok(())
        })
    }

    fn mutate<T>(
        &self,
        operation: impl FnOnce(&mut HashMap<String, TokenRecord>) -> T,
    ) -> Result<T, StorageError> {
        crate::durable_file::with_exclusive_lock(&self.lock_path, || {
            let mut guard = self.inner.write().map_err(|_| StorageError::LockPoisoned)?;
            *guard = self.load_map()?;
            let before = guard.clone();
            let result = operation(&mut guard);
            if let Err(error) = self.flush(&guard) {
                *guard = before;
                return Err(error);
            }
            Ok(result)
        })
    }

    fn replace_all(&self, records: &[TokenRecord]) -> Result<(), StorageError> {
        self.mutate(|current| {
            current.clear();
            current.extend(
                records
                    .iter()
                    .cloned()
                    .map(|record| (record.id.clone(), record)),
            );
        })
    }
}

impl TokenStore for BinaryTokenStore {
    fn list(&self) -> Result<Vec<TokenRecord>, StorageError> {
        self.refresh()?;
        let guard = self.inner.read().map_err(|_| StorageError::LockPoisoned)?;
        Ok(guard.values().cloned().collect())
    }

    fn get(&self, id: &str) -> Result<Option<TokenRecord>, StorageError> {
        self.refresh()?;
        let guard = self.inner.read().map_err(|_| StorageError::LockPoisoned)?;
        Ok(guard.get(id).cloned())
    }

    fn put(&self, record: TokenRecord) -> Result<(), StorageError> {
        self.mutate(|records| {
            records.insert(record.id.clone(), record);
        })
    }

    fn delete(&self, id: &str) -> Result<bool, StorageError> {
        self.mutate(|records| records.remove(id).is_some())
    }

    fn try_consume_request(&self, id: &str) -> Result<bool, StorageError> {
        self.mutate(|records| consume_request(records.get_mut(id)))
    }

    fn try_admit_request(&self, id: &str, now: i64) -> Result<RequestAdmission, StorageError> {
        self.mutate(|records| admit_request(records.get_mut(id), now))
    }

    fn record_token_usage(&self, id: &str, tokens: u64) -> Result<(), StorageError> {
        self.mutate(|records| add_token_usage(records.get_mut(id), tokens))
    }
}

fn consume_request(record: Option<&mut TokenRecord>) -> bool {
    let Some(record) = record else {
        return true;
    };
    if record
        .max_requests
        .is_some_and(|max| record.used_requests >= max)
    {
        return false;
    }
    record.used_requests = record.used_requests.saturating_add(1);
    true
}

fn admit_request(record: Option<&mut TokenRecord>, now: i64) -> RequestAdmission {
    let Some(record) = record else {
        return RequestAdmission::Admitted;
    };
    if record
        .max_requests
        .is_some_and(|max| record.used_requests >= max)
    {
        return RequestAdmission::RequestLimitExceeded;
    }
    if record
        .max_tokens
        .is_some_and(|max| record.used_tokens >= max)
    {
        return RequestAdmission::TokenLimitExceeded;
    }
    if let Some(max) = record.rate_limit_per_minute {
        if now.saturating_sub(record.rate_window_started_at) >= 60 {
            record.rate_window_started_at = now;
            record.rate_window_requests = 0;
        }
        if record.rate_window_requests >= max {
            return RequestAdmission::RateLimitExceeded;
        }
        record.rate_window_requests = record.rate_window_requests.saturating_add(1);
    }
    record.used_requests = record.used_requests.saturating_add(1);
    RequestAdmission::Admitted
}

const fn add_token_usage(record: Option<&mut TokenRecord>, tokens: u64) {
    if let Some(record) = record {
        record.used_tokens = record.used_tokens.saturating_add(tokens);
    }
}

/// Dual-write store: every mutation goes to *both* primary and secondary;
/// reads consult the primary first, falling back to the secondary on miss.
///
/// Used for [`StoragePolicy::Both`] so the text and binary files stay in
/// sync. The configured order is `text` (primary) → `binary` (secondary).
pub struct DualTokenStore {
    pub primary: Arc<dyn TokenStore>,
    pub secondary: Arc<dyn TokenStore>,
}

impl TokenStore for DualTokenStore {
    fn list(&self) -> Result<Vec<TokenRecord>, StorageError> {
        let mut by_id: HashMap<String, TokenRecord> = HashMap::new();
        for rec in self.primary.list()? {
            by_id.insert(rec.id.clone(), rec);
        }
        for rec in self.secondary.list()? {
            by_id.entry(rec.id.clone()).or_insert(rec);
        }
        Ok(by_id.into_values().collect())
    }

    fn get(&self, id: &str) -> Result<Option<TokenRecord>, StorageError> {
        if let Some(rec) = self.primary.get(id)? {
            return Ok(Some(rec));
        }
        self.secondary.get(id)
    }

    fn put(&self, record: TokenRecord) -> Result<(), StorageError> {
        self.primary.put(record.clone())?;
        self.secondary.put(record)?;
        Ok(())
    }

    fn delete(&self, id: &str) -> Result<bool, StorageError> {
        let a = self.primary.delete(id)?;
        let b = self.secondary.delete(id)?;
        Ok(a || b)
    }

    fn try_consume_request(&self, id: &str) -> Result<bool, StorageError> {
        if !self.primary.try_consume_request(id)? {
            return Ok(false);
        }
        self.secondary.try_consume_request(id)
    }

    fn try_admit_request(&self, id: &str, now: i64) -> Result<RequestAdmission, StorageError> {
        let admission = self.primary.try_admit_request(id, now)?;
        if admission != RequestAdmission::Admitted {
            return Ok(admission);
        }
        self.secondary.try_admit_request(id, now)
    }

    fn record_token_usage(&self, id: &str, tokens: u64) -> Result<(), StorageError> {
        self.primary.record_token_usage(id, tokens)?;
        self.secondary.record_token_usage(id, tokens)
    }
}

/// Crash-recoverable dual-format store used by the default persistence mode.
/// A journal containing the complete target state is synced before either
/// representation changes and removed only after both replacements succeed.
struct DurableDualTokenStore {
    text: TextTokenStore,
    binary: BinaryTokenStore,
    lock_path: PathBuf,
    journal_path: PathBuf,
}

impl DurableDualTokenStore {
    fn open(data_dir: &Path) -> Result<Self, StorageError> {
        let store = Self {
            text: TextTokenStore::open(data_dir.join("tokens.lino"))?,
            binary: BinaryTokenStore::open(data_dir.join("tokens.bin"))?,
            lock_path: data_dir.join("tokens.transaction.lock"),
            journal_path: data_dir.join("tokens.transaction.json"),
        };
        store.with_records(|_| ())?;
        Ok(store)
    }

    fn merged_records(&self) -> Result<HashMap<String, TokenRecord>, StorageError> {
        let mut records = HashMap::new();
        for record in self.text.list()? {
            records.insert(record.id.clone(), record);
        }
        for record in self.binary.list()? {
            records
                .entry(record.id.clone())
                .and_modify(|current| merge_safer_record(current, &record))
                .or_insert(record);
        }
        Ok(records)
    }

    fn recover(&self) -> Result<(), StorageError> {
        if !self.journal_path.exists() {
            return Ok(());
        }
        let records: Vec<TokenRecord> = serde_json::from_slice(&fs::read(&self.journal_path)?)
            .map_err(|error| StorageError::Codec(format!("transaction journal: {error}")))?;
        self.install(&records)
    }

    fn install(&self, records: &[TokenRecord]) -> Result<(), StorageError> {
        self.text.replace_all(records)?;
        self.binary.replace_all(records)?;
        if self.journal_path.exists() {
            fs::remove_file(&self.journal_path)?;
            if let Some(parent) = self.journal_path.parent() {
                crate::durable_file::sync_directory(parent)?;
            }
        }
        Ok(())
    }

    fn commit(&self, records: &HashMap<String, TokenRecord>) -> Result<(), StorageError> {
        let mut records = records.values().cloned().collect::<Vec<_>>();
        records.sort_by(|left, right| left.id.cmp(&right.id));
        let journal = serde_json::to_vec(&records)
            .map_err(|error| StorageError::Codec(format!("transaction journal: {error}")))?;
        crate::durable_file::atomic_write_owner_only(&self.journal_path, &journal)?;
        self.install(&records)
    }

    fn with_records<T>(
        &self,
        operation: impl FnOnce(&mut HashMap<String, TokenRecord>) -> T,
    ) -> Result<T, StorageError> {
        crate::durable_file::with_exclusive_lock(&self.lock_path, || {
            self.recover()?;
            let mut records = self.merged_records()?;
            let result = operation(&mut records);
            self.commit(&records)?;
            Ok(result)
        })
    }
}

fn merge_safer_record(current: &mut TokenRecord, other: &TokenRecord) {
    current.revoked |= other.revoked;
    current.used_requests = current.used_requests.max(other.used_requests);
    current.used_tokens = current.used_tokens.max(other.used_tokens);
    if other.rate_window_started_at > current.rate_window_started_at {
        current.rate_window_started_at = other.rate_window_started_at;
        current.rate_window_requests = other.rate_window_requests;
    } else if other.rate_window_started_at == current.rate_window_started_at {
        current.rate_window_requests = current.rate_window_requests.max(other.rate_window_requests);
    }
}

impl TokenStore for DurableDualTokenStore {
    fn list(&self) -> Result<Vec<TokenRecord>, StorageError> {
        self.with_records(|records| records.values().cloned().collect())
    }

    fn get(&self, id: &str) -> Result<Option<TokenRecord>, StorageError> {
        self.with_records(|records| records.get(id).cloned())
    }

    fn put(&self, record: TokenRecord) -> Result<(), StorageError> {
        self.with_records(|records| {
            records.insert(record.id.clone(), record);
        })
    }

    fn delete(&self, id: &str) -> Result<bool, StorageError> {
        self.with_records(|records| records.remove(id).is_some())
    }

    fn try_consume_request(&self, id: &str) -> Result<bool, StorageError> {
        self.with_records(|records| consume_request(records.get_mut(id)))
    }

    fn try_admit_request(&self, id: &str, now: i64) -> Result<RequestAdmission, StorageError> {
        self.with_records(|records| admit_request(records.get_mut(id), now))
    }

    fn record_token_usage(&self, id: &str, tokens: u64) -> Result<(), StorageError> {
        self.with_records(|records| add_token_usage(records.get_mut(id), tokens))
    }
}

/// Build a [`TokenStore`] following the configured [`StoragePolicy`].
pub fn build_token_store(
    policy: StoragePolicy,
    data_dir: &Path,
) -> Result<Arc<dyn TokenStore>, StorageError> {
    match policy {
        StoragePolicy::Memory => Ok(Arc::new(MemoryTokenStore::new())),
        StoragePolicy::Text => {
            let s = TextTokenStore::open(data_dir.join("tokens.lino"))?;
            Ok(Arc::new(s))
        }
        StoragePolicy::Binary => {
            let s = BinaryTokenStore::open(data_dir.join("tokens.bin"))?;
            Ok(Arc::new(s))
        }
        StoragePolicy::Both => Ok(Arc::new(DurableDualTokenStore::open(data_dir)?)),
    }
}

fn atomic_write(path: &Path, contents: &[u8]) -> Result<(), StorageError> {
    crate::durable_file::atomic_write_owner_only(path, contents).map_err(Into::into)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::Barrier;
    use std::thread;
    use tempfile::tempdir;

    fn sample_record(id: &str) -> TokenRecord {
        TokenRecord {
            id: id.into(),
            label: "test \"label\"".into(),
            issued_at: 1_700_000_000,
            expires_at: 1_700_001_000,
            revoked: false,
            account: Some("primary".into()),
            max_requests: None,
            used_requests: 0,
            max_tokens: None,
            used_tokens: 0,
            rate_limit_per_minute: None,
            rate_window_started_at: 0,
            rate_window_requests: 0,
            scope: String::new(),
        }
    }

    #[test]
    fn memory_store_roundtrip() {
        let s = MemoryTokenStore::new();
        s.put(sample_record("a")).unwrap();
        assert_eq!(s.list().unwrap().len(), 1);
        assert!(s.get("a").unwrap().is_some());
        assert!(s.delete("a").unwrap());
        assert!(s.get("a").unwrap().is_none());
    }

    #[test]
    fn text_store_roundtrip() {
        let dir = tempdir().unwrap();
        let path = dir.path().join("tokens.lino");
        let s = TextTokenStore::open(&path).unwrap();
        s.put(sample_record("a")).unwrap();
        s.put(sample_record("b")).unwrap();
        let s2 = TextTokenStore::open(&path).unwrap();
        let mut list = s2.list().unwrap();
        list.sort_by(|x, y| x.id.cmp(&y.id));
        assert_eq!(list.len(), 2);
        assert_eq!(list[0].id, "a");
        assert_eq!(list[0].label, "test \"label\"");
        assert_eq!(list[0].account.as_deref(), Some("primary"));
    }

    #[test]
    fn binary_store_roundtrip() {
        let dir = tempdir().unwrap();
        let path = dir.path().join("tokens.bin");
        let s = BinaryTokenStore::open(&path).unwrap();
        s.put(sample_record("a")).unwrap();
        s.put(sample_record("b")).unwrap();
        let s2 = BinaryTokenStore::open(&path).unwrap();
        let mut list = s2.list().unwrap();
        list.sort_by(|x, y| x.id.cmp(&y.id));
        assert_eq!(list.len(), 2);
        assert_eq!(list[1].id, "b");
    }

    #[test]
    fn stores_persist_the_admin_scope() {
        let dir = tempdir().unwrap();
        let mut admin = sample_record("admin");
        admin.scope = crate::token::ADMIN_SCOPE.to_string();

        let text_path = dir.path().join("tokens.lino");
        let text = TextTokenStore::open(&text_path).unwrap();
        text.put(admin.clone()).unwrap();
        text.put(sample_record("client")).unwrap();
        let text = TextTokenStore::open(&text_path).unwrap();
        assert_eq!(
            text.get("admin").unwrap().unwrap().scope,
            crate::token::ADMIN_SCOPE
        );
        assert!(text.get("client").unwrap().unwrap().scope.is_empty());

        let bin_path = dir.path().join("tokens.bin");
        let bin = BinaryTokenStore::open(&bin_path).unwrap();
        bin.put(admin).unwrap();
        let bin = BinaryTokenStore::open(&bin_path).unwrap();
        assert_eq!(
            bin.get("admin").unwrap().unwrap().scope,
            crate::token::ADMIN_SCOPE
        );
    }

    #[test]
    fn dual_store_writes_both() {
        let dir = tempdir().unwrap();
        let text = Arc::new(TextTokenStore::open(dir.path().join("a.lino")).unwrap());
        let bin = Arc::new(BinaryTokenStore::open(dir.path().join("a.bin")).unwrap());
        let dual = DualTokenStore {
            primary: text.clone(),
            secondary: bin.clone(),
        };
        dual.put(sample_record("a")).unwrap();
        assert_eq!(text.list().unwrap().len(), 1);
        assert_eq!(bin.list().unwrap().len(), 1);
    }

    #[test]
    fn dual_store_concurrent_consumption_is_atomic_and_preserves_formats() {
        const REQUESTS: usize = 32;

        let dir = tempdir().unwrap();
        let store = build_token_store(StoragePolicy::Both, dir.path()).unwrap();
        store.put(sample_record("shared")).unwrap();

        let barrier = Arc::new(Barrier::new(REQUESTS));
        let handles: Vec<_> = (0..REQUESTS)
            .map(|_| {
                let store = Arc::clone(&store);
                let barrier = Arc::clone(&barrier);
                thread::spawn(move || {
                    barrier.wait();
                    store.try_consume_request("shared")
                })
            })
            .collect();

        for handle in handles {
            assert!(handle.join().unwrap().unwrap());
        }

        let text = TextTokenStore::open(dir.path().join("tokens.lino")).unwrap();
        let binary = BinaryTokenStore::open(dir.path().join("tokens.bin")).unwrap();
        assert_eq!(
            text.get("shared").unwrap().unwrap().used_requests,
            REQUESTS as u64
        );
        assert_eq!(
            binary.get("shared").unwrap().unwrap().used_requests,
            REQUESTS as u64
        );
    }

    #[test]
    fn revoke_marks_record() {
        let s = MemoryTokenStore::new();
        s.put(sample_record("a")).unwrap();
        assert!(s.revoke("a").unwrap());
        assert!(s.get("a").unwrap().unwrap().revoked);
        // second revoke is a no-op
        assert!(!s.revoke("a").unwrap());
        // unknown id returns false
        assert!(!s.revoke("missing").unwrap());
    }

    #[test]
    fn build_token_store_dispatches_correctly() {
        let dir = tempdir().unwrap();
        let mem = build_token_store(StoragePolicy::Memory, dir.path()).unwrap();
        mem.put(sample_record("m")).unwrap();
        assert!(mem.get("m").unwrap().is_some());

        let text = build_token_store(StoragePolicy::Text, dir.path()).unwrap();
        text.put(sample_record("t")).unwrap();
        assert!(dir.path().join("tokens.lino").exists());

        let bin = build_token_store(StoragePolicy::Binary, dir.path()).unwrap();
        bin.put(sample_record("b")).unwrap();
        assert!(dir.path().join("tokens.bin").exists());

        let dual = build_token_store(StoragePolicy::Both, dir.path()).unwrap();
        dual.put(sample_record("d")).unwrap();
        // both files updated
        let text_contents = std::fs::read_to_string(dir.path().join("tokens.lino")).unwrap();
        assert!(
            associative::decode_text(&text_contents)
                .unwrap()
                .iter()
                .any(|record| record.id == "d")
        );
        assert!(
            BinaryTokenStore::open(dir.path().join("tokens.bin"))
                .unwrap()
                .get("d")
                .unwrap()
                .is_some()
        );
    }

    #[test]
    fn independently_opened_text_stores_do_not_lose_updates() {
        let dir = tempdir().unwrap();
        let path = dir.path().join("tokens.lino");
        let first = TextTokenStore::open(&path).unwrap();
        let second = TextTokenStore::open(&path).unwrap();
        first.put(sample_record("first")).unwrap();
        second.put(sample_record("second")).unwrap();

        let reopened = TextTokenStore::open(path).unwrap();
        assert!(reopened.get("first").unwrap().is_some());
        assert!(reopened.get("second").unwrap().is_some());
    }

    #[test]
    fn dual_store_recovers_a_synced_transaction_journal() {
        let dir = tempdir().unwrap();
        let mut record = sample_record("recovered");
        record.revoked = true;
        crate::durable_file::atomic_write_owner_only(
            &dir.path().join("tokens.transaction.json"),
            &serde_json::to_vec(&vec![record]).unwrap(),
        )
        .unwrap();

        let recovered = build_token_store(StoragePolicy::Both, dir.path()).unwrap();
        assert!(recovered.get("recovered").unwrap().unwrap().revoked);
        assert!(!dir.path().join("tokens.transaction.json").exists());
        assert!(
            TextTokenStore::open(dir.path().join("tokens.lino"))
                .unwrap()
                .get("recovered")
                .unwrap()
                .is_some()
        );
        assert!(
            BinaryTokenStore::open(dir.path().join("tokens.bin"))
                .unwrap()
                .get("recovered")
                .unwrap()
                .is_some()
        );
    }

    #[test]
    fn lino_codec_handles_special_chars() {
        let rec = TokenRecord {
            id: "id1".into(),
            label: "with \"quote\" and \\ backslash and\nnewline".into(),
            issued_at: 1,
            expires_at: 2,
            revoked: true,
            account: None,
            max_requests: Some(100),
            used_requests: 7,
            max_tokens: Some(1_000),
            used_tokens: 250,
            rate_limit_per_minute: Some(10),
            rate_window_started_at: 1_700_000_000,
            rate_window_requests: 2,
            scope: crate::token::ADMIN_SCOPE.to_string(),
        };
        let s = associative::encode_text(std::iter::once(&rec));
        let parsed = associative::decode_text(&s).unwrap();
        assert_eq!(parsed.len(), 1);
        assert_eq!(parsed[0], rec);
    }
}
