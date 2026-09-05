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
}

impl State {
    fn load(root: &Path) -> Option<Self> {
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
        *cached = State::load(root);
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
