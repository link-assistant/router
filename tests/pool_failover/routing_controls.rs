use super::*;
use link_assistant_router::pool_retry::RetryPolicy;

#[tokio::test]
async fn extra_round_retries_after_the_credential_cap() {
    let pool = Pool::start(Options {
        codex: true,
        retry: RetryPolicy {
            rounds: 1,
            max_credentials: 1,
            ..Default::default()
        },
        ..Default::default()
    })
    .await;
    pool.vendor
        .script("primary", [Reply::status(500), Reply::Ok]);
    assert_eq!(
        pool.send_codex(&json!({"model":"gpt-5","stream":true,"store":false,"input":"hello"}))
            .await
            .0,
        StatusCode::OK
    );
    assert_eq!(pool.vendor.accounts_seen(), ["primary", "primary"]);
}

#[tokio::test]
async fn zero_rounds_stops_at_the_credential_cap() {
    let pool = Pool::start(Options {
        codex: true,
        retry: RetryPolicy {
            max_credentials: 1,
            ..Default::default()
        },
        ..Default::default()
    })
    .await;
    pool.vendor
        .script("primary", [Reply::status(500), Reply::Ok]);
    assert_eq!(
        pool.send_codex(&json!({"model":"gpt-5","stream":true,"store":false,"input":"hello"}))
            .await
            .0,
        StatusCode::INTERNAL_SERVER_ERROR
    );
    assert_eq!(pool.vendor.accounts_seen(), ["primary"]);
}

#[tokio::test]
async fn retry_interval_refuses_a_long_cooldown() {
    let pool = Pool::start(Options {
        codex: true,
        retry: RetryPolicy {
            rounds: 2,
            max_interval: Duration::ZERO,
            ..Default::default()
        },
        ..Default::default()
    })
    .await;
    for account in ACCOUNTS {
        pool.vendor.always(account, Reply::status(429));
    }
    assert_eq!(
        pool.send_codex(&json!({"model":"gpt-5","stream":true,"store":false,"input":"hello"}))
            .await
            .0,
        StatusCode::TOO_MANY_REQUESTS
    );
    assert_eq!(pool.vendor.accounts_seen().len(), 3);
}

#[tokio::test]
async fn retry_round_waits_for_model_recovery_within_the_interval() {
    let pool = Pool::start(Options {
        codex: true,
        cooldown: Duration::from_secs(1),
        retry: RetryPolicy {
            rounds: 1,
            max_interval: Duration::from_secs(2),
            ..Default::default()
        },
        ..Default::default()
    })
    .await;
    for account in ACCOUNTS {
        pool.vendor.script(account, [Reply::status(429), Reply::Ok]);
    }
    let result = tokio::time::timeout(
        Duration::from_secs(5),
        pool.send_codex(&json!({"model":"gpt-5","stream":true,"store":false,"input":"hello"})),
    )
    .await
    .unwrap();
    assert_eq!(result.0, StatusCode::OK, "{}", result.1);
    assert_eq!(pool.vendor.accounts_seen().len(), 4);
}

#[tokio::test]
async fn a_new_request_can_wait_for_an_already_cooling_pool() {
    let pool = Pool::start(Options {
        codex: true,
        cooldown: Duration::from_secs(1),
        retry: RetryPolicy {
            rounds: 1,
            max_interval: Duration::from_secs(2),
            ..Default::default()
        },
        ..Default::default()
    })
    .await;
    for account in ACCOUNTS {
        pool.router
            .observe_upstream(&link_assistant_router::accounts::UpstreamObservation {
                account,
                model: Some("gpt-5"),
                status: 429,
                headers: &axum::http::HeaderMap::new(),
                body: b"rate limit",
                retry_after: None,
            });
    }
    let result = tokio::time::timeout(
        Duration::from_secs(5),
        pool.send_codex(&json!({"model":"gpt-5","stream":true,"store":false,"input":"hello"})),
    )
    .await
    .unwrap();
    assert_eq!(result.0, StatusCode::OK, "{}", result.1);
    assert_eq!(pool.vendor.accounts_seen(), ["primary"]);
}

#[tokio::test]
async fn anthropic_uses_the_same_retry_round_bounds() {
    let pool = Pool::start(Options {
        retry: RetryPolicy {
            rounds: 2,
            max_credentials: 1,
            ..Default::default()
        },
        ..Default::default()
    })
    .await;
    pool.vendor.always("primary", Reply::status(500));
    assert_eq!(
        pool.send(None, &hello(false)).await.0,
        StatusCode::INTERNAL_SERVER_ERROR
    );
    assert_eq!(
        pool.vendor.accounts_seen(),
        ["primary", "primary", "primary"]
    );
}

#[tokio::test]
async fn extra_rounds_do_not_override_a_strict_account_pin() {
    let pool = Pool::start(Options {
        codex: true,
        retry: RetryPolicy {
            rounds: 2,
            max_credentials: 1,
            ..Default::default()
        },
        ..Default::default()
    })
    .await;
    let token = pool
        .state
        .token_manager
        .issue_with_id(&link_assistant_router::token::IssueRequest {
            ttl_hours: 1,
            label: "pinned client",
            client_kind: Some("codex"),
            principal_id: Some("primary"),
            account: Some("primary"),
            ..Default::default()
        })
        .unwrap()
        .0;
    pool.vendor.always("primary", Reply::status(500));
    let result = pool
        .client
        .post(format!("{}{CODEX_RESPONSES}", pool.url))
        .bearer_auth(token)
        .header("user-agent", "codex_exec/0.153.0")
        .header("originator", "codex_cli_rs")
        .header("x-codex-turn-metadata", "pinned-retry")
        .json(&json!({"model":"gpt-5","stream":true,"store":false,"input":"hello"}))
        .send()
        .await
        .unwrap();
    assert_eq!(result.status(), StatusCode::INTERNAL_SERVER_ERROR);
    assert_eq!(pool.vendor.accounts_seen(), ["primary"]);
}

#[tokio::test]
async fn management_switch_and_reset_are_authenticated_and_audited() {
    let pool = Pool::start(Options::default()).await;
    let path = format!("{}/api/management/routing", pool.url);
    let payload = json!({"strategy":"least-used"});
    assert_eq!(
        pool.client
            .patch(&path)
            .json(&payload)
            .send()
            .await
            .unwrap()
            .status(),
        StatusCode::UNAUTHORIZED
    );
    assert_eq!(
        pool.client
            .patch(&path)
            .bearer_auth(&pool.token)
            .json(&payload)
            .send()
            .await
            .unwrap()
            .status(),
        StatusCode::UNAUTHORIZED
    );
    assert_eq!(
        pool.client
            .patch(&path)
            .bearer_auth(ADMIN_KEY)
            .json(&json!({"strategy":"unknown"}))
            .send()
            .await
            .unwrap()
            .status(),
        StatusCode::BAD_REQUEST
    );
    let response = pool
        .client
        .patch(&path)
        .bearer_auth(ADMIN_KEY)
        .json(&payload)
        .send()
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    assert_eq!(pool.router.strategy(), SelectionStrategy::LeastUsed);
    pool.router.report_failure("primary", "test cooldown");
    let reset = format!("{path}/cooldown/reset");
    assert_eq!(
        pool.client
            .post(&reset)
            .bearer_auth(ADMIN_KEY)
            .json(&json!({"model":"gpt-5"}))
            .send()
            .await
            .unwrap()
            .status(),
        StatusCode::BAD_REQUEST
    );
    assert_eq!(
        pool.client
            .post(&reset)
            .bearer_auth(ADMIN_KEY)
            .json(&json!({"account":"missing"}))
            .send()
            .await
            .unwrap()
            .status(),
        StatusCode::NOT_FOUND
    );
    let response = pool
        .client
        .post(&reset)
        .bearer_auth(ADMIN_KEY)
        .json(&json!({"account":"primary"}))
        .send()
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    assert!(pool.health("primary").healthy);
    let audit = std::fs::read_to_string(pool.data.path().join("audit.jsonl")).unwrap();
    let events: Vec<Value> = audit
        .lines()
        .map(|line| serde_json::from_str(line).unwrap())
        .collect();
    assert!(
        events
            .iter()
            .any(|event| event["phase"] == "routing_strategy_changed"
                && event["change"]["strategy"] == "least-used")
    );
    assert!(
        events
            .iter()
            .any(|event| event["phase"] == "routing_cooldown_reset"
                && event["change"]["cleared"] == 1)
    );
    assert!(!audit.contains(ADMIN_KEY));
}
