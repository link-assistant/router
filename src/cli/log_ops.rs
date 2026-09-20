use clap::Subcommand;

use super::AuthTarget;

/// What to ask of the request log.
#[derive(Debug, Subcommand)]
pub enum LogsOp {
    /// Shape of the log: exchanges, records, statuses, time span, size.
    Summary {
        /// Restrict to one token's log directory, by its hashed name.
        ///
        /// Named `--token-id` because `--token` means a credential in `with`,
        /// `server use` and `clients setup`, and one flag name meaning two
        /// things is what makes a CLI unusable from memory (issue #314). The
        /// old spelling is still accepted.
        #[arg(long = "token-id", alias = "token", value_name = "HASHED_NAME")]
        token: Option<String>,
        /// Emit JSON, for a monitoring check rather than a human.
        #[arg(long)]
        json: bool,
        #[command(flatten)]
        target: AuthTarget,
    },
    /// Anomalies worth a name, with the correlation ids to inspect.
    ///
    /// Exits non-zero when any are found, so it works as a health gate.
    Anomalies {
        /// Restrict to one token's log directory, by its hashed name.
        #[arg(long = "token-id", alias = "token", value_name = "HASHED_NAME")]
        token: Option<String>,
        /// Emit JSON, for a monitoring check rather than a human.
        #[arg(long)]
        json: bool,
        #[command(flatten)]
        target: AuthTarget,
    },
    /// One exchange, decoded and in order.
    Show {
        correlation_id: String,
        /// Restrict to one token's log directory, by its hashed name.
        #[arg(long = "token-id", alias = "token", value_name = "HASHED_NAME")]
        token: Option<String>,
        #[command(flatten)]
        target: AuthTarget,
    },
}
