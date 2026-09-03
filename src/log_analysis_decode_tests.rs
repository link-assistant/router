//! Decoding tests for [`crate::log_analysis`].
//!
//! `stream_not_verifiable` was a refusal to decompress rather than a limit, so
//! these cover what the analyser can now read: every encoding the router
//! advertises, a stream cut mid-flight, an error event inside a 200, and the
//! body an operator sees from `logs show`. Split from `log_analysis_tests.rs`
//! to keep that file within the repository's 1000-line limit (issue #328).

use super::tests::write_log;
use super::*;

/// One encoder, named by the `content-encoding` it produces.
type Encoder = (&'static str, fn(&str) -> Vec<u8>);

/// A compressed stream that finished is reported as finished.
///
/// `stream_not_verifiable` was a refusal to decompress, not a limit: the bytes
/// are ordinary gzip or brotli and decode to readable SSE. Without decoding,
/// compressed streamed exchanges were declared unknowable, leaving truncation
/// undetectable for that traffic (issue #328).
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

/// A turn that failed inside the stream is not reported as a success.
///
/// An SSE `error` event was invisible for the same reason the terminator was:
/// it sits in a body nothing decoded. The transport says 200, so without
/// reading the frames a failed turn is indistinguishable from a good one
/// (issue #328).
#[test]
fn an_error_event_inside_a_stream_is_reported() {
    use std::io::Write as _;

    let sse = "event: message_start\ndata: {\"type\":\"message_start\"}\n\n\
               event: error\ndata: {\"type\":\"error\",\"error\":{\"type\":\"overloaded_error\"}}\n\n";
    let mut encoder = flate2::write::GzEncoder::new(Vec::new(), flate2::Compression::default());
    encoder.write_all(sse.as_bytes()).expect("gzip");
    let body = base64::Engine::encode(
        &base64::engine::general_purpose::STANDARD,
        encoder.finish().expect("gzip"),
    );

    let root = tempfile::tempdir().expect("temporary log root");
    write_log(
        root.path(),
        "tokenhash",
        &[
            json!({
                "correlation_id": "z",
                "phase": "client_request",
                "uri": "/v1/messages",
                "body": {"json": {"stream": true}}
            }),
            json!({
                "correlation_id": "z",
                "phase": "client_response",
                "status": 200,
                "headers": {
                    "content-type": "text/event-stream",
                    "content-encoding": "gzip"
                }
            }),
            json!({
                "correlation_id": "z",
                "phase": "upstream_response_body",
                "body": {"base64": body}
            }),
        ],
    );

    let (exchanges, _, _) = read_exchanges(root.path(), None).expect("read the log");
    let found = anomalies(&exchanges);
    assert!(
        found
            .iter()
            .any(|anomaly| anomaly.kind == "stream_carried_an_error"),
        "a 200 carrying an error event must be reported: {found:?}"
    );
}

/// `logs show` renders a body an operator can read.
///
/// Encoded bodies were unreadable as stored, so grepping for an error message,
/// a model name or a prompt found nothing—not because the data was absent, but
/// because none of it was text (issue #328).
#[test]
fn a_shown_exchange_renders_its_body_as_text() {
    use std::io::Write as _;

    let sse = "event: message_start\ndata: {\"model\":\"claude-opus-5\"}\n\n";
    let mut encoded = Vec::new();
    let mut writer = brotli::CompressorWriter::new(&mut encoded, 4096, 5, 22);
    writer.write_all(sse.as_bytes()).expect("brotli");
    drop(writer);
    let body = base64::Engine::encode(&base64::engine::general_purpose::STANDARD, encoded);

    let root = tempfile::tempdir().expect("temporary log root");
    write_log(
        root.path(),
        "tokenhash",
        &[
            json!({
                "correlation_id": "z",
                "phase": "client_response",
                "status": 200,
                "headers": {"content-type": "text/event-stream", "content-encoding": "br"}
            }),
            json!({
                "correlation_id": "z",
                "phase": "upstream_response_body",
                "body": {"base64": body}
            }),
        ],
    );

    let shown = show(root.path(), None, "z").expect("show the exchange");
    assert!(
        shown.contains("claude-opus-5"),
        "an operator must be able to read the body: {shown}"
    );
    assert!(
        !shown.contains(&body),
        "the stored base64 must not be what is rendered: {shown}"
    );
}

/// Every advertised encoding survives the whole pipeline, not just the decoder.
///
/// `br` is what the vendor actually returns on the traffic this was reported
/// from, so a decoder that works in isolation while the analyser only ever
/// sees gzip would leave the majority of exchanges unreadable.
#[test]
fn each_encoding_is_decoded_end_to_end() {
    use std::io::Write as _;

    let sse = "event: message_stop\ndata: {\"type\":\"message_stop\"}\n\n";
    let encodings: [Encoder; 3] = [
        ("gzip", |plain| {
            let mut encoder =
                flate2::write::GzEncoder::new(Vec::new(), flate2::Compression::default());
            encoder.write_all(plain.as_bytes()).expect("gzip");
            encoder.finish().expect("gzip")
        }),
        ("br", |plain| {
            let mut encoded = Vec::new();
            let mut writer = brotli::CompressorWriter::new(&mut encoded, 4096, 5, 22);
            writer.write_all(plain.as_bytes()).expect("brotli");
            drop(writer);
            encoded
        }),
        ("zstd", |plain| {
            zstd::stream::encode_all(plain.as_bytes(), 0).expect("zstd")
        }),
    ];

    for (name, encode) in encodings {
        let root = tempfile::tempdir().expect("temporary log root");
        write_log(
            root.path(),
            "tokenhash",
            &[
                json!({
                    "correlation_id": "z",
                    "phase": "client_response",
                    "status": 200,
                    "headers": {
                        "content-type": "text/event-stream",
                        "content-encoding": name
                    }
                }),
                json!({
                    "correlation_id": "z",
                    "phase": "upstream_response_body",
                    "body": {"base64": base64::Engine::encode(
                        &base64::engine::general_purpose::STANDARD, encode(sse))}
                }),
            ],
        );
        let (exchanges, unparsable, _) = read_exchanges(root.path(), None).expect("read the log");
        let summary = summarise(&exchanges, unparsable, 0);
        assert_eq!(
            summary.unverifiable_streams, 0,
            "{name}: the analyser must decode what the decoder can"
        );
        assert!(
            anomalies(&exchanges).is_empty(),
            "{name}: a stream that reached its terminator is not an anomaly"
        );
    }
}

/// A stream stored across several frames is shown whole.
///
/// Only the first frame carries the codec's header, so decoding records one at
/// a time reads the opening frame and leaves the rest as base64 — which is
/// most of the stream, and most of what an operator is looking for
/// (issue #328).
#[test]
fn a_multi_frame_stream_is_shown_as_one_body() {
    use std::io::Write as _;

    // Flushed per frame, which is what a relayed stream looks like on the
    // wire and how the store records it.
    let mut encoder = flate2::write::GzEncoder::new(Vec::new(), flate2::Compression::default());
    let mut frames = Vec::new();
    let mut previous = 0;
    for text in [
        "event: message_start\ndata: {\"model\":\"claude-opus-5\"}\n\n",
        "event: content_block_delta\ndata: {\"delta\":\"hello\"}\n\n",
        "event: message_stop\ndata: {\"type\":\"message_stop\"}\n\n",
    ] {
        encoder.write_all(text.as_bytes()).expect("gzip");
        encoder.flush().expect("flush");
        let so_far = encoder.get_ref().len();
        frames.push(previous..so_far);
        previous = so_far;
    }
    let complete = encoder.finish().expect("gzip");

    let mut records = vec![json!({
        "correlation_id": "m",
        "phase": "client_response",
        "status": 200,
        "headers": {"content-type": "text/event-stream", "content-encoding": "gzip"}
    })];
    for (index, range) in frames.iter().enumerate() {
        // The last frame carries the encoder's trailer as well.
        let bytes = if index + 1 == frames.len() {
            &complete[range.start..]
        } else {
            &complete[range.clone()]
        };
        records.push(json!({
            "correlation_id": "m",
            "phase": "upstream_response_body",
            "body": {"base64": base64::Engine::encode(
                &base64::engine::general_purpose::STANDARD, bytes)}
        }));
    }

    let root = tempfile::tempdir().expect("temporary log root");
    write_log(root.path(), "tokenhash", &records);

    let shown = show(root.path(), None, "m").expect("show the exchange");
    // Every frame's content, not just the one that carried the header.
    for expected in ["claude-opus-5", "content_block_delta", "message_stop"] {
        assert!(
            shown.contains(expected),
            "the whole stream must be readable, missing {expected}: {shown}"
        );
    }
    assert!(
        !shown.contains("H4sI"),
        "no frame may still be rendered as base64: {shown}"
    );
}
