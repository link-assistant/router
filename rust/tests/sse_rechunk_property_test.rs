//! Re-chunking properties for the SSE parser and stream translators (issue #670).
//!
//! The network decides where an upstream stream is cut into transport chunks,
//! so a translator's output must not depend on those cuts. For a valid
//! upstream stream, framed with LF or CRLF line endings, `:` comment and ping
//! blocks, `event:` lines and multi-line `data:` fields, every split of the
//! bytes must translate to exactly what the unsplit stream translates to,
//! including splits inside a multi-byte UTF-8 scalar or a frame separator.

use link_assistant_router::anthropic_stream::AnthropicStreamTranslator;
use link_assistant_router::openai::{OpenAIStreamShape, OpenAIStreamTranslator};
use link_assistant_router::output_limit::ResponsesStreamRewriter;
use link_assistant_router::responses::ResponsesChatStreamTranslator;
use proptest::prelude::*;
use serde_json::{Value, json};

/// How one upstream event is written on the wire.
#[derive(Clone, Copy, Debug)]
struct Framing {
    comment_before: bool,
    event_line: bool,
    multi_line_data: bool,
}

fn framing() -> impl Strategy<Value = Framing> {
    (any::<bool>(), any::<bool>(), any::<bool>()).prop_map(
        |(comment_before, event_line, multi_line_data)| Framing {
            comment_before,
            event_line,
            multi_line_data,
        },
    )
}

/// Serialize events into one SSE byte stream. One line-ending style is used
/// for the whole stream, as a real server does.
fn encode(events: &[Value], framings: &[Framing], crlf: bool, done: bool) -> Vec<u8> {
    let eol = if crlf { "\r\n" } else { "\n" };
    let mut out = String::new();
    for (event, framing) in events.iter().zip(framings.iter().cycle()) {
        if framing.comment_before {
            out.push_str(": ping");
            out.push_str(eol);
            out.push_str(eol);
        }
        if framing.event_line
            && let Some(kind) = event.get("type").and_then(Value::as_str)
        {
            out.push_str("event: ");
            out.push_str(kind);
            out.push_str(eol);
        }
        let data = if framing.multi_line_data {
            serde_json::to_string_pretty(event).expect("json")
        } else {
            event.to_string()
        };
        for line in data.lines() {
            out.push_str("data: ");
            out.push_str(line);
            out.push_str(eol);
        }
        out.push_str(eol);
    }
    if done {
        out.push_str("data: [DONE]");
        out.push_str(eol);
        out.push_str(eol);
    }
    out.into_bytes()
}

/// Cut `bytes` at the given (unordered, possibly repeated) offsets.
fn split<'a>(bytes: &'a [u8], cuts: &[usize]) -> Vec<&'a [u8]> {
    let mut points: Vec<usize> = cuts.iter().map(|cut| cut % (bytes.len() + 1)).collect();
    points.push(0);
    points.push(bytes.len());
    points.sort_unstable();
    points.dedup();
    points.windows(2).map(|w| &bytes[w[0]..w[1]]).collect()
}

/// Remove per-instance identifiers and timestamps, which differ between two
/// translator instances but are not affected by chunking.
fn normalize(output: &str) -> String {
    let mut text = output.to_string();
    for key in ["\"created\":", "\"created_at\":"] {
        let mut result = String::new();
        let mut rest = text.as_str();
        while let Some(index) = rest.find(key) {
            result.push_str(&rest[..index + key.len()]);
            rest = rest[index + key.len()..].trim_start_matches(|c: char| c.is_ascii_digit());
            result.push('0');
        }
        result.push_str(rest);
        text = result;
    }
    strip_uuids(&text)
}

/// Replace UUIDs, hyphenated or as 32 bare hex digits, with a placeholder.
fn strip_uuids(text: &str) -> String {
    const SHAPES: [&[usize]; 2] = [&[8, 4, 4, 4, 12], &[32]];
    let bytes = text.as_bytes();
    let mut out = String::new();
    let mut index = 0;
    while index < bytes.len() {
        let end = SHAPES
            .iter()
            .find_map(|shape| uuid_end(bytes, index, shape));
        if let Some(end) = end {
            out.push_str("<uuid>");
            index = end;
        } else {
            let ch = text[index..].chars().next().expect("char");
            out.push(ch);
            index += ch.len_utf8();
        }
    }
    out
}

fn uuid_end(bytes: &[u8], start: usize, shape: &[usize]) -> Option<usize> {
    let mut cursor = start;
    for (group, len) in shape.iter().enumerate() {
        if group > 0 {
            (bytes.get(cursor) == Some(&b'-')).then_some(())?;
            cursor += 1;
        }
        let run = bytes.get(cursor..cursor + len)?;
        run.iter().all(u8::is_ascii_hexdigit).then_some(())?;
        cursor += len;
    }
    // A longer hex run is some other value, not an identifier.
    (!bytes.get(cursor).is_some_and(u8::is_ascii_hexdigit)).then_some(cursor)
}

fn anthropic_events() -> Vec<Value> {
    vec![
        json!({"type":"message_start","message":{"id":"msg_1","type":"message","role":"assistant","model":"claude-upstream","content":[],"usage":{"input_tokens":12,"output_tokens":1}}}),
        json!({"type":"ping"}),
        json!({"type":"content_block_start","index":0,"content_block":{"type":"thinking","thinking":""}}),
        json!({"type":"content_block_delta","index":0,"delta":{"type":"thinking_delta","thinking":"weigh 世界"}}),
        json!({"type":"content_block_delta","index":0,"delta":{"type":"signature_delta","signature":"c2lnbmF0dXJl"}}),
        json!({"type":"content_block_stop","index":0}),
        json!({"type":"content_block_start","index":1,"content_block":{"type":"text","text":""}}),
        json!({"type":"content_block_delta","index":1,"delta":{"type":"text_delta","text":"héllo, 世界 🌍"}}),
        json!({"type":"content_block_delta","index":1,"delta":{"type":"text_delta","text":" second line\nwith a newline"}}),
        json!({"type":"content_block_stop","index":1}),
        json!({"type":"content_block_start","index":2,"content_block":{"type":"tool_use","id":"toolu_1","name":"lookup","input":{}}}),
        json!({"type":"content_block_delta","index":2,"delta":{"type":"input_json_delta","partial_json":"{\"city\":"}}),
        json!({"type":"content_block_delta","index":2,"delta":{"type":"input_json_delta","partial_json":"\"東京\"}"}}),
        json!({"type":"content_block_stop","index":2}),
        json!({"type":"message_delta","delta":{"stop_reason":"tool_use"},"usage":{"output_tokens":42}}),
        json!({"type":"message_stop"}),
    ]
}

fn chat_events() -> Vec<Value> {
    vec![
        json!({"id":"c1","object":"chat.completion.chunk","created":1,"model":"gpt-upstream","choices":[{"index":0,"delta":{"role":"assistant"}}]}),
        json!({"id":"c1","object":"chat.completion.chunk","created":1,"model":"gpt-upstream","choices":[{"index":0,"delta":{"content":"héllo, 世界 🌍"}}]}),
        json!({"id":"c1","object":"chat.completion.chunk","created":1,"model":"gpt-upstream","choices":[{"index":0,"delta":{"tool_calls":[{"index":0,"id":"call_1","type":"function","function":{"name":"lookup","arguments":"{\"city\":"}}]}}]}),
        json!({"id":"c1","object":"chat.completion.chunk","created":1,"model":"gpt-upstream","choices":[{"index":0,"delta":{"tool_calls":[{"index":0,"function":{"arguments":"\"東京\"}"}}]}}]}),
        json!({"id":"c1","object":"chat.completion.chunk","created":1,"model":"gpt-upstream","choices":[{"index":0,"delta":{},"finish_reason":"tool_calls"}]}),
        json!({"id":"c1","object":"chat.completion.chunk","created":1,"model":"gpt-upstream","choices":[],"usage":{"prompt_tokens":12,"completion_tokens":42,"total_tokens":54}}),
    ]
}

fn responses_events() -> Vec<Value> {
    vec![
        json!({"type":"response.created","response":{"id":"resp_1","model":"gpt-upstream","status":"in_progress","output":[]}}),
        json!({"type":"response.output_item.added","output_index":0,"item":{"type":"message","id":"msg_1","role":"assistant","content":[]}}),
        json!({"type":"response.output_text.delta","output_index":0,"content_index":0,"delta":"héllo, 世界 🌍"}),
        json!({"type":"response.output_item.added","output_index":1,"item":{"type":"function_call","id":"fc_1","call_id":"call_1","name":"lookup","arguments":""}}),
        json!({"type":"response.function_call_arguments.delta","output_index":1,"delta":"{\"city\":"}),
        json!({"type":"response.function_call_arguments.delta","output_index":1,"delta":"\"東京\"}"}),
        json!({"type":"response.completed","response":{"id":"resp_1","model":"gpt-upstream","status":"completed","output":[],"usage":{"input_tokens":12,"output_tokens":42,"total_tokens":54}}}),
    ]
}

/// Feed `chunks` to a fresh translator built by `make` and return the
/// normalized concatenated output, including whatever `finish` flushes.
fn run<T>(
    make: impl Fn() -> T,
    chunks: &[&[u8]],
    mut push: impl FnMut(&mut T, &[u8]) -> String,
    finish: impl FnOnce(&mut T) -> String,
) -> String {
    let mut translator = make();
    let mut out = String::new();
    for chunk in chunks {
        out.push_str(&push(&mut translator, chunk));
    }
    out.push_str(&finish(&mut translator));
    normalize(&out)
}

/// Assert that the output of every split equals the unsplit output.
fn assert_chunking_invariant<T>(
    bytes: &[u8],
    cuts: &[usize],
    make: impl Fn() -> T,
    push: impl FnMut(&mut T, &[u8]) -> String + Clone,
    finish: impl FnOnce(&mut T) -> String + Clone,
) -> Result<(), TestCaseError> {
    let whole = run(&make, &[bytes], push.clone(), finish.clone());
    let pieces = split(bytes, cuts);
    let chunked = run(&make, &pieces, push, finish);
    prop_assert_eq!(&whole, &chunked, "cuts {:?}", cuts);
    prop_assert!(!chunked.contains('\u{fffd}'), "replacement character");
    Ok(())
}

fn framings() -> impl Strategy<Value = (Vec<Framing>, bool)> {
    (prop::collection::vec(framing(), 1..6), any::<bool>())
}

fn cuts() -> impl Strategy<Value = Vec<usize>> {
    prop::collection::vec(any::<usize>(), 0..40)
}

proptest! {
    #![proptest_config(ProptestConfig::with_cases(96))]

    #[test]
    fn anthropic_to_openai_chat_is_independent_of_chunking(
        (framings, crlf) in framings(), cuts in cuts(),
    ) {
        let bytes = encode(&anthropic_events(), &framings, crlf, false);
        assert_chunking_invariant(
            &bytes,
            &cuts,
            || OpenAIStreamTranslator::new(OpenAIStreamShape::ChatCompletion, "requested")
                .with_include_usage(true),
            |t, chunk| t.push(chunk).concat(),
            |_| String::new(),
        )?;
    }

    #[test]
    fn anthropic_to_openai_responses_is_independent_of_chunking(
        (framings, crlf) in framings(), cuts in cuts(),
    ) {
        let bytes = encode(&anthropic_events(), &framings, crlf, false);
        assert_chunking_invariant(
            &bytes,
            &cuts,
            || OpenAIStreamTranslator::new(OpenAIStreamShape::Response, "requested"),
            |t, chunk| t.push(chunk).concat(),
            |_| String::new(),
        )?;
    }

    #[test]
    fn openai_chat_to_anthropic_is_independent_of_chunking(
        (framings, crlf) in framings(), cuts in cuts(), done in any::<bool>(),
    ) {
        let bytes = encode(&chat_events(), &framings, crlf, done);
        assert_chunking_invariant(
            &bytes,
            &cuts,
            || AnthropicStreamTranslator::new("requested"),
            |t, chunk| t.push(chunk).concat(),
            |t| t.finish().concat(),
        )?;
    }

    #[test]
    fn anthropic_stop_sequences_are_independent_of_chunking(
        (framings, crlf) in framings(), cuts in cuts(),
    ) {
        let bytes = encode(&chat_events(), &framings, crlf, true);
        assert_chunking_invariant(
            &bytes,
            &cuts,
            || AnthropicStreamTranslator::new("requested")
                .with_stop_sequences(vec!["世界".to_string()]),
            |t, chunk| t.push(chunk).concat(),
            |t| t.finish().concat(),
        )?;
    }

    #[test]
    fn responses_to_chat_is_independent_of_chunking(
        (framings, crlf) in framings(), cuts in cuts(),
    ) {
        let bytes = encode(&responses_events(), &framings, crlf, false);
        assert_chunking_invariant(
            &bytes,
            &cuts,
            || ResponsesChatStreamTranslator::new("requested"),
            |t, chunk| t.push(chunk).concat(),
            |_| String::new(),
        )?;
    }

    #[test]
    fn responses_rewriter_is_independent_of_chunking(
        (framings, crlf) in framings(), cuts in cuts(), limit in prop::option::of(1_u64..64),
    ) {
        let bytes = encode(&responses_events(), &framings, crlf, false);
        assert_chunking_invariant(
            &bytes,
            &cuts,
            || ResponsesStreamRewriter::new("requested", limit),
            ResponsesStreamRewriter::push,
            |_| String::new(),
        )?;
    }

    /// Arbitrary bytes, arbitrarily chunked, never panic any translator.
    #[test]
    fn arbitrary_bytes_never_panic_a_translator(
        bytes in prop::collection::vec(any::<u8>(), 0..512), cuts in cuts(),
    ) {
        let pieces = split(&bytes, &cuts);
        let mut anthropic = AnthropicStreamTranslator::new("requested");
        let mut chat = OpenAIStreamTranslator::new(OpenAIStreamShape::ChatCompletion, "requested");
        let mut response = OpenAIStreamTranslator::new(OpenAIStreamShape::Response, "requested");
        let mut responses_chat = ResponsesChatStreamTranslator::new("requested");
        let mut rewriter = ResponsesStreamRewriter::new("requested", Some(8));
        for piece in pieces {
            anthropic.push(piece);
            chat.push(piece);
            response.push(piece);
            responses_chat.push(piece);
            rewriter.push(piece);
        }
        anthropic.finish();
    }
}

#[test]
fn split_covers_the_whole_input_in_order() {
    let bytes = b"0123456789";
    let pieces = split(bytes, &[3, 3, 7, 25]);
    assert_eq!(pieces.concat(), bytes);
    assert!(pieces.iter().all(|piece| !piece.is_empty()));
}

#[test]
fn normalize_strips_identifiers_and_timestamps() {
    let a =
        normalize(r#"{"id":"chatcmpl-0b8f2a4e-1c2d-4e5f-8a9b-0c1d2e3f4a5b","created":1700000000}"#);
    let b =
        normalize(r#"{"id":"chatcmpl-11111111-2222-4333-8444-555555555555","created":1700000001}"#);
    assert_eq!(a, b);
    assert_eq!(
        normalize("msg_1cbc3a1b523144f98e7ab662ed2fa3ba"),
        normalize("msg_7d33a7b309ec42869e7eb163ee1b1b53")
    );
}
