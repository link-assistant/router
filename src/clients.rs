//! Safe local configuration for agentic CLI clients.
//!
//! The writer deliberately owns only one Codex provider table and one Claude
//! Code environment key. Unknown settings are parsed and merged, never
//! replaced wholesale, and every changed existing file is backed up first.

use std::fmt::{self, Write as _};
use std::fs;
use std::path::{Path, PathBuf};

use clap::ValueEnum;
use serde::Serialize;
use serde_json::{Value, json};
use toml_edit::{DocumentMut, Item, Table, value};

mod analysis;
mod catalog;
pub mod credentials;
pub(crate) mod doctor;
mod files;
mod json_config;
mod repair;

pub use analysis::{ClientConfigAnalysis, ConfigSource, ObservedFile, OwnershipState};
pub use repair::{RepairPlan, RepairResult};

pub(crate) use catalog::RouterModel;
use catalog::doctor_model;
pub use catalog::{select_model, unavailable as model_unavailable, usable_models};
pub use credentials::{ManagedCredential, TokenSource};
pub(crate) use doctor::require_claude_gateway_version;
use files::{
    atomic_write, claude_marker, read_codex_marker, read_environment_value, read_or_empty,
    unchanged, write_claude_marker, write_codex_marker, write_if_changed,
};
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

/// Catalog owner whose models suit an `OpenAI`-dialect client.
pub const OPENAI_MODEL_OWNER: &str = "openai";
/// Catalog owner whose models suit an Anthropic-dialect client.
pub const ANTHROPIC_MODEL_OWNER: &str = "anthropic";
/// Catalog owner the server labels a Gemini subscription with.
pub const GOOGLE_MODEL_OWNER: &str = "google";
/// Catalog owner the server labels a Qwen subscription with.
pub const QWEN_MODEL_OWNER: &str = "qwen";
/// Catalog owner for personal z.ai Coding Plan models.
pub const ZAI_MODEL_OWNER: &str = "z.ai";
pub const DEFAULT_OPENAI_REASONING_EFFORT: &str = "xhigh";
/// Output budget for the `clients doctor` reachability probe.
///
/// "Reply OK" needs a handful of tokens, and a 200 with any body proves what
/// `doctor` is asking. The floor is the right setting for a connectivity check
/// (issue #309).
const DOCTOR_MAX_TOKENS: u32 = 64;
pub const DEFAULT_ANTHROPIC_REASONING_EFFORT: &str = "high";

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
    /// Catalog owners whose models suit this client, best first.
    ///
    /// The router holds no default model *name*: the concrete id is chosen from
    /// the account's live catalog at execution time (issue #192). Empty means
    /// the client accepts any advertised model.
    ///
    /// A single owner used to be declared per client, and two of the eight
    /// named the wrong vendor: Gemini CLI and Qwen Code were declared
    /// `OpenAI` clients, so a Google model could never be selected for the Gemini
    /// CLI and a Qwen model never for Qwen Code. On a deployment serving only a
    /// Gemini subscription the run aborted with a message reading as though
    /// the router were short of models (issue #301).
    pub model_owners: &'static [&'static str],
    /// Whether a model of another owner is refused rather than substituted.
    ///
    /// True where substituting is known to mislead: launching Claude Code on
    /// an `OpenAI` model made the client blame its own model name rather than
    /// the lapsed subscription (issue #225). False for the generic
    /// `OpenAI`-dialect gateways, which the router routes for whatever it
    /// serves — that is the rule `clients doctor` already used, and it is now
    /// the only one.
    pub strict_owner: bool,
    pub default_reasoning_effort: &'static str,
    pub model_arg: Option<&'static str>,
    pub non_interactive_arg: Option<&'static str>,
    /// Other spellings of the same mode the client already accepts.
    ///
    /// The comparison used to be exact against one string, so Claude Code's
    /// own `-p` was not recognised as the `--print` it is and both ended up on
    /// the command line (issue #297).
    pub non_interactive_aliases: &'static [&'static str],
    /// Whether the mode argument takes the prompt as its value.
    ///
    /// `-p` for gemini, grok and qwen and `--prompt` for agent do; `--print`
    /// and the `exec`/`run` subcommands do not. Injecting one immediately
    /// before a user's *flag* put that flag where the prompt value belongs,
    /// which is a silent change of meaning rather than an error (issue #297).
    pub non_interactive_arg_takes_a_value: bool,
    pub isolation: ClientIsolation,
    pub setup_limitation: Option<&'static str>,
}

/// Documented local clients, including clients whose vendor gates prevent setup.
/// A supported client, named as the user's own shell names it.
///
/// The canonical value of each variant is the **installed command**, because
/// that is the name the user typed to install the tool and types to run it. The
/// descriptive long forms (`claude-code`, `qwen-code`, …) are kept as aliases so
/// existing scripts and documented commands keep working.
///
/// Before this, the advertised names were the descriptive ones while the short
/// names existed only as invisible aliases — so `--help` and the `invalid value`
/// error taught a name the user's shell does not have (issue #220). The
/// invariant that keeps the two in step is asserted in the tests below: every
/// variant's canonical string equals its [`ClientIntegration::command`].
#[derive(Clone, Copy, Debug, Eq, Hash, PartialEq, ValueEnum)]
pub enum ClientKind {
    Codex,
    #[value(name = "claude", alias = "claude-code")]
    ClaudeCode,
    #[value(name = "cursor-agent", alias = "cursor")]
    Cursor,
    #[value(name = "gemini", alias = "gemini-cli")]
    GeminiCli,
    #[value(name = "grok", alias = "grok-cli")]
    GrokCli,
    Opencode,
    #[value(name = "qwen", alias = "qwen-code")]
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
        endpoint_suffix: crate::route_contract::service_base_path(
            crate::route_contract::ServiceKind::Codex,
        ),
        model_owners: &[OPENAI_MODEL_OWNER, ZAI_MODEL_OWNER],
        strict_owner: true,
        default_reasoning_effort: DEFAULT_OPENAI_REASONING_EFFORT,
        model_arg: Some("--model"),
        non_interactive_arg: Some("exec"),
        non_interactive_aliases: &[],
        non_interactive_arg_takes_a_value: false,
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
        endpoint_suffix: crate::route_contract::service_base_path(
            crate::route_contract::ServiceKind::Anthropic,
        ),
        model_owners: &[ANTHROPIC_MODEL_OWNER, ZAI_MODEL_OWNER],
        strict_owner: true,
        default_reasoning_effort: DEFAULT_ANTHROPIC_REASONING_EFFORT,
        model_arg: Some("--model"),
        non_interactive_arg: Some("--print"),
        non_interactive_aliases: &["-p"],
        non_interactive_arg_takes_a_value: false,
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
        model_owners: &[],
        strict_owner: false,
        default_reasoning_effort: "",
        model_arg: None,
        non_interactive_arg: None,
        non_interactive_aliases: &[],
        non_interactive_arg_takes_a_value: false,
        isolation: ClientIsolation::Unsupported,
        setup_limitation: Some(
            "Cursor CLI accepts CURSOR_API_ENDPOINT, but speaks Connect-RPC over an unversioned private agent.v1/aiserver.v1 protocol rather than a supported vendor API; native Cursor routing is not implemented. See docs/use-cases/cli-cursor.md for the support tier, the scoped adapter work, and the opt-in TLS-proxy route",
        ),
    },
    ClientIntegration {
        kind: ClientKind::GeminiCli,
        name: "Gemini CLI",
        command: "gemini",
        dialect: "Gemini native",
        token_env: Some("GEMINI_API_KEY"),
        base_url_env: Some("GOOGLE_GEMINI_BASE_URL"),
        endpoint_suffix: crate::route_contract::service_base_path(
            crate::route_contract::ServiceKind::Gemini,
        ),
        model_owners: &[GOOGLE_MODEL_OWNER],
        strict_owner: false,
        default_reasoning_effort: DEFAULT_OPENAI_REASONING_EFFORT,
        model_arg: Some("--model"),
        non_interactive_arg: Some("-p"),
        non_interactive_aliases: &["--prompt"],
        non_interactive_arg_takes_a_value: true,
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
        endpoint_suffix: crate::route_contract::service_base_path(
            crate::route_contract::ServiceKind::OpenAi,
        ),
        model_owners: &[],
        strict_owner: false,
        default_reasoning_effort: DEFAULT_OPENAI_REASONING_EFFORT,
        model_arg: Some("--model"),
        non_interactive_arg: Some("-p"),
        non_interactive_aliases: &["--prompt"],
        non_interactive_arg_takes_a_value: true,
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
        endpoint_suffix: crate::route_contract::service_base_path(
            crate::route_contract::ServiceKind::OpenAi,
        ),
        model_owners: &[],
        strict_owner: false,
        default_reasoning_effort: DEFAULT_OPENAI_REASONING_EFFORT,
        model_arg: Some("--model"),
        non_interactive_arg: Some("run"),
        non_interactive_aliases: &[],
        non_interactive_arg_takes_a_value: false,
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
        endpoint_suffix: crate::route_contract::service_base_path(
            crate::route_contract::ServiceKind::Qwen,
        ),
        model_owners: &[QWEN_MODEL_OWNER],
        strict_owner: false,
        default_reasoning_effort: DEFAULT_OPENAI_REASONING_EFFORT,
        model_arg: Some("--model"),
        non_interactive_arg: Some("-p"),
        non_interactive_aliases: &["--prompt"],
        non_interactive_arg_takes_a_value: true,
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
        endpoint_suffix: crate::route_contract::service_base_path(
            crate::route_contract::ServiceKind::OpenAi,
        ),
        model_owners: &[],
        strict_owner: false,
        default_reasoning_effort: DEFAULT_OPENAI_REASONING_EFFORT,
        model_arg: Some("--model"),
        non_interactive_arg: Some("--prompt"),
        non_interactive_aliases: &["-p"],
        non_interactive_arg_takes_a_value: true,
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

    /// Parse a canonical client adapter name or one of its documented aliases.
    #[must_use]
    pub fn from_str_opt(value: &str) -> Option<Self> {
        match value.trim().to_ascii_lowercase().as_str() {
            "codex" => Some(Self::Codex),
            "claude" | "claude-code" => Some(Self::ClaudeCode),
            "cursor" | "cursor-agent" => Some(Self::Cursor),
            "gemini" | "gemini-cli" => Some(Self::GeminiCli),
            "grok" | "grok-cli" => Some(Self::GrokCli),
            "opencode" => Some(Self::Opencode),
            "qwen" | "qwen-code" => Some(Self::QwenCode),
            "agent" => Some(Self::Agent),
            _ => None,
        }
    }
}

impl ClientKind {
    /// The canonical name: the command the client installs as.
    ///
    /// This is the single source of the name every surface shows, so
    /// `clients list`, `--help` and the `invalid value` error cannot disagree
    /// (issue #220). It is asserted equal to [`ClientIntegration::command`] in
    /// the tests, which is the invariant that keeps them from drifting.
    #[must_use]
    pub const fn canonical_name(self) -> &'static str {
        self.integration().command
    }

    /// The name this client used before v0.91.0.
    ///
    /// Kept because it names files already on disk — the managed environment
    /// and credential-metadata paths are derived from the client name, so a
    /// rename alone would orphan an existing installation's `claude-code.env`
    /// rather than migrate it.
    #[must_use]
    pub const fn legacy_name(self) -> &'static str {
        match self {
            Self::ClaudeCode => "claude-code",
            Self::Cursor => "cursor",
            Self::GeminiCli => "gemini-cli",
            Self::GrokCli => "grok-cli",
            Self::Codex => "codex",
            Self::Opencode => "opencode",
            Self::QwenCode => "qwen-code",
            Self::Agent => "agent",
        }
    }
}

impl fmt::Display for ClientKind {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.pad(self.canonical_name())
    }
}

#[derive(Debug)]
pub struct ClientError(String);

impl ClientError {
    /// Build a diagnostic with credential-looking runs already removed.
    ///
    /// Every client diagnostic quotes something the router or an upstream sent
    /// back — a URL, a response body, a transport error — and any of those can
    /// carry the bearer token that was just used. Redacting here, at the single
    /// constructor, keeps that out of terminals, logs, and CI output.
    fn message(message: impl Into<String>) -> Self {
        Self(crate::login_url::redact_secrets(&message.into()))
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
        Self::message(error.to_string())
    }
}

impl From<serde_json::Error> for ClientError {
    fn from(error: serde_json::Error) -> Self {
        Self::message(error.to_string())
    }
}

/// Secret-free state returned by `clients list` and `clients show`.
#[derive(Clone, Debug, Serialize)]
pub struct ClientStatus {
    pub client: String,
    pub installed: bool,
    pub configured: bool,
    pub config_path: PathBuf,
    pub dialect: &'static str,
    pub base_url: Option<String>,
    pub token_env: Option<&'static str>,
    pub token_env_set: bool,
    /// Router ownership of the effective routing configuration.
    pub ownership_state: OwnershipState,
    /// Highest-precedence source which currently selects the endpoint.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub effective_source: Option<ConfigSource>,
    /// Routing-critical key names which disagree; values are never retained.
    pub conflicts: Vec<String>,
    /// Why this client's configuration could not be read, if it could not.
    ///
    /// A damaged file is a property of one row, not of the listing: propagating
    /// it ended the table at that client and silently hid every client after
    /// it, while the error named a *different* client than the one missing
    /// (issue #304).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub unreadable: Option<String>,
    /// Why the router cannot manage this client at all, if it cannot.
    ///
    /// `configured: false` is indistinguishable from a real answer for a
    /// client whose reader is a hardcoded `None` (issue #303).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub unsupported: Option<&'static str>,
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
    home: PathBuf,
    codex_home: PathBuf,
    claude_home: PathBuf,
    config_home: PathBuf,
    qwen_home: PathBuf,
    gemini_home: PathBuf,
    cursor_home: PathBuf,
    /// Whether ambient process environment may answer "is the token set?".
    ///
    /// An isolated root exists to prove a lifecycle without touching real user
    /// settings, so it must not report a variable exported in the calling shell
    /// as if the isolated setup had produced it.
    respect_environment: bool,
}

impl ClientManager {
    /// Resolve client directories, respecting the clients' own override vars.
    pub fn from_env() -> Result<Self, ClientError> {
        // An empty variable is unset, not configured: `Some("")` made every
        // path below relative to the working directory (issue #340). The
        // clients' own override variables get the same treatment, since a
        // harness that empties one means "do not use it".
        let directory = crate::env_paths::directory;
        let home = directory("HOME")
            .ok_or_else(|| ClientError::message("HOME is unset; cannot locate client configs"))?;
        let home = crate::env_paths::require_absolute(home, "the client home")
            .map_err(ClientError::message)?;
        let codex_home = directory("CODEX_HOME").unwrap_or_else(|| home.join(".codex"));
        let claude_home = directory("CLAUDE_CONFIG_DIR").unwrap_or_else(|| home.join(".claude"));
        let config_home = directory("XDG_CONFIG_HOME").unwrap_or_else(|| home.join(".config"));
        let qwen_home = directory("QWEN_HOME").unwrap_or_else(|| home.join(".qwen"));
        let gemini_home = directory("GEMINI_CLI_HOME").unwrap_or_else(|| home.join(".gemini"));
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
            respect_environment: true,
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
            respect_environment: false,
        }
    }

    /// Read a process environment variable unless this root is isolated.
    pub(super) fn environment_var(&self, name: &str) -> Option<String> {
        self.respect_environment
            .then(|| std::env::var(name).ok())
            .flatten()
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

    #[must_use]
    pub fn environment_path(&self, client: ClientKind) -> PathBuf {
        self.managed_path(client, "env")
    }

    /// The managed file for `client`, preferring the canonical name but
    /// honouring a file already written under the pre-v0.91.0 name.
    ///
    /// The client names became the real command names in v0.91.0 (issue #220),
    /// and these paths are derived from the name — so without this an existing
    /// installation's `claude-code.env` would simply stop being found, and the
    /// user would be told to run a setup they had already run.
    fn managed_path(&self, client: ClientKind, extension: &str) -> PathBuf {
        let directory = self.config_home.join("link-assistant-router/clients");
        let canonical = directory.join(format!("{}.{extension}", client.canonical_name()));
        if canonical.exists() {
            return canonical;
        }
        let legacy = directory.join(format!("{}.{extension}", client.legacy_name()));
        if legacy.exists() {
            return legacy;
        }
        canonical
    }

    /// Where the secret-free record of the managed credential is kept.
    #[must_use]
    pub fn credential_metadata_path(&self, client: ClientKind) -> PathBuf {
        self.managed_path(client, "credential.json")
    }

    /// Read the credential record written by the last `clients setup`.
    pub fn credential_metadata(
        &self,
        client: ClientKind,
    ) -> Result<Option<ManagedCredential>, ClientError> {
        credentials::read(&self.credential_metadata_path(client))
    }

    /// Read the token from Router's private managed environment file.
    pub(crate) fn managed_token(&self, client: ClientKind) -> Result<Option<String>, ClientError> {
        let Some(name) = client.token_env() else {
            return Ok(None);
        };
        read_environment_value(&self.environment_path(client), name)
    }

    /// Record which token the managed environment file now holds.
    pub fn write_credential_metadata(
        &self,
        client: ClientKind,
        credential: &ManagedCredential,
    ) -> Result<(), ClientError> {
        credentials::write(&self.credential_metadata_path(client), credential)
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

    /// What this machine holds for `client`, whatever shape its files are in.
    ///
    /// Never fails on a damaged configuration: the reason is carried in the
    /// row instead, so one hand-edited file cannot take the rest of the
    /// listing away from the reader (issue #304).
    pub(super) fn raw_status(&self, client: ClientKind) -> Result<ClientStatus, ClientError> {
        let path = self.config_path(client);
        let read = match client {
            ClientKind::Codex => read_codex_base_url(&path),
            ClientKind::ClaudeCode => read_claude_base_url(&path),
            ClientKind::Opencode | ClientKind::Agent => read_json_provider_base_url(&path),
            // Gemini and Grok are configured by the environment rather than a
            // file the router owns. Grok has always had a reader for it; a
            // hardcoded `None` for Gemini reported "not configured" whether it
            // was or not, so `clients list` and `clients show gemini` contradicted
            // a setup that had just succeeded (issue #303). `clients doctor` still
            // refuses Gemini earlier, on its `setup_limitation`: the probe has no
            // shape for it.
            ClientKind::QwenCode => read_qwen_base_url(&path),
            ClientKind::GeminiCli | ClientKind::GrokCli => {
                let name = client
                    .base_url_env()
                    .expect("environment-configured clients name their variable");
                Ok(self.environment_var(name).or_else(|| {
                    read_environment_value(&self.environment_path(client), name)
                        .ok()
                        .flatten()
                }))
            }
            ClientKind::Cursor => Ok(None),
        };
        let (base_url, unreadable) = match read {
            Ok(base_url) => (base_url, None),
            Err(error) => (None, Some(error.to_string())),
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
            token_env_set: token_env.is_some_and(|name| {
                self.environment_var(name).is_some()
                    || read_environment_value(&self.environment_path(client), name)
                        .ok()
                        .flatten()
                        .is_some()
            }),
            ownership_state: OwnershipState::Unconfigured,
            effective_source: None,
            conflicts: Vec::new(),
            unreadable,
            unsupported: client.setup_limitation(),
        })
    }

    /// Analyze endpoint ownership and routing-critical precedence without
    /// retaining any credential value.
    pub fn analyze(&self, client: ClientKind) -> Result<ClientConfigAnalysis, ClientError> {
        analysis::analyze_client(self, client)
    }

    /// What this machine holds for `client`, including explicit ownership.
    pub fn status(&self, client: ClientKind) -> Result<ClientStatus, ClientError> {
        let mut status = self.raw_status(client)?;
        let analysis = self.analyze(client)?;
        status.configured = analysis.state == OwnershipState::ManagedIntact;
        status.base_url.clone_from(&analysis.safe_origin);
        status.ownership_state = analysis.state;
        status.effective_source = analysis.effective_source;
        status.conflicts = analysis.conflicts;
        Ok(status)
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
        let endpoint = format!(
            "{}{}",
            base_url.trim_end_matches('/'),
            client.integration().endpoint_suffix
        );
        match client {
            ClientKind::Codex => self.setup_codex(&endpoint),
            ClientKind::ClaudeCode => self.setup_claude(&endpoint, models),
            ClientKind::Opencode | ClientKind::Agent => {
                self.setup_json_provider(client, &endpoint, models)
            }
            ClientKind::QwenCode => self.setup_qwen(&endpoint, models),
            ClientKind::GrokCli => Ok(unchanged(self.config_path(client))),
            ClientKind::Cursor | ClientKind::GeminiCli => unreachable!(),
        }
    }

    pub fn remove(&self, client: ClientKind) -> Result<SetupResult, ClientError> {
        let mut result = match client {
            ClientKind::Codex => self.remove_codex(),
            ClientKind::ClaudeCode => self.remove_claude(),
            ClientKind::Opencode | ClientKind::Agent => self.remove_json_provider(client),
            ClientKind::QwenCode => self.remove_qwen(),
            ClientKind::GrokCli | ClientKind::Cursor | ClientKind::GeminiCli => {
                Ok(unchanged(self.config_path(client)))
            }
        }?;
        let environment = self.environment_path(client);
        if environment.exists() {
            fs::remove_file(&environment)?;
            if !result.changed {
                result.path = environment;
                result.changed = true;
            }
        }
        // The credential record only describes a secret that no longer exists
        // locally, so it goes last and never outlives the environment file.
        credentials::remove(&self.credential_metadata_path(client))?;
        Ok(result)
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
                shell_quote(&endpoint)
            )
            .expect("writing to a String cannot fail");
        }
        writeln!(&mut contents, "export {token_env}={}", shell_quote(token))
            .expect("writing to a String cannot fail");
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
            use std::os::unix::fs::PermissionsExt;
            fs::set_permissions(&path, fs::Permissions::from_mode(0o600))?;
        }
        Ok(path)
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
        provider.insert("base_url", value(base_url));
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

    fn setup_claude(
        &self,
        base_url: &str,
        _models: &[RouterModel],
    ) -> Result<SetupResult, ClientError> {
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
        let marker_path = self.claude_home.join(OWNERSHIP_MARKER);
        let existing_marker = claude_marker(&marker_path)?;
        // Recorded before it is replaced, so removal can put it back — the
        // mechanism `setup_codex` already uses for `model_provider` (#302).
        let previous = env
            .get(CLAUDE_BASE_ENV)
            .and_then(Value::as_str)
            .map(str::to_string)
            .filter(|previous| previous != base_url);
        env.insert(CLAUDE_BASE_ENV.into(), Value::String(base_url.into()));
        let mut managed_gateway_env = Vec::new();
        let mut set_managed = |key: &str, managed: &str| {
            let recorded_previous = existing_marker.as_ref().and_then(|(_, _, entries)| {
                entries
                    .iter()
                    .find(|(recorded, _, _)| recorded == key)
                    .map(|(_, _, previous)| previous.clone())
            });
            let previous = recorded_previous
                .unwrap_or_else(|| env.get(key).and_then(Value::as_str).map(str::to_string));
            env.insert(key.into(), Value::String(managed.into()));
            managed_gateway_env.push((key.to_string(), Some(managed.to_string()), previous));
        };
        set_managed("CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY", "1");
        set_managed("CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC", "0");
        let cleared = [
            "ANTHROPIC_AUTH_TOKEN",
            "ANTHROPIC_API_KEY",
            "ANTHROPIC_MODEL",
            "ANTHROPIC_DEFAULT_OPUS_MODEL",
            "ANTHROPIC_DEFAULT_SONNET_MODEL",
            "ANTHROPIC_DEFAULT_HAIKU_MODEL",
            "CLAUDE_CODE_SUBAGENT_MODEL",
        ];
        for key in cleared {
            let recorded_previous = existing_marker.as_ref().and_then(|(_, _, entries)| {
                entries
                    .iter()
                    .find(|(recorded, _, _)| recorded == key)
                    .and_then(|(_, _, previous)| previous.clone())
            });
            let previous = recorded_previous
                .or_else(|| env.get(key).and_then(Value::as_str).map(str::to_string));
            env.remove(key);
            managed_gateway_env.push((key.to_string(), None, previous));
        }
        let rendered = format!("{}\n", serde_json::to_string_pretty(&document)?);
        let result = write_if_changed(&path, &source, &rendered)?;
        // A marker already present names the value the *first* takeover
        // replaced; a second configure must not overwrite it with its own URL.
        let previous = match claude_marker(&marker_path)? {
            Some((_, recorded, _)) => recorded,
            None => previous,
        };
        write_claude_marker(
            &marker_path,
            base_url,
            previous.as_deref(),
            &managed_gateway_env,
        )?;
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
        let Some((managed_url, previous_url, gateway_env)) = claude_marker(&marker_path)? else {
            return Ok(unchanged(path));
        };
        let mut document: Value = serde_json::from_str(&source).map_err(|error| {
            ClientError::message(format!("invalid JSON in {}: {error}", path.display()))
        })?;
        let owns_current_url = document
            .get("env")
            .and_then(|env| env.get(CLAUDE_BASE_ENV))
            .and_then(Value::as_str)
            == Some(managed_url.as_str());
        if let Some(env) = document.get_mut("env").and_then(Value::as_object_mut) {
            if owns_current_url {
                match previous_url.as_deref() {
                    // Restore what the takeover replaced rather than deleting the
                    // key: the value was the user's, not the router's (#302).
                    Some(previous) => {
                        env.insert(CLAUDE_BASE_ENV.into(), Value::String(previous.into()));
                        println!("restored {CLAUDE_BASE_ENV}={previous}");
                    }
                    None => {
                        env.remove(CLAUDE_BASE_ENV);
                    }
                }
            }
            for (key, managed, previous) in gateway_env {
                let owns_current = managed.as_deref().map_or_else(
                    || !env.contains_key(&key),
                    |managed| env.get(&key).and_then(Value::as_str) == Some(managed),
                );
                if !owns_current {
                    continue;
                }
                if let Some(previous) = previous {
                    env.insert(key, Value::String(previous));
                } else {
                    env.remove(&key);
                }
            }
        }
        let rendered = format!("{}\n", serde_json::to_string_pretty(&document)?);
        let result = write_if_changed(&path, &source, &rendered)?;
        if marker_path.exists() {
            fs::remove_file(marker_path)?;
        }
        Ok(result)
    }
}

mod util;
use util::{
    command_exists, compact_body, normalize_base_url, read_claude_base_url, read_codex_base_url,
    shell_quote,
};
#[cfg(test)]
#[path = "clients_tests.rs"]
mod tests;
