//! The file-mapped doublets token store.
//!
//! Split from `storage.rs` to keep that file within the repository's
//! 1000-line limit.

use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::{Arc, RwLock};

use super::budget::{
    add_token_usage, admit_request_reserving, consume_request, settle_token_usage,
};
use super::{RequestAdmission, StorageError, TokenRecord, TokenStore, associative, legacy};

/// Native file-mapped doublets token store.
///
/// Existing `LARTOK01` length-prefixed JSON files are read once and
/// atomically migrated to the doublets representation.
#[derive(Clone)]
pub struct BinaryTokenStore {
    path: PathBuf,
    lock_path: PathBuf,
    pub(super) inner: Arc<RwLock<HashMap<String, TokenRecord>>>,
    /// The doublets store itself, opened once and held for the process.
    ///
    /// A reader-writer lock, so concurrent readers share it and a writer
    /// excludes them: the store is a memory-mapped file whose mutations are
    /// visible to every holder of the mapping, so the lock is what keeps a
    /// rebuild from being observed half-finished (issue #357).
    store: Arc<RwLock<associative::PersistentStore>>,
    /// What the file looked like when `inner` was last loaded from it.
    ///
    /// Re-reading the file on every mutation is what a second router process
    /// requires -- its writes have to become visible here -- but it costs a
    /// full parse of the doublets links network, 1.8 s for 306 records, on a path
    /// usually finds nothing changed. The fingerprint answers "has anyone else
    /// written?" without paying for the answer (issues #356, #357).
    pub(super) loaded: Arc<RwLock<Option<FileFingerprint>>>,
    /// How many times the file has been parsed, for tests to assert against.
    ///
    /// The saving this type exists for is "a write does not re-parse a store
    /// nobody else touched", which is a count, not a duration -- timing it
    /// cannot hold across runners, where the same ten writes took 5 s here
    /// and 12.9 s on Windows (issues #356, #357).
    #[cfg(test)]
    pub(super) parses: Arc<std::sync::atomic::AtomicUsize>,
}

/// Enough of a file's metadata to tell whether it was replaced.
///
/// The store is written by `rename` over a temporary, so a change always moves
/// the modification time and usually the length; an unchanged file keeps both.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(super) struct FileFingerprint {
    pub(super) length: u64,
    pub(super) modified: Option<std::time::SystemTime>,
}

impl FileFingerprint {
    pub(super) fn read(path: &Path) -> Option<Self> {
        let metadata = fs::metadata(path).ok()?;
        Some(Self {
            length: metadata.len(),
            modified: metadata.modified().ok(),
        })
    }
}

impl BinaryTokenStore {
    pub fn open(path: impl Into<PathBuf>) -> Result<Self, StorageError> {
        let path = path.into();
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent)?;
        }
        // A legacy `LARTOK01` file is not a doublets store, so it is decoded
        // and migrated before the store is opened over the path.
        let legacy_records = if path.exists() && legacy::is_binary(&path)? {
            Some(legacy::decode_binary(&path)?)
        } else {
            None
        };
        let migrated = legacy_records.is_some();
        if migrated {
            // The doublets store must not be opened over the legacy bytes.
            fs::remove_file(&path)?;
        }
        let store = associative::PersistentStore::open(&path)?;
        // Opening does not parse the links network. Decoding every record walks
        // link per byte of every string, which at 306 records is ~1.9 s -- and
        // a process that only writes never needs the result. `loaded` is left
        // unset so the first *read* fills it, and `refresh` treats "never
        // loaded" as "changed" (issue #357).
        let map: HashMap<_, _> = legacy_records
            .into_iter()
            .flatten()
            .map(|record| (record.id.clone(), record))
            .collect();
        let fingerprint = None;
        let store = Self {
            lock_path: path.with_extension("lock"),
            path,
            inner: Arc::new(RwLock::new(map)),
            store: Arc::new(RwLock::new(store)),
            loaded: Arc::new(RwLock::new(fingerprint)),
            #[cfg(test)]
            parses: Arc::new(std::sync::atomic::AtomicUsize::new(0)),
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
        self.store
            .write()
            .map_err(|_| StorageError::LockPoisoned)?
            .replace(sorted)?;
        // Our own write is not somebody else's, so record it rather than
        // re-reading the file to discover what we just put there.
        self.remember_fingerprint();
        Ok(())
    }

    fn remember_fingerprint(&self) {
        if let Ok(mut slot) = self.loaded.write() {
            *slot = FileFingerprint::read(&self.path);
        }
    }

    /// Reload only when the file on disk is not the one we last read.
    ///
    /// The reload exists so a second router process's writes become visible;
    /// skipping it when nothing changed keeps that guarantee and removes a
    /// full parse of the links network from every write (issues #356, #357).
    fn reload_if_changed(
        &self,
        guard: &mut HashMap<String, TokenRecord>,
    ) -> Result<(), StorageError> {
        let current = FileFingerprint::read(&self.path);
        let known = self.loaded.read().map_err(|_| StorageError::LockPoisoned)?;
        if current == *known {
            return Ok(());
        }
        drop(known);
        *guard = self.load_map()?;
        self.remember_fingerprint();
        Ok(())
    }

    pub(super) fn load_map(&self) -> Result<HashMap<String, TokenRecord>, StorageError> {
        #[cfg(test)]
        self.parses
            .fetch_add(1, std::sync::atomic::Ordering::Relaxed);
        if !self.path.exists() {
            return Ok(HashMap::new());
        }
        let records = if legacy::is_binary(&self.path)? {
            legacy::decode_binary(&self.path)?
        } else {
            {
                // Reached only when the fingerprint says the file changed,
                // which for a rebuild means the path names a new inode.
                let mut store = self.store.write().map_err(|_| StorageError::LockPoisoned)?;
                store.remap()?;
                store.records()?
            }
        };
        Ok(records
            .into_iter()
            .map(|record| (record.id.clone(), record))
            .collect())
    }

    /// Bring the in-memory map up to date with the file, if it moved.
    ///
    /// A shared lock and a fingerprint check, so a read that finds nothing
    /// changed costs a `stat` rather than a full parse of the links network. This
    /// called by `list`, which the dual store calls on every write through
    /// `merged_records` -- so an unguarded reload here cost 1.9 s of the 2.9 s
    /// a `put` took at 306 records (issues #356, #357).
    fn refresh(&self) -> Result<(), StorageError> {
        crate::durable_file::with_shared_lock(&self.lock_path, || {
            let current = FileFingerprint::read(&self.path);
            if current == *self.loaded.read().map_err(|_| StorageError::LockPoisoned)? {
                return Ok(());
            }
            let map = self.load_map()?;
            *self.inner.write().map_err(|_| StorageError::LockPoisoned)? = map;
            self.remember_fingerprint();
            Ok(())
        })
    }

    fn mutate<T>(
        &self,
        operation: impl FnOnce(&mut HashMap<String, TokenRecord>) -> T,
    ) -> Result<T, StorageError> {
        crate::durable_file::with_exclusive_lock(&self.lock_path, || {
            let mut guard = self.inner.write().map_err(|_| StorageError::LockPoisoned)?;
            self.reload_if_changed(&mut guard)?;
            let before = guard.clone();
            let result = operation(&mut guard);
            if let Err(error) = self.flush(&guard) {
                *guard = before;
                return Err(error);
            }
            Ok(result)
        })
    }

    pub(super) fn replace_all(&self, records: &[TokenRecord]) -> Result<(), StorageError> {
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

    /// Write the links network only when the records differ from disk.
    ///
    /// Rebuilding is the expensive half of a write: `write_binary` stores each
    /// string as one link per byte, and every field key is a per-record path,
    /// so persisting 306 records costs about 780,000 `create_link` calls. The
    /// dual store calls this for both projections on every mutation, including
    /// mutations that leave the binary projection identical -- a `put` of one
    /// token rebuilds the other 305 unchanged ones (issues #356, #357).
    pub(super) fn replace_all_if_changed(
        &self,
        records: &[TokenRecord],
    ) -> Result<(), StorageError> {
        {
            let guard = self.inner.read().map_err(|_| StorageError::LockPoisoned)?;
            if guard.len() == records.len()
                && records
                    .iter()
                    .all(|record| guard.get(&record.id).is_some_and(|held| held == record))
            {
                return Ok(());
            }
        }
        self.replace_all(records)
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
