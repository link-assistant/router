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
        let models: Vec<RouterModel> = value
            .get("data")
            .and_then(Value::as_array)
            .ok_or("router model catalog did not contain a data array")?
            .iter()
            .filter_map(|model| serde_json::from_value::<RouterModel>(model.clone()).ok())
            .filter(|model| !model.id.trim().is_empty())
            .collect();
        if models.is_empty() {
            return Err(
                "router catalog contains no models authorized for this client token".into(),
            );
        }
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

pub(super) fn client_models_path(_client: ClientKind) -> &'static str {
    use crate::route_contract::{RouteId, route_template};
    route_template(RouteId::AggregateModels)
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
    fn wrapped_clients_use_the_client_scoped_normalized_catalog() {
        assert_eq!(client_models_path(ClientKind::ClaudeCode), "/api/models");
        assert_eq!(client_models_path(ClientKind::Codex), "/api/models");
        assert_eq!(client_models_path(ClientKind::GeminiCli), "/api/models");
        assert_eq!(client_models_path(ClientKind::QwenCode), "/api/models");
        assert_eq!(client_models_path(ClientKind::Opencode), "/api/models");
    }
}
