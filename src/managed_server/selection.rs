//! Which router this machine is pointed at, and where that choice is kept.
//!
//! Split from `managed_server.rs` to keep that file within the repository's
//! 1000-line limit. The selection is one small, well-bounded thing: a file
//! under the router's state directory, two environment variables that outrank
//! it, and the rules for reading, writing and clearing them.

use std::fs;
use std::path::{Path, PathBuf};

use super::state::{state_directory, state_file_for_read, write_private_json};
use super::{AnyError, PersistedServer, SERVER_CONFIG, normalize_server};
use sha2::{Digest as _, Sha256};

const TRUST_DIRECTORY: &str = "server-trust";

/// The router this machine has explicitly been pointed at, if any.
///
/// Explicit only: the environment or a persisted `server use`. Discovery and
/// the managed container are deliberately absent, so this answers "did the
/// operator select a deployment?" without probing, starting or pulling
/// anything. A command that can only act locally uses it to refuse honestly
/// rather than acting on a router the operator did not name (issue #296).
pub fn selected_server() -> Result<Option<String>, AnyError> {
    if let Some(selected) = std::env::var("LINK_ASSISTANT_ROUTER_URL")
        .or_else(|_| std::env::var("ROUTER_URL"))
        .ok()
        .filter(|value| !value.trim().is_empty())
    {
        return normalize_server(&selected).map(Some);
    }
    load_persisted()?
        .map(|persisted| persisted.server)
        .filter(|value| !value.trim().is_empty())
        .map(|value| normalize_server(&value))
        .transpose()
}

pub fn save_persisted(config: &PersistedServer) -> Result<PathBuf, AnyError> {
    if config.server.is_empty() {
        return Err("server URL must not be empty".into());
    }
    let mut config = config.clone();
    config.server = normalize_server(&config.server)?;
    config.management_server = config
        .management_server
        .as_deref()
        .map(normalize_server)
        .transpose()?;
    if config.management_server.as_deref() == Some(config.server.as_str()) {
        config.management_server = None;
    }
    let path = state_directory()?.join(SERVER_CONFIG);
    write_private_json(&path, &config)?;
    Ok(path)
}

/// Save a selection after importing its optional CA bundles into Router state.
pub fn save_persisted_with_trust(
    config: &PersistedServer,
    ca_cert: Option<&Path>,
    management_ca_cert: Option<&Path>,
) -> Result<PathBuf, AnyError> {
    let previous = load_persisted().ok().flatten();
    let mut selected = config.clone();
    selected.ca_cert = match ca_cert {
        Some(path) => Some(import_certificate(path)?),
        None => previous
            .as_ref()
            .filter(|held| super::same_origin(&held.server, &selected.server))
            .and_then(|held| held.ca_cert.clone()),
    };
    let selected_management = selected
        .management_server
        .as_deref()
        .unwrap_or(&selected.server);
    selected.management_ca_cert = match management_ca_cert {
        Some(path) => Some(import_certificate(path)?),
        None => previous.as_ref().and_then(|held| {
            let held_management = held.management_server.as_deref().unwrap_or(&held.server);
            super::same_origin(held_management, selected_management)
                .then(|| held.management_ca_cert.clone())
                .flatten()
        }),
    };
    if selected.management_server.is_none() && selected.management_ca_cert.is_none() {
        selected.management_ca_cert = selected.ca_cert.clone();
    }
    let path = save_persisted(&selected)?;
    if let Some(previous) = previous {
        remove_unreferenced_certificates(&previous, &selected);
    }
    Ok(path)
}

fn import_certificate(source: &Path) -> Result<String, AnyError> {
    let bytes = fs::read(source).map_err(|error| {
        format!(
            "could not read CA certificate {}: {error}",
            source.display()
        )
    })?;
    let certificates = reqwest::Certificate::from_pem_bundle(&bytes)
        .map_err(|error| format!("invalid PEM CA certificate {}: {error}", source.display()))?;
    if certificates.is_empty() {
        return Err(format!(
            "CA certificate {} contains no certificates",
            source.display()
        )
        .into());
    }
    let name = format!("ca-{}.pem", hex::encode(Sha256::digest(&bytes)));
    let directory = state_directory()?.join(TRUST_DIRECTORY);
    fs::create_dir_all(&directory)?;
    super::state::set_owner_only(&directory)?;
    crate::durable_file::atomic_write_owner_only(&directory.join(&name), &bytes)?;
    Ok(name)
}

pub(super) fn certificate_path(name: Option<&str>) -> Result<Option<PathBuf>, AnyError> {
    let Some(name) = name else {
        return Ok(None);
    };
    let candidate = Path::new(name);
    if candidate.file_name().and_then(|part| part.to_str()) != Some(name)
        || !name.starts_with("ca-")
        || candidate.extension().and_then(|part| part.to_str()) != Some("pem")
    {
        return Err("persisted Router CA name is invalid".into());
    }
    let path = state_directory()?.join(TRUST_DIRECTORY).join(name);
    if !path.is_file() {
        return Err(format!(
            "selected Router CA certificate {} is missing; select the server again with --ca-cert",
            path.display()
        )
        .into());
    }
    Ok(Some(path))
}

fn remove_unreferenced_certificates(previous: &PersistedServer, selected: &PersistedServer) {
    for name in [
        previous.ca_cert.as_deref(),
        previous.management_ca_cert.as_deref(),
    ]
    .into_iter()
    .flatten()
    {
        if selected.ca_cert.as_deref() == Some(name)
            || selected.management_ca_cert.as_deref() == Some(name)
        {
            continue;
        }
        if let Ok(Some(path)) = certificate_path(Some(name)) {
            let _ = fs::remove_file(path);
        }
    }
}

pub fn clear_persisted() -> Result<PathBuf, AnyError> {
    let previous = load_persisted().ok().flatten();
    let path = state_directory()?.join(SERVER_CONFIG);
    match fs::remove_file(&path) {
        Ok(()) => {}
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => {}
        Err(error) => return Err(error.into()),
    }
    if let Some(previous) = previous {
        remove_unreferenced_certificates(&previous, &PersistedServer::default());
    }
    Ok(path)
}

pub fn load_persisted() -> Result<Option<PersistedServer>, AnyError> {
    let path = state_file_for_read(SERVER_CONFIG)?;
    match fs::read_to_string(&path) {
        Ok(source) => {
            let mut persisted: PersistedServer =
                crate::lino_json::decode(&source).map_err(|error| {
                    format!(
                        "invalid persisted server configuration {}: {error}",
                        path.display()
                    )
                })?;
            persisted.server = normalize_server(&persisted.server)?;
            persisted.management_server = persisted
                .management_server
                .as_deref()
                .map(normalize_server)
                .transpose()?;
            Ok(Some(persisted))
        }
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
            normalize_server(&config.server)?,
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
            management_server: None,
            token: None,
            run_max_requests: None,
            ca_cert: None,
            management_ca_cert: None,
        };
        assert!(
            save_persisted(&empty).is_err(),
            "an empty selection is not a router"
        );

        let schemeless = PersistedServer {
            server: "router.example:8080".into(),
            management_server: None,
            token: None,
            run_max_requests: None,
            ca_cert: None,
            management_ca_cert: None,
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
        // Against a root this test owns. Without it `clear_persisted` resolved
        // the developer's real `~/.config/link-assistant-router/server.json`
        // and deleted it -- a file holding a live token -- and the test passed
        // either way, which is why it read as harmless (issue #343).
        let directory = tempfile::tempdir().expect("temporary state root");
        let _guard = super::super::state::claim_state_root(directory.path().to_path_buf());

        let first = clear_persisted().expect("clearing is idempotent");
        let second = clear_persisted().expect("and stays idempotent");
        assert_eq!(first, second, "both name the same path");
        assert!(
            first.starts_with(directory.path()),
            "the path cleared must be the one this test owns: {}",
            first.display()
        );
    }

    /// Clearing removes a selection that is present, and only that one.
    ///
    /// The old test was named for an absent selection but nothing made it
    /// absent, so on a machine that had one it silently exercised the
    /// deletion path against real state (issue #343).
    #[test]
    fn clearing_a_present_selection_removes_it() {
        let directory = tempfile::tempdir().expect("temporary state root");
        let _guard = super::super::state::claim_state_root(directory.path().to_path_buf());

        save_persisted(&PersistedServer {
            server: "http://127.0.0.1:18878".to_string(),
            management_server: None,
            token: Some("la_sk_example".to_string()),
            run_max_requests: None,
            ca_cert: None,
            management_ca_cert: None,
        })
        .expect("save a selection");
        assert!(load_persisted().expect("load").is_some(), "it was saved");

        let cleared = clear_persisted().expect("clear it");
        assert!(cleared.starts_with(directory.path()));
        assert!(
            load_persisted().expect("load").is_none(),
            "the selection is gone after clearing"
        );
    }

    #[test]
    fn split_origins_round_trip_canonically_and_legacy_files_still_default() {
        let directory = tempfile::tempdir().expect("temporary state root");
        let _guard = super::super::state::claim_state_root(directory.path().to_path_buf());

        let path = save_persisted(&PersistedServer {
            server: "https://Inference.Example:443/".to_string(),
            management_server: Some("https://Admin.Example:8443/".to_string()),
            token: Some("la_sk_example".to_string()),
            run_max_requests: Some(4),
            ca_cert: None,
            management_ca_cert: None,
        })
        .expect("save split selection");
        let loaded = load_persisted().expect("load").expect("selection");
        assert_eq!(loaded.server, "https://inference.example");
        assert_eq!(
            loaded.management_server.as_deref(),
            Some("https://admin.example:8443")
        );

        fs::write(
            path,
            r#"{"server":"https://legacy.example","token":"la_sk_legacy"}"#,
        )
        .expect("seed legacy selection");
        let legacy = load_persisted().expect("load legacy").expect("selection");
        assert_eq!(legacy.server, "https://legacy.example");
        assert_eq!(legacy.management_server, None);
        assert_eq!(legacy.ca_cert, None);
        assert_eq!(legacy.management_ca_cert, None);
    }

    /// Selection takes ownership of trust material. The source can disappear,
    /// and clearing the selection removes only the copies Router owns.
    #[test]
    fn selected_ca_certificates_are_owned_and_cleaned_with_the_selection() {
        let directory = tempfile::tempdir().expect("temporary state root");
        let _guard = super::super::state::claim_state_root(directory.path().to_path_buf());
        let source = tempfile::tempdir().expect("certificate source");
        let (inference_ca, _) = crate::tls::ensure_generated(
            &source.path().join("inference"),
            &["inference.example".to_string()],
        )
        .expect("generate inference CA");
        let (management_ca, _) = crate::tls::ensure_generated(
            &source.path().join("management"),
            &["management.example".to_string()],
        )
        .expect("generate management CA");

        save_persisted_with_trust(
            &PersistedServer {
                server: "https://inference.example".into(),
                management_server: Some("https://management.example".into()),
                token: Some("la_sk_example".into()),
                run_max_requests: None,
                ca_cert: None,
                management_ca_cert: None,
            },
            Some(&inference_ca),
            Some(&management_ca),
        )
        .expect("save trusted selection");
        let loaded = load_persisted().expect("load").expect("selection");
        let inference_owned = certificate_path(loaded.ca_cert.as_deref())
            .expect("resolve inference CA")
            .expect("inference CA");
        let management_owned = certificate_path(loaded.management_ca_cert.as_deref())
            .expect("resolve management CA")
            .expect("management CA");
        assert_ne!(inference_owned, inference_ca);
        assert_ne!(management_owned, management_ca);
        assert_eq!(
            fs::read(&inference_owned).unwrap(),
            fs::read(&inference_ca).unwrap()
        );
        assert_eq!(
            fs::read(&management_owned).unwrap(),
            fs::read(&management_ca).unwrap()
        );

        let unrelated = super::super::state::state_directory()
            .unwrap()
            .join("unrelated-state");
        fs::write(&unrelated, "keep").expect("write unrelated state");
        clear_persisted().expect("clear selection");
        assert!(!inference_owned.exists());
        assert!(!management_owned.exists());
        assert!(inference_ca.exists() && management_ca.exists());
        assert!(unrelated.exists());
    }
}
