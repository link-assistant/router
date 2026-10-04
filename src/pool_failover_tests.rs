use super::*;
use serde_json::json;

#[test]
fn failover_mode_parses_documented_values() {
    assert_eq!(FailoverMode::parse("off"), Ok(FailoverMode::Off));
    assert_eq!(FailoverMode::parse(""), Ok(FailoverMode::Off));
    assert_eq!(
        FailoverMode::parse("Pre-First-Byte"),
        Ok(FailoverMode::PreFirstByte)
    );
    assert_eq!(
        FailoverMode::parse("pre_first_byte"),
        Ok(FailoverMode::PreFirstByte)
    );
    assert!(FailoverMode::parse("always").is_err());
}

#[test]
fn defaults_keep_historical_behaviour() {
    let policy = PoolPolicy::default();
    assert!(!policy.failover_enabled());
    assert_eq!(policy.max_attempts, 3);
    assert_eq!(policy.pause_at_percent, None);
    assert!(!policy.intercept_warmup);
    assert!(
        policy
            .doctor_lines()
            .contains("pool failover           : off")
    );
}

#[test]
fn percent_is_bounded() {
    assert_eq!(parse_percent("90"), Ok(90));
    assert_eq!(parse_percent("85%"), Ok(85));
    assert!(parse_percent("0").is_err());
    assert!(parse_percent("101").is_err());
    assert!(parse_percent("lots").is_err());
}

#[test]
fn retryable_statuses() {
    for status in [429, 529, 500, 502, 503, 504, 401] {
        assert!(classify_status(status).is_some(), "{status}");
    }
    for status in [200, 400, 403, 404, 413, 501] {
        assert!(classify_status(status).is_none(), "{status}");
    }
}

#[test]
fn strips_thinking_but_keeps_other_blocks() {
    let mut body = json!({
        "messages": [
            {"role": "user", "content": "hi"},
            {"role": "assistant", "content": [
                {"type": "thinking", "thinking": "x", "signature": "sig"},
                {"type": "redacted_thinking", "data": "y"},
                {"type": "text", "text": "hello"}
            ]}
        ]
    });
    assert!(strip_anthropic_thinking(&mut body));
    assert_eq!(
        body["messages"][1]["content"],
        json!([{"type": "text", "text": "hello"}])
    );
    assert!(!strip_anthropic_thinking(&mut body));
}

#[test]
fn strips_only_encrypted_reasoning() {
    let mut body = json!({
        "input": [
            {"type": "reasoning", "summary": [], "encrypted_content": "opaque"},
            {"type": "reasoning", "summary": []},
            {"type": "message", "role": "user", "content": "hi"}
        ]
    });
    assert!(strip_codex_encrypted_reasoning(&mut body));
    assert_eq!(body["input"].as_array().map(Vec::len), Some(2));
    assert!(!strip_codex_encrypted_reasoning(&mut body));
}
