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

/// The case from issue #255: a gzip-compressed SSE stream that did complete.
///
/// The recorded frames are the compressed bytes that were relayed, so scanning
/// them for `message_stop` searches gzip and always fails. Counting that as a
/// missing terminator reported 315 of 400 streams as failing on a log whose
/// sampled exchanges had all succeeded.
#[test]
fn a_compressed_sse_stream_is_not_reported_as_truncated() {
    let root = tempfile::tempdir().expect("temporary log root");
    write_log(
        root.path(),
        "tokenhash",
        &[
            json!({
                "correlation_id": "z",
                "phase": "client_request",
                "uri": "/v1/messages?beta=true",
                "body": {"json": {"stream": true}}
            }),
            json!({
                "correlation_id": "z",
                "phase": "client_response",
                "status": 200,
                "headers": {
                    "content-type": "text/event-stream; charset=utf-8",
                    "content-encoding": "gzip"
                }
            }),
            json!({"correlation_id": "z", "phase": "upstream_response_body", "body": {"base64": "H4sIAAAAAAAA"}}),
            json!({
                "correlation_id": "z",
                "phase": "stream_end",
                "outcome": "encoded_not_verifiable",
                "streamed": true,
                "inspectable": false,
                "complete": false,
                "frames": 11
            }),
        ],
    );

    let (exchanges, unparsable, _) = read_exchanges(root.path(), None).expect("read the log");
    let summary = summarise(&exchanges, unparsable, 0);

    assert_eq!(summary.streamed, 1, "it is still a stream: {summary:?}");
    assert_eq!(
        summary.incomplete_streams, 0,
        "an unreadable stream is not a demonstrated truncation: {summary:?}"
    );
    assert_eq!(summary.unterminated_streams, 0, "{summary:?}");
    assert_eq!(
        summary.unverifiable_streams, 1,
        "it is reported as its own class: {summary:?}"
    );

    let found = anomalies(&exchanges);
    assert!(
        !found
            .iter()
            .any(|anomaly| anomaly.kind == "stream_ended_without_terminator"),
        "a healthy compressed stream must not be called truncated: {found:?}"
    );
    let named = found
        .iter()
        .find(|anomaly| anomaly.kind == "stream_not_verifiable")
        .expect("the unverifiable stream is named");
    assert_eq!(named.correlation_ids, vec!["z".to_string()]);
}

/// A compressed stream is recognised from the recorded headers alone, so a log
/// written before the relay stated `inspectable` is read correctly too.
#[test]
fn a_compressed_stream_is_recognised_from_its_headers() {
    let root = tempfile::tempdir().expect("temporary log root");
    write_log(
        root.path(),
        "tokenhash",
        &[
            json!({"correlation_id": "h", "phase": "client_request"}),
            json!({
                "correlation_id": "h",
                "phase": "client_response",
                "status": 200,
                "headers": {"content-type": "text/event-stream", "content-encoding": "gzip"}
            }),
            json!({"correlation_id": "h", "phase": "upstream_response_body", "body": {"base64": "H4sI"}}),
            json!({
                "correlation_id": "h",
                "phase": "stream_end",
                "outcome": "ended_without_terminator",
                "complete": false,
                "frames": 11
            }),
        ],
    );

    let (exchanges, unparsable, _) = read_exchanges(root.path(), None).expect("read the log");
    let summary = summarise(&exchanges, unparsable, 0);

    assert_eq!(summary.unverifiable_streams, 1, "{summary:?}");
    assert_eq!(summary.incomplete_streams, 0, "{summary:?}");
}

/// An uncompressed SSE stream that stops early must still be reported: this is
/// the signal from issue #230, and the fix must not silence it.
#[test]
fn an_uncompressed_truncated_stream_is_still_reported() {
    let root = tempfile::tempdir().expect("temporary log root");
    write_log(
        root.path(),
        "tokenhash",
        &[
            json!({"correlation_id": "t", "phase": "client_request"}),
            json!({
                "correlation_id": "t",
                "phase": "client_response",
                "status": 200,
                "headers": {"content-type": "text/event-stream"}
            }),
            json!({"correlation_id": "t", "phase": "upstream_response_body", "body": "data: x"}),
            json!({
                "correlation_id": "t",
                "phase": "stream_end",
                "outcome": "ended_without_terminator",
                "streamed": true,
                "inspectable": true,
                "complete": false,
                "frames": 444
            }),
        ],
    );

    let (exchanges, unparsable, _) = read_exchanges(root.path(), None).expect("read the log");
    let summary = summarise(&exchanges, unparsable, 0);

    assert_eq!(summary.incomplete_streams, 1, "{summary:?}");
    assert_eq!(summary.unverifiable_streams, 0, "{summary:?}");
    assert!(
        anomalies(&exchanges)
            .iter()
            .any(|anomaly| anomaly.kind == "stream_ended_without_terminator"),
        "a real truncation must still be named"
    );
}

/// Build a complete uncompressed SSE exchange with no `stream_end` record.
///
/// The relay writes that terminal record only on the Anthropic path, so an
/// `OpenAI` or Gemini stream reaches the log without one (issue #258).
fn stream_without_a_terminal_record(id: &str, uri: &str, body: &str) -> Vec<Value> {
    vec![
        json!({"correlation_id": id, "phase": "client_request", "uri": uri}),
        json!({
            "correlation_id": id,
            "phase": "client_response",
            "status": 200,
            "headers": {"content-type": "text/event-stream"}
        }),
        json!({"correlation_id": id, "phase": "upstream_response_body", "body": body}),
    ]
}

/// The bug in issue #258: a stream whose terminator is right there in the
/// recorded body was reported as ending in an unknown state.
///
/// 239 of 251 uncompressed streams carried a valid terminator, so the class was
/// ~95% healthy traffic — and the 12 that deserved attention were buried in it.
#[test]
fn a_terminator_in_the_recorded_body_settles_the_ending() {
    let root = tempfile::tempdir().expect("temporary log root");
    let mut records = Vec::new();
    // One per dialect, which is what the issue asks to pin at once.
    records.extend(stream_without_a_terminal_record(
        "openai",
        "/v1/chat/completions",
        "data: {\"choices\":[{\"delta\":{}}]}\n\ndata: [DONE]\n\n",
    ));
    records.extend(stream_without_a_terminal_record(
        "gemini",
        "/api/gemini/v1beta/models/gemini-2.0:streamGenerateContent",
        "data: {\"candidates\":[{\"content\":{\"parts\":[{\"text\":\"hi\"}]},\
         \"finishReason\":\"STOP\",\"index\":0}]}\n\n",
    ));
    records.extend(stream_without_a_terminal_record(
        "anthropic",
        "/v1/messages",
        "event: message_stop\ndata: {\"type\":\"message_stop\"}\n\n",
    ));
    records.extend(stream_without_a_terminal_record(
        "responses",
        "/v1/responses",
        "event: response.completed\ndata: {\"type\":\"response.completed\"}\n\n",
    ));
    write_log(root.path(), "tokenhash", &records);

    let (exchanges, unparsable, _) = read_exchanges(root.path(), None).expect("read the log");
    let summary = summarise(&exchanges, unparsable, 0);

    assert_eq!(summary.streamed, 4, "{summary:?}");
    assert_eq!(
        summary.unterminated_streams, 0,
        "every one of these carries its own dialect's terminator: {summary:?}"
    );
    let found = anomalies(&exchanges);
    assert!(
        !found
            .iter()
            .any(|anomaly| anomaly.kind == "no_terminal_record"),
        "a completed stream must not be reported as unknown: {found:?}"
    );
}

/// A readable stream with no terminator anywhere is still a genuine anomaly —
/// the 12 empty-bodied exchanges the issue says are worth alerting on.
#[test]
fn a_stream_with_no_terminator_is_still_reported() {
    let root = tempfile::tempdir().expect("temporary log root");
    write_log(
        root.path(),
        "tokenhash",
        &stream_without_a_terminal_record("empty", "/v1/chat/completions", ""),
    );

    let (exchanges, unparsable, _) = read_exchanges(root.path(), None).expect("read the log");
    let summary = summarise(&exchanges, unparsable, 0);

    assert_eq!(
        summary.unterminated_streams, 1,
        "an empty body settles nothing: {summary:?}"
    );
    assert!(
        anomalies(&exchanges)
            .iter()
            .any(|anomaly| anomaly.kind == "no_terminal_record"),
        "the genuinely unaccounted-for stream must still be named"
    );
}

/// A `stream_end` record still outranks the body scan when one is present.
///
/// The relay watched the frames go past; the analyser is reading what was
/// captured afterwards. Where they disagree, the relay's verdict wins.
#[test]
fn a_terminal_record_outranks_the_recorded_body() {
    let root = tempfile::tempdir().expect("temporary log root");
    let mut records = stream_without_a_terminal_record(
        "cut",
        "/v1/chat/completions",
        "data: {\"choices\":[{\"delta\":{}}]}\n\n",
    );
    records.push(json!({
        "correlation_id": "cut",
        "phase": "stream_end",
        "outcome": "ended_without_terminator",
        "streamed": true,
        "inspectable": true,
        "complete": false,
        "frames": 12
    }));
    write_log(root.path(), "tokenhash", &records);

    let (exchanges, unparsable, _) = read_exchanges(root.path(), None).expect("read the log");
    let summary = summarise(&exchanges, unparsable, 0);

    assert_eq!(
        summary.incomplete_streams, 1,
        "the relay saw the stream stop early: {summary:?}"
    );
    assert_eq!(summary.unterminated_streams, 0, "{summary:?}");
}

/// The terminator may be recorded on the client side rather than upstream, so
/// both body phases settle the question.
#[test]
fn a_client_side_body_can_settle_the_ending() {
    let root = tempfile::tempdir().expect("temporary log root");
    write_log(
        root.path(),
        "tokenhash",
        &[
            json!({"correlation_id": "c", "phase": "client_request", "uri": "/v1/chat/completions"}),
            json!({
                "correlation_id": "c",
                "phase": "client_response",
                "status": 200,
                "headers": {"content-type": "text/event-stream"}
            }),
            json!({"correlation_id": "c", "phase": "client_response_body", "body": "data: [DONE]\n\n"}),
        ],
    );

    let (exchanges, unparsable, _) = read_exchanges(root.path(), None).expect("read the log");

    assert_eq!(summarise(&exchanges, unparsable, 0).unterminated_streams, 0);
}

/// A compressed stream stays unverifiable rather than being settled by a
/// terminator that happens to appear in its base64 text (issue #255).
#[test]
fn a_compressed_body_is_not_settled_by_its_encoded_text() {
    let root = tempfile::tempdir().expect("temporary log root");
    write_log(
        root.path(),
        "tokenhash",
        &[
            json!({"correlation_id": "gz", "phase": "client_request", "uri": "/v1/messages"}),
            json!({
                "correlation_id": "gz",
                "phase": "client_response",
                "status": 200,
                "headers": {"content-type": "text/event-stream", "content-encoding": "gzip"}
            }),
            json!({"correlation_id": "gz", "phase": "upstream_response_body", "body": {"base64": "bWVzc2FnZV9zdG9w"}}),
        ],
    );

    let (exchanges, unparsable, _) = read_exchanges(root.path(), None).expect("read the log");
    let summary = summarise(&exchanges, unparsable, 0);

    assert_eq!(summary.unverifiable_streams, 1, "{summary:?}");
    assert_eq!(summary.unterminated_streams, 0, "{summary:?}");
}

/// Unparsable lines are counted rather than silently skipped, and the readable
/// records around them are still assembled.
#[test]
fn a_damaged_line_does_not_discard_the_records_around_it() {
    let root = tempfile::tempdir().expect("temporary log root");
    let directory = root.path().join("tokenhash");
    std::fs::create_dir_all(&directory).expect("create token directory");
    std::fs::write(
        directory.join("requests.jsonl"),
        "{\"correlation_id\":\"ok\",\"phase\":\"client_response\",\"status\":200}\n\
         not json at all\n\
         \n\
         {\"correlation_id\":\"ok\",\"phase\":\"upstream_response_body\",\"body\":\"data: [DONE]\"}\n",
    )
    .expect("write log");

    let (exchanges, unparsable, bytes) = read_exchanges(root.path(), None).expect("read the log");

    assert_eq!(unparsable, 1, "the damaged line is counted");
    assert!(bytes > 0, "the bytes read are reported");
    assert_eq!(exchanges.len(), 1, "the readable records still assemble");
    assert_eq!(exchanges[0].correlation_id, "ok");
}

/// A token filter narrows the analysis to one token's directory, so a busy
/// store can be examined one caller at a time.
#[test]
fn a_token_filter_selects_one_directory() {
    let root = tempfile::tempdir().expect("temporary log root");
    write_log(
        root.path(),
        "aaaa",
        &[json!({"correlation_id": "a", "phase": "client_response", "status": 200})],
    );
    write_log(
        root.path(),
        "bbbb",
        &[json!({"correlation_id": "b", "phase": "client_response", "status": 500})],
    );

    let (all, _, _) = read_exchanges(root.path(), None).expect("read every token");
    assert_eq!(all.len(), 2);

    let (one, _, _) = read_exchanges(root.path(), Some("aaaa")).expect("read one token");
    assert_eq!(one.len(), 1, "only the named token is read");
    assert_eq!(one[0].correlation_id, "a");
}

/// A log directory that does not exist is not readable data, and must not be
/// reported as a healthy empty store.
#[test]
fn a_missing_root_yields_nothing() {
    let (exchanges, unparsable, bytes) =
        read_exchanges(std::path::Path::new("/nonexistent-log-root-258"), None)
            .expect("a missing root is not an error");

    assert!(exchanges.is_empty());
    assert_eq!(unparsable, 0);
    assert_eq!(bytes, 0);
}

/// A compressed stream that finished is reported as finished.
///
/// `stream_not_verifiable` was a refusal to decompress, not a limit: the bytes
/// are ordinary gzip or brotli and decode to readable SSE, yet 1163 of ~1600
/// exchanges on a real deployment were declared unknowable — every streamed
/// one among them, so the log was blind to truncation on the majority of
/// traffic (issue #328).
#[test]
fn a_compressed_stream_is_decoded_and_its_ending_reported() {
    use std::io::Write as _;

    let sse = "event: message_start\ndata: {\"type\":\"message_start\"}\n\n\
               event: message_stop\ndata: {\"type\":\"message_stop\"}\n\n";
    let gzip = |plain: &str| {
        let mut encoder = flate2::write::GzEncoder::new(Vec::new(), flate2::Compression::default());
        encoder.write_all(plain.as_bytes()).expect("gzip");
        base64::Engine::encode(
            &base64::engine::general_purpose::STANDARD,
            encoder.finish().expect("gzip"),
        )
    };
    let brotli = |plain: &str| {
        let mut encoded = Vec::new();
        let mut writer = brotli::CompressorWriter::new(&mut encoded, 4096, 5, 22);
        writer.write_all(plain.as_bytes()).expect("brotli");
        drop(writer);
        base64::Engine::encode(&base64::engine::general_purpose::STANDARD, encoded)
    };

    // `br` is what the vendor actually returns on this traffic, so gzip alone
    // would have left most exchanges unreadable.
    for (encoding, body) in [("gzip", gzip(sse)), ("br", brotli(sse))] {
        let root = tempfile::tempdir().expect("temporary log root");
        write_log(
            root.path(),
            "tokenhash",
            &[
                json!({
                    "correlation_id": "z",
                    "phase": "client_request",
                    "uri": "/v1/messages?beta=true",
                    "body": {"json": {"stream": true}}
                }),
                json!({
                    "correlation_id": "z",
                    "phase": "client_response",
                    "status": 200,
                    "headers": {
                        "content-type": "text/event-stream; charset=utf-8",
                        "content-encoding": encoding
                    }
                }),
                json!({
                    "correlation_id": "z",
                    "phase": "upstream_response_body",
                    "body": {"base64": body}
                }),
                json!({
                    "correlation_id": "z",
                    "phase": "stream_end",
                    "outcome": "encoded_not_verifiable",
                    "streamed": true,
                    "inspectable": false,
                    "complete": false,
                    "frames": 2
                }),
            ],
        );

        let (exchanges, unparsable, _) = read_exchanges(root.path(), None).expect("read the log");
        let summary = summarise(&exchanges, unparsable, 0);
        assert_eq!(
            summary.unverifiable_streams, 0,
            "{encoding}: a stream the router can decode is not unknowable"
        );
        let found = anomalies(&exchanges);
        assert!(
            found
                .iter()
                .all(|anomaly| anomaly.kind != "stream_not_verifiable"),
            "{encoding}: nothing is unverifiable once it has been read"
        );
        assert!(
            found.is_empty(),
            "{encoding}: a stream that finished normally is not an anomaly: {found:?}"
        );
    }
}

/// A compressed stream cut before its terminator is still reported truncated.
///
/// The point of decoding is not to declare everything healthy — it is to tell
/// the two apart. `complete: false` on an unchecked stream produced exactly
/// the false negatives issue #234 was filed about.
#[test]
fn a_compressed_stream_cut_short_is_reported_as_such() {
    use std::io::Write as _;

    let mut encoder = flate2::write::GzEncoder::new(Vec::new(), flate2::Compression::default());
    encoder
        .write_all(b"event: message_start\ndata: {\"type\":\"message_start\"}\n\n")
        .expect("gzip");
    encoder.flush().expect("flush");
    let complete = encoder.finish().expect("gzip");
    // Drop the end-of-stream marker: what a capture cut mid-flight looks like.
    let cut = &complete[..complete.len() - 8];

    let root = tempfile::tempdir().expect("temporary log root");
    write_log(
        root.path(),
        "tokenhash",
        &[
            json!({
                "correlation_id": "z",
                "phase": "client_request",
                "uri": "/v1/messages?beta=true",
                "body": {"json": {"stream": true}}
            }),
            json!({
                "correlation_id": "z",
                "phase": "client_response",
                "status": 200,
                "headers": {
                    "content-type": "text/event-stream; charset=utf-8",
                    "content-encoding": "gzip"
                }
            }),
            json!({
                "correlation_id": "z",
                "phase": "upstream_response_body",
                "body": {"base64": base64::Engine::encode(
                    &base64::engine::general_purpose::STANDARD, cut)}
            }),
            json!({
                "correlation_id": "z",
                "phase": "stream_end",
                "outcome": "encoded_not_verifiable",
                "streamed": true,
                "inspectable": false,
                "complete": false,
                "frames": 1
            }),
        ],
    );

    let (exchanges, unparsable, _) = read_exchanges(root.path(), None).expect("read the log");
    let summary = summarise(&exchanges, unparsable, 0);
    assert_eq!(
        summary.unverifiable_streams, 0,
        "the frames were read, so the ending is knowable either way"
    );
    let found = anomalies(&exchanges);
    assert!(
        found
            .iter()
            .any(|anomaly| anomaly.correlation_ids.iter().any(|id| id == "z")),
        "a stream cut before its terminator must be reported: {found:?}"
    );
}
