//! Which router this machine is pointed at, and where that choice is kept.
//!
//! Split from `managed_server.rs` to keep that file within the repository's
//! 1000-line limit. The selection is one small, well-bounded thing: a file
//! under the router's state directory, two environment variables that outrank
//! it, and the rules for reading, writing and clearing them.

use std::fs;
use std::path::PathBuf;

use super::state::{state_directory, write_private_json};
use super::{AnyError, PersistedServer, SERVER_CONFIG, normalize_server};

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

#[cfg(test)]
mod tests {
    use super::*;

    /// A selection must be a URL the CLI can actually reach. `save_persisted`
    /// rejects the two ways it cannot be — empty, and without a scheme —
    /// rather than writing a value every later command has to re-validate.
    #[test]
    fn a_selection_must_be_an_absolute_http_url() {
        let empty = PersistedServer {
            server: String::new(),
            token: None,
            run_max_requests: None,
        };
        assert!(
            save_persisted(&empty).is_err(),
            "an empty selection is not a router"
        );

        let schemeless = PersistedServer {
            server: "router.example:8080".into(),
            token: None,
            run_max_requests: None,
        };
        let error = save_persisted(&schemeless)
            .expect_err("a schemeless URL must be refused")
            .to_string();
        assert!(
            error.contains("http://") && error.contains("https://"),
            "the refusal must name what is acceptable: {error}"
        );
    }

    /// Clearing a selection that was never made is not an error: `server use
    /// --clear` runs on machines that never selected anything.
    #[test]
    fn clearing_an_absent_selection_succeeds() {
        let first = clear_persisted().expect("clearing is idempotent");
        let second = clear_persisted().expect("and stays idempotent");
        assert_eq!(first, second, "both name the same path");
    }
}
