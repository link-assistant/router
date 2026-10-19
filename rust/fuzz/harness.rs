// Fuzz harnesses shared by the `cargo fuzz` targets and the stable-toolchain
// corpus replay test (`tests/fuzz_corpus_replay_test.rs`, issue #670).
//
// Each harness takes arbitrary bytes and must never panic.

use link_assistant_router::anthropic_stream::AnthropicStreamTranslator;
use link_assistant_router::openai::{OpenAIStreamShape, OpenAIStreamTranslator};
use link_assistant_router::output_limit::ResponsesStreamRewriter;
use link_assistant_router::responses::ResponsesChatStreamTranslator;
use link_assistant_router::stream_termination::{FailureKind, StreamDialect, error_frame};
use link_assistant_router::{anthropic_bridge, gemini_bridge, openai, responses};
use serde_json::Value;

/// Feed arbitrarily chunked bytes to every SSE stream translator. The first
/// byte chooses the chunk size, so the fuzzer also explores transport
/// boundaries inside frames, separators and UTF-8 scalars.
pub fn sse_stream_translators(data: &[u8]) {
    let Some((&chunk, body)) = data.split_first() else {
        return;
    };
    let chunk = usize::from(chunk).max(1);
    let mut anthropic = AnthropicStreamTranslator::new("requested")
        .with_stop_sequences(vec!["STOP".to_string()]);
    let mut chat = OpenAIStreamTranslator::new(OpenAIStreamShape::ChatCompletion, "requested")
        .with_include_usage(true);
    let mut response = OpenAIStreamTranslator::new(OpenAIStreamShape::Response, "requested");
    let mut responses_chat = ResponsesChatStreamTranslator::new("requested");
    let mut rewriter = ResponsesStreamRewriter::new("requested", Some(16));
    let mut produced = 0_usize;
    for piece in body.chunks(chunk) {
        produced += anthropic.push(piece).iter().map(String::len).sum::<usize>();
        produced += chat.push(piece).iter().map(String::len).sum::<usize>();
        produced += response.push(piece).iter().map(String::len).sum::<usize>();
        produced += responses_chat.push(piece).iter().map(String::len).sum::<usize>();
        produced += rewriter.push(piece).len();
    }
    let tail = anthropic.finish();
    assert!(tail.iter().all(|frame| frame.ends_with("\n\n")));
    // Output stays proportional to input: no translator amplifies a small
    // hostile stream into unbounded allocation.
    assert!(produced <= 64 * 1024 + 64 * body.len(), "amplified output: {produced}");
    for dialect in [
        StreamDialect::Anthropic,
        StreamDialect::OpenAiChat,
        StreamDialect::Responses,
        StreamDialect::Gemini,
    ] {
        let frame = error_frame(dialect, FailureKind::Interrupted);
        assert!(frame.ends_with(b"\n\n"));
    }
}

/// Feed arbitrary JSON to every request and response body translator.
/// Untrusted bodies must yield a translated value or a typed error.
pub fn request_translators(data: &[u8]) {
    let Ok(value) = serde_json::from_slice::<Value>(data) else {
        return;
    };
    let _ = anthropic_bridge::try_openai_json_to_anthropic_message(&value, "requested");
    let _ = openai::anthropic_to_chat_completion(&value, "requested");
    let _ = responses::response_to_chat_completion(&value, "requested");
    let _ = responses::try_chat_completion_to_responses(&value);
    let _ = gemini_bridge::chat_to_gemini_request(&value);
    let _ = gemini_bridge::gemini_request_to_chat("gemini-model", &value);
    let _ = gemini_bridge::chat_to_gemini_response(&value, "gemini-model");
    let _ = gemini_bridge::openai_error_to_gemini(400, &value);
    if let Ok(request) = serde_json::from_value::<openai::OpenAIChatCompletionRequest>(value.clone()) {
        let _ = openai::chat_completion_to_anthropic(&request);
    }
    if let Ok(request) = serde_json::from_value::<responses::OpenAIResponseRequest>(value) {
        let _ = responses::response_to_anthropic(&request);
    }
}
