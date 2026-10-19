//! `clients` subcommands.
//!
//! Split from `cli.rs` to keep that file within the repository's 1000-line
//! limit.

use clap::{Args, Subcommand, ValueEnum};

use crate::clients::ClientKind;
use std::path::PathBuf;

#[derive(Clone, Copy, Debug, Default, Eq, PartialEq, ValueEnum)]
pub enum ProfileSelection {
    #[default]
    Normal,
    Router,
    Both,
}

#[derive(Debug, Args)]
pub struct ClientSelection {
    #[arg(value_enum, required_unless_present = "all")]
    pub client: Option<ClientKind>,
    #[arg(long, conflicts_with = "client")]
    pub all: bool,
    #[arg(long, value_enum, default_value_t = ProfileSelection::Normal)]
    pub profile: ProfileSelection,
}

#[derive(Debug, Subcommand)]
pub enum BackupOp {
    /// Copy selected local profiles into a verified, owner-only backup.
    Create {
        #[command(flatten)]
        selection: ClientSelection,
        #[arg(long, value_name = "DIR")]
        destination: Option<PathBuf>,
        /// Include local credential files; the backup remains unencrypted and must stay local.
        #[arg(long)]
        include_credentials: bool,
    },
    /// List complete backups in the default local backup directory.
    List {
        #[arg(long)]
        json: bool,
        #[arg(long, value_name = "DIR")]
        destination: Option<PathBuf>,
    },
    /// Verify every file, inventory entry, permission and a sample restore.
    Verify {
        id: String,
        #[arg(long, value_name = "DIR")]
        destination: Option<PathBuf>,
    },
    /// Restore a verified backup. Merge is the default.
    Restore {
        id: String,
        #[arg(long, value_enum)]
        client: Option<ClientKind>,
        #[arg(long, conflicts_with = "overwrite")]
        merge: bool,
        #[arg(long)]
        overwrite: bool,
        #[arg(long)]
        dry_run: bool,
        #[arg(long, requires = "overwrite")]
        yes: bool,
        #[arg(long, value_name = "DIR")]
        destination: Option<PathBuf>,
    },
}

#[derive(Debug, Args)]
pub struct MaintenanceArgs {
    #[command(flatten)]
    pub selection: ClientSelection,
    #[arg(long)]
    pub dry_run: bool,
    #[arg(long)]
    pub json: bool,
    #[arg(long, conflicts_with = "channel")]
    pub latest: bool,
    #[arg(long, conflicts_with = "latest")]
    pub channel: Option<String>,
    /// Required for a fresh install when no existing installation identifies a method.
    #[arg(long)]
    pub method: Option<String>,
    #[arg(long)]
    pub yes: bool,
}

#[derive(Debug, Subcommand)]
pub enum ClientOp {
    /// Create, inspect, verify and restore local client backups.
    Backup {
        #[command(subcommand)]
        op: BackupOp,
    },
    /// Reset preferences or, with --full, the selected local profile.
    Reset {
        #[command(flatten)]
        selection: ClientSelection,
        #[arg(long)]
        dry_run: bool,
        #[arg(long)]
        full: bool,
        #[arg(long, requires = "full")]
        yes: bool,
        #[arg(long)]
        json: bool,
    },
    /// Install a client using an explicitly selected vendor method.
    Install(MaintenanceArgs),
    /// Update an installed client using its detected method and channel.
    Update(MaintenanceArgs),
    /// Reinstall an installed client after a verified profile backup.
    Reinstall(MaintenanceArgs),
    /// List supported clients and their local installation/configuration state.
    List {
        /// Emit JSON instead of the table (issue #314).
        #[arg(long)]
        json: bool,
    },
    /// Merge this router into a client's user configuration.
    ///
    /// `router configure <client>` is the name for this, and the one that
    /// follows the server selection. `create` and `add` are accepted here too
    /// (issues #296, #314).
    #[command(alias = "create", alias = "add")]
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
        /// Router URL reachable from the client.
        ///
        /// Spelled `--server` like everywhere else the router's own URL is
        /// named; `--base-url` means the *upstream's* URL in `providers add`,
        /// so one flag referred to two different machines depending on the
        /// family (issue #314). The old spelling is still accepted.
        #[arg(long = "server", alias = "base-url", value_name = "URL")]
        base_url: Option<String>,
        /// Private management origin when it differs from the client-facing
        /// inference origin.
        #[arg(long, value_name = "URL", requires = "base_url")]
        management_server: Option<String>,
        /// Lifetime of an automatically minted token.
        #[arg(long, default_value_t = 24)]
        ttl_hours: i64,
    },
    /// Show the effective client integration with secrets redacted.
    Show {
        #[arg(value_enum)]
        client: ClientKind,
        /// Accepted for symmetry with `list`: `show` already emits JSON, so
        /// this changes nothing (issue #314). A script should not have to know
        /// which verb of a family takes the flag.
        #[arg(long)]
        json: bool,
    },
    /// Remove only settings managed by this router.
    ///
    /// `delete` and `revoke` are accepted too (issue #314).
    #[command(alias = "delete", alias = "revoke")]
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
    /// Reconcile routing-critical client settings with the selected Router.
    Repair {
        /// One client to repair. Use --all to inspect or repair every client.
        #[arg(value_enum, required_unless_present = "all")]
        client: Option<ClientKind>,
        /// Inspect or repair every documented client independently.
        #[arg(long, conflicts_with = "client")]
        all: bool,
        /// Print the secret-free plan without network access or filesystem writes.
        #[arg(long)]
        dry_run: bool,
        /// Emit stable machine-readable output.
        #[arg(long)]
        json: bool,
        /// Restore an earlier repair snapshot after verifying no later edits exist.
        #[arg(
            long,
            value_name = "BACKUP_ID",
            requires = "client",
            conflicts_with_all = ["all", "dry_run"]
        )]
        rollback: Option<String>,
    },
    /// Make a real request using the client's configured URL and token variable.
    ///
    /// The probe is deliberately the cheapest the dialect accepts: a 64-token
    /// budget, reasoning at the lowest tier, and a two-word prompt. It still
    /// costs a request against the subscription, because proving the route
    /// works means using it (issues #275, #309).
    Doctor {
        #[arg(value_enum)]
        client: ClientKind,
    },
}
