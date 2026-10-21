use super::*;
use axum::Json;
use axum::extract::Request;
use axum::response::IntoResponse as _;
use axum::routing::any;

#[test]
fn loopback_authorization_uses_the_official_codex_originator() {
    let url = authorize_url(
        "https://auth.test",
        "client",
        "http://127.0.0.1:1455/auth/callback",
        "state",
        "challenge",
    );
    let parsed = reqwest::Url::parse(&url).expect("authorization URL");
    let originator = parsed
        .query_pairs()
        .find_map(|(key, value)| (key == "originator").then(|| value.into_owned()));
    assert_eq!(
        originator.as_deref(),
        Some(crate::codex_identity::ORIGINATOR)
    );
    assert!(!url.contains("link_assistant_router"));
}

#[test]
fn loopback_authorization_matches_the_versioned_codex_query_contract() {
    let fixture: serde_json::Value = serde_json::from_str(include_str!(
        "../tests/fixtures/clients/codex-authorize-contract.json"
    ))
    .unwrap();
    assert_eq!(
        fixture["client_version"],
        crate::codex_identity::DEFAULT_CLIENT_VERSION
    );
    assert_eq!(fixture["client_id"], CODEX_CLIENT_ID);

    let url = authorize_url(
        "https://auth.openai.com",
        CODEX_CLIENT_ID,
        "http://localhost:1455/auth/callback",
        "masked-state",
        "masked-challenge",
    );
    let parsed = reqwest::Url::parse(&url).unwrap();
    assert_eq!(parsed.path(), fixture["path"]);
    let actual = parsed
        .query_pairs()
        .map(|(key, value)| {
            (
                key.into_owned(),
                serde_json::Value::String(value.into_owned()),
            )
        })
        .collect::<serde_json::Map<_, _>>();
    assert_eq!(serde_json::Value::Object(actual), fixture["query"]);
}

#[test]
fn device_polling_exposes_only_stable_secret_free_outcomes() {
    assert!(matches!(
        classify_device_error(StatusCode::FORBIDDEN, ""),
        Ok(DevicePoll::Pending)
    ));
    assert!(matches!(
        classify_device_error(StatusCode::BAD_REQUEST, r#"{"error":"slow_down"}"#),
        Ok(DevicePoll::SlowDown)
    ));
    let expired = classify_device_error(
        StatusCode::FORBIDDEN,
        r#"{"error":"expired_token","error_description":"leaked-code"}"#,
    )
    .err()
    .expect("expired device authorization");
    assert!(expired.contains("expired_token"));
    assert!(!expired.contains("leaked-code"));
}

#[tokio::test]
async fn native_codex_rejection_preserves_the_working_primary() {
    let app = Router::new().fallback(any(|request: Request| async move {
        match (request.method().as_str(), request.uri().path()) {
            ("POST", "/oauth/token") => Json(serde_json::json!({
                "id_token": "rotated.header.sig",
                "access_token": "rotated-access",
                "refresh_token": "rotated-refresh",
                "expires_in": 3600
            }))
            .into_response(),
            ("GET", "/models") => StatusCode::UNAUTHORIZED.into_response(),
            _ => StatusCode::NOT_FOUND.into_response(),
        }
    }));
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let issuer = format!("http://{}", listener.local_addr().unwrap());
    let server = tokio::spawn(async move { axum::serve(listener, app).await.unwrap() });
    let home = tempfile::tempdir().unwrap();
    let data = tempfile::tempdir().unwrap();
    let primary = home.path().join("auth.json");
    let original = br#"{"auth_mode":"chatgpt","tokens":{"access_token":"working","refresh_token":"working-refresh"}}"#;
    std::fs::write(&primary, original).unwrap();
    let config = CodexAuthConfig {
        issuer,
        client_id: CODEX_CLIENT_ID.to_string(),
        port: 1455,
        codex_home: home.path().to_path_buf(),
        timeout: Duration::from_secs(3),
        bind_host: "127.0.0.1".to_string(),
    };
    let tokens = TokenResponse {
        id_token: "native.header.sig".to_string(),
        access_token: "native-access".to_string(),
        refresh_token: "native-refresh".to_string(),
    };

    let error = persist_codex_auth(&config, &tokens, data.path())
        .await
        .expect_err("catalog rejection must block promotion");

    assert!(error.contains("rejected"), "{error}");
    assert!(error.contains("transaction"), "{error}");
    assert!(!error.contains("rotated-access"), "{error}");
    assert_eq!(std::fs::read(primary).unwrap(), original);
    server.abort();
}

#[tokio::test]
async fn native_codex_token_errors_never_echo_provider_bodies_or_pkce_values() {
    let app = Router::new().route(
        "/oauth/token",
        axum::routing::post(|| async {
            (
                StatusCode::BAD_REQUEST,
                "access_token=leaked-access refresh_token=leaked-refresh id_token=leaked-id",
            )
        }),
    );
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let issuer = format!("http://{}", listener.local_addr().unwrap());
    let server = tokio::spawn(async move { axum::serve(listener, app).await.unwrap() });
    let home = tempfile::tempdir().unwrap();
    let data = tempfile::tempdir().unwrap();
    let config = CodexAuthConfig {
        issuer,
        client_id: CODEX_CLIENT_ID.to_string(),
        port: 1455,
        codex_home: home.path().to_path_buf(),
        timeout: Duration::from_secs(3),
        bind_host: "127.0.0.1".to_string(),
    };

    let error = exchange_and_store(
        &config,
        "http://localhost:1455/auth/callback",
        "leaked-verifier",
        "leaked-code",
        data.path(),
    )
    .await
    .expect_err("provider rejection");

    assert!(error.contains("400"), "{error}");
    for secret in [
        "leaked-access",
        "leaked-refresh",
        "leaked-id",
        "leaked-verifier",
        "leaked-code",
    ] {
        assert!(!error.contains(secret), "leaked {secret}: {error}");
    }
    assert!(!home.path().join("auth.json").exists());
    server.abort();
}
