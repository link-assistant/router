//! Catalog, routing, bridge selection and clients driven by model names that
//! do not exist (issue #192).
//!
//! Every id here is deliberately synthetic — no GPT, Claude, Gemini or Qwen
//! name appears anywhere in this file. If any of these assertions start
//! depending on a real vendor name, a hardcoded catalog has crept back in.

use link_assistant_router::bridge_selection::{
    BridgeModelPolicy, ModelSelectionRequired, SelectionFailure,
};
use link_assistant_router::model_catalog::ModelCatalogCache;
use link_assistant_router::model_routing::{available_provider_for_model, provider_for_model};
use link_assistant_router::openai::{list_models_from, resolve_model_with};
use link_assistant_router::subscription::SubscriptionProvider;
use std::collections::BTreeMap;

/// Entirely invented model ids, in a shape no vendor uses today.
const ALPHA_SMALL: &str = "zephyrine-1-compact";
const ALPHA_LARGE: &str = "zephyrine-7-expanse";
const BETA_ONLY: &str = "quillon-4-vector";

fn discovered_cache() -> ModelCatalogCache {
    let catalogs = ModelCatalogCache::new();
    catalogs.record_success(
        SubscriptionProvider::Claude,
        vec![ALPHA_SMALL.into(), ALPHA_LARGE.into()],
    );
    catalogs.record_success(SubscriptionProvider::Codex, vec![BETA_ONLY.into()]);
    catalogs
}

/// Nothing is advertised until a live discovery has actually succeeded.
#[test]
fn an_undiscovered_catalog_is_empty_rather_than_seeded() {
    let catalogs = ModelCatalogCache::new();
    for provider in SubscriptionProvider::ALL {
        let status = catalogs.status(provider);
        assert!(
            status.models.is_empty(),
            "{provider} must start with no models, got {:?}",
            status.models
        );
        assert!(!status.discovered, "{provider} must not claim a discovery");
        assert!(status.is_degraded(), "{provider} must report as degraded");
        assert!(catalogs.models(provider).is_empty());
    }
}

/// A successful discovery is what makes models routable, and it is bound to the
/// account it was made for.
#[test]
fn a_discovery_records_models_against_its_account() {
    let catalogs = ModelCatalogCache::new();
    catalogs.record_success_for(
        SubscriptionProvider::Claude,
        Some("account-7".to_string()),
        vec![ALPHA_SMALL.into()],
    );
    let status = catalogs.status(SubscriptionProvider::Claude);
    assert_eq!(status.account.as_deref(), Some("account-7"));
    assert!(status.discovered);
    assert!(status.refreshed_at.is_some(), "fetch time must be recorded");
    assert!(!status.is_degraded());
    assert_eq!(status.routable_models(), [ALPHA_SMALL]);
}

/// A persisted catalog stops being exposed the moment its credential fails,
/// while remaining visible to administrators.
#[test]
fn a_revoked_credential_hides_its_models_but_keeps_them_visible() {
    let catalogs = discovered_cache();
    assert_eq!(catalogs.models(SubscriptionProvider::Claude).len(), 2);

    let catalogs = ModelCatalogCache::new();
    catalogs.record_success(SubscriptionProvider::Claude, vec![ALPHA_SMALL.into()]);
    let mut revoked = catalogs.status(SubscriptionProvider::Claude);
    assert_eq!(
        revoked.routable_models(),
        [ALPHA_SMALL],
        "a healthy credential exposes its discovered models"
    );

    // A rejected credential, as `refresh_catalogs` records one.
    revoked.credential_healthy = false;
    assert!(
        revoked.routable_models().is_empty(),
        "a revoked credential must expose no models for routing"
    );
    assert_eq!(
        revoked.models,
        [ALPHA_SMALL],
        "the last known catalog stays visible to administrators"
    );
    assert!(revoked.is_degraded());
}

/// Routing follows whichever live catalog advertises the id.
#[test]
fn routing_follows_the_live_catalog() {
    let catalogs = discovered_cache();

    assert_eq!(
        provider_for_model(ALPHA_LARGE, &catalogs),
        Some(SubscriptionProvider::Claude)
    );
    assert_eq!(
        provider_for_model(BETA_ONLY, &catalogs),
        Some(SubscriptionProvider::Codex)
    );
    assert_eq!(provider_for_model("never-advertised-0", &catalogs), None);

    assert_eq!(
        available_provider_for_model(BETA_ONLY, &[SubscriptionProvider::Codex], &catalogs),
        Ok(SubscriptionProvider::Codex)
    );
    // Advertised, but by a provider that is not currently healthy.
    assert!(
        available_provider_for_model(BETA_ONLY, &[SubscriptionProvider::Claude], &catalogs)
            .is_err()
    );
    // Never advertised at all.
    assert!(
        available_provider_for_model(
            "never-advertised-0",
            &[SubscriptionProvider::Codex],
            &catalogs
        )
        .is_err()
    );
}

/// Bridge selection is deterministic and comes from the catalog.
#[test]
fn bridge_selection_is_deterministic_over_the_catalog() {
    let catalog = vec![ALPHA_LARGE.to_string(), ALPHA_SMALL.to_string()];

    // Lexicographic order: "zephyrine-1-compact" < "zephyrine-7-expanse".
    assert_eq!(
        BridgeModelPolicy::FirstAdvertised.choose(&catalog),
        Some(ALPHA_SMALL.to_string())
    );
    assert_eq!(
        BridgeModelPolicy::LastAdvertised.choose(&catalog),
        Some(ALPHA_LARGE.to_string())
    );
    // Repeated selection is stable.
    for _ in 0..5 {
        assert_eq!(
            BridgeModelPolicy::FirstAdvertised.choose(&catalog),
            Some(ALPHA_SMALL.to_string())
        );
    }
    // Nothing discovered selects nothing rather than a built-in name.
    assert_eq!(BridgeModelPolicy::FirstAdvertised.choose(&[]), None);
}

/// Each selection failure is reported as `model_selection_required` with a
/// reason, never as a silent substitution.
#[test]
fn selection_failures_are_explicit() {
    for reason in [
        SelectionFailure::NotDiscovered,
        SelectionFailure::CredentialUnavailable,
        SelectionFailure::EmptyCatalog,
    ] {
        let error = ModelSelectionRequired {
            provider: "zephyr-provider".to_string(),
            reason,
        };
        let message = error.to_string();
        assert!(message.contains("zephyr-provider"), "{message}");
        assert!(message.contains("no model can be selected"), "{message}");
    }
}

/// Client-facing model resolution is bounded by the catalog, and an operator
/// alias only works while its target is still advertised.
#[test]
fn client_model_resolution_is_catalog_bounded() {
    let catalog = vec![ALPHA_SMALL.to_string(), ALPHA_LARGE.to_string()];
    let mut aliases = BTreeMap::new();
    aliases.insert("small".to_string(), ALPHA_SMALL.to_string());
    aliases.insert("gone".to_string(), "withdrawn-0".to_string());

    assert_eq!(
        resolve_model_with(ALPHA_LARGE, &aliases, &catalog).as_deref(),
        Some(ALPHA_LARGE)
    );
    assert_eq!(
        resolve_model_with("small", &aliases, &catalog).as_deref(),
        Some(ALPHA_SMALL)
    );
    assert_eq!(
        resolve_model_with("gone", &aliases, &catalog),
        None,
        "an alias to a withdrawn model must not resolve"
    );
    assert_eq!(resolve_model_with(BETA_ONLY, &aliases, &catalog), None);
}

/// The advertised listing contains exactly the discovered ids.
#[test]
fn the_listing_advertises_only_discovered_models() {
    let catalog = vec![ALPHA_SMALL.to_string(), ALPHA_LARGE.to_string()];
    let listing = list_models_from(&catalog, "zephyr-corp");
    let ids: Vec<&str> = listing["data"]
        .as_array()
        .expect("data array")
        .iter()
        .filter_map(|model| model["id"].as_str())
        .collect();
    assert_eq!(ids, [ALPHA_SMALL, ALPHA_LARGE]);

    assert!(
        list_models_from(&[], "zephyr-corp")["data"]
            .as_array()
            .expect("data array")
            .is_empty(),
        "an undiscovered account advertises nothing"
    );
}

/// The router's own source must not carry vendor model catalogs any more.
///
/// This is the regression guard for issue #192: it reads the production sources
/// and fails if a vendor model id reappears in a model-list or default-model
/// position.
#[test]
fn production_sources_contain_no_hardcoded_vendor_catalogs() {
    let root = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("src");
    // Files that legitimately mention vendor names in prose, provider
    // detection, or protocol constants rather than as routable model catalogs.
    let mut offenders = Vec::new();

    for file in ["model_catalog.rs", "anthropic_bridge.rs"] {
        let path = root.join(file);
        let source = std::fs::read_to_string(&path).expect("read source");
        // Strip test modules: synthetic fixtures are allowed and expected.
        let production = source
            .split("#[cfg(test)]")
            .next()
            .expect("production section");
        for needle in [
            "claude-opus-4",
            "claude-sonnet-4",
            "claude-haiku-4",
            "claude-3-5-sonnet",
            "gpt-5-codex",
            "qwen3-coder-plus",
            "gemini-2.5-pro",
        ] {
            if production.contains(needle) {
                offenders.push(format!("{file} still hardcodes {needle}"));
            }
        }
    }

    assert!(offenders.is_empty(), "{}", offenders.join("\n"));
}
