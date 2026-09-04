use super::*;

#[test]
fn an_unconfigured_openai_compatible_catalog_is_empty() {
    let data = tempfile::tempdir().expect("provider data");
    let mut state = crate::app_state::AppState::for_tests(data.path());
    state.upstream_provider = crate::config::UpstreamProvider::OpenAICompatible;
    state.openai_compatible.default_model = None;
    state.openai_compatible.models.clear();

    let catalog = openai_compatible_models(&state);
    assert_eq!(catalog["data"], serde_json::json!([]));
    assert!(
        !catalog.to_string().contains("default"),
        "Router must not invent a model absent from live or operator configuration"
    );
}

/// `/v1` in the configured base URL must not be duplicated by the request
/// path, and a base without it keeps the path verbatim.
#[test]
fn base_urls_are_joined_without_duplicating_the_version_segment() {
    assert_eq!(
        join_openai_compatible_url("https://api.example/v1", "/v1/chat/completions"),
        "https://api.example/v1/chat/completions"
    );
    assert_eq!(
        join_openai_compatible_url("https://api.example/v1/", "/v1/chat/completions"),
        "https://api.example/v1/chat/completions"
    );
    assert_eq!(
        join_openai_compatible_url("https://api.example", "/v1/chat/completions"),
        "https://api.example/v1/chat/completions"
    );
    // A path that does not start with /v1 is appended as-is.
    assert_eq!(
        join_openai_compatible_url("https://api.example/v1", "/responses"),
        "https://api.example/v1/responses"
    );
    assert_eq!(
        join_openai_compatible_url("https://api.example/", "/responses"),
        "https://api.example/responses"
    );
}

#[test]
fn event_stream_content_types_are_detected_case_insensitively() {
    for value in [
        "text/event-stream",
        "text/event-stream; charset=utf-8",
        "TEXT/EVENT-STREAM",
    ] {
        assert!(
            is_event_stream(&HeaderValue::from_str(value).expect("header")),
            "{value} should be recognised as a stream"
        );
    }
    for value in ["application/json", "text/plain"] {
        assert!(
            !is_event_stream(&HeaderValue::from_str(value).expect("header")),
            "{value} should not be recognised as a stream"
        );
    }
}

/// A stream this relay forwards starts as a stream it will settle.
///
/// Before issue #258 this path recorded every frame and then simply
/// stopped, so its exchanges reached the log with no terminal record and
/// were reported as ending in an unknown state.
#[test]
fn a_forwarded_stream_starts_settled_as_a_stream() {
    let outcome = new_stream_outcome(&reqwest::header::HeaderMap::new());

    assert!(outcome.streamed, "this path only handles streams");
    assert!(
        outcome.inspectable,
        "an unencoded body can be scanned for a terminator"
    );
    assert!(!outcome.terminated, "nothing has been seen yet");
    assert_eq!(outcome.frames, 0);
    assert_eq!(outcome.bytes, 0);
    assert!(outcome.detail.is_none());
}

/// A compressed stream is marked unreadable up front, so its frames are
/// never mistaken for evidence of a truncation (issue #255).
#[test]
fn a_compressed_stream_starts_uninspectable() {
    let mut headers = reqwest::header::HeaderMap::new();
    headers.insert(
        reqwest::header::CONTENT_ENCODING,
        reqwest::header::HeaderValue::from_static("gzip"),
    );

    let outcome = new_stream_outcome(&headers);

    assert!(outcome.streamed);
    assert!(!outcome.inspectable);
    assert_eq!(outcome.label(), "encoded_not_verifiable");
}

/// An event-stream content type is recognised however it is spelled, since
/// it is what routes a response into the streaming path at all.
#[test]
fn an_event_stream_content_type_is_recognised() {
    for value in [
        "text/event-stream",
        "text/event-stream; charset=utf-8",
        "TEXT/EVENT-STREAM",
    ] {
        assert!(
            is_event_stream(&HeaderValue::from_str(value).unwrap()),
            "{value} should route into the streaming path"
        );
    }
    assert!(!is_event_stream(&HeaderValue::from_static(
        "application/json"
    )));
}

/// Relaying a finished stream must leave an outcome that says so.
///
/// The terminal record is derived from this accumulation, so a terminator
/// missed here becomes an exchange whose ending the log cannot account for.
#[test]
fn a_terminating_frame_completes_the_outcome() {
    let mut outcome = new_stream_outcome(&reqwest::header::HeaderMap::new());

    account_for_frame(&mut outcome, b"data: {\"choices\":[{\"delta\":{}}]}\n\n");
    assert!(!outcome.terminated, "an ordinary frame ends nothing");
    assert_eq!(outcome.frames, 1);

    account_for_frame(&mut outcome, b"data: [DONE]\n\n");
    assert!(outcome.terminated, "[DONE] ends an OpenAI stream");
    assert_eq!(outcome.frames, 2);
    assert!(outcome.is_complete());
    assert_eq!(outcome.label(), "completed");
}

/// Every dialect this relay can carry must be recognised, including Gemini,
/// which names no terminating event and marks a finished turn with
/// `finishReason` on its last chunk.
#[test]
fn every_dialect_terminator_completes_the_outcome() {
    for frame in [
        &b"data: [DONE]\n\n"[..],
        b"event: message_stop\ndata: {}\n\n",
        b"event: response.completed\ndata: {}\n\n",
        b"data: {\"candidates\":[{\"finishReason\":\"STOP\"}]}\n\n",
    ] {
        let mut outcome = new_stream_outcome(&reqwest::header::HeaderMap::new());
        account_for_frame(&mut outcome, frame);
        assert!(
            outcome.terminated,
            "unrecognised terminator: {}",
            String::from_utf8_lossy(frame)
        );
    }
}

/// A stream that stops without a terminator must stay incomplete, so a real
/// truncation is still reported (issue #230).
#[test]
fn a_stream_without_a_terminator_stays_incomplete() {
    let mut outcome = new_stream_outcome(&reqwest::header::HeaderMap::new());

    account_for_frame(&mut outcome, b"data: {\"choices\":[{\"delta\":{}}]}\n\n");

    assert!(!outcome.is_complete());
    assert_eq!(outcome.label(), "ended_without_terminator");
    assert_eq!(outcome.bytes, 34);
}

/// Relaying a real stream must record every frame and settle the turn.
///
/// Driven through an actual HTTP response rather than a constructed value:
/// the defect in issue #258 was that this path forwarded bytes and then
/// simply stopped, which only shows up when the stream is consumed to its
/// end.
#[tokio::test]
async fn relaying_a_stream_records_frames_and_settles_the_turn() {
    use futures_util::StreamExt as _;

    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let port = listener.local_addr().unwrap().port();
    tokio::spawn(async move {
        if let Ok((mut socket, _)) = listener.accept().await {
            use tokio::io::{AsyncReadExt as _, AsyncWriteExt as _};
            let mut scratch = [0; 1024];
            let _ = socket.read(&mut scratch).await;
            let body = "data: {\"choices\":[{\"delta\":{}}]}\n\ndata: [DONE]\n\n";
            let _ = socket
                .write_all(
                    format!(
                        "HTTP/1.1 200 OK\r\ncontent-type: text/event-stream\r\n\
                         content-length: {}\r\nconnection: close\r\n\r\n{body}",
                        body.len()
                    )
                    .as_bytes(),
                )
                .await;
        }
    });

    let directory = tempfile::tempdir().expect("temporary log directory");
    let log = std::sync::Arc::new(crate::request_log::RequestLog::new(
        directory.path().to_path_buf(),
        1024 * 1024,
    ));
    let upstream = reqwest::get(format!("http://127.0.0.1:{port}/"))
        .await
        .expect("reach the upstream");

    let mut stream = Box::pin(settled_relay_stream(
        upstream,
        std::sync::Arc::clone(&log),
        "relayed".to_string(),
        log_lazy::LogLazy::default(),
        None,
        None,
    ));
    let mut relayed = Vec::new();
    while let Some(chunk) = stream.next().await {
        relayed.extend_from_slice(&chunk.expect("the relay must forward its bytes"));
    }

    // The client sees the body unchanged: the terminal marker is filtered
    // out, never forwarded.
    let forwarded = String::from_utf8_lossy(&relayed);
    assert!(forwarded.contains("[DONE]"), "{forwarded}");
    assert!(
        !forwarded.contains(crate::request_log::STREAM_END_MARKER),
        "the sentinel must not reach the client: {forwarded}"
    );

    let written = std::fs::read_to_string(directory.path().join("unauthenticated/requests.lino"))
        .expect("read the log");
    let settled: serde_json::Value = written
        .lines()
        .filter_map(crate::lino_json::decode_line)
        .find(|record| record.get("phase").and_then(|p| p.as_str()) == Some("stream_end"))
        .expect("the relay must settle the stream it forwarded");

    assert_eq!(settled["outcome"], "completed", "{settled}");
    assert_eq!(settled["complete"], serde_json::Value::Bool(true));
    assert_eq!(settled["streamed"], serde_json::Value::Bool(true));
    assert!(
        settled["frames"].as_u64().unwrap_or(0) >= 1,
        "every frame is counted: {settled}"
    );
}
