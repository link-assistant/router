use super::{
    CLAUDE_BASE_ENV, CODEX_PROVIDER, CODEX_TOKEN_ENV, ClientError, DocumentMut, Item, Path, Value,
    read_or_empty,
};

pub(super) fn normalize_base_url(base_url: &str) -> Result<String, ClientError> {
    let trimmed = base_url.trim().trim_end_matches('/');
    if !(trimmed.starts_with("http://") || trimmed.starts_with("https://")) {
        return Err(ClientError::message(
            "base URL must start with http:// or https://",
        ));
    }
    Ok(trimmed.to_string())
}

pub(super) fn read_codex_base_url(path: &Path) -> Result<Option<String>, ClientError> {
    let source = read_or_empty(path)?;
    if source.trim().is_empty() {
        return Ok(None);
    }
    let document = source.parse::<DocumentMut>().map_err(|error| {
        ClientError::message(format!("invalid TOML in {}: {error}", path.display()))
    })?;
    if document.get("model_provider").and_then(Item::as_str) != Some(CODEX_PROVIDER) {
        return Ok(None);
    }
    let Some(provider) = document
        .get("model_providers")
        .and_then(Item::as_table_like)
        .and_then(|providers| providers.get(CODEX_PROVIDER))
    else {
        return Ok(None);
    };
    let Some(provider) = provider.as_table_like() else {
        return Ok(None);
    };
    let configured = provider.get("wire_api").and_then(Item::as_str) == Some("responses")
        && provider.get("env_key").and_then(Item::as_str) == Some(CODEX_TOKEN_ENV);
    Ok(configured
        .then(|| {
            provider
                .get("base_url")
                .and_then(Item::as_str)
                .map(str::to_string)
        })
        .flatten())
}

pub(super) fn read_claude_base_url(path: &Path) -> Result<Option<String>, ClientError> {
    let source = read_or_empty(path)?;
    if source.trim().is_empty() {
        return Ok(None);
    }
    let document: Value = serde_json::from_str(&source).map_err(|error| {
        ClientError::message(format!("invalid JSON in {}: {error}", path.display()))
    })?;
    Ok(document
        .get("env")
        .and_then(|env| env.get(CLAUDE_BASE_ENV))
        .and_then(Value::as_str)
        .map(str::to_string))
}

pub(super) fn command_exists(command: &str) -> bool {
    std::env::var_os("PATH").is_some_and(|path| {
        std::env::split_paths(&path).any(|directory| directory.join(command).is_file())
    })
}

pub(super) fn compact_body(body: &str) -> String {
    const MAX: usize = 240;
    let compact = body.split_whitespace().collect::<Vec<_>>().join(" ");
    if compact.chars().count() <= MAX {
        compact
    } else {
        format!("{}…", compact.chars().take(MAX).collect::<String>())
    }
}

pub(super) fn shell_quote(value: &str) -> String {
    format!("'{}'", value.replace('\'', "'\\''"))
}
