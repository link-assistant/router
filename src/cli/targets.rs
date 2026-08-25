//! Which router each subcommand acts on.
//!
//! Split from `cli.rs` to keep that file within the repository's 1000-line
//! limit. Every state-touching family answers the same question the same way,
//! which is the point of issue #294 — one rule rather than a table an operator
//! has to memorise.

use super::{AccountOp, AuthTarget, LogsOp, ProviderOp, TokenOp};

impl TokenOp {
    /// Which router this token operation acts on.
    #[must_use]
    pub const fn target(&self) -> &AuthTarget {
        match self {
            Self::Issue { target, .. }
            | Self::Rotate { target, .. }
            | Self::List { target }
            | Self::Revoke { target, .. }
            | Self::Expire { target, .. }
            | Self::Show { target, .. } => target,
        }
    }
}

impl AccountOp {
    /// Which router this account operation acts on.
    #[must_use]
    pub const fn target(&self) -> &AuthTarget {
        match self {
            Self::List { target } => target,
        }
    }
}

impl ProviderOp {
    /// Which router this provider operation acts on.
    #[must_use]
    pub const fn target(&self) -> &AuthTarget {
        match self {
            Self::List { target }
            | Self::Add { target, .. }
            | Self::Show { target, .. }
            | Self::Remove { target, .. }
            | Self::Import { target, .. } => target,
        }
    }
}

impl LogsOp {
    /// Which router this log query acts on.
    #[must_use]
    pub const fn target(&self) -> &AuthTarget {
        match self {
            Self::Summary { target, .. }
            | Self::Anomalies { target, .. }
            | Self::Show { target, .. } => target,
        }
    }
}
