//! Bounded non-OAuth checkpoints. Never roll back a live refresh chain.
use std::collections::BTreeMap;
use std::fs;
use std::io::{self, Read as _};
use std::path::{Component, Path, PathBuf};
use std::time::{Duration, Instant};

use link_assistant_router::config::StoragePolicy;
use link_assistant_router::storage::{
    TextTokenStore, TokenRecord, TokenStore, build_token_store, build_token_store_read_only,
};
use serde::{Deserialize, Serialize};
use sha2::{Digest as _, Sha256};

const LIMIT: u64 = 256 * 1024 * 1024;
const SCHEMA: &str = "link-assistant-router/data-backup/v1";

#[derive(Deserialize, Serialize)]
struct Manifest {
    schema: String,
    signing_secret_sha256: String,
    files: BTreeMap<String, String>,
    excluded: Vec<String>,
}

fn invalid(reason: &str) -> io::Error {
    io::Error::other(reason)
}

fn private_directory(path: &Path) -> io::Result<()> {
    if path.ancestors().any(|ancestor| {
        fs::symlink_metadata(ancestor).is_ok_and(|metadata| metadata.file_type().is_symlink())
    }) {
        return Err(invalid("checkpoint directory contains a symlink"));
    }
    fs::create_dir_all(path)?;
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt as _;
        fs::set_permissions(path, fs::Permissions::from_mode(0o700))?;
    }
    Ok(())
}

fn write(path: &Path, bytes: &[u8]) -> io::Result<()> {
    private_directory(path.parent().ok_or_else(|| invalid("missing parent"))?)?;
    link_assistant_router::durable_file::atomic_write_owner_only(path, bytes)
}

fn safe_relative(path: &Path) -> bool {
    let components: Vec<_> = path.components().collect();
    !components.is_empty()
        && components
            .iter()
            .all(|part| matches!(part, Component::Normal(_)))
        && matches!(
            components[0].as_os_str().to_str(),
            Some(
                "providers.lenv"
                    | "tokens.json"
                    | "tokens.lino"
                    | "requests"
                    | "projects"
                    | "sessions"
            )
        )
        && !components.iter().any(|part| {
            matches!(
                part.as_os_str().to_str(),
                Some(
                    "auth.json"
                        | ".credentials.json"
                        | "credentials.json"
                        | "oauth.json"
                        | "oauth_creds.json"
                        | "refresh-recovery"
                )
            )
        })
}

fn read_bounded(path: &Path, remaining: &mut u64) -> io::Result<Vec<u8>> {
    if !fs::symlink_metadata(path)?.is_file() {
        return Err(invalid(
            "checkpoint requires a regular file; no symlink or special file is followed",
        ));
    }
    let mut bytes = Vec::new();
    fs::File::open(path)?
        .take(*remaining + 1)
        .read_to_end(&mut bytes)?;
    let length = u64::try_from(bytes.len()).map_err(|_| invalid("checkpoint too large"))?;
    if length > *remaining {
        return Err(invalid("checkpoint exceeds the 256 MiB budget"));
    }
    *remaining -= length;
    Ok(bytes)
}

fn copy_tree(
    source: &Path,
    relative: &Path,
    destination: &Path,
    manifest: &mut Manifest,
    remaining: &mut u64,
    deadline: Instant,
) -> io::Result<()> {
    if Instant::now() >= deadline
        || manifest.files.len() >= 10_000
        || relative.components().count() > 32
    {
        return Err(invalid("checkpoint exceeded its time/file/depth budget"));
    }
    if !safe_relative(relative) {
        manifest
            .excluded
            .push(relative.to_string_lossy().into_owned());
        return Ok(());
    }
    let metadata = fs::symlink_metadata(source)?;
    if metadata.file_type().is_symlink() {
        return Err(invalid("checkpoint refuses a symlink in recoverable state"));
    }
    if metadata.is_dir() {
        for entry in fs::read_dir(source)? {
            let entry = entry?;
            copy_tree(
                &entry.path(),
                &relative.join(entry.file_name()),
                destination,
                manifest,
                remaining,
                deadline,
            )?;
        }
    } else if metadata.is_file() {
        let bytes = read_bounded(source, remaining)?;
        write(&destination.join(relative), &bytes)?;
        manifest
            .files
            .insert(relative.to_string_lossy().into_owned(), hex(&bytes));
    } else {
        return Err(invalid("checkpoint refuses a special file"));
    }
    Ok(())
}

fn hex(bytes: &[u8]) -> String {
    hex::encode(Sha256::digest(bytes))
}

/// Logical token export avoids copying a concurrently modified mapped store.
/// Files are individually consistent; this is not a transaction across writers.
pub(super) fn capture(root: &Path, records: &[TokenRecord], secret: &str) -> io::Result<PathBuf> {
    let root = root.canonicalize()?;
    private_directory(&root.join(".state-backups"))?;
    let destination = root
        .join(".state-backups")
        .join(uuid::Uuid::new_v4().to_string());
    private_directory(&destination)?;
    let mut manifest = Manifest {
        schema: SCHEMA.into(),
        signing_secret_sha256: hex(secret.as_bytes()),
        files: BTreeMap::new(),
        excluded: Vec::new(),
    };
    let data = root.join("data");
    if fs::symlink_metadata(&data)?.file_type().is_symlink() {
        return Err(invalid("checkpoint data root is a symlink"));
    }
    let mut remaining = LIMIT;
    let deadline = Instant::now() + Duration::from_secs(10);
    for name in ["providers.lenv", "requests", "projects", "sessions"] {
        let source = data.join(name);
        if fs::symlink_metadata(&source).is_ok() {
            copy_tree(
                &source,
                Path::new(name),
                &destination,
                &mut manifest,
                &mut remaining,
                deadline,
            )?;
        }
    }
    let tokens = serde_json::to_vec(records)?;
    if tokens.len() as u64 > remaining {
        return Err(invalid("token checkpoint exceeds budget"));
    }
    remaining -= tokens.len() as u64;
    write(&destination.join("tokens.json"), &tokens)?;
    manifest.files.insert("tokens.json".into(), hex(&tokens));
    let store = TextTokenStore::open(destination.join("tokens.lino"))
        .map_err(|_| invalid("cannot prepare recoverable token projection"))?;
    for record in records {
        if Instant::now() >= deadline {
            return Err(invalid("token checkpoint exceeded its deadline"));
        }
        store
            .put(record.clone())
            .map_err(|_| invalid("cannot checkpoint token state"))?;
    }
    drop(store);
    if destination.join("tokens.lino").exists() {
        let bytes = read_bounded(&destination.join("tokens.lino"), &mut remaining)?;
        write(&destination.join("tokens.lino"), &bytes)?;
        manifest.files.insert("tokens.lino".into(), hex(&bytes));
    }
    manifest.excluded.extend(
        [
            "OAuth homes and OS credential stores",
            "refresh-recovery",
            "unregistered data paths",
            "concurrent changes after each file/export",
        ]
        .map(str::to_string),
    );
    write(
        &destination.join("manifest.json"),
        &serde_json::to_vec_pretty(&manifest)?,
    )?;
    Ok(destination)
}

/// Caller must establish that all writers are stopped. Validate every entry
/// before writing anything. Additive restore retains existing records/files.
pub(super) fn restore(root: &Path, snapshot: &Path, secret: &str, replace: bool) -> io::Result<()> {
    let root = root.canonicalize()?;
    if fs::symlink_metadata(snapshot)?.file_type().is_symlink() {
        return Err(invalid("checkpoint root is a symlink"));
    }
    let mut remaining = LIMIT;
    let manifest: Manifest = serde_json::from_slice(&read_bounded(
        &snapshot.join("manifest.json"),
        &mut remaining,
    )?)?;
    if manifest.schema != SCHEMA || manifest.signing_secret_sha256 != hex(secret.as_bytes()) {
        return Err(invalid(
            "checkpoint schema/signing secret mismatch; nothing restored",
        ));
    }
    if manifest.files.len() > 10_000 {
        return Err(invalid("checkpoint file budget exceeded"));
    }
    let mut files = BTreeMap::new();
    for (relative, expected) in &manifest.files {
        let path = Path::new(relative);
        if !safe_relative(path) {
            return Err(invalid("unsafe checkpoint path"));
        }
        let mut ancestor = snapshot.to_path_buf();
        for part in path.components() {
            ancestor.push(part);
            if fs::symlink_metadata(&ancestor)?.file_type().is_symlink() {
                return Err(invalid("checkpoint contains a symlink"));
            }
        }
        let bytes = read_bounded(&ancestor, &mut remaining)?;
        if hex(&bytes) != *expected {
            return Err(invalid("checkpoint checksum mismatch; nothing restored"));
        }
        files.insert(relative.clone(), bytes);
    }
    let records: Vec<TokenRecord> = serde_json::from_slice(
        files
            .get("tokens.json")
            .ok_or_else(|| invalid("checkpoint token export missing"))?,
    )?;
    let data = root.join("data");
    for relative in files
        .keys()
        .map(String::as_str)
        .chain(["tokens.bin", "tokens.lino"])
    {
        let mut ancestor = root.clone();
        for part in Path::new("data").join(relative).components() {
            ancestor.push(part);
            if fs::symlink_metadata(&ancestor)
                .is_ok_and(|metadata| metadata.file_type().is_symlink())
            {
                return Err(invalid("restore destination contains a symlink"));
            }
        }
    }
    let mut merged = BTreeMap::new();
    if !replace {
        let current = build_token_store_read_only(StoragePolicy::Both, &data)
            .map_err(|_| invalid("current token store cannot be read; nothing restored"))?;
        for record in current
            .list()
            .map_err(|_| invalid("current token inventory unavailable"))?
        {
            merged.insert(record.id.clone(), record);
        }
    }
    for record in records {
        merged.entry(record.id.clone()).or_insert(record);
    }
    let prepared = tempfile::tempdir()?;
    let store = build_token_store(StoragePolicy::Both, prepared.path())
        .map_err(|_| invalid("cannot prepare token restore"))?;
    for record in merged.into_values() {
        store
            .put(record)
            .map_err(|_| invalid("cannot prepare token restore"))?;
    }
    drop(store);
    // An empty text store is lazy: without replacing its projection, Both
    // would import old text records into the restored empty binary store.
    let projection = prepared.path().join("tokens.lino");
    if !projection.exists() {
        write(&projection, b"")?;
    }
    for (relative, bytes) in files {
        if !relative.starts_with("tokens.") && (replace || !data.join(&relative).exists()) {
            write(&data.join(relative), &bytes)?;
        }
    }
    for name in ["tokens.lino", "tokens.bin"] {
        let path = prepared.path().join(name);
        if path.exists() {
            write(&data.join(name), &read_bounded(&path, &mut remaining)?)?;
        }
    }
    Ok(())
}

impl super::Coordinator<'_> {
    pub(super) fn restore_state(
        &self,
        snapshot: &Path,
        replace: bool,
        host: &dyn super::host_runtime::HostRuntime,
    ) -> Result<(), String> {
        self.docker.available()?;
        if self
            .state
            .host()?
            .is_some_and(|record| host.serving(record.pid, Path::new(&record.executable)))
        {
            return Err("restore refuses a serving host writer; stop it explicitly first".into());
        }
        let writers = self.docker.output(&[
            "ps".into(),
            "--filter".into(),
            format!("label={}.root={}", super::LABEL_KEY, self.root.display()),
            "--format".into(),
            "{{.Names}}".into(),
        ])?;
        if !writers.trim().is_empty()
            || (self.docker.exists(super::LEGACY)
                && self.docker.legacy_owned(super::LEGACY, self.root)
                && self.docker.running(super::LEGACY)?)
        {
            return Err("restore refuses serving container writers; stop only this deployment explicitly first".into());
        }
        self.create_directories()?;
        let _lock = self.acquire_lock()?;
        if self
            .state
            .transaction()?
            .is_some_and(|transaction| transaction.phase != super::Phase::Complete)
        {
            return Err("restore refuses pending deployment work; no recovery attempted".into());
        }
        let current = build_token_store_read_only(StoragePolicy::Both, &self.root.join("data"))
            .map_err(|_| "current token inventory cannot be backed up")?;
        let records = current
            .list()
            .map_err(|_| "current token inventory cannot be backed up")?;
        let previous = capture(self.root, &records, self.token_secret)
            .map_err(|_| "pre-restore checkpoint failed; nothing restored")?;
        restore(self.root, snapshot, self.token_secret, replace).map_err(|error| {
            format!(
                "state restore failed: {error}; pre-restore checkpoint retained at {}",
                previous.display()
            )
        })?;
        println!(
            "{}",
            serde_json::json!({"schema":"link-assistant-router/preservation/v1","status":"data-restored","mode":if replace {"replace"} else {"additive"},"previous_checkpoint":previous,"oauth_restored":false,"global_atomic_snapshot":false})
        );
        Ok(())
    }
}

#[cfg(test)]
#[path = "data_backup_tests.rs"]
mod tests;
