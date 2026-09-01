//! Unit tests for the multi-account router ([`crate::accounts`]).
//!
//! Split from `accounts.rs` to keep that file within the repository's
//! 1000-line limit.

use crate::accounts::*;
use crate::subscription::SubscriptionProvider;
use std::fs;

fn tempdir(slug: &str) -> PathBuf {
    let dir = std::env::temp_dir().join(format!("router-acct-{slug}-{}", uuid::Uuid::new_v4()));
    fs::create_dir_all(&dir).unwrap();
    dir
}

fn write_creds(dir: &std::path::Path, token: &str) {
    fs::write(
        dir.join("credentials.json"),
        format!("{{\"accessToken\":\"{token}\"}}"),
    )
    .unwrap();
}

#[test]
fn round_robin_distributes_calls() {
    let a = tempdir("a");
    let b = tempdir("b");
    write_creds(&a, "tok-a");
    write_creds(&b, "tok-b");
    let router = AccountRouter::new(
        a,
        &[b],
        SelectionStrategy::RoundRobin,
        Duration::from_secs(60),
    );
    let s1 = router.select().unwrap();
    let s2 = router.select().unwrap();
    let s3 = router.select().unwrap();
    let names: Vec<_> = vec![s1.name, s2.name, s3.name];
    assert!(names.contains(&"primary".to_string()));
    assert!(names.contains(&"account-1".to_string()));
}

fn write_creds_expiring(dir: &std::path::Path, refresh: &str, expires_at_ms: i64) {
    let refresh_field = if refresh.is_empty() {
        String::new()
    } else {
        format!("\"refreshToken\":\"{refresh}\",")
    };
    fs::write(
        dir.join("credentials.json"),
        format!(
            "{{\"claudeAiOauth\":{{\"accessToken\":\"tok\",{refresh_field}\"expiresAt\":{expires_at_ms}}}}}"
        ),
    )
    .unwrap();
}

/// A credential that cannot serve a request must not report healthy, even
/// before any request has been attempted.
///
/// `healthy` consulted only the in-memory cooldown timer, which is `None`
/// in a freshly started process. So `accounts list` reported `true` for an
/// account whose token was expired with no refresh token left, at the same
/// moment `doctor` called it EXPIRED and every request returned 401 — a
/// health check that suppresses the alert it exists to raise (issue #242).
#[test]
fn a_terminally_expired_credential_is_not_healthy() {
    let dir = tempdir("expired");
    write_creds_expiring(&dir, "", 1_600_000_000_000);
    let router = AccountRouter::new(
        dir,
        &[],
        SelectionStrategy::RoundRobin,
        Duration::from_secs(60),
    );
    let snap = router.health_snapshot();
    assert!(!snap[0].healthy, "expired credential reported healthy");
    assert_eq!(snap[0].credential, CredentialState::Expired);
}

/// An expired access token that still has a refresh token is recoverable,
/// so it stays healthy: `expiresAt` is a hint the refresh ladder acts on,
/// and reporting it dead would be a false negative in the other direction.
#[test]
fn an_expired_credential_with_a_refresh_token_stays_healthy() {
    let dir = tempdir("refreshable");
    write_creds_expiring(&dir, "refresh-token", 1_600_000_000_000);
    let router = AccountRouter::new(
        dir,
        &[],
        SelectionStrategy::RoundRobin,
        Duration::from_secs(60),
    );
    let snap = router.health_snapshot();
    assert!(
        snap[0].healthy,
        "a refreshable credential must stay healthy"
    );
    assert_eq!(snap[0].credential, CredentialState::Refreshable);
}

/// An account whose credential file does not exist cannot serve anything.
#[test]
fn a_missing_credential_is_not_healthy() {
    let dir = tempdir("absent");
    let router = AccountRouter::new(
        dir,
        &[],
        SelectionStrategy::RoundRobin,
        Duration::from_secs(60),
    );
    let snap = router.health_snapshot();
    assert!(!snap[0].healthy, "missing credential reported healthy");
    assert!(matches!(snap[0].credential, CredentialState::Unusable(_)));
}

/// Reporting an account unhealthy must not stop the router from trying it:
/// the refresh ladder recovers expired tokens on the next request, and the
/// health column is a report, not a routing decision.
#[test]
fn credential_state_does_not_change_selection() {
    let dir = tempdir("still-selected");
    write_creds_expiring(&dir, "", 1_600_000_000_000);
    let router = AccountRouter::new(
        dir,
        &[],
        SelectionStrategy::RoundRobin,
        Duration::from_secs(60),
    );
    assert!(!router.health_snapshot()[0].healthy);
    assert_eq!(router.select().unwrap().name, "primary");
}

#[test]
fn cooldown_skips_unhealthy_account() {
    let a = tempdir("aa");
    let b = tempdir("bb");
    write_creds(&a, "tok-a");
    write_creds(&b, "tok-b");
    let router = AccountRouter::new(
        a,
        &[b],
        SelectionStrategy::RoundRobin,
        Duration::from_secs(60),
    );
    router.report_failure("primary", "rate limited");
    let snap = router.health_snapshot();
    assert!(!snap[0].healthy);
    assert!(snap[1].healthy);
    let chosen = router.select().unwrap();
    assert_eq!(chosen.name, "account-1");
}

#[test]
fn no_healthy_returns_error() {
    let a = tempdir("a2");
    write_creds(&a, "tok-a");
    let router = AccountRouter::new(
        a,
        &[],
        SelectionStrategy::RoundRobin,
        Duration::from_secs(60),
    );
    router.report_failure("primary", "fail");
    let r = router.select();
    assert!(matches!(r, Err(AccountError::NoHealthyAccounts)));
}

#[test]
fn least_used_picks_lowest_count() {
    let a = tempdir("la");
    let b = tempdir("lb");
    write_creds(&a, "tok-a");
    write_creds(&b, "tok-b");
    let router = AccountRouter::new(
        a,
        &[b],
        SelectionStrategy::LeastUsed,
        Duration::from_secs(60),
    );
    let _ = router.select().unwrap();
    let _ = router.select().unwrap();
    let _ = router.select().unwrap();
    let snap = router.health_snapshot();
    let total: usize = snap.iter().map(|s| s.used).sum();
    assert_eq!(total, 3);
    // both accounts should be exercised (LeastUsed prefers the unused one)
    assert!(snap.iter().any(|s| s.used >= 1));
}

#[test]
fn strategy_aliases_ignore_surrounding_whitespace() {
    assert_eq!(
        SelectionStrategy::from_str_opt("  quota-first  "),
        Some(SelectionStrategy::LeastUsed)
    );
}

#[test]
fn least_used_compares_normalized_spend_for_uneven_limits() {
    let a = tempdir("normalized-a");
    let b = tempdir("normalized-b");
    write_creds(&a, "tok-a");
    write_creds(&b, "tok-b");
    let router = AccountRouter::new_for_provider(
        a,
        &[b],
        SubscriptionProvider::Claude,
        AccountRouterOptions {
            strategy: SelectionStrategy::LeastUsed,
            request_limits: vec![Some(2), Some(100)],
            ..AccountRouterOptions::default()
        },
    );

    assert_eq!(router.select().unwrap().name, "primary");
    assert_eq!(router.select().unwrap().name, "account-1");
    assert_eq!(router.select().unwrap().name, "account-1");
}

#[test]
fn session_affinity_keeps_a_conversation_on_one_account() {
    let a = tempdir("session-a");
    let b = tempdir("session-b");
    write_creds(&a, "tok-a");
    write_creds(&b, "tok-b");
    let router = AccountRouter::new_for_provider(
        a,
        &[b],
        SubscriptionProvider::Claude,
        AccountRouterOptions::default(),
    );

    let first = router
        .select_with_context(&RoutingContext::for_session("conversation-1"))
        .unwrap();
    let again = router
        .select_with_context(&RoutingContext::for_session("conversation-1"))
        .unwrap();
    let other = router
        .select_with_context(&RoutingContext::for_session("conversation-2"))
        .unwrap();

    assert_eq!(first.name, again.name);
    assert_ne!(first.name, other.name);
}

#[test]
fn session_activity_renews_the_affinity_timeout() {
    let a = tempdir("session-renew-a");
    let b = tempdir("session-renew-b");
    write_creds(&a, "tok-a");
    write_creds(&b, "tok-b");
    let router = AccountRouter::new_for_provider(
        a,
        &[b],
        SubscriptionProvider::Claude,
        AccountRouterOptions::default(),
    );
    let context = RoutingContext::for_session("active-conversation");
    router.select_with_context(&context).unwrap();

    let shortened_expiry = Instant::now() + Duration::from_secs(1);
    router
        .inner
        .affinities
        .lock()
        .unwrap()
        .get_mut("active-conversation")
        .unwrap()
        .expires_at = shortened_expiry;

    router.select_with_context(&context).unwrap();
    let renewed_expiry = router
        .inner
        .affinities
        .lock()
        .unwrap()
        .get("active-conversation")
        .unwrap()
        .expires_at;
    assert!(renewed_expiry > shortened_expiry);
}

#[test]
fn an_unavailable_session_account_is_not_silently_changed() {
    let a = tempdir("strict-session-a");
    let b = tempdir("strict-session-b");
    write_creds(&a, "tok-a");
    write_creds(&b, "tok-b");
    let router = AccountRouter::new_for_provider(
        a,
        &[b],
        SubscriptionProvider::Claude,
        AccountRouterOptions::default(),
    );
    let context = RoutingContext::for_session("strict-conversation");
    let selected = router.select_with_context(&context).unwrap();
    router.report_failure(&selected.name, "quota exhausted");

    assert!(matches!(
        router.select_with_context(&context),
        Err(AccountError::SessionAccountUnavailable(_))
    ));
}

#[test]
fn explicit_account_pins_are_strict() {
    let a = tempdir("pin-a");
    let b = tempdir("pin-b");
    write_creds(&a, "tok-a");
    write_creds(&b, "tok-b");
    let router = AccountRouter::new_for_provider(
        a,
        &[b],
        SubscriptionProvider::Claude,
        AccountRouterOptions::default(),
    );

    let selected = router
        .select_with_context(&RoutingContext::pinned("account-1"))
        .unwrap();
    assert_eq!(selected.name, "account-1");
    router.report_failure("account-1", "quota exhausted");
    assert!(matches!(
        router.select_with_context(&RoutingContext::pinned("account-1")),
        Err(AccountError::PinnedAccountUnavailable(_))
    ));
    assert!(matches!(
        router.select_with_context(&RoutingContext::pinned("missing")),
        Err(AccountError::UnknownPinnedAccount(_))
    ));
}

#[test]
fn configured_request_limits_remove_spent_accounts() {
    let a = tempdir("limits-a");
    let b = tempdir("limits-b");
    write_creds(&a, "tok-a");
    write_creds(&b, "tok-b");
    let options = AccountRouterOptions {
        request_limits: vec![Some(1), Some(2)],
        ..AccountRouterOptions::default()
    };
    let router = AccountRouter::new_for_provider(a, &[b], SubscriptionProvider::Claude, options);

    assert_eq!(router.select().unwrap().name, "primary");
    assert_eq!(router.select().unwrap().name, "account-1");
    assert_eq!(router.select().unwrap().name, "account-1");
    assert!(matches!(
        router.select(),
        Err(AccountError::NoHealthyAccounts)
    ));
    let health = router.health_snapshot();
    assert_eq!(health[0].remaining_requests, Some(0));
    assert_eq!(health[1].remaining_requests, Some(0));
}

#[test]
fn concurrent_selection_cannot_oversubscribe_an_account_cap() {
    let a = tempdir("atomic-limit");
    write_creds(&a, "tok-a");
    let router = AccountRouter::new_for_provider(
        a,
        &[],
        SubscriptionProvider::Claude,
        AccountRouterOptions {
            request_limits: vec![Some(1)],
            ..AccountRouterOptions::default()
        },
    );
    let successful = (0..16)
        .map(|_| {
            let router = router.clone();
            std::thread::spawn(move || router.select().is_ok())
        })
        .map(|worker| worker.join().unwrap())
        .filter(|successful| *successful)
        .count();

    assert_eq!(successful, 1);
    assert_eq!(router.health_snapshot()[0].used, 1);
}

#[test]
fn vendor_subscription_accounts_use_the_same_pool() {
    let a = tempdir("codex-a");
    let b = tempdir("codex-b");
    fs::write(
        a.join("auth.json"),
        r#"{"tokens":{"access_token":"codex-a","account_id":"acct-a"}}"#,
    )
    .unwrap();
    fs::write(
        b.join("auth.json"),
        r#"{"tokens":{"access_token":"codex-b","account_id":"acct-b"}}"#,
    )
    .unwrap();
    let router = AccountRouter::new_for_provider(
        a,
        &[b],
        SubscriptionProvider::Codex,
        AccountRouterOptions::default(),
    );

    let selected = router
        .select_subscription(&RoutingContext::pinned("account-1"))
        .unwrap();
    assert_eq!(selected.name, "account-1");
    assert_eq!(selected.token.access_token, "codex-b");
    assert_eq!(selected.token.account_id.as_deref(), Some("acct-b"));
}

/// A rejection is a fact about one chain link, not about the account: once the
/// credential on disk differs from the one that was refused, the account is
/// reported recoverable again without a restart (issue #239's rule, kept).
#[tokio::test]
async fn a_rotated_credential_clears_an_earlier_refusal() {
    let dir = tempdir("rotated-after-refusal");
    write_creds_expiring(&dir, "revoked-refresh-token", 1_600_000_000_000);
    let router = AccountRouter::new(
        dir.clone(),
        &[],
        SelectionStrategy::RoundRobin,
        Duration::from_secs(60),
    );
    let cache = crate::refresh::TokenCache::new();

    let refused = crate::subscription::SubscriptionToken {
        access_token: "tok".into(),
        refresh_token: Some("revoked-refresh-token".into()),
        expires_at_ms: Some(1_600_000_000_000),
        account_id: None,
        resource_url: None,
    };
    cache.record_refresh_refused(SubscriptionProvider::Claude, "primary", &refused);
    assert_eq!(
        router.health_snapshot_with(Some(&cache))[0].credential,
        CredentialState::Rejected
    );

    // Another holder rotates the chain forward; the file no longer matches the
    // link that was refused.
    write_creds_expiring(&dir, "rotated-refresh-token", 1_600_000_000_000);

    let snapshot = router.health_snapshot_with(Some(&cache));
    assert_eq!(snapshot[0].credential, CredentialState::Refreshable);
    assert!(snapshot[0].healthy, "a rotated chain must recover");
}

/// One revoked account must not make its healthy neighbours look revoked.
///
/// The evidence the ladder records alongside this is keyed by *provider*, which
/// is right for routing a vendor away and wrong for a per-account report: every
/// account in a Claude pool shares that key. The refusal is keyed per account
/// and per credential precisely so this stays true (issue #245).
#[tokio::test]
async fn one_revoked_account_does_not_condemn_the_pool() {
    let dead = tempdir("pool-dead");
    let live = tempdir("pool-live");
    write_creds_expiring(&dead, "revoked-refresh-token", 1_600_000_000_000);
    write_creds_expiring(&live, "healthy-refresh-token", 1_600_000_000_000);
    let router = AccountRouter::new(
        dead,
        &[live],
        SelectionStrategy::RoundRobin,
        Duration::from_secs(60),
    );
    let cache = crate::refresh::TokenCache::new();

    let refused = crate::subscription::SubscriptionToken {
        access_token: "tok".into(),
        refresh_token: Some("revoked-refresh-token".into()),
        expires_at_ms: Some(1_600_000_000_000),
        account_id: None,
        resource_url: None,
    };
    cache.record_refresh_refused(SubscriptionProvider::Claude, "primary", &refused);

    let snapshot = router.health_snapshot_with(Some(&cache));
    assert_eq!(snapshot[0].credential, CredentialState::Rejected);
    assert!(!snapshot[0].healthy);
    assert_eq!(
        snapshot[1].credential,
        CredentialState::Refreshable,
        "the second account shares only a provider, not a credential"
    );
    assert!(snapshot[1].healthy, "a healthy neighbour was condemned");
}

#[test]
fn account_pool_registers_every_reader_with_data_dir_recovery() {
    let root = tempdir("recoverable-pool");
    let primary = root.join("primary");
    let secondary = root.join("secondary");
    let data_dir = root.join("router-data");
    fs::create_dir_all(&primary).unwrap();
    fs::create_dir_all(&secondary).unwrap();
    let router = AccountRouter::new_for_provider(
        primary,
        &[secondary],
        SubscriptionProvider::Codex,
        AccountRouterOptions::default(),
    );
    let cache = crate::refresh::TokenCache::new();

    router.register_credential_stores_in(&cache, &data_dir);

    for account in ["primary", "account-1"] {
        let lock = cache
            .store_for_subscription(SubscriptionProvider::Codex, account)
            .and_then(|store| store.lock_path())
            .expect("pooled recoverable store lock");
        assert!(
            lock.starts_with(data_dir.join("refresh-recovery")),
            "{lock:?}"
        );
    }
}

#[test]
fn legacy_account_pool_registration_keeps_every_account_authoritative() {
    let root = tempdir("legacy-pool-registration");
    let primary = root.join("primary");
    let secondary = root.join("secondary");
    fs::create_dir_all(&primary).unwrap();
    fs::create_dir_all(&secondary).unwrap();
    let router = AccountRouter::new_for_provider(
        primary,
        &[secondary],
        SubscriptionProvider::Codex,
        AccountRouterOptions::default(),
    );
    let cache = crate::refresh::TokenCache::new();

    router.register_credential_stores(&cache);

    for account in ["primary", "account-1"] {
        let store = cache
            .store_for_subscription(SubscriptionProvider::Codex, account)
            .expect("legacy registered account store");
        assert!(
            store.lock_path().is_some(),
            "{account} must retain its reader lock"
        );
    }
}
