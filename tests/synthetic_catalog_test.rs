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

/// The account-scoped cache keeps the original provider-wide API useful for
/// callers compiled against earlier patch releases. Only primary catalogs are
/// included in that diagnostic view, while a legacy anonymous primary catalog
/// remains valid fallback evidence for a named pool account.
#[test]
fn legacy_catalog_views_preserve_primary_and_anonymous_fallback_semantics() {
    let catalogs = ModelCatalogCache::default();
    catalogs.record_success_for_account(
        SubscriptionProvider::Claude,
        "primary",
        None,
        vec![ALPHA_SMALL.into(), ALPHA_SMALL.into()],
    );
    catalogs.record_success_for_account(
        SubscriptionProvider::Claude,
        "account-1",
        Some("claude-account-1".into()),
        vec![ALPHA_LARGE.into()],
    );
    catalogs.record_success_for_account(
        SubscriptionProvider::Codex,
        "primary",
        Some("codex-primary".into()),
        vec![BETA_ONLY.into()],
    );

    let anonymous_fallback = catalogs.status_for(SubscriptionProvider::Claude, "account-2");
    assert_eq!(anonymous_fallback.routable_models(), [ALPHA_SMALL]);
    assert_eq!(anonymous_fallback.account, None);

    let known_owner_does_not_fallback =
        catalogs.status_for(SubscriptionProvider::Codex, "account-2");
    assert!(!known_owner_does_not_fallback.discovered);
    assert!(known_owner_does_not_fallback.models.is_empty());

    let legacy = catalogs.statuses();
    assert_eq!(legacy.len(), 2, "secondary accounts are not duplicated");
    assert_eq!(legacy[0].0, SubscriptionProvider::Claude);
    assert_eq!(legacy[0].1.routable_models(), [ALPHA_SMALL]);
    assert_eq!(legacy[1].0, SubscriptionProvider::Codex);
    assert_eq!(legacy[1].1.routable_models(), [BETA_ONLY]);

    assert!(catalogs.provider_has_observation(SubscriptionProvider::Claude));
    assert!(!catalogs.provider_has_observation(SubscriptionProvider::Qwen));
    assert!(!catalogs.provider_is_degraded(SubscriptionProvider::Claude));
    assert!(catalogs.provider_is_degraded(SubscriptionProvider::Qwen));
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
        SelectionFailure::ConfiguredModelUnavailable,
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
    fn collect_rust_sources(directory: &std::path::Path, files: &mut Vec<std::path::PathBuf>) {
        for entry in std::fs::read_dir(directory).expect("read source directory") {
            let path = entry.expect("source entry").path();
            if path.is_dir() {
                collect_rust_sources(&path, files);
            } else if path.extension().and_then(std::ffi::OsStr::to_str) == Some("rs")
                && !path
                    .file_stem()
                    .and_then(std::ffi::OsStr::to_str)
                    .is_some_and(|name| name.ends_with("_test") || name.ends_with("_tests"))
            {
                files.push(path);
            }
        }
    }

    fn concrete_vendor_model(source: &str) -> Option<&'static str> {
        let source = source.to_ascii_lowercase();
        for prefix in ["gpt-", "gemini-", "glm-", "claude-"] {
            let mut rest = source.as_str();
            while let Some(index) = rest.find(prefix) {
                let suffix = &rest[index + prefix.len()..];
                if suffix.starts_with(|character: char| character.is_ascii_digit()) {
                    return Some(prefix);
                }
                rest = suffix;
            }
        }
        for family in [
            "claude-opus-",
            "claude-sonnet-",
            "claude-haiku-",
            "claude-fable-",
        ] {
            if source.contains(family) {
                return Some(family);
            }
        }
        if source.contains("qwen/qwen") {
            return Some("Qwen/Qwen<model>");
        }
        let mut rest = source.as_str();
        while let Some(index) = rest.find("qwen") {
            let suffix = &rest[index + "qwen".len()..];
            if suffix.starts_with(|character: char| character.is_ascii_digit()) {
                return Some("qwen<version>");
            }
            rest = suffix;
        }
        None
    }

    let root = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("src");
    let mut files = Vec::new();
    collect_rust_sources(&root, &mut files);
    let mut offenders = Vec::new();
    for path in files {
        let source = std::fs::read_to_string(&path).expect("read source");
        // Strip test modules: synthetic fixtures are allowed and expected.
        let production = source
            .split("#[cfg(test)]")
            .next()
            .expect("production section");
        if let Some(matched) = concrete_vendor_model(production) {
            offenders.push(format!(
                "{} still hardcodes {}",
                path.strip_prefix(&root).unwrap_or(&path).display(),
                matched
            ));
        }
    }

    assert!(offenders.is_empty(), "{}", offenders.join("\n"));
}
