//! Secret-free ownership and precedence analysis for client routing config.

use std::fmt;
use std::path::{Path, PathBuf};

use serde::Serialize;
use serde_json::Value;
use sha2::{Digest as _, Sha256};
use toml_edit::DocumentMut;

use super::{
    CLAUDE_BASE_ENV, CLAUDE_TOKEN_ENV, CODEX_PROVIDER, ClientError, ClientKind, ClientManager,
    ROUTER_PROVIDER, read_environment_value, read_or_empty,
};

/// Who owns the routing configuration currently effective for a client.
#[derive(Clone, Copy, Debug, Eq, PartialEq, Serialize)]
#[serde(rename_all = "kebab-case")]
pub enum OwnershipState {
    Unconfigured,
    Foreign,
    ManagedIntact,
    ManagedDrifted,
    Ambiguous,
}

impl fmt::Display for OwnershipState {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(match self {
            Self::Unconfigured => "unconfigured",
            Self::Foreign => "foreign",
            Self::ManagedIntact => "managed-intact",
            Self::ManagedDrifted => "managed-drifted",
            Self::Ambiguous => "ambiguous",
        })
    }
}

/// Highest-precedence source selecting the endpoint.
#[derive(Clone, Copy, Debug, Eq, PartialEq, Serialize)]
#[serde(rename_all = "kebab-case")]
pub enum ConfigSource {
    AmbientEnvironment,
    PublicConfig,
    ManagedEnvironment,
    OwnershipMetadata,
}

/// Secret-free observation of one allowed client/Router-owned file.
#[derive(Clone, Debug, Eq, PartialEq, Serialize)]
pub struct ObservedFile {
    pub path: PathBuf,
    pub exists: bool,
    pub kind: &'static str,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sha256: Option<String>,
}

/// Complete ownership decision used by status, doctor, with, and repair.
#[derive(Clone, Debug, Serialize)]
pub struct ClientConfigAnalysis {
    pub client: ClientKind,
    pub state: OwnershipState,
    /// Endpoint or origin only. Credential values are never stored here.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub safe_origin: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub effective_source: Option<ConfigSource>,
    pub conflicts: Vec<String>,
    pub observed: Vec<ObservedFile>,
}

impl Serialize for ClientKind {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(self.canonical_name())
    }
}

pub(super) fn analyze_client(
    manager: &ClientManager,
    client: ClientKind,
) -> Result<ClientConfigAnalysis, ClientError> {
    let raw = manager.raw_status(client);
    let config_path = manager.config_path(client);
    let environment_path = manager.environment_path(client);
    let metadata_path = manager.credential_metadata_path(client);
    let marker_path = manager.ownership_marker_path(client);
    let mut observed = vec![
        observe(&config_path)?,
        observe(&environment_path)?,
        observe(&metadata_path)?,
    ];
    if let Some(path) = marker_path.as_deref() {
        observed.push(observe(path)?);
    }

    let config_exists = observed[0].exists;
    let environment_exists = observed[1].exists;
    let metadata_exists = observed[2].exists;
    let marker_exists = marker_path
        .as_ref()
        .is_some_and(|_| observed.get(3).is_some_and(|file| file.exists));

    let mut conflicts = Vec::new();
    if raw.unreadable.is_some() {
        conflicts.push("public-config:invalid".to_string());
    }

    let metadata = manager.credential_metadata(client).unwrap_or_else(|_| {
        conflicts.push("ownership-metadata:invalid".to_string());
        None
    });
    let metadata_complete = metadata.as_ref().is_some_and(|record| {
        let client_matches = ClientKind::from_str_opt(&record.client) == Some(client);
        let complete =
            client_matches && record.router.as_deref().is_some_and(|url| !url.is_empty());
        if !complete {
            conflicts.push("ownership-metadata:invalid".to_string());
        }
        complete
    });
    let marker_valid = marker_valid(
        client,
        marker_path.as_deref(),
        expected_marker_endpoint(metadata.as_ref(), client).as_deref(),
        &mut conflicts,
    );
    let managed_token = client
        .token_env()
        .map(|key| read_environment_value(&environment_path, key))
        .transpose()?
        .flatten();
    let managed_base = client
        .base_url_env()
        .map(|key| read_environment_value(&environment_path, key))
        .transpose()?
        .flatten();

    let expected_origin = metadata.as_ref().and_then(|record| record.router.clone());
    let expected_endpoint = expected_origin.as_deref().map(|origin| {
        format!(
            "{}{}",
            origin.trim_end_matches('/'),
            client.integration().endpoint_suffix
        )
    });
    let public_base = raw.base_url.clone();
    let ambient_base = client
        .base_url_env()
        .and_then(|key| manager.environment_var(key))
        .filter(|value| !value.is_empty());
    let safe_origin = ambient_base
        .clone()
        .or_else(|| public_base.clone())
        .or_else(|| managed_base.clone())
        .or_else(|| expected_origin.clone())
        .and_then(|value| sanitize_origin(&value));
    let effective_source = if ambient_base.is_some() {
        Some(ConfigSource::AmbientEnvironment)
    } else if public_base.is_some() {
        Some(ConfigSource::PublicConfig)
    } else if managed_base.is_some() {
        Some(ConfigSource::ManagedEnvironment)
    } else if expected_origin.is_some() {
        Some(ConfigSource::OwnershipMetadata)
    } else {
        None
    };

    critical_conflicts(
        manager,
        client,
        &config_path,
        expected_endpoint.as_deref(),
        managed_base.as_deref(),
        managed_token.as_deref(),
        &mut conflicts,
    );
    conflicts.sort();
    conflicts.dedup();

    let requires_marker = marker_path.is_some();
    let any_managed = environment_exists || metadata_exists || marker_exists;
    let requires_config = !matches!(client, ClientKind::GrokCli | ClientKind::GeminiCli);
    let complete_managed = environment_exists
        && metadata_complete
        && managed_token.is_some()
        && (!requires_config || config_exists)
        && (!requires_marker || marker_valid);
    let ambient_critical = client == ClientKind::ClaudeCode
        && CLAUDE_PRECEDENCE_ENV.iter().any(|key| {
            manager
                .environment_var(key)
                .is_some_and(|value| !value.is_empty())
        });
    let any_configuration = config_exists
        || public_base.is_some()
        || managed_base.is_some()
        || ambient_base.is_some()
        || ambient_critical
        || any_managed;
    let state = if raw.unreadable.is_some()
        || conflicts.iter().any(|key| key.ends_with(":invalid"))
        || (any_managed && !complete_managed)
    {
        OwnershipState::Ambiguous
    } else if complete_managed {
        if conflicts.is_empty() {
            OwnershipState::ManagedIntact
        } else {
            OwnershipState::ManagedDrifted
        }
    } else if any_configuration {
        OwnershipState::Foreign
    } else {
        OwnershipState::Unconfigured
    };

    Ok(ClientConfigAnalysis {
        client,
        state,
        safe_origin,
        effective_source,
        conflicts,
        observed,
    })
}

fn expected_marker_endpoint(
    metadata: Option<&super::ManagedCredential>,
    client: ClientKind,
) -> Option<String> {
    metadata
        .and_then(|record| record.router.as_deref())
        .map(|origin| {
            format!(
                "{}{}",
                origin.trim_end_matches('/'),
                client.integration().endpoint_suffix
            )
        })
}

fn marker_valid(
    client: ClientKind,
    path: Option<&Path>,
    expected_endpoint: Option<&str>,
    conflicts: &mut Vec<String>,
) -> bool {
    let Some(path) = path else {
        return true;
    };
    if !path.exists() {
        return false;
    }
    let valid = match client {
        ClientKind::ClaudeCode => super::claude_marker(path).map(|marker| {
            marker.is_some_and(|(managed, _, entries)| {
                expected_endpoint.is_none_or(|expected| managed == expected)
                    && [
                        ("CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY", Some("1")),
                        ("CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC", Some("0")),
                        ("ANTHROPIC_AUTH_TOKEN", None),
                        ("ANTHROPIC_API_KEY", None),
                        ("ANTHROPIC_MODEL", None),
                        ("ANTHROPIC_DEFAULT_OPUS_MODEL", None),
                        ("ANTHROPIC_DEFAULT_SONNET_MODEL", None),
                        ("ANTHROPIC_DEFAULT_HAIKU_MODEL", None),
                        ("CLAUDE_CODE_SUBAGENT_MODEL", None),
                    ]
                    .iter()
                    .all(|(key, wanted)| {
                        entries.iter().any(|(actual, managed, _)| {
                            actual == key && managed.as_deref() == *wanted
                        })
                    })
            })
        }),
        ClientKind::Codex => super::read_codex_marker(path).map(|_| true),
        ClientKind::Opencode | ClientKind::Agent | ClientKind::QwenCode => read_or_empty(path)
            .and_then(|source| {
                serde_json::from_str::<Value>(&source)
                    .map_err(ClientError::from)
                    .map(|marker| match client {
                        ClientKind::Opencode | ClientKind::Agent => {
                            marker.get("managed_provider").is_some()
                        }
                        ClientKind::QwenCode => marker
                            .get("managed_models")
                            .and_then(Value::as_array)
                            .is_some(),
                        _ => false,
                    })
            }),
        ClientKind::Cursor | ClientKind::GeminiCli | ClientKind::GrokCli => Ok(true),
    };
    if matches!(valid, Ok(true)) {
        true
    } else {
        conflicts.push("ownership-marker:invalid".to_string());
        false
    }
}

#[allow(clippy::too_many_arguments)]
fn critical_conflicts(
    manager: &ClientManager,
    client: ClientKind,
    config_path: &Path,
    expected_endpoint: Option<&str>,
    managed_base: Option<&str>,
    managed_token: Option<&str>,
    conflicts: &mut Vec<String>,
) {
    let ambient_base = client
        .base_url_env()
        .and_then(|key| manager.environment_var(key));
    if let (Some(key), Some(ambient), Some(expected)) = (
        client.base_url_env(),
        ambient_base.as_deref(),
        expected_endpoint,
    ) && ambient.trim_end_matches('/') != expected.trim_end_matches('/')
    {
        conflicts.push(format!("ambient:{key}"));
    }
    if let Some(token_key) = client.token_env()
        && let Some(ambient) = manager.environment_var(token_key)
        && managed_token.is_some_and(|managed| ambient != managed)
    {
        conflicts.push(format!("ambient:{token_key}"));
    }
    if let (Some(key), Some(expected)) = (client.base_url_env(), expected_endpoint)
        && managed_base
            .is_some_and(|actual| actual.trim_end_matches('/') != expected.trim_end_matches('/'))
    {
        conflicts.push(format!("managed-environment:{key}"));
    }
    if managed_token.is_none()
        && manager.environment_path(client).exists()
        && let Some(key) = client.token_env()
    {
        conflicts.push(format!("managed-environment:{key}"));
    }
    if client == ClientKind::ClaudeCode {
        let environment = manager.environment_path(client);
        for (key, expected) in [
            ("CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY", "1"),
            ("CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC", "0"),
        ] {
            if read_environment_value(&environment, key)
                .ok()
                .flatten()
                .as_deref()
                != Some(expected)
            {
                conflicts.push(format!("managed-environment:{key}"));
            }
        }
        for key in [
            "ANTHROPIC_API_KEY",
            "ANTHROPIC_MODEL",
            "ANTHROPIC_DEFAULT_OPUS_MODEL",
            "ANTHROPIC_DEFAULT_SONNET_MODEL",
            "ANTHROPIC_DEFAULT_HAIKU_MODEL",
            "CLAUDE_CODE_SUBAGENT_MODEL",
        ] {
            if read_environment_value(&environment, key)
                .ok()
                .flatten()
                .is_some_and(|value| !value.is_empty())
            {
                conflicts.push(format!("managed-environment:{key}"));
            }
        }
        for key in [
            "ANTHROPIC_API_KEY",
            "ANTHROPIC_MODEL",
            "ANTHROPIC_DEFAULT_OPUS_MODEL",
            "ANTHROPIC_DEFAULT_SONNET_MODEL",
            "ANTHROPIC_DEFAULT_HAIKU_MODEL",
            "CLAUDE_CODE_SUBAGENT_MODEL",
        ] {
            if manager
                .environment_var(key)
                .is_some_and(|value| !value.is_empty())
            {
                conflicts.push(format!("ambient:{key}"));
            }
        }
        for (key, wanted) in [
            ("CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY", "1"),
            ("CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC", "0"),
        ] {
            if manager
                .environment_var(key)
                .is_some_and(|value| !value.is_empty() && value != wanted)
            {
                conflicts.push(format!("ambient:{key}"));
            }
        }
    }

    match client {
        ClientKind::ClaudeCode => claude_conflicts(config_path, expected_endpoint, conflicts),
        ClientKind::Codex => codex_conflicts(config_path, expected_endpoint, conflicts),
        ClientKind::Opencode | ClientKind::Agent => {
            json_provider_conflicts(config_path, expected_endpoint, conflicts);
        }
        ClientKind::QwenCode => qwen_conflicts(config_path, expected_endpoint, conflicts),
        ClientKind::Cursor | ClientKind::GeminiCli | ClientKind::GrokCli => {}
    }
}

const CLAUDE_PRECEDENCE_ENV: [&str; 9] = [
    "ANTHROPIC_AUTH_TOKEN",
    "ANTHROPIC_API_KEY",
    "ANTHROPIC_MODEL",
    "ANTHROPIC_DEFAULT_OPUS_MODEL",
    "ANTHROPIC_DEFAULT_SONNET_MODEL",
    "ANTHROPIC_DEFAULT_HAIKU_MODEL",
    "CLAUDE_CODE_SUBAGENT_MODEL",
    "CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY",
    "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC",
];

fn sanitize_origin(value: &str) -> Option<String> {
    let parsed = reqwest::Url::parse(value).ok()?;
    matches!(parsed.scheme(), "http" | "https").then(|| parsed.origin().ascii_serialization())
}

fn claude_conflicts(path: &Path, expected: Option<&str>, conflicts: &mut Vec<String>) {
    let Ok(source) = read_or_empty(path) else {
        return;
    };
    if source.trim().is_empty() {
        return;
    }
    let Ok(document) = serde_json::from_str::<Value>(&source) else {
        return;
    };
    let Some(env) = document.get("env").and_then(Value::as_object) else {
        return;
    };
    if expected.is_some_and(|expected| {
        env.get(CLAUDE_BASE_ENV)
            .and_then(Value::as_str)
            .is_none_or(|actual| actual.trim_end_matches('/') != expected.trim_end_matches('/'))
    }) {
        conflicts.push(format!("public-config:{CLAUDE_BASE_ENV}"));
    }
    for key in [
        CLAUDE_TOKEN_ENV,
        "ANTHROPIC_API_KEY",
        "ANTHROPIC_MODEL",
        "ANTHROPIC_DEFAULT_OPUS_MODEL",
        "ANTHROPIC_DEFAULT_SONNET_MODEL",
        "ANTHROPIC_DEFAULT_HAIKU_MODEL",
        "CLAUDE_CODE_SUBAGENT_MODEL",
    ] {
        if env.contains_key(key) {
            conflicts.push(format!("public-config:{key}"));
        }
    }
    for (key, wanted) in [
        ("CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY", "1"),
        ("CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC", "0"),
    ] {
        if env.get(key).and_then(Value::as_str) != Some(wanted) {
            conflicts.push(format!("public-config:{key}"));
        }
    }
}

fn codex_conflicts(path: &Path, expected: Option<&str>, conflicts: &mut Vec<String>) {
    let Ok(source) = read_or_empty(path) else {
        return;
    };
    if source.trim().is_empty() {
        return;
    }
    let Ok(document) = source.parse::<DocumentMut>() else {
        return;
    };
    if expected.is_some()
        && document
            .get("model_provider")
            .and_then(|item| item.as_str())
            != Some(CODEX_PROVIDER)
    {
        conflicts.push("public-config:model_provider".to_string());
    }
    let provider = document
        .get("model_providers")
        .and_then(|item| item.get(CODEX_PROVIDER));
    if let Some(expected) = expected
        && provider
            .and_then(|item| item.get("base_url"))
            .and_then(|item| item.as_str())
            != Some(expected)
    {
        conflicts.push("public-config:model_providers.link-assistant.base_url".to_string());
    }
    if document.get("model_catalog_json").is_some() {
        conflicts.push("public-config:model_catalog_json".to_string());
    }
}

fn json_provider_conflicts(path: &Path, expected: Option<&str>, conflicts: &mut Vec<String>) {
    let Ok(source) = read_or_empty(path) else {
        return;
    };
    if source.trim().is_empty() {
        return;
    }
    let Ok(document) = serde_json::from_str::<Value>(&source) else {
        return;
    };
    let provider = document.pointer(&format!("/provider/{ROUTER_PROVIDER}"));
    if let Some(expected) = expected
        && provider
            .and_then(|provider| provider.pointer("/options/baseURL"))
            .and_then(Value::as_str)
            != Some(expected)
    {
        conflicts.push("public-config:provider.link-assistant.options.baseURL".to_string());
    }
}

fn qwen_conflicts(path: &Path, expected: Option<&str>, conflicts: &mut Vec<String>) {
    let Ok(source) = read_or_empty(path) else {
        return;
    };
    if source.trim().is_empty() {
        return;
    }
    let Ok(document) = serde_json::from_str::<Value>(&source) else {
        return;
    };
    if let Some(expected) = expected {
        let matches = document
            .pointer("/modelProviders/openai")
            .and_then(Value::as_array)
            .into_iter()
            .flatten()
            .any(|model| {
                model.get("envKey").and_then(Value::as_str) == Some("LINK_ASSISTANT_TOKEN")
                    && model.get("baseUrl").and_then(Value::as_str) == Some(expected)
            });
        if !matches {
            conflicts.push("public-config:modelProviders.openai".to_string());
        }
    }
}

fn observe(path: &Path) -> Result<ObservedFile, ClientError> {
    match std::fs::symlink_metadata(path) {
        Ok(metadata) => {
            let kind = if metadata.file_type().is_symlink() {
                "symlink"
            } else if metadata.is_file() {
                "file"
            } else {
                "non-regular"
            };
            let sha256 = metadata
                .is_file()
                .then(|| std::fs::read(path))
                .transpose()?
                .map(|bytes| hex::encode(Sha256::digest(bytes)));
            Ok(ObservedFile {
                path: path.to_path_buf(),
                exists: true,
                kind,
                sha256,
            })
        }
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(ObservedFile {
            path: path.to_path_buf(),
            exists: false,
            kind: "absent",
            sha256: None,
        }),
        Err(error) => Err(ClientError::message(format!(
            "could not inspect {}: {error}",
            path.display()
        ))),
    }
}

#[cfg(test)]
mod tests {
    use super::sanitize_origin;

    #[test]
    fn reported_origins_drop_credentials_and_request_details() {
        assert_eq!(
            sanitize_origin("https://operator:secret@router.example:8443/private?q=token#fragment")
                .as_deref(),
            Some("https://router.example:8443")
        );
        assert_eq!(
            sanitize_origin("http://router.example:80/api/services/openai").as_deref(),
            Some("http://router.example")
        );
        assert_eq!(sanitize_origin("file:///private/config"), None);
    }
}
