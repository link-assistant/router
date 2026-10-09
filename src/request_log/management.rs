//! Bounded request lookup, clear, and active-account snapshots.
use super::RequestLog;
use serde_json::{Value, json};
use std::collections::BTreeMap;
use std::fs;
use std::io::{self, BufRead as _, Read as _};
use std::path::PathBuf;
use std::sync::Arc;

const MAX_LOOKUP_BYTES: u64 = 10 * 1024 * 1024;

impl RequestLog {
    /// Attach an explicitly enabled error store. Disabled for ordinary constructors.
    #[must_use]
    pub fn with_error_log(mut self, log: Arc<crate::error_log::ErrorLog>) -> Self {
        self.error_log = Some(log);
        self
    }

    pub(crate) fn with_error_log_from_env(self) -> Self {
        match crate::error_log::ErrorLog::from_env() {
            Some(log) => self.with_error_log(log),
            None => self,
        }
    }

    /// Enabled error capture store, if any.
    #[must_use]
    pub const fn error_log(&self) -> Option<&Arc<crate::error_log::ErrorLog>> {
        self.error_log.as_ref()
    }

    /// Read all retained phases for an id, accepting links notation and legacy JSON.
    pub fn lookup(&self, id: &str) -> io::Result<Vec<Value>> {
        if id.is_empty() || id.len() > 128 {
            return Err(io::Error::from(io::ErrorKind::InvalidInput));
        }
        let _guard = self
            .write_lock
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner);
        let mut records = Vec::new();
        let mut size = 0;
        for path in self.files()? {
            let file = fs::File::open(path)?;
            let reader = io::BufReader::new(file.take(self.max_bytes));
            for line in reader.lines() {
                let line = line?;
                // Match the encoded id before parsing unrelated large records.
                if !line.contains(id) {
                    continue;
                }
                if let Some(record) = crate::lino_json::decode_line(&line)
                    && record["correlation_id"].as_str() == Some(id)
                {
                    size += line.len() as u64;
                    if size > MAX_LOOKUP_BYTES {
                        return Err(io::Error::other("request exceeds lookup limit"));
                    }
                    records.push(record);
                }
            }
        }
        Ok(records)
    }

    fn files(&self) -> io::Result<Vec<PathBuf>> {
        match fs::symlink_metadata(&self.root) {
            Ok(metadata) if metadata.is_dir() => (),
            Ok(_) => return Err(io::Error::from(io::ErrorKind::InvalidInput)),
            Err(error) if error.kind() == io::ErrorKind::NotFound => return Ok(Vec::new()),
            Err(error) => return Err(error),
        }
        let mut files = Vec::new();
        for entry in fs::read_dir(&self.root)? {
            let entry = entry?;
            if !entry.file_type()?.is_dir() {
                continue;
            }
            for name in [super::LOG_FILE, super::LEGACY_LOG_FILE] {
                let path = entry.path().join(name);
                if fs::symlink_metadata(&path).is_ok_and(|metadata| metadata.is_file()) {
                    files.push(path);
                }
            }
        }
        files.sort();
        Ok(files)
    }

    /// Delete retained request/error files, preserving operational and audit logs.
    pub fn clear(&self) -> io::Result<()> {
        let _guard = self
            .write_lock
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner);
        for file in self.files()? {
            fs::remove_file(file)?;
        }
        *self
            .total_limit_state
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner) = None;
        if let Some(log) = &self.error_log {
            log.clear()?;
        }
        Ok(())
    }

    pub(crate) fn set_account(&self, id: &str, account: &str) {
        if let Some(route) = self
            .routes
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner)
            .get_mut(id)
        {
            route.account = Some(account.to_owned());
        }
    }

    pub(crate) fn begin_upstream(&self, id: &str) {
        if let Some(route) = self
            .routes
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner)
            .get_mut(id)
        {
            route.account.get_or_insert_with(|| "primary".to_owned());
        }
    }

    /// Active HTTP exchanges per selected account, through response consumption.
    /// Router dispatches immediately, so there is no application queue.
    #[must_use]
    pub fn queue_snapshot(&self, configured: impl IntoIterator<Item = String>) -> Value {
        let mut counts = configured
            .into_iter()
            .map(|name| (name, 0_u64))
            .collect::<BTreeMap<_, _>>();
        let routes = self
            .routes
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner);
        let mut unassigned = 0;
        for route in routes.values() {
            if let Some(name) = &route.account {
                *counts.entry(name.clone()).or_default() += 1;
            } else {
                unassigned += 1;
            }
        }
        let in_flight = routes.len();
        drop(routes);
        let accounts = counts
            .into_iter()
            .map(|(name, in_flight)| json!({"name": name, "in_flight": in_flight, "queued": 0}))
            .collect::<Vec<_>>();
        json!({"accounts": accounts, "in_flight": in_flight, "queued": 0, "unassigned": unassigned})
    }
}
