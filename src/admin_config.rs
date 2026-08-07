//! Configuration for the opt-in admin UI listener.
//!
//! Split out of [`crate::config`] to keep that module within the repository's
//! per-file line budget; the constructors are re-exported there, so callers can
//! keep using `config::admin_ui_config`.

use std::env;
use std::time::Duration;

use crate::config::{ConfigError, parse_u64_env};

/// Build the admin UI configuration from environment variables.
///
/// The listener is enabled only when `ADMIN_PORT` names a non-zero port, so
/// upgrading an existing deployment gains no new surface.
///
/// # Errors
///
/// Returns [`ConfigError::InvalidPort`] for an unparseable `ADMIN_PORT` and
/// [`ConfigError::InvalidAddress`] when host and port do not form an address.
pub fn admin_ui_from_env() -> Result<crate::admin::AdminUiConfig, ConfigError> {
    let port = env::var("ADMIN_PORT")
        .ok()
        .filter(|value| !value.trim().is_empty())
        .map(|value| value.trim().parse::<u16>())
        .transpose()
        .map_err(|_| ConfigError::InvalidPort)?;
    let host = env::var("ADMIN_HOST").unwrap_or_else(|_| "127.0.0.1".to_string());
    let ttl = parse_u64_env(
        "ADMIN_CLAIM_TTL_SECS",
        crate::admin::DEFAULT_CANDIDATE_TTL_SECS,
    );
    admin_ui_config(port, &host, ttl)
}

/// Assemble an [`crate::admin::AdminUiConfig`] from explicit parts.
///
/// # Errors
///
/// Returns [`ConfigError::InvalidAddress`] when `host` and `port` do not parse
/// as a socket address.
pub fn admin_ui_config(
    port: Option<u16>,
    host: &str,
    candidate_ttl_secs: u64,
) -> Result<crate::admin::AdminUiConfig, ConfigError> {
    let default = crate::admin::AdminUiConfig::default();
    let enabled = port.is_some_and(|value| value != 0);
    let listen_addr = match port.filter(|value| *value != 0) {
        Some(value) => format!("{host}:{value}")
            .parse()
            .map_err(|_| ConfigError::InvalidAddress)?,
        None => default.listen_addr,
    };
    Ok(crate::admin::AdminUiConfig {
        enabled,
        listen_addr,
        candidate_ttl: Duration::from_secs(candidate_ttl_secs),
    })
}
