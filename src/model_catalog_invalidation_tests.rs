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

/// A restored catalog is pending its first refresh, not degraded (issue #665).
///
/// Right after a restart every persisted catalog is held unroutable until this
/// process authenticates it. That is a startup state; reporting it as a
/// degraded provider made every restart look like an outage.
#[test]
fn a_restored_catalog_is_pending_until_its_first_refresh_decides_it() {
    let data = tempdir().expect("catalog data");
    let cache = ModelCatalogCache::persistent(data.path());
    cache.record_success_for_account(
        SubscriptionProvider::Claude,
        "primary",
        Some("account".into()),
        vec!["future-restored-55".into()],
    );
    cache.record_success_for_account(
        SubscriptionProvider::Codex,
        "primary",
        Some("account".into()),
        vec!["future-restored-66".into()],
    );

    let reopened = ModelCatalogCache::persistent(data.path());
    let status = reopened.status(SubscriptionProvider::Claude);
    assert!(!status.credential_healthy, "restart still fails closed");
    assert!(status.is_pending(), "restored catalog reported as decided");
    assert!(reopened.provider_is_pending(SubscriptionProvider::Claude));

    reopened.record_failure_for_account(SubscriptionProvider::Claude, "primary", "HTTP 503", false);
    assert!(
        !reopened.status(SubscriptionProvider::Claude).is_pending(),
        "a failed refresh is a real degradation"
    );
    assert!(!reopened.provider_is_pending(SubscriptionProvider::Claude));

    reopened.record_success_for_account(
        SubscriptionProvider::Codex,
        "primary",
        Some("account".into()),
        vec!["future-restored-66".into()],
    );
    let codex = reopened.status(SubscriptionProvider::Codex);
    assert!(codex.credential_healthy && !codex.is_pending());
}

/// An authorization change is pending until the next refresh (issue #665).
#[test]
fn an_invalidated_catalog_is_pending_until_refreshed() {
    let data = tempdir().expect("catalog data");
    let cache = ModelCatalogCache::persistent(data.path());
    cache.record_success_for_account(
        SubscriptionProvider::Claude,
        "primary",
        Some("account".into()),
        vec!["future-77".into()],
    );
    assert!(!cache.provider_is_pending(SubscriptionProvider::Claude));

    ModelCatalogCache::invalidate_persisted(data.path(), SubscriptionProvider::Claude, "primary")
        .expect("invalidation");

    assert!(cache.status(SubscriptionProvider::Claude).is_pending());
    assert!(cache.provider_is_pending(SubscriptionProvider::Claude));
}
