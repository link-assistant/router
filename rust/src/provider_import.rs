use super::{ProviderError, ProviderKind, ProviderUpsert};

/// Parse a provider manifest without a store to write it into.
///
/// Public so a remote `providers import` can read the manifest on *this*
/// machine and declare each provider on the selected deployment, which is what
/// importing into another router means (issue #294).
///
/// # Errors
///
/// Returns the parse error when the manifest is not readable as provider
/// declarations.
pub fn parse_provider_import(input: &str) -> Result<Vec<ProviderUpsert>, ProviderError> {
    let trimmed = input.trim_start();
    let providers = if trimmed.starts_with('{') {
        let doc: serde_json::Value = serde_json::from_str(input)?;
        if let Some(providers) = doc.get("providers").and_then(serde_json::Value::as_array) {
            providers
                .iter()
                .cloned()
                .map(serde_json::from_value)
                .collect::<Result<Vec<_>, _>>()
                .map_err(ProviderError::Json)?
        } else {
            vec![serde_json::from_value(doc).map_err(ProviderError::Json)?]
        }
    } else if trimmed.starts_with('[') {
        serde_json::from_str(input).map_err(ProviderError::Json)?
    } else {
        parse_lenv_or_indented(input)?
    };
    reject_plaintext_lefine_imports(&providers)?;
    Ok(providers)
}

fn reject_plaintext_lefine_imports(providers: &[ProviderUpsert]) -> Result<(), ProviderError> {
    if providers.iter().any(|provider| {
        provider
            .kind
            .as_deref()
            .and_then(ProviderKind::from_str_opt)
            == Some(ProviderKind::Lefine)
            && provider
                .api_key
                .as_deref()
                .is_some_and(|key| !key.is_empty())
    }) {
        return Err(ProviderError::Invalid(
            "Lefine import files cannot contain plaintext api_key material; use api_key_env or providers add --api-key-stdin"
                .into(),
        ));
    }
    Ok(())
}

fn parse_lenv_or_indented(input: &str) -> Result<Vec<ProviderUpsert>, ProviderError> {
    if input.lines().any(|line| line.starts_with("PROVIDER: ")) {
        let mut providers = Vec::new();
        for raw in input.lines() {
            if let Some(json) = raw.trim().strip_prefix("PROVIDER: ") {
                providers.push(serde_json::from_str(json)?);
            }
        }
        return Ok(providers);
    }
    parse_indented_provider_config(input)
}

fn parse_indented_provider_config(input: &str) -> Result<Vec<ProviderUpsert>, ProviderError> {
    let mut providers = Vec::new();
    let mut current: Option<ProviderUpsert> = None;
    for raw in input.lines() {
        let line = raw.trim_end();
        if line.trim().is_empty() || line.trim_start().starts_with('#') {
            continue;
        }
        if !line.starts_with(' ') && !line.starts_with('\t') {
            if let Some(provider) = current.take() {
                providers.push(provider);
            }
            current = Some(ProviderUpsert {
                name: line.trim().to_string(),
                kind: Some("openai-compatible".into()),
                base_url: String::new(),
                default_model: None,
                models: Some(Vec::new()),
                supported_clients: Some(Vec::new()),
                api_key: None,
                api_key_env: None,
                encrypted_api_key: None,
                enabled: Some(true),
                subscriber_id: None,
                acknowledge_intermediary_risk: None,
                acknowledge_unsupported_clients: None,
                if_absent: false,
            });
            continue;
        }
        let Some(provider) = current.as_mut() else {
            return Err(ProviderError::Invalid(
                "indented provider field without provider name".into(),
            ));
        };
        let (key, value) = split_indented_field(line.trim())?;
        match key {
            "kind" => provider.kind = Some(value),
            "base_url" | "base-url" | "api_base" | "api-base" => provider.base_url = value,
            "model" | "default_model" | "default-model" => provider.default_model = Some(value),
            "models" => {
                provider.models = Some(
                    value
                        .split(',')
                        .map(str::trim)
                        .filter(|s| !s.is_empty())
                        .map(ToString::to_string)
                        .collect(),
                );
            }
            "supported_clients" | "supported-clients" => {
                provider.supported_clients = Some(
                    value
                        .split(',')
                        .map(str::trim)
                        .filter(|entry| !entry.is_empty())
                        .map(ToString::to_string)
                        .collect(),
                );
            }
            "api_key" | "api-key" => provider.api_key = Some(value),
            "api_key_env" | "api-key-env" => provider.api_key_env = Some(value),
            "enabled" => provider.enabled = Some(matches!(value.as_str(), "true" | "1" | "yes")),
            "subscriber_id" | "subscriber-id" => provider.subscriber_id = Some(value),
            "acknowledge_intermediary_risk" | "acknowledge-intermediary-risk" => {
                provider.acknowledge_intermediary_risk =
                    Some(matches!(value.as_str(), "true" | "1" | "yes"));
            }
            "acknowledge_unsupported_clients" | "acknowledge-unsupported-clients" => {
                provider.acknowledge_unsupported_clients = Some(
                    value
                        .split(',')
                        .map(str::trim)
                        .filter(|entry| !entry.is_empty())
                        .map(ToString::to_string)
                        .collect(),
                );
            }
            other => {
                return Err(ProviderError::Invalid(format!(
                    "unknown provider field: {other}"
                )));
            }
        }
    }
    if let Some(provider) = current {
        providers.push(provider);
    }
    if providers.is_empty() {
        return Err(ProviderError::Invalid(
            "provider import did not contain any providers".into(),
        ));
    }
    Ok(providers)
}

fn split_indented_field(line: &str) -> Result<(&str, String), ProviderError> {
    let Some((key, raw_value)) = line.split_once(char::is_whitespace) else {
        return Err(ProviderError::Invalid(format!(
            "provider field must be key value: {line}"
        )));
    };
    let value = raw_value.trim();
    Ok((key, unquote(value)))
}

fn unquote(value: &str) -> String {
    value
        .strip_prefix('"')
        .and_then(|v| v.strip_suffix('"'))
        .unwrap_or(value)
        .to_string()
}
