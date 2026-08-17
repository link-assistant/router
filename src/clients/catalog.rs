//! Authenticated router model discovery for client configuration.

use std::time::Duration;

use serde::Deserialize;

use super::{ClientError, ClientKind, ClientManager, compact_body, normalize_base_url};

/// One model advertised by the configured router.
#[derive(Clone, Debug, Deserialize, Eq, PartialEq)]
pub struct RouterModel {
    pub id: String,
    #[serde(default)]
    pub owned_by: String,
}

#[derive(Deserialize)]
struct RouterCatalog {
    data: Vec<RouterModel>,
}

impl ClientManager {
    /// Read the authenticated model catalog used by setup and doctor.
    pub(crate) async fn catalog(
        &self,
        base_url: &str,
        token: &str,
    ) -> Result<Vec<RouterModel>, ClientError> {
        let base_url = normalize_base_url(base_url)?;
        let url = models_url(&base_url);
        let response = reqwest::Client::new()
            .get(&url)
            .bearer_auth(token)
            .timeout(Duration::from_secs(15))
            .send()
            .await
            .map_err(|error| {
                ClientError::message(format!("router catalog is not reachable at {url}: {error}"))
            })?;
        let code = response.status();
        let response_body = response.text().await.unwrap_or_default();
        if !code.is_success() {
            return Err(ClientError::message(format!(
                "router catalog request failed at {url} ({code}): {}",
                compact_body(&response_body)
            )));
        }
        let catalog: RouterCatalog = serde_json::from_str(&response_body).map_err(|error| {
            ClientError::message(format!("router returned an invalid model catalog: {error}"))
        })?;
        let mut models = catalog
            .data
            .into_iter()
            .filter(|model| !model.id.trim().is_empty())
            .collect::<Vec<_>>();
        models.sort_by(|left, right| {
            left.id
                .cmp(&right.id)
                .then_with(|| left.owned_by.cmp(&right.owned_by))
        });
        models.dedup_by(|left, right| left.id == right.id && left.owned_by == right.owned_by);
        if models.is_empty() {
            return Err(ClientError::message(
                "router catalog contains no models from healthy subscriptions",
            ));
        }
        Ok(models)
    }
}

fn models_url(base_url: &str) -> String {
    let base_url = base_url.trim_end_matches('/');
    if base_url.ends_with("/v1") {
        format!("{base_url}/models")
    } else {
        format!("{base_url}/v1/models")
    }
}

pub(super) fn doctor_model(
    client: ClientKind,
    catalog: &[RouterModel],
) -> Result<&str, ClientError> {
    let required_owner = match client {
        ClientKind::Codex => Some("openai"),
        ClientKind::ClaudeCode => Some("anthropic"),
        ClientKind::GrokCli | ClientKind::Opencode | ClientKind::QwenCode | ClientKind::Agent => {
            None
        }
        ClientKind::Cursor | ClientKind::GeminiCli => unreachable!(),
    };
    // No preferred model *name*: the first catalog entry owned by the right
    // provider is used, so nothing here can point at a withdrawn or
    // unentitled vendor id (issue #192).
    catalog
        .iter()
        .find(|model| required_owner.is_none_or(|owner| model.owned_by == owner))
        .map(|model| model.id.as_str())
        .ok_or_else(|| {
            let subscription = required_owner.unwrap_or("compatible");
            ClientError::message(format!(
                "router catalog has no model for the {subscription} subscription"
            ))
        })
}
