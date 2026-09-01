use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::{Arc, Mutex};
use std::time::Duration;

use axum::{Json, Router, extract::State, routing::post};
use base64::Engine as _;
use link_assistant_router::claude_auth::{CLAUDE_SCOPES, ClaudeAuthConfig, ClaudeLogin};
use link_assistant_router::refresh::CLAUDE_TOKEN_URL;
use serde_json::{Value, json};

#[test]
fn native_login_builds_the_claude_pkce_authorization_url() {
    let home = tempfile::tempdir().unwrap();
    let login = ClaudeLogin::begin(ClaudeAuthConfig {
        authorize_url: "https://claude.test/oauth/authorize".into(),
        token_url: "https://unused.test/token".into(),
        client_id: "public-client".into(),
        redirect_uri: "https://callback.test/code".into(),
        claude_home: home.path().into(),
        scopes: CLAUDE_SCOPES.into(),
    });
    let url = reqwest::Url::parse(login.authorization_url()).unwrap();
    let query = url
        .query_pairs()
        .collect::<std::collections::HashMap<_, _>>();

    assert_eq!(query["client_id"], "public-client");
    assert_eq!(query["redirect_uri"], "https://callback.test/code");
    assert_eq!(query["scope"], CLAUDE_SCOPES);
    assert_eq!(query["response_type"], "code");
    assert_eq!(query["code"], "true");
    assert_eq!(query["code_challenge_method"], "S256");
    assert!(!query["code_challenge"].is_empty());
    let state = base64::engine::general_purpose::URL_SAFE_NO_PAD
        .decode(query["state"].as_bytes())
        .expect("state must be unpadded URL-safe base64");
    assert_eq!(state.len(), 32, "state must match Claude Code's entropy");
}

#[test]
fn native_login_uses_the_current_claude_code_token_endpoint() {
    assert_eq!(
        CLAUDE_TOKEN_URL,
        "https://platform.claude.com/v1/oauth/token"
    );
}

#[tokio::test]
async fn native_login_exchanges_code_and_persists_a_refreshable_credential() {
    let received = Arc::new(Mutex::new(None));
    let app = Router::new()
        .route("/token", post(token_endpoint))
        .with_state(Arc::clone(&received));
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let address = listener.local_addr().unwrap();
    let server = tokio::spawn(async move { axum::serve(listener, app).await.unwrap() });
    let home = tempfile::tempdir().unwrap();
    let data = tempfile::tempdir().unwrap();
    let config = ClaudeAuthConfig {
        authorize_url: "https://claude.test/oauth/authorize".into(),
        token_url: format!("http://{address}/token"),
        client_id: "public-client".into(),
        redirect_uri: "https://callback.test/code".into(),
        claude_home: home.path().into(),
        scopes: CLAUDE_SCOPES.into(),
    };
    let login = ClaudeLogin::begin_persisted(config.clone(), Duration::from_secs(900)).unwrap();
    let state = reqwest::Url::parse(login.authorization_url())
        .unwrap()
        .query_pairs()
        .find(|(key, _)| key == "state")
        .unwrap()
        .1
        .into_owned();
    drop(login);

    let path = ClaudeLogin::resume(config)
        .unwrap()
        .complete_with_data_dir(&format!("copied-code#{state}"), data.path())
        .await
        .unwrap();
    server.abort();

    let request = received.lock().unwrap().clone().unwrap();
    assert_eq!(request["grant_type"], "authorization_code");
    assert_eq!(request["code"], "copied-code");
    assert_eq!(request["state"], state);
    assert_eq!(request["client_id"], "public-client");
    let verifier = base64::engine::general_purpose::URL_SAFE_NO_PAD
        .decode(request["code_verifier"].as_str().unwrap())
        .expect("verifier must be unpadded URL-safe base64");
    assert_eq!(verifier.len(), 32, "verifier must carry 256 bits");
    let stored: Value = serde_json::from_slice(&std::fs::read(path).unwrap()).unwrap();
    assert_eq!(stored["claudeAiOauth"]["accessToken"], "sk-ant-oat-test");
    assert_eq!(stored["claudeAiOauth"]["refreshToken"], "sk-ant-ort-test");
    assert_eq!(stored["claudeAiOauth"]["subscriptionType"], "pro");
    assert_eq!(
        stored["claudeAiOauth"]["rateLimitTier"],
        "default_claude_pro"
    );
    assert!(stored["claudeAiOauth"]["expiresAt"].as_i64().is_some());
    assert_eq!(
        stored["claudeAiOauth"]["scopes"],
        json!(["user:profile", "user:inference"])
    );
}

/// Native OAuth exchanges before locking, then contends on the exact primary
/// refresh lock only for installation.
#[tokio::test]
async fn native_claude_install_contends_on_the_primary_refresh_lock() {
    let exchange_completed = Arc::new(tokio::sync::Notify::new());
    let exchange_signal = Arc::clone(&exchange_completed);
    let exchange_requests = Arc::new(AtomicUsize::new(0));
    let request_counter = Arc::clone(&exchange_requests);
    let app = Router::new().route(
        "/token",
        post(move || {
            let exchange_signal = Arc::clone(&exchange_signal);
            let request_counter = Arc::clone(&request_counter);
            async move {
                request_counter.fetch_add(1, Ordering::SeqCst);
                exchange_signal.notify_one();
                Json(json!({
                    "access_token": "native-access",
                    "refresh_token": "native-refresh",
                    "expires_in": 3600
                }))
            }
        }),
    );
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let address = listener.local_addr().unwrap();
    let server = tokio::spawn(async move { axum::serve(listener, app).await.unwrap() });
    let home = tempfile::tempdir().unwrap();
    let data = tempfile::tempdir().unwrap();
    let config = ClaudeAuthConfig {
        authorize_url: "https://claude.test/oauth/authorize".into(),
        token_url: format!("http://{address}/token"),
        client_id: "public-client".into(),
        redirect_uri: "https://callback.test/code".into(),
        claude_home: home.path().into(),
        scopes: CLAUDE_SCOPES.into(),
    };
    let login = ClaudeLogin::begin(config);
    let lock_path = link_assistant_router::credential_recovery_store::credential_lock_path(
        data.path(),
        link_assistant_router::subscription::SubscriptionProvider::Claude,
        link_assistant_router::credential_recovery_store::PRIMARY_ACCOUNT,
    );
    let holder = link_assistant_router::durable_file::lock_exclusive_async(
        &lock_path,
        Duration::from_secs(1),
    )
    .await
    .unwrap();

    let data_path = data.path().to_path_buf();
    let completion =
        tokio::spawn(async move { login.complete_with_data_dir("copied-code", data_path).await });
    exchange_completed.notified().await;
    tokio::task::yield_now().await;
    assert_eq!(exchange_requests.load(Ordering::SeqCst), 1);
    assert!(
        !completion.is_finished(),
        "native Claude installation bypassed the refresh lock"
    );
    assert!(!home.path().join(".credentials.json").exists());
    drop(holder);

    let path = completion.await.unwrap().unwrap();
    assert!(path.is_file());
    server.abort();
}

async fn token_endpoint(
    State(received): State<Arc<Mutex<Option<Value>>>>,
    Json(body): Json<Value>,
) -> Json<Value> {
    *received.lock().unwrap() = Some(body);
    Json(json!({
        "access_token": "sk-ant-oat-test",
        "refresh_token": "sk-ant-ort-test",
        "expires_in": 3600,
        "refresh_token_expires_in": 2_592_000,
        "scope": "user:profile user:inference",
        "subscription_type": "pro",
        "rate_limit_tier": "default_claude_pro"
    }))
}
