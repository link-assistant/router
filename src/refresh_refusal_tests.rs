//! Reporting tests for terminal refresh refusals ([`crate::refresh`]).
//!
//! Split from `refresh_tests.rs` to keep that file within the repository's
//! 1000-line limit.

use super::*;
/// A refresh chain the upstream has already refused must not be reported as
/// `refreshable`, nor as healthy.
///
/// This drives the real refresh ladder against a server that answers
/// `invalid_grant`, because the bug was precisely that the *file* cannot tell a
/// live refresh token from a revoked one — both are non-empty strings. Only the
/// ladder knows, and until this it was never asked (issue #245).
#[tokio::test]
async fn a_refused_refresh_chain_is_reported_rejected_and_unhealthy() {
    use tokio::io::{AsyncReadExt as _, AsyncWriteExt as _};

    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let url = format!("http://{}/token", listener.local_addr().unwrap());
    let server = tokio::spawn(async move {
        while let Ok(Ok((mut socket, _))) =
            tokio::time::timeout(std::time::Duration::from_millis(200), listener.accept()).await
        {
            let mut request = [0; 2048];
            let _ = socket.read(&mut request).await.unwrap();
            let body = r#"{"error":"invalid_grant","error_description":"Refresh token not found or invalid"}"#;
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

    let dir = std::env::temp_dir().join(format!("router-refused-{}", uuid::Uuid::new_v4()));
    std::fs::create_dir_all(&dir).unwrap();
    std::fs::write(
        dir.join("credentials.json"),
        r#"{"claudeAiOauth":{"accessToken":"tok","refreshToken":"revoked-refresh-token","expiresAt":1600000000000}}"#,
    )
    .unwrap();
    let router = crate::accounts::AccountRouter::new(
        dir,
        &[],
        crate::accounts::SelectionStrategy::RoundRobin,
        std::time::Duration::from_secs(60),
    );
    let cache = TokenCache::new();

    // Before the ladder has tried anything, the file is all there is to go on,
    // and "expired with a refresh token" is genuinely recoverable.
    let before = router.health_snapshot_with(Some(&cache));
    assert_eq!(
        before[0].credential,
        crate::accounts::CredentialState::Refreshable
    );
    assert!(before[0].healthy);

    let expired = SubscriptionToken {
        access_token: "tok".into(),
        refresh_token: Some("revoked-refresh-token".into()),
        expires_at_ms: Some(1_600_000_000_000),
        account_id: None,
        resource_url: None,
    };
    cache
        .get_fresh_for_at(
            &reqwest::Client::new(),
            &url,
            SubscriptionProvider::Claude,
            "primary",
            expired,
            1_600_000_001_000,
        )
        .await;
    server.abort();

    let after = router.health_snapshot_with(Some(&cache));
    assert_eq!(
        after[0].credential,
        crate::accounts::CredentialState::Rejected,
        "a refused chain still reported as {:?}",
        after[0].credential
    );
    assert!(
        !after[0].healthy,
        "a chain the upstream refused reported healthy"
    );
}
