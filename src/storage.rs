//! Token persistence backends.
//!
//! Issued-token state can be persisted as real Links Notation text, a native
//! file-mapped doublets links network, or both.
//!
//! This module provides:
//!
//! - The [`TokenStore`] trait — a small async-ish (sync, for now) API for
//!   listing, persisting, and revoking [`TokenRecord`]s.
//! - [`MemoryTokenStore`] — an in-memory implementation, used in tests and
//!   for [`StoragePolicy::Memory`].
//! - [`TextTokenStore`] — persists records through `lino-objects-codec` at
//!   `<data_dir>/tokens.lino`.
//! - [`BinaryTokenStore`] — persists the same `Type → SubType → Value` links network
//!   in a `doublets` store backed by `link-cli`'s `PersistentFileMapped` at
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
    /// How long, in seconds, an active token's expiry slides ahead of now.
    ///
    /// `None` is a fixed clock: the expiry set at issue time is final, which
    /// is what every token did before. `Some(window)` means a request served
    /// with this token pushes `expires_at` to `now + window`, so a session in
    /// continuous use never expires while one abandoned for longer than the
    /// window still does -- which is the behaviour the bound is for. A
    /// day-long session died mid-work against the fixed 24-hour clock twice
    /// (issue #354).
    #[serde(default)]
    pub sliding_window_seconds: Option<i64>,
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
    /// Tokens reserved by requests that have been admitted but have not yet
    /// reported their actual usage.
    ///
    /// A hard `max_tokens` cap cannot be enforced from `used_tokens` alone:
    /// usage is only known *after* a response completes, so a single large
    /// answer could push the persisted total arbitrarily far past the cap
    /// (issue #195). Admission therefore reserves the request's declared output
    /// budget up front and counts it against the cap; settlement swaps the
    /// reservation for the real figure. Requests still in flight after a crash
    /// leave a stale reservation, which [`TokenStore::release_stale_reservations`]
    /// clears.
    #[serde(default)]
    pub reserved_tokens: u64,
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
    /// Repositories this token may reach through the GitHub proxy; empty is
    /// unrestricted (issue #262).
    ///
    /// `serde(default)` so a store written before this field keeps loading,
    /// and an existing token keeps the access it was issued with.
    #[serde(default)]
    pub github_repos: Vec<String>,
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
            if let Some(max) = rec.max_requests
                && rec.used_requests >= max
            {
                return Ok(false);
            }
            rec.used_requests = rec.used_requests.saturating_add(1);
            self.put(rec)?;
        }
        Ok(true)
    }

    /// Atomically enforce every pre-request limit and record an admitted call.
    fn try_admit_request(&self, id: &str, now: i64) -> Result<RequestAdmission, StorageError> {
        self.try_admit_request_reserving(id, now, 0)
    }

    /// Atomically enforce every pre-request limit, reserving `reserve` tokens of
    /// spend budget for the admitted call.
    ///
    /// Every admitted request must later be settled with
    /// [`TokenStore::settle_token_usage`] so the reservation is released.
    fn try_admit_request_reserving(
        &self,
        id: &str,
        now: i64,
        reserve: u64,
    ) -> Result<RequestAdmission, StorageError> {
        let Some(mut record) = self.get(id)? else {
            return Ok(RequestAdmission::Admitted);
        };
        let admission = admit_request_reserving(Some(&mut record), now, reserve);
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

    /// Release `reserved` tokens of budget and record `actual` usage in one step.
    fn settle_token_usage(&self, id: &str, reserved: u64, actual: u64) -> Result<(), StorageError> {
        if let Some(mut record) = self.get(id)? {
            settle_token_usage(Some(&mut record), reserved, actual);
            self.put(record)?;
        }
        Ok(())
    }

    /// Clear reservations left behind by requests that never settled.
    ///
    /// A process that dies mid-request leaves its reservation pinned against the
    /// cap forever, which would eventually reject every subsequent request. The
    /// router calls this once at startup, when by definition nothing is in flight.
    fn release_stale_reservations(&self) -> Result<usize, StorageError> {
        let mut cleared = 0;
        for mut record in self.list()? {
            if record.reserved_tokens > 0 {
                record.reserved_tokens = 0;
                self.put(record)?;
                cleared += 1;
            }
        }
        Ok(cleared)
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

    fn try_admit_request_reserving(
        &self,
        id: &str,
        now: i64,
        reserve: u64,
    ) -> Result<RequestAdmission, StorageError> {
        let mut guard = self.inner.write().map_err(|_| StorageError::LockPoisoned)?;
        Ok(admit_request_reserving(guard.get_mut(id), now, reserve))
    }

    fn record_token_usage(&self, id: &str, tokens: u64) -> Result<(), StorageError> {
        let mut guard = self.inner.write().map_err(|_| StorageError::LockPoisoned)?;
        add_token_usage(guard.get_mut(id), tokens);
        Ok(())
    }

    fn settle_token_usage(&self, id: &str, reserved: u64, actual: u64) -> Result<(), StorageError> {
        let mut guard = self.inner.write().map_err(|_| StorageError::LockPoisoned)?;
        settle_token_usage(guard.get_mut(id), reserved, actual);
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

    fn try_admit_request_reserving(
        &self,
        id: &str,
        now: i64,
        reserve: u64,
    ) -> Result<RequestAdmission, StorageError> {
        self.mutate(|records| admit_request_reserving(records.get_mut(id), now, reserve))
    }

    fn record_token_usage(&self, id: &str, tokens: u64) -> Result<(), StorageError> {
        self.mutate(|records| add_token_usage(records.get_mut(id), tokens))
    }

    fn settle_token_usage(&self, id: &str, reserved: u64, actual: u64) -> Result<(), StorageError> {
        self.mutate(|records| settle_token_usage(records.get_mut(id), reserved, actual))
    }
}

#[path = "storage_budget.rs"]
mod budget;
use budget::{
    add_token_usage, admit_request_reserving, consume_request, merge_safer_record,
    settle_token_usage,
};

#[path = "storage_binary.rs"]
mod binary;
pub use binary::BinaryTokenStore;

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

    fn try_admit_request_reserving(
        &self,
        id: &str,
        now: i64,
        reserve: u64,
    ) -> Result<RequestAdmission, StorageError> {
        let admission = self.primary.try_admit_request_reserving(id, now, reserve)?;
        if admission != RequestAdmission::Admitted {
            return Ok(admission);
        }
        self.secondary.try_admit_request_reserving(id, now, reserve)
    }

    fn record_token_usage(&self, id: &str, tokens: u64) -> Result<(), StorageError> {
        self.primary.record_token_usage(id, tokens)?;
        self.secondary.record_token_usage(id, tokens)
    }

    fn settle_token_usage(&self, id: &str, reserved: u64, actual: u64) -> Result<(), StorageError> {
        self.primary.settle_token_usage(id, reserved, actual)?;
        self.secondary.settle_token_usage(id, reserved, actual)
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
        // Recovery, not a rewrite. `with_records` reads both projections and
        // commits them back, which costs a full parse and a full rebuild on
        // every open -- ~1.9 s at 306 records, paid by every `router with`
        // invocation. A journal is only present when a writer crashed, so the
        // work is done when there is something to recover and skipped when
        // there is not (issue #357).
        if store.journal_path.exists() {
            store.with_records(|_| ())?;
        }
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
        // Either encoding: a journal written by an earlier release is JSON.
        let source = fs::read_to_string(&self.journal_path)?;
        let records: Vec<TokenRecord> = crate::lino_json::decode(&source)
            .map_err(|error| StorageError::Codec(format!("transaction journal: {error}")))?;
        self.install(&records)
    }

    /// Write both projections, then drop the journal that covered them.
    ///
    /// The order matters and is load-bearing: text first, because reads
    /// consult it; binary second; the journal removed only once both are on
    /// disk, so a crash at any point leaves a journal that `recover` replays.
    ///
    /// The binary projection is the expensive half. `write_binary` stores each
    /// string as one link per byte -- a 36-character id is 36 `create_link`
    /// calls -- so persisting 306 records rebuilds roughly 54,000 links, about
    /// a second, to record a change to one of them (issues #356, #357).
    fn install(&self, records: &[TokenRecord]) -> Result<(), StorageError> {
        self.text.replace_all(records)?;
        // Only when it actually differs. The text projection is what reads
        // consult, and a mutation of one token leaves the other 305 records
        // identical -- rebuilding the links network for them is the bulk of what a
        // write costs (issues #356, #357).
        self.binary.replace_all_if_changed(records)?;
        self.drop_journal()
    }

    fn drop_journal(&self) -> Result<(), StorageError> {
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
        // Links notation, readable, with the file name unchanged so an
        // existing deployment keeps its path and migrates on the next write
        // (issue #336). Its sibling `tokens.lino` already reads this way.
        let journal = crate::lino_json::encode(&records)
            .map_err(|error| StorageError::Codec(format!("transaction journal: {error}")))?
            .into_bytes();
        crate::durable_file::atomic_write_owner_only(&self.journal_path, &journal)?;
        self.install(&records)
    }

    /// Run `operation` over the records and persist whatever it changed.
    ///
    /// For accessors that actually write. A read must use [`Self::read_records`]
    /// instead: committing after a listing rewrote a 64 MB `tokens.bin` to
    /// answer a question that changed nothing, which took 8-13 seconds on a
    /// 290-token deployment and, because the lock is shared with the request
    /// path, queued live traffic behind it (issue #351).
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

    /// Run `operation` over the records without writing anything.
    ///
    /// A shared lock, so concurrent readers do not serialise against each
    /// other, and no `commit()`, so the answer costs a read rather than a
    /// full re-serialise and fsync of both stores (issue #351).
    ///
    /// `recover()` still runs: a crashed writer may have left a journal to
    /// replay, and a reader that ignored it would answer from a store that is
    /// missing the last transaction. It writes only when there is something to
    /// recover, which is not the steady state.
    fn read_records<T>(
        &self,
        operation: impl FnOnce(&HashMap<String, TokenRecord>) -> T,
    ) -> Result<T, StorageError> {
        crate::durable_file::with_shared_lock(&self.lock_path, || {
            self.recover()?;
            let records = self.readable_records()?;
            Ok(operation(&records))
        })
    }

    /// The records, read from the projection that can answer quickly.
    ///
    /// `merged_records` reads both stores, and `tokens.bin` is preallocated --
    /// 64 MB for 290 records on the deployment in issue #351 -- so scanning it
    /// took 1.6 s where the same records came out of `tokens.lino` in 6 ms.
    /// Merging is for reconciling two writers; a read does not need it.
    ///
    /// Reading text alone is sound because `install` writes text first and
    /// binary second, so the text projection is never the staler of the two.
    /// A crash between the two writes leaves binary behind, and the next
    /// `recover()` -- which still runs above -- replays the journal over both.
    fn readable_records(&self) -> Result<HashMap<String, TokenRecord>, StorageError> {
        let mut records = HashMap::new();
        for record in self.text.list()? {
            records.insert(record.id.clone(), record);
        }
        // An empty text projection is the one case where binary may hold more:
        // a store written by a binary-only deployment, or a text file lost.
        // Falling back keeps such a store readable rather than answering that
        // it has no tokens.
        if records.is_empty() {
            return self.merged_records();
        }
        Ok(records)
    }
}

impl TokenStore for DurableDualTokenStore {
    fn list(&self) -> Result<Vec<TokenRecord>, StorageError> {
        self.read_records(|records| records.values().cloned().collect())
    }

    fn get(&self, id: &str) -> Result<Option<TokenRecord>, StorageError> {
        self.read_records(|records| records.get(id).cloned())
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

    fn try_admit_request_reserving(
        &self,
        id: &str,
        now: i64,
        reserve: u64,
    ) -> Result<RequestAdmission, StorageError> {
        self.with_records(|records| admit_request_reserving(records.get_mut(id), now, reserve))
    }

    fn record_token_usage(&self, id: &str, tokens: u64) -> Result<(), StorageError> {
        self.with_records(|records| add_token_usage(records.get_mut(id), tokens))
    }

    fn settle_token_usage(&self, id: &str, reserved: u64, actual: u64) -> Result<(), StorageError> {
        self.with_records(|records| settle_token_usage(records.get_mut(id), reserved, actual))
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
#[path = "storage_tests.rs"]
mod tests;
