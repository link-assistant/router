//! `router configure <client>` — the one name for permanent client setup.
//!
//! Pointing a client at the router permanently is the first thing an operator
//! does after standing a deployment up, and it had no single name. Two
//! commands wrote the same file and disagreed on almost everything else: the
//! address (`clients setup` used this CLI's own `--host`/`--port` default even
//! with a server selected), the credential (`with --global` stored none and
//! told the user to go set an environment variable), how to reverse it, and
//! which clients it worked for. `configure` exists in the codebase — it is
//! what both paths call — but was not a name a user could type (issue #296).

use clap::Args;

use super::AuthTarget;
use crate::clients::ClientKind;

/// Point a client at the router permanently.
#[derive(Clone, Debug, Args)]
pub struct ConfigureArgs {
    /// Client to configure. Omit when `--all` is given.
    #[arg(value_enum, required_unless_present = "all")]
    pub client: Option<ClientKind>,
    /// Configure every client this machine has that can be configured.
    ///
    /// Clients whose vendor gates prevent it are skipped and named in the
    /// summary rather than failing the run — a workstation being pointed at a
    /// deployment wants the ones that work.
    #[arg(long, conflicts_with = "client")]
    pub all: bool,
    /// Restore the exact configuration saved by a previous `configure`.
    ///
    /// The restore is hash-verified: an edit made after `configure` is
    /// preserved rather than overwritten.
    #[arg(long)]
    pub undo: bool,
    #[command(flatten)]
    pub target: AuthTarget,
    /// Existing router token to configure instead of minting one.
    ///
    /// Prefer `--token-stdin` or `LINK_ASSISTANT_ROUTER_TOKEN` over argv,
    /// which is visible in shell history and process listings.
    #[arg(long, hide_env_values = true, conflicts_with = "token_stdin")]
    pub token: Option<String>,
    /// Read an existing router token as one line from standard input.
    #[arg(long, conflicts_with = "token")]
    pub token_stdin: bool,
    /// Lifetime of an automatically minted token, in hours.
    ///
    /// A year by default, because this is the permanent path: a credential
    /// that lapses next week makes "configured" mean "configured until
    /// Tuesday". Re-run `configure` to renew it.
    #[arg(long, default_value_t = 8760)]
    pub ttl_hours: i64,
}

impl ConfigureArgs {
    /// The clients this invocation acts on.
    #[must_use]
    pub fn clients(&self) -> Vec<ClientKind> {
        self.client
            .map_or_else(|| ClientKind::ALL.to_vec(), |client| vec![client])
    }
}
