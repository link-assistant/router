//! Codex loopback bridge state and configuration inspection.

use super::{
    CODEX_PROVIDER, CODEX_TOKEN_ENV, ClientError, ClientKind, ClientManager, DocumentMut, Item,
    OWNERSHIP_MARKER, PathBuf, SetupResult, Table, fs, read_codex_marker, read_or_empty, unchanged,
    value, write_codex_marker, write_if_changed,
};

impl ClientManager {
    /// Owner-only state for the persistent bridge accepted by Codex's origin policy.
    #[must_use]
    pub fn codex_loopback_bridge_state_path(&self) -> PathBuf {
        self.managed_path(ClientKind::Codex, "loopback-bridge.json")
    }

    pub(crate) fn codex_backend_matches(&self, expected: &str) -> Result<bool, ClientError> {
        let path = self.config_path(ClientKind::Codex);
        let source = read_or_empty(&path)?;
        if source.trim().is_empty() {
            return Ok(false);
        }
        let document = source.parse::<DocumentMut>().map_err(|error| {
            ClientError::message(format!("invalid TOML in {}: {error}", path.display()))
        })?;
        Ok(document.get("chatgpt_base_url").and_then(Item::as_str) == Some(expected))
    }
    pub(super) fn setup_codex(
        &self,
        base_url: &str,
        backend_base_url: Option<&str>,
    ) -> Result<SetupResult, ClientError> {
        let path = self.config_path(ClientKind::Codex);
        let source = read_or_empty(&path)?;
        let marker = self.codex_home.join(OWNERSHIP_MARKER);
        let existing_marker = marker
            .exists()
            .then(|| read_codex_marker(&marker))
            .transpose()?;
        let mut document = if source.trim().is_empty() {
            DocumentMut::new()
        } else {
            source.parse::<DocumentMut>().map_err(|error| {
                ClientError::message(format!("invalid TOML in {}: {error}", path.display()))
            })?
        };
        let previous_provider = document
            .get("model_provider")
            .and_then(Item::as_str)
            .map(str::to_string);
        let previous_chatgpt_base_url = document
            .get("chatgpt_base_url")
            .and_then(Item::as_str)
            .map(str::to_string);
        document["model_provider"] = value(CODEX_PROVIDER);
        if document.get("model_providers").is_none() {
            document["model_providers"] = Item::Table(Table::new());
        }
        let providers = document["model_providers"]
            .as_table_like_mut()
            .ok_or_else(|| ClientError::message("model_providers must be a TOML table"))?;
        if providers.get(CODEX_PROVIDER).is_none() {
            providers.insert(CODEX_PROVIDER, Item::Table(Table::new()));
        }
        let provider = providers
            .get_mut(CODEX_PROVIDER)
            .and_then(Item::as_table_like_mut)
            .ok_or_else(|| {
                ClientError::message("model_providers.link-assistant must be a TOML table")
            })?;
        provider.insert("name", value("OpenAI"));
        provider.insert("base_url", value(base_url));
        provider.insert("env_key", value(CODEX_TOKEN_ENV));
        provider.insert("wire_api", value("responses"));
        provider.insert("requires_openai_auth", value(true));
        provider.insert("supports_websockets", value(true));
        provider.insert("supports_standalone_web_search", value(true));
        let backend_base = backend_base_url.map_or_else(
            || base_url.strip_suffix("/v1").unwrap_or(base_url).to_string() + "/backend-api",
            str::to_string,
        );
        document["chatgpt_base_url"] = value(&backend_base);
        let result = write_if_changed(&path, &source, &document.to_string())?;
        if let Some((original_provider, managed_backend, original_backend)) = existing_marker {
            if previous_chatgpt_base_url.as_deref() == managed_backend.as_deref() {
                write_codex_marker(
                    &marker,
                    original_provider.as_deref(),
                    &backend_base,
                    original_backend.as_deref(),
                )?;
            }
        } else {
            let previous_provider = previous_provider.filter(|value| value != CODEX_PROVIDER);
            write_codex_marker(
                &marker,
                previous_provider.as_deref(),
                &backend_base,
                previous_chatgpt_base_url.as_deref(),
            )?;
        }
        Ok(result)
    }

    pub(super) fn remove_codex(&self) -> Result<SetupResult, ClientError> {
        let path = self.config_path(ClientKind::Codex);
        let source = read_or_empty(&path)?;
        if source.trim().is_empty() {
            return Ok(unchanged(path));
        }
        let marker_path = self.codex_home.join(OWNERSHIP_MARKER);
        if !marker_path.exists() {
            return Ok(unchanged(path));
        }
        let mut document = source.parse::<DocumentMut>().map_err(|error| {
            ClientError::message(format!("invalid TOML in {}: {error}", path.display()))
        })?;
        let (previous_provider, managed_chatgpt_base_url, previous_chatgpt_base_url) =
            read_codex_marker(&marker_path)?;
        if document.get("model_provider").and_then(Item::as_str) == Some(CODEX_PROVIDER) {
            if let Some(previous_provider) = previous_provider {
                document["model_provider"] = value(previous_provider);
            } else {
                document.as_table_mut().remove("model_provider");
            }
        }
        if let Some(providers) = document
            .get_mut("model_providers")
            .and_then(Item::as_table_like_mut)
        {
            providers.remove(CODEX_PROVIDER);
        }
        if document.get("chatgpt_base_url").and_then(Item::as_str)
            == managed_chatgpt_base_url.as_deref()
        {
            if let Some(previous) = previous_chatgpt_base_url {
                document["chatgpt_base_url"] = value(previous);
            } else {
                document.as_table_mut().remove("chatgpt_base_url");
            }
        }
        let result = write_if_changed(&path, &source, &document.to_string())?;
        if marker_path.exists() {
            fs::remove_file(marker_path)?;
        }
        Ok(result)
    }
}
