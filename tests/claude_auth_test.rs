use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::{Arc, Mutex};
use std::time::Duration;

use axum::{
    Json, Router,
    extract::{Request, State},
    http::StatusCode,
    response::IntoResponse as _,
    routing::{any, get, post},
};
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
    let received = Arc::new(Mutex::new(Vec::new()));
    let app = Router::new()
        .route("/token", post(token_endpoint))
        .route(
            "/v1/models",
            get(|| async { Json(json!({"data":[{"id":"claude-live"}]})) }),
        )
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

    let request = {
        let requests = received.lock().unwrap();
        assert_eq!(requests.len(), 2, "authorization then refresh validation");
        requests[0].clone()
    };
    assert_eq!(request["grant_type"], "authorization_code");
    assert_eq!(request["code"], "copied-code");
    assert_eq!(request["state"], state);
    assert_eq!(request["client_id"], "public-client");
    let verifier = base64::engine::general_purpose::URL_SAFE_NO_PAD
        .decode(request["code_verifier"].as_str().unwrap())
        .expect("verifier must be unpadded URL-safe base64");
    assert_eq!(verifier.len(), 32, "verifier must carry 256 bits");
    let stored: Value = serde_json::from_slice(&std::fs::read(path).unwrap()).unwrap();
    assert_eq!(stored["claudeAiOauth"]["accessToken"], "sk-ant-oat-rotated");
    assert_eq!(
        stored["claudeAiOauth"]["refreshToken"],
        "sk-ant-ort-rotated"
    );
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

/// Native OAuth exchanges before opening the exact primary refresh lock.
#[tokio::test]
async fn native_claude_install_uses_the_exact_primary_refresh_lock() {
    let exchange_requests = Arc::new(AtomicUsize::new(0));
    let request_counter = Arc::clone(&exchange_requests);
    let app = Router::new()
        .route(
            "/token",
            post(move || {
                let request_counter = Arc::clone(&request_counter);
                async move {
                    request_counter.fetch_add(1, Ordering::SeqCst);
                    Json(json!({
                        "access_token": "native-access",
                        "refresh_token": "native-refresh",
                        "expires_in": 3600
                    }))
                }
            }),
        )
        .route(
            "/v1/models",
            get(|| async { Json(json!({"data":[{"id":"claude-live"}]})) }),
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
    std::fs::create_dir_all(&lock_path).expect("make the exact lock path unopenable as a file");

    let error = login
        .complete_with_data_dir("copied-code", data.path())
        .await
        .expect_err("native installation must open the exact refresh lock");
    assert_eq!(exchange_requests.load(Ordering::SeqCst), 2);
    assert!(
        error.contains("could not acquire the durable claude credential lock"),
        "unexpected lock-open error: {error}"
    );
    assert!(!home.path().join(".credentials.json").exists());
    server.abort();
}

#[tokio::test]
async fn native_claude_rejection_preserves_the_working_primary() {
    let token_calls = Arc::new(AtomicUsize::new(0));
    let calls = Arc::clone(&token_calls);
    let app = Router::new().fallback(any(move |request: Request| {
        let calls = Arc::clone(&calls);
        async move {
            match (request.method().as_str(), request.uri().path()) {
                ("POST", "/token") => {
                    let call = calls.fetch_add(1, Ordering::SeqCst);
                    Json(if call == 0 {
                        json!({
                            "access_token": "native-access",
                            "refresh_token": "native-refresh",
                            "expires_in": 3600
                        })
                    } else {
                        json!({
                            "access_token": "rotated-access",
                            "refresh_token": "rotated-refresh",
                            "expires_in": 3600
                        })
                    })
                    .into_response()
                }
                ("GET", "/v1/models") => StatusCode::UNAUTHORIZED.into_response(),
                _ => StatusCode::NOT_FOUND.into_response(),
            }
        }
    }));
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let address = listener.local_addr().unwrap();
    let server = tokio::spawn(async move { axum::serve(listener, app).await.unwrap() });
    let home = tempfile::tempdir().unwrap();
    let data = tempfile::tempdir().unwrap();
    let primary = home.path().join(".credentials.json");
    let original =
        br#"{"claudeAiOauth":{"accessToken":"working","refreshToken":"working-refresh"}}"#;
    std::fs::write(&primary, original).unwrap();
    let login = ClaudeLogin::begin(ClaudeAuthConfig {
        authorize_url: "https://claude.test/oauth/authorize".into(),
        token_url: format!("http://{address}/token"),
        client_id: "public-client".into(),
        redirect_uri: "https://callback.test/code".into(),
        claude_home: home.path().into(),
        scopes: CLAUDE_SCOPES.into(),
    });

    let error = login
        .complete_with_data_dir("copied-code", data.path())
        .await
        .expect_err("catalog rejection must block promotion");

    assert!(error.contains("rejected"), "{error}");
    assert!(error.contains("transaction"), "{error}");
    assert!(!error.contains("rotated-access"), "{error}");
    assert_eq!(std::fs::read(primary).unwrap(), original);
    assert_eq!(token_calls.load(Ordering::SeqCst), 2);
    server.abort();
}

#[tokio::test]
async fn native_claude_token_errors_never_echo_provider_bodies_or_codes() {
    let app = Router::new().route(
        "/token",
        post(|| async {
            (
                StatusCode::BAD_REQUEST,
                "access_token=leaked-access refresh_token=leaked-refresh code=leaked-code",
            )
        }),
    );
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let address = listener.local_addr().unwrap();
    let server = tokio::spawn(async move { axum::serve(listener, app).await.unwrap() });
    let home = tempfile::tempdir().unwrap();
    let data = tempfile::tempdir().unwrap();
    let login = ClaudeLogin::begin(ClaudeAuthConfig {
        authorize_url: "https://claude.test/oauth/authorize".into(),
        token_url: format!("http://{address}/token"),
        client_id: "public-client".into(),
        redirect_uri: "https://callback.test/code".into(),
        claude_home: home.path().into(),
        scopes: CLAUDE_SCOPES.into(),
    });

    let error = login
        .complete_with_data_dir("leaked-code", data.path())
        .await
        .expect_err("provider rejection");

    assert!(error.contains("400"), "{error}");
    for secret in ["leaked-access", "leaked-refresh", "leaked-code"] {
        assert!(!error.contains(secret), "leaked {secret}: {error}");
    }
    assert!(!home.path().join(".credentials.json").exists());
    server.abort();
}

async fn token_endpoint(
    State(received): State<Arc<Mutex<Vec<Value>>>>,
    Json(body): Json<Value>,
) -> Json<Value> {
    let mut received = received.lock().unwrap();
    received.push(body);
    let response = if received.len() == 1 {
        json!({
            "access_token": "sk-ant-oat-test",
            "refresh_token": "sk-ant-ort-test",
            "expires_in": 3600,
            "refresh_token_expires_in": 2_592_000,
            "scope": "user:profile user:inference",
            "subscription_type": "pro",
            "rate_limit_tier": "default_claude_pro"
        })
    } else {
        json!({
            "access_token": "sk-ant-oat-rotated",
            "refresh_token": "sk-ant-ort-rotated",
            "expires_in": 3600
        })
    };
    drop(received);
    Json(response)
}
