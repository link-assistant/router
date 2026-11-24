//! Pre-first-byte failover on the native Codex Responses route (issue #676).

use super::*;

fn codex_options() -> Options {
    Options {
        codex: true,
        ..Options::default()
    }
}

/// A Codex turn that carries a previous turn's encrypted reasoning, which only
/// the account that produced it can decrypt.
fn codex_turn(marker: &str) -> Value {
    json!({
        "model": "gpt-5",
        "stream": true,
        "store": false,
        "instructions": "keep this exact native field",
        "input": [
            {"role": "user", "content": [{"type": "input_text", "text": marker}]},
            {"type": "reasoning", "id": "rs_1", "summary": [],
             "encrypted_content": "sealed-by-primary"},
            {"role": "user", "content": [{"type": "input_text", "text": "and then?"}]}
        ]
    })
}

fn has_encrypted_reasoning(body: &Value) -> bool {
    body["input"]
        .as_array()
        .unwrap()
        .iter()
        .any(|item| item.get("encrypted_content").is_some())
}

/// A 429 on the first Codex account is retried on the next one before any
/// byte is relayed; the client sees one complete stream, billed once.
#[tokio::test]
async fn a_rate_limited_codex_account_fails_over_and_relays_one_stream() {
    let pool = Pool::start(codex_options()).await;
    pool.vendor.script("primary", [Reply::status(429)]);

    let (status, body) = pool.send_codex(&codex_turn("hello")).await;

    assert_eq!(status, StatusCode::OK, "{body}");
    assert_eq!(body, codex_stream_from("account-1"), "one complete stream");
    assert_eq!(pool.vendor.accounts_seen(), ["primary", "account-1"]);
    assert!(
        pool.vendor
            .seen()
            .iter()
            .all(|(_, path, _)| path.ends_with("/responses"))
    );

    let record = pool
        .state
        .token_manager
        .store()
        .get(&pool.token_id)
        .unwrap()
        .unwrap();
    assert_eq!(record.used_requests, 1, "billed once");
    assert_eq!(record.reserved_tokens, 0);
    let usage = link_assistant_router::metrics::usage_snapshot(&pool.state.metrics);
    assert_eq!(usage.requests_total, 1);
    assert_eq!(usage.account_calls.get("account-1"), Some(&1));
    assert_eq!(usage.account_calls.get("primary"), None);
    assert!(
        pool.health("primary").healthy,
        "sibling models remain eligible"
    );
    assert!(
        pool.health("primary")
            .limits
            .blocks_model("gpt-5", link_assistant_router::account_limits::now_unix())
    );

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
}

/// Encrypted reasoning is forwarded untouched to the account that issued it,
/// and dropped only when the retry switches to another account.
#[tokio::test]
async fn codex_encrypted_reasoning_is_stripped_only_on_a_switch() {
    let pool = Pool::start(codex_options()).await;

    // No failure: the single attempt keeps the native body byte-for-byte.
    let (status, body) = pool.send_codex(&codex_turn("first")).await;
    assert_eq!(status, StatusCode::OK, "{body}");
    let seen = pool.vendor.seen();
    assert_eq!(seen.len(), 1);
    assert_eq!(seen[0].2, codex_turn("first"));

    // A 429 on primary: primary still sees the reasoning, account-1 does not.
    pool.vendor.script("primary", [Reply::status(429)]);
    let (status, body) = pool.send_codex(&codex_turn("second")).await;
    assert_eq!(status, StatusCode::OK, "{body}");
    assert_eq!(body, codex_stream_from("account-1"));

    let seen = pool.vendor.seen();
    assert_eq!(seen.len(), 3);
    let (first_account, _, first_body) = &seen[1];
    let (retry_account, _, retry_body) = &seen[2];
    assert_eq!(first_account, "primary");
    assert_eq!(first_body, &codex_turn("second"));
    assert!(has_encrypted_reasoning(first_body));
    assert_eq!(retry_account, "account-1");
    assert!(!has_encrypted_reasoning(retry_body), "{retry_body}");
    // Everything else in the turn is forwarded unchanged.
    let mut expected = codex_turn("second");
    expected["input"].as_array_mut().unwrap().remove(1);
    assert_eq!(retry_body, &expected);
}
