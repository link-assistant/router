//! Tests for [`crate::log_analysis`].

use super::*;

fn write_log(root: &Path, token: &str, records: &[Value]) {
    let directory = root.join(token);
    std::fs::create_dir_all(&directory).expect("create token directory");
    let contents = records
        .iter()
        .map(|record| serde_json::to_string(record).expect("serialize"))
        .collect::<Vec<_>>()
        .join("\n");
    std::fs::write(directory.join("requests.jsonl"), contents + "\n").expect("write log");
}

/// The false negative from issue #234: searching for `error|warn` found nothing
/// because a stream dying mid-flight is logged at `INFO`. The analyser reads
/// the terminal record instead, so it finds what a text search cannot.
#[test]
fn a_truncated_stream_is_found_without_searching_for_error_text() {
    let root = tempfile::tempdir().expect("temporary log root");
    write_log(
        root.path(),
        "tokenhash",
        &[
            json!({"correlation_id": "a", "phase": "client_request", "uri": "/v1/messages"}),
            json!({"correlation_id": "a", "phase": "client_response", "status": 200}),
            json!({"correlation_id": "a", "phase": "upstream_response_body", "body": "data: x"}),
            json!({
                "correlation_id": "a",
                "phase": "stream_end",
                "outcome": "ended_without_terminator",
                "complete": false,
                "frames": 444
            }),
        ],
    );

    let (exchanges, unparsable, _) = read_exchanges(root.path(), None).expect("read the log");
    assert_eq!(unparsable, 0);
    let summary = summarise(&exchanges, unparsable, 0);
    assert_eq!(summary.incomplete_streams, 1, "{summary:?}");
    // Status alone says the opposite, which is the whole point.
    assert_eq!(summary.statuses.get(&200).copied(), Some(1));

    let found = anomalies(&exchanges);
    let cut = found
        .iter()
        .find(|anomaly| anomaly.kind == "stream_ended_without_terminator")
        .expect("the truncated stream is named");
    assert_eq!(cut.correlation_ids, vec!["a".to_string()]);
}

/// The false positive from issue #234: counting streams without `message_stop`
/// as a substring reported 100%, because compressed bodies cannot contain it.
/// A compressed body is reported as undecodable, never as a missing terminator.
#[test]
fn a_compressed_body_is_reported_as_undecodable_not_as_a_failure() {
    let root = tempfile::tempdir().expect("temporary log root");
    write_log(
        root.path(),
        "tokenhash",
        &[
            json!({"correlation_id": "b", "phase": "client_request", "uri": "/v1/messages"}),
            json!({"correlation_id": "b", "phase": "client_response", "status": 200}),
            json!({
                "correlation_id": "b",
                "phase": "upstream_response_body",
                "body": {"base64": "H4sIAAAA", "bytes": 6}
            }),
            json!({
                "correlation_id": "b",
                "phase": "stream_end",
                "outcome": "completed",
                "complete": true,
                "frames": 1
            }),
        ],
    );

    let (exchanges, unparsable, _) = read_exchanges(root.path(), None).expect("read");
    let summary = summarise(&exchanges, unparsable, 0);
    // The turn completed: the compressed body must not make it look truncated.
    assert_eq!(summary.incomplete_streams, 0, "{summary:?}");
    assert_eq!(summary.undecodable_bodies, 1);

    let found = anomalies(&exchanges);
    assert!(
        found
            .iter()
            .any(|anomaly| anomaly.kind == "undecodable_bodies"),
        "undecodable bodies must be stated, not silently ignored"
    );
    assert!(
        !found
            .iter()
            .any(|anomaly| anomaly.kind == "stream_ended_without_terminator"),
        "a completed stream must not be reported as truncated"
    );
}

/// Records the analyser cannot parse are counted rather than skipped: silence
/// about unreadable data is what produced the original false positive.
#[test]
fn unparsable_records_are_reported() {
    let root = tempfile::tempdir().expect("temporary log root");
    let directory = root.path().join("tokenhash");
    std::fs::create_dir_all(&directory).expect("create");
    std::fs::write(
        directory.join("requests.jsonl"),
        "{\"correlation_id\":\"c\",\"phase\":\"client_response\",\"status\":200}\nnot json\n",
    )
    .expect("write");

    let (exchanges, unparsable, _) = read_exchanges(root.path(), None).expect("read");
    assert_eq!(unparsable, 1);
    let rendered = summarise(&exchanges, unparsable, 0).render();
    assert!(rendered.contains("1 unparsable"), "{rendered}");
}

/// Repeated authentication failures are misconfiguration, and are named as
/// such rather than left to be read out of a status histogram.
#[test]
fn repeated_authentication_failures_are_named() {
    let root = tempfile::tempdir().expect("temporary log root");
    write_log(
        root.path(),
        "tokenhash",
        &[
            json!({"correlation_id": "d", "phase": "client_response", "status": 401}),
            json!({"correlation_id": "e", "phase": "client_response", "status": 401}),
        ],
    );
    let (exchanges, _, _) = read_exchanges(root.path(), None).expect("read");
    let found = anomalies(&exchanges);
    let refused = found
        .iter()
        .find(|anomaly| anomaly.kind == "repeated_authentication_failure")
        .expect("named");
    assert_eq!(refused.correlation_ids.len(), 2);
}

/// A healthy log yields no anomalies, so the command works as a health gate.
#[test]
fn a_healthy_log_reports_nothing() {
    let root = tempfile::tempdir().expect("temporary log root");
    write_log(
        root.path(),
        "tokenhash",
        &[
            json!({"correlation_id": "f", "phase": "client_response", "status": 200}),
            json!({
                "correlation_id": "f",
                "phase": "stream_end",
                "outcome": "completed",
                "complete": true,
                "frames": 3
            }),
        ],
    );
    let (exchanges, _, _) = read_exchanges(root.path(), None).expect("read");
    assert!(anomalies(&exchanges).is_empty());
}

/// One exchange can be rendered in full, which is what closes the loop from a
/// named correlation id back to the records.
#[test]
fn a_single_exchange_can_be_shown() {
    let root = tempfile::tempdir().expect("temporary log root");
    write_log(
        root.path(),
        "tokenhash",
        &[
            json!({"correlation_id": "g", "phase": "client_request", "uri": "/v1/messages"}),
            json!({"correlation_id": "h", "phase": "client_request", "uri": "/other"}),
        ],
    );
    let rendered = show(root.path(), None, "g").expect("show");
    assert!(rendered.contains("/v1/messages"), "{rendered}");
    assert!(!rendered.contains("/other"), "{rendered}");
    let missing = show(root.path(), None, "nope").expect("show");
    assert!(missing.contains("no records"), "{missing}");
}

/// The bug in issue #252: a complete non-streamed exchange was counted as a
/// stream whose ending is unknown.
///
/// Six phases, both statuses 200, both bodies recorded, and a JSON
/// `content-type`. A non-streamed response has no dialect terminator by
/// construction, so "no terminal record" is the expected shape, not an anomaly.
#[test]
fn a_complete_non_streamed_exchange_is_not_an_anomaly() {
    let root = tempfile::tempdir().expect("temporary log root");
    write_log(
        root.path(),
        "tokenhash",
        &[
            json!({"correlation_id": "j", "phase": "client_request", "uri": "/v1/messages"}),
            json!({"correlation_id": "j", "phase": "upstream_request"}),
            json!({
                "correlation_id": "j",
                "phase": "upstream_response",
                "status": 200,
                "headers": {"content-type": "application/json"}
            }),
            json!({"correlation_id": "j", "phase": "upstream_response_body", "body": "{\"ok\":true}"}),
            json!({
                "correlation_id": "j",
                "phase": "client_response",
                "status": 200,
                "headers": {"content-type": "application/json"}
            }),
            json!({"correlation_id": "j", "phase": "client_response_body", "body": "{\"ok\":true}"}),
        ],
    );

    let (exchanges, unparsable, _) = read_exchanges(root.path(), None).expect("read the log");
    assert_eq!(unparsable, 0);

    let summary = summarise(&exchanges, unparsable, 0);
    assert_eq!(
        summary.streamed, 0,
        "a JSON response is not a stream: {summary:?}"
    );
    assert_eq!(summary.unterminated_streams, 0, "{summary:?}");
    assert_eq!(summary.incomplete_streams, 0, "{summary:?}");

    let found = anomalies(&exchanges);
    assert!(
        found.is_empty(),
        "a complete non-streamed exchange must raise nothing: {found:?}"
    );
}

/// The case from the issue comment: a gzip-compressed non-streamed reply.
///
/// The compressed body arrives in several transfer chunks, and counting those
/// as SSE frames reported a truncated stream — and emitted a WARN — for a
/// request that succeeded. A test written only against an uncompressed JSON
/// response would pass while this kept happening.
#[test]
fn a_gzip_compressed_json_reply_is_not_a_truncated_stream() {
    let root = tempfile::tempdir().expect("temporary log root");
    write_log(
        root.path(),
        "tokenhash",
        &[
            json!({"correlation_id": "g", "phase": "client_request", "uri": "/v1/messages"}),
            json!({
                "correlation_id": "g",
                "phase": "upstream_response",
                "status": 200,
                "headers": {"content-type": "application/json", "content-encoding": "gzip"}
            }),
            // Two transfer chunks of one compressed body, not two stream frames.
            json!({"correlation_id": "g", "phase": "upstream_response_body", "body": {"base64": "H4sIAAAAAAAA"}}),
            json!({"correlation_id": "g", "phase": "upstream_response_body", "body": {"base64": "A/3VRy07DMBD8"}}),
            json!({
                "correlation_id": "g",
                "phase": "client_response",
                "status": 200,
                "headers": {"content-type": "application/json", "content-encoding": "gzip"}
            }),
            json!({
                "correlation_id": "g",
                "phase": "stream_end",
                "outcome": "ended_without_terminator",
                "complete": false,
                "frames": 2
            }),
        ],
    );

    let (exchanges, unparsable, _) = read_exchanges(root.path(), None).expect("read the log");
    let summary = summarise(&exchanges, unparsable, 0);

    assert_eq!(
        summary.streamed, 0,
        "a compressed JSON reply is not a stream: {summary:?}"
    );
    assert_eq!(summary.incomplete_streams, 0, "{summary:?}");
    assert_eq!(summary.unterminated_streams, 0, "{summary:?}");
    // `undecodable_bodies` is expected and correct here (issue #231): the log
    // says plainly that a compressed body cannot be inspected. What must not
    // appear is a verdict about how the "stream" ended, since there was none.
    let found = anomalies(&exchanges);
    assert!(
        !found
            .iter()
            .any(|anomaly| anomaly.kind.starts_with("stream_")
                || anomaly.kind == "no_terminal_record"),
        "a successful compressed reply must raise no stream verdict: {found:?}"
    );
}

/// A genuine SSE stream must still be classified as one — the fix must not
/// silence the detection issue #230 added.
#[test]
fn an_sse_response_is_still_a_stream() {
    let root = tempfile::tempdir().expect("temporary log root");
    write_log(
        root.path(),
        "tokenhash",
        &[
            json!({"correlation_id": "s", "phase": "client_request", "uri": "/v1/messages"}),
            json!({
                "correlation_id": "s",
                "phase": "client_response",
                "status": 200,
                "headers": {"content-type": "text/event-stream"}
            }),
            json!({"correlation_id": "s", "phase": "upstream_response_body", "body": "data: x"}),
            json!({
                "correlation_id": "s",
                "phase": "stream_end",
                "outcome": "ended_without_terminator",
                "complete": false,
                "frames": 12
            }),
        ],
    );

    let (exchanges, unparsable, _) = read_exchanges(root.path(), None).expect("read the log");
    let summary = summarise(&exchanges, unparsable, 0);

    assert_eq!(summary.streamed, 1, "{summary:?}");
    assert_eq!(
        summary.incomplete_streams, 1,
        "a truncated SSE stream must still be reported: {summary:?}"
    );
    let found = anomalies(&exchanges);
    assert!(
        found
            .iter()
            .any(|anomaly| anomaly.kind == "stream_ended_without_terminator"),
        "{found:?}"
    );
}

/// A media type with parameters is still recognised: servers commonly send
/// `text/event-stream; charset=utf-8`.
#[test]
fn a_parameterised_media_type_is_recognised() {
    let root = tempfile::tempdir().expect("temporary log root");
    write_log(
        root.path(),
        "tokenhash",
        &[
            json!({"correlation_id": "p", "phase": "client_request"}),
            json!({
                "correlation_id": "p",
                "phase": "client_response",
                "status": 200,
                "headers": {"content-type": "text/event-stream; charset=utf-8"}
            }),
            json!({"correlation_id": "p", "phase": "upstream_response_body", "body": "data: x"}),
        ],
    );

    let (exchanges, unparsable, _) = read_exchanges(root.path(), None).expect("read the log");

    assert_eq!(summarise(&exchanges, unparsable, 0).streamed, 1);
}

/// With no recorded media type, the request's `stream: true` decides — an older
/// log has no response headers, and must not silently lose its streams.
#[test]
fn a_requested_stream_counts_when_the_response_type_is_unknown() {
    let root = tempfile::tempdir().expect("temporary log root");
    write_log(
        root.path(),
        "tokenhash",
        &[
            json!({
                "correlation_id": "r",
                "phase": "client_request",
                "body": {"json": {"stream": true}}
            }),
            json!({"correlation_id": "r", "phase": "client_response", "status": 200}),
            json!({"correlation_id": "r", "phase": "upstream_response_body", "body": "data: x"}),
            json!({
                "correlation_id": "r",
                "phase": "stream_end",
                "outcome": "ended_without_terminator",
                "complete": false,
                "frames": 3
            }),
        ],
    );

    let (exchanges, unparsable, _) = read_exchanges(root.path(), None).expect("read the log");
    let summary = summarise(&exchanges, unparsable, 0);

    assert_eq!(summary.streamed, 1, "{summary:?}");
    assert_eq!(summary.incomplete_streams, 1, "{summary:?}");
}

/// A response that was not a stream outranks a request that asked for one: the
/// upstream may answer a `stream: true` request with a single JSON document.
#[test]
fn a_json_answer_to_a_streaming_request_is_not_a_stream() {
    let root = tempfile::tempdir().expect("temporary log root");
    write_log(
        root.path(),
        "tokenhash",
        &[
            json!({
                "correlation_id": "m",
                "phase": "client_request",
                "body": {"json": {"stream": true}}
            }),
            json!({
                "correlation_id": "m",
                "phase": "client_response",
                "status": 200,
                "headers": {"content-type": "application/json"}
            }),
            json!({"correlation_id": "m", "phase": "upstream_response_body", "body": "{}"}),
        ],
    );

    let (exchanges, unparsable, _) = read_exchanges(root.path(), None).expect("read the log");

    assert_eq!(
        summarise(&exchanges, unparsable, 0).streamed,
        0,
        "the response decides, not the request"
    );
}
