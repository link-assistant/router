//! Verified directory backups and merge-first profile restore.

use std::collections::BTreeSet;
use std::fs::{self, File};
use std::io::Read;
#[cfg(unix)]
use std::os::unix::fs::FileTypeExt as _;
use std::path::{Path, PathBuf};
use std::process::ExitCode;

use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

use super::{
    Profile, Store, backup_root, clients, failed, lock_operations, owner_directory, profiles,
    refuse_active,
};
use crate::cli::{BackupOp, ProfileSelection};
use crate::clients::ClientKind;

mod restore;

#[derive(Clone, Debug, Serialize, Deserialize)]
struct Entry {
    client: String,
    scope: String,
    store: String,
    path: String,
    kind: String,
    size: u64,
    sha256: Option<String>,
    link: Option<String>,
    #[serde(default)]
    backup_link: Option<String>,
    mode: Option<u32>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
struct StoreRecord {
    client: String,
    scope: String,
    store: String,
    source: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct Manifest {
    version: u32,
    id: String,
    created: String,
    credentials_included: bool,
    stores: Vec<StoreRecord>,
    entries: Vec<Entry>,
    unavailable: Vec<String>,
    omitted_credentials: usize,
}

fn component(value: &str) -> bool {
    !value.is_empty()
        && !value.contains(['/', '\\', ':'])
        && Path::new(value).components().count() == 1
        && matches!(
            Path::new(value).components().next(),
            Some(std::path::Component::Normal(_))
        )
}

fn digest(path: &Path) -> Result<String, String> {
    let mut file =
        File::open(path).map_err(|error| format!("cannot read file for verification: {error}"))?;
    let mut hash = Sha256::new();
    let mut buffer = [0u8; 16 * 1024];
    loop {
        let count = file
            .read(&mut buffer)
            .map_err(|error| format!("cannot hash file: {error}"))?;
        if count == 0 {
            break;
        }
        hash.update(&buffer[..count]);
    }
    Ok(hex::encode(hash.finalize()))
}

pub(super) fn tree_digest(path: &Path) -> Result<String, String> {
    fn add(path: &Path, hash: &mut Sha256) -> Result<(), String> {
        let metadata = fs::symlink_metadata(path).map_err(|error| error.to_string())?;
        #[cfg(unix)]
        if metadata.file_type().is_socket() {
            return Ok(());
        }
        if let Some(mode) = mode(path)? {
            hash.update(mode.to_le_bytes());
        }
        if metadata.is_file() {
            hash.update(b"file");
            hash.update(digest(path)?.as_bytes());
        } else if metadata.file_type().is_symlink() {
            hash.update(b"link");
            hash.update(
                fs::read_link(path)
                    .map_err(|error| error.to_string())?
                    .as_os_str()
                    .as_encoded_bytes(),
            );
        } else if metadata.is_dir() {
            hash.update(b"dir");
            let mut entries = fs::read_dir(path)
                .map_err(|error| error.to_string())?
                .collect::<Result<Vec<_>, _>>()
                .map_err(|error| error.to_string())?;
            entries.sort_by_key(std::fs::DirEntry::file_name);
            for entry in entries {
                hash.update(entry.file_name().as_encoded_bytes());
                add(&entry.path(), hash)?;
            }
        } else {
            return Err("unsupported profile entry changed during operation".to_string());
        }
        Ok(())
    }
    let mut hash = Sha256::new();
    add(path, &mut hash)?;
    Ok(hex::encode(hash.finalize()))
}

fn mode(path: &Path) -> Result<Option<u32>, String> {
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt as _;
        Ok(Some(
            fs::symlink_metadata(path)
                .map_err(|error| error.to_string())?
                .permissions()
                .mode()
                & 0o7777,
        ))
    }
    #[cfg(not(unix))]
    {
        let _ = path;
        Ok(None)
    }
}

fn set_mode(path: &Path, value: Option<u32>) -> Result<(), String> {
    #[cfg(unix)]
    if let Some(value) = value {
        use std::os::unix::fs::PermissionsExt as _;
        fs::set_permissions(path, fs::Permissions::from_mode(value))
            .map_err(|error| format!("cannot preserve file permissions: {error}"))?;
    }
    #[cfg(not(unix))]
    {
        let _ = (path, value);
    }
    Ok(())
}

fn is_credential(path: &Path) -> bool {
    let name = path
        .file_name()
        .map(|name| name.to_string_lossy().to_ascii_lowercase())
        .unwrap_or_default();
    name == ".claude.json"
        || name == "auth.json"
        || name == "oauth_creds.json"
        || name == ".credentials.json"
        || name == "credentials.json"
        || name == ".env"
        || name.contains("secret")
        || name.contains("token")
        || name.contains("keychain")
}

fn is_disposable(path: &Path) -> bool {
    path.components().any(|component| {
        let name = component.as_os_str().to_string_lossy();
        matches!(
            name.as_ref(),
            "cache" | "Cache" | "CachedData" | "node_modules"
        )
    })
}

fn copy_file(source: &Path, destination: &Path) -> Result<(), String> {
    reflink_copy::reflink_or_copy(source, destination)
        .map_err(|error| format!("cannot copy profile file: {error}"))?;
    set_mode(destination, mode(source)?)
}

fn copy_link(source: &Path, destination: &Path, root: &Path) -> Result<String, String> {
    let target = fs::read_link(source).map_err(|error| format!("cannot read symlink: {error}"))?;
    let resolved = if target.is_absolute() {
        target.clone()
    } else {
        source
            .parent()
            .ok_or("symlink has no parent")?
            .join(&target)
    };
    let canonical_root =
        fs::canonicalize(root).map_err(|error| format!("cannot resolve profile root: {error}"))?;
    let canonical_target = fs::canonicalize(resolved)
        .map_err(|_| "dangling symlink in profile; repair it before backup".to_string())?;
    if !canonical_target.starts_with(canonical_root) {
        return Err("symlink escapes the selected profile; backup refused".to_string());
    }
    #[cfg(unix)]
    std::os::unix::fs::symlink(&target, destination)
        .map_err(|error| format!("cannot preserve symlink: {error}"))?;
    #[cfg(windows)]
    {
        if canonical_target.is_dir() {
            std::os::windows::fs::symlink_dir(&target, destination)
        } else {
            std::os::windows::fs::symlink_file(&target, destination)
        }
        .map_err(|error| format!("cannot preserve symlink: {error}"))?;
    }
    Ok(target.to_string_lossy().into_owned())
}

#[allow(clippy::too_many_arguments)]
fn walk(
    source: &Path,
    root: &Path,
    destination: &Path,
    client: &str,
    scope: &str,
    store: &str,
    include_credentials: bool,
    entries: &mut Vec<Entry>,
    omitted: &mut usize,
    estimate_only: bool,
) -> Result<u64, String> {
    let metadata = fs::symlink_metadata(source)
        .map_err(|error| format!("cannot inspect profile entry: {error}"))?;
    let relative = source
        .strip_prefix(root)
        .map_err(|error| error.to_string())?;
    let relative_text = relative
        .to_str()
        .ok_or("non-UTF-8 profile path is unsupported")?
        .replace('\\', "/");
    if is_disposable(relative) {
        return Ok(0);
    }
    if metadata.is_file()
        && is_credential(if relative.as_os_str().is_empty() {
            source
        } else {
            relative
        })
        && !include_credentials
    {
        *omitted += 1;
        return Ok(0);
    }
    #[cfg(unix)]
    if metadata.file_type().is_socket() {
        return Ok(0);
    }
    if metadata.is_file()
        && (relative_text.ends_with("-wal")
            || relative_text.ends_with("-shm")
            || relative_text.ends_with("-journal"))
    {
        return Err(
            "live SQLite sidecar found; close the client or checkpoint its database before backup"
                .to_string(),
        );
    }
    let output = destination.join(relative);
    let kind = if metadata.is_dir() {
        "directory"
    } else if metadata.is_file() {
        "file"
    } else if metadata.file_type().is_symlink() {
        "symlink"
    } else {
        return Err("unsupported profile entry type; backup refused".to_string());
    };
    let mut entry = Entry {
        client: client.into(),
        scope: scope.into(),
        store: store.into(),
        path: relative_text,
        kind: kind.into(),
        size: if kind == "file" { metadata.len() } else { 0 },
        sha256: None,
        link: None,
        backup_link: None,
        mode: mode(source)?,
    };
    let entry_mode = entry.mode;
    if !estimate_only {
        if kind == "directory" {
            fs::create_dir_all(&output)
                .map_err(|error| format!("cannot create backup directory: {error}"))?;
        } else if kind == "file" {
            if let Some(parent) = output.parent() {
                fs::create_dir_all(parent).map_err(|error| error.to_string())?;
            }
            let before = digest(source)?;
            copy_file(source, &output)?;
            let after = digest(source)?;
            if before != after
                || digest(&output)? != after
                || fs::metadata(source)
                    .map_err(|error| error.to_string())?
                    .len()
                    != metadata.len()
            {
                return Err("profile changed while copying; close the client and retry".to_string());
            }
            entry.sha256 = Some(after);
        } else {
            if let Some(parent) = output.parent() {
                fs::create_dir_all(parent).map_err(|error| error.to_string())?;
            }
            let original = copy_link(source, &output, root)?;
            let mut archived = original.clone();
            let target = Path::new(&original);
            if target.is_absolute() {
                let target_relative = target
                    .strip_prefix(root)
                    .map_err(|_| "absolute symlink escapes the profile root".to_string())?;
                if target_relative
                    .components()
                    .any(|part| !matches!(part, std::path::Component::Normal(_)))
                {
                    return Err("unsafe absolute profile symlink".to_string());
                }
                let mut relative_link = PathBuf::new();
                for _ in relative
                    .parent()
                    .unwrap_or_else(|| Path::new(""))
                    .components()
                {
                    relative_link.push("..");
                }
                relative_link.push(target_relative);
                fs::remove_file(&output).map_err(|error| error.to_string())?;
                #[cfg(unix)]
                std::os::unix::fs::symlink(&relative_link, &output)
                    .map_err(|error| error.to_string())?;
                #[cfg(windows)]
                {
                    if fs::canonicalize(source)
                        .map_err(|error| error.to_string())?
                        .is_dir()
                    {
                        std::os::windows::fs::symlink_dir(&relative_link, &output)
                    } else {
                        std::os::windows::fs::symlink_file(&relative_link, &output)
                    }
                    .map_err(|error| error.to_string())?;
                }
                archived = relative_link.to_string_lossy().into_owned();
            }
            entry.link = Some(original);
            entry.backup_link = Some(archived);
        }
        entries.push(entry);
    }
    let mut total = if kind == "file" { metadata.len() } else { 0 };
    if kind == "directory" {
        let mut children = fs::read_dir(source)
            .map_err(|error| format!("cannot list profile directory: {error}"))?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|error| format!("cannot read profile directory: {error}"))?;
        children.sort_by_key(std::fs::DirEntry::file_name);
        for child in children {
            total += walk(
                &child.path(),
                root,
                destination,
                client,
                scope,
                store,
                include_credentials,
                entries,
                omitted,
                estimate_only,
            )?;
        }
        if !estimate_only {
            set_mode(&output, entry_mode)?;
        }
    }
    Ok(total)
}

pub fn create_unlocked(
    root: &Path,
    home: Option<&Path>,
    chosen: &[Profile],
    include_credentials: bool,
) -> Result<String, String> {
    owner_directory(root)?;
    let archive_root = fs::canonicalize(root)
        .map_err(|error| format!("cannot resolve backup destination: {error}"))?;
    let id = uuid::Uuid::new_v4().simple().to_string();
    let temporary = root.join(format!(".incomplete-{id}"));
    let final_path = root.join(&id);
    let mut manifest = Manifest {
        version: 1,
        id: id.clone(),
        created: chrono::Utc::now().to_rfc3339(),
        credentials_included: include_credentials,
        stores: Vec::new(),
        entries: Vec::new(),
        unavailable: Vec::new(),
        omitted_credentials: 0,
    };
    let mut total = 0u64;
    for profile in chosen {
        refuse_active(profile, home)?;
        for store in &profile.stores {
            if !store.path.exists() {
                manifest.unavailable.push(format!(
                    "{}:{}:{}",
                    profile.client, profile.scope, store.name
                ));
                continue;
            }
            if fs::symlink_metadata(&store.path)
                .map_err(|error| error.to_string())?
                .file_type()
                .is_symlink()
            {
                return Err(format!(
                    "{} {} profile root is a symlink; select its real path explicitly",
                    profile.client, profile.scope
                ));
            }
            let profile_root = fs::canonicalize(&store.path)
                .map_err(|error| format!("cannot resolve selected profile: {error}"))?;
            if archive_root.starts_with(&profile_root) {
                return Err(
                    "backup destination is inside a selected profile; choose another directory"
                        .to_string(),
                );
            }
            total += walk(
                &store.path,
                &store.path,
                Path::new(""),
                profile.client.canonical_name(),
                profile.scope,
                &store.name,
                include_credentials,
                &mut Vec::new(),
                &mut 0,
                true,
            )?;
        }
    }
    if chosen
        .iter()
        .all(|profile| profile.stores.iter().all(|store| !store.path.exists()))
    {
        return Err("no selected client profile store exists".to_string());
    }
    let free = fs2::available_space(root)
        .map_err(|error| format!("cannot check destination free space: {error}"))?;
    eprintln!("backup requires {total} bytes; destination has {free} bytes free");
    if free < total.saturating_add(1024 * 1024) {
        return Err("backup destination lacks free space; no backup was written".to_string());
    }
    owner_directory(&temporary)?;
    let result = (|| {
        for profile in chosen {
            for store in &profile.stores {
                if !store.path.exists() {
                    continue;
                }
                let client = profile.client.canonical_name();
                let destination = temporary
                    .join("data")
                    .join(client)
                    .join(profile.scope)
                    .join(&store.name);
                let before = tree_digest(&store.path)?;
                let before_entries = manifest.entries.len();
                walk(
                    &store.path,
                    &store.path,
                    &destination,
                    client,
                    profile.scope,
                    &store.name,
                    include_credentials,
                    &mut manifest.entries,
                    &mut manifest.omitted_credentials,
                    false,
                )?;
                if tree_digest(&store.path)? != before {
                    return Err("profile changed during backup; close the client and retry".into());
                }
                if manifest.entries.len() == before_entries {
                    continue;
                }
                manifest.stores.push(StoreRecord {
                    client: client.into(),
                    scope: profile.scope.into(),
                    store: store.name.clone(),
                    source: store.path.to_string_lossy().into_owned(),
                });
            }
        }
        if manifest.stores.is_empty() {
            return Err("selected profile stores disappeared during backup".to_string());
        }
        let bytes = serde_json::to_vec_pretty(&manifest).map_err(|error| error.to_string())?;
        crate::durable_file::atomic_write_owner_only(&temporary.join("manifest.json"), &bytes)
            .map_err(|error| format!("cannot save backup manifest: {error}"))?;
        crate::durable_file::atomic_write_owner_only(
            &temporary.join("manifest.sha256"),
            hex::encode(Sha256::digest(&bytes)).as_bytes(),
        )
        .map_err(|error| format!("cannot save backup checksum: {error}"))?;
        verify_path(&temporary)?;
        fs::rename(&temporary, &final_path)
            .map_err(|error| format!("cannot complete backup: {error}"))?;
        Ok::<(), String>(())
    })();
    if result.is_err() {
        let _ = fs::remove_dir_all(&temporary);
    }
    result?;
    for unavailable in &manifest.unavailable {
        eprintln!("unavailable profile store: {unavailable}");
    }
    if manifest.omitted_credentials > 0 {
        eprintln!(
            "omitted {} credential entries; --include-credentials creates an unencrypted private local backup",
            manifest.omitted_credentials
        );
    }
    Ok(id)
}

fn validate_id(id: &str) -> Result<(), String> {
    if id.len() == 32 && id.bytes().all(|byte| byte.is_ascii_hexdigit()) {
        Ok(())
    } else {
        Err("invalid backup ID".to_string())
    }
}

fn load(root: &Path, id: &str) -> Result<(PathBuf, Manifest), String> {
    validate_id(id)?;
    let path = root.join(id);
    let manifest = verify_path(&path)?;
    if manifest.id != id {
        return Err("backup ID does not match its manifest".to_string());
    }
    Ok((path, manifest))
}

fn verify_path(path: &Path) -> Result<Manifest, String> {
    let bytes = fs::read(path.join("manifest.json"))
        .map_err(|_| "backup is incomplete or missing its manifest".to_string())?;
    let checksum = fs::read_to_string(path.join("manifest.sha256"))
        .map_err(|_| "backup is incomplete or missing its manifest checksum".to_string())?;
    if hex::encode(Sha256::digest(&bytes)) != checksum {
        return Err("backup manifest checksum mismatch".to_string());
    }
    let manifest: Manifest = serde_json::from_slice(&bytes)
        .map_err(|error| format!("invalid backup manifest: {error}"))?;
    if manifest.version != 1 {
        return Err("unsupported backup format".to_string());
    }
    let mut known = BTreeSet::new();
    for store in &manifest.stores {
        if ClientKind::from_str_opt(&store.client).is_none()
            || !matches!(store.scope.as_str(), "normal" | "router")
            || !component(&store.store)
            || !known.insert((&store.client, &store.scope, &store.store))
        {
            return Err("invalid backup store inventory".to_string());
        }
    }
    let mut expected = BTreeSet::new();
    for entry in &manifest.entries {
        if !known.contains(&(&entry.client, &entry.scope, &entry.store)) {
            return Err("backup entry refers to an unknown store".to_string());
        }
        let path_part = Path::new(&entry.path);
        if entry.path.contains(['\\', ':'])
            || path_part.is_absolute()
            || path_part
                .components()
                .any(|part| !matches!(part, std::path::Component::Normal(_)))
        {
            return Err("unsafe backup manifest path".to_string());
        }
        let entry_path = path
            .join("data")
            .join(&entry.client)
            .join(&entry.scope)
            .join(&entry.store)
            .join(path_part);
        let metadata = fs::symlink_metadata(&entry_path)
            .map_err(|_| "backup inventory is missing an entry".to_string())?;
        let kind = if metadata.is_file() {
            "file"
        } else if metadata.is_dir() {
            "directory"
        } else if metadata.file_type().is_symlink() {
            "symlink"
        } else {
            "unsupported"
        };
        if kind != entry.kind
            || (kind == "file" && metadata.len() != entry.size)
            || mode(&entry_path)? != entry.mode
        {
            return Err("backup inventory or permissions mismatch".to_string());
        }
        if kind == "file" && entry.sha256.as_deref() != Some(digest(&entry_path)?.as_str()) {
            return Err("backup file checksum mismatch".to_string());
        }
        if kind == "symlink"
            && fs::read_link(&entry_path)
                .map_err(|error| error.to_string())?
                .to_string_lossy()
                != entry
                    .backup_link
                    .as_deref()
                    .or(entry.link.as_deref())
                    .unwrap_or("")
        {
            return Err("backup symlink mismatch".to_string());
        }
        if kind == "symlink" {
            let resolved = fs::canonicalize(&entry_path)
                .map_err(|_| "backed-up symlink target is unavailable".to_string())?;
            let store_root = fs::canonicalize(
                path.join("data")
                    .join(&entry.client)
                    .join(&entry.scope)
                    .join(&entry.store),
            )
            .map_err(|error| error.to_string())?;
            if !resolved.starts_with(store_root) {
                return Err("backed-up symlink escapes its store".to_string());
            }
        }
        if !expected.insert(entry_path) {
            return Err("duplicate backup inventory entry".to_string());
        }
    }
    let data = path.join("data");
    if data.exists() {
        fn visit(path: &Path, found: &mut BTreeSet<PathBuf>) -> Result<(), String> {
            for item in fs::read_dir(path).map_err(|error| error.to_string())? {
                let item = item.map_err(|error| error.to_string())?;
                let item_path = item.path();
                found.insert(item_path.clone());
                if item
                    .file_type()
                    .map_err(|error| error.to_string())?
                    .is_dir()
                {
                    visit(&item_path, found)?;
                }
            }
            Ok(())
        }
        let mut found = BTreeSet::new();
        visit(&data, &mut found)?;
        found.retain(|path| {
            path.strip_prefix(&data)
                .map_or(true, |relative| relative.components().count() >= 3)
        });
        if found != expected {
            return Err("backup exact inventory mismatch".to_string());
        }
    }
    if let Some(sample) = manifest.entries.iter().find(|entry| entry.kind == "file") {
        let source = path
            .join("data")
            .join(&sample.client)
            .join(&sample.scope)
            .join(&sample.store)
            .join(&sample.path);
        let temporary = tempfile::tempdir().map_err(|error| error.to_string())?;
        let restored = temporary.path().join("sample");
        copy_file(&source, &restored)?;
        if digest(&restored)? != sample.sha256.as_deref().unwrap_or("") {
            return Err("sample restore checksum mismatch".to_string());
        }
    }
    Ok(manifest)
}

#[must_use]
pub fn run(home: Option<&Path>, op: &BackupOp) -> ExitCode {
    let result = match op {
        BackupOp::Create {
            selection,
            destination,
            include_credentials,
        } => {
            let root = backup_root(home, destination.as_deref());
            root.and_then(|root| {
                let _lock = lock_operations(&root)?;
                let mut chosen = Vec::new();
                for client in clients(selection) {
                    chosen.extend(profiles(home, client, selection.profile)?);
                }
                let id = create_unlocked(&root, home, &chosen, *include_credentials)?;
                println!("{id}");
                Ok(())
            })
        }
        BackupOp::List { json, destination } => {
            backup_root(home, destination.as_deref()).and_then(|root| {
                let mut rows = Vec::new();
                if root.exists() {
                    for item in fs::read_dir(&root).map_err(|error| error.to_string())? {
                        let item = item.map_err(|error| error.to_string())?;
                        let id = item.file_name().to_string_lossy().into_owned();
                        if validate_id(&id).is_ok() && item.path().join("manifest.sha256").exists()
                        {
                            rows.push(id);
                        }
                    }
                }
                rows.sort();
                if *json {
                    println!(
                        "{}",
                        serde_json::to_string(&rows).map_err(|error| error.to_string())?
                    );
                } else {
                    for row in rows {
                        println!("{row}");
                    }
                }
                Ok(())
            })
        }
        BackupOp::Verify { id, destination } => {
            backup_root(home, destination.as_deref()).and_then(|root| {
                load(&root, id)?;
                println!("verified {id}");
                Ok(())
            })
        }
        BackupOp::Restore {
            id,
            client,
            merge: _,
            overwrite,
            dry_run,
            yes,
            destination,
        } => backup_root(home, destination.as_deref())
            .and_then(|root| restore::run(&root, home, id, *client, *overwrite, *dry_run, *yes)),
    };
    match result {
        Ok(()) => ExitCode::SUCCESS,
        Err(error) => failed(error),
    }
}
