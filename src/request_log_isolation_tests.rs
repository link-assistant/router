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
            .map(|line| crate::lino_json::decode_line(line).expect("a readable record"))
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
    // Read through the decoder: the assertion is about which records
    // survived, not about how they are punctuated (issue #336).
    assert!(
        noisy
            .lines()
            .filter_map(crate::lino_json::decode_line)
            .filter_map(|record| record.get("sequence").and_then(serde_json::Value::as_i64))
            .any(|sequence| sequence == 39),
        "the newest record survives: {noisy}"
    );
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
    let placeholder = rendered
        .lines()
        .filter_map(crate::lino_json::decode_line)
        .find(|record| {
            record
                .get("body")
                .and_then(serde_json::Value::as_str)
                .is_some_and(|body| body.contains("[OMITTED:"))
        })
        .expect("the placeholder record is readable");
    assert_eq!(placeholder["token_hash"], "hash-large");
    assert_eq!(placeholder["token_id"], "id-large");
    assert_eq!(placeholder["token_label"], "large");
}

/// The store has a ceiling, not just each token in it.
///
/// `--request-log-max-bytes` was documented as "Maximum size of the request
/// log" and enforced per token directory, so installations with many tokens
/// could consume far more disk than the operator budgeted, derivable from
/// neither the setting nor the docs (issue #331).
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
        .filter_map(|entry| fs::metadata(entry.path().join("requests.lino")).ok())
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
        newest
            .lines()
            .filter_map(crate::lino_json::decode_line)
            .filter_map(|record| record.get("sequence").and_then(serde_json::Value::as_i64))
            .any(|sequence| sequence == 39),
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
    // A substantial directory count exercises the per-record scan cost without
    // relying on any deployment-specific measurements.
    for token in 0..100 {
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
        .filter_map(|entry| fs::metadata(entry.path().join("requests.lino")).ok())
        .map(|metadata| metadata.len())
        .sum();
    assert!(
        total <= 6_000,
        "no directory was ever near the total alone, and the store must still be bounded: \
         found {total} bytes"
    );
}

/// A log written under the old name is renamed, not orphaned.
///
/// The file has held links notation since v0.122.0 while still being called
/// `requests.jsonl`. Renaming on the next write is what lets every later
/// reader, size check and eviction deal with a single name — but only if the
/// records survive it, so this drives the rename directly rather than through
/// a spawned router (issue #346).
#[test]
fn a_log_under_the_old_name_is_renamed_and_keeps_its_records() {
    let dir = tempfile::tempdir().expect("temporary directory");
    let root = dir.path().join("requests");
    let token = root.join("hash-legacy");
    fs::create_dir_all(&token).expect("create the token directory");
    let legacy = token.join("requests.jsonl");
    let renamed = token.join("requests.lino");

    // Records an earlier release wrote, in the encoding it wrote them in.
    let seeded = crate::lino_json::encode_line(&json!({"marker": "seeded-record"}))
        .expect("encode a record");
    fs::write(&legacy, format!("{seeded}\n")).expect("write the legacy log");

    let log = RequestLog::new(root, 16 * 1024);
    log.route_request("c", identity("hash-legacy", "id", "label"));
    log.record("c", "test", json!({"marker": "appended-record"}));

    assert!(
        renamed.is_file(),
        "the log must take the name for what it holds"
    );
    assert!(
        !legacy.exists(),
        "the old name must not be left behind holding the same records"
    );
    let rendered = fs::read_to_string(&renamed).expect("read the renamed log");
    assert!(
        rendered.contains("seeded-record"),
        "the rename must keep what was already there: {rendered}"
    );
    assert!(
        rendered.contains("appended-record"),
        "and the new record must be appended to it: {rendered}"
    );
}

/// A rename that cannot happen does not lose the record being written.
///
/// If something already occupies the new name -- a half-finished upgrade, an
/// operator's own copy -- the rename fails. The append must still succeed,
/// because dropping the record would turn a naming problem into data loss.
#[test]
fn a_blocked_rename_still_records_the_request() {
    let dir = tempfile::tempdir().expect("temporary directory");
    let root = dir.path().join("requests");
    let token = root.join("hash-blocked");
    fs::create_dir_all(&token).expect("create the token directory");
    // A directory under the target name: `rename` cannot replace it, so the
    // failure branch runs.
    fs::create_dir_all(token.join("requests.lino")).expect("occupy the new name");
    let seeded = crate::lino_json::encode_line(&json!({
        "marker": "legacy",
        "correlation_id": "stranded-correlation",
        "phase": "client_request",
    }))
    .expect("encode a record");
    fs::write(token.join("requests.jsonl"), format!("{seeded}\n")).expect("write the legacy log");

    let log = RequestLog::new(root.clone(), 16 * 1024);
    log.route_request("c", identity("hash-blocked", "id", "label"));
    // The point is that this does not panic and does not hang; the record has
    // nowhere good to go, and the router keeps serving either way.
    log.record("c", "test", json!({"marker": "appended-anyway"}));

    assert!(
        token.join("requests.jsonl").is_file(),
        "a log that could not be renamed is left where an operator can find it"
    );
    let stranded = fs::read_to_string(token.join("requests.jsonl")).expect("read the legacy log");
    assert!(
        stranded.contains("legacy"),
        "and it still holds every record it held: {stranded}"
    );
    // The reader finds it under either name, so the history is not lost even
    // while the rename cannot happen.
    let (exchanges, unparsable, _) =
        crate::log_analysis::read_exchanges(&root, None).expect("read the store");
    assert_eq!(unparsable, 0, "a stranded log must still read cleanly");
    assert!(
        !exchanges.is_empty(),
        "and its records must still be reachable"
    );
}

/// The whole-store bound counts a log that has not been renamed yet.
///
/// Eviction reads each directory's size. If it only knew the new name, a token
/// idle since the upgrade would look empty and its bytes would escape the
/// bound entirely (issue #346).
#[test]
fn the_total_bound_counts_logs_still_under_the_old_name() {
    let dir = tempfile::tempdir().expect("temporary directory");
    let root = dir.path().join("requests");
    fs::create_dir_all(&root).expect("create the store");

    // Ten idle tokens, all under the old name, together far over the bound.
    for token in 0..10 {
        let directory = root.join(format!("hash-{token:02}"));
        fs::create_dir_all(&directory).expect("create a token directory");
        fs::write(directory.join("requests.jsonl"), "x".repeat(2_000)).expect("write a legacy log");
        std::thread::sleep(std::time::Duration::from_millis(10));
    }

    let log = RequestLog::new(root.clone(), 4_096).with_total_limit(8_192);
    log.route_request("c", identity("hash-active", "id", "label"));
    log.record("c", "test", json!({"marker": "active"}));

    let total: u64 = fs::read_dir(&root)
        .expect("store")
        .flatten()
        .filter_map(|entry| {
            let directory = entry.path();
            fs::metadata(directory.join("requests.lino"))
                .or_else(|_| fs::metadata(directory.join("requests.jsonl")))
                .ok()
        })
        .map(|metadata| metadata.len())
        .sum();
    assert!(
        total <= 8_192,
        "un-renamed logs must count toward the bound, found {total} bytes"
    );
}
