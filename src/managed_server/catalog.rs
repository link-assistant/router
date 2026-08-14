//! Model discovery and ordinary-token validation for wrapped clients.

use serde_json::Value;

use super::{AnyError, compact};
use crate::clients::RouterModel;

pub(super) async fn fetch_models(
    client: &reqwest::Client,
    base_url: &str,
    token: &str,
) -> Result<Vec<RouterModel>, AnyError> {
    let url = format!("{base_url}/v1/models");
    let response = client
        .get(&url)
        .bearer_auth(token)
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
