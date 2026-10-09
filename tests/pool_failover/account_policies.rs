//! Issue #724 must retain its limits when per-account policy dispatch is active.
use super::*;
use link_assistant_router::account_routing_policy::AccountRoutingPolicy;

fn options() -> Options {
    Options {
        codex: true,
        routing_policy: Some(AccountRoutingPolicy {
            headers: [("x-fixture".into(), "policy".into())].into(),
            ..Default::default()
        }),
        ..Default::default()
    }
}

fn turn(model: &str) -> Value {
    json!({"model":model,"stream":true,"store":false,"input":"hello"})
}

#[tokio::test]
async fn policy_dispatch_respects_the_global_credential_cap() {
    let pool = Pool::start(Options {
        retry: link_assistant_router::pool_retry::RetryPolicy {
            max_credentials: 1,
            ..Default::default()
        },
        ..options()
    })
    .await;
    pool.vendor.script("primary", [Reply::status(503)]);
    assert_eq!(
        pool.send_codex(&turn("gpt-5")).await.0,
        StatusCode::SERVICE_UNAVAILABLE
    );
    assert_eq!(pool.vendor.accounts_seen(), ["primary"]);
}

#[tokio::test]
async fn policy_dispatch_retries_an_additional_round() {
    let pool = Pool::start(Options {
        retry: link_assistant_router::pool_retry::RetryPolicy {
            rounds: 1,
            max_credentials: 1,
            ..Default::default()
        },
        ..options()
    })
    .await;
    pool.vendor
        .script("primary", [Reply::status(503), Reply::Ok]);
    assert_eq!(pool.send_codex(&turn("gpt-5")).await.0, StatusCode::OK);
    assert_eq!(pool.vendor.accounts_seen(), ["primary", "primary"]);
}

#[tokio::test]
async fn a_same_account_retry_round_keeps_encrypted_history_and_thinking() {
    let pool = Pool::start(Options {
        retry: link_assistant_router::pool_retry::RetryPolicy {
            rounds: 1,
            max_credentials: 1,
            ..Default::default()
        },
        ..options()
    })
    .await;
    pool.vendor
        .script("primary", [Reply::status(503), Reply::Ok]);
    let request = json!({"model":"gpt-5(high)","stream":true,"store":false,
        "input":[{"type":"reasoning","id":"rs_1","summary":[],"encrypted_content":"sealed-by-primary"},
                 {"role":"user","content":"hello"}]});
    let (status, output) = pool.send_codex(&request).await;
    assert_eq!(status, StatusCode::OK, "{output}");
    assert_eq!(pool.vendor.accounts_seen(), ["primary", "primary"]);
    let seen = pool.vendor.seen();
    for (_, _, body) in &seen {
        assert_eq!(body["reasoning"]["effort"], "high");
        assert_eq!(
            body["input"][0]["encrypted_content"], "sealed-by-primary",
            "{body}"
        );
    }
    assert_eq!(seen[0].2, seen[1].2);
}

#[tokio::test]
async fn policy_dispatch_detects_empty_and_disconnected_streams_before_output() {
    for reset in [false, true] {
        let pool = Pool::start(options()).await;
        pool.vendor.script(
            "primary",
            [Reply::Recorded {
                status: 200,
                body: String::new(),
                reset,
            }],
        );
        let (status, output) = pool.send_codex(&turn("gpt-5")).await;
        assert_eq!(status, StatusCode::OK, "{output}");
        assert!(output.contains("response.completed"), "{output}");
        assert_eq!(pool.vendor.accounts_seen(), ["primary", "account-1"]);
    }
}

#[tokio::test]
async fn policy_dispatch_reads_terminal_quota_without_a_custom_body_rule() {
    let pool = Pool::start(options()).await;
    pool.vendor.script(
        "primary",
        [Reply::Recorded {
            status: 429,
            body: r#"{"error":{"code":"insufficient_quota"}}"#.into(),
            reset: false,
        }],
    );
    assert_eq!(pool.send_codex(&turn("gpt-5")).await.0, StatusCode::OK);
    assert_eq!(pool.send_codex(&turn("gpt-5-mini")).await.0, StatusCode::OK);
    assert_eq!(
        pool.vendor.accounts_seen(),
        ["primary", "account-1", "account-1"]
    );
}

#[tokio::test]
async fn policy_dispatch_waits_for_an_already_cooling_pool() {
    let pool = Pool::start(Options {
        cooldown: Duration::from_secs(1),
        retry: link_assistant_router::pool_retry::RetryPolicy {
            rounds: 1,
            max_interval: Duration::from_secs(2),
            ..Default::default()
        },
        ..options()
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
    let (status, output) =
        tokio::time::timeout(Duration::from_secs(5), pool.send_codex(&turn("gpt-5")))
            .await
            .unwrap();
    assert_eq!(status, StatusCode::OK, "{output}");
    assert_eq!(pool.vendor.accounts_seen(), ["primary"]);
}

#[tokio::test]
async fn explicit_account_retry_limit_bounds_additional_global_rounds() {
    let mut opts = options();
    opts.routing_policy.as_mut().unwrap().request_retry = Some(1);
    opts.retry.rounds = 3;
    opts.retry.max_credentials = 1;
    let pool = Pool::start(opts).await;
    pool.vendor.always("primary", Reply::status(503));
    assert_eq!(
        pool.send_codex(&turn("gpt-5")).await.0,
        StatusCode::SERVICE_UNAVAILABLE
    );
    assert_eq!(pool.vendor.accounts_seen(), ["primary", "primary"]);
}

#[tokio::test]
async fn an_initial_policy_cooldown_wait_consumes_the_retry_round() {
    let pool = Pool::start(Options {
        cooldown: Duration::from_secs(1),
        retry: link_assistant_router::pool_retry::RetryPolicy {
            rounds: 1,
            max_credentials: 1,
            max_interval: Duration::from_secs(2),
        },
        ..options()
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
    pool.vendor.always("primary", Reply::status(503));
    let (status, output) =
        tokio::time::timeout(Duration::from_secs(5), pool.send_codex(&turn("gpt-5")))
            .await
            .unwrap();
    assert_eq!(status, StatusCode::SERVICE_UNAVAILABLE, "{output}");
    assert_eq!(pool.vendor.accounts_seen(), ["primary"]);
}

#[tokio::test]
async fn a_relay_rule_suppresses_stream_cooling_and_pre_output_retries() {
    use link_assistant_router::account_routing_policy::{ErrorAction, RequestScopedError};
    let mut opts = options();
    opts.routing_policy.as_mut().unwrap().request_scoped_errors = vec![RequestScopedError {
        status: 200,
        body_match: String::new(),
        action: ErrorAction::Relay,
    }];
    let pool = Pool::start(opts).await;
    let quota = include_str!("../fixtures/vendor/openai_responses/terminal-quota.sse");
    pool.vendor.script(
        "primary",
        [
            Reply::Recorded {
                status: 200,
                body: quota.into(),
                reset: false,
            },
            Reply::Recorded {
                status: 200,
                body: String::new(),
                reset: false,
            },
        ],
    );
    assert_eq!(pool.send_codex(&turn("gpt-5")).await.1, quota);
    let (status, output) = pool.send_codex(&turn("gpt-5-mini")).await;
    assert_eq!(status, StatusCode::OK, "{output}");
    assert!(output.contains("upstream_incomplete"), "{output}");
    assert_eq!(pool.vendor.accounts_seen(), ["primary", "primary"]);
    let health = pool.health("primary");
    assert!(health.limits.cooldown_until_unix.is_none());
    assert!(health.limits.model_cooldowns.is_empty());
}
