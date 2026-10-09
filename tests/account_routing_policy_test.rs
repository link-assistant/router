//! Reproductions for issue #723: optional policies must affect real account selection.
use link_assistant_router::accounts::{
    AccountRouter, AccountRouterOptions, RoutingContext, SelectionStrategy,
};
use link_assistant_router::subscription::SubscriptionProvider;
use std::time::Duration;

#[tokio::test]
async fn cli_policy_replacement_and_read_share_structured_contract() {
    use link_assistant_router::{operation_context::OperationContext, operations};
    let home = credential();
    let policy_file = home.path().join("input-policy.json");
    std::fs::write(&policy_file, r#"{"weight":3}"#).unwrap();
    let mut context = OperationContext::isolated(home.path());
    context.set_env("TOKEN_SECRET", "policy-operation-secret");
    context.set_env("STORAGE_POLICY", "text");
    context.set_env("CLAUDE_CODE_HOME", home.path().as_os_str());
    for file in [Some(policy_file), None] {
        let mut args = vec![
            "router".into(),
            "accounts".into(),
            "policy".into(),
            "primary".into(),
        ];
        if let Some(file) = file {
            args.push("--file".into());
            args.push(file.into_os_string());
        }
        let cli = context
            .scope(|| link_assistant_router::cli::try_parse_arguments(args))
            .unwrap();
        let result = operations::execute(context.clone(), cli).await.unwrap();
        assert!(result.success, "{result:?}");
        assert_eq!(result.data["weight"], 3);
        link_assistant_router::contracts::validation::operation(
            "accounts.policy",
            &serde_json::to_value(&result).unwrap(),
        )
        .unwrap();
    }
    assert_eq!(AccountRoutingPolicy::load(home.path()).unwrap().weight, 3);
}

fn credential() -> tempfile::TempDir {
    let dir = tempfile::tempdir().unwrap();
    std::fs::write(
        dir.path().join("credentials.json"),
        r#"{"accessToken":"test-access"}"#,
    )
    .unwrap();
    dir
}

#[test]
fn weighted_strategy_is_configurable() {
    assert!(SelectionStrategy::from_str_opt("weighted-round-robin").is_some());
}

#[test]
fn persisted_prefix_limits_selection_to_its_account() {
    let a = credential();
    let b = credential();
    std::fs::write(
        a.path().join("routing-policy.json"),
        r#"{"prefix":"first"}"#,
    )
    .unwrap();
    std::fs::write(
        b.path().join("routing-policy.json"),
        r#"{"prefix":"second"}"#,
    )
    .unwrap();
    let router = AccountRouter::new_for_provider(
        a.path().into(),
        &[b.path().into()],
        SubscriptionProvider::Claude,
        AccountRouterOptions::default(),
    );
    let context = RoutingContext {
        model: Some("second/model".into()),
        ..RoutingContext::default()
    };
    for _ in 0..4 {
        assert_eq!(
            router.select_with_context(&context).unwrap().name,
            "account-1"
        );
    }
}

#[test]
fn disabling_cooling_keeps_account_available_after_failure() {
    let a = credential();
    std::fs::write(
        a.path().join("routing-policy.json"),
        r#"{"disable_cooling":true}"#,
    )
    .unwrap();
    let router = AccountRouter::new(
        a.path().into(),
        &[],
        SelectionStrategy::RoundRobin,
        Duration::from_secs(60),
    );
    router.report_failure("primary", "quota exceeded");
    assert!(router.select().is_ok());
}

use link_assistant_router::account_routing_policy::{
    AccountRoutingPolicy, ErrorAction, ModelAlias, RequestScopedError, wildcard_match,
};

#[test]
fn smooth_weighted_distribution_and_zero_weight_over_a_thousand_draws() {
    let homes = [credential(), credential(), credential()];
    for (home, weight) in homes.iter().zip([1, 3, 0]) {
        AccountRoutingPolicy {
            weight,
            ..Default::default()
        }
        .save(home.path())
        .unwrap();
    }
    let router = AccountRouter::new_for_provider(
        homes[0].path().into(),
        &[homes[1].path().into(), homes[2].path().into()],
        SubscriptionProvider::Claude,
        AccountRouterOptions {
            strategy: SelectionStrategy::WeightedRoundRobin,
            ..Default::default()
        },
    );
    let mut counts = [0_usize; 3];
    for _ in 0..1000 {
        let index = match router.select().unwrap().name.as_str() {
            "primary" => 0,
            "account-1" => 1,
            "account-2" => 2,
            name => panic!("unexpected {name}"),
        };
        counts[index] += 1;
    }
    assert_eq!(counts, [250, 750, 0]);
    router
        .set_routing_policy(
            "account-1",
            AccountRoutingPolicy {
                weight: -1,
                ..Default::default()
            },
        )
        .unwrap();
    assert_eq!(router.select().unwrap().name, "primary");
    assert_eq!(
        AccountRoutingPolicy::load(homes[1].path()).unwrap().weight,
        -1
    );
}

#[test]
fn weights_do_not_disable_accounts_in_other_strategies() {
    let home = credential();
    AccountRoutingPolicy {
        weight: 0,
        ..Default::default()
    }
    .save(home.path())
    .unwrap();
    let router = AccountRouter::new(
        home.path().into(),
        &[],
        SelectionStrategy::Priority,
        Duration::from_secs(1),
    );
    assert!(router.select().is_ok());
}

#[test]
fn aliases_prefixes_forks_and_exclusions_resolve_consistently() {
    let mut policy = AccountRoutingPolicy {
        prefix: Some("team".into()),
        model_aliases: vec![ModelAlias {
            model: "native".into(),
            alias: "friendly".into(),
            fork: false,
        }],
        ..Default::default()
    };
    assert_eq!(
        policy.visible_models("native", false),
        ["friendly", "team/friendly"]
    );
    assert_eq!(
        policy.resolve_model("team/friendly", true).as_deref(),
        Some("native")
    );
    assert_eq!(policy.resolve_model("friendly", true), None);
    assert_eq!(policy.resolve_model("native", false), None);
    assert_eq!(policy.visible_models("absent", true), ["team/absent"]);
    policy.model_aliases[0].fork = true;
    assert_eq!(
        policy.visible_models("native", true),
        ["team/friendly", "team/native"]
    );
    policy.model_aliases.push(ModelAlias {
        model: "native".into(),
        alias: "another".into(),
        fork: false,
    });
    assert_eq!(
        policy.resolve_model("native", false).as_deref(),
        Some("native")
    );
    assert!(
        policy
            .visible_models("native", true)
            .contains(&"team/native".into())
    );
    policy.excluded_models = vec!["nat*".into()];
    assert_eq!(policy.resolve_model("friendly", false), None);
    assert!(policy.visible_models("native", false).is_empty());
}

#[test]
fn header_copy_rejects_credentials_case_insensitively_and_preserves_vendor_auth() {
    for source in [
        "Authorization",
        "Cookie",
        "X-Api-Key",
        "X-Goog-Api-Key",
        "Proxy-Authorization",
    ] {
        let policy = AccountRoutingPolicy {
            headers: [("x-copy".into(), format!("${source}"))].into(),
            ..Default::default()
        };
        assert!(policy.validate().is_err(), "accepted {source}");
        let incoming =
            std::iter::once((source.parse().unwrap(), "client-secret".parse().unwrap())).collect();
        let mut outgoing = axum::http::HeaderMap::new();
        policy.apply_headers(&incoming, &mut outgoing);
        assert!(outgoing.is_empty());
    }
    let policy = AccountRoutingPolicy {
        headers: [
            ("x-copy".into(), "$X-Request-Id".into()),
            ("x-static".into(), "operator".into()),
            ("x-missing".into(), "$Traceparent".into()),
        ]
        .into(),
        ..Default::default()
    };
    policy.validate().unwrap();
    let incoming = std::iter::once((
        "x-request-id".parse().unwrap(),
        "request-123".parse().unwrap(),
    ))
    .collect();
    let mut outgoing = axum::http::HeaderMap::new();
    outgoing.insert("authorization", "Bearer vendor-token".parse().unwrap());
    policy.apply_headers(&incoming, &mut outgoing);
    assert_eq!(outgoing["x-copy"], "request-123");
    assert_eq!(outgoing["x-static"], "operator");
    assert_eq!(outgoing["authorization"], "Bearer vendor-token");
    assert!(!outgoing.contains_key("x-missing"));
}

#[test]
fn error_rules_require_status_and_literal_match_in_declaration_order() {
    let policy = AccountRoutingPolicy {
        request_scoped_errors: vec![
            RequestScopedError {
                status: 429,
                body_match: "quota".into(),
                action: ErrorAction::RetryNext,
            },
            RequestScopedError {
                status: 429,
                body_match: String::new(),
                action: ErrorAction::Relay,
            },
        ],
        ..Default::default()
    };
    assert_eq!(
        policy.error_action(429, b"workspace quota reached"),
        Some(ErrorAction::RetryNext)
    );
    assert_eq!(
        policy.error_action(429, b"other cause"),
        Some(ErrorAction::Relay)
    );
    assert_eq!(policy.error_action(500, b"quota"), None);
    assert!(wildcard_match("claude-*-?", "claude-live-x"));
    assert!(!wildcard_match("claude-*-?", "claude-live-xy"));
}

#[test]
fn malformed_policy_fails_closed_and_can_be_repaired() {
    let home = credential();
    std::fs::write(
        home.path().join("routing-policy.json"),
        r#"{"headers":{"x-leak":"$Cookie"}}"#,
    )
    .unwrap();
    let router = AccountRouter::new(
        home.path().into(),
        &[],
        SelectionStrategy::Priority,
        Duration::from_secs(1),
    );
    assert!(router.routing_policy("primary").is_err());
    assert!(router.select().is_err());
    router
        .set_routing_policy("primary", AccountRoutingPolicy::default())
        .unwrap();
    assert!(router.select().is_ok());
    assert!(
        router
            .set_routing_policy(
                "primary",
                AccountRoutingPolicy {
                    weight: 1_000_001,
                    ..Default::default()
                }
            )
            .is_err()
    );
    assert!(router.select().is_ok());
}

#[test]
fn forced_prefix_excludes_prefixed_accounts_from_unprefixed_requests() {
    let homes = [credential(), credential()];
    AccountRoutingPolicy {
        prefix: Some("team".into()),
        ..Default::default()
    }
    .save(homes[0].path())
    .unwrap();
    let mut operation =
        link_assistant_router::operation_context::OperationContext::isolated(homes[0].path());
    operation
        .environment
        .insert("ACCOUNT_FORCE_MODEL_PREFIX".into(), "true".into());
    let router = operation.scope(|| {
        AccountRouter::new_for_provider(
            homes[0].path().into(),
            &[homes[1].path().into()],
            SubscriptionProvider::Claude,
            AccountRouterOptions::default(),
        )
    });
    assert!(router.force_model_prefix());
    let context = RoutingContext {
        model: Some("native".into()),
        ..Default::default()
    };
    assert_eq!(
        router.select_with_context(&context).unwrap().name,
        "account-1"
    );
    let context = RoutingContext {
        model: Some("team/native".into()),
        ..Default::default()
    };
    assert_eq!(
        router.select_with_context(&context).unwrap().name,
        "primary"
    );
    assert!(
        router
            .set_routing_policy(
                "account-1",
                AccountRoutingPolicy {
                    prefix: Some("team".into()),
                    ..Default::default()
                }
            )
            .is_err()
    );
    assert_eq!(router.routing_policy("account-1").unwrap().prefix, None);
}
