//! `deploy` and `usage` command arguments.
//!
//! Split from `cli.rs` to keep that file within the repository's 1000-line
//! limit.

use clap::{Args, ValueEnum};

/// What a `router deploy` run should do.
#[derive(Debug, Args)]
pub struct DeployArgs {
    /// Restore a non-OAuth data checkpoint to a stopped local deployment.
    /// Existing records/files take precedence unless --replace-state is set.
    #[arg(long, value_name = "DIR", requires = "yes", conflicts_with_all = ["server", "staging", "mode", "status", "down", "force_update", "accept_access_loss", "claude_credentials", "build"])]
    pub restore_state: Option<std::path::PathBuf>,
    /// Replace covered data with the checkpoint after retaining a new backup.
    #[arg(long, requires = "restore_state")]
    pub replace_state: bool,
    /// Create or inspect an isolated local candidate namespace. Never shares
    /// primary data, OAuth ownership, tokens, ports or selected client profiles.
    #[arg(long, value_name = "NAME", conflicts_with_all = ["server", "mode", "claude_credentials", "force_update"])]
    pub staging: Option<String>,
    /// Read-only machine-readable staging verification (no paid probes).
    #[arg(long, requires = "staging", conflicts_with_all = ["down", "status"])]
    pub verify: bool,
    /// Machine-readable staging result.
    #[arg(long, requires = "staging")]
    pub json: bool,
    /// SSH destination on which to converge the deployment.
    ///
    /// The destination uses OpenSSH's ordinary `user@host`/config-alias
    /// syntax. Credentials are discovered on that host and are never copied
    /// from the machine running this command.
    #[arg(long, value_name = "TARGET")]
    pub server: Option<String>,
    /// Report the current state without changing anything.
    ///
    /// The question "what is missing?" must be answerable without provisioning
    /// anything, so this makes no mutating call at all — a property its tests
    /// assert by comparing the container id and image digest across the run.
    #[arg(long, conflicts_with = "down")]
    pub status: bool,
    /// Remove what this command created, and nothing else.
    #[arg(long)]
    pub down: bool,
    /// Confirm a destructive action, for unattended use.
    ///
    /// Removing a deployment leaves its issued tokens and request log behind or
    /// loses them, so it is confirmed rather than assumed.
    #[arg(long)]
    pub yes: bool,
    /// Permit a local update that cannot preserve every identified run.
    ///
    /// The affected connection or run ids are printed before any serving
    /// object changes. This is deliberately local: remote deploy already owns
    /// a stable relay and has no legacy in-place container to migrate.
    #[arg(
        long,
        conflicts_with_all = ["server", "status", "down"],
    )]
    pub force_update: bool,
    /// Explicitly accept provider/catalog loss reported by candidate validation.
    /// Connection interruption permission alone does not authorize access loss.
    #[arg(long, conflicts_with_all = ["server", "staging", "status", "down"])]
    pub accept_access_loss: bool,
    /// Published host port.
    #[arg(long, default_value_t = crate::deploy::DEFAULT_PORT)]
    pub port: u16,
    /// Public TLS port exposing inference only.
    ///
    /// Management remains on the loopback-only `--port` listener. The remote
    /// verifier trusts the deployment's generated CA rather than disabling
    /// certificate validation.
    #[arg(long, requires = "server")]
    pub public_port: Option<u16>,
    /// Image to deploy. Must be a release tag or digest, never a moving ref.
    ///
    /// A moving reference lets the CLI and the container disagree about the API
    /// contract while both look correct, so one is refused with the reason.
    #[arg(long)]
    pub image: Option<String>,
    /// Build the image from this context when it is not present.
    ///
    /// With `--server`, this is a path on the target, never a directory copied
    /// over SSH. Without it, the target builds this Router's pinned release
    /// tag itself.
    #[arg(long, value_name = "DIR")]
    pub build: Option<String>,
    /// Root holding the deployment's credential and data directories.
    ///
    /// Two directories, not one: credentials remain isolated from mutable
    /// Router data and its request log.
    #[arg(long, value_name = "DIR")]
    pub root: Option<String>,
    /// Whether the backend uses this machine's Claude Code login.
    ///
    /// `share` mounts the Claude Code home (`$CLAUDE_CONFIG_DIR` or
    /// `~/.claude`) read-write, as its owner, so the host CLI and Router
    /// advance one rotating refresh chain. Nothing is copied. A login the
    /// container cannot share (macOS Keychain, empty, unreadable) is refused
    /// with the reason before anything changes. Without this flag an update
    /// keeps the mode the active deployment uses; a first deploy is isolated.
    #[arg(long, value_enum, conflicts_with_all = ["server", "down"])]
    pub claude_credentials: Option<ClaudeCredentials>,
    /// Where the local Router process runs (issue #626).
    ///
    /// `host` runs this Router binary on the host, on the same loopback port
    /// and with the same data directory as the container deployment, so it
    /// reads a Claude Code login kept in the macOS Keychain. The containers
    /// are stopped, not removed, and `--mode container` restores them. With
    /// `--status` the migration plan is printed without changing anything.
    /// Without this flag a deploy keeps the current mode.
    #[arg(long, value_enum, conflicts_with_all = ["server", "down"])]
    pub mode: Option<DeployMode>,
}

/// Where a local deployment serves from.
#[derive(Clone, Copy, Debug, PartialEq, Eq, ValueEnum)]
pub enum DeployMode {
    /// Versioned backends behind a loopback relay container.
    Container,
    /// One Router process on the host, reading the host's own logins.
    Host,
}

/// How a local deployment's backend obtains the Anthropic credential.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, ValueEnum)]
pub enum ClaudeCredentials {
    /// Only the deployment's own `<root>/credentials`, mounted read-only.
    #[default]
    Isolated,
    /// The host's Claude Code home, shared read-write without copying.
    Share,
}

/// Which subscription's remaining limits to report.
#[derive(Debug, Args)]
pub struct UsageArgs {
    /// Public subscription provider name.
    #[arg(value_enum)]
    pub provider: Option<crate::subscription_usage::UsageProvider>,
    /// Emit the stable machine-readable Router response.
    #[arg(long)]
    pub json: bool,
    #[command(flatten)]
    pub target: super::AuthTarget,
}
