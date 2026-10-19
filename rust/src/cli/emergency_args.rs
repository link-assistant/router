//! Flags for the explicit, bounded emergency any-token mode (issue #645).

use super::value_parsers::parse_truthy;
use crate::emergency_auth::{DEFAULT_DURATION_MINUTES, EmergencyAuthConfig};

/// `--emergency-*` switches. Every one is off or at its safe default unless
/// given; none is read from a persisted deployment setting.
#[derive(clap::Args, Debug, Clone, Default)]
pub struct EmergencyArgs {
    /// EMERGENCY ONLY: accept any non-empty client token on client routes
    /// for a bounded time. Off by default; management routes keep normal
    /// admin authentication, no token record is read, written, rotated or
    /// revived, and every bypassed request is logged and counted. See
    /// `docs/security/emergency-auth.md`.
    #[arg(
        long,
        env = "EMERGENCY_ACCEPT_ANY_TOKEN",
        hide_env_values = true,
        num_args = 0..=1,
        default_value_t = false,
        default_missing_value = "true",
        value_parser = parse_truthy
    )]
    pub emergency_accept_any_token: bool,

    /// Acknowledge that emergency any-token mode is served on a non-loopback
    /// listener. Without it the router refuses to start in emergency mode
    /// unless every listener is bound to loopback.
    #[arg(
        long,
        env = "EMERGENCY_ALLOW_NON_LOOPBACK",
        num_args = 0..=1,
        default_value_t = false,
        default_missing_value = "true",
        value_parser = parse_truthy
    )]
    pub emergency_allow_non_loopback: bool,

    /// Minutes after which emergency any-token mode switches itself off
    /// (1..=1440).
    #[arg(
        long,
        env = "EMERGENCY_DURATION_MINUTES",
        default_value_t = DEFAULT_DURATION_MINUTES
    )]
    pub emergency_duration_minutes: u64,
}

impl EmergencyArgs {
    /// The resolved configuration.
    #[must_use]
    pub const fn config(&self) -> EmergencyAuthConfig {
        EmergencyAuthConfig {
            enabled: self.emergency_accept_any_token,
            allow_non_loopback: self.emergency_allow_non_loopback,
            duration_minutes: self.emergency_duration_minutes,
        }
    }
}
