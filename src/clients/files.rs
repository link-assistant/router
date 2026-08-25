//! File primitives shared by the client integrations: safe reads, atomic
//! writes with timestamped backups, and the ownership markers that let
//! `remove` stay surgical.

use std::fs;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

use serde_json::{Value, json};

use super::{ClientError, SetupResult};

pub(super) fn read_or_empty(path: &Path) -> Result<String, ClientError> {
    match fs::read_to_string(path) {
        Ok(source) => Ok(source),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(String::new()),
        Err(error) => Err(ClientError::message(format!(
            "could not read {}: {error}",
            path.display()
        ))),
    }
}

pub(super) fn read_environment_value(
    path: &Path,
    name: &str,
) -> Result<Option<String>, ClientError> {
    let source = read_or_empty(path)?;
    let prefix = format!("export {name}=");
    Ok(source.lines().find_map(|line| {
        let raw = line.strip_prefix(&prefix)?.trim();
        Some(
            raw.strip_prefix('\'')
                .and_then(|value| value.strip_suffix('\''))
                .unwrap_or(raw)
                .replace("'\\''", "'"),
        )
    }))
}

pub(super) fn write_if_changed(
    path: &Path,
    before: &str,
    after: &str,
) -> Result<SetupResult, ClientError> {
    if before == after {
        return Ok(unchanged(path.to_path_buf()));
    }
    let parent = path.parent().ok_or_else(|| {
        ClientError::message(format!("{} has no parent directory", path.display()))
    })?;
    fs::create_dir_all(parent)?;
    let backup = path.exists().then(|| backup_file(path)).transpose()?;
    atomic_write(path, after.as_bytes())?;
    Ok(SetupResult {
        path: path.to_path_buf(),
        backup,
        changed: true,
    })
}

pub(super) const fn unchanged(path: PathBuf) -> SetupResult {
    SetupResult {
        path,
        backup: None,
        changed: false,
    }
}

pub(super) fn backup_file(path: &Path) -> Result<PathBuf, ClientError> {
    let stamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_nanos();
    let file_name = path
        .file_name()
        .and_then(|name| name.to_str())
        .ok_or_else(|| ClientError::message("config file name is not valid UTF-8"))?;
    let backup = path.with_file_name(format!("{file_name}.link-assistant-router.{stamp}.bak"));
    fs::copy(path, &backup)?;
    Ok(backup)
}

pub(super) fn atomic_write(path: &Path, contents: &[u8]) -> Result<(), ClientError> {
    crate::durable_file::atomic_write_owner_only(path, contents).map_err(Into::into)
}

/// Record what the router wrote, and what it replaced.
///
/// `previous_anthropic_base_url` is what makes removal reversible. Without it
/// `clients remove claude` deleted the key rather than restoring it, so a user
/// already pointing Claude Code at a proxy of their own lost that setting
/// permanently — while the neighbouring Codex integration, which does record
/// its predecessor, put it back (issue #302).
pub(super) fn write_claude_marker(
    path: &Path,
    base_url: &str,
    previous: Option<&str>,
) -> Result<(), ClientError> {
    let rendered = format!(
        "{}\n",
        serde_json::to_string_pretty(&json!({
            "anthropic_base_url": base_url,
            "previous_anthropic_base_url": previous,
        }))?
    );
    if read_or_empty(path)? != rendered {
        let parent = path
            .parent()
            .ok_or_else(|| ClientError::message("missing marker parent"))?;
        fs::create_dir_all(parent)?;
        atomic_write(path, rendered.as_bytes())?;
    }
    Ok(())
}

/// The URL the router wrote, and the one it replaced.
///
/// A marker written before issue #302 has no `previous_anthropic_base_url`,
/// which reads as `None` — the same answer as "there was nothing there", and
/// the same removal behaviour those markers already had.
pub(super) fn claude_marker(path: &Path) -> Result<Option<(String, Option<String>)>, ClientError> {
    let source = read_or_empty(path)?;
    if source.trim().is_empty() {
        return Ok(None);
    }
    let marker: Value = serde_json::from_str(&source)?;
    let Some(managed) = marker
        .get("anthropic_base_url")
        .and_then(Value::as_str)
        .map(str::to_string)
    else {
        return Ok(None);
    };
    let previous = marker
        .get("previous_anthropic_base_url")
        .and_then(Value::as_str)
        .map(str::to_string);
    Ok(Some((managed, previous)))
}

pub(super) fn write_codex_marker(
    path: &Path,
    previous_provider: Option<&str>,
) -> Result<(), ClientError> {
    let rendered = format!(
        "{}\n",
        serde_json::to_string_pretty(&json!({
            "previous_model_provider": previous_provider
        }))?
    );
    let parent = path
        .parent()
        .ok_or_else(|| ClientError::message("missing marker parent"))?;
    fs::create_dir_all(parent)?;
    atomic_write(path, rendered.as_bytes())
}

pub(super) fn read_codex_marker(path: &Path) -> Result<Option<String>, ClientError> {
    let source = read_or_empty(path)?;
    if source.trim().is_empty() {
        return Ok(None);
    }
    let marker: Value = serde_json::from_str(&source)?;
    Ok(marker
        .get("previous_model_provider")
        .and_then(Value::as_str)
        .map(str::to_string))
}
