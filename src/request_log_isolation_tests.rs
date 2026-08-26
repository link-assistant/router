use super::*;

fn identity(hash: &str, id: &str, label: &str) -> LogIdentity {
    LogIdentity {
        hash: hash.to_string(),
        id: Some(id.to_string()),
        label: Some(label.to_string()),
    }
}

#[test]
fn partial_redaction_is_stable_distinguishable_and_shared_across_sites() {
    let first = "la_sk_abcdefghijklmnop_first";
    let second = "la_sk_abcdefghijklmnop_other";
    let expected_first = partially_redact(first);
    let expected_second = partially_redact(second);
    assert_ne!(expected_first, expected_second);
    assert_eq!(expected_first, partially_redact(first));

    let mut headers = HeaderMap::new();
    headers.insert(
        "x-api-key",
        HeaderValue::from_str(first).expect("header value"),
    );
    assert_eq!(redacted_headers(&headers)["x-api-key"], expected_first);

    let body = redacted_body(
        serde_json::to_string(&json!({"access_token": first}))
            .expect("serialize body")
            .as_bytes(),
    );
    assert_eq!(body["access_token"], expected_first);
    assert_eq!(
        redacted_uri(&format!("/v1/models?access_token={first}")),
        format!("/v1/models?access_token={expected_first}")
    );
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

/// The store has a ceiling, not just each token in it.
///
/// `--request-log-max-bytes` was documented as "Maximum size of the request
/// log" and enforced per token directory, so a deployment configured for 500
/// MB with 84 tokens had a 42 GB ceiling — an order of magnitude more disk
/// than the operator budgeted, derivable from neither the setting nor the docs
/// (issue #331).
#[test]
fn the_whole_store_stays_within_its_total_bound() {
    let dir = tempfile::tempdir().expect("temporary directory");
    let root = dir.path().join("requests");
    let log = RequestLog::new(root.clone(), 4_096).with_total_limit(8_192);

    // Ten tokens, each writing enough to fill its own per-token budget. Under
    // a per-token bound alone this store would be ten times the total cap.
    for token in 0..10 {
        let hash = format!("hash-{token:02}");
        let correlation = format!("correlation-{token:02}");
        log.route_request(&correlation, identity(&hash, "id", "label"));
        for sequence in 0..40 {
            log.record(
                &correlation,
                "test",
                json!({"sequence": sequence, "body": "x".repeat(64)}),
            );
        }
        // Distinct modification times, so "least recently written" is defined.
        std::thread::sleep(std::time::Duration::from_millis(10));
    }

    let total: u64 = fs::read_dir(&root)
        .expect("store")
        .flatten()
        .filter_map(|entry| fs::metadata(entry.path().join("requests.jsonl")).ok())
        .map(|metadata| metadata.len())
        .sum();
    assert!(
        total <= 8_192,
        "the store must respect its total bound, found {total} bytes"
    );

    // Eviction is oldest-first and whole-directory, so the token still being
    // written keeps every record the per-token bound retained for it. That is
    // the isolation the per-token bound exists for, and it must survive.
    let newest = fs::read_to_string(log.log_path("hash-09")).expect("newest token log");
    assert!(
        newest.contains("\"sequence\":39"),
        "the active token keeps its newest records: {newest}"
    );
    assert!(
        !root.join("hash-00").exists(),
        "the least recently written token is the one evicted"
    );
}

/// An operator who has budgeted the partition themselves can say so.
#[test]
fn a_zero_total_bound_leaves_the_store_uncapped() {
    let dir = tempfile::tempdir().expect("temporary directory");
    let root = dir.path().join("requests");
    let log = RequestLog::new(root.clone(), 512).with_total_limit(0);
    for token in 0..4 {
        let hash = format!("hash-{token}");
        let correlation = format!("correlation-{token}");
        log.route_request(&correlation, identity(&hash, "id", "label"));
        log.record(&correlation, "test", json!({"body": "x".repeat(64)}));
    }
    for token in 0..4 {
        assert!(
            root.join(format!("hash-{token}")).exists(),
            "no directory is evicted when the total cap is disabled"
        );
    }
}

/// The total cap costs nothing on a store that is inside it.
///
/// The check runs on every record, so it must not turn each append into a
/// directory scan on a deployment that is nowhere near its bound.
#[test]
fn a_store_inside_its_bound_is_not_rescanned_into_slowness() {
    let dir = tempfile::tempdir().expect("temporary directory");
    let log =
        RequestLog::new(dir.path().join("requests"), 1_000_000).with_total_limit(1_000_000_000);
    // The deployment this was reported from had 84 token directories, which is
    // what the per-record check has to walk.
    for token in 0..84 {
        let correlation = format!("seed-{token}");
        log.route_request(
            &correlation,
            identity(&format!("seed-{token:03}"), "id", "label"),
        );
        log.record(&correlation, "test", json!({"seed": token}));
    }
    log.route_request("c", identity("hash", "id", "label"));
    let started = std::time::Instant::now();
    for sequence in 0..2_000 {
        log.record("c", "test", json!({"sequence": sequence}));
    }
    let elapsed = started.elapsed();
    assert!(
        elapsed < std::time::Duration::from_secs(10),
        "2000 records took {elapsed:?}; the total-cap check must not dominate an append"
    );
}

/// The fast path cannot hide an overflow.
///
/// The per-record check skips the directory scan when the active token is
/// under its own share of the total, which is only sound if the store cannot
/// then be over it. Many directories each just under their share is the case
/// that would break that reasoning, so it is the case tested.
#[test]
fn many_small_directories_still_trip_the_total_bound() {
    let dir = tempfile::tempdir().expect("temporary directory");
    let root = dir.path().join("requests");
    // Twenty tokens, a generous per-token bound, and a total that a handful of
    // them together already exceeds.
    let log = RequestLog::new(root.clone(), 100_000).with_total_limit(6_000);
    for token in 0..20 {
        let correlation = format!("correlation-{token:02}");
        log.route_request(
            &correlation,
            identity(&format!("hash-{token:02}"), "id", "label"),
        );
        for sequence in 0..6 {
            log.record(
                &correlation,
                "test",
                json!({"sequence": sequence, "body": "x".repeat(64)}),
            );
        }
        std::thread::sleep(std::time::Duration::from_millis(5));
    }

    let total: u64 = fs::read_dir(&root)
        .expect("store")
        .flatten()
        .filter_map(|entry| fs::metadata(entry.path().join("requests.jsonl")).ok())
        .map(|metadata| metadata.len())
        .sum();
    assert!(
        total <= 6_000,
        "no directory was ever near the total alone, and the store must still be bounded: \
         found {total} bytes"
    );
}
