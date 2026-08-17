//! Unit tests for [`crate::config`].

use super::*;

fn build_default(secret: Option<&'static str>) -> Result<Config, ConfigError> {
    Config::build(default_args(secret))
}

fn default_args(secret: Option<&'static str>) -> BuildArgs<'static> {
    BuildArgs {
        host: "0.0.0.0",
        port: "8080",
        token_secret: secret,
        claude_code_home: "/tmp/claude",
        upstream_base_url: "https://api.anthropic.com",
        verbose: false,
        max_proxy_request_bytes: DEFAULT_MAX_PROXY_REQUEST_BYTES,
        api_format: None,
        routing_mode: RoutingMode::Direct,
        storage_policy: StoragePolicy::Memory,
        data_dir: PathBuf::from("/tmp/test-data"),
        claude_cli_bin: None,
        upstream_provider: UpstreamProvider::Auto,
        gonka_private_key: None,
        gonka_source_url: default_gonka_source_url(),
        gonka_model: default_gonka_model(),
        bridge_model: None,
        bridge_model_policy: None,
        audit_log: None,
        crater: default_crater_config("https://router.example"),
        openai_compatible: default_openai_compatible_config(),
        activitypub_actor_base_url: "https://router.example".into(),
        activitypub_public_key_pem: default_activitypub_public_key_pem(),
        enable_openai_api: true,
        enable_anthropic_api: true,
        enable_metrics: true,
        additional_account_dirs: vec![],
        account_routing_strategy: SelectionStrategy::default(),
        account_cooldown_secs: 60,
        session_affinity_ttl_secs: 3600,
        account_request_limits: vec![],
        experimental_compatibility: false,
        admin_key: None,
        allow_anonymous_admin: false,
        mpp: default_mpp_config(),
        login: crate::login::LoginConfig::default(),
        admin_ui: crate::admin::AdminUiConfig::default(),
        chat_admin: crate::chat_admin::ChatAdminConfig::default(),
    }
}

#[test]
fn test_config_missing_token_secret() {
    let result = build_default(None);
    assert!(result.is_err());
}

#[test]
fn test_config_empty_token_secret() {
    let result = build_default(Some(""));
    assert!(result.is_err());
}

#[test]
fn test_config_with_valid_values() {
    let config = build_default(Some("test-secret-key")).expect("Config should build");
    assert_eq!(config.listen_addr.port(), 8080);
    assert_eq!(config.token_secret, "test-secret-key");
    assert_eq!(config.claude_code_home, "/tmp/claude");
    assert_eq!(config.upstream_base_url, "https://api.anthropic.com");
    assert_eq!(config.upstream_provider, UpstreamProvider::Auto);
    assert!(!config.verbose);
    assert_eq!(config.routing_mode, RoutingMode::Direct);
}

#[test]
fn default_provider_routes_across_subscriptions() {
    let config = build_default(Some("secret")).expect("should build");
    assert_eq!(config.upstream_provider, UpstreamProvider::Auto);
}

#[test]
fn account_limits_must_align_with_the_configured_pool() {
    let mut args = gonka_args(None);
    args.upstream_provider = UpstreamProvider::Anthropic;
    args.additional_account_dirs = vec![PathBuf::from("/tmp/second")];
    args.account_request_limits = vec![100];

    assert!(matches!(
        Config::build(args),
        Err(ConfigError::MismatchedAccountRequestLimits)
    ));
}

#[test]
fn account_limit_parser_accepts_zero_as_unlimited() {
    assert_eq!(parse_usize_csv("100, 0,250").unwrap(), vec![100, 0, 250]);
    assert!(matches!(
        parse_usize_csv("100,nope"),
        Err(ConfigError::InvalidAccountRequestLimits)
    ));
}

#[test]
fn gonka_provider_requires_private_key() {
    let result = Config::build(gonka_args(None));
    assert!(matches!(result, Err(ConfigError::MissingGonkaPrivateKey)));
}

#[test]
fn gonka_provider_builds_with_private_key_and_defaults() {
    let config =
        Config::build(gonka_args(Some("gonka-private-key"))).expect("gonka config should build");
    assert_eq!(config.upstream_provider, UpstreamProvider::Gonka);
    assert_eq!(config.gonka_source_url, default_gonka_source_url());
    assert_eq!(config.gonka_model, default_gonka_model());
    assert_eq!(
        config.gonka_private_key.as_deref(),
        Some("gonka-private-key")
    );
}

#[test]
fn crater_provider_requires_forgefed_inbox() {
    let mut args = gonka_args(None);
    args.upstream_provider = UpstreamProvider::Crater;
    args.gonka_private_key = None;

    let result = Config::build(args);

    assert!(matches!(
        result,
        Err(ConfigError::MissingCraterForgeFedInbox)
    ));
}

#[test]
fn crater_provider_builds_with_forgefed_inbox() {
    let mut args = gonka_args(None);
    args.upstream_provider = UpstreamProvider::Crater;
    args.gonka_private_key = None;
    args.crater.inbox = Some("https://tracker.example/inbox".into());

    let config = Config::build(args).expect("crater config should build");

    assert_eq!(config.upstream_provider, UpstreamProvider::Crater);
    assert_eq!(
        config.crater.inbox.as_deref(),
        Some("https://tracker.example/inbox")
    );
}

fn gonka_args(private_key: Option<&str>) -> BuildArgs<'static> {
    BuildArgs {
        host: "0.0.0.0",
        port: "8080",
        token_secret: Some("secret"),
        claude_code_home: "/tmp/claude",
        upstream_base_url: "https://api.anthropic.com",
        verbose: false,
        max_proxy_request_bytes: DEFAULT_MAX_PROXY_REQUEST_BYTES,
        api_format: None,
        routing_mode: RoutingMode::Direct,
        storage_policy: StoragePolicy::Memory,
        data_dir: PathBuf::from("/tmp/test-data"),
        claude_cli_bin: None,
        upstream_provider: UpstreamProvider::Gonka,
        gonka_private_key: private_key.map(str::to_string),
        gonka_source_url: default_gonka_source_url(),
        gonka_model: default_gonka_model(),
        bridge_model: None,
        bridge_model_policy: None,
        audit_log: None,
        crater: default_crater_config("https://router.example"),
        openai_compatible: default_openai_compatible_config(),
        activitypub_actor_base_url: "https://router.example".into(),
        activitypub_public_key_pem: default_activitypub_public_key_pem(),
        enable_openai_api: true,
        enable_anthropic_api: true,
        enable_metrics: true,
        additional_account_dirs: vec![],
        account_routing_strategy: SelectionStrategy::default(),
        account_cooldown_secs: 60,
        session_affinity_ttl_secs: 3600,
        account_request_limits: vec![],
        experimental_compatibility: false,
        admin_key: None,
        allow_anonymous_admin: false,
        mpp: default_mpp_config(),
        login: crate::login::LoginConfig::default(),
        admin_ui: crate::admin::AdminUiConfig::default(),
        chat_admin: crate::chat_admin::ChatAdminConfig::default(),
    }
}

#[test]
fn test_config_invalid_port() {
    let mut args = default_args(Some("secret"));
    args.port = "not-a-number";
    assert!(Config::build(args).is_err());
}

#[test]
fn test_config_default_port() {
    let config = build_default(Some("secret")).expect("should build");
    assert_eq!(config.listen_addr.port(), 8080);
}

#[test]
fn test_api_format_parsing() {
    assert_eq!(
        ApiFormat::from_str_opt("anthropic"),
        Some(ApiFormat::Anthropic)
    );
    assert_eq!(
        ApiFormat::from_str_opt("messages"),
        Some(ApiFormat::Anthropic)
    );
    assert_eq!(ApiFormat::from_str_opt("bedrock"), Some(ApiFormat::Bedrock));
    assert_eq!(ApiFormat::from_str_opt("invoke"), Some(ApiFormat::Bedrock));
    assert_eq!(ApiFormat::from_str_opt("vertex"), Some(ApiFormat::Vertex));
    assert_eq!(
        ApiFormat::from_str_opt("rawpredict"),
        Some(ApiFormat::Vertex)
    );
    assert_eq!(
        ApiFormat::from_str_opt("ANTHROPIC"),
        Some(ApiFormat::Anthropic)
    );
    assert!(ApiFormat::from_str_opt("unknown").is_none());
}

#[test]
fn test_routing_mode_parsing() {
    assert_eq!(
        RoutingMode::from_str_opt("direct"),
        Some(RoutingMode::Direct)
    );
    assert_eq!(RoutingMode::from_str_opt("cli"), Some(RoutingMode::Cli));
    assert_eq!(
        RoutingMode::from_str_opt("hybrid"),
        Some(RoutingMode::Hybrid)
    );
    assert_eq!(RoutingMode::from_str_opt("auto"), Some(RoutingMode::Hybrid));
    assert_eq!(
        RoutingMode::from_str_opt("subprocess"),
        Some(RoutingMode::Cli)
    );
    assert!(RoutingMode::from_str_opt("nope").is_none());
}

#[test]
fn test_storage_policy_parsing() {
    assert_eq!(
        StoragePolicy::from_str_opt("memory"),
        Some(StoragePolicy::Memory)
    );
    assert_eq!(
        StoragePolicy::from_str_opt("text"),
        Some(StoragePolicy::Text)
    );
    assert_eq!(
        StoragePolicy::from_str_opt("binary"),
        Some(StoragePolicy::Binary)
    );
    assert_eq!(
        StoragePolicy::from_str_opt("both"),
        Some(StoragePolicy::Both)
    );
    assert!(StoragePolicy::from_str_opt("nope").is_none());
}

#[test]
fn test_verbose_default_false() {
    let config = build_default(Some("secret")).expect("should build");
    assert!(!config.verbose);
}
