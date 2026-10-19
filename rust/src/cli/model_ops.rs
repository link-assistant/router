use clap::Subcommand;

use super::AuthTarget;

/// Model-contract diagnostics.
#[derive(Debug, Subcommand)]
pub enum ModelOp {
    /// Explain one exact selector as machine-readable JSON.
    Explain {
        /// Exact client-visible model selector (case-sensitive).
        id: String,
        /// Managed client whose authenticated catalog should be inspected.
        #[arg(long, value_enum, default_value = "agent")]
        client: crate::clients::ClientKind,
        #[command(flatten)]
        target: AuthTarget,
    },
}
