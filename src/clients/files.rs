//! File primitives shared by the client integrations: safe reads, atomic
//! writes with timestamped backups, and the ownership markers that let
//! `remove` stay surgical.

use std::fmt::Write as _;
use std::fs;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

use serde_json::{Value, json};

use super::{ClientError, ClientKind, ClientManager, SetupResult};

pub(super) type CodexMarker = (Option<String>, Option<String>, Option<String>);

impl ClientManager {
    /// Store the client's shell exports without exposing the token on stdout.
    pub(crate) fn write_environment(
        &self,
        client: ClientKind,
        base_url: &str,
        token: &str,
    ) -> Result<PathBuf, ClientError> {
        let token_env = client
            .token_env()
            .ok_or_else(|| ClientError::message("client has no router token environment"))?;
        let directory = self.config_home.join("link-assistant-router/clients");
        fs::create_dir_all(&directory)?;
        let path = self.environment_path(client);
        let mut contents = String::new();
        if let Some(base_url_env) = client.base_url_env() {
            let endpoint = format!(
                "{}{}",
                base_url.trim_end_matches('/'),
                client.integration().endpoint_suffix
            );
            writeln!(
                &mut contents,
                "export {base_url_env}={}",
                super::util::shell_quote(&endpoint)
            )
            .expect("writing to a String cannot fail");
        }
        writeln!(
            &mut contents,
            "export {token_env}={}",
            super::util::shell_quote(token)
        )
        .expect("writing to a String cannot fail");
        if client == ClientKind::Codex {
            let alias = crate::token::codex_token_alias(token).ok_or_else(|| {
                ClientError::message(
                    "Codex control-plane setup requires a Router-issued la_sk_ token",
                )
            })?;
            writeln!(
                &mut contents,
                "export CODEX_ACCESS_TOKEN={}",
                super::util::shell_quote(&alias)
            )
            .expect("writing to a String cannot fail");
            writeln!(
                &mut contents,
                "export CODEX_AUTHAPI_BASE_URL={}",
                super::util::shell_quote(&format!(
                    "{}/api/services/codex",
                    base_url.trim_end_matches('/')
                ))
            )
            .expect("writing to a String cannot fail");
        }
        if client == ClientKind::ClaudeCode {
            writeln!(
                &mut contents,
                "export CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY=1"
            )
            .expect("writing to a String cannot fail");
            writeln!(
                &mut contents,
                "export CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=0"
            )
            .expect("writing to a String cannot fail");
        }
        atomic_write(&path, contents.as_bytes())?;
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt as _;
            fs::set_permissions(&path, fs::Permissions::from_mode(0o600))?;
        }
        Ok(path)
    }
}

pub(super) type ClaudeEnvOwnership = Vec<(String, Option<String>, Option<String>)>;

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
    // Client configs can contain vendor credentials. A process umask must not
    // decide whether the timestamped safety copy is world-readable.
    atomic_write(&backup, &fs::read(path)?)?;
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt as _;
        fs::set_permissions(&backup, fs::Permissions::from_mode(0o600))?;
    }
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
    gateway_env: &ClaudeEnvOwnership,
) -> Result<(), ClientError> {
    let gateway_env = gateway_env
        .iter()
        .map(|(key, managed, previous)| {
            (
                key.clone(),
                json!({"managed": managed, "previous": previous}),
            )
        })
        .collect::<serde_json::Map<_, _>>();
    let rendered = format!(
        "{}\n",
        serde_json::to_string_pretty(&json!({
            "anthropic_base_url": base_url,
            "previous_anthropic_base_url": previous,
            "gateway_env": gateway_env,
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
pub(super) fn claude_marker(
    path: &Path,
) -> Result<Option<(String, Option<String>, ClaudeEnvOwnership)>, ClientError> {
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
    let gateway_env = marker
        .get("gateway_env")
        .and_then(Value::as_object)
        .into_iter()
        .flatten()
        .filter_map(|(key, ownership)| {
            let managed = match ownership.get("managed") {
                Some(Value::String(value)) => Some(value.clone()),
                Some(Value::Null) | None => None,
                _ => return None,
            };
            let previous = ownership
                .get("previous")
                .and_then(Value::as_str)
                .map(str::to_string);
            Some((key.clone(), managed, previous))
        })
        .collect();
    Ok(Some((managed, previous, gateway_env)))
}

pub(super) fn write_codex_marker(
    path: &Path,
    previous_provider: Option<&str>,
    managed_chatgpt_base_url: &str,
    previous_chatgpt_base_url: Option<&str>,
) -> Result<(), ClientError> {
    let rendered = format!(
        "{}\n",
        serde_json::to_string_pretty(&json!({
            "previous_model_provider": previous_provider,
            "managed_chatgpt_base_url": managed_chatgpt_base_url,
            "previous_chatgpt_base_url": previous_chatgpt_base_url
        }))?
    );
    let parent = path
        .parent()
        .ok_or_else(|| ClientError::message("missing marker parent"))?;
    fs::create_dir_all(parent)?;
    atomic_write(path, rendered.as_bytes())
}

pub(super) fn read_codex_marker(path: &Path) -> Result<CodexMarker, ClientError> {
    let source = read_or_empty(path)?;
    if source.trim().is_empty() {
        return Ok((None, None, None));
    }
    let marker: Value = serde_json::from_str(&source)?;
    Ok((
        marker
            .get("previous_model_provider")
            .and_then(Value::as_str)
            .map(str::to_string),
        marker
            .get("managed_chatgpt_base_url")
            .and_then(Value::as_str)
            .map(str::to_string),
        marker
            .get("previous_chatgpt_base_url")
            .and_then(Value::as_str)
            .map(str::to_string),
    ))
}
