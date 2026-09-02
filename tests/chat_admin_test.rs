//! End-to-end tests of the chat admin channels against the *same* admin claim
//! the web UI uses.
//!
//! The unit tests in `src/chat_admin.rs` drive the chat core alone. What matters
//! here is the property issue #51 asks for: there is exactly one system-wide
//! bootstrap claim, so a claim made in a browser closes `/start` in chat and a
//! claim made in chat closes the browser bootstrap — with the claim persisted on
//! disk, as a real deployment has it.

use std::sync::Arc;
use std::time::Duration;

use axum::body::Body;
use axum::http::{Request, StatusCode};
use http_body_util::BodyExt;
use link_assistant_router::admin::AdminClaim;
use link_assistant_router::chat_admin::{ChatAdmin, ChatAdminConfig, ChatChannel};
use link_assistant_router::token::TokenManager;
use serde_json::{Value, json};
use tower::ServiceExt;

/// The admin HTTP surface and the chat core, wired to one claim and one store.
struct Harness {
    state: link_assistant_router::app_state::AppState,
    chat: ChatAdmin,
    _dir: tempfile::TempDir,
}

impl Harness {
    fn new() -> Self {
        let dir = tempfile::tempdir().expect("tempdir");
        let tokens = TokenManager::new("chat-admin-integration-secret");
        // One token manager behind the claim and the API: a chat claim mints a
        // real admin-scoped `la_sk_` JWT, exactly as a deployment does.
        let admin = Arc::new(
            AdminClaim::load(None, dir.path(), Duration::from_secs(120))
                .with_token_manager(tokens.clone()),
        );
        let state = state_with(Arc::clone(&admin), tokens.clone(), dir.path());
        let chat = ChatAdmin::new(
            admin,
            tokens,
            None,
            ChatAdminConfig {
                rate_limit_per_minute: 0,
                ..ChatAdminConfig::default()
            },
        );
        Self {
            state,
            chat,
            _dir: dir,
        }
    }

    async fn post(&self, path: &str, body: Value) -> (StatusCode, Value) {
        self.request("POST", path, None, Some(body)).await
    }

    async fn get(&self, path: &str) -> (StatusCode, Value) {
        self.request("GET", path, None, None).await
    }

    async fn request(
        &self,
        method: &str,
        path: &str,
        bearer: Option<&str>,
        body: Option<Value>,
    ) -> (StatusCode, Value) {
        let mut builder = Request::builder()
            .method(method)
            .uri(path)
            .header("content-type", "application/json");
        if let Some(token) = bearer {
            builder = builder.header("authorization", format!("Bearer {token}"));
        }
        let request = builder
            .body(Body::from(body.unwrap_or_else(|| json!({})).to_string()))
            .expect("request");
        let response = link_assistant_router::admin_api::router(self.state.clone())
            .oneshot(request)
            .await
            .expect("router responds");
        let status = response.status();
        let bytes = response
            .into_body()
            .collect()
            .await
            .expect("body")
            .to_bytes();
        (
            status,
            serde_json::from_slice(&bytes).unwrap_or(Value::Null),
        )
    }

    /// Complete the web-UI bootstrap, returning the claimed credential.
    async fn claim_through_the_web_ui(&self) -> String {
        let (status, minted) = self
            .post("/api/management/admin/bootstrap", json!({}))
            .await;
        assert_eq!(status, StatusCode::OK, "mint: {minted}");
        let token = minted["token"].as_str().expect("token").to_string();
        let claim_id = minted["claim_id"].as_str().expect("claim id").to_string();
        let (status, _) = self
            .request(
                "POST",
                "/api/management/admin/bootstrap/confirm",
                Some(&token),
                Some(json!({"claim_id": claim_id})),
            )
            .await;
        assert_eq!(status, StatusCode::OK);
        token
    }
}

fn state_with(
    admin: Arc<AdminClaim>,
    token_manager: TokenManager,
    data_dir: &std::path::Path,
) -> link_assistant_router::app_state::AppState {
    link_assistant_router::app_state::AppState {
        client: reqwest::Client::new(),
        token_manager,
        oauth_provider: link_assistant_router::oauth::OAuthProvider::new(
            data_dir.to_str().expect("utf-8 path"),
        ),
        account_router: None,
        subscription_reader: None,
        subscription_base_url: None,
        subscription_readers: vec![],
        model_catalogs: Arc::new(link_assistant_router::model_catalog::ModelCatalogCache::new()),
        subscription_cache: Arc::new(link_assistant_router::refresh::TokenCache::new()),
        upstream_base_url: "https://api.anthropic.com".to_string(),
        upstream_provider: link_assistant_router::config::UpstreamProvider::Anthropic,
        gonka: None,
        bridge_model: None,
        bridge_model_policy: link_assistant_router::bridge_selection::BridgeModelPolicy::default(),
        crater: None,
        openai_compatible: link_assistant_router::config::default_openai_compatible_config(),
        provider_store: link_assistant_router::providers::ProviderStore::open(
            data_dir,
            "chat-admin-integration-secret",
        )
        .expect("provider store"),
        logger: log_lazy::LogLazy::new(),
        admin,
        admin_key: None,
        allow_anonymous_admin: false,
        metrics: Arc::new(link_assistant_router::metrics::Metrics::default()),
        audit: Arc::new(link_assistant_router::audit::AuditLog::to_path(None)),
        request_log: Arc::new(link_assistant_router::request_log::RequestLog::new(
            data_dir.join("requests"),
            1024 * 1024,
        )),
        activitypub_actor_base_url: "https://router.example".to_string(),
        activitypub_public_key_pem:
            link_assistant_router::config::default_activitypub_public_key_pem(),
        mpp: link_assistant_router::config::default_mpp_config(),
        login_manager: link_assistant_router::login::LoginManager::new(
            link_assistant_router::login::LoginConfig::default(),
        ),
        github: link_assistant_router::github_proxy::GitHubProxyConfig::default(),
        max_proxy_request_bytes: link_assistant_router::config::DEFAULT_MAX_PROXY_REQUEST_BYTES,
    }
}

/// Pull the candidate token out of a `/start` reply.
///
/// A router wired to a token manager mints `la_sk_…` JWTs; the legacy
/// `la_admin_…` prefix is still recognised so this helper keeps working on a
/// deployment that has not been upgraded yet.
fn token_from(text: &str) -> String {
    text.split_whitespace()
        .find(|word| {
            word.starts_with(link_assistant_router::token::TOKEN_PREFIX)
                || word.starts_with(link_assistant_router::admin::ADMIN_TOKEN_PREFIX)
        })
        .expect("the mint reply carries a token")
        .to_string()
}

#[tokio::test]
async fn a_claim_made_in_the_web_ui_closes_start_in_chat() {
    let harness = Harness::new();
    let credential = harness.claim_through_the_web_ui().await;

    let reply = harness.chat.handle(ChatChannel::Telegram, "1", "/start");
    assert!(
        reply.text.contains("already claimed"),
        "chat must not mint a second bootstrap: {}",
        reply.text
    );
    // The credential the browser holds is the credential the chat accepts.
    assert!(
        harness
            .chat
            .handle(ChatChannel::Telegram, "1", &format!("/auth {credential}"))
            .text
            .contains("Signed in")
    );
}

#[tokio::test]
async fn a_claim_made_in_chat_closes_the_web_ui_bootstrap() {
    let harness = Harness::new();
    let minted = harness.chat.handle(ChatChannel::Vk, "7", "/start");
    let token = token_from(&minted.text);
    assert!(minted.secret, "a minted credential must not linger");

    // Phase one alone claims nothing: the browser bootstrap is still open.
    let (status, body) = harness.get("/api/management/admin/status").await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(
        body["bootstrap_open"], true,
        "an unconfirmed mint must lock nothing"
    );

    let confirmed = harness
        .chat
        .handle(ChatChannel::Vk, "7", &format!("/confirm {token}"));
    assert!(confirmed.text.contains("Administration claimed"));

    let (status, body) = harness
        .post("/api/management/admin/bootstrap", json!({}))
        .await;
    assert_eq!(
        status,
        StatusCode::CONFLICT,
        "the web UI bootstrap must be closed: {body}"
    );
}

#[tokio::test]
async fn the_chat_credential_administers_the_router() {
    let harness = Harness::new();
    let minted = harness.chat.handle(ChatChannel::Telegram, "2", "/start");
    let token = token_from(&minted.text);
    harness
        .chat
        .handle(ChatChannel::Telegram, "2", &format!("/confirm {token}"));

    let issued = harness
        .chat
        .handle(ChatChannel::Telegram, "2", "/issue ci-runner 2");
    assert!(issued.secret, "an issued token must be deletable");
    let value = issued
        .text
        .split_whitespace()
        .find(|word| word.starts_with(link_assistant_router::token::TOKEN_PREFIX))
        .expect("the issue reply carries the value")
        .to_string();
    assert!(
        harness.state.token_manager.validate_token(&value).is_ok(),
        "the token issued from chat must work against the router"
    );

    // Listing shows the token but never its value.
    let listed = harness.chat.handle(ChatChannel::Telegram, "2", "/tokens");
    assert!(listed.text.contains("ci-runner"));
    assert!(
        !listed.text.contains(&value),
        "a listing must never echo a token value"
    );

    let id = harness
        .state
        .token_manager
        .validate_token(&value)
        .expect("claims")
        .sub;
    assert!(
        harness
            .chat
            .handle(ChatChannel::Telegram, "2", &format!("/revoke {id}"))
            .text
            .contains("Revoked")
    );
    assert!(
        harness.state.token_manager.validate_token(&value).is_err(),
        "revoking from chat must take effect immediately"
    );
}

#[tokio::test]
async fn a_chat_claim_yields_an_admin_scoped_jwt() {
    let harness = Harness::new();
    let minted = harness.chat.handle(ChatChannel::Telegram, "9", "/start");
    let token = token_from(&minted.text);
    assert!(
        token.starts_with(link_assistant_router::token::TOKEN_PREFIX),
        "a chat claim mints the same credential model as everything else: {token}"
    );

    // Phase one is inert: the candidate authorises nothing anywhere.
    let (status, _) = harness
        .request("GET", "/api/management/tokens", Some(&token), None)
        .await;
    assert_eq!(status, StatusCode::UNAUTHORIZED);

    harness
        .chat
        .handle(ChatChannel::Telegram, "9", &format!("/confirm {token}"));

    let claims = harness
        .state
        .token_manager
        .validate_admin_token(&token)
        .expect("the confirmed credential is an admin-scoped JWT");
    assert_eq!(claims.scope, link_assistant_router::token::ADMIN_SCOPE);
    assert!(claims.exp > claims.iat, "the credential carries a lifetime");

    let (status, _) = harness
        .request("GET", "/api/management/tokens", Some(&token), None)
        .await;
    assert_eq!(
        status,
        StatusCode::OK,
        "the chat credential administers the HTTP surface too"
    );
}

#[tokio::test]
async fn a_claim_in_one_chat_channel_closes_the_other() {
    let harness = Harness::new();
    let minted = harness.chat.handle(ChatChannel::Telegram, "3", "/start");
    let token = token_from(&minted.text);
    harness
        .chat
        .handle(ChatChannel::Telegram, "3", &format!("/confirm {token}"));

    let reply = harness.chat.handle(ChatChannel::Vk, "8", "/start");
    assert!(
        reply.text.contains("already claimed"),
        "the first-claim lock is global, not per-channel: {}",
        reply.text
    );
    assert!(
        !harness
            .chat
            .handle(ChatChannel::Vk, "8", "/tokens")
            .text
            .contains("ci-runner"),
        "a stranger on another channel administers nothing"
    );
}

#[tokio::test]
async fn group_traffic_never_reaches_the_command_parser() {
    // Telegram: anything but an explicit private chat is dropped …
    for kind in ["group", "supergroup", "channel"] {
        assert!(!link_assistant_router::telegram::is_private(
            &json!({"chat": {"id": -100, "type": kind}, "text": "/start"})
        ));
    }
    assert!(link_assistant_router::telegram::is_private(
        &json!({"chat": {"id": 100, "type": "private"}, "text": "/start"})
    ));

    // … and VK multi-user chats arrive above the chat peer offset.
    assert!(!link_assistant_router::vk::is_private(2_000_000_007, 42));
    assert!(!link_assistant_router::vk::is_private(-42, -42));
    assert!(link_assistant_router::vk::is_private(42, 42));
}
