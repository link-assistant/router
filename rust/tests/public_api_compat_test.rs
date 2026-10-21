//! Patch-release compatibility checks for native-login configuration APIs.

use std::path::PathBuf;
use std::time::Duration;

use link_assistant_router::auth::CodexAuthConfig;
use link_assistant_router::claude_auth::{ClaudeAuthConfig, ClaudeAuthMode};
use link_assistant_router::login::LoginConfig;
use link_assistant_router::model_routing::ProviderHealth;
use link_assistant_router::subscription::SubscriptionProvider;

#[test]
fn pre_task_five_native_auth_config_literals_and_constructors_still_compile() {
    let codex_home = PathBuf::from("/tmp/codex");
    let codex = CodexAuthConfig {
        issuer: "https://auth.openai.com".into(),
        client_id: "public-client".into(),
        port: 1455,
        codex_home: codex_home.clone(),
        timeout: Duration::from_secs(60),
        bind_host: "127.0.0.1".into(),
    };
    let codex_production =
        CodexAuthConfig::production(codex_home.clone(), 1455, Duration::from_secs(60));

    let claude_home = PathBuf::from("/tmp/claude");
    let claude = ClaudeAuthConfig {
        authorize_url: "https://claude.test/authorize".into(),
        token_url: "https://claude.test/token".into(),
        client_id: "public-client".into(),
        redirect_uri: "https://claude.test/callback".into(),
        claude_home: claude_home.clone(),
        scopes: "user:inference".into(),
    };
    let claude_production = ClaudeAuthConfig::production(claude_home.clone());
    let claude_mode = ClaudeAuthConfig::for_mode(claude_home.clone(), ClaudeAuthMode::SetupToken);

    let login = LoginConfig {
        enabled: true,
        command: "claude".into(),
        args: Vec::new(),
        package_cache: None,
        claude_code_home: claude_home,
        codex_home,
        codex_issuer: "https://auth.openai.com".into(),
        codex_callback_port: 1455,
        session_ttl: Duration::from_secs(900),
        max_sessions: 4,
        idle_settle: Duration::from_millis(750),
        url_timeout: Duration::from_secs(60),
        code_timeout: Duration::from_secs(120),
    };

    assert_eq!(codex.codex_home, codex_production.codex_home);
    assert_eq!(claude.claude_home, claude_production.claude_home);
    assert_eq!(claude_mode.scopes, ClaudeAuthMode::SetupToken.scopes());
    assert!(login.enabled);
}

#[test]
fn pre_task_six_routing_and_diagnostic_apis_still_compile() {
    let register: for<'a> fn(
        &link_assistant_router::app_state::AppState,
        &link_assistant_router::app_state::VendorClis<'a>,
    ) = link_assistant_router::app_state::AppState::register_credential_recovery;
    let register_in: for<'a> fn(
        &link_assistant_router::app_state::AppState,
        &std::path::Path,
        &link_assistant_router::app_state::VendorClis<'a>,
    ) = link_assistant_router::app_state::AppState::register_credential_recovery_in;
    let pool_register: fn(
        &link_assistant_router::accounts::AccountRouter,
        &link_assistant_router::refresh::TokenCache,
    ) = link_assistant_router::accounts::AccountRouter::register_credential_stores;
    let pool_register_in: fn(
        &link_assistant_router::accounts::AccountRouter,
        &link_assistant_router::refresh::TokenCache,
        &std::path::Path,
    ) = link_assistant_router::accounts::AccountRouter::register_credential_stores_in;
    std::hint::black_box((register, register_in, pool_register, pool_register_in));

    let legacy_diagnostics = link_assistant_router::doctor::subscription_catalog_diagnostics(
        SubscriptionProvider::Claude,
        "/tmp/claude",
        "/tmp/user",
        None,
    );
    let durable_diagnostics = link_assistant_router::doctor::subscription_catalog_diagnostics_in(
        SubscriptionProvider::Claude,
        "/tmp/claude",
        "/tmp/user",
        std::path::Path::new("/tmp/router"),
    );
    drop((legacy_diagnostics, durable_diagnostics));

    let health = ProviderHealth {
        provider: SubscriptionProvider::Codex,
        healthy: true,
        reason: None,
        summary: None,
    };
    assert!(health.healthy);
}
