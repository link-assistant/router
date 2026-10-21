//! What happens once a pooled stream has started, and to upstream redirects
//! (issues #668 and #669).

use super::*;

async fn eventually(what: &str, mut done: impl FnMut() -> bool) {
    let deadline = tokio::time::Instant::now() + Duration::from_secs(10);
    while !done() {
        assert!(tokio::time::Instant::now() < deadline, "timed out: {what}");
        tokio::time::sleep(Duration::from_millis(25)).await;
    }
}

fn token_record(pool: &Pool) -> link_assistant_router::storage::TokenRecord {
    pool.state
        .token_manager
        .store()
        .get(&pool.token_id)
        .unwrap()
        .unwrap()
}

/// A client that hangs up mid-stream makes the router hang up on the vendor,
/// and the partial output is still charged (an estimate, as the vendor never
/// reported its final usage).
#[tokio::test]
async fn a_client_disconnect_mid_stream_closes_upstream_and_settles_usage() {
    let pool = Pool::start(Options::default()).await;
    pool.vendor.script("primary", [Reply::Cut { reset: false }]);

    let mut response = pool
        .post(MESSAGES, None, &hello(true))
        .send()
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    let mut received = String::new();
    while !received.contains("content_block_delta") {
        let chunk = response
            .chunk()
            .await
            .unwrap()
            .expect("the stream continues");
        received.push_str(&String::from_utf8_lossy(&chunk));
    }
    drop(response);

    eventually("the vendor sees the router hang up", || {
        pool.vendor.closed.load(Ordering::SeqCst) == 1
    })
    .await;
    eventually("the request is settled", || {
        let record = token_record(&pool);
        record.reserved_tokens == 0 && record.used_tokens > 0
    })
    .await;
    let record = token_record(&pool);
    assert_eq!(record.used_requests, 1);
    let estimated_output = (CUT_TEXT_CHARS / 4) as u64;
    assert!(
        record.used_tokens >= 3 + estimated_output,
        "3 input tokens plus the streamed output estimate: {record:?}"
    );
    assert_eq!(pool.vendor.accounts_seen(), ["primary"]);
}

/// Once bytes have reached the client, an upstream reset is not retried on
/// another account: the client gets the partial stream and one in-band error.
#[tokio::test]
async fn a_reset_after_the_first_byte_is_not_failed_over() {
    let pool = Pool::start(Options::default()).await;
    pool.vendor.script("primary", [Reply::Cut { reset: true }]);

    let (status, body) = pool.send(None, &hello(true)).await;

    assert_eq!(status, StatusCode::OK, "{body}");
    assert!(body.contains(&"x".repeat(CUT_TEXT_CHARS)), "{body}");
    assert_eq!(
        body.matches("event: error").count(),
        1,
        "exactly one in-band error: {body}"
    );
    assert_eq!(
        pool.vendor.accounts_seen(),
        ["primary"],
        "account-1 must see zero requests"
    );
}

/// A second loopback server counting what reaches it.
async fn redirect_target() -> (String, Arc<Mutex<Vec<String>>>, tokio::task::JoinHandle<()>) {
    let hits = Arc::new(Mutex::new(Vec::new()));
    let recorded = hits.clone();
    let app = Router::new().fallback(move |request: Request| {
        let recorded = recorded.clone();
        async move {
            let credentials = ["authorization", "x-api-key"]
                .iter()
                .filter_map(|name| request.headers().get(*name))
                .map(|value| value.to_str().unwrap_or_default().to_string())
                .collect::<Vec<_>>()
                .join(",");
            recorded
                .lock()
                .unwrap()
                .push(format!("{} {credentials}", request.uri()));
            "stolen"
        }
    });
    let (url, task) = spawn(app).await;
    (url, hits, task)
}

async fn assert_redirects_not_followed(codex: bool) {
    let pool = Pool::start(Options {
        codex,
        ..Options::default()
    })
    .await;
    let (target, hits, target_task) = redirect_target().await;
    for status in [302, 307] {
        for account in ACCOUNTS {
            pool.vendor.always(
                account,
                Reply::Redirect {
                    status,
                    location: format!("{target}/steal"),
                },
            );
        }
        let (code, body) = if codex {
            pool.send_codex(&json!({"model": "gpt-5", "stream": true, "input": "hi"}))
                .await
        } else {
            pool.send(None, &hello(false)).await
        };
        assert!(!code.is_success(), "{status}: {code} {body}");
        assert!(!body.contains("stolen"), "{body}");
    }
    assert!(
        hits.lock().unwrap().is_empty(),
        "the redirect target was reached: {:?}",
        hits.lock().unwrap()
    );
    target_task.abort();
}

/// A vendor redirect on the Anthropic subscription path is not followed, so
/// the OAuth token never reaches the redirect target.
#[tokio::test]
async fn anthropic_subscription_redirects_are_not_followed() {
    assert_redirects_not_followed(false).await;
}

/// The same on the Codex subscription path.
#[tokio::test]
async fn codex_subscription_redirects_are_not_followed() {
    assert_redirects_not_followed(true).await;
}
