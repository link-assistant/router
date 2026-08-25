//! Which router this machine is pointed at, and where that choice is kept.
//!
//! Split from `managed_server.rs` to keep that file within the repository's
//! 1000-line limit. The selection is one small, well-bounded thing: a file
//! under the router's state directory, two environment variables that outrank
//! it, and the rules for reading, writing and clearing them.

use std::fs;
use std::path::PathBuf;

use super::{AnyError, PersistedServer, SERVER_CONFIG, normalize_server};
use super::state::{state_directory, write_private_json};

/// The router this machine has explicitly been pointed at, if any.
///
/// Explicit only: the environment or a persisted `server use`. Discovery and
/// the managed container are deliberately absent, so this answers "did the
/// operator select a deployment?" without probing, starting or pulling
/// anything. A command that can only act locally uses it to refuse honestly
/// rather than acting on a router the operator did not name (issue #296).
#[must_use]
pub fn selected_server() -> Option<String> {
    std::env::var("LINK_ASSISTANT_ROUTER_URL")
        .or_else(|_| std::env::var("ROUTER_URL"))
        .ok()
        .filter(|value| !value.trim().is_empty())
        .or_else(|| {
            load_persisted()
                .ok()
                .flatten()
                .map(|persisted| persisted.server)
                .filter(|value| !value.trim().is_empty())
        })
}

pub fn save_persisted(config: &PersistedServer) -> Result<PathBuf, AnyError> {
    if config.server.is_empty() {
        return Err("server URL must not be empty".into());
    }
    let mut config = config.clone();
    config.server = normalize_server(&config.server)?;
    let path = state_directory()?.join(SERVER_CONFIG);
    write_private_json(&path, &config)?;
    Ok(path)
}

pub fn clear_persisted() -> Result<PathBuf, AnyError> {
    let path = state_directory()?.join(SERVER_CONFIG);
    match fs::remove_file(&path) {
        Ok(()) => {}
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => {}
        Err(error) => return Err(error.into()),
    }
    Ok(path)
}

pub fn load_persisted() -> Result<Option<PersistedServer>, AnyError> {
    let path = state_directory()?.join(SERVER_CONFIG);
    match fs::read_to_string(&path) {
        Ok(source) => Ok(Some(crate::lino_json::decode(&source).map_err(
            |error| {
                format!(
                    "invalid persisted server configuration {}: {error}",
                    path.display()
                )
            },
        )?)),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(None),
        Err(error) => Err(error.into()),
    }
}

pub fn configured_source() -> Result<String, AnyError> {
    if let Ok(value) = std::env::var("LINK_ASSISTANT_ROUTER_URL") {
        return Ok(format!("environment: {}", normalize_server(&value)?));
    }
    if let Ok(value) = std::env::var("ROUTER_URL") {
        return Ok(format!("environment: {}", normalize_server(&value)?));
    }
    if let Some(config) = load_persisted()? {
        return Ok(format!(
            "persisted: {} (token {})",
            config.server,
            if config.token.is_some() {
                "set"
            } else {
                "unset"
            }
        ));
    }
    Ok("managed local container".to_string())
}
