//! Reactive-refresh tests: a vendor rejection must beat the `exp` claim
//! (issue #205).

use super::super::*;
use super::{stub_token_endpoint, token};

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

    let outcome = cache
        .refresh_rejected_at(
            &reqwest::Client::new(),
            &url,
            SubscriptionProvider::Codex,
            "primary",
            token(Some("r"), Some(10_000 + 86_400_000)),
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
