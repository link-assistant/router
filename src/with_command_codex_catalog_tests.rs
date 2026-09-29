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

fn metadata_less(id: &str) -> RouterModel {
    RouterModel {
        id: id.to_string(),
        owned_by: "z.ai".to_string(),
        selector_kind: crate::model_contract::ModelSelectorKind::default(),
        capability_provenance: serde_json::Value::Null,
        default_reasoning_level: None,
        supported_reasoning_levels: None,
        provider_created_at: None,
        client_capabilities: crate::clients::RouterClientCapabilities::default(),
    }
}

fn catalog_rows(path: std::path::PathBuf) -> Vec<serde_json::Value> {
    let catalog: serde_json::Value =
        serde_json::from_slice(&std::fs::read(path).expect("read generated catalog"))
            .expect("parse generated catalog");
    catalog["models"].as_array().expect("models array").clone()
}

/// Issue #628: a z.ai-only catalog advertises no reasoning metadata at all,
/// and v1.14.3 refused every row, so even `router with codex -- --version`
/// exited before Codex started. Unknown is not unsupported: each row is listed
/// with no claimed levels and no invented default.
#[test]
fn codex_catalog_lists_rows_without_reasoning_metadata() {
    let root = tempfile::tempdir().expect("temporary catalog directory");
    let models = [metadata_less("glm-5.3"), metadata_less("glm-5.3-flash")];

    let rows = catalog_rows(
        write_codex_model_catalog(root.path(), &models, None, None)
            .expect("a z.ai-only catalog must launch Codex"),
    );
    let slugs = rows
        .iter()
        .map(|model| model["slug"].as_str().unwrap())
        .collect::<Vec<_>>();
    assert_eq!(slugs, ["glm-5.3", "glm-5.3-flash"]);
    for row in &rows {
        assert_eq!(row["supported_reasoning_levels"], json!([]), "{row}");
        assert_eq!(row["default_reasoning_level"], json!(null), "{row}");
        assert!(
            row["description"]
                .as_str()
                .is_some_and(|text| text.contains("reasoning metadata unavailable")),
            "{row}"
        );
    }

    let rows = catalog_rows(
        write_codex_model_catalog(root.path(), &models, None, Some("glm-5.3-flash"))
            .expect("an explicitly selected metadata-less model must launch"),
    );
    assert_eq!(rows.len(), 2);
}

/// Codex keeps a configured effort across `/model` only when the chosen row
/// lists it, and otherwise falls back to the row's default. A row whose levels
/// are unknown therefore carries the user's own effort as its default: the
/// setting survives startup and every switch, and no capability is claimed.
#[test]
fn codex_catalog_keeps_a_configured_effort_on_rows_without_metadata() {
    let root = tempfile::tempdir().expect("temporary catalog directory");
    let models = [
        metadata_less("glm-5.3-flash"),
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

    let rows = catalog_rows(
        write_codex_model_catalog(root.path(), &models, Some("xhigh"), Some("glm-5.3-flash"))
            .expect("an explicit metadata-less model keeps the configured effort"),
    );
    // A row known not to support the effort is still withheld; unknown is not.
    assert_eq!(rows.len(), 1, "{rows:?}");
    assert_eq!(rows[0]["slug"], "glm-5.3-flash");
    assert_eq!(rows[0]["supported_reasoning_levels"], json!([]));
    assert_eq!(rows[0]["default_reasoning_level"], "xhigh");
}

/// Metadata that is present but contradicts itself is still a defect, not an
/// unknown: it is omitted, and choosing it explicitly is a hard error.
#[test]
fn codex_catalog_omits_inconsistent_reasoning_metadata_without_blocking_healthy_models() {
    let root = tempfile::tempdir().expect("temporary catalog directory");
    let models = [
        RouterModel {
            id: "future-reasoning-inconsistent".to_string(),
            owned_by: "unknown-provider".to_string(),
            selector_kind: crate::model_contract::ModelSelectorKind::default(),
            capability_provenance: serde_json::Value::Null,
            default_reasoning_level: Some("xhigh".to_string()),
            supported_reasoning_levels: Some(vec![crate::clients::RouterReasoningLevel {
                effort: "low".to_string(),
                description: "Fast".to_string(),
            }]),
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

    let rows = catalog_rows(
        write_codex_model_catalog(root.path(), &models, None, None)
            .expect("the fully described model must remain launchable"),
    );
    let slugs = rows
        .iter()
        .map(|model| model["slug"].as_str().unwrap())
        .collect::<Vec<_>>();
    assert_eq!(slugs, ["future-reasoning-known"]);

    let error = write_codex_model_catalog(
        root.path(),
        &models,
        None,
        Some("future-reasoning-inconsistent"),
    )
    .expect_err("an explicitly selected inconsistent model must remain a hard error")
    .to_string();
    assert!(error.contains("future-reasoning-inconsistent"), "{error}");
    assert!(error.contains("xhigh"), "{error}");
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

/// A catalog with nothing launchable is refused with the reason, instead of
/// handing Codex an empty list it would silently replace with its own.
#[test]
fn codex_catalog_refuses_a_catalog_with_nothing_launchable() {
    let root = tempfile::tempdir().expect("temporary catalog directory");
    let model = |id: &str, default: &str, supported: &str| RouterModel {
        id: id.to_string(),
        owned_by: "openai".to_string(),
        selector_kind: crate::model_contract::ModelSelectorKind::default(),
        capability_provenance: serde_json::Value::Null,
        default_reasoning_level: Some(default.to_string()),
        supported_reasoning_levels: Some(vec![crate::clients::RouterReasoningLevel {
            effort: supported.to_string(),
            description: "Only supported level".to_string(),
        }]),
        provider_created_at: None,
        client_capabilities: crate::clients::RouterClientCapabilities::default(),
    };

    let error = write_codex_model_catalog(root.path(), &[], None, None)
        .expect_err("an empty catalog must be refused")
        .to_string();
    assert!(error.contains("no models"), "{error}");

    let inconsistent = [model("future-inconsistent", "xhigh", "low")];
    let error = write_codex_model_catalog(root.path(), &inconsistent, None, None)
        .expect_err("a catalog of inconsistent rows must be refused")
        .to_string();
    assert!(error.contains("consistent reasoning metadata"), "{error}");
    assert!(error.contains("future-inconsistent"), "{error}");

    let medium_only = [model("future-medium-only", "medium", "medium")];
    let error = write_codex_model_catalog(root.path(), &medium_only, Some("xhigh"), None)
        .expect_err("no row keeps the configured effort")
        .to_string();
    assert!(error.contains("model_reasoning_effort"), "{error}");
    assert!(error.contains("xhigh"), "{error}");
}
