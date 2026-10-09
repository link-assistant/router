use super::*;

/// A 429 on the first account is retried on the next one before any byte is
/// relayed: the client sees exactly one complete stream, the attempt is
/// billed once, and the vendor's reset time cools the first account.
#[tokio::test]
async fn a_rate_limited_account_fails_over_and_relays_one_stream() {
    let pool = Pool::start(Options::default()).await;
    pool.vendor.script("primary", [rate_limited_for(3600)]);

    let (status, body) = pool.send(None, &hello(true)).await;

    assert_eq!(status, StatusCode::OK, "{body}");
    assert_eq!(
        body,
        stream_from("account-1"),
        "one complete stream, unchanged"
    );
    assert_eq!(pool.vendor.accounts_seen(), ["primary", "account-1"]);

    // Billed once: one request against the token, one recorded outcome.
    let record = pool
        .state
        .token_manager
        .store()
        .get(&pool.token_id)
        .unwrap()
        .unwrap();
    assert_eq!(record.used_requests, 1);
    assert_eq!(record.reserved_tokens, 0);
    assert!(
        record.used_tokens > 0 && record.used_tokens < 64,
        "{record:?}"
    );
    let usage = link_assistant_router::metrics::usage_snapshot(&pool.state.metrics);
    assert_eq!(usage.requests_total, 1);
    assert_eq!(usage.account_calls.get("account-1"), Some(&1));
    assert_eq!(usage.account_calls.get("primary"), None);

    // The unified headers set the cooldown (issue #677).
    let primary = pool.health("primary");
    assert!(!primary.healthy);
    let until = primary.limits.cooldown_until_unix.expect("vendor cooldown");
    assert!(until > link_assistant_router::account_limits::now_unix() + 3000);

    let metrics = pool
        .client
        .get(format!("{}/metrics", pool.url))
        .send()
        .await
        .unwrap()
        .text()
        .await
        .unwrap();
    assert!(
        metrics.contains("link_assistant_pool_failovers_total 1"),
        "{metrics}"
    );
    assert!(
        metrics.contains("link_assistant_pool_accounts_cooling_down 1"),
        "{metrics}"
    );
    assert!(!metrics.contains("primary"), "metrics stay aggregate");
}

/// With failover off (the default) the 429 reaches the client unchanged and no
/// other account is tried; the vendor state is still recorded.
#[tokio::test]
async fn without_failover_the_failure_is_relayed() {
    let pool = Pool::start(Options {
        failover: false,
        ..Options::default()
    })
    .await;
    pool.vendor.script("primary", [rate_limited_for(600)]);

    let (status, body) = pool.send(None, &hello(false)).await;

    assert_eq!(status, StatusCode::TOO_MANY_REQUESTS);
    assert!(body.contains("scripted 429 from primary"), "{body}");
    assert_eq!(pool.vendor.accounts_seen(), ["primary"]);
    assert!(pool.health("primary").limits.cooldown_until_unix.is_some());
}

/// Retryable 5xx and 529 answers fail over too, and the attempt bound holds:
/// three failing accounts yield the last failure after three attempts.
#[tokio::test]
async fn attempts_are_bounded_and_the_last_failure_is_relayed() {
    let pool = Pool::start(Options::default()).await;
    pool.vendor.always("primary", Reply::status(529));
    pool.vendor.always("account-1", Reply::status(503));
    pool.vendor.always("account-2", Reply::status(500));

    let (status, _) = pool.send(None, &hello(false)).await;

    assert!(status.is_server_error(), "{status}");
    let seen = pool.vendor.accounts_seen();
    assert_eq!(seen.len(), 3, "{seen:?}");
    let mut distinct = seen;
    distinct.sort();
    distinct.dedup();
    assert_eq!(distinct.len(), 3, "every attempt used a different account");
    assert_eq!(
        link_assistant_router::metrics::usage_snapshot(&pool.state.metrics).requests_total,
        1
    );
}

/// A session served elsewhere while its account cools down returns to that
/// account once the cooldown ends.
#[tokio::test]
async fn a_session_returns_to_its_account_after_the_cooldown() {
    let clock = Arc::new(AtomicU64::new(
        link_assistant_router::account_limits::now_unix(),
    ));
    let pool = Pool::start(Options {
        cooldown: Duration::from_secs(1),
        clock: Some(clock.clone()),
        ..Options::default()
    })
    .await;
    clock.store(
        link_assistant_router::account_limits::now_unix(),
        Ordering::Relaxed,
    );
    let session = Some("session-affinity");

    assert_eq!(pool.send(session, &hello(false)).await.0, StatusCode::OK);
    pool.vendor.script(
        "primary",
        [Reply::Status {
            status: 429,
            headers: vec![("retry-after", "1".into())],
            delay: Duration::ZERO,
        }],
    );
    let (status, body) = pool.send(session, &hello(false)).await;
    assert_eq!(status, StatusCode::OK);
    assert!(body.contains("answered by account-"), "{body}");
    // While primary cools, the session stays bound to it and detours.
    let (_, body) = pool.send(session, &hello(false)).await;
    assert!(body.contains("answered by account-"), "{body}");

    // Unix reset timestamps have second precision. Freeze the clock during
    // the detour assertions, then advance exactly to the reset boundary.
    clock.fetch_add(1, Ordering::Relaxed);
    let (_, body) = pool.send(session, &hello(false)).await;
    assert!(body.contains("answered by primary"), "{body}");
    assert_eq!(
        pool.vendor.accounts_seen().first().map(String::as_str),
        Some("primary")
    );
}

/// Concurrent failovers from one failing account spread across the others
/// instead of piling onto the next one.
#[tokio::test]
async fn concurrent_failovers_spread_across_accounts() {
    let pool = Pool::start(Options::default()).await;
    pool.vendor.always("primary", Reply::status(529));

    let request = hello(false);
    let requests = (0..6).map(|_| pool.send(None, &request));
    for (status, body) in futures_util::future::join_all(requests).await {
        assert_eq!(status, StatusCode::OK, "{body}");
    }

    let seen = pool.vendor.accounts_seen();
    let count = |account: &str| seen.iter().filter(|seen| *seen == account).count();
    assert_eq!(count("primary"), 6);
    assert!(count("account-1") > 0, "{seen:?}");
    assert!(count("account-2") > 0, "{seen:?}");
}

/// A token pinned to an account never falls back to another.
#[tokio::test]
async fn a_pinned_token_never_falls_back() {
    let mut pool = Pool::start(Options::default()).await;
    pool.token = pool
        .state
        .token_manager
        .issue(&IssueRequest {
            ttl_hours: 1,
            label: "pinned client",
            account: Some("primary"),
            client_kind: Some("claude"),
            principal_id: Some("primary"),
            ..IssueRequest::default()
        })
        .unwrap();
    pool.vendor.script("primary", [Reply::status(529)]);

    let (status, _) = pool.send(None, &hello(false)).await;

    assert_eq!(status.as_u16(), 529);
    assert_eq!(pool.vendor.accounts_seen(), ["primary"]);
}

/// A client that disconnects while the first attempt is pending stops the
/// request: no further account is tried.
#[tokio::test]
async fn a_client_that_goes_away_stops_the_retries() {
    let pool = Pool::start(Options::default()).await;
    pool.vendor.script(
        "primary",
        [Reply::Status {
            status: 529,
            headers: Vec::new(),
            delay: Duration::from_millis(800),
        }],
    );

    let abandoned = pool
        .post(MESSAGES, None, &hello(false))
        .timeout(Duration::from_millis(200))
        .send()
        .await;
    assert!(abandoned.is_err(), "the client gave up first");

    tokio::time::sleep(Duration::from_millis(1500)).await;
    assert_eq!(pool.vendor.accounts_seen(), ["primary"]);
    assert_eq!(
        link_assistant_router::metrics::usage_snapshot(&pool.state.metrics).requests_total,
        0
    );
}

/// Thinking blocks are signed by the account that produced them, so they are
/// dropped when — and only when — the request moves to a different account.
#[tokio::test]
async fn thinking_signatures_are_stripped_only_on_an_account_switch() {
    let pool = Pool::start(Options::default()).await;
    pool.vendor.script("primary", [Reply::status(429)]);
    let body = json!({
        "model": "claude-sonnet-4-5",
        "max_tokens": 64,
        "messages": [
            {"role": "user", "content": "first"},
            {"role": "assistant", "content": [
                {"type": "thinking", "thinking": "hmm", "signature": "sig-primary"},
                {"type": "redacted_thinking", "data": "opaque"},
                {"type": "text", "text": "answer"}
            ]},
            {"role": "user", "content": "second"}
        ]
    });

    let (status, _) = pool.send(None, &body).await;

    assert_eq!(status, StatusCode::OK);
    let seen = pool.vendor.seen();
    assert_eq!(seen.len(), 2);
    assert_eq!(seen[0].2, body, "the first attempt is sent unchanged");
    let retried = &seen[1].2["messages"][1]["content"];
    assert_eq!(retried, &json!([{"type": "text", "text": "answer"}]));
    assert_eq!(seen[1].2["messages"][2], body["messages"][2]);
}

/// `count_tokens` responses carry the unified headers too, and a window at the
/// `ACCOUNT_PAUSE_AT_PERCENT` threshold pauses the account until it resets.
#[tokio::test]
async fn a_window_at_the_threshold_pauses_the_account() {
    let pool = Pool::start(Options {
        pause_at_percent: Some(90),
        ..Options::default()
    })
    .await;
    let reset = link_assistant_router::account_limits::now_unix() + 1800;
    pool.vendor.ok_headers.lock().unwrap().insert(
        "primary".into(),
        vec![
            ("anthropic-ratelimit-unified-7d-utilization", "0.93".into()),
            ("anthropic-ratelimit-unified-7d-reset", reset.to_string()),
            (
                "anthropic-ratelimit-unified-7d-status",
                "allowed_warning".into(),
            ),
        ],
    );

    let counted = pool
        .post(COUNT_TOKENS, None, &hello(false))
        .send()
        .await
        .unwrap();
    assert_eq!(counted.status(), StatusCode::OK);

    let primary = pool.health("primary");
    assert!(
        primary
            .limits
            .paused_at(link_assistant_router::account_limits::now_unix())
    );
    assert_eq!(
        primary.limits.pause.as_ref().and_then(|p| p.until_unix),
        Some(reset)
    );
    let (_, body) = pool.send(None, &hello(false)).await;
    assert!(body.contains("answered by account-1"), "{body}");
    // Persisted for `deploy --status` and `doctor`.
    let report = link_assistant_router::account_limits::status_report(pool.data.path());
    assert!(
        report.contains("account_paused provider=claude account=primary kind=threshold"),
        "{report}"
    );
}

/// A served response never cools its account, even when its windows read
/// `rejected`: overage-off and paid-overage answers carry that on a `200`.
#[tokio::test]
async fn a_served_response_with_rejected_windows_keeps_the_account() {
    let pool = Pool::start(Options::default()).await;
    let reset = link_assistant_router::account_limits::now_unix() + 3600;
    pool.vendor.ok_headers.lock().unwrap().insert(
        "primary".into(),
        vec![
            ("anthropic-ratelimit-unified-status", "rejected".into()),
            ("anthropic-ratelimit-unified-reset", reset.to_string()),
            (
                "anthropic-ratelimit-unified-overage-status",
                "rejected".into(),
            ),
            (
                "anthropic-ratelimit-unified-overage-reset",
                reset.to_string(),
            ),
        ],
    );

    for _ in 0..2 {
        let (status, body) = pool.send(None, &hello(false)).await;
        assert_eq!(status, StatusCode::OK, "{body}");
        assert!(body.contains("answered by primary"), "{body}");
    }
    let primary = pool.health("primary");
    assert!(primary.healthy, "{primary:?}");
    assert_eq!(primary.limits.cooldown_until_unix, None);
    assert!(
        primary
            .limits
            .windows
            .iter()
            .all(|window| window.name != "overage"),
        "{primary:?}"
    );
}

/// An operator can pause and resume an account through the management API.
#[tokio::test]
async fn the_api_pauses_and_resumes_an_account() {
    let pool = Pool::start(Options::default()).await;

    let paused = pool
        .admin("/api/management/accounts/primary/pause")
        .json(&json!({"reason": "maintenance"}))
        .send()
        .await
        .unwrap();
    assert_eq!(paused.status(), StatusCode::OK);
    let (_, body) = pool.send(None, &hello(false)).await;
    assert!(body.contains("answered by account-1"), "{body}");

    let listing: Value = pool
        .client
        .get(format!("{}/api/management/accounts", pool.url))
        .bearer_auth(ADMIN_KEY)
        .send()
        .await
        .unwrap()
        .json()
        .await
        .unwrap();
    let primary = &listing["accounts"][0];
    assert_eq!(primary["name"], "primary");
    assert_eq!(primary["paused"], true);
    assert_eq!(primary["pause"]["reason"], "maintenance");

    let unknown = pool
        .admin("/api/management/accounts/nobody/pause")
        .send()
        .await
        .unwrap();
    assert_eq!(unknown.status(), StatusCode::NOT_FOUND);
    let unauthorised = pool
        .client
        .post(format!(
            "{}/api/management/accounts/primary/resume",
            pool.url
        ))
        .send()
        .await
        .unwrap();
    assert_eq!(unauthorised.status(), StatusCode::UNAUTHORIZED);

    let resumed: Value = pool
        .admin("/api/management/accounts/primary/resume")
        .send()
        .await
        .unwrap()
        .json()
        .await
        .unwrap();
    assert_eq!(resumed["was_paused"], true);
    let (_, body) = pool.send(None, &hello(false)).await;
    assert!(body.contains("answered by primary"), "{body}");
}

/// With `INTERCEPT_WARMUP` on, Claude Code's warmup probe is answered locally
/// in the shape it asked for and never reaches the vendor.
#[tokio::test]
async fn a_warmup_probe_is_answered_locally() {
    let pool = Pool::start(Options::default()).await;
    let probe = |stream: bool| {
        json!({
            "model": "claude-haiku-4-5",
            "max_tokens": 1,
            "stream": stream,
            "messages": [{"role": "user", "content": [{"type": "text", "text": "Warmup"}]}]
        })
    };

    let (status, body) = pool.send(None, &probe(false)).await;
    assert_eq!(status, StatusCode::OK);
    let message: Value = serde_json::from_str(&body).unwrap();
    assert!(message["id"].as_str().unwrap().starts_with("msg_warmup_"));
    assert_eq!(message["model"], "claude-haiku-4-5");

    let response = pool
        .post(MESSAGES, None, &probe(true))
        .send()
        .await
        .unwrap();
    assert_eq!(
        response.headers()["content-type"].to_str().unwrap(),
        "text/event-stream"
    );
    let stream = response.text().await.unwrap();
    assert!(stream.starts_with("event: message_start\n"), "{stream}");
    assert!(stream.ends_with("event: message_stop\ndata: {\"type\":\"message_stop\"}\n\n"));

    assert!(pool.vendor.seen().is_empty(), "nothing reached the vendor");
    // A real conversation that merely says "Warmup" later is forwarded.
    let (_, body) = pool
        .send(
            None,
            &json!({"model": "claude-sonnet-4-5", "max_tokens": 8, "messages": [
                {"role": "user", "content": "hi"},
                {"role": "assistant", "content": "hello"},
                {"role": "user", "content": "Warmup"}
            ]}),
        )
        .await;
    assert!(body.contains("answered by primary"), "{body}");
}
