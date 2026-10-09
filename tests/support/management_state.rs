// Hermetic management state shared by security and observability tests.
use axum::body::Body;
use axum::extract::ConnectInfo;
use axum::http::{Request, StatusCode};
use http_body_util::BodyExt as _;
use link_assistant_router::admin::AdminClaim;
use link_assistant_router::app_state::AppState;
use link_assistant_router::providers::ProviderStore;
use link_assistant_router::token::TokenManager;
use std::net::SocketAddr;
use std::sync::Arc;
use std::time::Duration;
use tower::ServiceExt as _;

fn state_with(
    admin: Arc<AdminClaim>,
    tokens: TokenManager,
    data_dir: &std::path::Path,
) -> AppState {
    AppState {
        client: reqwest::Client::new(),
        token_manager: tokens,
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
        provider_store: ProviderStore::open(data_dir, "management-security-test-secret")
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

fn setup(dir: &std::path::Path) -> AppState {
    let tokens = TokenManager::new("management-security-test-secret");
    let admin = Arc::new(AdminClaim::load(
        Some("management-test-admin".into()),
        dir,
        Duration::from_secs(60),
    ));
    let mut state = state_with(admin, tokens, dir);
    state.admin_key = Some("management-test-admin".into());
    state
}

fn request(ip: &str, path: &str, valid: bool) -> Request<Body> {
    Request::builder()
        .uri(path)
        .header(
            "authorization",
            if valid {
                "Bearer management-test-admin"
            } else {
                "Bearer rejected-credential"
            },
        )
        .extension(ConnectInfo(SocketAddr::new(ip.parse().unwrap(), 12345)))
        .body(Body::empty())
        .unwrap()
}

