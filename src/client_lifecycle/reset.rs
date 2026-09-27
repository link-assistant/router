//! Settings-only and explicit full profile reset.

use std::fs;
use std::path::{Path, PathBuf};
use std::process::ExitCode;

use super::{Profile, backup_root, clients, failed, lock_operations, profiles, refuse_active};
use crate::cli::{ClientSelection, ProfileSelection};
use crate::clients::ClientKind;

fn settings_paths(profile: &Profile) -> Vec<PathBuf> {
    let mut paths = Vec::new();
    for store in &profile.stores {
        let root = &store.path;
        let names: &[&str] = match profile.client {
            ClientKind::Codex => &["config.toml"],
            ClientKind::ClaudeCode => &["settings.json", "settings.local.json"],
            ClientKind::Cursor => &["cli-config.json"],
            ClientKind::GeminiCli | ClientKind::QwenCode => &["settings.json"],
            ClientKind::GrokCli => &["user-settings.json"],
            ClientKind::Opencode => {
                if store.name == "config" {
                    &["opencode.json", "config.json"]
                } else {
                    &[]
                }
            }
            ClientKind::Agent => {
                if store.name == "config" {
                    &["opencode.json"]
                } else {
                    &[]
                }
            }
        };
        for name in names {
            paths.push(root.join(name));
        }
    }
    paths
}

fn validate_setting(path: &Path) -> Result<(), String> {
    if !path.exists() {
        return Ok(());
    }
    if fs::symlink_metadata(path)
        .map_err(|error| error.to_string())?
        .file_type()
        .is_symlink()
    {
        return Err("settings symlink must be removed manually before reset".to_string());
    }
    let text =
        fs::read_to_string(path).map_err(|error| format!("cannot read settings: {error}"))?;
    if path
        .extension()
        .is_some_and(|extension| extension == "toml")
    {
        text.parse::<toml_edit::DocumentMut>()
            .map_err(|error| format!("malformed settings: {error}"))?;
    } else {
        serde_json::from_str::<serde_json::Value>(&text)
            .map_err(|error| format!("malformed settings: {error}"))?;
    }
    Ok(())
}

fn ambient(client: ClientKind) -> Vec<&'static str> {
    let names: &[&str] = match client {
        ClientKind::ClaudeCode => &[
            "ANTHROPIC_BASE_URL",
            "ANTHROPIC_API_KEY",
            "ANTHROPIC_MODEL",
            "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC",
            "DISABLE_AUTOUPDATER",
        ],
        ClientKind::Codex => &["CODEX_HOME", "OPENAI_API_KEY", "OPENAI_BASE_URL"],
        ClientKind::GeminiCli => &[
            "GEMINI_API_KEY",
            "GOOGLE_GEMINI_BASE_URL",
            "GEMINI_CLI_HOME",
        ],
        ClientKind::QwenCode => &["QWEN_HOME", "OPENAI_BASE_URL", "OPENAI_API_KEY"],
        ClientKind::GrokCli => &["GROK_API_KEY", "GROK_BASE_URL"],
        ClientKind::Opencode => &["OPENCODE_CONFIG", "OPENCODE_CONFIG_DIR", "XDG_CONFIG_HOME"],
        ClientKind::Cursor => &["CURSOR_CONFIG_DIR", "CURSOR_API_ENDPOINT"],
        ClientKind::Agent => &["XDG_CONFIG_HOME", "OPENAI_API_KEY"],
    };
    names
        .iter()
        .copied()
        .filter(|name| std::env::var_os(name).is_some())
        .collect()
}

fn run_one(
    root: &Path,
    home: Option<&Path>,
    profile: &Profile,
    dry_run: bool,
    full: bool,
    yes: bool,
) -> Result<serde_json::Value, String> {
    refuse_active(profile.client, home)?;
    let selected = profile
        .stores
        .iter()
        .filter(|store| store.path.exists())
        .collect::<Vec<_>>();
    if selected.is_empty() {
        return Err(format!(
            "{} {} profile is unavailable",
            profile.client, profile.scope
        ));
    }
    let settings = settings_paths(profile);
    for path in &settings {
        validate_setting(path)?;
    }
    let overrides = ambient(profile.client);
    let targets = if full {
        selected
            .iter()
            .map(|store| store.path.to_string_lossy().into_owned())
            .collect::<Vec<_>>()
    } else {
        settings
            .iter()
            .filter(|path| path.exists())
            .map(|path| path.to_string_lossy().into_owned())
            .collect::<Vec<_>>()
    };
    let categories = if full {
        vec![
            "settings",
            "sessions",
            "projects",
            "history",
            "checkpoints",
            "memory",
            "local credentials",
        ]
    } else {
        vec!["settings", "Router integration"]
    };
    if dry_run {
        return Ok(
            serde_json::json!({ "client": profile.client.canonical_name(), "profile": profile.scope,
            "mode": if full { "full" } else { "settings" }, "targets": targets,
            "categories": categories, "ambient_overrides": overrides, "status": "planned" }),
        );
    }
    if full && !yes {
        return Err("full reset requires --yes after reviewing --dry-run".to_string());
    }
    if full {
        eprintln!(
            "full local reset of {} {} removes settings, sessions, projects, history, checkpoints, memory and local credentials; remote tokens are not revoked",
            profile.client, profile.scope
        );
        for target in &targets {
            eprintln!("  selected profile store: {target}");
        }
    }
    let guarded = if full {
        selected
            .iter()
            .map(|store| store.path.clone())
            .collect::<Vec<_>>()
    } else {
        settings
            .iter()
            .filter(|path| path.exists())
            .cloned()
            .collect::<Vec<_>>()
    };
    let stamps = guarded
        .iter()
        .map(|path| Ok((path.clone(), super::backup::tree_digest(path)?)))
        .collect::<Result<Vec<_>, String>>()?;
    let backup = super::backup::create_unlocked(root, home, std::slice::from_ref(profile), full)?;
    for (path, stamp) in &stamps {
        if super::backup::tree_digest(path)? != *stamp {
            return Err(format!(
                "profile changed after the reset preview; nothing was reset; recovery backup {backup}"
            ));
        }
    }
    let tx = uuid::Uuid::new_v4().simple().to_string();
    let mut moved = Vec::<(PathBuf, PathBuf)>::new();
    let result = (|| {
        if full {
            for store in &selected {
                let old = store
                    .path
                    .with_file_name(format!(".router-reset-{tx}-{}", store.name));
                fs::rename(&store.path, &old)
                    .map_err(|error| format!("cannot stage full reset: {error}"))?;
                moved.push((store.path.clone(), old));
                if moved.last().is_some_and(|(_, old)| old.is_dir()) {
                    if let Err(error) = fs::create_dir(&store.path) {
                        return Err(format!("cannot create fresh profile: {error}"));
                    }
                    super::owner_directory(&store.path)?;
                }
            }
        } else {
            for path in settings.iter().filter(|path| path.exists()) {
                let old = path.with_file_name(format!(
                    ".router-reset-{tx}-{}",
                    path.file_name()
                        .ok_or("settings has no filename")?
                        .to_string_lossy()
                ));
                fs::rename(path, &old)
                    .map_err(|error| format!("cannot stage settings reset: {error}"))?;
                moved.push((path.clone(), old));
            }
        }
        Ok::<(), String>(())
    })();
    if let Err(error) = result {
        let mut rollback_errors = Vec::new();
        for (path, old) in moved.iter().rev() {
            if full
                && path.exists()
                && let Err(rollback_error) = fs::remove_dir_all(path)
            {
                rollback_errors.push(format!("{}: {rollback_error}", path.display()));
                continue;
            }
            if let Err(rollback_error) = fs::rename(old, path) {
                rollback_errors.push(format!("{}: {rollback_error}", path.display()));
            }
        }
        if !rollback_errors.is_empty() {
            return Err(format!(
                "reset failed: {error}; rollback incomplete ({}); recovery backup {backup}",
                rollback_errors.join("; ")
            ));
        }
        return Err(format!(
            "reset rolled back: {error}; recovery backup {backup}"
        ));
    }
    for (_, old) in moved {
        if old.is_dir() {
            fs::remove_dir_all(old).map_err(|error| error.to_string())?;
        } else {
            fs::remove_file(old).map_err(|error| error.to_string())?;
        }
    }
    Ok(
        serde_json::json!({ "client": profile.client.canonical_name(), "profile": profile.scope,
        "mode": if full { "full" } else { "settings" }, "targets": targets,
        "categories": categories, "ambient_overrides": overrides, "backup_id": backup, "status": "reset" }),
    )
}

#[must_use]
#[allow(clippy::fn_params_excessive_bools)]
pub fn run(
    home: Option<&Path>,
    selection: &ClientSelection,
    dry_run: bool,
    full: bool,
    yes: bool,
    json: bool,
) -> ExitCode {
    let root = match backup_root(home, None) {
        Ok(root) => root,
        Err(error) => return failed(error),
    };
    let _lock = if dry_run {
        None
    } else {
        match lock_operations(&root) {
            Ok(lock) => Some(lock),
            Err(error) => return failed(error),
        }
    };
    let mut rows = Vec::new();
    let mut failures = 0;
    for client in clients(selection) {
        let scopes: &[ProfileSelection] = match selection.profile {
            ProfileSelection::Both => &[ProfileSelection::Normal, ProfileSelection::Router],
            ProfileSelection::Normal => &[ProfileSelection::Normal],
            ProfileSelection::Router => &[ProfileSelection::Router],
        };
        for scope in scopes {
            let result = profiles(home, client, *scope).and_then(|profiles| {
                let profile = profiles
                    .into_iter()
                    .next()
                    .ok_or("profile is unavailable")?;
                run_one(&root, home, &profile, dry_run, full, yes)
            });
            match result {
                Ok(row) => rows.push(row),
                Err(error) => {
                    failures += 1;
                    rows.push(serde_json::json!({
                    "client": client.canonical_name(), "profile": format!("{scope:?}").to_ascii_lowercase(),
                    "status": "error", "reason": error }));
                }
            }
        }
    }
    if json {
        println!(
            "{}",
            serde_json::to_string_pretty(&rows).unwrap_or_default()
        );
    } else {
        for row in &rows {
            let client = row["client"].as_str().unwrap_or("?");
            let profile = row["profile"].as_str().unwrap_or("?");
            let status = row["status"].as_str().unwrap_or("?");
            println!("{client} {profile}: {status}");
            if let Some(targets) = row["targets"].as_array() {
                for target in targets {
                    println!("  target: {}", target.as_str().unwrap_or("?"));
                }
            }
            if let Some(id) = row["backup_id"].as_str() {
                println!("  verified backup: {id}");
            }
            if let Some(reason) = row["reason"].as_str() {
                eprintln!("error: {client} {profile}: {reason}");
            }
            if let Some(overrides) = row["ambient_overrides"].as_array() {
                for name in overrides {
                    eprintln!(
                        "note: {} remains set in the parent environment; unset it before expecting defaults",
                        name.as_str().unwrap_or("override")
                    );
                }
            }
        }
    }
    if failures == 0 {
        ExitCode::SUCCESS
    } else {
        ExitCode::from(1)
    }
}

/// Compatibility for `router with --reset-to-default-configuration claude`.
/// That flag now resets settings in the active Router-owned profile and leaves
/// resumable sessions in place.
pub fn reset_router_claude_for_with() -> Result<Option<String>, String> {
    let root = backup_root(None, None)?;
    let _lock = lock_operations(&root)?;
    let profile = profiles(None, ClientKind::ClaudeCode, ProfileSelection::Router)?
        .into_iter()
        .next()
        .ok_or("Router-owned Claude profile unavailable")?;
    if profile.stores.iter().all(|store| !store.path.exists()) {
        return Ok(None);
    }
    let row = run_one(&root, None, &profile, false, false, true)?;
    Ok(row["backup_id"].as_str().map(str::to_owned))
}
