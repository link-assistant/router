//! Rechunking a recorded Code Assist stream must not change what any Gemini
//! stream translator emits, nor the tokens charged for it (#671).
//!
//! The cassette is the scrubbed recording under
//! `tests/fixtures/vendor/gemini/`; every split of its bytes — one chunk,
//! byte by byte, and every two-chunk cut — is pushed through the native,
//! `OpenAI` Chat and Responses translators and compared with the single-chunk
//! output.

use super::{NativeStreamTranslator, OpenAiStreamTranslator, ResponsesStreamTranslator};
use serde_json::Value;

const CASSETTE: &str =
    include_str!("../../tests/fixtures/vendor/gemini/stream-generate-content-cached.json");

fn recorded_body() -> (Vec<u8>, Value) {
    let cassette: Value = serde_json::from_str(CASSETTE).unwrap();
    let mut body = cassette["response"]["sse"]
        .as_array()
        .unwrap()
        .iter()
        .map(|line| line.as_str().unwrap())
        .collect::<Vec<_>>()
        .join("\n");
    body.push('\n');
    (body.into_bytes(), cassette["expect"].clone())
}

trait Translate {
    fn fresh() -> Self;
    fn feed(&mut self, bytes: &[u8]) -> Vec<u8>;
}

impl Translate for NativeStreamTranslator {
    fn fresh() -> Self {
        Self::default()
    }
    fn feed(&mut self, bytes: &[u8]) -> Vec<u8> {
        self.push(bytes).unwrap().to_vec()
    }
}

impl Translate for OpenAiStreamTranslator {
    fn fresh() -> Self {
        Self::new("requested-model")
    }
    fn feed(&mut self, bytes: &[u8]) -> Vec<u8> {
        self.push(bytes).unwrap().to_vec()
    }
}

impl Translate for ResponsesStreamTranslator {
    fn fresh() -> Self {
        Self::new("requested-model")
    }
    fn feed(&mut self, bytes: &[u8]) -> Vec<u8> {
        self.push(bytes).unwrap().to_vec()
    }
}

/// Translator output with per-instance identifiers and clocks blanked, so two
/// runs over the same bytes compare equal.
fn normalized(output: &[u8]) -> Vec<Value> {
    let text = std::str::from_utf8(output).unwrap();
    text.lines()
        .filter_map(|line| line.strip_prefix("data:"))
        .map(str::trim_start)
        .map(|data| {
            serde_json::from_str::<Value>(data)
                .map_or_else(|_| Value::String(data.to_string()), blank_ids)
        })
        .collect()
}

fn blank_ids(mut value: Value) -> Value {
    match &mut value {
        Value::Object(map) => {
            for (key, field) in map.iter_mut() {
                if matches!(
                    key.as_str(),
                    "id" | "item_id" | "call_id" | "created" | "created_at"
                ) {
                    *field = Value::Null;
                } else {
                    *field = blank_ids(field.take());
                }
            }
        }
        Value::Array(items) => {
            for item in items.iter_mut() {
                *item = blank_ids(item.take());
            }
        }
        _ => {}
    }
    value
}

fn run<T: Translate>(body: &[u8], cuts: &[usize]) -> Vec<u8> {
    let mut translator = T::fresh();
    let mut output = Vec::new();
    let mut start = 0;
    for &cut in cuts.iter().chain(std::iter::once(&body.len())) {
        output.extend(translator.feed(&body[start..cut]));
        start = cut;
    }
    output
}

fn assert_split_invariant<T: Translate>(label: &str) -> Vec<u8> {
    let (body, _) = recorded_body();
    let whole = run::<T>(&body, &[]);
    let expected = normalized(&whole);
    assert!(!expected.is_empty(), "{label} emitted nothing");
    let byte_by_byte = (1..body.len()).collect::<Vec<_>>();
    assert_eq!(
        normalized(&run::<T>(&body, &byte_by_byte)),
        expected,
        "{label}: byte-by-byte"
    );
    for cut in 1..body.len() {
        assert_eq!(
            normalized(&run::<T>(&body, &[cut])),
            expected,
            "{label}: split at byte {cut}"
        );
    }
    whole
}

fn charged(output: &[u8]) -> u64 {
    let mut tracker =
        crate::usage::UsageTracker::new(crate::token::TokenManager::new("gemini-rechunk"), "t");
    tracker.feed(output);
    let settlement = tracker.settlement();
    assert!(!settlement.estimated, "the recorded stream reports usage");
    settlement.tokens
}

fn streamed_text(output: &[u8]) -> String {
    normalized(output)
        .iter()
        .map(|event| {
            event["candidates"][0]["content"]["parts"][0]["text"]
                .as_str()
                .or_else(|| event["choices"][0]["delta"]["content"].as_str())
                .or_else(|| {
                    (event["type"] == "response.output_text.delta")
                        .then(|| event["delta"].as_str())
                        .flatten()
                })
                .unwrap_or_default()
                .to_string()
        })
        .collect()
}

#[test]
fn native_projection_is_independent_of_chunking() {
    let (_, expect) = recorded_body();
    let output = assert_split_invariant::<NativeStreamTranslator>("native");
    assert_eq!(streamed_text(&output), expect["text"].as_str().unwrap());
    assert_eq!(charged(&output), expect["charged_tokens"].as_u64().unwrap());
}

#[test]
fn chat_translation_is_independent_of_chunking() {
    let (_, expect) = recorded_body();
    let output = assert_split_invariant::<OpenAiStreamTranslator>("chat");
    assert_eq!(streamed_text(&output), expect["text"].as_str().unwrap());
    assert_eq!(charged(&output), expect["charged_tokens"].as_u64().unwrap());
    assert!(output.ends_with(b"data: [DONE]\n\n"));
}

#[test]
fn responses_translation_is_independent_of_chunking() {
    let (_, expect) = recorded_body();
    let output = assert_split_invariant::<ResponsesStreamTranslator>("responses");
    assert_eq!(streamed_text(&output), expect["text"].as_str().unwrap());
    assert_eq!(charged(&output), expect["charged_tokens"].as_u64().unwrap());
}

/// Cached content is part of `promptTokenCount`, so the charge equals the
/// vendor's `totalTokenCount` on every projection — never less.
#[test]
fn cached_content_is_charged_once_on_every_projection() {
    let (body, expect) = recorded_body();
    let expected = expect["charged_tokens"].as_u64().unwrap();
    assert_eq!(
        charged(&run::<NativeStreamTranslator>(&body, &[])),
        expected
    );
    assert_eq!(
        charged(&run::<OpenAiStreamTranslator>(&body, &[])),
        expected
    );
    assert_eq!(
        charged(&run::<ResponsesStreamTranslator>(&body, &[])),
        expected
    );
}
