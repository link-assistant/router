use std::fmt;
use std::path::PathBuf;

use serde::Serialize;

use super::{ConfigSource, OwnershipState};

#[derive(Debug)]
pub struct ClientError(String);

impl ClientError {
    /// Build a diagnostic with credential-looking runs already removed.
    ///
    /// Every client diagnostic quotes something the router or an upstream sent
    /// back — a URL, a response body, a transport error — and any of those can
    /// carry the bearer token that was just used. Redacting here, at the single
    /// constructor, keeps that out of terminals, logs, and CI output.
    pub(super) fn message(message: impl Into<String>) -> Self {
        Self(crate::login_url::redact_secrets(&message.into()))
    }
}

impl fmt::Display for ClientError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(&self.0)
    }
}

impl std::error::Error for ClientError {}

impl From<std::io::Error> for ClientError {
    fn from(error: std::io::Error) -> Self {
        Self::message(error.to_string())
    }
}

impl From<serde_json::Error> for ClientError {
    fn from(error: serde_json::Error) -> Self {
        Self::message(error.to_string())
    }
}

/// Secret-free state returned by `clients list` and `clients show`.
#[derive(Clone, Debug, Serialize)]
pub struct ClientStatus {
    pub client: String,
    pub installed: bool,
    pub configured: bool,
    pub config_path: PathBuf,
    pub dialect: &'static str,
    pub base_url: Option<String>,
    pub token_env: Option<&'static str>,
    pub token_env_set: bool,
    /// Router ownership of the effective routing configuration.
    pub ownership_state: OwnershipState,
    /// Highest-precedence source which currently selects the endpoint.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub effective_source: Option<ConfigSource>,
    /// Routing-critical key names which disagree; values are never retained.
    pub conflicts: Vec<String>,
    /// Why this client's configuration could not be read, if it could not.
    ///
    /// A damaged file is a property of one row, not of the listing: propagating
    /// it ended the table at that client and silently hid every client after
    /// it, while the error named a *different* client than the one missing
    /// (issue #304).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub unreadable: Option<String>,
    /// Why the router cannot manage this client at all, if it cannot.
    ///
    /// `configured: false` is indistinguishable from a real answer for a
    /// client whose reader is a hardcoded `None` (issue #303).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub unsupported: Option<&'static str>,
}

/// Result of a successful setup operation.
#[derive(Debug)]
pub struct SetupResult {
    pub path: PathBuf,
    pub backup: Option<PathBuf>,
    pub changed: bool,
}
