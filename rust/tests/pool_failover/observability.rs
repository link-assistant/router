//! Failover preserves the account tracking and error capture from issue #728.
use super::*;
use link_assistant_router::account_routing_policy::AccountRoutingPolicy;

fn options(policy: bool) -> Options {
    Options {
        observability: true,
        routing_policy: policy.then(|| AccountRoutingPolicy {
            headers: [("x-fixture".into(), "policy".into())].into(),
            ..Default::default()
        }),
        ..Default::default()
    }
}

fn snapshot(pool: &Pool) -> Value {
    pool.state
        .request_log
        .queue_snapshot(ACCOUNTS.map(str::to_owned))
}

#[tokio::test]
async fn failover_attributes_the_active_stream_to_the_selected_account() {
    for policy in [false, true] {
        let pool = Pool::start(options(policy)).await;
        pool.vendor.script("primary", [Reply::status(429)]);
        pool.vendor
            .script("account-1", [Reply::Cut { reset: false }]);
        let response = tokio::time::timeout(
            Duration::from_secs(5),
            pool.post(MESSAGES, None, &hello(true)).send(),
        )
        .await
        .unwrap()
        .unwrap();
        assert_eq!(response.status(), StatusCode::OK, "policy={policy}");
        assert_eq!(pool.vendor.accounts_seen(), ["primary", "account-1"]);
        let counts = snapshot(&pool);
        assert_eq!(counts["in_flight"], 1, "policy={policy}: {counts}");
        for account in counts["accounts"].as_array().unwrap() {
            let expected = u64::from(account["name"] == "account-1");
            assert_eq!(account["in_flight"], expected, "policy={policy}: {counts}");
        }
        drop(response);
        tokio::time::timeout(Duration::from_secs(2), async {
            while snapshot(&pool)["in_flight"] != 0 {
                tokio::time::sleep(Duration::from_millis(10)).await;
            }
        })
        .await
        .unwrap();
    }
}

#[tokio::test]
async fn quota_failover_retains_the_opt_in_error_capture() {
    for policy in [false, true] {
        let pool = Pool::start(options(policy)).await;
        pool.vendor.script("primary", [Reply::status(429)]);
        let (status, body) =
            tokio::time::timeout(Duration::from_secs(5), pool.send(None, &hello(false)))
                .await
                .unwrap();
        assert_eq!(status, StatusCode::OK, "{body}");
        assert_eq!(pool.vendor.accounts_seen(), ["primary", "account-1"]);
        let errors = pool.state.request_log.error_log().unwrap();
        let files = errors.list().unwrap();
        assert_eq!(files.len(), 1, "policy={policy}");
        let capture: Value =
            serde_json::from_slice(&errors.read(files[0]["name"].as_str().unwrap()).unwrap())
                .unwrap();
        assert_eq!(capture["status"], 429);
        assert_eq!(capture["complete"], true);
        assert_eq!(capture["truncated"], false);
        assert_eq!(capture["body"]["error"]["type"], "rate_limit_error");
    }
}
