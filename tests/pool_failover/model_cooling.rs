//! Cases adapted from `CLIProxyAPI`'s `codex_quota_failover_test.go` and
//! `codex_stream_disconnect_failover_test.go` (MIT); see the recorded fixtures.
use super::*;

fn options() -> Options {
    Options {
        codex: true,
        ..Default::default()
    }
}

fn turn(model: &str) -> Value {
    json!({"model": model, "stream": true, "store": false, "input": "hello"})
}

#[tokio::test]
async fn model_quota_preserves_the_sibling_on_the_same_account() {
    let pool = Pool::start(options()).await;
    pool.vendor.script("primary", [Reply::status(429)]);
    assert_eq!(pool.send_codex(&turn("gpt-5")).await.0, StatusCode::OK);
    assert_eq!(pool.send_codex(&turn("gpt-5-mini")).await.0, StatusCode::OK);
    assert_eq!(
        pool.vendor.accounts_seen(),
        ["primary", "account-1", "primary"]
    );
}

#[tokio::test]
async fn terminal_quota_after_stream_start_cools_all_models_without_replay() {
    let pool = Pool::start(options()).await;
    let body = include_str!("../fixtures/vendor/openai_responses/terminal-quota.sse");
    pool.vendor.script(
        "primary",
        [Reply::Recorded {
            status: 200,
            body: body.into(),
            reset: false,
        }],
    );
    let (status, output) = pool.send_codex(&turn("gpt-5")).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(output, body);
    assert_eq!(
        pool.vendor.accounts_seen(),
        ["primary"],
        "started streams never replay"
    );
    assert_eq!(pool.send_codex(&turn("gpt-5-mini")).await.0, StatusCode::OK);
    assert_eq!(pool.vendor.accounts_seen(), ["primary", "account-1"]);
}

#[tokio::test]
async fn empty_stream_after_headers_fails_over() {
    let pool = Pool::start(options()).await;
    pool.vendor.script(
        "primary",
        [Reply::Recorded {
            status: 200,
            body: String::new(),
            reset: false,
        }],
    );
    let (status, output) = pool.send_codex(&turn("gpt-5")).await;
    assert_eq!(status, StatusCode::OK);
    assert!(output.contains("response.completed"), "{output}");
    assert_eq!(pool.vendor.accounts_seen(), ["primary", "account-1"]);
}

#[tokio::test]
async fn empty_stream_exhaustion_is_an_upstream_error() {
    let pool = Pool::start(options()).await;
    for account in ACCOUNTS {
        pool.vendor.always(
            account,
            Reply::Recorded {
                status: 200,
                body: String::new(),
                reset: false,
            },
        );
    }
    let (status, output) = pool.send_codex(&turn("gpt-5")).await;
    assert_eq!(status, StatusCode::BAD_GATEWAY, "{output}");
    assert!(output.contains("api_error"), "{output}");
    assert!(!output.contains("invalid_request_error"));
    assert_eq!(pool.vendor.accounts_seen().len(), 3);
}

#[tokio::test]
async fn a_disconnect_after_output_never_replays() {
    let pool = Pool::start(options()).await;
    let body = include_str!("../fixtures/vendor/openai_responses/disconnected-output.sse");
    pool.vendor.script(
        "primary",
        [Reply::Recorded {
            status: 200,
            body: body.into(),
            reset: false,
        }],
    );
    let (_, output) = pool.send_codex(&turn("gpt-5")).await;
    assert!(output.contains("MOCK_A_PARTIAL"), "{output}");
    assert!(output.contains("upstream_incomplete"), "{output}");
    assert!(!output.contains("response.completed"), "{output}");
    assert_eq!(pool.vendor.accounts_seen(), ["primary"]);
}

#[tokio::test]
async fn abnormal_disconnect_before_output_fails_over() {
    let pool = Pool::start(options()).await;
    pool.vendor.script(
        "primary",
        [Reply::Recorded {
            status: 200,
            body: String::new(),
            reset: true,
        }],
    );
    let (status, output) = pool.send_codex(&turn("gpt-5")).await;
    assert_eq!(status, StatusCode::OK, "{output}");
    assert!(output.contains("response.completed"));
    assert_eq!(pool.vendor.accounts_seen(), ["primary", "account-1"]);
}
