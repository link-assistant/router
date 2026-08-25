//! `clients` subcommands.
//!
//! Split from `cli.rs` to keep that file within the repository's 1000-line
//! limit.

use clap::Subcommand;

use crate::clients::ClientKind;

#[derive(Debug, Subcommand)]
pub enum ClientOp {
    /// List supported clients and their local installation/configuration state.
    List,
    /// Merge this router into a client's user configuration.
    #[command(override_usage = "link-assistant-router clients setup [OPTIONS] <CLIENT>")]
    Setup {
        #[arg(value_enum)]
        client: ClientKind,
        /// Existing router token. Prefer `--token-stdin` or
        /// `LINK_ASSISTANT_ROUTER_TOKEN` over argv, which is visible in shell
        /// history and process listings.
        #[arg(long, hide_env_values = true, conflicts_with = "token_stdin")]
        token: Option<String>,
        /// Read an existing router token as one line from standard input.
        #[arg(long, conflicts_with = "token")]
        token_stdin: bool,
        /// Router URL reachable from the client (defaults to this CLI's host/port).
        #[arg(long)]
        base_url: Option<String>,
        /// Lifetime of an automatically minted token.
        #[arg(long, default_value_t = 24)]
        ttl_hours: i64,
    },
    /// Show the effective client integration with secrets redacted.
    #[command(override_usage = "link-assistant-router clients show [OPTIONS] <CLIENT>")]
    Show {
        #[arg(value_enum)]
        client: ClientKind,
    },
    /// Remove only settings managed by this router.
    #[command(override_usage = "link-assistant-router clients remove [OPTIONS] <CLIENT>")]
    Remove {
        #[arg(value_enum)]
        client: ClientKind,
        /// Also revoke a token that was supplied by the operator instead of
        /// minted by `clients setup`. Off by default because the same token
        /// is often shared with other machines.
        #[arg(long)]
        revoke_supplied: bool,
        /// Delete the local settings even when the managed token could not be
        /// revoked. The credential stays usable until it expires.
        #[arg(long)]
        force: bool,
    },
    /// Make a real request using the client's configured URL and token variable.
    ///
    /// The probe is deliberately the cheapest the dialect accepts: a 64-token
    /// budget, reasoning at the lowest tier, and a two-word prompt. It still
    /// costs a request against the subscription, because proving the route
    /// works means using it (issues #275, #309).
    #[command(override_usage = "link-assistant-router clients doctor [OPTIONS] <CLIENT>")]
    Doctor {
        #[arg(value_enum)]
        client: ClientKind,
    },
}
