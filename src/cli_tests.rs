use super::*;
use crate::config::{
    default_gonka_model, default_gonka_source_url, default_openai_compatible_base_url,
};
use clap::CommandFactory as _;

#[test]
fn login_cli_defaults_to_bare_tui() {
    let cli = Cli::try_parse_from(["link-assistant-router"]).unwrap();
    assert!(cli.login_cli_args.is_empty());
    assert_eq!(cli.upstream_provider, "auto");
}

#[test]
fn usage_cli_accepts_public_provider_names_and_json() {
    for (name, expected) in [
        (
            "anthropic",
            crate::subscription_usage::UsageProvider::Anthropic,
        ),
        ("openai", crate::subscription_usage::UsageProvider::OpenAi),
        ("z-ai", crate::subscription_usage::UsageProvider::ZAi),
        ("lefine", crate::subscription_usage::UsageProvider::Lefine),
    ] {
        let cli = Cli::try_parse_from(["router", "usage", name, "--json"]).unwrap();
        let Some(Command::Usage { provider, json, .. }) = cli.command else {
            panic!("expected usage command for {name}");
        };
        assert_eq!(provider, Some(expected));
        assert!(json);
    }
}

#[test]
fn every_declared_default_is_visible_in_its_long_help() {
    fn check(command: &clap::Command, path: &str) {
        let help = command.clone().render_long_help().to_string();
        for argument in command.get_arguments() {
            if argument.get_default_values().is_empty() || argument.is_hide_default_value_set() {
                continue;
            }
            let rendered = argument
                .get_default_values()
                .iter()
                .map(|value| value.to_string_lossy())
                .collect::<Vec<_>>()
                .join(", ");
            if rendered.is_empty() {
                continue;
            }
            assert!(
                help.contains(&format!("[default: {rendered}]")),
                "{path} --{} must render its declared default {rendered:?}",
                argument.get_long().unwrap_or("<positional>")
            );
        }
        for subcommand in command.get_subcommands() {
            check(subcommand, &format!("{path} {}", subcommand.get_name()));
        }
    }

    check(&Cli::command(), "link-assistant-router");
}

#[test]
fn sensitive_environment_values_are_hidden_from_help() {
    fn check(command: &clap::Command) {
        for argument in command.get_arguments() {
            let Some(environment) = argument.get_env() else {
                continue;
            };
            let environment = environment.to_string_lossy().to_ascii_uppercase();
            if (["_TOKEN", "_SECRET", "_PRIVATE_KEY", "_API_KEY"]
                .iter()
                .any(|marker| environment.ends_with(marker))
                || environment.ends_with("_KEY") && !environment.contains("PUBLIC_KEY"))
                && !environment.ends_with("_ENV")
            {
                assert!(
                    argument.is_hide_env_values_set(),
                    "environment value {environment} must be hidden from help"
                );
            }
        }
        for subcommand in command.get_subcommands() {
            check(subcommand);
        }
    }

    check(&Cli::command());
}

#[test]
fn cli_defaults_round_trip_to_config() {
    let cli = Cli {
        command: None,
        home: None,
        host: "127.0.0.1".into(),
        port: 9090,
        verbose: false,
        token_secret: Some("k".into()),
        claude_code_home: Some("/tmp/c".into()),
        upstream_base_url: "https://api.anthropic.com".into(),
        api_format: None,
        routing_mode: "direct".into(),
        storage_policy: "memory".into(),
        data_dir: Some(std::path::PathBuf::from("/tmp/d")),
        claude_cli_bin: None,
        codex_cli_bin: None,
        upstream_provider: "anthropic".into(),
        gonka_private_key: None,
        gonka_source_url: default_gonka_source_url(),
        gonka_model: default_gonka_model(),
        bridge_model: None,
        bridge_model_policy: None,
        audit_log: None,
        request_log: None,
        request_log_max_bytes: crate::request_log::DEFAULT_MAX_BYTES,
        request_log_max_total_bytes: crate::request_log::DEFAULT_MAX_TOTAL_BYTES,
        max_proxy_request_bytes: crate::config::DEFAULT_MAX_PROXY_REQUEST_BYTES,
        crater_forgefed_inbox: None,
        crater_forgefed_actor: None,
        crater_forgefed_target: None,
        crater_poll_interval_ms: 1000,
        crater_poll_timeout_secs: 120,
        openai_compatible_provider_name: "litellm".into(),
        openai_compatible_base_url: default_openai_compatible_base_url(),
        openai_compatible_api_key: None,
        openai_compatible_api_key_env: None,
        openai_compatible_model: None,
        openai_compatible_models: vec![],
        openai_compatible_supported_clients: vec![],
        activitypub_actor_base_url: Some("https://router.example".into()),
        activitypub_public_key_pem: None,
        disable_openai_api: false,
        disable_anthropic_api: false,
        disable_metrics: false,
        inference_only: false,
        additional_account_dirs: vec![],
        account_routing_strategy: "round-robin".into(),
        account_cooldown_secs: 60,
        session_affinity_ttl_secs: 3600,
        account_request_limits: vec![],
        experimental_compatibility: false,
        subscription_bridge_overrides: vec![],
        admin_port: None,
        admin_host: "127.0.0.1".into(),
        admin_claim_ttl_secs: crate::admin::DEFAULT_CANDIDATE_TTL_SECS,
        admin_key: None,
        allow_anonymous_admin: false,
        telegram_bot_token: None,
        vk_bot_token: None,
        vk_group_id: None,
        chat_admin_secret_ttl_secs: crate::chat_admin::DEFAULT_SECRET_TTL_SECS,
        chat_admin_rate_limit_per_minute: crate::chat_admin::DEFAULT_RATE_LIMIT_PER_MINUTE,
        mpp_enable: false,
        mpp_amount: "0.00".into(),
        mpp_currency: "USD".into(),
        mpp_recipient: None,
        mpp_method: None,
        disable_login_api: false,
        login_cli_command: "claude".into(),
        login_cli_args: vec![],
        login_session_ttl_secs: 900,
        login_max_sessions: 4,
    };
    let cfg = cli.into_config().unwrap();
    assert_eq!(cfg.listen_addr.port(), 9090);
    assert_eq!(cfg.routing_mode, RoutingMode::Direct);
    assert_eq!(cfg.storage_policy, StoragePolicy::Memory);
    assert!(cfg.enable_openai_api);
    assert!(cfg.enable_anthropic_api);
    assert!(cfg.enable_metrics);
    assert_eq!(
        cfg.max_proxy_request_bytes,
        crate::config::DEFAULT_MAX_PROXY_REQUEST_BYTES
    );
}

#[test]
fn cli_invalid_routing_mode_rejected() {
    let cli = Cli {
        command: None,
        home: None,
        host: "0.0.0.0".into(),
        port: 8080,
        verbose: false,
        token_secret: Some("k".into()),
        claude_code_home: Some("/tmp/c".into()),
        upstream_base_url: "https://api.anthropic.com".into(),
        api_format: None,
        routing_mode: "bogus".into(),
        storage_policy: "memory".into(),
        data_dir: None,
        claude_cli_bin: None,
        codex_cli_bin: None,
        upstream_provider: "anthropic".into(),
        gonka_private_key: None,
        gonka_source_url: default_gonka_source_url(),
        gonka_model: default_gonka_model(),
        bridge_model: None,
        bridge_model_policy: None,
        audit_log: None,
        request_log: None,
        request_log_max_bytes: crate::request_log::DEFAULT_MAX_BYTES,
        request_log_max_total_bytes: crate::request_log::DEFAULT_MAX_TOTAL_BYTES,
        max_proxy_request_bytes: crate::config::DEFAULT_MAX_PROXY_REQUEST_BYTES,
        crater_forgefed_inbox: None,
        crater_forgefed_actor: None,
        crater_forgefed_target: None,
        crater_poll_interval_ms: 1000,
        crater_poll_timeout_secs: 120,
        openai_compatible_provider_name: "litellm".into(),
        openai_compatible_base_url: default_openai_compatible_base_url(),
        openai_compatible_api_key: None,
        openai_compatible_api_key_env: None,
        openai_compatible_model: None,
        openai_compatible_models: vec![],
        openai_compatible_supported_clients: vec![],
        activitypub_actor_base_url: None,
        activitypub_public_key_pem: None,
        disable_openai_api: false,
        disable_anthropic_api: false,
        disable_metrics: false,
        inference_only: false,
        additional_account_dirs: vec![],
        account_routing_strategy: "round-robin".into(),
        account_cooldown_secs: 60,
        session_affinity_ttl_secs: 3600,
        account_request_limits: vec![],
        experimental_compatibility: false,
        subscription_bridge_overrides: vec![],
        admin_port: None,
        admin_host: "127.0.0.1".into(),
        admin_claim_ttl_secs: crate::admin::DEFAULT_CANDIDATE_TTL_SECS,
        admin_key: None,
        allow_anonymous_admin: false,
        telegram_bot_token: None,
        vk_bot_token: None,
        vk_group_id: None,
        chat_admin_secret_ttl_secs: crate::chat_admin::DEFAULT_SECRET_TTL_SECS,
        chat_admin_rate_limit_per_minute: crate::chat_admin::DEFAULT_RATE_LIMIT_PER_MINUTE,
        mpp_enable: false,
        mpp_amount: "0.00".into(),
        mpp_currency: "USD".into(),
        mpp_recipient: None,
        mpp_method: None,
        disable_login_api: false,
        login_cli_command: "claude".into(),
        login_cli_args: vec![],
        login_session_ttl_secs: 900,
        login_max_sessions: 4,
    };
    let r = cli.into_config();
    assert!(matches!(r, Err(ConfigError::InvalidRoutingMode)));
}

/// The auth op a command line parses to, for the `auth gh` targeting tests.
fn auth_op_of(args: &[&str]) -> AuthOp {
    let cli = Cli::try_parse_from(args).expect("the command line must parse");
    match cli.command {
        Some(Command::Auth { op, .. }) => op,
        other => panic!("expected an auth command, got {other:?}"),
    }
}

/// `auth gh` takes the same target flags every other `auth` subcommand does.
///
/// It was the only one of the five that accepted none, so `--server` was
/// rejected outright and there was no way to say which deployment a GitHub
/// credential was meant for (issue #283).
#[test]
fn auth_gh_accepts_a_target_like_its_siblings() {
    let op = auth_op_of(&[
        "link-assistant-router",
        "auth",
        "gh",
        "--server",
        "http://router.example:8080",
        "--status",
    ]);

    let AuthOp::Gh { target, .. } = &op else {
        panic!("expected auth gh, got {op:?}");
    };
    assert_eq!(target.server.as_deref(), Some("http://router.example:8080"));
    assert!(!target.local);
}

/// Storing against a selected router refuses; only the read-only query answers.
///
/// A router reads its GitHub credential from its own data directory at startup
/// and exposes no endpoint that accepts one, so there is nothing to store
/// remotely. Acting locally under a success message left a workstation holding
/// a token it never needed while the targeted deployment had none — the failure
/// that costs an operator a leaked token, which a plain error does not.
#[test]
fn only_a_read_only_gh_query_answers_for_a_selected_router() {
    let describes = ["--status"];
    let refuses: [&[&str]; 3] = [
        &["--token-stdin"],
        &["--from-gh-config", "/tmp/gh"],
        &["--clear"],
    ];

    let op = auth_op_of(&[&["link-assistant-router", "auth", "gh"][..], &describes[..]].concat());
    assert_eq!(op.remote_gh(), Some(RemoteGh::DescribeLocal));

    for extra in refuses {
        let op = auth_op_of(&[&["link-assistant-router", "auth", "gh"][..], extra].concat());
        assert_eq!(
            op.remote_gh(),
            Some(RemoteGh::Refuse),
            "a credential must never be stored locally under another target: {extra:?}"
        );
    }
}

/// The rule is about `auth gh` alone; the other subcommands route remotely.
#[test]
fn only_gh_carries_the_remote_restriction() {
    for args in [
        &["link-assistant-router", "auth", "status"][..],
        &["link-assistant-router", "auth", "claude"][..],
        &["link-assistant-router", "auth", "codex"][..],
        &["link-assistant-router", "auth", "import", "claude"][..],
    ] {
        assert_eq!(
            auth_op_of(args).remote_gh(),
            None,
            "{args:?} must keep its ordinary remote path"
        );
    }
}

/// `auth import` acts locally only when asked to (issue #291).
///
/// `--server` parsed and was then discarded, so a selection, an explicit
/// `--server`, and `--local` all produced one behaviour — the flags claimed a
/// support that did not exist. Only `--local` and `--managed` may act here; a
/// bare invocation may still be remote, because a *persisted* selection counts
/// as naming a target and only resolution can tell.
#[test]
fn only_an_explicitly_local_import_skips_target_resolution() {
    let local: [&[&str]; 2] = [&["--local"], &["--managed"]];
    for extra in local {
        let op = auth_op_of(
            &[
                &["link-assistant-router", "auth", "import", "claude"][..],
                extra,
            ]
            .concat(),
        );
        assert_eq!(
            op.import_target(),
            Some(ImportTarget::Local),
            "{extra:?} asks for this machine explicitly"
        );
        assert!(!op.may_be_remote(), "{extra:?} must not resolve a server");
    }

    let remote: [&[&str]; 2] = [&[], &["--server", "http://router.example:8080"]];
    for extra in remote {
        let op = auth_op_of(
            &[
                &["link-assistant-router", "auth", "import", "claude"][..],
                extra,
            ]
            .concat(),
        );
        assert_eq!(
            op.import_target(),
            Some(ImportTarget::Remote),
            "{extra:?} may name another deployment"
        );
        assert!(
            op.may_be_remote(),
            "{extra:?} must resolve before importing"
        );
    }
}

/// `--all` follows the same rule: it is unqualified by construction.
#[test]
fn importing_everything_also_honours_the_target() {
    let op = auth_op_of(&["link-assistant-router", "auth", "import", "--all"]);
    assert!(op.may_be_remote());

    let op = auth_op_of(&[
        "link-assistant-router",
        "auth",
        "import",
        "--all",
        "--local",
    ]);
    assert!(!op.may_be_remote());
}

/// The per-provider spelling carries no target and stays local.
#[test]
fn the_per_provider_import_flags_carry_no_target() {
    let op = auth_op_of(&[
        "link-assistant-router",
        "auth",
        "claude",
        "--from-claude-home",
        "/tmp/src",
    ]);
    assert_eq!(op.import_target(), None);
    assert!(!op.may_be_remote());
}
