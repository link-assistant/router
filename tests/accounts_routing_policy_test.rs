//! Regression coverage for issue #724's model and runtime routing policies.

use axum::http::HeaderMap;
use link_assistant_router::accounts::*;
use link_assistant_router::subscription::SubscriptionProvider;
use std::time::Duration;

fn pool() -> (tempfile::TempDir, AccountRouter) {
    pool_with_options(AccountRouterOptions {
        strategy: SelectionStrategy::Priority,
        ..Default::default()
    })
}

fn pool_with_options(options: AccountRouterOptions) -> (tempfile::TempDir, AccountRouter) {
    let root = tempfile::tempdir().unwrap();
    let homes: Vec<_> = (0..2).map(|i| root.path().join(i.to_string())).collect();
    for home in &homes {
        std::fs::create_dir_all(home).unwrap();
        std::fs::write(home.join("credentials.json"), r#"{"accessToken":"test"}"#).unwrap();
    }
    let router = AccountRouter::new_for_provider(
        homes[0].clone(),
        &homes[1..],
        SubscriptionProvider::Claude,
        options,
    );
    (root, router)
}

fn observe(router: &AccountRouter, status: u16, body: &[u8]) {
    router.observe_upstream(&UpstreamObservation {
        account: "primary",
        model: Some("model-a"),
        status,
        headers: &HeaderMap::new(),
        body,
        retry_after: None,
    });
}

fn selected(router: &AccountRouter, model: &str) -> String {
    router
        .select_with_context(&RoutingContext {
            model: Some(model.into()),
            ..Default::default()
        })
        .unwrap()
        .name
}

#[test]
fn ordinary_quota_preserves_sibling_models() {
    let (_root, router) = pool();
    observe(
        &router,
        429,
        br#"{"error":{"type":"rate_limit_error","message":"Too many requests"}}"#,
    );
    assert_eq!(selected(&router, "model-a"), "account-1");
    assert_eq!(selected(&router, "model-b"), "primary");
}

#[test]
fn terminal_quota_overrides_a_model_mention() {
    let (_root, router) = pool();
    observe(
        &router,
        429,
        br#"{"error":{"type":"insufficient_quota","message":"model-a account quota exhausted"}}"#,
    );
    assert_eq!(selected(&router, "model-b"), "account-1");
}

#[test]
fn authentication_failure_cools_every_model() {
    let (_root, router) = pool();
    observe(
        &router,
        401,
        br#"{"error":{"type":"authentication_error"}}"#,
    );
    assert_eq!(selected(&router, "model-b"), "account-1");
}

#[test]
fn strategy_changes_only_new_sessions() {
    let (_root, router) = pool();
    assert_eq!(
        router
            .select_with_context(&RoutingContext::for_session("old"))
            .unwrap()
            .name,
        "primary"
    );
    assert_eq!(
        router.set_strategy(SelectionStrategy::LeastUsed),
        SelectionStrategy::Priority
    );
    assert_eq!(
        router
            .select_with_context(&RoutingContext::for_session("new"))
            .unwrap()
            .name,
        "account-1"
    );
    assert_eq!(
        router
            .select_with_context(&RoutingContext::for_session("old"))
            .unwrap()
            .name,
        "primary"
    );
}

#[test]
fn child_inherits_parent_account_even_after_strategy_switch() {
    let (_root, router) = pool();
    router
        .select_with_context(&RoutingContext::for_session("parent"))
        .unwrap();
    router.set_strategy(SelectionStrategy::LeastUsed);
    let child = RoutingContext {
        session_key: Some("child".into()),
        parent_session_key: Some("parent".into()),
        ..Default::default()
    };
    assert_eq!(router.select_with_context(&child).unwrap().name, "primary");
    assert_eq!(
        router
            .session_account(&RoutingContext::for_session("child"))
            .as_deref(),
        Some("primary")
    );
    let pin = RoutingContext {
        pinned_account: Some("account-1".into()),
        ..child
    };
    assert_eq!(router.select_with_context(&pin).unwrap().name, "account-1");
}

#[test]
fn resets_keep_pauses_and_other_model_entries() {
    let (_root, router) = pool();
    observe(&router, 429, b"model-a rate limit");
    router.observe_upstream(&UpstreamObservation {
        account: "primary",
        model: Some("model-b"),
        status: 429,
        headers: &axum::http::HeaderMap::new(),
        body: b"",
        retry_after: None,
    });
    router.pause("primary", None, "maintenance").unwrap();
    assert_eq!(
        router
            .reset_cooldowns(Some("primary"), Some("model-a"))
            .unwrap(),
        1
    );
    let state = &router.limit_states()[0].1;
    assert!(!state.model_cooldowns.contains_key("model-a"));
    assert!(state.model_cooldowns.contains_key("model-b"));
    assert!(state.pause.is_some());
    assert_eq!(router.reset_cooldowns(None, None).unwrap(), 1);
    assert!(router.limit_states()[0].1.pause.is_some());
    assert!(router.reset_cooldowns(Some("missing"), None).is_err());
}

#[test]
fn cooldown_expires_on_the_injected_clock() {
    let (_root, router) = pool();
    let mut clock = link_assistant_router::operation_context::OperationContext::default();
    clock.now = Some(chrono::DateTime::from_timestamp(2_000_000_000, 0).unwrap());
    clock.scope(|| {
        observe(&router, 429, b"rate limit");
        assert_eq!(selected(&router, "model-a"), "account-1");
        assert_eq!(selected(&router, "model-b"), "primary");
    });
    clock.now = clock.now.map(|now| now + chrono::Duration::seconds(61));
    clock.scope(|| assert_eq!(selected(&router, "model-a"), "primary"));
}

proptest::proptest! {
    #[test]
    fn untrusted_cooldowns_never_exceed_the_maximum(hint in proptest::num::u64::ANY, terminal in proptest::bool::ANY, vendor_reset in proptest::bool::ANY, maximum in 1_u64..3600) {
        let (_root, router) = pool_with_options(AccountRouterOptions { max_cooldown: Duration::from_secs(maximum), ..Default::default() });
        let mut clock = link_assistant_router::operation_context::OperationContext::default();
        clock.now = Some(chrono::DateTime::from_timestamp(2_000_000_000, 0).unwrap());
        clock.scope(|| {
            let mut headers = HeaderMap::new();
            if vendor_reset {
                headers.insert("anthropic-ratelimit-unified-5h-status", "rejected".parse().unwrap());
                headers.insert("anthropic-ratelimit-unified-5h-reset", hint.to_string().parse().unwrap());
            }
            router.observe_upstream(&UpstreamObservation {
                account: "primary", model: Some("model-a"), status: 429,
                headers: &headers,
                body: if terminal { br#"{"error":{"type":"insufficient_quota"}}"# } else { b"rate limit" },
                retry_after: Some(Duration::from_secs(hint)),
            });
            let state = &router.limit_states()[0].1;
            let until = state.cooldown_until_unix.or_else(|| state.model_cooldowns.get("model-a").copied()).unwrap();
            assert!(until - 2_000_000_000 <= maximum);
        });
        clock.now = clock.now.map(|now| now + chrono::Duration::seconds(i64::try_from(maximum + 1).unwrap()));
        clock.scope(|| assert_eq!(selected(&router, "model-a"), "primary"));
    }
}

#[test]
fn retry_configuration_preserves_defaults_and_bounds_untrusted_environment() {
    use link_assistant_router::pool_failover::PoolPolicy;
    let mut context = link_assistant_router::operation_context::OperationContext::default();
    context.environment.clear();
    context.scope(|| {
        let policy = PoolPolicy::from_env();
        assert_eq!(policy.retry.rounds, 0);
        assert_eq!(policy.retry.max_credentials, 0);
        assert!(policy.session_affinity_subagents);
    });
    context.set_env("POOL_RETRY_ROUNDS", "999");
    context.set_env("POOL_MAX_RETRY_CREDENTIALS", "2");
    context.set_env("POOL_MAX_RETRY_INTERVAL_SECS", "7");
    context.set_env("ACCOUNT_MAX_COOLDOWN_SECS", u64::MAX.to_string());
    context.set_env("SESSION_AFFINITY_SUBAGENTS", "false");
    context.scope(|| {
        let policy = PoolPolicy::from_env();
        assert_eq!(policy.retry.rounds, 16);
        assert_eq!(policy.retry.max_credentials, 2);
        assert_eq!(policy.retry.max_interval, Duration::from_secs(7));
        assert_eq!(
            policy.max_cooldown,
            link_assistant_router::account_limits::MAX_VENDOR_COOLDOWN
        );
        assert!(!policy.session_affinity_subagents);
    });
}

#[test]
fn cli_exposes_retry_bounds_and_subagent_switch() {
    use clap::Parser;
    use link_assistant_router::cli::Cli;
    let cli = Cli::try_parse_from([
        "router",
        "--pool-retry-rounds",
        "2",
        "--pool-max-retry-credentials",
        "1",
        "--pool-max-retry-interval-secs",
        "7",
        "--account-max-cooldown-secs",
        "120",
        "--session-affinity-subagents=false",
    ])
    .unwrap();
    let policy = cli.pool.policy();
    assert_eq!(policy.retry.rounds, 2);
    assert_eq!(policy.retry.max_credentials, 1);
    assert_eq!(policy.retry.max_interval, Duration::from_secs(7));
    assert_eq!(policy.max_cooldown, Duration::from_secs(120));
    assert!(!policy.session_affinity_subagents);
    assert!(Cli::try_parse_from(["router", "--pool-retry-rounds", "17"]).is_err());
}

#[test]
fn subagent_inheritance_can_be_disabled() {
    let (_root, router) = pool_with_options(AccountRouterOptions {
        session_affinity_subagents: false,
        ..Default::default()
    });
    assert_eq!(
        router
            .select_with_context(&RoutingContext::for_session("parent"))
            .unwrap()
            .name,
        "primary"
    );
    let child = RoutingContext {
        session_key: Some("child".into()),
        parent_session_key: Some("parent".into()),
        ..Default::default()
    };
    assert_eq!(
        router.select_with_context(&child).unwrap().name,
        "account-1"
    );
}
