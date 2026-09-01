//! Reactive-refresh tests: a vendor rejection must beat the `exp` claim
//! (issue #205).

use super::super::*;
use super::{register_test_store, stub_token_endpoint, token};

/// The reported defect (issue #205): a vendor may reject an access token whose
/// own `exp` is still days away. `exp` must not veto the refresh.
#[tokio::test]
async fn a_rejected_token_is_refreshed_even_when_its_exp_is_in_the_future() {
    let (url, server) = stub_token_endpoint(
        r#"{"access_token":"recovered","refresh_token":"rotated","expires_in":3600}"#,
    )
    .await;
    let cache = TokenCache::new();
    // Expires four days from "now" -- the pre-flight path would skip this.
    let unexpired = token(Some("stored-refresh"), Some(10_000 + 4 * 86_400_000));
    let _store = register_test_store(&cache, SubscriptionProvider::Codex, "primary", &unexpired);

    let refreshed = cache
        .refresh_rejected_at(
            &reqwest::Client::new(),
            &url,
            SubscriptionProvider::Codex,
            "primary",
            unexpired.clone(),
            10_000,
        )
        .await
        .expect("a rejected token must be refreshed regardless of exp");

    assert_eq!(refreshed.access_token, "recovered");
    // The rotated refresh token replaces the stored one.
    assert_eq!(refreshed.refresh_token.as_deref(), Some("rotated"));
    server.await.unwrap();

    // For contrast: the pre-flight path leaves the same token untouched,
    // which is exactly why a reactive path was needed.
    let untouched = cache
        .get_fresh_for_at(
            &reqwest::Client::new(),
            "http://unused.invalid",
            SubscriptionProvider::Codex,
            "other-account",
            unexpired.clone(),
            10_000,
        )
        .await;
    assert_eq!(untouched.access_token, unexpired.access_token);
}

/// A refresh that hands back the same access token has recovered nothing;
/// replaying the request would simply repeat the 401.
#[tokio::test]
async fn a_refresh_returning_the_same_token_is_not_worth_retrying() {
    let (url, server) =
        stub_token_endpoint(r#"{"access_token":"old-access","expires_in":3600}"#).await;
    let cache = TokenCache::new();
    let rejected = token(Some("r"), Some(10_000 + 86_400_000));
    let _store = register_test_store(&cache, SubscriptionProvider::Codex, "primary", &rejected);

    let outcome = cache
        .refresh_rejected_at(
            &reqwest::Client::new(),
            &url,
            SubscriptionProvider::Codex,
            "primary",
            rejected,
            10_000,
        )
        .await;

    assert!(outcome.is_none(), "an unchanged token must not be retried");
    server.await.unwrap();
}

/// A terminal `invalid_grant` must not be retried on every rejected request.
#[tokio::test]
async fn a_terminally_rejected_credential_is_not_refreshed_repeatedly() {
    use std::sync::Arc;
    use std::sync::atomic::{AtomicUsize, Ordering};
    use tokio::io::{AsyncReadExt, AsyncWriteExt};

    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let url = format!("http://{}/token", listener.local_addr().unwrap());
    let calls = Arc::new(AtomicUsize::new(0));
    let server_calls = Arc::clone(&calls);
    let server = tokio::spawn(async move {
        loop {
            let Ok(Ok((mut socket, _))) =
                tokio::time::timeout(std::time::Duration::from_millis(200), listener.accept())
                    .await
            else {
                break;
            };
            server_calls.fetch_add(1, Ordering::SeqCst);
            let mut request = [0; 2048];
            let _ = socket.read(&mut request).await.unwrap();
            let body = r#"{"error":"invalid_grant","error_description":"revoked"}"#;
            socket
                .write_all(
                    format!(
                        "HTTP/1.1 400 Bad Request\r\ncontent-type: application/json\r\ncontent-length: {}\r\nconnection: close\r\n\r\n{body}",
                        body.len()
                    )
                    .as_bytes(),
                )
                .await
                .unwrap();
        }
    });

    let cache = TokenCache::new();
    let client = reqwest::Client::new();
    let rejected = token(Some("revoked-refresh"), Some(10_000 + 86_400_000));
    let _store = register_test_store(&cache, SubscriptionProvider::Codex, "primary", &rejected);
    for _ in 0..5 {
        assert!(
            cache
                .refresh_rejected_at(
                    &client,
                    &url,
                    SubscriptionProvider::Codex,
                    "primary",
                    rejected.clone(),
                    10_000,
                )
                .await
                .is_none()
        );
    }
    server.await.unwrap();

    assert_eq!(
        calls.load(Ordering::SeqCst),
        1,
        "a revoked credential is exchanged once, not once per rejected request"
    );
    assert_eq!(
        cache.evidence(SubscriptionProvider::Codex),
        Some(CredentialEvidence::Rejected)
    );
}

/// Concurrent 401s share one exchange rather than each spending the refresh
/// token — a single-use token would otherwise be burned by the losers.
#[tokio::test]
async fn concurrent_rejections_share_one_refresh() {
    let (url, server) = stub_token_endpoint(
        r#"{"access_token":"shared-recovery","refresh_token":"rotated","expires_in":3600}"#,
    )
    .await;
    let cache = TokenCache::new();
    let client = reqwest::Client::new();
    let rejected = token(Some("one-shot"), Some(10_000 + 86_400_000));
    let _store = register_test_store(&cache, SubscriptionProvider::Codex, "primary", &rejected);

    let attempts = (0..8).map(|_| {
        cache.refresh_rejected_at(
            &client,
            &url,
            SubscriptionProvider::Codex,
            "primary",
            rejected.clone(),
            10_000,
        )
    });
    let results = futures_util::future::join_all(attempts).await;

    // The stub answers exactly once; every caller still gets the new token.
    server.await.expect("a single refresh exchange");
    assert!(
        results.iter().all(|outcome| outcome
            .as_ref()
            .is_some_and(|token| token.access_token == "shared-recovery")),
        "every concurrent caller should receive the refreshed token"
    );
}

/// A token endpoint that records whether it was contacted at all.
///
/// The guard of issue #319 is about an exchange that must never be *attempted*;
/// its return value is indistinguishable from a failed attempt, so the request
/// count is the only thing that separates the fixed router from the broken one.
async fn recording_token_endpoint(
    status: u16,
    body: &'static str,
) -> (
    String,
    std::sync::Arc<std::sync::Mutex<usize>>,
    tokio::task::JoinHandle<()>,
) {
    use tokio::io::{AsyncReadExt as _, AsyncWriteExt as _};

    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let url = format!("http://{}/v1/oauth/token", listener.local_addr().unwrap());
    let calls = std::sync::Arc::new(std::sync::Mutex::new(0usize));
    let recorder = std::sync::Arc::clone(&calls);
    let handle = tokio::spawn(async move {
        while let Ok((mut socket, _)) = listener.accept().await {
            *recorder.lock().unwrap() += 1;
            let mut buf = [0u8; 4096];
            let _ = socket.read(&mut buf).await;
            let _ = socket
                .write_all(
                    format!(
                        "HTTP/1.1 {status} X\r\ncontent-type: application/json\r\ncontent-length: \
                         {}\r\nconnection: close\r\n\r\n{body}",
                        body.len()
                    )
                    .as_bytes(),
                )
                .await;
        }
    });
    (url, calls, handle)
}

/// The incident of issue #319, end to end: a rotation succeeds, the very next
/// call is refused on permission grounds, and the router must **not** spend the
/// token it just minted.
///
/// The stub endpoint is scripted with exactly one answer. If the guard fails,
/// the second refresh contends for an answer that is not there and the token
/// that was known-good seconds earlier is spent for nothing.
#[tokio::test]
async fn a_token_this_process_just_rotated_into_is_not_spent_again() {
    let (url, server) = stub_token_endpoint(
        r#"{"access_token":"rotated-access","refresh_token":"rotated-refresh","expires_in":3600}"#,
    )
    .await;
    let cache = TokenCache::new();
    let rejected = token(Some("original-refresh"), Some(10_000 + 86_400_000));
    let _store = register_test_store(&cache, SubscriptionProvider::Codex, "primary", &rejected);

    // 17:39:49 — recovery works and the rotated token is adopted.
    let rotated = cache
        .refresh_rejected_at(
            &reqwest::Client::new(),
            &url,
            SubscriptionProvider::Codex,
            "primary",
            rejected,
            10_000,
        )
        .await
        .expect("the first rejection must be recovered from");
    assert_eq!(rotated.access_token, "rotated-access");
    server.await.unwrap();

    // 17:44:49 — the freshly rotated token is itself rejected. Before this
    // guard the router refreshed again here, spending the only good link of a
    // single-use chain and landing on a terminal invalid_grant.
    //
    // The endpoint is scripted to answer that fatal `invalid_grant`, so the
    // distinction the test turns on is whether the exchange is *attempted*: a
    // guarded router never contacts it, an unguarded one does and kills the
    // subscription. Counting the requests is what separates the two — the
    // return value is `None` either way.
    let (url, received, server) = recording_token_endpoint(
        400,
        r#"{"error":"invalid_grant","error_description":"refresh token revoked"}"#,
    )
    .await;

    let outcome = cache
        .refresh_rejected_at(
            &reqwest::Client::new(),
            &url,
            SubscriptionProvider::Codex,
            "primary",
            rotated.clone(),
            10_000 + 4 * 60_000,
        )
        .await;

    assert!(
        outcome.is_none(),
        "a credential rotated into moments ago must not be refreshed again"
    );
    assert_eq!(
        *received.lock().unwrap(),
        0,
        "the token endpoint must not be contacted at all: reaching it spends the \
         freshly minted link and is exactly how the subscription died"
    );
    assert_ne!(
        cache.evidence(SubscriptionProvider::Codex),
        Some(CredentialEvidence::Rejected),
        "a guarded refusal must not mark the credential dead"
    );
    server.abort();
    // The credential is untouched and still available for the next tick.
    assert_eq!(
        cache
            .get_fresh_for_at(
                &reqwest::Client::new(),
                "http://must-not-be-called.invalid",
                SubscriptionProvider::Codex,
                "primary",
                rotated.clone(),
                10_000 + 4 * 60_000,
            )
            .await
            .access_token,
        "rotated-access",
        "the rotated credential survives and is retried"
    );
}

/// The guard is a grace period, not a permanent veto: once it lapses, a
/// rejected credential is refreshed as before.
#[tokio::test]
async fn the_rotation_guard_lapses_and_refresh_resumes() {
    let (url, server) = stub_token_endpoint(
        r#"{"access_token":"first","refresh_token":"second","expires_in":3600}"#,
    )
    .await;
    let cache = TokenCache::new();
    let original = token(Some("original"), Some(10_000 + 86_400_000));
    let _store = register_test_store(&cache, SubscriptionProvider::Codex, "primary", &original);
    let rotated = cache
        .refresh_rejected_at(
            &reqwest::Client::new(),
            &url,
            SubscriptionProvider::Codex,
            "primary",
            original,
            10_000,
        )
        .await
        .expect("first rotation");
    server.await.unwrap();

    let (url, server) = stub_token_endpoint(
        r#"{"access_token":"third","refresh_token":"fourth","expires_in":3600}"#,
    )
    .await;
    // Well past the grace period: a genuine later rejection is still recovered.
    let outcome = cache
        .refresh_rejected_at(
            &reqwest::Client::new(),
            &url,
            SubscriptionProvider::Codex,
            "primary",
            rotated,
            10_000 + 6 * 60_000,
        )
        .await
        .expect("after the grace period a rejection is refreshed again");
    assert_eq!(outcome.access_token, "third");
    server.await.unwrap();
}

/// The guard must not strand a short-lived credential. It blocks only the
/// *reactive* path — refreshing against a rejection — while the proactive
/// pre-expiry path is untouched, so a token whose real lifetime is shorter than
/// the grace period still renews on schedule (issue #319).
#[tokio::test]
async fn the_rotation_guard_does_not_block_a_proactive_pre_expiry_refresh() {
    let (url, server) = stub_token_endpoint(
        r#"{"access_token":"first","refresh_token":"second","expires_in":3600}"#,
    )
    .await;
    let cache = TokenCache::new();
    let original = token(Some("original"), Some(10_000 + 86_400_000));
    let _store = register_test_store(&cache, SubscriptionProvider::Codex, "primary", &original);
    // A rotation happens now, so the guard is armed for the next five minutes.
    let rotated = cache
        .refresh_rejected_at(
            &reqwest::Client::new(),
            &url,
            SubscriptionProvider::Codex,
            "primary",
            original,
            10_000,
        )
        .await
        .expect("first rotation");
    server.await.unwrap();
    assert_eq!(rotated.access_token, "first");

    // One minute later — well inside the grace period — the credential on disk
    // is about to expire. This is renewal, not a response to a rejection, and
    // must still happen or a short-lived token could never be renewed at all.
    let (url, server) = stub_token_endpoint(
        r#"{"access_token":"renewed","refresh_token":"fourth","expires_in":3600}"#,
    )
    .await;
    let short_lived = token(Some("about-to-expire"), Some(10_000 + 60_000));
    let _short_lived_store = register_test_store(
        &cache,
        SubscriptionProvider::Codex,
        "short-lived",
        &short_lived,
    );
    let renewed = cache
        .get_fresh_for_at(
            &reqwest::Client::new(),
            &url,
            SubscriptionProvider::Codex,
            "short-lived",
            short_lived,
            10_000 + 60_000,
        )
        .await;

    assert_eq!(
        renewed.access_token, "renewed",
        "a pre-expiry renewal must not be blocked by the reactive guard"
    );
    server.await.unwrap();
}

/// A terminal failure is announced once and then held, so a later recovery and
/// a second death are both reported (issue #321).
#[test]
fn a_terminal_failure_is_announced_once_per_outage() {
    let cache = TokenCache::new();

    assert!(
        cache.take_terminal_announcement(SubscriptionProvider::Claude),
        "the transition is announced"
    );
    assert!(
        !cache.take_terminal_announcement(SubscriptionProvider::Claude),
        "restating a known condition hides the line that mattered"
    );
    // A different provider is a different outage.
    assert!(cache.take_terminal_announcement(SubscriptionProvider::Codex));

    // Recovery re-arms it: a provider that serves again may die again, and
    // that death is a new event.
    cache.record_credential_working(SubscriptionProvider::Claude);
    assert!(
        cache.take_terminal_announcement(SubscriptionProvider::Claude),
        "a second outage after a recovery must be reported"
    );
}

/// Re-authentication starts a new credential lifecycle even when the new
/// credential is rejected before it ever produces a successful request. Its
/// first outage must therefore regain the one ERROR announcement.
#[tokio::test]
async fn authoritative_reauthentication_rearms_the_terminal_announcement() {
    let cache = TokenCache::new();
    let provider = SubscriptionProvider::Claude;
    let account = "primary";
    let original = token(Some("old-refresh"), Some(10_000 + 86_400_000));
    cache
        .reconcile_authoritative_credential(provider, account, &original)
        .await;
    cache.record_status_for(provider, account, 401);
    assert!(
        !cache.take_terminal_announcement_for(provider, account),
        "the first outage is latched after its ERROR announcement"
    );

    let mut replacement = original.clone();
    replacement.access_token = "new-login-access".into();
    replacement.refresh_token = Some("new-login-refresh".into());
    cache
        .reconcile_authoritative_credential(provider, account, &replacement)
        .await;
    assert!(
        cache.take_terminal_announcement_for(provider, account),
        "authoritative replacement must re-arm the next outage announcement"
    );

    // The assertion above claims the latch, so restore the pre-outage state
    // before proving that a second rejection consumes it as an ERROR again.
    cache.clear_terminal_announcement_for(provider, account);
    cache.record_status_for(provider, account, 403);
    assert!(
        !cache.take_terminal_announcement_for(provider, account),
        "the replacement credential's first rejection must consume the re-armed announcement"
    );
}
