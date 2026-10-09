//! Management listener policy and authentication lockout settings.

/// Management access settings, shared across an instance's listeners.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ManagementConfig {
    /// Permit non-loopback management on combined listeners.
    pub allow_remote: bool,
    /// Consecutive failures before a ban; zero disables lockout.
    pub lockout_failures: u32,
    /// Ban duration; zero disables lockout.
    pub lockout_secs: u64,
    /// Preserve local recovery without IP lockout.
    pub exempt_loopback: bool,
}

impl Default for ManagementConfig {
    fn default() -> Self {
        Self {
            allow_remote: false,
            lockout_failures: 5,
            lockout_secs: 1800,
            exempt_loopback: true,
        }
    }
}

impl ManagementConfig {
    /// Resolve environment-only configuration. Invalid values fail closed.
    pub fn from_env() -> Result<Self, String> {
        Ok(Self {
            allow_remote: boolean("MANAGEMENT_ALLOW_REMOTE", false)?,
            lockout_failures: integer("MANAGEMENT_LOCKOUT_FAILURES", 5)?,
            lockout_secs: integer("MANAGEMENT_LOCKOUT_SECS", 1800)?,
            exempt_loopback: boolean("MANAGEMENT_LOCKOUT_EXEMPT_LOOPBACK", true)?,
        })
    }

    /// Refuse published sample signing and administrative secrets at startup.
    pub fn validate_secrets(token_secret: &str, admin_key: Option<&str>) -> Result<(), String> {
        for (name, flag, secret) in [
            ("TOKEN_SECRET", "--token-secret", Some(token_secret)),
            ("TOKEN_ADMIN_KEY", "--admin-key", admin_key),
        ] {
            if secret.is_some_and(is_example_secret) {
                return Err(format!(
                    "{name} / {flag} must not equal a documented example secret; generate an independent random value"
                ));
            }
        }
        Ok(())
    }
}

fn integer<T: std::str::FromStr>(name: &str, default: T) -> Result<T, String> {
    crate::operation_context::var(name).map_or(Ok(default), |value| {
        value
            .parse()
            .map_err(|_| format!("{name} must be a non-negative integer"))
    })
}

fn boolean(name: &str, default: bool) -> Result<bool, String> {
    crate::operation_context::var(name).map_or(Ok(default), |value| {
        match value.to_ascii_lowercase().as_str() {
            "true" | "1" | "yes" | "on" => Ok(true),
            "false" | "0" | "no" | "off" => Ok(false),
            _ => Err(format!("{name} must be true or false")),
        }
    })
}

/// Published examples are unsafe even if intentionally copied.
#[must_use]
pub fn is_example_secret(secret: &str) -> bool {
    matches!(
        secret.trim(),
        "your-secure-secret-here"
            | "your-secure-secret"
            | "your-router-token-secret"
            | "your-secret-key"
            | "your-secret"
            | "your-admin-key"
            | "your-admin-secret"
            | "your-admin-key-here"
            | "your-token-admin-key"
            | "a-long-random-secret"
            | "example-shared-signing-secret"
            | "test-secret"
            | "change-me"
            | "changeme"
            | "replace-me"
            | "admin-secret"
    ) || crate::token_secret::is_placeholder(secret)
}

#[cfg(test)]
#[path = "management_config_tests.rs"]
mod tests;
