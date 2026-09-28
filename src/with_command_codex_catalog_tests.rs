//! Codex catalog projection tests for temporary client launches.
//!
//! Split from `with_command_tests.rs` to stay inside the repository's
//! per-file line limit.

use super::*;

/// Issue #423: the disposable catalog is a projection of the live Codex
/// catalog, not a model capability table maintained by Router. Different live
/// entries must therefore keep their different defaults and supported levels.
#[test]
fn codex_catalog_preserves_per_model_live_reasoning_metadata() {
    let root = tempfile::tempdir().expect("temporary catalog directory");
    let models = [
        RouterModel {
            id: "future-reasoning-a".to_string(),
            owned_by: "openai".to_string(),
            selector_kind: crate::model_contract::ModelSelectorKind::default(),
            capability_provenance: serde_json::Value::Null,
            default_reasoning_level: Some("medium".to_string()),
            supported_reasoning_levels: Some(vec![
                crate::clients::RouterReasoningLevel {
                    effort: "low".to_string(),
                    description: "Faster answers".to_string(),
                },
                crate::clients::RouterReasoningLevel {
                    effort: "medium".to_string(),
                    description: "Balanced reasoning".to_string(),
                },
                crate::clients::RouterReasoningLevel {
                    effort: "xhigh".to_string(),
                    description: "Deepest reasoning".to_string(),
                },
            ]),
            provider_created_at: None,
            client_capabilities: crate::clients::RouterClientCapabilities::default(),
        },
        RouterModel {
            id: "future-reasoning-b".to_string(),
            owned_by: "openai".to_string(),
            selector_kind: crate::model_contract::ModelSelectorKind::default(),
            capability_provenance: serde_json::Value::Null,
            default_reasoning_level: Some("xhigh".to_string()),
            supported_reasoning_levels: Some(vec![crate::clients::RouterReasoningLevel {
                effort: "xhigh".to_string(),
                description: "Only supported level".to_string(),
            }]),
            provider_created_at: None,
            client_capabilities: crate::clients::RouterClientCapabilities::default(),
        },
    ];

    let path =
        write_codex_model_catalog(root.path(), &models, None, None).expect("write live catalog");
    let catalog: serde_json::Value =
        serde_json::from_slice(&std::fs::read(path).expect("read generated catalog"))
            .expect("parse generated catalog");

    assert_eq!(
        catalog["models"][0]["supported_reasoning_levels"],
        json!([
            {"effort": "low", "description": "Faster answers"},
            {"effort": "medium", "description": "Balanced reasoning"},
            {"effort": "xhigh", "description": "Deepest reasoning"}
        ])
    );
    assert_eq!(
        catalog["models"][1]["supported_reasoning_levels"],
        json!([{"effort": "xhigh", "description": "Only supported level"}])
    );
    assert_eq!(catalog["models"][0]["default_reasoning_level"], "medium");
    assert_eq!(catalog["models"][1]["default_reasoning_level"], "xhigh");
}

/// One incomplete provider must not keep fully described models from launching.
/// The incomplete model is excluded rather than offered to Codex, where choosing
/// it could silently discard the user's explicit effort.
#[test]
fn codex_catalog_omits_unknown_reasoning_metadata_without_blocking_healthy_models() {
    let root = tempfile::tempdir().expect("temporary catalog directory");
    let models = [
        RouterModel {
            id: "future-reasoning-unknown".to_string(),
            owned_by: "unknown-provider".to_string(),
            selector_kind: crate::model_contract::ModelSelectorKind::default(),
            capability_provenance: serde_json::Value::Null,
            default_reasoning_level: None,
            supported_reasoning_levels: None,
            provider_created_at: None,
            client_capabilities: crate::clients::RouterClientCapabilities::default(),
        },
        RouterModel {
            id: "future-reasoning-known".to_string(),
            owned_by: "openai".to_string(),
            selector_kind: crate::model_contract::ModelSelectorKind::default(),
            capability_provenance: serde_json::Value::Null,
            default_reasoning_level: Some("high".to_string()),
            supported_reasoning_levels: Some(vec![crate::clients::RouterReasoningLevel {
                effort: "high".to_string(),
                description: "Deep reasoning".to_string(),
            }]),
            provider_created_at: None,
            client_capabilities: crate::clients::RouterClientCapabilities::default(),
        },
    ];

    let path = write_codex_model_catalog(root.path(), &models, None, None)
        .expect("the fully described model must remain launchable");
    let catalog: serde_json::Value =
        serde_json::from_slice(&std::fs::read(path).expect("read generated catalog"))
            .expect("parse generated catalog");
    let slugs = catalog["models"]
        .as_array()
        .unwrap()
        .iter()
        .map(|model| model["slug"].as_str().unwrap())
        .collect::<Vec<_>>();
    assert_eq!(slugs, ["future-reasoning-known"]);

    let error =
        write_codex_model_catalog(root.path(), &models, None, Some("future-reasoning-unknown"))
            .expect_err("an explicitly selected incomplete model must remain a hard error")
            .to_string();
    assert!(error.contains("future-reasoning-unknown"), "{error}");
    assert!(error.contains("reasoning metadata"), "{error}");
}

#[test]
fn codex_catalog_never_offers_a_model_that_would_reset_an_explicit_effort() {
    let root = tempfile::tempdir().expect("temporary catalog directory");
    let models = [
        RouterModel {
            id: "future-supports-xhigh".to_string(),
            owned_by: "openai".to_string(),
            selector_kind: crate::model_contract::ModelSelectorKind::default(),
            capability_provenance: serde_json::Value::Null,
            default_reasoning_level: Some("medium".to_string()),
            supported_reasoning_levels: Some(vec![
                crate::clients::RouterReasoningLevel {
                    effort: "medium".to_string(),
                    description: "Balanced reasoning".to_string(),
                },
                crate::clients::RouterReasoningLevel {
                    effort: "xhigh".to_string(),
                    description: "Deepest reasoning".to_string(),
                },
            ]),
            provider_created_at: None,
            client_capabilities: crate::clients::RouterClientCapabilities::default(),
        },
        RouterModel {
            id: "future-medium-only".to_string(),
            owned_by: "openai".to_string(),
            selector_kind: crate::model_contract::ModelSelectorKind::default(),
            capability_provenance: serde_json::Value::Null,
            default_reasoning_level: Some("medium".to_string()),
            supported_reasoning_levels: Some(vec![crate::clients::RouterReasoningLevel {
                effort: "medium".to_string(),
                description: "Only supported level".to_string(),
            }]),
            provider_created_at: None,
            client_capabilities: crate::clients::RouterClientCapabilities::default(),
        },
    ];

    let path = write_codex_model_catalog(root.path(), &models, Some("xhigh"), None)
        .expect("write compatibility catalog");
    let catalog: serde_json::Value =
        serde_json::from_slice(&std::fs::read(path).expect("read generated catalog"))
            .expect("parse generated catalog");
    let slugs = catalog["models"]
        .as_array()
        .expect("models array")
        .iter()
        .filter_map(|model| model["slug"].as_str())
        .collect::<Vec<_>>();
    assert_eq!(slugs, ["future-supports-xhigh"]);

    let error = write_codex_model_catalog(
        root.path(),
        &models,
        Some("xhigh"),
        Some("future-medium-only"),
    )
    .expect_err("an explicit unsupported model must be rejected")
    .to_string();
    assert!(error.contains("future-medium-only"), "{error}");
    assert!(error.contains("xhigh"), "{error}");
}
