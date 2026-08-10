//! Safe local configuration for agentic CLI clients.
//!
//! The writer deliberately owns only one Codex provider table and one Claude
//! Code environment key. Unknown settings are parsed and merged, never
//! replaced wholesale, and every changed existing file is backed up first.

use std::fmt;
use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

use clap::ValueEnum;
use serde::Serialize;
use serde_json::{Value, json};
use toml_edit::{DocumentMut, Item, Table, value};

const CODEX_PROVIDER: &str = "link-assistant";
const CODEX_TOKEN_ENV: &str = "LINK_ASSISTANT_TOKEN";
const CLAUDE_TOKEN_ENV: &str = "ANTHROPIC_AUTH_TOKEN";
const CLAUDE_BASE_ENV: &str = "ANTHROPIC_BASE_URL";
const OWNERSHIP_MARKER: &str = ".link-assistant-router-client.json";

/// Clients currently supported by the first issue #69 milestone.
#[derive(Clone, Copy, Debug, Eq, PartialEq, ValueEnum)]
pub enum ClientKind {
    Codex,
    ClaudeCode,
}

impl ClientKind {
    pub const ALL: [Self; 2] = [Self::Codex, Self::ClaudeCode];

    #[must_use]
    pub const fn command(self) -> &'static str {
        match self {
            Self::Codex => "codex",
            Self::ClaudeCode => "claude",
        }
    }

    #[must_use]
    pub const fn display_name(self) -> &'static str {
        match self {
            Self::Codex => "Codex CLI",
            Self::ClaudeCode => "Claude Code",
        }
    }

    #[must_use]
    pub const fn dialect(self) -> &'static str {
        match self {
            Self::Codex => "OpenAI Responses",
            Self::ClaudeCode => "Anthropic Messages",
        }
    }

    #[must_use]
    pub const fn token_env(self) -> &'static str {
        match self {
            Self::Codex => CODEX_TOKEN_ENV,
            Self::ClaudeCode => CLAUDE_TOKEN_ENV,
        }
    }
}

impl fmt::Display for ClientKind {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Codex => write!(f, "codex"),
            Self::ClaudeCode => write!(f, "claude-code"),
        }
    }
}

#[derive(Debug)]
pub struct ClientError(String);

impl ClientError {
    fn message(message: impl Into<String>) -> Self {
        Self(message.into())
    }
}

impl fmt::Display for ClientError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(&self.0)
    }
}

impl std::error::Error for ClientError {}

impl From<std::io::Error> for ClientError {
    fn from(error: std::io::Error) -> Self {
        Self(error.to_string())
    }
}

impl From<serde_json::Error> for ClientError {
    fn from(error: serde_json::Error) -> Self {
        Self(error.to_string())
    }
}

/// Secret-free state returned by `clients list` and `clients show`.
#[derive(Debug, Serialize)]
pub struct ClientStatus {
    pub client: String,
    pub installed: bool,
    pub configured: bool,
    pub config_path: PathBuf,
    pub dialect: &'static str,
    pub base_url: Option<String>,
    pub token_env: &'static str,
    pub token_env_set: bool,
}

/// Result of a successful setup operation.
#[derive(Debug)]
pub struct SetupResult {
    pub path: PathBuf,
    pub backup: Option<PathBuf>,
    pub changed: bool,
}

/// Reads and updates supported clients below their normal user config roots.
#[derive(Debug)]
pub struct ClientManager {
    codex_home: PathBuf,
    claude_home: PathBuf,
}

impl ClientManager {
    /// Resolve client directories, respecting the clients' own override vars.
    pub fn from_env() -> Result<Self, ClientError> {
        let home = std::env::var_os("HOME")
            .map(PathBuf::from)
            .ok_or_else(|| ClientError::message("HOME is unset; cannot locate client configs"))?;
        let codex_home =
            std::env::var_os("CODEX_HOME").map_or_else(|| home.join(".codex"), PathBuf::from);
        let claude_home = std::env::var_os("CLAUDE_CONFIG_DIR")
            .map_or_else(|| home.join(".claude"), PathBuf::from);
        Ok(Self {
            codex_home,
            claude_home,
        })
    }

    #[must_use]
    pub fn config_path(&self, client: ClientKind) -> PathBuf {
        match client {
            ClientKind::Codex => self.codex_home.join("config.toml"),
            ClientKind::ClaudeCode => self.claude_home.join("settings.json"),
        }
    }

    pub fn status(&self, client: ClientKind) -> Result<ClientStatus, ClientError> {
        let path = self.config_path(client);
        let base_url = match client {
            ClientKind::Codex => read_codex_base_url(&path)?,
            ClientKind::ClaudeCode => read_claude_base_url(&path)?,
        };
        Ok(ClientStatus {
            client: client.to_string(),
            installed: command_exists(client.command()),
            configured: base_url.is_some(),
            config_path: path,
            dialect: client.dialect(),
            base_url,
            token_env: client.token_env(),
            token_env_set: std::env::var_os(client.token_env()).is_some(),
        })
    }

    pub fn setup(&self, client: ClientKind, base_url: &str) -> Result<SetupResult, ClientError> {
        let base_url = normalize_base_url(base_url)?;
        match client {
            ClientKind::Codex => self.setup_codex(&base_url),
            ClientKind::ClaudeCode => self.setup_claude(&base_url),
        }
    }

    pub fn remove(&self, client: ClientKind) -> Result<SetupResult, ClientError> {
        match client {
            ClientKind::Codex => self.remove_codex(),
            ClientKind::ClaudeCode => self.remove_claude(),
        }
    }

    /// Exercise the same URL and token variable configured for the client.
    pub async fn doctor(&self, client: ClientKind) -> Result<String, ClientError> {
        let status = self.status(client)?;
        let base_url = status.base_url.ok_or_else(|| {
            ClientError::message(format!(
                "{} is not configured; run `clients setup {client}`",
                client.display_name()
            ))
        })?;
        let token = std::env::var(client.token_env()).map_err(|_| {
            ClientError::message(format!(
                "{} is unset; export the token printed by `clients setup {client}`",
                client.token_env()
            ))
        })?;
        let (url, body) = match client {
            ClientKind::Codex => (
                format!("{}/responses", base_url.trim_end_matches('/')),
                json!({"model":"gpt-5", "input":"Reply OK", "max_output_tokens":1}),
            ),
            ClientKind::ClaudeCode => (
                format!("{}/v1/messages", base_url.trim_end_matches('/')),
                json!({
                    "model":"claude-sonnet-4-5-20250929",
                    "max_tokens":1,
                    "messages":[{"role":"user", "content":"Reply OK"}]
                }),
            ),
        };
        let response = reqwest::Client::new()
            .post(&url)
            .bearer_auth(token)
            .json(&body)
            .send()
            .await
            .map_err(|error| {
                ClientError::message(format!("router is not reachable at {url}: {error}"))
            })?;
        let code = response.status();
        let response_body = response.text().await.unwrap_or_default();
        if code.is_success() {
            return Ok(format!(
                "{} reached {url} successfully ({code})",
                client.display_name()
            ));
        }
        if code.as_u16() == 401 || code.as_u16() == 403 {
            return Err(ClientError::message(format!(
                "router rejected {} ({code}); the token is invalid, expired, or revoked",
                client.token_env()
            )));
        }
        if code.as_u16() == 503 {
            return Err(ClientError::message(format!(
                "router reached, but its upstream credential is unavailable ({code}): {}",
                compact_body(&response_body)
            )));
        }
        Err(ClientError::message(format!(
            "router request failed at {url} ({code}): {}",
            compact_body(&response_body)
        )))
    }

    fn setup_codex(&self, base_url: &str) -> Result<SetupResult, ClientError> {
        let path = self.config_path(ClientKind::Codex);
        let source = read_or_empty(&path)?;
        let mut document = if source.trim().is_empty() {
            DocumentMut::new()
        } else {
            source.parse::<DocumentMut>().map_err(|error| {
                ClientError::message(format!("invalid TOML in {}: {error}", path.display()))
            })?
        };
        let previous_provider = document
            .get("model_provider")
            .and_then(Item::as_str)
            .map(str::to_string);
        document["model_provider"] = value(CODEX_PROVIDER);
        if document.get("model_providers").is_none() {
            document["model_providers"] = Item::Table(Table::new());
        }
        let providers = document["model_providers"]
            .as_table_like_mut()
            .ok_or_else(|| ClientError::message("model_providers must be a TOML table"))?;
        if providers.get(CODEX_PROVIDER).is_none() {
            providers.insert(CODEX_PROVIDER, Item::Table(Table::new()));
        }
        let provider = providers
            .get_mut(CODEX_PROVIDER)
            .and_then(Item::as_table_like_mut)
            .ok_or_else(|| {
                ClientError::message("model_providers.link-assistant must be a TOML table")
            })?;
        provider.insert("name", value("Link.Assistant.Router"));
        provider.insert("base_url", value(format!("{base_url}/v1")));
        provider.insert("env_key", value(CODEX_TOKEN_ENV));
        provider.insert("wire_api", value("responses"));
        let result = write_if_changed(&path, &source, &document.to_string())?;
        let marker = self.codex_home.join(OWNERSHIP_MARKER);
        if !marker.exists() {
            let previous_provider = previous_provider.filter(|value| value != CODEX_PROVIDER);
            write_codex_marker(&marker, previous_provider.as_deref())?;
        }
        Ok(result)
    }

    fn setup_claude(&self, base_url: &str) -> Result<SetupResult, ClientError> {
        let path = self.config_path(ClientKind::ClaudeCode);
        let source = read_or_empty(&path)?;
        let mut document: Value = if source.trim().is_empty() {
            json!({})
        } else {
            serde_json::from_str(&source).map_err(|error| {
                ClientError::message(format!("invalid JSON in {}: {error}", path.display()))
            })?
        };
        let root = document.as_object_mut().ok_or_else(|| {
            ClientError::message(format!("{} must contain a JSON object", path.display()))
        })?;
        let env = root.entry("env").or_insert_with(|| json!({}));
        let env = env.as_object_mut().ok_or_else(|| {
            ClientError::message(format!("{}.env must be a JSON object", path.display()))
        })?;
        env.insert(CLAUDE_BASE_ENV.into(), Value::String(base_url.into()));
        let rendered = format!("{}\n", serde_json::to_string_pretty(&document)?);
        let result = write_if_changed(&path, &source, &rendered)?;
        write_claude_marker(&self.claude_home.join(OWNERSHIP_MARKER), base_url)?;
        Ok(result)
    }

    fn remove_codex(&self) -> Result<SetupResult, ClientError> {
        let path = self.config_path(ClientKind::Codex);
        let source = read_or_empty(&path)?;
        if source.trim().is_empty() {
            return Ok(unchanged(path));
        }
        let marker_path = self.codex_home.join(OWNERSHIP_MARKER);
        if !marker_path.exists() {
            return Ok(unchanged(path));
        }
        let mut document = source.parse::<DocumentMut>().map_err(|error| {
            ClientError::message(format!("invalid TOML in {}: {error}", path.display()))
        })?;
        let previous_provider = read_codex_marker(&marker_path)?;
        if document.get("model_provider").and_then(Item::as_str) == Some(CODEX_PROVIDER) {
            if let Some(previous_provider) = previous_provider {
                document["model_provider"] = value(previous_provider);
            } else {
                document.as_table_mut().remove("model_provider");
            }
        }
        if let Some(providers) = document
            .get_mut("model_providers")
            .and_then(Item::as_table_like_mut)
        {
            providers.remove(CODEX_PROVIDER);
        }
        let result = write_if_changed(&path, &source, &document.to_string())?;
        if marker_path.exists() {
            fs::remove_file(marker_path)?;
        }
        Ok(result)
    }

    fn remove_claude(&self) -> Result<SetupResult, ClientError> {
        let path = self.config_path(ClientKind::ClaudeCode);
        let source = read_or_empty(&path)?;
        if source.trim().is_empty() {
            return Ok(unchanged(path));
        }
        let marker_path = self.claude_home.join(OWNERSHIP_MARKER);
        let managed_url = read_claude_marker(&marker_path)?;
        let Some(managed_url) = managed_url else {
            return Ok(unchanged(path));
        };
        let mut document: Value = serde_json::from_str(&source).map_err(|error| {
            ClientError::message(format!("invalid JSON in {}: {error}", path.display()))
        })?;
        let current_url = document
            .get("env")
            .and_then(|env| env.get(CLAUDE_BASE_ENV))
            .and_then(Value::as_str);
        if current_url != Some(managed_url.as_str()) {
            fs::remove_file(marker_path)?;
            return Ok(unchanged(path));
        }
        if let Some(env) = document.get_mut("env").and_then(Value::as_object_mut) {
            env.remove(CLAUDE_BASE_ENV);
        }
        let rendered = format!("{}\n", serde_json::to_string_pretty(&document)?);
        let result = write_if_changed(&path, &source, &rendered)?;
        if marker_path.exists() {
            fs::remove_file(marker_path)?;
        }
        Ok(result)
    }
}

fn normalize_base_url(base_url: &str) -> Result<String, ClientError> {
    let trimmed = base_url.trim().trim_end_matches('/');
    if !(trimmed.starts_with("http://") || trimmed.starts_with("https://")) {
        return Err(ClientError::message(
            "base URL must start with http:// or https://",
        ));
    }
    Ok(trimmed.to_string())
}

fn read_codex_base_url(path: &Path) -> Result<Option<String>, ClientError> {
    let source = read_or_empty(path)?;
    if source.trim().is_empty() {
        return Ok(None);
    }
    let document = source.parse::<DocumentMut>().map_err(|error| {
        ClientError::message(format!("invalid TOML in {}: {error}", path.display()))
    })?;
    if document.get("model_provider").and_then(Item::as_str) != Some(CODEX_PROVIDER) {
        return Ok(None);
    }
    let Some(provider) = document
        .get("model_providers")
        .and_then(Item::as_table_like)
        .and_then(|providers| providers.get(CODEX_PROVIDER))
    else {
        return Ok(None);
    };
    let Some(provider) = provider.as_table_like() else {
        return Ok(None);
    };
    let configured = provider.get("wire_api").and_then(Item::as_str) == Some("responses")
        && provider.get("env_key").and_then(Item::as_str) == Some(CODEX_TOKEN_ENV);
    Ok(configured
        .then(|| {
            provider
                .get("base_url")
                .and_then(Item::as_str)
                .map(str::to_string)
        })
        .flatten())
}

fn read_claude_base_url(path: &Path) -> Result<Option<String>, ClientError> {
    let source = read_or_empty(path)?;
    if source.trim().is_empty() {
        return Ok(None);
    }
    let document: Value = serde_json::from_str(&source).map_err(|error| {
        ClientError::message(format!("invalid JSON in {}: {error}", path.display()))
    })?;
    Ok(document
        .get("env")
        .and_then(|env| env.get(CLAUDE_BASE_ENV))
        .and_then(Value::as_str)
        .map(str::to_string))
}

fn read_or_empty(path: &Path) -> Result<String, ClientError> {
    match fs::read_to_string(path) {
        Ok(source) => Ok(source),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(String::new()),
        Err(error) => Err(ClientError::message(format!(
            "could not read {}: {error}",
            path.display()
        ))),
    }
}

fn write_if_changed(path: &Path, before: &str, after: &str) -> Result<SetupResult, ClientError> {
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

const fn unchanged(path: PathBuf) -> SetupResult {
    SetupResult {
        path,
        backup: None,
        changed: false,
    }
}

fn backup_file(path: &Path) -> Result<PathBuf, ClientError> {
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

fn atomic_write(path: &Path, contents: &[u8]) -> Result<(), ClientError> {
    let parent = path
        .parent()
        .ok_or_else(|| ClientError::message("missing parent directory"))?;
    let temp = parent.join(format!(
        ".link-assistant-router.{}.{}.tmp",
        std::process::id(),
        uuid::Uuid::new_v4()
    ));
    let mut options = OpenOptions::new();
    options.write(true).create_new(true);
    #[cfg(unix)]
    {
        use std::os::unix::fs::OpenOptionsExt;
        options.mode(0o600);
    }
    let mut file = options.open(&temp)?;
    file.write_all(contents)?;
    file.sync_all()?;
    if let Ok(metadata) = fs::metadata(path) {
        fs::set_permissions(&temp, metadata.permissions())?;
    }
    fs::rename(&temp, path)?;
    Ok(())
}

fn write_claude_marker(path: &Path, base_url: &str) -> Result<(), ClientError> {
    let rendered = format!(
        "{}\n",
        serde_json::to_string_pretty(&json!({
            "anthropic_base_url": base_url
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

fn read_claude_marker(path: &Path) -> Result<Option<String>, ClientError> {
    let source = read_or_empty(path)?;
    if source.trim().is_empty() {
        return Ok(None);
    }
    let marker: Value = serde_json::from_str(&source)?;
    Ok(marker
        .get("anthropic_base_url")
        .and_then(Value::as_str)
        .map(str::to_string))
}

fn write_codex_marker(path: &Path, previous_provider: Option<&str>) -> Result<(), ClientError> {
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

fn read_codex_marker(path: &Path) -> Result<Option<String>, ClientError> {
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

fn command_exists(command: &str) -> bool {
    std::env::var_os("PATH").is_some_and(|path| {
        std::env::split_paths(&path).any(|directory| directory.join(command).is_file())
    })
}

fn compact_body(body: &str) -> String {
    const MAX: usize = 240;
    let compact = body.split_whitespace().collect::<Vec<_>>().join(" ");
    if compact.chars().count() <= MAX {
        compact
    } else {
        format!("{}…", compact.chars().take(MAX).collect::<String>())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rejects_non_http_router_urls() {
        assert!(normalize_base_url("router.internal:8080").is_err());
    }

    #[test]
    fn compact_diagnostics_do_not_echo_unbounded_upstream_bodies() {
        let body = "x".repeat(500);
        let compact = compact_body(&body);
        assert!(compact.ends_with('…'));
        assert!(compact.chars().count() <= 241);
    }
}
