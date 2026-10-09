//! Flags for management access policy and failed-authentication lockout.
use super::value_parsers::parse_truthy;
use crate::management_config::ManagementConfig;

/// Explicit management access settings.
#[derive(clap::Args, Debug, Clone)]
pub struct ManagementArgs {
    /// Allow remote management on combined listeners (admin listeners are explicit).
    #[arg(long = "management-allow-remote", env = "MANAGEMENT_ALLOW_REMOTE", global = true, num_args = 0..=1, default_value_t = false, default_missing_value = "true", value_parser = parse_truthy)]
    pub allow_remote: bool,
    /// Consecutive authentication failures before an IP ban; 0 disables lockout.
    #[arg(
        long = "management-lockout-failures",
        env = "MANAGEMENT_LOCKOUT_FAILURES",
        global = true,
        default_value_t = 5
    )]
    pub lockout_failures: u32,
    /// Ban duration in seconds; 0 disables lockout.
    #[arg(
        long = "management-lockout-secs",
        env = "MANAGEMENT_LOCKOUT_SECS",
        global = true,
        default_value_t = 1800
    )]
    pub lockout_secs: u64,
    /// Exempt loopback clients from lockout so local recovery stays available.
    #[arg(long = "management-lockout-exempt-loopback", env = "MANAGEMENT_LOCKOUT_EXEMPT_LOOPBACK", global = true, num_args = 0..=1, default_value_t = true, default_missing_value = "true", value_parser = parse_truthy)]
    pub exempt_loopback: bool,
}

impl ManagementArgs {
    /// Resolved management access configuration.
    #[must_use]
    pub const fn config(&self) -> ManagementConfig {
        ManagementConfig {
            allow_remote: self.allow_remote,
            lockout_failures: self.lockout_failures,
            lockout_secs: self.lockout_secs,
            exempt_loopback: self.exempt_loopback,
        }
    }
}

impl Default for ManagementArgs {
    fn default() -> Self {
        let config = ManagementConfig::default();
        Self {
            allow_remote: config.allow_remote,
            lockout_failures: config.lockout_failures,
            lockout_secs: config.lockout_secs,
            exempt_loopback: config.exempt_loopback,
        }
    }
}
