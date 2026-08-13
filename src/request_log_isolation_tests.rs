use super::*;

fn identity(hash: &str, id: &str, label: &str) -> LogIdentity {
    LogIdentity {
        hash: hash.to_string(),
        id: Some(id.to_string()),
        label: Some(label.to_string()),
    }
}

#[test]
fn token_routes_have_complete_attribution_without_cross_contamination() {
    let dir = tempfile::tempdir().expect("temporary directory");
    let log = RequestLog::new(dir.path().join("requests"), 16 * 1024);
    log.route_request("first", identity("hash-first", "id-first", "task first"));
    log.route_request(
        "second",
        identity("hash-second", "id-second", "task second"),
    );

    for phase in [
        "client_request",
        "upstream_request",
        "upstream_response",
        "upstream_response_body",
        "client_response",
        "client_response_body",
    ] {
        log.record("first", phase, json!({"marker": "first-only"}));
        log.record("second", phase, json!({"marker": "second-only"}));
    }

    let first = fs::read_to_string(log.log_path("hash-first")).expect("first log");
    let second = fs::read_to_string(log.log_path("hash-second")).expect("second log");
    assert!(!first.contains("second-only"));
    assert!(!second.contains("first-only"));
    for (rendered, hash, id, label) in [
        (&first, "hash-first", "id-first", "task first"),
        (&second, "hash-second", "id-second", "task second"),
    ] {
        let records = rendered
            .lines()
            .map(|line| serde_json::from_str::<Value>(line).expect("valid JSONL"))
            .collect::<Vec<_>>();
        assert_eq!(records.len(), 6);
        assert!(records.iter().all(|record| record["token_hash"] == hash));
        assert!(records.iter().all(|record| record["token_id"] == id));
        assert!(records.iter().all(|record| record["token_label"] == label));
    }
}

#[test]
fn each_token_has_an_independent_size_budget() {
    let dir = tempfile::tempdir().expect("temporary directory");
    let log = RequestLog::new(dir.path().join("requests"), 800);
    log.route_request("quiet", identity("hash-quiet", "id-quiet", "quiet"));
    log.route_request("noisy", identity("hash-noisy", "id-noisy", "noisy"));
    log.record("quiet", "test", json!({"marker": "quiet-survives"}));
    for sequence in 0..40 {
        log.record("noisy", "test", json!({"sequence": sequence}));
    }

    let quiet = fs::read_to_string(log.log_path("hash-quiet")).expect("quiet log");
    let noisy = fs::read_to_string(log.log_path("hash-noisy")).expect("noisy log");
    assert!(quiet.contains("quiet-survives"));
    assert!(noisy.contains("\"sequence\":39"));
    assert!(quiet.len() <= 800);
    assert!(noisy.len() <= 800);
}

#[test]
fn oversized_record_placeholder_keeps_token_identity() {
    let dir = tempfile::tempdir().expect("temporary directory");
    let log = RequestLog::new(dir.path().join("requests"), 400);
    log.route_request("large", identity("hash-large", "id-large", "large"));
    log.record("large", "test", json!({"body": "x".repeat(2_000)}));

    let rendered = fs::read_to_string(log.log_path("hash-large")).expect("large log");
    assert!(rendered.contains("[OMITTED:"));
    assert!(rendered.contains("\"token_hash\":\"hash-large\""));
    assert!(rendered.contains("\"token_id\":\"id-large\""));
    assert!(rendered.contains("\"token_label\":\"large\""));
}
