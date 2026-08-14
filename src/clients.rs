//! Safe local configuration for agentic CLI clients.
//!
//! The writer deliberately owns only one Codex provider table and one Claude
//! Code environment key. Unknown settings are parsed and merged, never
//! replaced wholesale, and every changed existing file is backed up first.

use std::fmt::{self, Write as _};
use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::{Path, PathBuf};
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use clap::ValueEnum;
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use toml_edit::{DocumentMut, Item, Table, value};

mod json_config;

use json_config::{read_json_provider_base_url, read_qwen_base_url};

const CODEX_PROVIDER: &str = "link-assistant";
const CODEX_TOKEN_ENV: &str = "LINK_ASSISTANT_TOKEN";
const CLAUDE_TOKEN_ENV: &str = "ANTHROPIC_AUTH_TOKEN";
const CLAUDE_BASE_ENV: &str = "ANTHROPIC_BASE_URL";
const ROUTER_TOKEN_ENV: &str = "LINK_ASSISTANT_TOKEN";
const GROK_TOKEN_ENV: &str = "GROK_API_KEY";
const GROK_BASE_ENV: &str = "GROK_BASE_URL";
const ROUTER_PROVIDER: &str = "link-assistant";
const OWNERSHIP_MARKER: &str = ".link-assistant-router-client.json";

/// How a client can be isolated from its normal user configuration.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum ClientIsolation {
    Home,
    ClaudeConfig,
    GeminiHome,
    ConfigFile,
    Environment,
    Unsupported,
}

/// Declarative client integration data shared by setup, status, and `with`.
#[derive(Clone, Copy, Debug)]
pub struct ClientIntegration {
    pub kind: ClientKind,
    pub name: &'static str,
    pub command: &'static str,
    pub dialect: &'static str,
    pub token_env: Option<&'static str>,
    pub base_url_env: Option<&'static str>,
    pub endpoint_suffix: &'static str,
    pub default_model: &'static str,
    pub model_arg: Option<&'static str>,
    pub non_interactive_arg: Option<&'static str>,
    pub isolation: ClientIsolation,
    pub setup_limitation: Option<&'static str>,
}

/// Documented local clients, including clients whose vendor gates prevent setup.
#[derive(Clone, Copy, Debug, Eq, PartialEq, ValueEnum)]
pub enum ClientKind {
    Codex,
    #[value(alias = "claude")]
    ClaudeCode,
    Cursor,
    #[value(alias = "gemini")]
    GeminiCli,
    #[value(alias = "grok")]
    GrokCli,
    Opencode,
    #[value(alias = "qwen")]
    QwenCode,
    Agent,
}

/// Single source of truth for supported client launch mechanics.
pub const CLIENT_INTEGRATIONS: [ClientIntegration; 8] = [
    ClientIntegration {
        kind: ClientKind::Codex,
        name: "Codex CLI",
        command: "codex",
        dialect: "OpenAI Responses",
        token_env: Some(CODEX_TOKEN_ENV),
        base_url_env: None,
        endpoint_suffix: "/v1",
        default_model: "gpt-5",
        model_arg: Some("--model"),
        non_interactive_arg: Some("exec"),
        isolation: ClientIsolation::Home,
        setup_limitation: None,
    },
    ClientIntegration {
        kind: ClientKind::ClaudeCode,
        name: "Claude Code",
        command: "claude",
        dialect: "Anthropic Messages",
        token_env: Some(CLAUDE_TOKEN_ENV),
        base_url_env: Some(CLAUDE_BASE_ENV),
        endpoint_suffix: "",
        default_model: "claude-sonnet-4-5-20250929",
        model_arg: Some("--model"),
        non_interactive_arg: Some("--print"),
        isolation: ClientIsolation::ClaudeConfig,
        setup_limitation: None,
    },
    ClientIntegration {
        kind: ClientKind::Cursor,
        name: "Cursor CLI",
        command: "cursor-agent",
        dialect: "Cursor private",
        token_env: None,
        base_url_env: None,
        endpoint_suffix: "",
        default_model: "",
        model_arg: None,
        non_interactive_arg: None,
        isolation: ClientIsolation::Unsupported,
        setup_limitation: Some(
            "Cursor CLI does not expose a base-URL override; this router also does not expose the MCP adapter Cursor would require",
        ),
    },
    ClientIntegration {
        kind: ClientKind::GeminiCli,
        name: "Gemini CLI",
        command: "gemini",
        dialect: "Gemini native",
        token_env: Some("GEMINI_API_KEY"),
        base_url_env: Some("GOOGLE_GEMINI_BASE_URL"),
        endpoint_suffix: "/api/gemini",
        default_model: "gemini-2.5-pro",
        model_arg: Some("--model"),
        non_interactive_arg: Some("-p"),
        isolation: ClientIsolation::GeminiHome,
        setup_limitation: Some(
            "Gemini CLI permanent setup is unavailable because its individual Code Assist flow aborts with IneligibleTierError; use `link-assistant-router with gemini` for isolated API-key mode",
        ),
    },
    ClientIntegration {
        kind: ClientKind::GrokCli,
        name: "Grok CLI",
        command: "grok",
        dialect: "OpenAI Chat",
        token_env: Some(GROK_TOKEN_ENV),
        base_url_env: Some(GROK_BASE_ENV),
        endpoint_suffix: "/v1",
        default_model: "gpt-4o",
        model_arg: Some("--model"),
        non_interactive_arg: Some("-p"),
        isolation: ClientIsolation::Home,
        setup_limitation: None,
    },
    ClientIntegration {
        kind: ClientKind::Opencode,
        name: "OpenCode",
        command: "opencode",
        dialect: "OpenAI Chat",
        token_env: Some(ROUTER_TOKEN_ENV),
        base_url_env: None,
        endpoint_suffix: "/v1",
        default_model: "claude-sonnet-4-5-20250929",
        model_arg: Some("--model"),
        non_interactive_arg: Some("run"),
        isolation: ClientIsolation::ConfigFile,
        setup_limitation: None,
    },
    ClientIntegration {
        kind: ClientKind::QwenCode,
        name: "Qwen Code",
        command: "qwen",
        dialect: "OpenAI Chat",
        token_env: Some(ROUTER_TOKEN_ENV),
        base_url_env: Some("OPENAI_BASE_URL"),
        endpoint_suffix: "/v1",
        default_model: "claude-sonnet-4-5-20250929",
        model_arg: Some("--model"),
        non_interactive_arg: Some("-p"),
        isolation: ClientIsolation::Home,
        setup_limitation: None,
    },
    ClientIntegration {
        kind: ClientKind::Agent,
        name: "Link.Assistant Agent",
        command: "agent",
        dialect: "OpenAI Chat",
        token_env: Some(ROUTER_TOKEN_ENV),
        base_url_env: None,
        endpoint_suffix: "/v1",
        default_model: "claude-sonnet-4-5-20250929",
        model_arg: Some("--model"),
        non_interactive_arg: Some("--prompt"),
        isolation: ClientIsolation::ConfigFile,
        setup_limitation: None,
    },
];

impl ClientKind {
    pub const ALL: [Self; 8] = [
        Self::Codex,
        Self::ClaudeCode,
        Self::Cursor,
        Self::GeminiCli,
        Self::GrokCli,
        Self::Opencode,
        Self::QwenCode,
        Self::Agent,
    ];

    #[must_use]
    pub const fn command(self) -> &'static str {
        self.integration().command
    }

    #[must_use]
    pub const fn display_name(self) -> &'static str {
        self.integration().name
    }

    #[must_use]
    pub const fn dialect(self) -> &'static str {
        self.integration().dialect
    }

    #[must_use]
    pub const fn token_env(self) -> Option<&'static str> {
        self.integration().token_env
    }

    #[must_use]
    pub const fn setup_limitation(self) -> Option<&'static str> {
        self.integration().setup_limitation
    }

    #[must_use]
    pub const fn base_url_env(self) -> Option<&'static str> {
        self.integration().base_url_env
    }

    #[must_use]
    pub const fn integration(self) -> &'static ClientIntegration {
        &CLIENT_INTEGRATIONS[self as usize]
    }
}

impl fmt::Display for ClientKind {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Codex => write!(f, "codex"),
            Self::ClaudeCode => write!(f, "claude-code"),
            Self::Cursor => write!(f, "cursor"),
            Self::GeminiCli => write!(f, "gemini-cli"),
            Self::GrokCli => write!(f, "grok-cli"),
            Self::Opencode => write!(f, "opencode"),
            Self::QwenCode => write!(f, "qwen-code"),
            Self::Agent => write!(f, "agent"),
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
    pub token_env: Option<&'static str>,
    pub token_env_set: bool,
}

/// Result of a successful setup operation.
#[derive(Debug)]
pub struct SetupResult {
    pub path: PathBuf,
    pub backup: Option<PathBuf>,
    pub changed: bool,
}

/// One model advertised by the configured router.
#[derive(Clone, Debug, Deserialize, Eq, PartialEq)]
pub(crate) struct RouterModel {
    pub id: String,
    #[serde(default)]
    pub owned_by: String,
}

#[derive(Deserialize)]
struct RouterCatalog {
    data: Vec<RouterModel>,
}

/// Reads and updates supported clients below their normal user config roots.
#[derive(Debug)]
pub struct ClientManager {
    home: PathBuf,
    codex_home: PathBuf,
    claude_home: PathBuf,
    config_home: PathBuf,
    qwen_home: PathBuf,
    gemini_home: PathBuf,
    cursor_home: PathBuf,
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
        let config_home =
            std::env::var_os("XDG_CONFIG_HOME").map_or_else(|| home.join(".config"), PathBuf::from);
        let qwen_home =
            std::env::var_os("QWEN_HOME").map_or_else(|| home.join(".qwen"), PathBuf::from);
        let gemini_home =
            std::env::var_os("GEMINI_CLI_HOME").map_or_else(|| home.join(".gemini"), PathBuf::from);
        let cursor_home = std::env::var_os("CURSOR_CONFIG_DIR")
            .map_or_else(|| home.join(".cursor"), PathBuf::from);
        Ok(Self {
            home,
            codex_home,
            claude_home,
            config_home,
            qwen_home,
            gemini_home,
            cursor_home,
        })
    }

    /// Build a manager whose every client path is rooted below `home`.
    #[must_use]
    pub fn isolated(home: &Path) -> Self {
        Self {
            home: home.to_path_buf(),
            codex_home: home.join(".codex"),
            claude_home: home.join(".claude"),
            config_home: home.join(".config"),
            qwen_home: home.join(".qwen"),
            gemini_home: home.join(".gemini"),
            cursor_home: home.join(".cursor"),
        }
    }

    #[must_use]
    pub fn config_path(&self, client: ClientKind) -> PathBuf {
        match client {
            ClientKind::Codex => self.codex_home.join("config.toml"),
            ClientKind::ClaudeCode => self.claude_home.join("settings.json"),
            ClientKind::Cursor => self.cursor_home.join("cli-config.json"),
            ClientKind::GeminiCli => self.gemini_home.join("settings.json"),
            ClientKind::GrokCli => self.home.join(".grok/user-settings.json"),
            ClientKind::Opencode => self.config_home.join("opencode/opencode.json"),
            ClientKind::QwenCode => self.qwen_home.join("settings.json"),
            ClientKind::Agent => self.config_home.join("link-assistant-agent/opencode.json"),
        }
    }

    /// Ownership marker used to make a managed configuration reversible.
    #[must_use]
    pub fn ownership_marker_path(&self, client: ClientKind) -> Option<PathBuf> {
        match client {
            ClientKind::Codex => Some(self.codex_home.join(OWNERSHIP_MARKER)),
            ClientKind::ClaudeCode => Some(self.claude_home.join(OWNERSHIP_MARKER)),
            ClientKind::Opencode | ClientKind::Agent => Some(
                self.config_path(client)
                    .parent()
                    .expect("client config has a parent")
                    .join(OWNERSHIP_MARKER),
            ),
            ClientKind::QwenCode => Some(self.qwen_home.join(OWNERSHIP_MARKER)),
            ClientKind::Cursor | ClientKind::GeminiCli | ClientKind::GrokCli => None,
        }
    }

    pub fn status(&self, client: ClientKind) -> Result<ClientStatus, ClientError> {
        let path = self.config_path(client);
        let base_url = match client {
            ClientKind::Codex => read_codex_base_url(&path)?,
            ClientKind::ClaudeCode => read_claude_base_url(&path)?,
            ClientKind::Opencode | ClientKind::Agent => read_json_provider_base_url(&path)?,
            ClientKind::QwenCode => read_qwen_base_url(&path)?,
            ClientKind::GrokCli => std::env::var(GROK_BASE_ENV).ok(),
            ClientKind::Cursor | ClientKind::GeminiCli => None,
        };
        let token_env = client.token_env();
        Ok(ClientStatus {
            client: client.to_string(),
            installed: command_exists(client.command()),
            configured: base_url.is_some(),
            config_path: path,
            dialect: client.dialect(),
            base_url,
            token_env,
            token_env_set: token_env.is_some_and(|name| std::env::var_os(name).is_some()),
        })
    }

    pub(crate) fn setup(
        &self,
        client: ClientKind,
        base_url: &str,
        models: &[RouterModel],
    ) -> Result<SetupResult, ClientError> {
        if let Some(limitation) = client.setup_limitation() {
            return Err(ClientError::message(limitation));
        }
        let base_url = normalize_base_url(base_url)?;
        match client {
            ClientKind::Codex => self.setup_codex(&base_url),
            ClientKind::ClaudeCode => self.setup_claude(&base_url),
            ClientKind::Opencode | ClientKind::Agent => {
                self.setup_json_provider(client, &base_url, models)
            }
            ClientKind::QwenCode => self.setup_qwen(&base_url, models),
            ClientKind::GrokCli => Ok(unchanged(self.config_path(client))),
            ClientKind::Cursor | ClientKind::GeminiCli => unreachable!(),
        }
    }

    /// Read the authenticated model catalog used by setup and doctor.
    pub(crate) async fn catalog(
        &self,
        base_url: &str,
        token: &str,
    ) -> Result<Vec<RouterModel>, ClientError> {
        let base_url = normalize_base_url(base_url)?;
        let url = models_url(&base_url);
        let response = reqwest::Client::new()
            .get(&url)
            .bearer_auth(token)
            .timeout(Duration::from_secs(15))
            .send()
            .await
            .map_err(|error| {
                ClientError::message(format!("router catalog is not reachable at {url}: {error}"))
            })?;
        let code = response.status();
        let response_body = response.text().await.unwrap_or_default();
        if !code.is_success() {
            return Err(ClientError::message(format!(
                "router catalog request failed at {url} ({code}): {}",
                compact_body(&response_body)
            )));
        }
        let catalog: RouterCatalog = serde_json::from_str(&response_body).map_err(|error| {
            ClientError::message(format!("router returned an invalid model catalog: {error}"))
        })?;
        let mut models = catalog
            .data
            .into_iter()
            .filter(|model| !model.id.trim().is_empty())
            .collect::<Vec<_>>();
        models.sort_by(|left, right| {
            left.id
                .cmp(&right.id)
                .then_with(|| left.owned_by.cmp(&right.owned_by))
        });
        models.dedup_by(|left, right| left.id == right.id && left.owned_by == right.owned_by);
        if models.is_empty() {
            return Err(ClientError::message(
                "router catalog contains no models from healthy subscriptions",
            ));
        }
        Ok(models)
    }

    pub fn remove(&self, client: ClientKind) -> Result<SetupResult, ClientError> {
        match client {
            ClientKind::Codex => self.remove_codex(),
            ClientKind::ClaudeCode => self.remove_claude(),
            ClientKind::Opencode | ClientKind::Agent => self.remove_json_provider(client),
            ClientKind::QwenCode => self.remove_qwen(),
            ClientKind::GrokCli | ClientKind::Cursor | ClientKind::GeminiCli => {
                Ok(unchanged(self.config_path(client)))
            }
        }
    }

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
        let path = directory.join(format!("{client}.env"));
        let mut contents = String::new();
        if let Some(base_url_env) = client.base_url_env() {
            writeln!(
                &mut contents,
                "export {base_url_env}={}",
                shell_quote(&format!("{}/v1", base_url.trim_end_matches('/')))
            )
            .expect("writing to a String cannot fail");
        }
        writeln!(&mut contents, "export {token_env}={}", shell_quote(token))
            .expect("writing to a String cannot fail");
        atomic_write(&path, contents.as_bytes())?;
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            fs::set_permissions(&path, fs::Permissions::from_mode(0o600))?;
        }
        Ok(path)
    }

    /// Exercise the same URL and token variable configured for the client.
    pub async fn doctor(&self, client: ClientKind) -> Result<String, ClientError> {
        if let Some(limitation) = client.setup_limitation() {
            return Err(ClientError::message(limitation));
        }
        let status = self.status(client)?;
        let base_url = status.base_url.ok_or_else(|| {
            ClientError::message(format!(
                "{} is not configured; run `clients setup {client}`",
                client.display_name()
            ))
        })?;
        let token_env = client
            .token_env()
            .ok_or_else(|| ClientError::message("client has no router token environment"))?;
        let token = std::env::var(token_env).map_err(|_| {
            ClientError::message(format!(
                "{token_env} is unset; source the credential file printed by `clients setup {client}`"
            ))
        })?;
        let catalog = self.catalog(&base_url, &token).await?;
        let model = doctor_model(client, &catalog)?;
        let (url, body) = match client {
            ClientKind::Codex => (
                format!("{}/responses", base_url.trim_end_matches('/')),
                json!({"model":model, "input":"Reply OK"}),
            ),
            ClientKind::ClaudeCode => (
                format!("{}/v1/messages", base_url.trim_end_matches('/')),
                json!({
                    "model":model,
                    "max_tokens":1,
                    "messages":[{"role":"user", "content":"Reply OK"}]
                }),
            ),
            ClientKind::GrokCli
            | ClientKind::Opencode
            | ClientKind::QwenCode
            | ClientKind::Agent => (
                format!("{}/chat/completions", base_url.trim_end_matches('/')),
                json!({
                    "model":model,
                    "messages":[{"role":"user", "content":"Reply OK"}]
                }),
            ),
            ClientKind::Cursor | ClientKind::GeminiCli => unreachable!(),
        };
        let response = reqwest::Client::new()
            .post(&url)
            .bearer_auth(token)
            .json(&body)
            .timeout(Duration::from_secs(30))
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
                "router rejected {token_env} ({code}); the token is invalid, expired, or revoked"
            )));
        }
        if code.as_u16() == 503 {
            return Err(ClientError::message(format!(
                "router reached, but its upstream credential is unavailable ({code}): {}",
                compact_body(&response_body)
            )));
        }
        if code.as_u16() == 404 {
            return Err(ClientError::message(format!(
                "router reached, but catalog model '{model}' is unavailable ({code}): {}",
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

fn models_url(base_url: &str) -> String {
    let base_url = base_url.trim_end_matches('/');
    if base_url.ends_with("/v1") {
        format!("{base_url}/models")
    } else {
        format!("{base_url}/v1/models")
    }
}

fn doctor_model(client: ClientKind, catalog: &[RouterModel]) -> Result<&str, ClientError> {
    let required_owner = match client {
        ClientKind::Codex => Some("openai"),
        ClientKind::ClaudeCode => Some("anthropic"),
        ClientKind::GrokCli | ClientKind::Opencode | ClientKind::QwenCode | ClientKind::Agent => {
            None
        }
        ClientKind::Cursor | ClientKind::GeminiCli => unreachable!(),
    };
    catalog
        .iter()
        .find(|model| required_owner.is_none_or(|owner| model.owned_by == owner))
        .map(|model| model.id.as_str())
        .ok_or_else(|| {
            let subscription = required_owner.unwrap_or("compatible");
            ClientError::message(format!(
                "router catalog has no model for the {subscription} subscription"
            ))
        })
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

fn shell_quote(value: &str) -> String {
    format!("'{}'", value.replace('\'', "'\\''"))
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
