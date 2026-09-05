//! Unit tests for [`crate::refresh`].

use super::*;

use super::test_support::register_test_store;

fn token(refresh: Option<&str>, exp: Option<i64>) -> SubscriptionToken {
    SubscriptionToken {
        access_token: "old-access".into(),
        refresh_token: refresh.map(ToString::to_string),
        expires_at_ms: exp,
        account_id: Some("acct_1".into()),
        resource_url: Some("portal.qwen.ai".into()),
    }
}

#[test]
fn config_present_for_subscription_providers() {
    assert_eq!(
        refresh_config(SubscriptionProvider::Codex).token_url,
        "https://auth.openai.com/oauth/token"
    );
    assert_eq!(
        refresh_config(SubscriptionProvider::Gemini).client_secret_env,
        Some(GEMINI_CLIENT_SECRET_ENV)
    );
    assert_eq!(
        refresh_config(SubscriptionProvider::Qwen).style,
        BodyStyle::Form
    );
    // Claude is refreshed by the router too: the runtime image has no
    // Claude CLI to keep the credential file current.
    let claude = refresh_config(SubscriptionProvider::Claude);
    assert_eq!(claude.token_url, CLAUDE_TOKEN_URL);
    assert_eq!(claude.client_id, CLAUDE_CLIENT_ID);
    assert!(claude.client_secret_env.is_none());
    assert_eq!(claude.style, BodyStyle::Json);
}

/// Serve one JSON response on loopback and hand back the request that was
/// received, so a test can assert the exact refresh body sent upstream.
async fn stub_token_endpoint(
    response_body: &'static str,
) -> (String, tokio::task::JoinHandle<(String, String)>) {
    use tokio::io::{AsyncReadExt, AsyncWriteExt};

    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let url = format!("http://{}/v1/oauth/token", listener.local_addr().unwrap());
    let handle = tokio::spawn(async move {
        let (mut socket, _) = listener.accept().await.unwrap();
        let mut raw = Vec::new();
        let mut buf = [0u8; 2048];
        // Read until the body (after the blank line) is fully present.
        loop {
            let n = socket.read(&mut buf).await.unwrap();
            raw.extend_from_slice(&buf[..n]);
            let text = String::from_utf8_lossy(&raw);
            if n == 0
                || text
                    .split_once("\r\n\r\n")
                    .is_some_and(|(_, b)| !b.is_empty())
            {
                break;
            }
        }
        let request = String::from_utf8_lossy(&raw).to_string();
        let (head, body) = request.split_once("\r\n\r\n").unwrap();
        socket
            .write_all(
                format!(
                    "HTTP/1.1 200 OK\r\ncontent-type: application/json\r\ncontent-length: {}\r\nconnection: close\r\n\r\n{response_body}",
                    response_body.len()
                )
                .as_bytes(),
            )
            .await
            .unwrap();
        socket.flush().await.unwrap();
        (head.to_string(), body.to_string())
    });
    (url, handle)
}

#[tokio::test]
async fn claude_refresh_exchanges_the_refresh_token_and_never_touches_disk() {
    // The container case from issue #48: the on-disk Claude token has
    // expired and there is no Claude CLI to renew it.
    let (url, server) = stub_token_endpoint(
        r#"{"access_token":"sk-ant-oat-new","refresh_token":"sk-ant-ort-new","expires_in":3600}"#,
    )
    .await;

    let expired = SubscriptionToken {
        access_token: "sk-ant-oat-old".into(),
        refresh_token: Some("sk-ant-ort-old".into()),
        expires_at_ms: Some(1),
        account_id: None,
        resource_url: None,
    };
    let fresh = refresh_at(
        &reqwest::Client::new(),
        &url,
        SubscriptionProvider::Claude,
        &expired,
        10_000,
    )
    .await
    .expect("claude refresh should succeed");

    assert_eq!(fresh.access_token, "sk-ant-oat-new");
    assert_eq!(fresh.refresh_token.as_deref(), Some("sk-ant-ort-new"));
    assert_eq!(fresh.expires_at_ms, Some(10_000 + 3_600_000));

    let (head, body) = server.await.unwrap();
    assert!(head.starts_with("POST /v1/oauth/token"));
    let sent: serde_json::Value = serde_json::from_str(&body).expect("json body");
    assert_eq!(sent["grant_type"], "refresh_token");
    assert_eq!(sent["refresh_token"], "sk-ant-ort-old");
    assert_eq!(sent["client_id"], CLAUDE_CLIENT_ID);
    // Claude's public client takes no secret.
    assert!(sent.get("client_secret").is_none());
}

#[tokio::test]
async fn claude_refresh_result_is_cached_and_reused() {
    // A single exchange must serve subsequent requests: the stub answers
    // once, so a second refresh attempt would hang/fail instead.
    let (url, server) =
        stub_token_endpoint(r#"{"access_token":"cached-once","expires_in":3600}"#).await;
    let expired = SubscriptionToken {
        access_token: "expired".into(),
        refresh_token: Some("r".into()),
        expires_at_ms: Some(1),
        account_id: None,
        resource_url: None,
    };
    let client = reqwest::Client::new();
    let fresh = refresh_at(
        &client,
        &url,
        SubscriptionProvider::Claude,
        &expired,
        10_000,
    )
    .await
    .unwrap();

    let cache = TokenCache::new();
    cache.store_refreshed(SubscriptionProvider::Claude, "primary", fresh);
    let reused = cache
        .get_fresh(&client, SubscriptionProvider::Claude, expired, 20_000)
        .await;
    assert_eq!(reused.access_token, "cached-once");
    server.await.unwrap();
}

#[tokio::test]
async fn concurrent_successful_refreshes_share_one_exchange() {
    let (url, server) =
        stub_token_endpoint(r#"{"access_token":"shared-refresh","expires_in":3600}"#).await;
    let cache = TokenCache::new();
    let client = reqwest::Client::new();
    let expired = token(Some("one-refresh-token"), Some(1));
    let _store = register_test_store(&cache, SubscriptionProvider::Claude, "primary", &expired);
    let requests = (0..10).map(|_| {
        cache.get_fresh_for_at(
            &client,
            &url,
            SubscriptionProvider::Claude,
            "primary",
            expired.clone(),
            10_000,
        )
    });
    let refreshed = futures_util::future::join_all(requests).await;

    assert!(
        refreshed
            .iter()
            .all(|token| token.access_token == "shared-refresh")
    );
    server.await.expect("single refresh exchange");
}

#[tokio::test]
async fn terminal_refresh_failure_is_attempted_only_once_for_same_credential() {
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
    let expired = token(Some("revoked-refresh"), Some(1));
    let _store = register_test_store(&cache, SubscriptionProvider::Claude, "primary", &expired);
    let requests = (0..8).map(|_| {
        cache.get_fresh_for_at(
            &client,
            &url,
            SubscriptionProvider::Claude,
            "primary",
            expired.clone(),
            10_000,
        )
    });
    futures_util::future::join_all(requests).await;
    server.await.unwrap();

    assert_eq!(calls.load(Ordering::SeqCst), 1);
    assert_eq!(
        cache.evidence(SubscriptionProvider::Claude),
        Some(CredentialEvidence::Rejected)
    );
}

/// A token close to expiry is renewed *before* it lapses, so the request
/// that would have discovered the expiry never fails (issue #203).
#[tokio::test]
async fn a_token_near_expiry_is_refreshed_before_it_lapses() {
    let (url, server) =
        stub_token_endpoint(r#"{"access_token":"renewed-early","expires_in":3600}"#).await;
    let cache = TokenCache::new();
    let client = reqwest::Client::new();

    // Still valid for another 10 seconds — inside the refresh window.
    let nearly_due = token(Some("r"), Some(100_000));
    let _store = register_test_store(&cache, SubscriptionProvider::Claude, "primary", &nearly_due);
    let out = cache
        .get_fresh_for_at(
            &client,
            &url,
            SubscriptionProvider::Claude,
            "primary",
            nearly_due,
            90_000,
        )
        .await;
    assert_eq!(
        out.access_token, "renewed-early",
        "a token inside the skew window must be renewed proactively"
    );
    server.await.unwrap();
}

/// Well before the window, nothing is exchanged: the skew must not turn
/// every request into a refresh.
#[tokio::test]
async fn a_token_far_from_expiry_is_used_unchanged() {
    let cache = TokenCache::new();
    let client = reqwest::Client::new();
    let healthy = token(Some("r"), Some(10_000_000));
    let out = cache
        .get_fresh_for_at(
            &client,
            // Any exchange would fail against this address, so reaching the
            // endpoint at all would fail the test.
            "http://unused.invalid",
            SubscriptionProvider::Claude,
            "primary",
            healthy.clone(),
            90_000,
        )
        .await;
    assert_eq!(out, healthy);
}

/// A cached token that is still valid is preferred even when it sits
/// inside the refresh window: it beats returning the expired disk token
/// when a refresh is unavailable (rate limited, or backing off).
#[tokio::test]
async fn a_valid_cached_token_is_used_even_inside_the_refresh_window() {
    let cache = TokenCache::new();
    let client = reqwest::Client::new();
    cache.store_for(
        SubscriptionProvider::Claude,
        "primary",
        SubscriptionToken {
            access_token: "cached-but-near-expiry".into(),
            refresh_token: Some("r".into()),
            expires_at_ms: Some(100_000),
            account_id: None,
            resource_url: None,
        },
    );
    // Mark the subscription as backing off so no exchange is attempted.
    cache
        .attempts
        .for_subscription(
            SubscriptionProvider::Claude,
            "primary",
            &token(Some("r"), Some(1)),
        )
        .lock()
        .await
        .record_transient_failure_after(90_000, Some(600));

    let out = cache
        .get_fresh_for_at(
            &client,
            "http://unused.invalid",
            SubscriptionProvider::Claude,
            "primary",
            token(Some("r"), Some(1)),
            90_000,
        )
        .await;
    assert_eq!(out.access_token, "cached-but-near-expiry");
}

/// The reported incident, end to end (issue #203): the endpoint answers
/// `429`, and the subscription must stay usable — not be marked rejected
/// and pinned dead until restart.
#[tokio::test]
async fn a_rate_limited_refresh_leaves_the_subscription_usable() {
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
            // The vendor's own rate-limit shape, which happens to be JSON
            // with an `error` object — the case the substring match got
            // wrong when the body mentioned a grant error.
            let body = r#"{"type":"error","error":{"type":"rate_limit_error","message":"too many requests; this is not an invalid_grant"}}"#;
            socket
                .write_all(
                    format!(
                        "HTTP/1.1 429 Too Many Requests\r\ncontent-type: application/json\r\nretry-after: 2\r\ncontent-length: {}\r\nconnection: close\r\n\r\n{body}",
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
    let expired = token(Some("rate-limited-refresh"), Some(1));
    let _store = register_test_store(&cache, SubscriptionProvider::Claude, "primary", &expired);
    let returned = cache
        .get_fresh_for_at(
            &client,
            &url,
            SubscriptionProvider::Claude,
            "primary",
            expired.clone(),
            10_000,
        )
        .await;

    // The credential is handed back unchanged so the caller can still try.
    assert_eq!(returned, expired);
    // Crucially: no rejection evidence. Recording it here would drop the
    // provider out of routing entirely.
    assert_eq!(cache.evidence(SubscriptionProvider::Claude), None);
    // The operator-visible message must not claim waiting is futile.
    let reported = cache
        .last_refresh_error(SubscriptionProvider::Claude)
        .expect("the failure is still reported");
    assert!(!reported.contains("re-authenticate"), "{reported}");
    assert!(!reported.contains("waiting will not help"), "{reported}");

    // `Retry-After: 2` is honoured: still suppressed just before it, and
    // retried once it elapses — a terminal verdict would never retry.
    assert_eq!(calls.load(Ordering::SeqCst), 1);
    let _ = cache
        .get_fresh_for_at(
            &client,
            &url,
            SubscriptionProvider::Claude,
            "primary",
            expired.clone(),
            11_999,
        )
        .await;
    assert_eq!(calls.load(Ordering::SeqCst), 1, "still within Retry-After");

    let _ = cache
        .get_fresh_for_at(
            &client,
            &url,
            SubscriptionProvider::Claude,
            "primary",
            expired,
            12_000,
        )
        .await;
    assert_eq!(
        calls.load(Ordering::SeqCst),
        2,
        "the refresh is retried once Retry-After elapses"
    );
    server.await.unwrap();
}

/// A 5xx is likewise retryable rather than terminal.
#[tokio::test]
async fn a_server_error_refresh_is_retried_rather_than_written_off() {
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
            // A proxy error page that quotes the grant error verbatim.
            let body = "<html>upstream reported invalid_grant</html>";
            socket
                .write_all(
                    format!(
                        "HTTP/1.1 502 Bad Gateway\r\ncontent-type: text/html\r\ncontent-length: {}\r\nconnection: close\r\n\r\n{body}",
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
    let expired = token(Some("transient-refresh"), Some(1));
    let _store = register_test_store(&cache, SubscriptionProvider::Claude, "primary", &expired);
    for now in [10_000, 11_001] {
        let _ = cache
            .get_fresh_for_at(
                &client,
                &url,
                SubscriptionProvider::Claude,
                "primary",
                expired.clone(),
                now,
            )
            .await;
    }
    server.await.unwrap();

    // Two attempts, one per backoff window: a terminal verdict would have
    // stopped after the first, even though the body says `invalid_grant`.
    assert_eq!(calls.load(Ordering::SeqCst), 2);
    assert_eq!(cache.evidence(SubscriptionProvider::Claude), None);
}

#[tokio::test]
async fn changed_valid_credential_clears_terminal_rejection() {
    let cache = TokenCache::new();
    let expired = token(Some("revoked"), Some(1));
    let attempt =
        cache
            .attempts
            .for_subscription(SubscriptionProvider::Claude, "primary", &expired);
    attempt.lock().await.record_terminal_failure();
    cache.record_credential_rejected(SubscriptionProvider::Claude);

    let replacement = token(Some("new-login"), Some(20_000));
    let result = cache
        .get_fresh_for_at(
            &reqwest::Client::new(),
            "http://unused.invalid",
            SubscriptionProvider::Claude,
            "primary",
            replacement.clone(),
            10_000,
        )
        .await;

    assert_eq!(result, replacement);
    assert!(cache.evidence(SubscriptionProvider::Claude).is_none());
}

#[tokio::test]
async fn claude_refresh_requires_a_refresh_token() {
    // Without a `refreshToken` in `claudeAiOauth` there is nothing to
    // exchange; the error must be explicit rather than `Unsupported`.
    let client = reqwest::Client::new();
    let no_refresh = token(None, Some(0));
    let err = refresh(&client, SubscriptionProvider::Claude, &no_refresh, 1_000)
        .await
        .expect_err("must fail without a refresh token");
    assert!(matches!(err, RefreshError::NoRefreshToken));
}

#[test]
fn encode_form_percent_encodes_reserved_bytes() {
    let body = encode_form(&[
        ("grant_type", "refresh_token"),
        ("refresh_token", "a/b+c=d"),
    ]);
    assert_eq!(body, "grant_type=refresh_token&refresh_token=a%2Fb%2Bc%3Dd");
}

#[test]
fn merge_carries_metadata_and_computes_expiry() {
    let prev = token(Some("r1"), Some(0));
    let resp = RefreshResponse {
        access_token: Some("new-access".into()),
        refresh_token: None,
        expires_in: Some(3600),
    };
    let merged = merge_refresh_response(&prev, &resp, 1_000).unwrap();
    assert_eq!(merged.access_token, "new-access");
    // refresh_token not rotated -> reuse previous.
    assert_eq!(merged.refresh_token.as_deref(), Some("r1"));
    assert_eq!(merged.expires_at_ms, Some(1_000 + 3_600_000));
    assert_eq!(merged.account_id.as_deref(), Some("acct_1"));
    assert_eq!(merged.resource_url.as_deref(), Some("portal.qwen.ai"));
}

#[test]
fn merge_rotates_refresh_token_when_present() {
    let prev = token(Some("r1"), Some(0));
    let resp = RefreshResponse {
        access_token: Some("new-access".into()),
        refresh_token: Some("r2".into()),
        expires_in: None,
    };
    let merged = merge_refresh_response(&prev, &resp, 1_000).unwrap();
    assert_eq!(merged.refresh_token.as_deref(), Some("r2"));
    assert_eq!(merged.expires_at_ms, None);
}

#[test]
fn merge_requires_access_token() {
    let prev = token(Some("r1"), Some(0));
    let resp = RefreshResponse::default();
    assert!(matches!(
        merge_refresh_response(&prev, &resp, 1_000),
        Err(RefreshError::Parse(_))
    ));
}

#[test]
fn merge_accepts_zero_expiry_without_treating_it_as_missing() {
    let prev = token(Some("r1"), Some(0));
    let resp = RefreshResponse {
        access_token: Some("new-access".into()),
        refresh_token: None,
        expires_in: Some(0),
    };
    let merged = merge_refresh_response(&prev, &resp, 1_000).unwrap();
    assert_eq!(merged.expires_at_ms, Some(1_000));
}

#[test]
fn merge_rejects_negative_or_unrepresentable_expiry() {
    let prev = token(Some("r1"), Some(0));
    for expires_in in [-1, i64::MAX] {
        let resp = RefreshResponse {
            access_token: Some("must-not-escape".into()),
            refresh_token: Some("must-not-rotate".into()),
            expires_in: Some(expires_in),
        };
        assert!(matches!(
            merge_refresh_response(&prev, &resp, 1_000),
            Err(RefreshError::Parse(_))
        ));
    }
}

#[tokio::test]
async fn get_fresh_returns_valid_disk_token_unchanged() {
    let cache = TokenCache::new();
    let client = reqwest::Client::new();
    let valid = token(Some("r1"), Some(10_000));
    let out = cache
        .get_fresh(&client, SubscriptionProvider::Qwen, valid.clone(), 1_000)
        .await;
    assert_eq!(out.access_token, valid.access_token);
}

#[tokio::test]
async fn get_fresh_prefers_cached_valid_token() {
    let cache = TokenCache::new();
    let client = reqwest::Client::new();
    let cached = SubscriptionToken {
        access_token: "cached-access".into(),
        refresh_token: Some("r1".into()),
        expires_at_ms: Some(10_000),
        account_id: None,
        resource_url: None,
    };
    cache.store_for(SubscriptionProvider::Qwen, "primary", cached);
    let expired_disk = token(Some("r1"), Some(0));
    let out = cache
        .get_fresh(&client, SubscriptionProvider::Qwen, expired_disk, 1_000)
        .await;
    assert_eq!(out.access_token, "cached-access");
}

/// "expired" invites waiting; a dead refresh token needs re-authentication,
/// so the two must not read the same.
#[test]
fn invalid_grant_is_reported_as_a_re_authentication_prompt() {
    let dead = RefreshError::from_status(
        400,
        r#"{"error":"invalid_grant","error_description":"Refresh token not found or invalid"}"#,
        None,
    );
    assert!(dead.is_invalid_grant());
    let message = dead.to_string();
    assert!(message.contains("re-authenticate"), "{message}");
    assert!(message.contains("invalid_grant"), "{message}");
    // The remedy must name the command, not just describe the problem.
    assert!(message.contains("auth"), "{message}");

    let transient = RefreshError::from_status(503, "upstream busy", None);
    assert!(!transient.is_invalid_grant());
    assert!(!transient.to_string().contains("re-authenticate"));
}

/// The reported defect: a rate limit is not a revoked subscription
/// (issue #203). The old classifier declared this terminal and told the
/// operator that waiting would not help.
#[test]
fn a_rate_limit_is_never_terminal() {
    let limited = RefreshError::from_status(
        429,
        r#"{"type":"error","error":{"type":"rate_limit_error"}}"#,
        Some(30),
    );
    assert!(!limited.is_invalid_grant(), "429 must not be terminal");
    assert!(limited.is_rate_limited());
    assert_eq!(limited.retry_after_ms(), Some(30_000));

    let message = limited.to_string();
    assert!(!message.contains("re-authenticate"), "{message}");
    assert!(
        !message.contains("waiting will not help"),
        "the message must not deny the remedy that actually works: {message}"
    );
    assert!(message.contains("retried automatically"), "{message}");
}

/// A body that merely *contains* the text is not the endpoint reporting it.
/// The old substring match failed exactly this case.
#[test]
fn invalid_grant_text_outside_a_client_error_is_not_terminal() {
    // A proxy error page quoting the code.
    let proxy_page = RefreshError::from_status(
        502,
        "<html><body>upstream said invalid_grant</body></html>",
        None,
    );
    assert!(!proxy_page.is_invalid_grant());

    // A rate limit whose body happens to mention it.
    let limited = RefreshError::from_status(
        429,
        r#"{"error":"rate_limited","hint":"not invalid_grant"}"#,
        None,
    );
    assert!(!limited.is_invalid_grant());

    // A success-shaped body carrying the string.
    let odd = RefreshError::from_status(200, r#"{"note":"invalid_grant"}"#, None);
    assert!(!odd.is_invalid_grant());

    // A 5xx that *does* parse to the code is still not terminal: only a
    // client error means the grant itself was rejected.
    let server_error = RefreshError::from_status(500, r#"{"error":"invalid_grant"}"#, None);
    assert!(!server_error.is_invalid_grant());
}

/// Terminal classification requires status *and* a parsed code.
#[test]
fn terminal_classification_requires_status_and_parsed_code() {
    for status in [400, 401, 403] {
        let error = RefreshError::from_status(status, r#"{"error":"invalid_grant"}"#, None);
        assert!(error.is_invalid_grant(), "{status} + invalid_grant");
    }
    // The nested vendor shape is understood too.
    assert!(
        RefreshError::from_status(400, r#"{"error":{"type":"invalid_grant"}}"#, None)
            .is_invalid_grant()
    );
    // A client error with a *different* OAuth code is not terminal.
    for code in [
        "invalid_scope",
        "invalid_request",
        "temporarily_unavailable",
    ] {
        let body = format!(r#"{{"error":"{code}"}}"#);
        assert!(
            !RefreshError::from_status(400, &body, None).is_invalid_grant(),
            "{code} must not be terminal"
        );
    }
    // A client error with an unparseable body is not terminal either.
    assert!(!RefreshError::from_status(400, "Bad Request", None).is_invalid_grant());
}

/// Failures without a terminal endpoint verdict are always retryable.
#[test]
fn transport_failures_are_never_terminal() {
    for error in [
        RefreshError::Request("connection reset by peer".to_string()),
        RefreshError::Request("operation timed out".to_string()),
        RefreshError::Parse("expected value".to_string()),
        RefreshError::Storage("durable lock unavailable".to_string()),
        RefreshError::NoRefreshToken,
    ] {
        assert!(!error.is_invalid_grant(), "{error}");
        assert!(!error.is_rate_limited(), "{error}");
        assert_eq!(error.retry_after_ms(), None);
    }
}

#[test]
fn oauth_error_codes_are_parsed_not_matched_textually() {
    assert_eq!(
        oauth_error_code(r#"{"error":"invalid_grant"}"#).as_deref(),
        Some("invalid_grant")
    );
    assert_eq!(
        oauth_error_code(r#"{"error":{"type":"rate_limit_error"}}"#).as_deref(),
        Some("rate_limit_error")
    );
    assert_eq!(
        oauth_error_code(r#"{"error":{"code":"invalid_client"}}"#).as_deref(),
        Some("invalid_client")
    );
    // Not JSON, or no error object at all.
    assert_eq!(oauth_error_code("invalid_grant"), None);
    assert_eq!(oauth_error_code(r#"{"ok":true}"#), None);
    assert_eq!(oauth_error_code(""), None);
}

/// A failed refresh must leave an actionable trace for `doctor`, and a later
/// success must clear it.
#[test]
fn refresh_errors_are_recorded_per_provider_and_cleared() {
    let cache = TokenCache::new();
    assert!(
        cache
            .last_refresh_error(SubscriptionProvider::Claude)
            .is_none()
    );
    cache.record_refresh_error(SubscriptionProvider::Claude, "invalid_grant");
    assert_eq!(
        cache
            .last_refresh_error(SubscriptionProvider::Claude)
            .as_deref(),
        Some("invalid_grant")
    );
    assert!(
        cache
            .last_refresh_error(SubscriptionProvider::Codex)
            .is_none()
    );
}

#[test]
fn refreshed_tokens_are_isolated_by_account() {
    let cache = TokenCache::new();
    let mut first = token(Some("refresh-a"), Some(10_000));
    first.access_token = "access-a".into();
    let mut second = token(Some("refresh-b"), Some(10_000));
    second.access_token = "access-b".into();

    cache.store_for(SubscriptionProvider::Qwen, "primary", first);
    cache.store_for(SubscriptionProvider::Qwen, "account-1", second);

    assert_eq!(
        cache
            .cached_valid_for(SubscriptionProvider::Qwen, "primary", 1_000)
            .unwrap()
            .access_token,
        "access-a"
    );
    assert_eq!(
        cache
            .cached_valid_for(SubscriptionProvider::Qwen, "account-1", 1_000)
            .unwrap()
            .access_token,
        "access-b"
    );
}

/// Every failure variant renders a distinct, non-empty message; `doctor` and
/// the logs surface these verbatim.
#[test]
fn every_refresh_error_variant_renders_a_message() {
    let rendered: Vec<String> = [
        RefreshError::Unsupported,
        RefreshError::NoRefreshToken,
        RefreshError::Request("connection refused".into()),
        RefreshError::Parse("expected value".into()),
        RefreshError::Storage("durable lock unavailable".into()),
        RefreshError::from_status(500, "boom", None),
    ]
    .iter()
    .map(ToString::to_string)
    .collect();

    for message in &rendered {
        assert!(!message.is_empty());
        // None of these are terminal, so none may advise re-authentication.
        assert!(!message.contains("re-authenticate"), "{message}");
    }
    assert!(rendered[0].contains("does not support"), "{}", rendered[0]);
    assert!(rendered[1].contains("no refresh token"), "{}", rendered[1]);
    assert!(rendered[2].contains("transport"), "{}", rendered[2]);
    assert!(rendered[3].contains("parse error"), "{}", rendered[3]);
    assert!(rendered[4].contains("storage"), "{}", rendered[4]);
    assert!(rendered[5].contains("500"), "{}", rendered[5]);
}

/// The form-encoded providers send the same grant over
/// `application/x-www-form-urlencoded`, and percent-encode token bytes that
/// would otherwise break the body.
#[tokio::test]
async fn qwen_refresh_sends_a_form_encoded_grant() {
    let (url, server) = stub_token_endpoint(
        r#"{"access_token":"qwen-new","refresh_token":"qwen-rt-new","expires_in":3600}"#,
    )
    .await;
    // A refresh token containing reserved bytes must survive transit.
    let expired = SubscriptionToken {
        access_token: "expired".into(),
        refresh_token: Some("a+b/c=d".into()),
        expires_at_ms: Some(1),
        account_id: None,
        resource_url: None,
    };
    let fresh = refresh_at(
        &reqwest::Client::new(),
        &url,
        SubscriptionProvider::Qwen,
        &expired,
        10_000,
    )
    .await
    .expect("qwen refresh should succeed");

    assert_eq!(fresh.access_token, "qwen-new");
    assert_eq!(fresh.refresh_token.as_deref(), Some("qwen-rt-new"));

    let (head, body) = server.await.unwrap();
    assert!(
        head.to_ascii_lowercase()
            .contains("content-type: application/x-www-form-urlencoded"),
        "{head}"
    );
    assert!(body.contains("grant_type=refresh_token"), "{body}");
    assert!(
        body.contains("refresh_token=a%2Bb%2Fc%3Dd"),
        "reserved bytes must be percent-encoded: {body}"
    );
}

/// `refresh` is the public wrapper used by callers that do not go through the
/// cache; it resolves the provider's own token URL.
#[tokio::test]
async fn the_public_refresh_wrapper_reports_a_missing_refresh_token() {
    let without = SubscriptionToken {
        access_token: "expired".into(),
        refresh_token: None,
        expires_at_ms: Some(1),
        account_id: None,
        resource_url: None,
    };
    let error = refresh(
        &reqwest::Client::new(),
        SubscriptionProvider::Claude,
        &without,
        10_000,
    )
    .await
    .expect_err("a token with no refresh token cannot be refreshed");
    assert!(matches!(error, RefreshError::NoRefreshToken));
    // An empty string is treated the same as absent.
    let blank = SubscriptionToken {
        refresh_token: Some(String::new()),
        ..without
    };
    assert!(matches!(
        refresh(
            &reqwest::Client::new(),
            SubscriptionProvider::Claude,
            &blank,
            10_000,
        )
        .await,
        Err(RefreshError::NoRefreshToken)
    ));
}

/// Import validation is deliberately stricter than ordinary serving refresh:
/// even a currently live access token is refused when its durable chain has no
/// next refresh link.
#[tokio::test]
async fn import_validation_requires_a_durable_refresh_link() {
    let cache = TokenCache::new();
    let without_refresh = token(None, Some(9_999_999_999_999));
    let _store = register_test_store(
        &cache,
        SubscriptionProvider::Claude,
        "import-candidate",
        &without_refresh,
    );

    let error = cache
        .validate_refresh_chain_registered_at(
            &reqwest::Client::new(),
            "http://127.0.0.1:1/token",
            SubscriptionProvider::Claude,
            "import-candidate",
            10_000,
        )
        .await
        .expect_err("a non-refreshable candidate must fail before network I/O");

    assert!(error.contains("not refreshable"), "{error}");
    assert!(!error.contains("127.0.0.1"), "{error}");
}

#[path = "refresh_reactive_tests.rs"]
mod reactive;

#[path = "refresh_refusal_tests.rs"]
mod refusal;
