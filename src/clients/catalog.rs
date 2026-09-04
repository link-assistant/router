//! Authenticated router model discovery for client configuration.

use std::time::Duration;

use serde::{Deserialize, Serialize};

use super::{ClientError, ClientKind, ClientManager, compact_body, normalize_base_url};

/// One model advertised by the configured router.
#[derive(Clone, Debug, Default, Deserialize, Eq, PartialEq)]
pub struct RouterModel {
    pub id: String,
    #[serde(default)]
    pub owned_by: String,
    /// The model's live default, if the provider supplied one.
    #[serde(default)]
    pub default_reasoning_level: Option<String>,
    /// `None` means the provider did not supply capability metadata. An empty
    /// list is different: it authoritatively says this model has no selectable
    /// reasoning effort.
    #[serde(default)]
    pub supported_reasoning_levels: Option<Vec<RouterReasoningLevel>>,
}

/// One reasoning option retained verbatim from a live Codex catalog.
///
/// Strings are intentionally not an enum: Codex accepts provider-defined
/// future values, and Router must forward rather than freeze that vocabulary.
#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
pub struct RouterReasoningLevel {
    pub effort: String,
    #[serde(default)]
    pub description: String,
}

#[derive(Deserialize)]
struct RouterCatalog {
    data: Vec<RouterModel>,
}

impl ClientManager {
    /// Read the authenticated model catalog used by setup and doctor.
    pub(crate) async fn catalog(
        &self,
        client: ClientKind,
        base_url: &str,
        token: &str,
    ) -> Result<Vec<RouterModel>, ClientError> {
        let base_url = normalize_base_url(base_url)?;
        let url = models_url(client, &base_url);
        let request = reqwest::Client::new()
            .get(&url)
            .header("x-link-assistant-client", client.canonical_name());
        let request = match client {
            ClientKind::GeminiCli => request.header("x-goog-api-key", token),
            _ => request.bearer_auth(token),
        };
        let response = request
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

fn models_url(client: ClientKind, base_url: &str) -> String {
    let base_url = base_url.trim_end_matches('/');
    let origin = [
        "/api/services/anthropic",
        "/api/services/openai/v1",
        "/api/services/codex/v1",
        "/api/services/qwen/v1",
        "/api/services/gemini",
        // Read an old client config only to locate its origin. Requests still
        // use the canonical route below; no removed server alias is revived.
        "/api/gemini",
        "/api/qwen/v1",
        "/api/codex/v1",
        "/v1",
    ]
    .into_iter()
    .find_map(|suffix| base_url.strip_suffix(suffix))
    .unwrap_or(base_url);
    let id = match client {
        ClientKind::Codex => crate::route_contract::RouteId::CodexModels,
        ClientKind::GeminiCli => crate::route_contract::RouteId::GeminiModels,
        ClientKind::QwenCode => crate::route_contract::RouteId::QwenModels,
        ClientKind::ClaudeCode => crate::route_contract::RouteId::AnthropicModels,
        ClientKind::Cursor | ClientKind::GrokCli | ClientKind::Opencode | ClientKind::Agent => {
            crate::route_contract::RouteId::OpenAiModels
        }
    };
    format!("{origin}{}", crate::route_contract::route_template(id))
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

/// Dynamic Claude Code main/subagent target for a z.ai-backed catalog.
///
/// Native Anthropic discovery remains in charge whenever the live catalog has
/// an Anthropic model. With z.ai-only compatible access, Claude Code cannot
/// resolve its built-in Default and subagent fallback itself, so the smallest
/// supported pair of pins targets one exact currently advertised z.ai model.
/// The family pins stay absent so one GLM model is not presented as three fake
/// Anthropic families. An explicit z.ai model wins at both real boundaries.
#[must_use]
pub fn claude_gateway_model(catalog: &[RouterModel], explicit: Option<&str>) -> Option<String> {
    if let Some(explicit) = explicit
        && catalog
            .iter()
            .any(|model| model.id == explicit && model.owned_by == super::ZAI_MODEL_OWNER)
    {
        return Some(explicit.to_string());
    }
    if catalog
        .iter()
        .any(|model| model.owned_by == super::ANTHROPIC_MODEL_OWNER)
    {
        return None;
    }
    catalog
        .iter()
        .find(|model| model.owned_by == super::ZAI_MODEL_OWNER)
        .map(|model| model.id.clone())
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
