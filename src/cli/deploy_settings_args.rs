//! `router deploy` settings shared with `--config` (issues #679, #680, #683).
//!
//! Every flag here has a key in the deploy configuration file; a flag given
//! on the command line wins over the file. Secret values are never flag
//! values: `--env` and `--provider-key` name a source (`env:VAR` or
//! `file:PATH`), read when the deployment runs.

use std::path::PathBuf;

use clap::Args;

use crate::deploy_config::ProviderKeyMode;

/// Deployment settings that can also come from `--config`.
#[derive(Clone, Debug, Default, Args)]
pub struct DeploySettingsArgs {
    /// Declarative deploy configuration (TOML). Flags override its keys.
    #[arg(long, value_name = "FILE")]
    pub config: Option<PathBuf>,
    /// Deploy to the `server` named in `--config` (`[remote]` or `[deploy]`).
    #[arg(long, conflicts_with_all = ["server", "staging", "mode"])]
    pub remote: bool,
    /// Instance name, so several deployments can share one host. Suffixes the
    /// relay, network and backend names and the default root.
    #[arg(long, value_name = "NAME")]
    pub instance: Option<String>,
    /// Pass a runtime variable to the backend: `NAME` (from this
    /// environment), `NAME=env:VAR` or `NAME=file:PATH`. Repeatable. Values
    /// never reach argv; a changed value reconciles the deployment.
    #[arg(long = "env", value_name = "NAME[=SOURCE]")]
    pub env: Vec<String>,
    /// SSH port for `--server`.
    #[arg(long, value_name = "PORT")]
    pub ssh_port: Option<u16>,
    /// SSH identity file for `--server` (with `IdentitiesOnly=yes`).
    #[arg(long, value_name = "FILE")]
    pub ssh_identity: Option<PathBuf>,
    /// Pinned `known_hosts` file: only its keys are trusted for `--server`.
    #[arg(long, value_name = "FILE")]
    pub ssh_known_hosts: Option<PathBuf>,
    /// SSH keepalive interval in seconds (`ServerAliveInterval`).
    #[arg(long, value_name = "SECONDS")]
    pub ssh_keepalive: Option<u32>,
    /// Overall remote session deadline in seconds. Exceeding it ends the
    /// session with exit code 12.
    #[arg(long, value_name = "SECONDS")]
    pub deadline: Option<u64>,
    /// Lifetime of the client token deploy issues.
    #[arg(long, value_name = "HOURS")]
    pub token_ttl_hours: Option<i64>,
    /// Request cap for the client token deploy issues.
    #[arg(long, value_name = "N")]
    pub token_max_requests: Option<u64>,
    /// Token (input plus output) cap for the client token deploy issues.
    #[arg(long, value_name = "N")]
    pub token_max_tokens: Option<u64>,
    /// Requests per minute for the client token deploy issues.
    #[arg(long, value_name = "N")]
    pub token_rate_limit: Option<u64>,
    /// Exact model the issued client token may request. Repeatable.
    #[arg(long, value_name = "MODEL")]
    pub token_allowed_model: Vec<String>,
    /// Provider key to verify in the candidate before cutover:
    /// `NAME=env:VAR` or `NAME=file:PATH`. Repeatable. `--server` only.
    #[arg(long, value_name = "NAME=SOURCE")]
    pub provider_key: Vec<String>,
    /// What to do with `--provider-key` keys after validation.
    #[arg(long, value_enum, value_name = "MODE")]
    pub provider_key_mode: Option<ProviderKeyMode>,
    /// Verification profile (TOML): clients, providers and exact models that
    /// must be proven before cutover. `--server` only.
    #[arg(long, value_name = "FILE")]
    pub verification_profile: Option<PathBuf>,
}

impl DeploySettingsArgs {
    /// Whether any setting from this group was given on the command line.
    #[must_use]
    pub const fn any(&self) -> bool {
        self.config.is_some()
            || self.remote
            || self.instance.is_some()
            || !self.env.is_empty()
            || self.ssh_port.is_some()
            || self.ssh_identity.is_some()
            || self.ssh_known_hosts.is_some()
            || self.ssh_keepalive.is_some()
            || self.deadline.is_some()
            || self.token_ttl_hours.is_some()
            || self.token_max_requests.is_some()
            || self.token_max_tokens.is_some()
            || self.token_rate_limit.is_some()
            || !self.token_allowed_model.is_empty()
            || !self.provider_key.is_empty()
            || self.provider_key_mode.is_some()
            || self.verification_profile.is_some()
    }
}
