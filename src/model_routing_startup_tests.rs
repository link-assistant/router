//! Startup catalog health: restored catalogs are starting, not degraded
//! (issue #665).

use super::health_tests::subscription_report;
use super::tests::auto_state;
use super::*;
use std::fs;
use tempfile::tempdir;

/// A restart must not announce a healthy subscription as degraded while its
/// stored catalog waits for the first authenticated refresh (issue #665).
#[tokio::test]
async fn a_restored_catalog_is_starting_not_degraded_until_refreshed() {
    let data = tempdir().unwrap();
    let codex = tempdir().unwrap();
    fs::write(
        codex.path().join("auth.json"),
        r#"{"tokens":{"access_token":"codex-live"}}"#,
    )
    .unwrap();
    crate::model_catalog::ModelCatalogCache::persistent(data.path())
        .record_success(SubscriptionProvider::Codex, vec!["gpt-stored".into()]);
    let mut state = auto_state(
        vec![SubscriptionReader::new(
            SubscriptionProvider::Codex,
            codex.path(),
        )],
        data.path(),
    );
    state.model_catalogs = std::sync::Arc::new(
        crate::model_catalog::ModelCatalogCache::persistent(data.path()),
    );

    let (status, restarted) = subscription_report(state.clone()).await;
    assert_eq!(status, StatusCode::OK, "{restarted}");
    assert_eq!(restarted["starting_providers"], json!(["codex"]));
    assert_eq!(restarted["degraded_providers"], json!([]));
    let catalog = model_catalog(&[SubscriptionProvider::Codex], &state.model_catalogs);
    assert_eq!(catalog["starting_providers"], json!(["codex"]), "{catalog}");
    assert_eq!(catalog["degraded_providers"], json!([]), "{catalog}");

    state
        .model_catalogs
        .record_success(SubscriptionProvider::Codex, vec!["gpt-live".into()]);
    let (_, refreshed) = subscription_report(state.clone()).await;
    assert_eq!(refreshed["healthy_providers"], json!(["codex"]));
    assert_eq!(refreshed["starting_providers"], json!([]));
    let catalog = model_catalog(&[SubscriptionProvider::Codex], &state.model_catalogs);
    assert_eq!(catalog["starting_providers"], json!([]), "{catalog}");
}
