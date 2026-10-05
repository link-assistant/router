use super::*;
use futures_util::StreamExt;

fn reset() -> std::io::Error {
    std::io::Error::new(std::io::ErrorKind::ConnectionReset, "connection reset")
}

fn stalled() -> std::io::Error {
    std::io::Error::new(std::io::ErrorKind::TimedOut, "read timed out")
}

async fn relay(
    chunks: Vec<Result<&'static [u8], std::io::Error>>,
    dialect: Option<StreamDialect>,
) -> (String, Option<std::io::Error>) {
    let upstream = futures_util::stream::iter(
        chunks
            .into_iter()
            .map(|chunk| chunk.map(Bytes::from_static)),
    );
    let mut body = in_band_errors(upstream, dialect);
    let mut out = String::new();
    while let Some(item) = body.next().await {
        match item {
            Ok(bytes) => out.push_str(&String::from_utf8_lossy(&bytes)),
            Err(error) => return (out, Some(error)),
        }
    }
    (out, None)
}

const PARTIAL: [(&[u8], StreamDialect, &str); 4] = [
    (
        b"event: content_block_delta\ndata: {\"type\":\"content_block_delta\",\"delta\":{\"type\":\"text_delta\",\"text\":\"half\"}}\n\n",
        StreamDialect::Anthropic,
        "message_stop",
    ),
    (
        b"data: {\"choices\":[{\"delta\":{\"content\":\"half\"}}]}\n\n",
        StreamDialect::OpenAiChat,
        "[DONE]",
    ),
    (
        b"event: response.output_text.delta\ndata: {\"type\":\"response.output_text.delta\",\"delta\":\"half\"}\n\n",
        StreamDialect::Responses,
        "response.completed",
    ),
    (
        b"data: {\"candidates\":[{\"content\":{\"parts\":[{\"text\":\"half\"}]}}]}\n\n",
        StreamDialect::Gemini,
        "finishReason",
    ),
];

#[tokio::test]
async fn an_upstream_reset_after_partial_output_ends_with_one_protocol_error() {
    for (partial, dialect, success_terminator) in PARTIAL {
        let (out, error) = relay(vec![Ok(partial), Err(reset())], Some(dialect)).await;
        assert!(error.is_none(), "{dialect:?}: the body ends cleanly");
        assert!(out.contains("half"), "{dialect:?}: {out}");
        assert!(out.contains("interrupted"), "{dialect:?}: {out}");
        assert!(
            !out.contains(success_terminator),
            "{dialect:?} must not synthesize success: {out}"
        );
        assert_eq!(
            out.matches("before completion").count(),
            1,
            "{dialect:?}: {out}"
        );
        let frame = out.rsplit("\n\n").nth(1).unwrap();
        assert!(block_is_terminal(frame), "{dialect:?}: {frame}");
    }
}

#[tokio::test]
async fn a_stalled_upstream_ends_with_a_timeout_error() {
    for (partial, dialect, _) in PARTIAL {
        let (out, error) = relay(vec![Ok(partial), Err(stalled())], Some(dialect)).await;
        assert!(error.is_none());
        assert!(out.contains("stalled"), "{dialect:?}: {out}");
    }
    let (out, _) = relay(vec![Err(stalled())], Some(StreamDialect::Anthropic)).await;
    assert!(out.contains("timeout_error"), "{out}");
    let (out, _) = relay(vec![Err(stalled())], Some(StreamDialect::Gemini)).await;
    assert!(out.contains("DEADLINE_EXCEEDED"), "{out}");
}

#[tokio::test]
async fn an_abort_after_the_terminal_event_is_a_success() {
    for terminal in [
        &b"event: message_stop\ndata: {\"type\":\"message_stop\"}\n\n"[..],
        b"data: [DONE]\n\n",
        b"data: [DONE]",
        b"event: response.completed\ndata: {\"type\":\"response.completed\",\"response\":{}}\n\n",
        b"data: {\"choices\":[{\"delta\":{},\"finish_reason\":\"stop\"}]}\n\n",
        b"data: {\"candidates\":[{\"finishReason\":\"STOP\"}]}\n\n",
        b"event: error\ndata: {\"type\":\"error\",\"error\":{\"type\":\"overloaded_error\"}}\n\n",
    ] {
        let leaked: &'static [u8] = Box::leak(terminal.to_vec().into_boxed_slice());
        let (out, error) = relay(
            vec![Ok(leaked), Err(reset())],
            Some(StreamDialect::Anthropic),
        )
        .await;
        assert!(error.is_none(), "{out}");
        assert!(!out.contains("interrupted"), "{out}");
    }
}

#[tokio::test]
async fn a_terminator_split_across_chunks_is_still_seen() {
    let (out, error) = relay(
        vec![Ok(b"data: [DO"), Ok(b"NE]\n"), Ok(b"\n"), Err(reset())],
        Some(StreamDialect::OpenAiChat),
    )
    .await;
    assert!(error.is_none());
    assert!(!out.contains("interrupted"), "{out}");
}

#[tokio::test]
async fn an_answer_that_mentions_a_terminator_is_not_its_end() {
    let (out, _) = relay(
        vec![
            Ok(b"data: {\"choices\":[{\"delta\":{\"content\":\"print('[DONE]') then message_stop\"}}]}\n\n"),
            Err(reset()),
        ],
        Some(StreamDialect::OpenAiChat),
    )
    .await;
    assert!(out.contains("upstream_interrupted"), "{out}");
}

#[tokio::test]
async fn an_opaque_body_keeps_the_transport_abort() {
    let (out, error) = relay(vec![Ok(b"\x1f\x8b compressed"), Err(reset())], None).await;
    assert!(error.is_some());
    assert!(!out.contains("error"));
}

#[tokio::test]
async fn nothing_is_polled_after_the_error_event() {
    let (out, error) = relay(
        vec![Err(reset()), Ok(b"data: {\"late\":true}\n\n")],
        Some(StreamDialect::Responses),
    )
    .await;
    assert!(error.is_none());
    assert!(!out.contains("late"), "{out}");
}

#[test]
fn the_dialect_follows_the_request_path() {
    for (path, dialect) in [
        ("/v1/messages", Some(StreamDialect::Anthropic)),
        ("/v1/chat/completions", Some(StreamDialect::OpenAiChat)),
        (
            "/api/paas/v4/chat/completions",
            Some(StreamDialect::OpenAiChat),
        ),
        ("/v1/responses", Some(StreamDialect::Responses)),
        (
            "/v1beta/models/gemini-2.5-pro:streamGenerateContent?alt=sse",
            Some(StreamDialect::Gemini),
        ),
        ("/v1/models", None),
    ] {
        assert_eq!(StreamDialect::from_path(path), dialect, "{path}");
    }
}

#[test]
fn the_detector_carry_is_bounded() {
    let mut detector = TerminalEventDetector::default();
    assert!(!detector.push(&vec![b'x'; MAX_SSE_CARRY_BYTES + 128]));
    assert_eq!(detector.carried(), MAX_SSE_CARRY_BYTES);
}

#[tokio::test]
async fn a_body_that_ends_without_its_terminal_event_ends_with_an_error() {
    for (partial, dialect, success_terminator) in PARTIAL {
        let (out, error) = relay(vec![Ok(partial)], Some(dialect)).await;
        assert!(error.is_none());
        assert!(
            out.contains(INCOMPLETE_STREAM_MESSAGE),
            "{dialect:?}: {out}"
        );
        assert!(!out.contains(success_terminator), "{dialect:?}: {out}");
    }
    let (out, _) = relay(
        vec![Ok(b"data: [DONE]\n\n")],
        Some(StreamDialect::OpenAiChat),
    )
    .await;
    assert_eq!(out, "data: [DONE]\n\n");
    let (out, _) = relay(vec![Ok(b"opaque")], None).await;
    assert_eq!(out, "opaque");
}

#[tokio::test]
async fn an_error_after_a_half_received_event_starts_a_frame_of_its_own() {
    for (partial, dialect, _) in PARTIAL {
        // Cut the event in the middle of its JSON, then reset or just end.
        let half: &'static [u8] = &partial[..partial.len() / 2];
        for ending in [vec![Err(reset())], vec![]] {
            let mut chunks = vec![Ok(half)];
            chunks.extend(ending);
            let (out, error) = relay(chunks, Some(dialect)).await;
            assert!(error.is_none(), "{dialect:?}");
            let (relayed, appended) = out.split_at(half.len());
            assert_eq!(relayed.as_bytes(), half, "{dialect:?}");
            assert!(
                appended.starts_with("\n\n") && appended.contains("before completion"),
                "{dialect:?}: the error must not join the cut event: {out:?}"
            );
        }
    }
    // A cut on an event boundary needs no extra separator.
    let (out, _) = relay(
        vec![Ok(PARTIAL[0].0), Err(reset())],
        Some(StreamDialect::Anthropic),
    )
    .await;
    assert!(!out.contains("\n\n\n"), "{out:?}");
}
