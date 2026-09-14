//! `deploy` and `usage` command arguments.
//!
//! Split from `cli.rs` to keep that file within the repository's 1000-line
//! limit.

use clap::Args;

/// What a `router deploy` run should do.
#[derive(Debug, Args)]
pub struct DeployArgs {
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
    /// Published host port.
    #[arg(long, default_value_t = crate::deploy::DEFAULT_PORT)]
    pub port: u16,
    /// Image to deploy. Must be a release tag or digest, never a moving ref.
    ///
    /// A moving reference lets the CLI and the container disagree about the API
    /// contract while both look correct, so one is refused with the reason.
    #[arg(long)]
    pub image: Option<String>,
    /// Build the image from this context when it is not present locally.
    #[arg(long, value_name = "DIR")]
    pub build: Option<String>,
    /// Root holding the deployment's credential and data directories.
    ///
    /// Two directories, not one: the credential mount is read-only and the
    /// request log cannot live on it.
    #[arg(long, value_name = "DIR")]
    pub root: Option<String>,
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
