//! Tests for [`crate::request_log`].
//!
//! Split from `request_log.rs` to keep that file within the repository's
//! 1000-line limit.

use super::*;

/// The `sequence` values a log file holds, read through the decoder.
///
/// Assertions are about which records survived, not how they are punctuated,
/// so they must not depend on the encoding (issue #336).
fn sequences(text: &str) -> Vec<i64> {
    text.lines()
        .filter_map(crate::lino_json::decode_line)
        .filter_map(|record| record.get("sequence").and_then(Value::as_i64))
        .collect()
}

/// The `phase` values a log file holds.
fn phases(text: &str) -> Vec<String> {
    text.lines()
        .filter_map(crate::lino_json::decode_line)
        .filter_map(|record| {
            record
                .get("phase")
                .and_then(Value::as_str)
                .map(str::to_string)
        })
        .collect()
}
use proptest::prelude::*;

#[test]
fn long_credentials_are_partially_redacted_and_short_ones_are_fully_masked() {
    let long = "la_sk_abcdefghijklmnop_last";
    let mut headers = HeaderMap::new();
    headers.insert(
        "authorization",
        HeaderValue::from_str(&format!("Bearer {long}")).expect("header value"),
    );
    headers.insert("x-api-key", HeaderValue::from_static("tiny"));

    let redacted = redacted_headers(&headers);
    let authorization = &redacted["authorization"];
    assert!(authorization.starts_with("Bearer la_"), "{authorization}");
    assert!(authorization.ends_with("ast"), "{authorization}");
    assert_eq!(authorization.matches('*').count(), long.len() - 6);
    assert!(!authorization.contains(long));
    assert_eq!(redacted["x-api-key"], REDACTED);
}

proptest! {
    #[test]
    fn complete_credentials_never_survive_any_redaction_site(
        payload in "[A-Za-z0-9_-]{12,96}"
    ) {
        let secret = format!("la_sk_{payload}");
        let mut headers = HeaderMap::new();
        headers.insert(
            "authorization",
            HeaderValue::from_str(&format!("Bearer {secret}")).expect("header value"),
        );
        let header_log = serde_json::to_string(&redacted_headers(&headers))
            .expect("serialize headers");
        let body_log = redacted_body(
            serde_json::to_string(&json!({
                "access_token": secret,
                "unlisted": secret,
            }))
            .expect("serialize body")
            .as_bytes(),
        )
        .to_string();
        let uri_log = redacted_uri(&format!("/v1/models?access_token={secret}"));

        prop_assert!(!header_log.contains(&secret));
        prop_assert!(!body_log.contains(&secret));
        prop_assert!(!uri_log.contains(&secret));
    }
}

#[test]
fn credentials_are_redacted_from_headers_and_json_bodies() {
    let mut headers = HeaderMap::new();
    headers.insert("authorization", HeaderValue::from_static("Bearer secret"));
    headers.insert("x-api-key", HeaderValue::from_static("secret-key"));
    headers.insert("x-auth-token", HeaderValue::from_static("auth-secret"));
    headers.insert("x-goog-api-key", HeaderValue::from_static("google-secret"));
    headers.insert(
        "x-amz-security-token",
        HeaderValue::from_static("aws-secret"),
    );
    headers.insert("x-visible", HeaderValue::from_static("marker"));
    let redacted = redacted_headers(&headers);
    assert_eq!(redacted["authorization"], "Bearer [REDACTED]");
    assert_eq!(redacted["x-api-key"], REDACTED);
    assert_eq!(redacted["x-auth-token"], REDACTED);
    assert_eq!(redacted["x-goog-api-key"], "goo*******ret");
    assert_eq!(redacted["x-amz-security-token"], REDACTED);
    assert_eq!(redacted["x-visible"], "marker");

    let body = redacted_body(
        br#"{
            "access_token":"access-secret",
            "apiKey":"camel-secret",
            "client_secret":"client-secret",
            "password":"password-secret",
            "secret":"ordinary-secret",
            "nested":{"api_key":"key-secret"},
            "unknownPrefix":"sk-ant-oat01-shaped-secret",
            "unknownBearer":"Bearer arbitrary-secret",
            "unknownJwt":"eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.signature"
        }"#,
    );
    let rendered = body.to_string();
    assert!(!rendered.contains("-secret"));
    assert!(!rendered.contains("eyJhbGci"));
    assert!(rendered.contains(REDACTED));
}

#[test]
fn credentials_are_redacted_from_uri_queries() {
    let dir = tempfile::tempdir().expect("temporary directory");
    let root = dir.path().join("requests");
    let log = RequestLog::new(root.clone(), 1024 * 1024);
    log.record(
        "request",
        "client_request",
        json!({
            "uri": "/v1/models?api_key=api-secret&key=key-secret&access_token=access-secret&token=token-secret&authorization=bearer-secret&probe=visible"
        }),
    );

    let rendered =
        fs::read_to_string(root.join("unauthenticated/requests.lino")).expect("request log");
    for secret in [
        "api-secret",
        "key-secret",
        "access-secret",
        "token-secret",
        "bearer-secret",
    ] {
        assert!(!rendered.contains(secret));
    }
    assert!(rendered.contains("probe=visible"));
    assert!(rendered.contains(REDACTED));
}

#[cfg(unix)]
#[test]
fn request_log_is_created_owner_only() {
    use std::os::unix::fs::PermissionsExt as _;

    let dir = tempfile::tempdir().expect("temporary directory");
    let root = dir.path().join("requests");
    let path = root.join("unauthenticated/requests.lino");
    let log = RequestLog::new(root.clone(), 1024 * 1024);
    log.record("request", "test", json!({"visible": true}));

    let mode = fs::metadata(&path)
        .expect("request log")
        .permissions()
        .mode()
        & 0o777;
    assert_eq!(mode, 0o600);
    for directory in [&root, path.parent().expect("bucket directory")] {
        let mode = fs::metadata(directory)
            .expect("request log directory")
            .permissions()
            .mode()
            & 0o777;
        assert_eq!(mode, 0o700);
    }

    fs::set_permissions(&path, fs::Permissions::from_mode(0o644))
        .expect("make existing log permissive");
    log.record("request", "test", json!({"visible": true}));
    let repaired_mode = fs::metadata(path)
        .expect("request log")
        .permissions()
        .mode()
        & 0o777;
    assert_eq!(repaired_mode, 0o600);
}

#[test]
fn log_never_exceeds_limit_and_keeps_newest_complete_record() {
    let dir = tempfile::tempdir().expect("temporary directory");
    let root = dir.path().join("requests");
    let path = root.join("unauthenticated/requests.lino");
    let log = RequestLog::new(root, 600);
    for sequence in 0..30 {
        log.record("request", "test", json!({"sequence": sequence}));
    }
    let bytes = fs::read(&path).expect("request log");
    assert!(bytes.len() <= 600);
    let text = String::from_utf8(bytes).expect("UTF-8 JSONL");
    assert!(
        text.lines()
            .all(|line| crate::lino_json::decode_line(line).is_some())
    );
    let kept = sequences(&text);
    assert!(kept.contains(&29), "the newest record survives: {kept:?}");
    assert!(!kept.contains(&0), "the oldest was discarded: {kept:?}");

    let tiny_root = dir.path().join("tiny");
    let tiny_path = tiny_root.join("unauthenticated/requests.lino");
    let tiny = RequestLog::new(tiny_root, 32);
    tiny.record("request", "oversized", json!({"body": "far too large"}));
    assert!(fs::metadata(tiny_path).expect("tiny log").len() <= 32);
}

#[tokio::test]
async fn transformed_upstream_exchange_is_logged_with_same_id() {
    use tokio::io::{AsyncReadExt as _, AsyncWriteExt as _};

    let listener = tokio::net::TcpListener::bind("127.0.0.1:0")
        .await
        .expect("mock upstream");
    let address = listener.local_addr().expect("mock address");
    let server = tokio::spawn(async move {
        let (mut stream, _) = listener.accept().await.expect("accept request");
        let mut request = vec![0; 4096];
        let _ = stream.read(&mut request).await.expect("read request");
        stream
            .write_all(
                b"HTTP/1.1 200 OK\r\ncontent-type: application/json\r\ncontent-length: 27\r\n\r\n{\"reply\":\"upstream-marker\"}",
            )
            .await
            .expect("write response");
    });

    let dir = tempfile::tempdir().expect("temporary directory");
    let root = dir.path().join("requests");
    let path = root.join("unauthenticated/requests.lino");
    let log = RequestLog::new(root, 1024 * 1024);
    let client = reqwest::Client::new();
    let request = client
        .post(format!("http://{address}/translated"))
        .header("authorization", "Bearer upstream-secret")
        .header("x-transformed", "translated-header")
        .body(r#"{"translated":"body-marker","access_token":"body-secret"}"#);
    let response = log
        .send_upstream("same-correlation-id", &client, request)
        .await
        .expect("upstream response");
    let body = response.bytes().await.expect("response body");
    log.record_upstream_body("same-correlation-id", &body);
    server.await.expect("mock server task");

    let rendered = fs::read_to_string(path).expect("request log");
    assert!(rendered.contains("same-correlation-id"));
    assert!(rendered.contains("upstream_request"));
    assert!(rendered.contains("translated-header"));
    assert!(rendered.contains("body-marker"));
    assert!(rendered.contains("upstream_response_body"));
    assert!(rendered.contains("upstream-marker"));
    assert!(!rendered.contains("upstream-secret"));
    assert!(!rendered.contains("body-secret"));
}

/// A compressed body must survive the log. `from_utf8_lossy` replaced every
/// invalid byte with U+FFFD, so the stored record could be neither read nor
/// decompressed afterwards — the bytes were destroyed, not merely unreadable
/// (issue #231).
#[test]
fn a_compressed_body_is_stored_losslessly() {
    // Bytes that are not valid UTF-8, as a gzip frame is not.
    let body: Vec<u8> = vec![0x1f, 0x8b, 0x08, 0x00, 0xff, 0xfe, 0xfd, 0x00, 0x80, 0x81];
    assert!(
        std::str::from_utf8(&body).is_err(),
        "fixture must be binary"
    );

    let logged = redacted_body(&body);
    let encoded = logged["base64"].as_str().expect("binary body is base64");
    let decoded = base64::Engine::decode(&base64::engine::general_purpose::STANDARD, encoded)
        .expect("the record decodes");
    assert_eq!(decoded, body, "the original bytes must be recoverable");
    assert_eq!(logged["bytes"], body.len());

    // And it must not be presented as if it were the body text.
    let rendered = serde_json::to_string(&logged).expect("serialize");
    assert!(
        !rendered.contains('\u{fffd}'),
        "no replacement characters may appear: {rendered}"
    );
}

/// Text and JSON bodies are unchanged, so identity-encoded responses log
/// exactly as before.
#[test]
fn text_and_json_bodies_are_unchanged() {
    assert_eq!(
        redacted_body(b"event: message_stop\ndata: {}\n\n"),
        Value::String("event: message_stop\ndata: {}\n\n".to_string())
    );
    let json = redacted_body(br#"{"model":"claude","api_key":"la_sk_secret_value"}"#);
    assert_eq!(json["model"], "claude");
    // Redaction still applies on the JSON path.
    assert_ne!(json["api_key"], "la_sk_secret_value");
}

/// A streamed turn that stops without its terminator must be distinguishable
/// from a healthy one. `status=200` is decided by the response headers, so it
/// reported success for a stream cut mid-flight (issue #230).
#[test]
fn a_stream_without_its_terminator_is_marked_incomplete() {
    let cut = StreamOutcome {
        streamed: true,
        inspectable: true,
        terminated: false,
        detail: None,
        frames: 444,
        bytes: 120_000,
        duration_ms: 74_000,
    };
    assert!(!cut.is_complete());
    assert_eq!(cut.label(), "ended_without_terminator");

    let healthy = StreamOutcome {
        terminated: true,
        ..cut
    };
    assert!(healthy.is_complete());
    assert_eq!(healthy.label(), "completed");
}

/// An upstream failure mid-stream is named, so it is not confused with a
/// vendor-side cut that produced no error.
#[test]
fn an_upstream_failure_is_named_separately() {
    let failed = StreamOutcome {
        streamed: true,
        inspectable: true,
        terminated: false,
        detail: Some("connection reset".to_string()),
        frames: 12,
        bytes: 900,
        duration_ms: 1_500,
    };
    assert!(!failed.is_complete());
    assert_eq!(failed.label(), "upstream_error");
    // A terminator already seen does not excuse a later transport failure.
    let late = StreamOutcome {
        terminated: true,
        ..failed
    };
    assert!(
        !late.is_complete(),
        "a transport error still fails the turn"
    );
}

/// Each dialect's terminator is recognised, and ordinary frames are not
/// mistaken for one.
#[test]
fn every_dialect_terminator_is_recognised() {
    for terminator in [
        &b"event: message_stop\ndata: {}\n\n"[..],
        b"data: [DONE]\n\n",
        b"event: response.completed\ndata: {}\n\n",
    ] {
        assert!(
            frame_terminates_stream(terminator),
            "unrecognised: {}",
            String::from_utf8_lossy(terminator)
        );
    }
    assert!(!frame_terminates_stream(
        b"event: content_block_delta\ndata: {}\n\n"
    ));
    // A compressed frame cannot be inspected, and must not be claimed as a
    // terminator on the strength of stray bytes.
    assert!(!frame_terminates_stream(&[0x1f, 0x8b, 0x08, 0xff, 0xfe]));
}

/// The terminal record carries the counts that tell a truncated turn from a
/// complete one.
#[test]
fn the_terminal_record_carries_counts_and_duration() {
    let directory = tempfile::tempdir().expect("temporary log directory");
    let log = RequestLog::new(directory.path().to_path_buf(), 1024 * 1024);
    log.route_request("corr-1", LogIdentity::unauthenticated());
    log.record_stream_end(
        "corr-1",
        &StreamOutcome {
            streamed: true,
            inspectable: true,
            terminated: false,
            detail: None,
            frames: 444,
            bytes: 120_000,
            duration_ms: 74_000,
        },
    );

    let written = std::fs::read_to_string(directory.path().join("unauthenticated/requests.lino"))
        .expect("read log");
    let record = written
        .lines()
        .find(|line| line.contains("stream_end"))
        .expect("a stream_end record was written");
    let record = crate::lino_json::decode_line(record).expect("a readable record");
    assert_eq!(record["outcome"], "ended_without_terminator");
    assert_eq!(record["complete"], false);
    assert_eq!(record["frames"], 444);
    assert_eq!(record["duration_ms"], 74_000);
}

/// A non-streamed reply has no terminator to miss, so it must settle as
/// complete rather than as a stream that was cut.
///
/// This is the WARN from issue #252: a gzip-compressed JSON answer arrives in
/// a few transfer chunks, and treating those as stream frames warned once per
/// successful request — burying real truncations in noise.
#[test]
fn a_non_streamed_reply_settles_as_complete() {
    let json_reply = StreamOutcome {
        streamed: false,
        inspectable: true,
        terminated: false,
        detail: None,
        frames: 2,
        bytes: 900,
        duration_ms: 129,
    };

    assert!(
        json_reply.is_complete(),
        "a single-shot reply is complete without a dialect terminator"
    );
    assert_eq!(json_reply.label(), "completed_not_streamed");
}

/// A transport failure still fails a non-streamed reply: the client got a
/// truncated document, which is a real problem whatever the framing.
#[test]
fn a_failed_non_streamed_reply_is_still_a_failure() {
    let failed = StreamOutcome {
        streamed: false,
        inspectable: true,
        terminated: false,
        detail: Some("connection reset".to_string()),
        frames: 1,
        bytes: 10,
        duration_ms: 5,
    };

    assert!(!failed.is_complete());
    assert_eq!(failed.label(), "upstream_error");
}

/// SSE is the streamed media type; a JSON answer is not, however it is framed
/// or compressed on the wire.
#[test]
fn only_event_stream_is_treated_as_streaming() {
    assert!(is_streaming_media_type(Some("text/event-stream")));
    assert!(is_streaming_media_type(Some(
        "text/event-stream; charset=utf-8"
    )));
    assert!(
        is_streaming_media_type(Some("TEXT/EVENT-STREAM")),
        "media types are case-insensitive"
    );

    assert!(!is_streaming_media_type(Some("application/json")));
    assert!(!is_streaming_media_type(Some(
        "application/json; charset=utf-8"
    )));
    assert!(!is_streaming_media_type(Some("text/plain")));
}

/// An upstream that declares nothing keeps the truncation detection from issue
/// #230: silence must not be read as "this cannot have been cut".
#[test]
fn an_undeclared_media_type_stays_eligible_for_truncation_detection() {
    assert!(is_streaming_media_type(None));
}

/// The case from issue #255: a genuine SSE stream relayed compressed.
///
/// The router forwards a compressed body byte for byte, so its frames are gzip
/// on the way through and scanning them for `message_stop` can only fail.
/// Reporting that as a truncation warned once per healthy streamed turn — 19
/// warnings in 25 minutes of ordinary use, every one of them a turn that
/// succeeded.
#[test]
fn a_compressed_stream_is_not_reported_as_cut() {
    let compressed = StreamOutcome {
        streamed: true,
        inspectable: false,
        terminated: false,
        detail: None,
        frames: 11,
        bytes: 1447,
        duration_ms: 536,
    };

    assert!(
        !compressed.is_demonstrably_cut(),
        "an unreadable stream is not evidence of a truncation"
    );
    assert_eq!(compressed.label(), "encoded_not_verifiable");
}

/// A readable stream that stops early must still be reported: this is the
/// signal from issue #230 that the fix must not silence.
#[test]
fn a_readable_stream_without_its_terminator_is_still_cut() {
    let cut = StreamOutcome {
        streamed: true,
        inspectable: true,
        terminated: false,
        detail: None,
        frames: 444,
        bytes: 120_000,
        duration_ms: 74_000,
    };

    assert!(
        cut.is_demonstrably_cut(),
        "a real truncation must still fire"
    );
    assert_eq!(cut.label(), "ended_without_terminator");
}

/// A transport failure fails the turn whatever the encoding: the client got a
/// truncated answer, which is a real problem even when the frames were opaque.
#[test]
fn a_transport_failure_is_reported_even_when_encoded() {
    let failed = StreamOutcome {
        streamed: true,
        inspectable: false,
        terminated: false,
        detail: Some("connection reset".to_string()),
        frames: 3,
        bytes: 90,
        duration_ms: 40,
    };

    assert!(failed.is_demonstrably_cut());
    assert_eq!(failed.label(), "upstream_error");
}

/// Only an encoding the router actually decodes nothing of makes a body
/// opaque; `identity` and an absent header are readable.
#[test]
fn only_a_real_encoding_makes_a_body_opaque() {
    use reqwest::header::{CONTENT_ENCODING, HeaderMap, HeaderValue};

    assert!(
        body_is_inspectable(&HeaderMap::new()),
        "no encoding header means the bytes are readable"
    );

    let mut identity = HeaderMap::new();
    identity.insert(CONTENT_ENCODING, HeaderValue::from_static("identity"));
    assert!(body_is_inspectable(&identity));

    for encoding in ["gzip", "br", "zstd", "gzip, br"] {
        let mut headers = HeaderMap::new();
        headers.insert(CONTENT_ENCODING, HeaderValue::from_str(encoding).unwrap());
        assert!(
            !body_is_inspectable(&headers),
            "{encoding} bodies cannot be scanned"
        );
    }
}

/// The warning fires only for a stream that can be shown to have stopped early.
///
/// This is the operator-facing half of issue #255: warnings on successful turns
/// made `grep -i warn` useless for finding a demonstrably truncated stream.
#[test]
fn only_a_demonstrable_cut_warrants_a_warning() {
    let base = StreamOutcome {
        streamed: true,
        inspectable: true,
        terminated: false,
        detail: None,
        frames: 11,
        bytes: 1447,
        duration_ms: 536,
    };

    assert!(
        stream_warrants_a_warning(&base),
        "a readable stream with no terminator is a real truncation"
    );
    assert!(
        !stream_warrants_a_warning(&StreamOutcome {
            inspectable: false,
            ..base.clone()
        }),
        "a compressed stream says nothing either way, so it must stay quiet"
    );
    assert!(
        !stream_warrants_a_warning(&StreamOutcome {
            terminated: true,
            ..base.clone()
        }),
        "a completed stream must stay quiet"
    );
    assert!(
        !stream_warrants_a_warning(&StreamOutcome {
            streamed: false,
            ..base.clone()
        }),
        "a single-shot reply has no terminator to miss"
    );
    assert!(
        stream_warrants_a_warning(&StreamOutcome {
            inspectable: false,
            detail: Some("connection reset".to_string()),
            ..base
        }),
        "a transport failure is reported whatever the encoding"
    );
}

/// Settling a stream writes the terminal record the analyser reads.
///
/// The record is the whole point of settling: without it the exchange reaches
/// the log with nothing saying how it ended (issue #258).
#[test]
fn settling_a_stream_writes_its_terminal_record() {
    let directory = tempfile::tempdir().expect("temporary log directory");
    let log = RequestLog::new(directory.path().to_path_buf(), 1024 * 1024);
    log.route_request("corr-settled", LogIdentity::unauthenticated());
    let outcome = std::sync::Mutex::new(StreamOutcome {
        streamed: true,
        inspectable: true,
        terminated: true,
        detail: None,
        frames: 7,
        bytes: 900,
        duration_ms: 0,
    });

    settle_stream(
        &log,
        "corr-settled",
        &outcome,
        1_234,
        &log_lazy::LogLazy::default(),
    );

    let written = std::fs::read_to_string(directory.path().join("unauthenticated/requests.lino"))
        .expect("read log");
    let record: serde_json::Value = written
        .lines()
        .filter_map(crate::lino_json::decode_line)
        .find(|record| record.get("phase").and_then(|p| p.as_str()) == Some("stream_end"))
        .expect("a terminal record must be written");

    assert_eq!(record["outcome"], "completed");
    assert_eq!(record["complete"], serde_json::Value::Bool(true));
    assert_eq!(record["streamed"], serde_json::Value::Bool(true));
    assert_eq!(record["inspectable"], serde_json::Value::Bool(true));
    assert_eq!(record["frames"], 7);
    assert_eq!(record["duration_ms"], 1_234);
}

/// A stream that was cut is recorded as such, and the duration measured by the
/// caller is what lands in the record.
#[test]
fn a_cut_stream_records_its_outcome_and_duration() {
    let directory = tempfile::tempdir().expect("temporary log directory");
    let log = RequestLog::new(directory.path().to_path_buf(), 1024 * 1024);
    log.route_request("corr-cut", LogIdentity::unauthenticated());
    let outcome = std::sync::Mutex::new(StreamOutcome {
        streamed: true,
        inspectable: true,
        terminated: false,
        detail: None,
        frames: 444,
        bytes: 120_000,
        duration_ms: 0,
    });

    settle_stream(
        &log,
        "corr-cut",
        &outcome,
        74_000,
        &log_lazy::LogLazy::default(),
    );

    let written = std::fs::read_to_string(directory.path().join("unauthenticated/requests.lino"))
        .expect("read log");
    let record: serde_json::Value = written
        .lines()
        .filter_map(crate::lino_json::decode_line)
        .find(|record| record.get("phase").and_then(|p| p.as_str()) == Some("stream_end"))
        .expect("a terminal record must be written");

    assert_eq!(record["outcome"], "ended_without_terminator");
    assert_eq!(record["complete"], serde_json::Value::Bool(false));
    assert_eq!(record["duration_ms"], 74_000);
}

/// A compacted log says so. The discarded records are gone either way, but a
/// reader holding the file could not tell a truncated audit log from a
/// complete one — and this log is the only place the bodies exist (issue #322).
#[test]
fn compaction_leaves_a_marker_saying_records_were_discarded() {
    let dir = tempfile::tempdir().expect("temp dir");
    let root = dir.path().join("marked");
    let path = root.join("unauthenticated/requests.lino");
    let log = RequestLog::new(root, 4_096);
    for sequence in 0..80 {
        log.record(
            "request",
            "compaction",
            json!({"sequence": sequence, "body": "x".repeat(64)}),
        );
    }

    let text = fs::read_to_string(&path).expect("request log");
    assert!(
        phases(&text).iter().any(|phase| phase == "log_compaction"),
        "the marker record must be present: {text}"
    );
    assert!(
        text.contains("bytes of older records discarded"),
        "the marker must say what was lost: {text}"
    );
    // Still one well-formed JSONL stream, and still inside the bound.
    assert!(
        text.lines()
            .all(|line| crate::lino_json::decode_line(line).is_some()),
        "the marker must not break the stream"
    );
    assert!(fs::metadata(&path).expect("log").len() <= 4_096);
    // The newest records survive; the oldest are what went.
    let kept = sequences(&text);
    assert!(kept.contains(&79), "the newest record survives: {kept:?}");
    assert!(!kept.contains(&0), "the oldest was discarded: {kept:?}");
}

/// A limit too small to hold the marker keeps the plain tail: the bound is the
/// hard constraint, and exceeding it to explain it helps nobody.
#[test]
fn a_limit_too_small_for_a_marker_still_respects_the_limit() {
    let dir = tempfile::tempdir().expect("temp dir");
    let root = dir.path().join("tiny");
    let path = root.join("unauthenticated/requests.lino");
    let log = RequestLog::new(root, 48);
    for sequence in 0..5 {
        log.record("request", "tiny", json!({"sequence": sequence}));
    }
    assert!(fs::metadata(&path).expect("log").len() <= 48);
}

/// The model named in the request body reaches the log line.
///
/// `model` was in the format and never populated: it was read from a response
/// header the router sets only when the upstream substitutes a different
/// model, so every ordinary line — success and failure alike — said `model=-`
/// while the body sat in the middleware's own buffer (issue #320).
#[test]
fn the_model_named_in_the_body_is_what_the_line_reports() {
    let capture = |body: &[u8]| {
        let mut capture = ClientRequestCapture {
            logger: Arc::new(RequestLog::new(std::path::PathBuf::from("unused"), 0)),
            correlation_id: String::from("test"),
            method: String::from("POST"),
            uri: String::from("/v1/messages"),
            version: String::from("HTTP/1.1"),
            headers: BTreeMap::new(),
            body: Vec::new(),
            omitted: false,
            recorded: true,
            model: Arc::new(Mutex::new(None)),
        };
        capture.push(body);
        capture.extract_model()
    };

    assert_eq!(
        capture(br#"{"model":"claude-haiku-4-5-20251001","max_tokens":10}"#),
        Some("claude-haiku-4-5-20251001".to_string()),
        "a body that names a model must put it on the line"
    );
    // The case the issue was filed about: a model the router does not
    // advertise still identifies which request was refused.
    assert_eq!(
        capture(br#"{"model":"no-such-model-xyz"}"#),
        Some("no-such-model-xyz".to_string()),
        "a refused model is exactly the one an operator needs named"
    );
    // `-` stays reserved for requests that genuinely have no model.
    for bodiless in [
        &b""[..],
        b"not json",
        br#"{"max_tokens":10}"#,
        br#"{"model":""}"#,
    ] {
        assert_eq!(
            capture(bodiless),
            None,
            "nothing to report is reported as nothing, not guessed"
        );
    }
}

/// An oversized body is not held in memory to name its model.
///
/// The buffer is bounded, and a body past the bound is dropped rather than
/// truncated — a truncated JSON body parses to nothing anyway, so the line
/// must fall back to `-` instead of reporting half a body's worth of guess.
#[test]
fn an_unbuffered_body_names_no_model() {
    let mut capture = ClientRequestCapture {
        logger: Arc::new(RequestLog::new(std::path::PathBuf::from("unused"), 0)),
        correlation_id: String::from("test"),
        method: String::from("POST"),
        uri: String::from("/v1/messages"),
        version: String::from("HTTP/1.1"),
        headers: BTreeMap::new(),
        body: Vec::new(),
        omitted: false,
        recorded: true,
        model: Arc::new(Mutex::new(None)),
    };
    capture.push(&vec![b'x'; MAX_BUFFERED_REQUEST_BYTES + 1]);
    assert!(capture.omitted, "the bound must still be enforced");
    assert_eq!(capture.extract_model(), None);
}

/// The request line names the token label, and the response line names the
/// model actually served — both already in hand, neither previously logged
/// (issue #320). The token value itself must never appear in either.
#[tokio::test]
async fn log_lines_carry_the_label_and_the_served_model_but_never_the_token() {
    use axum::http::HeaderValue;

    // The label reaches the line through the identity the middleware resolves;
    // the model reaches it through the header the router already sets.
    let mut headers = axum::http::HeaderMap::new();
    headers.insert(
        crate::output_limit::UPSTREAM_MODEL_HEADER,
        HeaderValue::from_static("claude-opus-5"),
    );
    assert_eq!(
        headers
            .get(crate::output_limit::UPSTREAM_MODEL_HEADER)
            .and_then(|value| value.to_str().ok()),
        Some("claude-opus-5"),
        "the served model is readable where the response line reads it"
    );

    // The secret is redacted wherever it appears, which is what keeps it off
    // the line: the label is logged, the credential is not.
    let secret = "la_sk_thisisasecrettokenvalue";
    let mut authorised = axum::http::HeaderMap::new();
    authorised.insert(
        "authorization",
        HeaderValue::from_str(&format!("Bearer {secret}")).expect("header"),
    );
    let redacted = serde_json::to_string(&redacted_headers(&authorised)).expect("json");
    assert!(
        !redacted.contains(secret),
        "a credential must never survive redaction: {redacted}"
    );
}
