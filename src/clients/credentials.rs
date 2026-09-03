//! Metadata describing the router credential a managed client setup installed.
//!
//! `clients setup` writes a shell environment file holding a bearer token, so
//! `clients remove` has to know whether that token was minted by the setup
//! itself. Without this record the local file disappears while the credential
//! stays valid for anyone who copied it — the regression from issue #190.

use std::fs;
use std::path::Path;

use serde::{Deserialize, Serialize};

use super::{ClientError, files::atomic_write};

/// Where the token written into the managed environment file came from.
#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum TokenSource {
    /// `clients setup` minted the token itself, so it owns its lifetime.
    Minted,
    /// The operator supplied the token; removal leaves it alone by default.
    Supplied,
}

/// Secret-free description of one managed client credential.
///
/// The token itself is deliberately absent: only the store record id is kept,
/// which is enough to revoke and useless to an attacker.
#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct ManagedCredential {
    pub client: String,
    pub source: TokenSource,
    /// Token record id (`sub`), when it is known for this credential.
    #[serde(default)]
    pub token_id: Option<String>,
    #[serde(default)]
    pub label: Option<String>,
    #[serde(default)]
    pub issued_at: Option<i64>,
    /// The router this credential was minted by, when it is known.
    ///
    /// Recorded so a credential can still be named — and therefore revoked —
    /// after the command that minted it has gone, which a local-only token id
    /// cannot do once the target is another deployment.
    #[serde(default)]
    pub router: Option<String>,
    /// Non-secret subscriber identity carried by the signed client token.
    #[serde(default)]
    pub principal_id: Option<String>,
    /// Hash of the complete client config after setup. This contains no
    /// configuration bytes or credentials; it only distinguishes a genuinely
    /// identical second setup from a file the user changed afterward.
    #[serde(default)]
    pub config_sha256: Option<String>,
}

impl ManagedCredential {
    /// Whether `clients remove` must revoke this credential before deleting it.
    #[must_use]
    pub fn revocable_by_default(&self) -> bool {
        self.source == TokenSource::Minted && self.token_id.is_some()
    }
}

/// Persist the credential record next to the managed environment file.
pub fn write(path: &Path, credential: &ManagedCredential) -> Result<(), ClientError> {
    let parent = path
        .parent()
        .ok_or_else(|| ClientError::message("credential metadata has no parent directory"))?;
    fs::create_dir_all(parent)?;
    let rendered = format!("{}\n", serde_json::to_string_pretty(credential)?);
    atomic_write(path, rendered.as_bytes())?;
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt as _;
        fs::set_permissions(path, fs::Permissions::from_mode(0o600))?;
    }
    Ok(())
}

/// Read the credential record, tolerating a missing or unreadable file.
///
/// A corrupt record is reported as an error rather than silently ignored: the
/// caller uses it to decide whether a live credential still needs revoking.
pub fn read(path: &Path) -> Result<Option<ManagedCredential>, ClientError> {
    let source = super::files::read_or_empty(path)?;
    if source.trim().is_empty() {
        return Ok(None);
    }
    let credential: ManagedCredential = serde_json::from_str(&source).map_err(|error| {
        ClientError::message(format!(
            "could not parse managed credential metadata {}: {error}",
            path.display()
        ))
    })?;
    Ok(Some(credential))
}

/// Delete the credential record if it exists.
pub fn remove(path: &Path) -> Result<(), ClientError> {
    match fs::remove_file(path) {
        Ok(()) => Ok(()),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(()),
        Err(error) => Err(ClientError::message(format!(
            "could not remove {}: {error}",
            path.display()
        ))),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn minted_records_are_revocable_and_supplied_ones_are_not() {
        let minted = ManagedCredential {
            client: "codex".into(),
            source: TokenSource::Minted,
            token_id: Some("id".into()),
            label: None,
            issued_at: None,
            router: None,
            principal_id: Some("primary".into()),
            config_sha256: None,
        };
        assert!(minted.revocable_by_default());
        let supplied = ManagedCredential {
            source: TokenSource::Supplied,
            ..minted
        };
        assert!(!supplied.revocable_by_default());
    }

    #[test]
    fn records_round_trip_through_disk_without_the_token() {
        let directory = tempfile::tempdir().expect("temp dir");
        let path = directory.path().join("codex.json");
        let credential = ManagedCredential {
            client: "codex".into(),
            source: TokenSource::Minted,
            token_id: Some("token-id".into()),
            label: Some("client-codex".into()),
            issued_at: Some(7),
            router: Some("http://router.test".into()),
            principal_id: Some("primary".into()),
            config_sha256: Some("configuration-hash".into()),
        };
        write(&path, &credential).expect("write metadata");
        let contents = fs::read_to_string(&path).expect("read metadata");
        assert!(!contents.contains("la_sk_"));
        let read_back = read(&path).expect("read metadata").expect("record exists");
        assert_eq!(read_back.token_id.as_deref(), Some("token-id"));
        assert_eq!(read_back.source, TokenSource::Minted);
        remove(&path).expect("remove metadata");
        assert!(read(&path).expect("missing metadata is fine").is_none());
    }
}
