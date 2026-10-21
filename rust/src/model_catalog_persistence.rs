//! On-disk model catalog state: the persisted catalogs and the owner-only
//! invalidation markers. Split from `model_catalog.rs` to keep that file
//! within the repository's 1000-line limit.

use std::collections::HashMap;
use std::path::{Path, PathBuf};

use super::{CatalogStatus, PERSISTED_CATALOG_VERSION, PersistedCatalogs};
use crate::subscription::SubscriptionProvider;

pub(super) fn load_persisted_catalogs(
    path: &Path,
) -> Result<HashMap<(SubscriptionProvider, String), CatalogStatus>, String> {
    let bytes = match std::fs::read(path) {
        Ok(bytes) => bytes,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(HashMap::new()),
        Err(error) => return Err(error.to_string()),
    };
    let persisted: PersistedCatalogs =
        serde_json::from_slice(&bytes).map_err(|error| error.to_string())?;
    if persisted.version != PERSISTED_CATALOG_VERSION {
        return Err(format!(
            "unsupported persisted catalog version {}",
            persisted.version
        ));
    }
    Ok(persisted
        .entries
        .into_iter()
        .map(|entry| ((entry.provider, entry.router_account), entry.status))
        .collect())
}

pub(super) fn invalidation_path(
    directory: &Path,
    provider: SubscriptionProvider,
    router_account: &str,
) -> PathBuf {
    use sha2::Digest as _;
    let digest = sha2::Sha256::digest(format!("{provider}\0{router_account}").as_bytes());
    directory.join(format!(
        "{}-{}.invalidated",
        provider.as_str(),
        hex::encode(digest)
    ))
}

pub(super) fn secure_directory(path: &Path) -> std::io::Result<()> {
    std::fs::create_dir_all(path)?;
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt as _;
        std::fs::set_permissions(path, std::fs::Permissions::from_mode(0o700))?;
    }
    Ok(())
}
