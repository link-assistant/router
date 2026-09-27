//! Transactional merge-first restore of a verified client backup.

use super::{
    ClientKind, Entry, Path, PathBuf, Profile, ProfileSelection, Sha256, Store, StoreRecord,
    copy_file, copy_link, create_unlocked, digest, fs, is_credential, load, lock_operations, mode,
    profiles, refuse_active, set_mode, tree_digest,
};
use sha2::Digest as _;

fn restore_link(
    _source: &Path,
    original_link: &str,
    destination: &Path,
    stage: &Path,
    original_root: &Path,
    live_root: &Path,
) -> Result<(), String> {
    let target = PathBuf::from(original_link);
    #[cfg(windows)]
    let original_target = target.clone();
    let replacement = if target.is_absolute() {
        let relative = target
            .strip_prefix(original_root)
            .map_err(|_| "absolute backed-up symlink escapes its original profile".to_string())?;
        if relative
            .components()
            .any(|part| !matches!(part, std::path::Component::Normal(_)))
        {
            return Err("unsafe absolute symlink target".to_string());
        }
        live_root.join(relative)
    } else {
        let parent = destination.parent().ok_or("symlink has no parent")?;
        let relative_parent = parent
            .strip_prefix(stage)
            .map_err(|_| "symlink escapes staged profile")?;
        let mut depth = relative_parent.components().count();
        for part in target.components() {
            match part {
                std::path::Component::ParentDir if depth > 0 => depth -= 1,
                std::path::Component::ParentDir => {
                    return Err("restored symlink would escape the profile".to_string());
                }
                std::path::Component::Normal(_) => depth += 1,
                std::path::Component::CurDir => (),
                _ => return Err("unsafe symlink target".to_string()),
            }
        }
        target
    };
    #[cfg(unix)]
    std::os::unix::fs::symlink(&replacement, destination).map_err(|error| error.to_string())?;
    #[cfg(windows)]
    {
        let archived_target = if original_target.is_absolute() {
            let link_relative = destination
                .strip_prefix(stage)
                .map_err(|_| "unsafe symlink location")?;
            let archive_root = _source
                .ancestors()
                .nth(link_relative.components().count())
                .ok_or("unsafe archive symlink location")?;
            archive_root.join(
                original_target
                    .strip_prefix(original_root)
                    .map_err(|_| "unsafe symlink target")?,
            )
        } else {
            _source
                .parent()
                .ok_or("symlink has no parent")?
                .join(&original_target)
        };
        if archived_target.is_dir() {
            std::os::windows::fs::symlink_dir(&replacement, destination)
        } else {
            std::os::windows::fs::symlink_file(&replacement, destination)
        }
        .map_err(|error| error.to_string())?;
    }
    Ok(())
}

fn copy_existing(source: &Path, destination: &Path, root: &Path) -> Result<(), String> {
    let metadata = fs::symlink_metadata(source).map_err(|error| error.to_string())?;
    if metadata.is_dir() {
        fs::create_dir(destination).map_err(|error| error.to_string())?;
        for item in fs::read_dir(source).map_err(|error| error.to_string())? {
            let item = item.map_err(|error| error.to_string())?;
            copy_existing(&item.path(), &destination.join(item.file_name()), root)?;
        }
        set_mode(destination, mode(source)?)?;
    } else if metadata.is_file() {
        let before = digest(source)?;
        copy_file(source, destination)?;
        if digest(source)? != before || digest(destination)? != before {
            return Err("live profile changed while staging restore".to_string());
        }
    } else if metadata.file_type().is_symlink() {
        copy_link(source, destination, root)?;
    } else {
        return Err("unsupported entry in live profile".to_string());
    }
    Ok(())
}

fn remove_any(path: &Path) -> Result<(), String> {
    let Ok(metadata) = fs::symlink_metadata(path) else {
        return Ok(());
    };
    if metadata.is_dir() {
        fs::remove_dir_all(path)
    } else {
        fs::remove_file(path)
    }
    .map_err(|error| error.to_string())
}

fn present(path: &Path) -> bool {
    fs::symlink_metadata(path).is_ok()
}

fn rollback_committed(committed: &[(PathBuf, PathBuf, bool)]) -> Vec<String> {
    let mut errors = Vec::new();
    for (target, previous, existed) in committed.iter().rev() {
        if let Err(error) = remove_any(target) {
            errors.push(format!("{}: {error}", target.display()));
            continue;
        }
        if *existed && let Err(error) = fs::rename(previous, target) {
            errors.push(format!("{}: {error}", target.display()));
        }
    }
    errors
}

fn restore_error(error: &std::io::Error, rollback_errors: &[String]) -> String {
    if rollback_errors.is_empty() {
        format!("restore rolled back after failure: {error}")
    } else {
        format!(
            "restore failed: {error}; rollback incomplete ({}); inspect the .router-restore-old-* paths and recovery backup",
            rollback_errors.join("; ")
        )
    }
}

fn entry_matches(path: &Path, entry: &Entry, original_root: &Path, live_root: &Path) -> bool {
    let Ok(metadata) = fs::symlink_metadata(path) else {
        return false;
    };
    match entry.kind.as_str() {
        "file" if metadata.is_file() => digest(path).ok().as_deref() == entry.sha256.as_deref(),
        "symlink" if metadata.file_type().is_symlink() => {
            let Some(link) = entry.link.as_deref() else {
                return false;
            };
            let target = Path::new(link);
            let expected = if target.is_absolute() {
                let Ok(relative) = target.strip_prefix(original_root) else {
                    return false;
                };
                live_root.join(relative)
            } else {
                target.to_path_buf()
            };
            fs::read_link(path).is_ok_and(|actual| actual == expected)
        }
        _ => false,
    }
}

fn conflict_suffix(entry: &Entry) -> Result<String, String> {
    if entry.kind == "file" {
        return Ok(entry.sha256.as_deref().ok_or("file has no digest")?[..8].into());
    }
    let link = entry.link.as_deref().ok_or("link has no target")?;
    Ok(hex::encode(Sha256::digest(link.as_bytes()))[..8].into())
}

fn validate_links(path: &Path, stage: &Path, live: &Path) -> Result<(), String> {
    let metadata = fs::symlink_metadata(path).map_err(|error| error.to_string())?;
    if metadata.file_type().is_symlink() {
        let target = fs::read_link(path).map_err(|error| error.to_string())?;
        let canonical_live = fs::canonicalize(live).ok();
        if target.is_absolute() {
            let within_live = target.starts_with(live)
                || canonical_live.as_ref().is_some_and(|root| {
                    fs::canonicalize(&target).is_ok_and(|resolved| resolved.starts_with(root))
                });
            if !within_live
                || target
                    .components()
                    .any(|part| matches!(part, std::path::Component::ParentDir))
            {
                return Err("staged absolute symlink escapes the selected profile".to_string());
            }
        } else {
            let resolved = fs::canonicalize(path)
                .map_err(|_| "staged symlink target is missing".to_string())?;
            let canonical_stage =
                fs::canonicalize(stage).map_err(|_| "staged profile is missing".to_string())?;
            if !resolved.starts_with(canonical_stage)
                && !canonical_live
                    .as_ref()
                    .is_some_and(|root| resolved.starts_with(root))
            {
                return Err("staged symlink escapes the selected profile".to_string());
            }
        }
    } else if metadata.is_dir() {
        for item in fs::read_dir(path).map_err(|error| error.to_string())? {
            validate_links(
                &item.map_err(|error| error.to_string())?.path(),
                stage,
                live,
            )?;
        }
    }
    Ok(())
}

pub(super) fn run(
    root: &Path,
    home: Option<&Path>,
    id: &str,
    filter: Option<ClientKind>,
    overwrite: bool,
    dry_run: bool,
    yes: bool,
) -> Result<(), String> {
    let _lock = if dry_run {
        None
    } else {
        Some(lock_operations(root)?)
    };
    let (backup_path, manifest) = load(root, id)?;
    let mut targets = Vec::<(StoreRecord, PathBuf)>::new();
    for record in &manifest.stores {
        if let Some(filter) = filter
            && record.client != filter.canonical_name()
        {
            continue;
        }
        let client = ClientKind::from_str_opt(&record.client).ok_or("unknown client in backup")?;
        refuse_active(client, home)?;
        let selection = if record.scope == "router" {
            ProfileSelection::Router
        } else {
            ProfileSelection::Normal
        };
        let current = profiles(home, client, selection)?;
        let store = current[0]
            .stores
            .iter()
            .find(|store| store.name == record.store)
            .ok_or("profile store no longer exists in client inventory")?;
        if fs::symlink_metadata(&store.path).is_ok_and(|metadata| metadata.file_type().is_symlink())
        {
            return Err("live profile root is a symlink; restore refused".to_string());
        }
        targets.push((record.clone(), store.path.clone()));
    }
    if targets.is_empty() {
        return Err("backup contains no matching client profile".to_string());
    }
    let mut changes = Vec::new();
    for (record, target) in &targets {
        for entry in manifest.entries.iter().filter(|entry| {
            entry.client == record.client
                && entry.scope == record.scope
                && entry.store == record.store
                && entry.kind != "directory"
        }) {
            let candidate = target.join(&entry.path);
            if !entry_matches(&candidate, entry, Path::new(&record.source), target) {
                changes.push((candidate, entry));
            }
        }
    }
    if dry_run {
        for (path, entry) in &changes {
            let action = if present(path) {
                if overwrite { "overwrite" } else { "keep both" }
            } else {
                "add"
            };
            println!(
                "{action}: {}",
                if is_credential(if entry.path.is_empty() {
                    path
                } else {
                    Path::new(&entry.path)
                }) {
                    "<credential>".into()
                } else {
                    path.display().to_string()
                }
            );
        }
        return Ok(());
    }
    if overwrite && !yes {
        return Err("overwrite requires --yes after reviewing --dry-run".to_string());
    }
    if overwrite {
        let selected = targets
            .iter()
            .map(|(record, path)| Profile {
                client: ClientKind::from_str_opt(&record.client).expect("validated"),
                scope: if record.scope == "router" {
                    "router"
                } else {
                    "normal"
                },
                stores: vec![Store {
                    name: record.store.clone(),
                    path: path.clone(),
                }],
            })
            .collect::<Vec<_>>();
        let recovery = create_unlocked(root, home, &selected, true)?;
        eprintln!("verified recovery backup: {recovery}");
    }
    let stamps = targets
        .iter()
        .map(|(_, target)| {
            if present(target) {
                Ok((target.clone(), Some(tree_digest(target)?)))
            } else {
                Ok((target.clone(), None))
            }
        })
        .collect::<Result<Vec<_>, String>>()?;
    let mut stages = Vec::<(PathBuf, PathBuf, PathBuf)>::new();
    let tx = uuid::Uuid::new_v4().simple().to_string();
    let preparation = (|| {
        for (record, target) in &targets {
            let parent = target.parent().ok_or("profile store has no parent")?;
            fs::create_dir_all(parent).map_err(|error| error.to_string())?;
            let name = target
                .file_name()
                .ok_or("profile store has no name")?
                .to_string_lossy();
            let stage = parent.join(format!(".{name}.router-restore-stage-{tx}"));
            let previous = parent.join(format!(".{name}.router-restore-old-{tx}"));
            stages.push((target.clone(), stage.clone(), previous));
            let root_is_file = manifest.entries.iter().any(|entry| {
                entry.client == record.client
                    && entry.scope == record.scope
                    && entry.store == record.store
                    && entry.path.is_empty()
                    && entry.kind == "file"
            });
            if target.exists() {
                copy_existing(target, &stage, target)?;
            } else if !root_is_file {
                fs::create_dir(&stage).map_err(|error| error.to_string())?;
            }
            for entry in manifest.entries.iter().filter(|entry| {
                entry.client == record.client
                    && entry.scope == record.scope
                    && entry.store == record.store
            }) {
                let source = backup_path
                    .join("data")
                    .join(&entry.client)
                    .join(&entry.scope)
                    .join(&entry.store)
                    .join(&entry.path);
                let destination = stage.join(&entry.path);
                if entry.kind == "directory" {
                    fs::create_dir_all(&destination).map_err(|error| error.to_string())?;
                    continue;
                }
                if entry.path.is_empty()
                    && present(&destination)
                    && !overwrite
                    && !entry_matches(&destination, entry, Path::new(&record.source), target)
                {
                    return Err(
                        "root file conflict: review --dry-run and use --overwrite to replace it"
                            .to_string(),
                    );
                }
                if let Some(parent) = destination.parent() {
                    fs::create_dir_all(parent).map_err(|error| error.to_string())?;
                }
                let mut chosen = destination.clone();
                if present(&destination) {
                    if entry_matches(&destination, entry, Path::new(&record.source), target) {
                        continue;
                    }
                    if !overwrite && !entry.path.is_empty() {
                        chosen = destination.with_file_name(format!(
                            "{}.router-conflict-{}",
                            destination
                                .file_name()
                                .ok_or("bad filename")?
                                .to_string_lossy(),
                            conflict_suffix(entry)?
                        ));
                        if present(&chosen) {
                            if entry_matches(&chosen, entry, Path::new(&record.source), target) {
                                continue;
                            }
                            return Err(format!(
                                "restore conflict path already exists with different content: {}",
                                chosen.display()
                            ));
                        }
                    } else {
                        remove_any(&destination)?;
                    }
                }
                if entry.kind == "file" {
                    copy_file(&source, &chosen)?;
                } else {
                    restore_link(
                        &source,
                        entry
                            .link
                            .as_deref()
                            .ok_or("missing original symlink target")?,
                        &chosen,
                        &stage,
                        Path::new(&record.source),
                        target,
                    )?;
                }
            }
            validate_links(&stage, &stage, target)?;
        }
        Ok::<(), String>(())
    })();
    if let Err(error) = preparation {
        for (_, stage, _) in &stages {
            let _ = remove_any(stage);
        }
        return Err(error);
    }
    for (target, stamp) in &stamps {
        let current = if present(target) {
            Some(tree_digest(target)?)
        } else {
            None
        };
        if current != *stamp {
            for (_, stage, _) in &stages {
                let _ = remove_any(stage);
            }
            return Err(
                "live profile changed while staging restore; no profile was replaced".to_string(),
            );
        }
    }
    let mut committed = Vec::<(PathBuf, PathBuf, bool)>::new();
    for (target, stage, previous) in &stages {
        let existed = present(target);
        if existed && let Err(error) = fs::rename(target, previous) {
            return Err(restore_error(&error, &rollback_committed(&committed)));
        }
        if let Err(error) = fs::rename(stage, target) {
            let mut rollback_errors = Vec::new();
            if existed && let Err(rollback_error) = fs::rename(previous, target) {
                rollback_errors.push(format!("{}: {rollback_error}", target.display()));
            }
            rollback_errors.extend(rollback_committed(&committed));
            return Err(restore_error(&error, &rollback_errors));
        }
        committed.push((target.clone(), previous.clone(), existed));
    }
    for (_, previous, existed) in committed {
        if existed {
            remove_any(&previous)?;
        }
    }
    println!("restored {id}");
    Ok(())
}
