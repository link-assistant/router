//! Unit coverage for record-mode selection, the links-notation round trip,
//! record-time redaction and the strictness of replay matching (issue #566).

use super::*;
use serde_json::json;

fn provenance() -> Provenance {
    Provenance {
        router_version: "9.9.9".to_string(),
        provider: "anthropic".to_string(),
    }
}

fn turn(index: usize, request: Value, events: &[&str]) -> Turn {
    Turn {
        index,
        request,
        status: 200,
        headers: vec![("content-type".to_string(), "text/event-stream".to_string())],
        events: events.iter().map(|event| (*event).to_string()).collect(),
    }
}

fn request_with_body(body: &Value) -> Value {
    json!({
        "method": "POST",
        "uri": "/v1/messages",
        "headers": {"content-type": "application/json"},
        "body": body,
    })
}

#[test]
fn neither_mode_is_on_unless_its_variable_is_set() {
    assert!(matches!(Mode::from_values(None, None), Mode::Off));
    assert!(matches!(Mode::from_values(Some("  "), Some("")), Mode::Off));
    assert!(Mode::from_values(None, None).announcement().is_none());
}

#[test]
fn each_mode_announces_itself_in_the_run_output() {
    let recording = Mode::from_values(Some("/tmp/session.lino"), None);
    let replay = Mode::from_values(None, Some("/tmp/session.lino"));
    let recorded = recording
        .announcement()
        .expect("recording announces itself");
    let replayed = replay.announcement().expect("replay announces itself");
    assert!(recorded.contains("/tmp/session.lino"), "{recorded}");
    assert!(recorded.to_lowercase().contains("record"), "{recorded}");
    assert!(replayed.contains("no upstream call"), "{replayed}");
    assert!(replay.is_replay());
    assert!(!recording.is_replay());
}

#[test]
fn recording_wins_when_both_variables_are_set_so_evidence_is_not_overwritten() {
    assert!(matches!(
        Mode::from_values(Some("/tmp/out.lino"), Some("/tmp/in.lino")),
        Mode::Record(_)
    ));
}

#[test]
fn a_recording_round_trips_through_links_notation_with_its_provenance() {
    let directory = tempfile::tempdir().expect("temporary directory");
    let path = directory.path().join("nested").join("session.lino");
    let session = Session::recording(path.clone(), provenance());
    let first = turn(
        1,
        request_with_body(&json!({"model": "behaves-as-a-test-model", "messages": []})),
        &["event: message_start\ndata: {}\n\n"],
    );
    let second = turn(
        2,
        request_with_body(&json!({"messages": [{"role": "user", "content": "second"}]})),
        &["event: message_stop\ndata: {}\n\n"],
    );
    session.write_turn(&first);
    session.write_turn(&second);

    let text = std::fs::read_to_string(&path).expect("recording exists");
    assert!(
        text.starts_with("(#o ("),
        "a recording is links notation, not JSON: {}",
        text.lines().next().unwrap_or_default()
    );
    let loaded = store::load(&path).expect("recording loads");
    assert_eq!(loaded.provenance, provenance());
    assert_eq!(loaded.turns, vec![first, second]);
}

#[test]
fn a_torn_final_line_does_not_cost_the_turns_before_it() {
    let directory = tempfile::tempdir().expect("temporary directory");
    let path = directory.path().join("session.lino");
    let session = Session::recording(path.clone(), provenance());
    session.write_turn(&turn(
        1,
        request_with_body(&json!({"a": 1})),
        &["data: 1\n\n"],
    ));
    std::fs::write(
        &path,
        format!(
            "{}(#o (\"phase\" \"turn\") (\"request\" (#o (\"met",
            std::fs::read_to_string(&path).expect("recording exists")
        ),
    )
    .expect("append a torn line");

    let loaded = store::load(&path).expect("recording still loads");
    assert_eq!(loaded.turns.len(), 1);
}

#[test]
fn a_recording_without_a_header_is_refused_rather_than_replayed_blind() {
    let directory = tempfile::tempdir().expect("temporary directory");
    let path = directory.path().join("headless.lino");
    store::append_line(&path, &store::turn_line(&turn(1, json!({}), &[]))).expect("write a turn");

    assert!(matches!(
        Session::replaying(path),
        Err(LoadError::MissingHeader)
    ));
}

#[test]
fn credentials_never_reach_the_recorded_bytes() {
    let mut headers = HeaderMap::new();
    for (name, value) in [
        ("authorization", "Bearer sk-ant-oat01-do-not-commit-me"),
        ("x-api-key", "sk-ant-api03-also-do-not-commit-me"),
        ("cookie", "session=super-secret-cookie-value"),
    ] {
        headers.insert(
            HeaderName::try_from(name).expect("header name"),
            HeaderValue::from_static(value),
        );
    }
    let body = br#"{"model":"behaves-as-a-test-model","api_key":"sk-ant-api03-in-the-body",
        "messages":[{"role":"user","content":"hi"}]}"#;
    let request = recorded_request(
        &axum::http::Method::POST,
        &"/v1/messages?key=sk-ant-secret".parse().expect("a uri"),
        &headers,
        body,
        true,
    );
    let directory = tempfile::tempdir().expect("temporary directory");
    let path = directory.path().join("redacted.lino");
    let session = Session::recording(path.clone(), provenance());
    session.write_turn(&turn(1, request, &["data: {}\n\n"]));

    let bytes = std::fs::read(&path).expect("recording exists");
    let text = String::from_utf8_lossy(&bytes);
    for secret in [
        "sk-ant-oat01-do-not-commit-me",
        "sk-ant-api03-also-do-not-commit-me",
        "super-secret-cookie-value",
        "sk-ant-api03-in-the-body",
        "sk-ant-secret",
    ] {
        assert!(
            !text.contains(secret),
            "recorded bytes leaked a credential: {secret}"
        );
    }
    // The header still has to be present as a name, or a replay could not tell a
    // client that sent no credential from one that sent the wrong one.
    assert!(text.contains("authorization"), "{text}");
}

#[test]
fn a_bodiless_request_records_absence_rather_than_an_empty_body() {
    let request = recorded_request(
        &axum::http::Method::GET,
        &"/api/health".parse().expect("a uri"),
        &HeaderMap::new(),
        b"",
        false,
    );
    assert_eq!(request["body"], Value::Null);
    let empty = recorded_request(
        &axum::http::Method::POST,
        &"/v1/messages".parse().expect("a uri"),
        &HeaderMap::new(),
        b"",
        true,
    );
    assert_eq!(empty["body"], Value::String(String::new()));
}

#[test]
fn an_identical_request_matches_its_recorded_turn() {
    let recorded = request_with_body(&json!({"messages": [{"role": "user", "content": "one"}]}));
    assert!(matching::describe_difference(&recorded, &recorded.clone()).is_none());
}

#[test]
fn a_changed_second_message_names_the_field_that_moved() {
    let recorded = request_with_body(&json!({
        "messages": [
            {"role": "user", "content": "one"},
            {"role": "user", "content": "two"},
        ]
    }));
    let incoming = request_with_body(&json!({
        "messages": [
            {"role": "user", "content": "one"},
            {"role": "user", "content": "something else entirely"},
        ]
    }));

    let difference = matching::describe_difference(&recorded, &incoming)
        .expect("a changed message is a mismatch");
    assert!(
        difference.contains("body.messages[1].content"),
        "the report must name the field, not just say 'mismatch': {difference}"
    );
    assert!(
        difference.contains("something else entirely"),
        "{difference}"
    );
}

#[test]
fn a_dropped_field_is_named_as_missing() {
    let recorded = request_with_body(&json!({"stream": true, "max_tokens": 1024}));
    let incoming = request_with_body(&json!({"stream": true}));

    let difference =
        matching::describe_difference(&recorded, &incoming).expect("a dropped field is a mismatch");
    assert!(difference.contains("body.max_tokens"), "{difference}");
    assert!(difference.contains("missing"), "{difference}");
}

#[test]
fn a_reordered_tool_result_is_a_mismatch() {
    let ordered = |first: &str, second: &str| {
        request_with_body(&json!({
            "messages": [{
                "role": "user",
                "content": [
                    {"type": "tool_result", "tool_use_id": first},
                    {"type": "tool_result", "tool_use_id": second},
                ],
            }],
        }))
    };

    let difference = matching::describe_difference(&ordered("a", "b"), &ordered("b", "a"))
        .expect("reordering tool results is a mismatch");
    assert!(
        difference.contains("body.messages[0].content[0].tool_use_id"),
        "{difference}"
    );
}

#[test]
fn an_extra_field_the_recording_never_saw_is_a_mismatch() {
    let recorded = request_with_body(&json!({"stream": true}));
    let incoming = request_with_body(&json!({"stream": true, "thinking": {"type": "enabled"}}));

    let difference = matching::describe_difference(&recorded, &incoming)
        .expect("an added field is a divergence too");
    assert!(difference.contains("body.thinking"), "{difference}");
    assert!(difference.contains("not in the recording"), "{difference}");
}

#[test]
fn transport_bookkeeping_headers_do_not_decide_a_match() {
    for ignored in ["authorization", "content-length", "host", "x-request-id"] {
        assert!(
            !matching::header_is_compared(ignored),
            "{ignored} would make every replay fail for a reason unrelated to the exchange"
        );
    }
    for compared in ["anthropic-beta", "anthropic-version", "content-type"] {
        assert!(
            matching::header_is_compared(compared),
            "{compared} changes what the upstream is being asked for and must be matched"
        );
    }
}

#[test]
fn a_dropped_beta_header_names_the_header() {
    let mut recorded = request_with_body(&json!({}));
    recorded["headers"]["anthropic-beta"] = json!("tools-2024-04-04");
    let incoming = request_with_body(&json!({}));

    let difference = matching::describe_difference(&recorded, &incoming)
        .expect("a dropped beta header is a mismatch");
    assert!(difference.contains("header anthropic-beta"), "{difference}");
}

#[test]
fn a_long_value_is_abbreviated_rather_than_pasted_whole_into_the_report() {
    let recorded = request_with_body(&json!({"system": "x".repeat(4000)}));
    let incoming = request_with_body(&json!({"system": "y".repeat(4000)}));

    let difference = matching::describe_difference(&recorded, &incoming).expect("a mismatch");
    assert!(
        difference.len() < 1000,
        "report was {} bytes",
        difference.len()
    );
    assert!(difference.contains("4000 characters"), "{difference}");
}

#[test]
fn replay_serves_turns_in_order_and_the_same_way_twice() {
    let directory = tempfile::tempdir().expect("temporary directory");
    let path = directory.path().join("session.lino");
    let first = request_with_body(&json!({"messages": [{"role": "user", "content": "one"}]}));
    let second = request_with_body(&json!({"messages": [{"role": "user", "content": "two"}]}));
    let writer = Session::recording(path.clone(), provenance());
    writer.write_turn(&turn(1, first.clone(), &["data: first\n\n"]));
    writer.write_turn(&turn(2, second.clone(), &["data: second\n\n"]));

    // Two independent sessions over the same file, which is what "replays
    // identically twice" has to mean: no state survives outside the recording.
    for pass in 1..=2 {
        let session = Arc::new(Session::replaying(path.clone()).expect("recording loads"));
        assert_eq!(session.turn_count(), 2);
        for (position, request) in [(1, &first), (2, &second)] {
            let response = replay_turn(&session, position, request);
            assert_eq!(
                response.status(),
                StatusCode::OK,
                "pass {pass} turn {position} did not replay"
            );
            assert_eq!(
                response
                    .headers()
                    .get(REPLAY_TURN_HEADER)
                    .and_then(|value| value.to_str().ok()),
                Some(position.to_string().as_str())
            );
        }
        // Past the end the replay refuses rather than repeating the last turn.
        assert_eq!(
            replay_turn(&session, 3, &first).status(),
            StatusCode::BAD_GATEWAY
        );
    }
}

#[tokio::test]
async fn a_replay_mismatch_names_the_turn_the_provenance_and_the_difference() {
    let directory = tempfile::tempdir().expect("temporary directory");
    let path = directory.path().join("session.lino");
    let first = request_with_body(&json!({"messages": [{"role": "user", "content": "one"}]}));
    let writer = Session::recording(path.clone(), provenance());
    writer.write_turn(&turn(1, first.clone(), &["data: first\n\n"]));
    writer.write_turn(&turn(
        2,
        request_with_body(&json!({"messages": [{"role": "user", "content": "two"}]})),
        &["data: second\n\n"],
    ));
    let session = Arc::new(Session::replaying(path).expect("recording loads"));

    assert_eq!(replay_turn(&session, 1, &first).status(), StatusCode::OK);
    let diverged =
        request_with_body(&json!({"messages": [{"role": "user", "content": "elsewhere"}]}));
    let response = replay_turn(&session, 2, &diverged);
    assert_eq!(response.status(), StatusCode::BAD_GATEWAY);
    let bytes = axum::body::to_bytes(response.into_body(), 1 << 20)
        .await
        .expect("failure body");
    let body = String::from_utf8_lossy(&bytes).into_owned();
    assert!(body.contains("turn 2"), "the turn must be named: {body}");
    assert!(
        body.contains("9.9.9"),
        "the router version must be named: {body}"
    );
    assert!(
        body.contains("anthropic"),
        "the provider must be named: {body}"
    );
    assert!(
        body.contains("body.messages[0].content"),
        "the difference must be named: {body}"
    );
}

#[tokio::test]
async fn a_replayed_turn_reproduces_the_recorded_bytes_and_drops_stale_framing() {
    let mut replayed = turn(
        1,
        request_with_body(&json!({})),
        &["event: a\ndata: 1\n\n", "event: b\ndata: 2\n\n"],
    );
    replayed
        .headers
        .push(("content-length".to_string(), "9999".to_string()));
    let response = served_response(&replayed, 1);

    assert!(
        response.headers().get("content-length").is_none(),
        "recorded framing would truncate the replayed answer"
    );
    assert_eq!(
        response
            .headers()
            .get("content-type")
            .and_then(|value| value.to_str().ok()),
        Some("text/event-stream")
    );
    let bytes = axum::body::to_bytes(response.into_body(), 1 << 20)
        .await
        .expect("replayed body");
    let body = String::from_utf8_lossy(&bytes).into_owned();
    assert_eq!(body, "event: a\ndata: 1\n\nevent: b\ndata: 2\n\n");
}

#[test]
fn a_stream_is_recorded_as_ordered_events_that_reassemble_to_the_original_bytes() {
    let original = "event: message_start\ndata: {\"type\":\"message_start\"}\n\n\
                    event: content_block_delta\ndata: {\"delta\":\"世界\"}\n\n\
                    event: message_stop\ndata: {}\n\n";
    let events = split_events(original.as_bytes(), true);

    assert_eq!(events.len(), 3, "{events:?}");
    assert!(events[0].contains("message_start"));
    assert!(
        events[1].contains("世界"),
        "a split scalar must not be mangled"
    );
    assert!(events[2].contains("message_stop"));
    assert_eq!(events.concat(), original);
}

#[test]
fn a_non_streamed_body_is_one_event_and_an_empty_one_is_none() {
    assert_eq!(
        split_events(b"{\"id\":\"msg_1\"}", false),
        vec!["{\"id\":\"msg_1\"}".to_string()]
    );
    assert!(split_events(b"", false).is_empty());
}

#[test]
fn a_stream_cut_mid_frame_keeps_its_tail() {
    let events = split_events(b"event: a\ndata: 1\n\nevent: b\ndata: trunc", true);
    assert_eq!(events.len(), 2);
    assert_eq!(events[1], "event: b\ndata: trunc");
}
