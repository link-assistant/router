//! Declarative `router deploy --config <file>` (issues #679, #680, #683).
//!
//! Downstreams wrapped `router deploy` in their own scripts only because a few
//! settings could not be expressed through it: runtime environment for the
//! backend, an instance name so deployments can share a host, SSH transport
//! options, limits for the tokens deploy issues, provider keys to rotate in
//! the candidate, and what verification must prove before cutover. This
//! module reads all of them from one TOML file. Command-line flags override
//! the file, key by key.
//!
//! Secret values never appear in the file or in argv: the file and the flags
//! name a source (`env:VAR` or `file:PATH`), and the value is read from it at
//! run time. A [`ResolvedDeploy`] holds the values and redacts them from its
//! `Debug` output.

use std::collections::BTreeMap;
use std::fmt;
use std::path::{Path, PathBuf};

use serde::Serialize;
use toml_edit::{DocumentMut, Item, TableLike};

#[path = "deploy_config_hmac.rs"]
mod hmac;
#[path = "deploy_config_merge.rs"]
mod merge;
#[path = "deploy_config_paths.rs"]
mod paths;

pub use hmac::{env_fingerprint, hmac_sha256_hex, value_fingerprint};
pub use merge::{Merged, merge};
pub use paths::expand_home;

/// Names the backend owns itself, or which select its security posture.
///
/// Passing them through would let a config file silently replace the
/// deployment's own signing secret, data directory or listener layout.
const RESERVED_ENV: &[&str] = &[
    "TOKEN_SECRET",
    "DATA_DIR",
    "STORAGE_POLICY",
    "HOME",
    "PATH",
    "USER",
    "SHELL",
    "PWD",
    "IFS",
    "CLAUDE_CODE_HOME",
    "CLAUDE_CONFIG_DIR",
    "LISTENERS",
    "ROUTER_HOST",
    "ROUTER_PORT",
    "NODE_EXTRA_CA_CERTS",
];
/// Prefixes reserved for the deployment machinery and its verifier.
const RESERVED_ENV_PREFIXES: &[&str] = &["ROUTER_DEPLOY_", "TLS_", "VERIFY_", "PRESERVATION_"];

/// Where a secret value comes from. The value itself never travels in argv.
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum SecretSource {
    /// The caller's environment variable of this name.
    Env(String),
    /// The contents of this file, minus one trailing newline.
    File(PathBuf),
}

impl SecretSource {
    /// Parse `env:VAR` or `file:PATH`. A bare `env` means `env:<default_env>`.
    ///
    /// # Errors
    ///
    /// Refuses anything else, so a literal value can never be mistaken for a
    /// source and end up in a shell history or a process listing.
    pub fn parse(
        spec: &str,
        default_env: Option<&str>,
        base: Option<&Path>,
    ) -> Result<Self, String> {
        if spec == "env" {
            return default_env
                .map(|name| Self::Env(name.to_string()))
                .ok_or_else(|| "`env` needs a variable name here: use env:VAR".to_string());
        }
        if let Some(name) = spec.strip_prefix("env:") {
            validate_variable(name)?;
            return Ok(Self::Env(name.to_string()));
        }
        if let Some(path) = spec.strip_prefix("file:") {
            if path.is_empty() {
                return Err("file: needs a path".to_string());
            }
            let path = PathBuf::from(path);
            let path = match base {
                Some(base) if path.is_relative() => base.join(path),
                _ => path,
            };
            return Ok(Self::File(path));
        }
        Err(
            "a value source must be env:VAR or file:PATH; literal values are refused so they \
             never reach argv or a config file"
                .to_string(),
        )
    }

    /// Read the value from its source.
    ///
    /// # Errors
    ///
    /// Names the source (never a value) when it is missing or unreadable.
    pub fn read(&self) -> Result<String, String> {
        let value = match self {
            Self::Env(name) => std::env::var(name)
                .map_err(|_| format!("environment variable {name} is not set or not UTF-8"))?,
            Self::File(path) => {
                let mut text = std::fs::read_to_string(path)
                    .map_err(|error| format!("could not read {}: {error}", path.display()))?;
                if text.ends_with('\n') {
                    text.pop();
                    if text.ends_with('\r') {
                        text.pop();
                    }
                }
                text
            }
        };
        if value.contains(['\n', '\r', '\0']) {
            return Err(format!(
                "the value from {} contains a newline or NUL byte",
                self.describe()
            ));
        }
        Ok(value)
    }

    /// The source, for messages. Never the value.
    #[must_use]
    pub fn describe(&self) -> String {
        match self {
            Self::Env(name) => format!("env:{name}"),
            Self::File(path) => format!("file:{}", path.display()),
        }
    }
}

fn validate_variable(name: &str) -> Result<(), String> {
    let mut bytes = name.bytes();
    let valid = bytes
        .next()
        .is_some_and(|first| first.is_ascii_uppercase() || first == b'_')
        && bytes.all(|byte| byte.is_ascii_uppercase() || byte.is_ascii_digit() || byte == b'_');
    if valid {
        Ok(())
    } else {
        Err(format!(
            "`{name}` is not an environment variable name ([A-Z_][A-Z0-9_]*)"
        ))
    }
}

/// Validate a runtime environment name passed through to the backend.
///
/// # Errors
///
/// Refuses malformed names and names the deployment owns itself.
pub fn validate_env_name(name: &str) -> Result<(), String> {
    validate_variable(name)?;
    if RESERVED_ENV.contains(&name)
        || RESERVED_ENV_PREFIXES
            .iter()
            .any(|prefix| name.starts_with(prefix))
    {
        return Err(format!(
            "`{name}` is set by the deployment itself and cannot be passed through"
        ));
    }
    Ok(())
}

/// One runtime environment variable passed through by name.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct EnvSpec {
    /// The name the backend sees.
    pub name: String,
    /// Where its value comes from.
    pub source: SecretSource,
}

impl EnvSpec {
    /// Parse `NAME` (from the caller's `NAME`) or `NAME=env:VAR|file:PATH`.
    ///
    /// # Errors
    ///
    /// Refuses reserved or malformed names and literal values.
    pub fn parse(flag: &str, base: Option<&Path>) -> Result<Self, String> {
        let (name, spec) = flag.split_once('=').unwrap_or((flag, "env"));
        validate_env_name(name)?;
        Ok(Self {
            name: name.to_string(),
            source: SecretSource::parse(spec, Some(name), base)
                .map_err(|error| format!("--env {name}: {error}"))?,
        })
    }
}

/// SSH transport settings for `--server`.
#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct SshSettings {
    /// `ssh -p`.
    pub port: Option<u16>,
    /// `ssh -i`, with `IdentitiesOnly=yes`.
    pub identity_file: Option<PathBuf>,
    /// Pinned `known_hosts` lines; only these keys are trusted.
    pub known_hosts: Vec<String>,
    /// A pinned `known_hosts` file; only its keys are trusted.
    pub known_hosts_file: Option<PathBuf>,
    /// `ServerAliveInterval`, in seconds.
    pub keepalive_secs: Option<u32>,
    /// Overall session deadline, in seconds.
    pub deadline_secs: Option<u64>,
}

/// Limits for the client token a deployment issues.
#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize)]
pub struct TokenPolicy {
    /// Lifetime of the issued token.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ttl_hours: Option<i64>,
    /// Cap on upstream requests.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub max_requests: Option<u64>,
    /// Cap on input plus output tokens.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub max_tokens: Option<u64>,
    /// Requests admitted per minute.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub rate_limit_per_minute: Option<u64>,
    /// Exact model ids the token may request; empty means any.
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub allowed_models: Vec<String>,
}

impl TokenPolicy {
    /// Whether any limit is configured.
    #[must_use]
    pub fn is_limited(&self) -> bool {
        self != &Self::default()
    }

    /// `router tokens issue` arguments expressing this policy.
    #[must_use]
    pub fn issue_arguments(&self) -> Vec<String> {
        let mut arguments = Vec::new();
        let numeric = [
            ("--ttl-hours", self.ttl_hours.map(|value| value.to_string())),
            (
                "--max-requests",
                self.max_requests.map(|value| value.to_string()),
            ),
            (
                "--max-tokens",
                self.max_tokens.map(|value| value.to_string()),
            ),
            (
                "--rate-limit-per-minute",
                self.rate_limit_per_minute.map(|value| value.to_string()),
            ),
        ];
        for (flag, value) in numeric {
            if let Some(value) = value {
                arguments.extend([flag.to_string(), value]);
            }
        }
        for model in &self.allowed_models {
            arguments.extend(["--allowed-model".to_string(), model.clone()]);
        }
        arguments
    }
}

/// What `--provider-key` does with a key for a provider.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Serialize, clap::ValueEnum)]
#[serde(rename_all = "kebab-case")]
pub enum ProviderKeyMode {
    /// Validate only; the stored key is never changed (today's behaviour).
    #[default]
    Keep,
    /// Add the provider only when the target has none of that name.
    IfAbsent,
    /// Replace the stored key, only after the new one validated.
    Replace,
}

impl ProviderKeyMode {
    /// The stable spelling used in config, the agent and JSON.
    #[must_use]
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Keep => "keep",
            Self::IfAbsent => "if-absent",
            Self::Replace => "replace",
        }
    }

    fn parse(text: &str) -> Result<Self, String> {
        match text {
            "keep" => Ok(Self::Keep),
            "if-absent" => Ok(Self::IfAbsent),
            "replace" => Ok(Self::Replace),
            other => Err(format!(
                "provider key mode `{other}` must be keep, if-absent or replace"
            )),
        }
    }
}

/// Provider fields used when a key adds a provider the target lacks.
#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize)]
pub struct ProviderTemplate {
    /// `providers add --kind`.
    pub kind: String,
    /// `providers add --base-url`.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub base_url: Option<String>,
    /// `providers add --model`.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub default_model: Option<String>,
    /// `providers add --models`.
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub models: Vec<String>,
    /// `providers add --supported-client`.
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub supported_clients: Vec<String>,
}

/// One `--provider-key NAME=SOURCE`.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ProviderKeySpec {
    /// Provider name on the target.
    pub name: String,
    /// Where the key comes from.
    pub source: SecretSource,
    /// Per-key mode; falls back to `--provider-key-mode`.
    pub mode: Option<ProviderKeyMode>,
    /// Fields for adding a provider the target does not have yet.
    pub template: Option<ProviderTemplate>,
}

impl ProviderKeySpec {
    /// Parse `NAME=env:VAR|file:PATH`.
    ///
    /// # Errors
    ///
    /// Refuses a missing name or a literal value.
    pub fn parse(flag: &str, base: Option<&Path>) -> Result<Self, String> {
        let (name, spec) = flag
            .split_once('=')
            .ok_or("--provider-key needs NAME=env:VAR or NAME=file:PATH")?;
        validate_provider_name(name)?;
        Ok(Self {
            name: name.to_string(),
            source: SecretSource::parse(spec, None, base)
                .map_err(|error| format!("--provider-key {name}: {error}"))?,
            mode: None,
            template: None,
        })
    }
}

fn validate_provider_name(name: &str) -> Result<(), String> {
    let valid = !name.is_empty()
        && name.len() <= 64
        && name
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'-' | b'_' | b'.'));
    if valid {
        Ok(())
    } else {
        Err(format!(
            "provider name `{name}` must be letters, digits, `-`, `_` or `.`"
        ))
    }
}

/// What deploy verification must prove before cutover (issue #683).
#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize)]
pub struct VerificationProfile {
    /// Client kinds that must be proven (catalog, scoping, live answer).
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub clients: Vec<String>,
    /// Providers that must be proven with a live request.
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub providers: Vec<String>,
    /// One exact verification model per provider and client:
    /// `models[provider][client] = model`.
    #[serde(skip_serializing_if = "BTreeMap::is_empty")]
    pub models: BTreeMap<String, BTreeMap<String, String>>,
    /// Launch `router with <client>` against a stub client inside the
    /// candidate, so the generated launch is proven, not only the HTTP API.
    pub require_client_launch: bool,
    /// Count "quota exhausted" as proven only with upstream evidence (an
    /// `upstream_request` entry or correlation id in the request log).
    pub quota_requires_upstream_evidence: bool,
    /// Check that Claude thinking is displayed as configured: the generated
    /// `--settings` and, when a model is set, one live thinking request.
    pub check_thinking_display: bool,
}

/// `[deploy]`, `[local]` or `[remote]` keys that mirror command-line flags.
#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct DeploySection {
    /// `--server`.
    pub server: Option<String>,
    /// `--instance`.
    pub instance: Option<String>,
    /// `--port`.
    pub port: Option<u16>,
    /// `--public-port`.
    pub public_port: Option<u16>,
    /// `--image`.
    pub image: Option<String>,
    /// `--build`.
    pub build: Option<String>,
    /// `--root`.
    pub root: Option<String>,
    /// `--mode` (`container` or `host`).
    pub mode: Option<String>,
    /// `--claude-credentials` (`isolated` or `share`).
    pub claude_credentials: Option<String>,
    /// `--seed-credential`, repeated (remote only).
    pub seed_credentials: Vec<String>,
}

impl DeploySection {
    fn overlay(&mut self, other: &Self) {
        macro_rules! take {
            ($($field:ident),*) => {$(
                if other.$field.is_some() { self.$field.clone_from(&other.$field); }
            )*};
        }
        take!(
            server,
            instance,
            port,
            public_port,
            image,
            build,
            root,
            mode,
            claude_credentials
        );
        if !other.seed_credentials.is_empty() {
            self.seed_credentials.clone_from(&other.seed_credentials);
        }
    }
}

/// A parsed deploy configuration file.
#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct DeployConfig {
    /// `[deploy]`.
    pub deploy: DeploySection,
    /// `[local]`: overrides `[deploy]` for local (container or host) runs.
    pub local: DeploySection,
    /// `[remote]`: overrides `[deploy]` for `--server` runs.
    pub remote: DeploySection,
    /// `[env]`.
    pub env: Vec<EnvSpec>,
    /// `[ssh]`.
    pub ssh: SshSettings,
    /// `[tokens]`.
    pub tokens: TokenPolicy,
    /// `[provider_keys.NAME]`.
    pub provider_keys: Vec<ProviderKeySpec>,
    /// `[verification]`.
    pub verification: Option<VerificationProfile>,
}

impl DeployConfig {
    /// The `[deploy]` keys with the target's overlay applied.
    #[must_use]
    pub fn section_for(&self, remote: bool) -> DeploySection {
        let mut section = self.deploy.clone();
        section.overlay(if remote { &self.remote } else { &self.local });
        section
    }

    /// Read and parse a config file. Relative paths in it are resolved
    /// against the file's directory.
    ///
    /// # Errors
    ///
    /// Names the file and the offending key.
    pub fn load(path: &Path) -> Result<Self, String> {
        let text = std::fs::read_to_string(path)
            .map_err(|error| format!("could not read {}: {error}", path.display()))?;
        Self::parse(&text, path.parent()).map_err(|error| format!("{}: {error}", path.display()))
    }

    /// Parse config text.
    ///
    /// # Errors
    ///
    /// Refuses unknown sections and keys, so a typo is never silently ignored.
    pub fn parse(text: &str, base: Option<&Path>) -> Result<Self, String> {
        let document = text
            .parse::<DocumentMut>()
            .map_err(|error| format!("invalid TOML: {error}"))?;
        let mut config = Self::default();
        for (key, item) in document.iter() {
            let table = item
                .as_table_like()
                .ok_or_else(|| format!("`{key}` must be a table"))?;
            match key {
                "deploy" => config.deploy = parse_section(table, key, base)?,
                "local" => config.local = parse_section(table, key, base)?,
                "remote" => config.remote = parse_section(table, key, base)?,
                "env" => config.env = parse_env_table(table, base)?,
                "ssh" => config.ssh = parse_ssh(table, base)?,
                "tokens" => config.tokens = parse_tokens(table)?,
                "provider_keys" => config.provider_keys = parse_provider_keys(table, base)?,
                "verification" => config.verification = Some(parse_verification(table)?),
                other => return Err(format!("unknown section [{other}]")),
            }
        }
        Ok(config)
    }
}

/// Parse a verification profile file: either a `[verification]` table or
/// the same keys at the top level.
///
/// # Errors
///
/// Refuses unknown keys and malformed values.
pub fn parse_verification_profile(text: &str) -> Result<VerificationProfile, String> {
    let document = text
        .parse::<DocumentMut>()
        .map_err(|error| format!("invalid TOML: {error}"))?;
    let table = document
        .get("verification")
        .and_then(Item::as_table_like)
        .unwrap_or_else(|| document.as_table());
    parse_verification(table)
}

/// Load a verification profile file.
///
/// # Errors
///
/// Names the file and the offending key.
pub fn load_verification_profile(path: &Path) -> Result<VerificationProfile, String> {
    let text = std::fs::read_to_string(path)
        .map_err(|error| format!("could not read {}: {error}", path.display()))?;
    parse_verification_profile(&text).map_err(|error| format!("{}: {error}", path.display()))
}

fn check_keys(table: &dyn TableLike, section: &str, allowed: &[&str]) -> Result<(), String> {
    for (key, _) in table.iter() {
        if !allowed.contains(&key) {
            return Err(format!("unknown key `{key}` in [{section}]"));
        }
    }
    Ok(())
}

fn string(table: &dyn TableLike, section: &str, key: &str) -> Result<Option<String>, String> {
    table.get(key).map_or(Ok(None), |item| {
        item.as_str()
            .map(|value| Some(value.to_string()))
            .ok_or_else(|| format!("[{section}] {key} must be a string"))
    })
}

fn integer<T: TryFrom<i64>>(
    table: &dyn TableLike,
    section: &str,
    key: &str,
) -> Result<Option<T>, String> {
    table.get(key).map_or(Ok(None), |item| {
        item.as_integer()
            .and_then(|value| T::try_from(value).ok())
            .map(Some)
            .ok_or_else(|| format!("[{section}] {key} must be an integer in range"))
    })
}

fn boolean(table: &dyn TableLike, section: &str, key: &str) -> Result<bool, String> {
    table.get(key).map_or(Ok(false), |item| {
        item.as_bool()
            .ok_or_else(|| format!("[{section}] {key} must be true or false"))
    })
}

fn strings(table: &dyn TableLike, section: &str, key: &str) -> Result<Vec<String>, String> {
    let Some(item) = table.get(key) else {
        return Ok(Vec::new());
    };
    if let Some(single) = item.as_str() {
        return Ok(vec![single.to_string()]);
    }
    item.as_array()
        .ok_or_else(|| format!("[{section}] {key} must be a string or an array of strings"))?
        .iter()
        .map(|value| {
            value
                .as_str()
                .map(str::to_string)
                .ok_or_else(|| format!("[{section}] {key} must contain only strings"))
        })
        .collect()
}

fn path(
    table: &dyn TableLike,
    section: &str,
    key: &str,
    base: Option<&Path>,
) -> Result<Option<PathBuf>, String> {
    string(table, section, key)?
        .map(|value| paths::config_path(&value, base, key == "root"))
        .transpose()
}

fn parse_section(
    table: &dyn TableLike,
    section: &str,
    base: Option<&Path>,
) -> Result<DeploySection, String> {
    check_keys(
        table,
        section,
        &[
            "server",
            "instance",
            "port",
            "public_port",
            "image",
            "build",
            "root",
            "mode",
            "claude_credentials",
            "seed_credentials",
        ],
    )?;
    let instance = string(table, section, "instance")?;
    if let Some(instance) = &instance {
        crate::deploy::instance::validate(instance)?;
    }
    let root = path(table, section, "root", base)?.map(|root| root.display().to_string());
    Ok(DeploySection {
        server: string(table, section, "server")?,
        instance,
        port: integer(table, section, "port")?,
        public_port: integer(table, section, "public_port")?,
        image: string(table, section, "image")?,
        // A build context is a path on the target for remote deploys, so it
        // is never resolved against the local config directory.
        build: string(table, section, "build")?,
        root,
        mode: string(table, section, "mode")?,
        claude_credentials: string(table, section, "claude_credentials")?,
        seed_credentials: strings(table, section, "seed_credentials")?,
    })
}

fn parse_env_table(table: &dyn TableLike, base: Option<&Path>) -> Result<Vec<EnvSpec>, String> {
    table
        .iter()
        .map(|(name, item)| {
            let spec = item.as_str().ok_or_else(|| {
                format!("[env] {name} must be \"env\", \"env:VAR\" or \"file:PATH\"")
            })?;
            EnvSpec::parse(&format!("{name}={spec}"), base)
        })
        .collect()
}

fn parse_ssh(table: &dyn TableLike, base: Option<&Path>) -> Result<SshSettings, String> {
    const SECTION: &str = "ssh";
    check_keys(
        table,
        SECTION,
        &[
            "port",
            "identity_file",
            "known_hosts",
            "known_hosts_file",
            "keepalive_secs",
            "deadline_secs",
        ],
    )?;
    let known_hosts = strings(table, SECTION, "known_hosts")?;
    validate_known_hosts(&known_hosts)?;
    Ok(SshSettings {
        port: integer(table, SECTION, "port")?,
        identity_file: path(table, SECTION, "identity_file", base)?,
        known_hosts,
        known_hosts_file: path(table, SECTION, "known_hosts_file", base)?,
        keepalive_secs: integer(table, SECTION, "keepalive_secs")?,
        deadline_secs: integer(table, SECTION, "deadline_secs")?,
    })
}

/// Validate pinned `known_hosts` lines: `host keytype base64-key`.
///
/// # Errors
///
/// Refuses lines that could not pin a key (which OpenSSH would ignore,
/// turning a pin into a silent connection failure).
pub fn validate_known_hosts(lines: &[String]) -> Result<(), String> {
    for line in lines {
        let fields: Vec<&str> = line.split_whitespace().collect();
        let offset = usize::from(fields.first().is_some_and(|first| first.starts_with('@')));
        if line.contains(['\n', '\r', '\0']) || fields.len() < 3 + offset {
            return Err("a pinned known_hosts entry must be `HOST KEYTYPE BASE64KEY`".to_string());
        }
    }
    Ok(())
}

fn parse_tokens(table: &dyn TableLike) -> Result<TokenPolicy, String> {
    const SECTION: &str = "tokens";
    check_keys(
        table,
        SECTION,
        &[
            "ttl_hours",
            "max_requests",
            "max_tokens",
            "rate_limit_per_minute",
            "allowed_models",
        ],
    )?;
    Ok(TokenPolicy {
        ttl_hours: integer(table, SECTION, "ttl_hours")?,
        max_requests: integer(table, SECTION, "max_requests")?,
        max_tokens: integer(table, SECTION, "max_tokens")?,
        rate_limit_per_minute: integer(table, SECTION, "rate_limit_per_minute")?,
        allowed_models: strings(table, SECTION, "allowed_models")?,
    })
}

fn parse_provider_keys(
    table: &dyn TableLike,
    base: Option<&Path>,
) -> Result<Vec<ProviderKeySpec>, String> {
    let mut keys = Vec::new();
    for (name, item) in table.iter() {
        let section = format!("provider_keys.{name}");
        let entry = item
            .as_table_like()
            .ok_or_else(|| format!("[{section}] must be a table"))?;
        check_keys(
            entry,
            &section,
            &[
                "source",
                "mode",
                "kind",
                "base_url",
                "default_model",
                "models",
                "supported_clients",
            ],
        )?;
        let source = string(entry, &section, "source")?
            .ok_or_else(|| format!("[{section}] source is required (env:VAR or file:PATH)"))?;
        let mut spec = ProviderKeySpec::parse(&format!("{name}={source}"), base)?;
        spec.mode = string(entry, &section, "mode")?
            .as_deref()
            .map(ProviderKeyMode::parse)
            .transpose()?;
        spec.template = match string(entry, &section, "kind")? {
            Some(kind) => Some(ProviderTemplate {
                kind,
                base_url: string(entry, &section, "base_url")?,
                default_model: string(entry, &section, "default_model")?,
                models: strings(entry, &section, "models")?,
                supported_clients: strings(entry, &section, "supported_clients")?,
            }),
            None if ["base_url", "default_model", "models", "supported_clients"]
                .iter()
                .any(|key| entry.contains_key(key)) =>
            {
                return Err(format!(
                    "[{section}] provider fields need `kind` to describe a provider to add"
                ));
            }
            None => None,
        };
        keys.push(spec);
    }
    Ok(keys)
}

/// Client kinds the deploy verifier knows how to prove.
pub const VERIFIABLE_CLIENTS: &[&str] = &["claude", "codex", "qwen-code", "gemini", "opencode"];

fn parse_verification(table: &dyn TableLike) -> Result<VerificationProfile, String> {
    const SECTION: &str = "verification";
    check_keys(
        table,
        SECTION,
        &[
            "clients",
            "providers",
            "models",
            "require_client_launch",
            "quota_requires_upstream_evidence",
            "check_thinking_display",
        ],
    )?;
    let clients = strings(table, SECTION, "clients")?;
    for client in &clients {
        if !VERIFIABLE_CLIENTS.contains(&client.as_str()) {
            return Err(format!(
                "[verification] client `{client}` must be one of {}",
                VERIFIABLE_CLIENTS.join(", ")
            ));
        }
    }
    let providers = strings(table, SECTION, "providers")?;
    for provider in &providers {
        validate_provider_name(provider)?;
    }
    let mut models = BTreeMap::new();
    if let Some(item) = table.get("models") {
        let by_provider = item
            .as_table_like()
            .ok_or("[verification.models] must be a table of providers")?;
        for (provider, item) in by_provider.iter() {
            validate_provider_name(provider)?;
            let by_client = item.as_table_like().ok_or_else(|| {
                format!("[verification.models.{provider}] must map client kinds to models")
            })?;
            let mut chosen = BTreeMap::new();
            for (client, model) in by_client.iter() {
                if !VERIFIABLE_CLIENTS.contains(&client) {
                    return Err(format!(
                        "[verification.models.{provider}] unknown client `{client}`"
                    ));
                }
                let model = model
                    .as_str()
                    .filter(|model| !model.trim().is_empty())
                    .ok_or_else(|| {
                        format!("[verification.models.{provider}] {client} must be a model id")
                    })?;
                chosen.insert(client.to_string(), model.to_string());
            }
            models.insert(provider.to_string(), chosen);
        }
    }
    Ok(VerificationProfile {
        clients,
        providers,
        models,
        require_client_launch: boolean(table, SECTION, "require_client_launch")?,
        quota_requires_upstream_evidence: boolean(
            table,
            SECTION,
            "quota_requires_upstream_evidence",
        )?,
        check_thinking_display: boolean(table, SECTION, "check_thinking_display")?,
    })
}

/// A provider key with its value read.
#[derive(Clone, PartialEq, Eq)]
pub struct ResolvedProviderKey {
    /// Provider name on the target.
    pub name: String,
    /// What to do with it.
    pub mode: ProviderKeyMode,
    /// The key. Never printed.
    pub value: String,
    /// Fields for adding a provider the target lacks.
    pub template: Option<ProviderTemplate>,
}

impl fmt::Debug for ResolvedProviderKey {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter
            .debug_struct("ResolvedProviderKey")
            .field("name", &self.name)
            .field("mode", &self.mode)
            .field("value", &"<redacted>")
            .field("template", &self.template)
            .finish()
    }
}

/// Every setting after merging the file with the flags, values read.
#[derive(Clone, Default, PartialEq, Eq)]
pub struct ResolvedDeploy {
    /// Instance name, when one is selected.
    pub instance: Option<String>,
    /// Runtime environment, sorted by name. Values are never printed.
    pub env: Vec<(String, String)>,
    /// SSH transport.
    pub ssh: SshSettings,
    /// Issued-token limits.
    pub tokens: TokenPolicy,
    /// Provider keys to add or rotate in the candidate.
    pub provider_keys: Vec<ResolvedProviderKey>,
    /// What verification must prove.
    pub verification: Option<VerificationProfile>,
}

impl ResolvedDeploy {
    /// Whether the remote agent needs the extra settings payload.
    #[must_use]
    pub const fn needs_payload(&self) -> bool {
        !self.env.is_empty() || !self.provider_keys.is_empty() || self.verification.is_some()
    }
}

impl fmt::Debug for ResolvedDeploy {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter
            .debug_struct("ResolvedDeploy")
            .field("instance", &self.instance)
            .field(
                "env",
                &self.env.iter().map(|(name, _)| name).collect::<Vec<_>>(),
            )
            .field("ssh", &self.ssh)
            .field("tokens", &self.tokens)
            .field("provider_keys", &self.provider_keys)
            .field("verification", &self.verification)
            .finish()
    }
}
