//! Link.Assistant.Router binary entry point.
//!
//! Starts the HTTP server that proxies Anthropic API requests through
//! the Claude MAX OAuth session.

use axum::routing::{get, post};
use axum::Router;
use link_assistant_router::config::Config;
use link_assistant_router::oauth::OAuthProvider;
use link_assistant_router::proxy::{self, AppState};
use link_assistant_router::token::TokenManager;
use tower_http::trace::TraceLayer;
use tracing_subscriber::EnvFilter;

#[tokio::main]
async fn main() {
    // Initialize tracing
    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::from_default_env().add_directive("info".parse().unwrap()))
        .init();

    tracing::info!("Link.Assistant.Router v{}", link_assistant_router::VERSION);

    // Load configuration
    let config = match Config::from_env() {
        Ok(c) => c,
        Err(e) => {
            tracing::error!("Configuration error: {e}");
            std::process::exit(1);
        }
    };

    tracing::info!("Upstream: {}", config.upstream_base_url);
    tracing::info!("Claude Code home: {}", config.claude_code_home);

    // Build shared state
    let oauth_provider = OAuthProvider::new(&config.claude_code_home);
    let token_manager = TokenManager::new(&config.token_secret);
    let client = reqwest::Client::builder()
        .redirect(reqwest::redirect::Policy::none())
        .build()
        .expect("Failed to build HTTP client");

    let state = AppState {
        client,
        token_manager,
        oauth_provider,
        upstream_base_url: config.upstream_base_url,
    };

    // Build router
    let app = Router::new()
        .route("/health", get(proxy::health))
        .route("/api/tokens", post(proxy::issue_token))
        .fallback(proxy::proxy_handler)
        .with_state(state)
        .layer(TraceLayer::new_for_http());

    tracing::info!("Listening on {}", config.listen_addr);

    let listener = tokio::net::TcpListener::bind(config.listen_addr)
        .await
        .expect("Failed to bind to address");

    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal())
        .await
        .expect("Server error");
}

async fn shutdown_signal() {
    tokio::signal::ctrl_c()
        .await
        .expect("Failed to install CTRL+C signal handler");
    tracing::info!("Shutdown signal received");
}
