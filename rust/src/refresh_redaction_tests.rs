//! OAuth refresh response redaction regressions (issue #430).

use super::*;

const SENTINEL: &str = "oauth-response-secret-sentinel@example.invalid";

async fn error_response(
    status: u16,
    body: &'static str,
    extra_headers: &'static str,
) -> RefreshError {
    use tokio::io::{AsyncReadExt, AsyncWriteExt};

    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let url = format!("http://{}/token", listener.local_addr().unwrap());
    let server = tokio::spawn(async move {
        let (mut socket, _) = listener.accept().await.unwrap();
        let mut request = [0; 4096];
        let _ = socket.read(&mut request).await.unwrap();
        socket
            .write_all(
                format!(
                    "HTTP/1.1 {status} Test\r\ncontent-type: application/json\r\n{extra_headers}content-length: {}\r\nconnection: close\r\n\r\n{body}",
                    body.len()
                )
                .as_bytes(),
            )
            .await
            .unwrap();
    });
    let previous = SubscriptionToken {
        access_token: "safe-old-access".into(),
        refresh_token: Some("safe-old-refresh".into()),
        expires_at_ms: Some(1),
        account_id: None,
        resource_url: None,
    };
    let error = refresh_at(
        &reqwest::Client::new(),
        &url,
        SubscriptionProvider::Claude,
        &previous,
        10_000,
    )
    .await
    .expect_err("scripted response must fail refresh");
    server.await.unwrap();
    error
}

/// The raw endpoint response exists only inside `refresh_at`: neither the
/// error's public rendering nor its debug representation can retain it.
#[tokio::test]
async fn every_refresh_response_class_discards_bodies_headers_and_parse_input() {
    let cases = [
        (
            400,
            r#"{"error":{"type":"invalid_grant","description":"oauth-response-secret-sentinel@example.invalid"},"access_token":"oauth-response-secret-sentinel@example.invalid"}"#,
            "x-provider-detail: oauth-response-secret-sentinel@example.invalid\r\n",
            Some(RefreshStatusClass::InvalidGrant),
            "re-authenticate",
        ),
        (
            401,
            r#"{"error":"invalid_client","account":"oauth-response-secret-sentinel@example.invalid"}"#,
            "",
            Some(RefreshStatusClass::InvalidClient),
            "re-authenticate",
        ),
        (
            403,
            r#"{"error":{"code":"unauthorized_client","email":"oauth-response-secret-sentinel@example.invalid"}}"#,
            "",
            Some(RefreshStatusClass::UnauthorizedClient),
            "re-authenticate",
        ),
        (
            429,
            "plain-text oauth-response-secret-sentinel@example.invalid",
            "retry-after: 17\r\nx-provider-detail: oauth-response-secret-sentinel@example.invalid\r\n",
            Some(RefreshStatusClass::RateLimited),
            "retry after 17s",
        ),
        (
            503,
            r#"{"error":{"token":"oauth-response-secret-sentinel@example.invalid"}}"#,
            "",
            Some(RefreshStatusClass::Transient),
            "retried automatically",
        ),
        (
            418,
            "{malformed oauth-response-secret-sentinel@example.invalid",
            "",
            Some(RefreshStatusClass::ClientRejected),
            "verify the provider configuration",
        ),
        (
            200,
            "{malformed oauth-response-secret-sentinel@example.invalid",
            "",
            None,
            "parse error",
        ),
    ];

    for (status, body, headers, expected_class, remediation) in cases {
        let error = error_response(status, body, headers).await;
        let public = error.to_string();
        let debug = format!("{error:?}");
        assert_eq!(error.status_class(), expected_class, "{status}: {public}");
        assert!(public.contains(remediation), "{status}: {public}");
        assert!(!public.contains(SENTINEL), "{status}: {public}");
        assert!(!debug.contains(SENTINEL), "{status}: {debug}");
        assert!(!public.contains(body), "{status}: {public}");
    }
}

#[test]
fn unknown_oauth_codes_are_classified_without_retaining_the_code() {
    let error = RefreshError::from_status(
        400,
        r#"{"error":"oauth-response-secret-sentinel@example.invalid"}"#,
        None,
    );
    assert_eq!(
        error.status_class(),
        Some(RefreshStatusClass::ClientRejected)
    );
    assert!(!error.to_string().contains(SENTINEL));
    assert!(!format!("{error:?}").contains(SENTINEL));
}
