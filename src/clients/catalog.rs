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
    /// Selector semantics supplied for this exact live row. Unknown is the
    /// fail-closed default; the spelling itself never classifies an alias.
    #[serde(default)]
    pub selector_kind: crate::model_contract::ModelSelectorKind,
    /// Field-level evidence and exact route scope projected by Router.
    #[serde(default)]
    pub capability_provenance: serde_json::Value,
    /// The model's live default, if the provider supplied one.
    #[serde(default)]
    pub default_reasoning_level: Option<String>,
    /// When the provider says this model was created, if it said at all.
    ///
    /// The vendor's own recency signal, projected from the `created` field of
    /// its catalog entry. Read so Router can pick the *current* model when it
    /// must supply one itself, rather than treating catalog position as a
    /// ranking — which pinned the oldest model a deployment could serve
    /// (issue #563).
    #[serde(default)]
    pub provider_created_at: Option<i64>,
    /// `None` means the provider did not supply capability metadata. An empty
    /// list is different: it authoritatively says this model has no selectable
    /// reasoning effort.
    #[serde(default)]
    pub supported_reasoning_levels: Option<Vec<RouterReasoningLevel>>,
    /// Client-specific identities backed by reviewed provider protocol
    /// contracts. An empty object means no safe identity was advertised.
    #[serde(default)]
    pub client_capabilities: RouterClientCapabilities,
}

/// Whether one exact client-facing model spelling is authorized by the live
/// catalog.
///
/// Claude Code appends `[1m]` to an Anthropic model id when the user selects
/// its supported one-million-token context variant. Router catalogs advertise
/// the base id, but the suffixed value must still reach Claude unchanged so the
/// client can preserve that selection. This exception is deliberately limited
/// to an exact Anthropic-owned base; compatible models owned by another
/// provider do not acquire a context variant merely because Claude can use
/// their wire protocol.
pub fn model_is_authorized(client: ClientKind, models: &[RouterModel], requested: &str) -> bool {
    if client == ClientKind::ClaudeCode && requested.ends_with("[1m]") {
        return claude_context_variant_is_authorized(models, requested);
    }
    if models.iter().any(|model| model.id == requested) {
        return true;
    }
    false
}

/// Whether Claude's context-variant spelling has an exact Anthropic base in
/// the live catalog.
pub fn claude_context_variant_is_authorized(models: &[RouterModel], requested: &str) -> bool {
    let Some(base) = requested
        .strip_suffix("[1m]")
        .filter(|base| !base.is_empty())
    else {
        return false;
    };
    models
        .iter()
        .any(|model| model.id == base && model.owned_by == super::ANTHROPIC_MODEL_OWNER)
}

#[derive(Clone, Debug, Default, Deserialize, Eq, PartialEq)]
pub struct RouterClientCapabilities {
    #[serde(default)]
    pub claude: Option<ClaudeModelCapabilities>,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq)]
pub struct ClaudeModelCapabilities {
    pub behaves_as: String,
    pub source: String,
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
        self.catalog_with_client(&reqwest::Client::new(), client, base_url, token)
            .await
    }

    /// Read the catalog with the trust configured for this Router origin.
    pub(crate) async fn catalog_with_client(
        &self,
        http: &reqwest::Client,
        client: ClientKind,
        base_url: &str,
        token: &str,
    ) -> Result<Vec<RouterModel>, ClientError> {
        let base_url = normalize_base_url(base_url)?;
        let url = models_url(client, &base_url);
        let request = http
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

fn models_url(_client: ClientKind, base_url: &str) -> String {
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
    format!(
        "{origin}{}",
        crate::route_contract::route_template(crate::route_contract::RouteId::AggregateModels)
    )
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
    // Catalog order is the provider's listing, not a ranking. Taking the first
    // entry pinned whichever model the vendor happened to list first — in
    // practice the *oldest* of ten, while the picker's last row was the newest
    // (issue #563). The vendor's own `created` timestamp is the signal that
    // actually answers "which of these is current"; the id is the tie-break, so
    // the result never depends on array position.
    catalog
        .iter()
        .filter(|model| model.owned_by == super::ZAI_MODEL_OWNER)
        .max_by(|left, right| {
            left.provider_created_at
                .cmp(&right.provider_created_at)
                .then_with(|| left.id.cmp(&right.id))
        })
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

/// Whether Codex may use the Responses WebSocket transport for this launch.
///
/// z.ai's Codex adapter serves HTTP/SSE Responses but cannot preserve Codex's
/// WebSocket session semantics. An exact selection decides when present; with
/// no selection, a mixed picker must remain on the transport every visible
/// model can serve (issue #578).
#[must_use]
pub fn codex_supports_websockets(models: &[RouterModel], selected_model: Option<&str>) -> bool {
    if let Some(selected) = selected_model {
        return models
            .iter()
            .find(|model| model.id == selected)
            .is_some_and(|model| model.owned_by != super::ZAI_MODEL_OWNER);
    }
    !usable_models(ClientKind::Codex, models)
        .iter()
        .any(|model| model.owned_by == super::ZAI_MODEL_OWNER)
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
