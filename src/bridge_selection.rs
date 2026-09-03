//! Deterministic bridge-model selection from live provider catalogs.
//!
//! A cross-protocol bridge has to name an upstream model: a client speaking the
//! Anthropic Messages dialect sends `claude-…`, which means nothing to a Codex,
//! Qwen or Gemini upstream. That model used to come from a per-provider
//! constant baked into the router, which could advertise or route to models
//! that were renamed, withdrawn, or never entitled for the account (issue #192).
//!
//! Selection now reads the account's live catalog. When no compatible model
//! exists the request fails with `model_selection_required` rather than
//! silently substituting a source-code constant.
//!
//! # Policy
//!
//! The operator chooses how a model is picked from the catalog with
//! `--bridge-model-policy` / `BRIDGE_MODEL_POLICY`. Every policy is a total
//! order over the catalog, so the same catalog always yields the same choice.

use std::fmt;

/// How to choose an upstream model from a live catalog.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub enum BridgeModelPolicy {
    /// The catalog's first entry in lexicographic order.
    ///
    /// Deterministic and provider-neutral: it encodes no opinion about which
    /// vendor names are "better", which is what let the old constants drift.
    #[default]
    FirstAdvertised,
    /// The catalog's last entry in lexicographic order.
    ///
    /// Vendors commonly suffix newer models with higher version strings, so
    /// this usually selects the newest generation without naming one.
    LastAdvertised,
}

impl BridgeModelPolicy {
    /// Parse an operator-facing policy name.
    ///
    /// # Errors
    ///
    /// Returns the accepted names when `value` is not one of them.
    pub fn parse(value: &str) -> Result<Self, String> {
        match value.trim().to_ascii_lowercase().replace('_', "-").as_str() {
            "" | "first" | "first-advertised" => Ok(Self::FirstAdvertised),
            "last" | "last-advertised" => Ok(Self::LastAdvertised),
            other => Err(format!(
                "unknown bridge model policy '{other}'; expected 'first-advertised' or 'last-advertised'"
            )),
        }
    }

    /// The operator-facing name of this policy.
    #[must_use]
    pub const fn name(self) -> &'static str {
        match self {
            Self::FirstAdvertised => "first-advertised",
            Self::LastAdvertised => "last-advertised",
        }
    }

    /// Apply the policy to a catalog.
    ///
    /// `catalog` is sorted before selection so the result depends only on the
    /// set of advertised models, not on the order the provider returned them.
    #[must_use]
    pub fn choose(self, catalog: &[String]) -> Option<String> {
        let mut sorted: Vec<&String> = catalog.iter().filter(|id| !id.is_empty()).collect();
        sorted.sort();
        match self {
            Self::FirstAdvertised => sorted.first().map(|id| (*id).clone()),
            Self::LastAdvertised => sorted.last().map(|id| (*id).clone()),
        }
    }
}

/// Why a bridged request could not be given an upstream model.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ModelSelectionRequired {
    /// Provider whose catalog was consulted.
    pub provider: String,
    /// Why no model could be chosen.
    pub reason: SelectionFailure,
}

/// The specific reason a catalog yielded no usable model.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SelectionFailure {
    /// No live discovery has succeeded for this account yet.
    NotDiscovered,
    /// A catalog exists but the credential is missing or revoked.
    CredentialUnavailable,
    /// The credential works but advertises no models.
    EmptyCatalog,
    /// The operator's configured bridge model is absent from this account's
    /// current live catalog.
    ConfiguredModelUnavailable,
}

impl fmt::Display for ModelSelectionRequired {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let provider = &self.provider;
        match self.reason {
            SelectionFailure::NotDiscovered => write!(
                f,
                "no model can be selected for {provider}: its live catalog has not been \
                 discovered yet. Authorize the {provider} subscription, or set an explicit \
                 --bridge-model that the account advertises."
            ),
            SelectionFailure::CredentialUnavailable => write!(
                f,
                "no model can be selected for {provider}: its credential is missing or has \
                 been rejected, so its last known catalog is not usable. Re-authorize the \
                 {provider} subscription."
            ),
            SelectionFailure::EmptyCatalog => write!(
                f,
                "no model can be selected for {provider}: its live catalog advertises no \
                 models for this account."
            ),
            SelectionFailure::ConfiguredModelUnavailable => write!(
                f,
                "no model can be selected for {provider}: the configured bridge model is not \
                 advertised by this account's current live catalog. Choose an advertised model \
                 or remove the explicit bridge-model setting."
            ),
        }
    }
}

/// The error code clients receive when selection fails.
pub const MODEL_SELECTION_REQUIRED: &str = "model_selection_required";

#[cfg(test)]
mod tests {
    use super::*;

    fn catalog(ids: &[&str]) -> Vec<String> {
        ids.iter().map(|id| (*id).to_string()).collect()
    }

    // Deliberately synthetic names: no test here may depend on a real vendor
    // model id, which is the regression issue #192 guards against.
    const SYNTHETIC: [&str; 3] = ["aurora-1-mini", "aurora-2-base", "borealis-9-ultra"];

    #[test]
    fn first_advertised_is_lexicographically_first() {
        assert_eq!(
            BridgeModelPolicy::FirstAdvertised.choose(&catalog(&SYNTHETIC)),
            Some("aurora-1-mini".to_string())
        );
    }

    #[test]
    fn last_advertised_is_lexicographically_last() {
        assert_eq!(
            BridgeModelPolicy::LastAdvertised.choose(&catalog(&SYNTHETIC)),
            Some("borealis-9-ultra".to_string())
        );
    }

    /// The choice must not depend on the order the provider listed models in.
    #[test]
    fn selection_is_independent_of_catalog_order() {
        let forward = catalog(&["borealis-9-ultra", "aurora-1-mini", "aurora-2-base"]);
        let reverse = catalog(&["aurora-2-base", "borealis-9-ultra", "aurora-1-mini"]);
        assert_eq!(
            BridgeModelPolicy::FirstAdvertised.choose(&forward),
            BridgeModelPolicy::FirstAdvertised.choose(&reverse)
        );
        assert_eq!(
            BridgeModelPolicy::LastAdvertised.choose(&forward),
            BridgeModelPolicy::LastAdvertised.choose(&reverse)
        );
    }

    #[test]
    fn an_empty_catalog_selects_nothing() {
        assert_eq!(BridgeModelPolicy::FirstAdvertised.choose(&[]), None);
        assert_eq!(BridgeModelPolicy::LastAdvertised.choose(&[]), None);
        // Blank entries are not models.
        assert_eq!(
            BridgeModelPolicy::FirstAdvertised.choose(&catalog(&["", ""])),
            None
        );
    }

    #[test]
    fn policies_parse_from_operator_spelling() {
        assert_eq!(
            BridgeModelPolicy::parse("first-advertised"),
            Ok(BridgeModelPolicy::FirstAdvertised)
        );
        assert_eq!(
            BridgeModelPolicy::parse("LAST_ADVERTISED"),
            Ok(BridgeModelPolicy::LastAdvertised)
        );
        assert_eq!(
            BridgeModelPolicy::parse(""),
            Ok(BridgeModelPolicy::FirstAdvertised)
        );
        assert!(BridgeModelPolicy::parse("cheapest-ever").is_err());
    }

    #[test]
    fn each_failure_reason_names_the_provider_and_a_remedy() {
        for reason in [
            SelectionFailure::NotDiscovered,
            SelectionFailure::CredentialUnavailable,
            SelectionFailure::EmptyCatalog,
            SelectionFailure::ConfiguredModelUnavailable,
        ] {
            let message = ModelSelectionRequired {
                provider: "examplecorp".to_string(),
                reason,
            }
            .to_string();
            assert!(message.contains("examplecorp"), "{message}");
            assert!(message.contains("no model can be selected"), "{message}");
        }
    }
}
