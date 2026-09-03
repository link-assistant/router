use tempfile::tempdir;

use super::ModelCatalogCache;
use crate::subscription::SubscriptionProvider;

#[test]
fn authorization_replacement_invalidates_a_running_cache_immediately() {
    let data = tempdir().expect("catalog data");
    let cache = ModelCatalogCache::persistent(data.path());
    cache.record_success_for_account(
        SubscriptionProvider::Claude,
        "primary",
        Some("old-account".into()),
        vec!["future-old-11".into()],
    );
    cache.record_success_for_account(
        SubscriptionProvider::Codex,
        "primary",
        Some("other-account".into()),
        vec!["future-other-22".into()],
    );

    ModelCatalogCache::invalidate_persisted(data.path(), SubscriptionProvider::Claude, "primary")
        .expect("credential mutation invalidation");

    assert!(
        cache.models(SubscriptionProvider::Claude).is_empty(),
        "the already-running cache observes another process's invalidation"
    );
    assert_eq!(
        cache.models(SubscriptionProvider::Codex),
        ["future-other-22"],
        "one authorization cannot remove another provider"
    );
    assert_eq!(
        cache.status(SubscriptionProvider::Claude).models.as_slice(),
        ["future-old-11"],
        "the last catalog remains available to diagnostics"
    );

    cache.record_success_for_account(
        SubscriptionProvider::Claude,
        "primary",
        Some("new-account".into()),
        vec!["future-new-33".into()],
    );
    assert_eq!(
        cache.models(SubscriptionProvider::Claude),
        ["future-new-33"],
        "a complete authenticated refresh clears the invalidation"
    );
}
