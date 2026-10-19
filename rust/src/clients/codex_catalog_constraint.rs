use super::{
    ClientError, ClientKind, ClientManager, DocumentMut, PathBuf, Value, atomic_write, fs,
    read_or_empty,
};

impl ClientManager {
    /// Remove a process-wide Codex catalog override before managed repair.
    ///
    /// `model_catalog_json` replaces Codex's complete catalog, so leaving a
    /// foreign value beside the managed provider lets that file choose models
    /// the Router never advertised. Repair snapshots this file before calling
    /// the helper, which makes the removal transactional and byte-exact on
    /// rollback.
    pub(super) fn remove_codex_catalog_constraint(&self) -> Result<(), ClientError> {
        let path = self.config_path(ClientKind::Codex);
        let source = read_or_empty(&path)?;
        if source.trim().is_empty() {
            return Ok(());
        }
        let mut document = source.parse::<DocumentMut>().map_err(|error| {
            ClientError::message(format!("invalid TOML in {}: {error}", path.display()))
        })?;
        if document
            .as_table_mut()
            .remove("model_catalog_json")
            .is_some()
        {
            atomic_write(&path, document.to_string().as_bytes())?;
        }
        Ok(())
    }

    /// Validate the foreign catalog before a repair transaction snapshots or
    /// edits Codex configuration. Missing, non-regular, symlinked, or invalid
    /// catalogs are not safe evidence of the constraint being repaired.
    pub(super) fn validate_codex_catalog_constraint(&self) -> Result<(), ClientError> {
        let config_path = self.config_path(ClientKind::Codex);
        let source = read_or_empty(&config_path)?;
        if source.trim().is_empty() {
            return Ok(());
        }
        let document = source.parse::<DocumentMut>().map_err(|error| {
            ClientError::message(format!(
                "invalid TOML in {}: {error}",
                config_path.display()
            ))
        })?;
        let Some(value) = document.get("model_catalog_json") else {
            return Ok(());
        };
        let path = value.as_str().ok_or_else(|| {
            ClientError::message("Codex model_catalog_json must be a file path string")
        })?;
        let path = PathBuf::from(path);
        let metadata = fs::symlink_metadata(&path).map_err(|error| {
            ClientError::message(format!(
                "cannot validate Codex model_catalog_json {}: {error}",
                path.display()
            ))
        })?;
        if metadata.file_type().is_symlink() || !metadata.is_file() {
            return Err(ClientError::message(format!(
                "refusing Codex model_catalog_json {} because it is {}",
                path.display(),
                if metadata.file_type().is_symlink() {
                    "a symlink"
                } else {
                    "not a regular file"
                }
            )));
        }
        let catalog: Value = serde_json::from_slice(&fs::read(&path)?).map_err(|error| {
            ClientError::message(format!(
                "invalid JSON in Codex model_catalog_json {}: {error}",
                path.display()
            ))
        })?;
        if !catalog.get("models").is_some_and(Value::is_array) {
            return Err(ClientError::message(format!(
                "Codex model_catalog_json {} must contain a models array",
                path.display()
            )));
        }
        Ok(())
    }
}
