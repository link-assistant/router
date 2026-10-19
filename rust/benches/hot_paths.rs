//! Criterion benchmarks for Router's per-request hot paths (issue #672):
//! SSE stream translation, request translation and token verification.
//!
//! ```sh
//! cargo bench -j2 --bench hot_paths                      # run
//! cargo bench -j2 --bench hot_paths -- --save-baseline pr-base
//! rust-script scripts/compare-benchmarks.rs pr-base pr-head
//! ```
//!
//! The `Benchmarks` workflow runs this on the pull request's base and head and
//! fails when any benchmark is more than 25% slower.

use std::hint::black_box;
use std::time::Duration;

use criterion::{Criterion, Throughput, criterion_group, criterion_main};
use link_assistant_router::anthropic_stream::AnthropicStreamTranslator;
use link_assistant_router::openai::{
    self, OpenAIChatCompletionRequest, OpenAIStreamShape, OpenAIStreamTranslator,
};
use link_assistant_router::responses::{
    self, OpenAIResponseRequest, ResponsesChatStreamTranslator,
};
use link_assistant_router::token::TokenManager;
use serde_json::{Value, json};

const MODEL: &str = "bench-model";

/// The upstream body of a checked-in vendor cassette (`tests/fixtures/vendor`).
fn cassette(text: &str) -> Vec<u8> {
    let document: Value = serde_json::from_str(text).expect("cassette is JSON");
    let lines = document["response"]["sse"]
        .as_array()
        .expect("SSE cassette");
    let mut body = lines
        .iter()
        .map(|line| line.as_str().expect("SSE line"))
        .collect::<Vec<_>>()
        .join("\n");
    body.push('\n');
    body.into_bytes()
}

/// A long Anthropic Messages stream: `deltas` text deltas between the usual
/// start and stop frames, the shape of a typical long answer.
fn long_anthropic_stream(deltas: usize) -> Vec<u8> {
    let mut events = vec![
        json!({"type": "message_start", "message": {"id": "msg_bench", "type": "message",
            "role": "assistant", "model": MODEL, "content": [], "stop_reason": null,
            "usage": {"input_tokens": 1200, "output_tokens": 1}}}),
        json!({"type": "content_block_start", "index": 0,
            "content_block": {"type": "text", "text": ""}}),
    ];
    events.extend((0..deltas).map(|index| {
        json!({"type": "content_block_delta", "index": 0,
            "delta": {"type": "text_delta", "text": format!("word {index} of a long answer, ")}})
    }));
    events.push(json!({"type": "content_block_stop", "index": 0}));
    events.push(
        json!({"type": "message_delta", "delta": {"stop_reason": "end_turn"},
        "usage": {"output_tokens": deltas}}),
    );
    events.push(json!({"type": "message_stop"}));
    let mut body = String::new();
    for event in events {
        body.push_str("event: ");
        body.push_str(event["type"].as_str().unwrap_or_default());
        body.push_str("\ndata: ");
        body.push_str(&event.to_string());
        body.push_str("\n\n");
    }
    body.into_bytes()
}

/// Feed `body` in transport-sized chunks, as a socket would deliver it.
fn feed(body: &[u8], mut push: impl FnMut(&[u8]) -> usize) -> usize {
    body.chunks(1024).map(&mut push).sum()
}

fn sse_translation(c: &mut Criterion) {
    let anthropic = cassette(include_str!(
        "../tests/fixtures/vendor/anthropic/messages-stream-thinking-tool-cache.json"
    ));
    let chat = cassette(include_str!(
        "../tests/fixtures/vendor/openai_chat/chat-stream-cached.json"
    ));
    let responses = cassette(include_str!(
        "../tests/fixtures/vendor/openai_responses/responses-stream-cached.json"
    ));
    let long = long_anthropic_stream(2000);

    let mut group = c.benchmark_group("sse");
    for (name, body) in [
        ("anthropic_cassette", &anthropic),
        ("anthropic_long", &long),
    ] {
        group.throughput(Throughput::Bytes(body.len() as u64));
        group.bench_function(format!("{name}_to_chat"), |b| {
            b.iter(|| {
                let mut translator =
                    OpenAIStreamTranslator::new(OpenAIStreamShape::ChatCompletion, MODEL)
                        .with_include_usage(true);
                feed(black_box(body), |piece| translator.push(piece).len())
            });
        });
        group.bench_function(format!("{name}_to_responses"), |b| {
            b.iter(|| {
                let mut translator =
                    OpenAIStreamTranslator::new(OpenAIStreamShape::Response, MODEL);
                feed(black_box(body), |piece| translator.push(piece).len())
            });
        });
    }
    group.throughput(Throughput::Bytes(chat.len() as u64));
    group.bench_function("chat_cassette_to_anthropic", |b| {
        b.iter(|| {
            let mut translator = AnthropicStreamTranslator::new(MODEL);
            feed(black_box(&chat), |piece| translator.push(piece).len()) + translator.finish().len()
        });
    });
    group.throughput(Throughput::Bytes(responses.len() as u64));
    group.bench_function("responses_cassette_to_chat", |b| {
        b.iter(|| {
            let mut translator = ResponsesChatStreamTranslator::new(MODEL);
            feed(black_box(&responses), |piece| translator.push(piece).len())
        });
    });
    group.finish();
}

/// A Chat Completions request with history, tools and an image: the shape a
/// coding agent sends on every turn.
fn chat_request() -> Value {
    let mut messages =
        vec![json!({"role": "system", "content": "You are a careful coding agent."})];
    for turn in 0..20 {
        messages.push(json!({"role": "user", "content": format!("Step {turn}: read the file.")}));
        messages.push(
            json!({"role": "assistant", "content": null, "tool_calls": [{
            "id": format!("call_{turn}"), "type": "function",
            "function": {"name": "read_file", "arguments": "{\"path\":\"src/main.rs\"}"}}]}),
        );
        messages.push(
            json!({"role": "tool", "tool_call_id": format!("call_{turn}"),
            "content": "fn main() { println!(\"hello\"); }"}),
        );
    }
    messages.push(json!({"role": "user", "content": [
        {"type": "text", "text": "What does this show?"},
        {"type": "image_url", "image_url": {"url": "data:image/png;base64,iVBORw0KGgo="}}]}));
    json!({
        "model": MODEL,
        "stream": true,
        "max_tokens": 4096,
        "messages": messages,
        "tools": [{"type": "function", "function": {"name": "read_file",
            "description": "Read a file", "parameters": {"type": "object",
            "properties": {"path": {"type": "string"}}, "required": ["path"]}}}],
    })
}

fn responses_request() -> Value {
    let mut input = Vec::new();
    for turn in 0..20 {
        input.push(json!({"role": "user", "content": [
            {"type": "input_text", "text": format!("Step {turn}: read the file.")}]}));
        input.push(
            json!({"type": "function_call", "call_id": format!("call_{turn}"),
            "name": "read_file", "arguments": "{\"path\":\"src/main.rs\"}"}),
        );
        input.push(
            json!({"type": "function_call_output", "call_id": format!("call_{turn}"),
            "output": "fn main() { println!(\"hello\"); }"}),
        );
    }
    json!({
        "model": MODEL,
        "stream": true,
        "instructions": "You are a careful coding agent.",
        "input": input,
        "tools": [{"type": "function", "name": "read_file", "description": "Read a file",
            "parameters": {"type": "object", "properties": {"path": {"type": "string"}}}}],
    })
}

fn request_translation(c: &mut Criterion) {
    let chat = chat_request();
    let chat_typed: OpenAIChatCompletionRequest =
        serde_json::from_value(chat.clone()).expect("chat request");
    let responses_body = responses_request();
    let responses_typed: OpenAIResponseRequest =
        serde_json::from_value(responses_body).expect("responses request");
    let anthropic_reply = json!({
        "id": "msg_bench", "type": "message", "role": "assistant", "model": MODEL,
        "content": [{"type": "text", "text": "It prints hello."},
            {"type": "tool_use", "id": "toolu_bench", "name": "read_file",
             "input": {"path": "src/lib.rs"}}],
        "stop_reason": "tool_use",
        "usage": {"input_tokens": 1200, "output_tokens": 40,
            "cache_read_input_tokens": 1000, "cache_creation_input_tokens": 0}});

    let mut group = c.benchmark_group("request");
    group.bench_function("chat_to_anthropic", |b| {
        b.iter(|| openai::chat_completion_to_anthropic(black_box(&chat_typed)));
    });
    group.bench_function("chat_to_responses", |b| {
        b.iter(|| responses::try_chat_completion_to_responses(black_box(&chat)));
    });
    group.bench_function("responses_to_anthropic", |b| {
        b.iter(|| responses::response_to_anthropic(black_box(&responses_typed)));
    });
    group.bench_function("anthropic_reply_to_chat", |b| {
        b.iter(|| openai::anthropic_to_chat_completion(black_box(&anthropic_reply), MODEL));
    });
    group.finish();
}

fn token_verification(c: &mut Criterion) {
    let manager = TokenManager::new("benchmark-signing-secret-of-reasonable-length");
    let token = manager.issue_token(24, "bench").expect("issue token");
    let mut group = c.benchmark_group("token");
    group.bench_function("validate", |b| {
        b.iter(|| manager.validate_token(black_box(&token)).expect("valid"));
    });
    group.bench_function("reject_forged", |b| {
        let forged = format!("{}x", &token[..token.len() - 1]);
        b.iter(|| manager.validate_token(black_box(&forged)).is_err());
    });
    group.finish();
}

criterion_group! {
    name = hot_paths;
    // Short, steady runs: CI compares base and head on the same runner, so
    // stable medians matter more than tight confidence intervals.
    config = Criterion::default()
        .warm_up_time(Duration::from_secs(1))
        .measurement_time(Duration::from_secs(3))
        .sample_size(50);
    targets = sse_translation, request_translation, token_verification
}
criterion_main!(hot_paths);
