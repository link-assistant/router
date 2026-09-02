//! Model discovery and ordinary-token validation for wrapped clients.

use serde_json::Value;

use super::{AnyError, compact};
use crate::clients::{ClientKind, RouterModel};

pub(super) async fn fetch_models(
    http: &reqwest::Client,
    client: ClientKind,
    base_url: &str,
    token: &str,
) -> Result<Vec<RouterModel>, AnyError> {
    let url = format!("{base_url}{}", client_models_path(client));
    let request = http
        .get(&url)
        .header("x-link-assistant-client", client.canonical_name());
    let request = match client {
        ClientKind::ClaudeCode => request.header("x-api-key", token),
        ClientKind::GeminiCli => request.header("x-goog-api-key", token),
        _ => request.bearer_auth(token),
    };
    let response = request
        .send()
        .await
        .map_err(|error| format!("router token validation could not reach {url}: {error}"))?;
    let status = response.status();
    let body = response.text().await.unwrap_or_default();
    if status.is_success() {
        let value: Value = serde_json::from_str(&body)
            .map_err(|error| format!("router model catalog returned invalid JSON: {error}"))?;
        let models = value
            .get("data")
            .and_then(Value::as_array)
            .ok_or("router model catalog did not contain a data array")?
            .iter()
            .filter_map(|model| {
                Some(RouterModel {
                    id: model.get("id")?.as_str()?.to_string(),
                    owned_by: model
                        .get("owned_by")
                        .and_then(Value::as_str)
                        .unwrap_or_default()
                        .to_string(),
                })
            })
            .collect();
        return Ok(models);
    }
    if status.as_u16() == 401 || status.as_u16() == 403 {
        return Err(format!(
            "router rejected the supplied token as {} ({status})",
            token_rejection_reason(&body)
        )
        .into());
    }
    Err(format!(
        "router token validation failed at {url} ({status}): {}",
        compact(&body)
    )
    .into())
}

pub(super) fn client_models_path(client: ClientKind) -> &'static str {
    use crate::route_contract::{RouteId, route_template};
    match client {
        ClientKind::Codex => route_template(RouteId::CodexModels),
        ClientKind::GeminiCli => route_template(RouteId::GeminiModels),
        ClientKind::QwenCode => route_template(RouteId::QwenModels),
        ClientKind::ClaudeCode => route_template(RouteId::AnthropicModels),
        ClientKind::Opencode | ClientKind::GrokCli | ClientKind::Cursor | ClientKind::Agent => {
            route_template(RouteId::OpenAiModels)
        }
    }
}

fn token_rejection_reason(body: &str) -> &'static str {
    let message = serde_json::from_str::<Value>(body)
        .ok()
        .and_then(|value| {
            value
                .pointer("/error/message")
                .or_else(|| value.get("message"))
                .and_then(Value::as_str)
                .map(str::to_ascii_lowercase)
        })
        .unwrap_or_else(|| body.to_ascii_lowercase());
    if message.contains("expired") {
        "expired"
    } else if message.contains("revoked") {
        "revoked"
    } else {
        "invalid"
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::clients::ClientKind;

    #[test]
    fn catalog_paths_are_namespaced_for_clients_with_non_anthropic_protocols() {
        assert_eq!(
            client_models_path(ClientKind::ClaudeCode),
            "/api/services/anthropic/v1/models"
        );
        assert_eq!(
            client_models_path(ClientKind::Codex),
            "/api/services/codex/v1/models"
        );
        assert_eq!(
            client_models_path(ClientKind::GeminiCli),
            "/api/services/gemini/v1beta/models"
        );
        assert_eq!(
            client_models_path(ClientKind::QwenCode),
            "/api/services/qwen/v1/models"
        );
        assert_eq!(
            client_models_path(ClientKind::Opencode),
            "/api/services/openai/v1/models"
        );
    }
}
