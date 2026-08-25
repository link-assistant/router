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
    select_model(client, catalog).ok_or_else(|| ClientError::message(unavailable(client, catalog)))
}

/// The model that suits `client` best, from what the router advertises.
///
/// One rule, used by `with`, `clients setup` and `clients doctor`. They used
/// to answer this differently — first entry of a declared owner, any owner at
/// all, and no filter whatsoever — so `clients setup opencode` could write a
/// model into a client config that `with opencode` would then refuse to launch
/// on (issue #301).
///
/// No preferred model *name*: the first catalog entry of the best available
/// owner is used, so nothing here can point at a withdrawn or unentitled
/// vendor id (issue #192).
#[must_use]
pub fn select_model(client: ClientKind, catalog: &[RouterModel]) -> Option<&str> {
    let integration = client.integration();
    for owner in integration.model_owners {
        if let Some(model) = catalog.iter().find(|model| &model.owned_by == owner) {
            return Some(model.id.as_str());
        }
    }
    if integration.strict_owner && !catalog.iter().all(|model| model.owned_by.is_empty()) {
        // Substituting is defensible only when the catalog does not say who
        // owns its models: then the router cannot tell, and a usable model
        // beats refusing. When every entry names a *different* owner it does
        // know, and substituting one launched Claude Code against an `OpenAI`
        // model — so the client blamed its own model name rather than the
        // lapsed subscription (issue #225).
        return None;
    }
    catalog.first().map(|model| model.id.as_str())
}

/// Every model `client` could be launched on, best owners first.
///
/// What a client config embeds must be what `with` would launch it on, or the
/// two disagree about the same question (issue #301).
#[must_use]
pub fn usable_models(client: ClientKind, catalog: &[RouterModel]) -> Vec<RouterModel> {
    let integration = client.integration();
    if integration.model_owners.is_empty() {
        return catalog.to_vec();
    }
    let mut preferred: Vec<RouterModel> = Vec::new();
    for owner in integration.model_owners {
        preferred.extend(
            catalog
                .iter()
                .filter(|model| &model.owned_by == owner)
                .cloned(),
        );
    }
    if preferred.is_empty() && !integration.strict_owner {
        return catalog.to_vec();
    }
    preferred
}

/// Why nothing in the catalog suits this client, and what to do about it.
///
/// Names the owners that *are* advertised and points at `--model`, because the
/// message named the mismatch and left the reader to guess that an explicit
/// model is still allowed (issue #301).
#[must_use]
pub fn unavailable(client: ClientKind, catalog: &[RouterModel]) -> String {
    let mut advertised: Vec<&str> = catalog
        .iter()
        .map(|model| model.owned_by.as_str())
        .filter(|owner| !owner.is_empty())
        .collect();
    advertised.sort_unstable();
    advertised.dedup();
    let holdings = if advertised.is_empty() {
        "the catalog is empty".to_string()
    } else {
        format!("it advertises only {} models", advertised.join(", "))
    };
    let wanted = client.integration().model_owners.join(", ");
    format!(
        "the router advertises no model for {} ({wanted} models): {holdings}. Authorize a \
         matching subscription on the router host, or pass --model explicitly to use one of \
         the models it does advertise",
        client.integration().name
    )
}
