//! Cached accounting for the bound across every per-token request log.

use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};

use super::{LEGACY_LOG_FILE, LOG_FILE};

#[derive(Clone, Debug)]
struct Directory {
    modified: SystemTime,
    bytes: u64,
    path: PathBuf,
}

#[derive(Debug)]
pub(super) struct State {
    root_modified: Option<SystemTime>,
    total_bytes: u64,
    directories: HashMap<String, Directory>,
    #[cfg(test)]
    pub(super) full_scans: usize,
}

impl State {
    fn load(root: &Path) -> Option<Self> {
        tracing::debug!(root = %root.display(), "loading request-log total accounting");
        let entries = fs::read_dir(root).ok()?;
        let directories = entries
            .flatten()
            .filter(|entry| entry.path().is_dir())
            .filter_map(|entry| {
                usage(&entry.path())
                    .map(|usage| (entry.file_name().to_string_lossy().into_owned(), usage))
            })
            .collect::<HashMap<_, _>>();
        Some(Self {
            root_modified: root_modified(root),
            total_bytes: directories.values().map(|entry| entry.bytes).sum(),
            directories,
            #[cfg(test)]
            full_scans: 1,
        })
    }

    fn root_changed(&self, root: &Path) -> bool {
        self.root_modified != root_modified(root)
    }

    fn refresh(&mut self, root: &Path, active: &str) {
        if let Some(previous) = self.directories.remove(active) {
            self.total_bytes = self.total_bytes.saturating_sub(previous.bytes);
        }
        if let Some(current) = usage(&root.join(active)) {
            self.total_bytes = self.total_bytes.saturating_add(current.bytes);
            self.directories.insert(active.to_string(), current);
        }
    }
}

fn root_modified(root: &Path) -> Option<SystemTime> {
    fs::metadata(root)
        .and_then(|metadata| metadata.modified())
        .ok()
}

fn usage(path: &Path) -> Option<Directory> {
    let mut bytes = 0_u64;
    let mut modified = UNIX_EPOCH;
    let mut found = false;
    for name in [LOG_FILE, LEGACY_LOG_FILE] {
        let Ok(metadata) = fs::metadata(path.join(name)) else {
            continue;
        };
        if !metadata.is_file() {
            continue;
        }
        found = true;
        bytes = bytes.saturating_add(metadata.len());
        modified = modified.max(metadata.modified().unwrap_or(UNIX_EPOCH));
    }
    found.then(|| Directory {
        modified,
        bytes,
        path: path.to_path_buf(),
    })
}

/// Keep the store inside its total bound without rescanning every token for
/// every record. The enclosing request-log write lock serializes updates to
/// this process-local accounting. A changed root mtime forces a rescan so
/// token directories created or removed outside this logger are incorporated.
pub(super) fn enforce(root: &Path, max_total: u64, active: &str, cached: &Mutex<Option<State>>) {
    let Ok(mut cached) = cached.lock() else {
        return;
    };
    if cached.as_ref().is_none_or(|state| state.root_changed(root)) {
        #[cfg(test)]
        let previous_scans = cached.as_ref().map_or(0, |state| state.full_scans);
        *cached = State::load(root);
        #[cfg(test)]
        if let Some(state) = cached.as_mut() {
            state.full_scans += previous_scans;
        }
    }
    let Some(state) = cached.as_mut() else {
        return;
    };
    state.refresh(root, active);
    if state.total_bytes <= max_total {
        return;
    }

    let mut candidates = state
        .directories
        .iter()
        .map(|(name, entry)| {
            (
                entry.modified,
                entry.bytes,
                entry.path.clone(),
                name.clone(),
            )
        })
        .collect::<Vec<_>>();
    candidates.sort_by_key(|(modified, _, _, _)| *modified);
    for (_, bytes, path, name) in candidates {
        if state.total_bytes <= max_total {
            break;
        }
        // Keep the record that triggered enforcement; older inactive token
        // directories are the eviction unit (issues #322, #331).
        if name == active {
            continue;
        }
        if let Err(error) = fs::remove_dir_all(&path) {
            tracing::warn!("request log eviction failed ({}): {error}", path.display());
            continue;
        }
        state.total_bytes = state.total_bytes.saturating_sub(bytes);
        state.directories.remove(&name);
        tracing::info!(
            token_hash = %name,
            bytes,
            "request log evicted a token directory to stay within the total limit"
        );
    }
    state.root_modified = root_modified(root);
}

#[cfg(test)]
impl State {
    pub(super) const fn accounted_bytes(&self) -> u64 {
        self.total_bytes
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::Arc;

    #[test]
    fn unavailable_roots_and_non_file_logs_are_ignored() {
        let temporary = tempfile::tempdir().unwrap();
        let missing = temporary.path().join("missing");
        let cached = Mutex::new(None);
        enforce(&missing, 0, "active", &cached);
        assert!(cached.lock().unwrap().is_none());

        let token = temporary.path().join("token");
        std::fs::create_dir(&token).unwrap();
        std::fs::create_dir(token.join(LOG_FILE)).unwrap();
        assert!(usage(&token).is_none());
    }

    #[test]
    fn the_active_log_is_never_its_own_eviction_candidate() {
        let temporary = tempfile::tempdir().unwrap();
        let token = temporary.path().join("active");
        std::fs::create_dir(&token).unwrap();
        std::fs::write(token.join(LOG_FILE), b"over the zero-byte limit").unwrap();
        let cached = Mutex::new(None);

        enforce(temporary.path(), 0, "active", &cached);

        assert!(token.join(LOG_FILE).is_file());
    }

    #[test]
    fn poisoned_accounting_fails_open_without_touching_logs() {
        let cached = Arc::new(Mutex::new(None));
        let poison = Arc::clone(&cached);
        let _ = std::thread::spawn(move || {
            let _guard = poison.lock().unwrap();
            panic!("poison cached accounting");
        })
        .join();
        let temporary = tempfile::tempdir().unwrap();

        enforce(temporary.path(), 0, "active", &cached);
    }
}

#[cfg(test)]
mod invalidation_tests {
    use super::*;

    #[test]
    fn directory_changes_reload_accounting_and_appends_refresh_only_the_active_log() {
        use std::io::Write as _;
        let root = tempfile::tempdir().unwrap();
        let active = root.path().join("active");
        fs::create_dir(&active).unwrap();
        fs::write(active.join(LOG_FILE), b"first").unwrap();
        let cached = Mutex::new(None);
        enforce(root.path(), 1000, "active", &cached);
        assert_eq!(cached.lock().unwrap().as_ref().unwrap().full_scans, 1);
        fs::OpenOptions::new()
            .append(true)
            .open(active.join(LOG_FILE))
            .unwrap()
            .write_all(b"second")
            .unwrap();
        enforce(root.path(), 1000, "active", &cached);
        assert_eq!(
            cached.lock().unwrap().as_ref().unwrap().accounted_bytes(),
            11
        );
        assert_eq!(cached.lock().unwrap().as_ref().unwrap().full_scans, 1);

        let external = root.path().join("external");
        fs::create_dir(&external).unwrap();
        fs::write(external.join(LEGACY_LOG_FILE), b"external bytes").unwrap();
        // Force the cached timestamp stale without relying on the filesystem's
        // timestamp resolution or a wall-clock sleep.
        cached.lock().unwrap().as_mut().unwrap().root_modified = Some(UNIX_EPOCH);
        enforce(root.path(), 1000, "active", &cached);
        assert_eq!(cached.lock().unwrap().as_ref().unwrap().full_scans, 2);
        assert_eq!(
            cached.lock().unwrap().as_ref().unwrap().accounted_bytes(),
            25
        );
        fs::remove_dir_all(external).unwrap();
        cached.lock().unwrap().as_mut().unwrap().root_modified = Some(UNIX_EPOCH);
        enforce(root.path(), 1000, "active", &cached);
        assert_eq!(cached.lock().unwrap().as_ref().unwrap().full_scans, 3);
        assert_eq!(
            cached.lock().unwrap().as_ref().unwrap().accounted_bytes(),
            11
        );
    }
}
