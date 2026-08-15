//! Incremental `OpenAI` SSE to Anthropic SSE translation.
//!
//! This is the mirror image of [`crate::openai::OpenAIStreamTranslator`]: it
//! consumes the event stream produced by an `OpenAI`-dialect upstream (either
//! Chat Completions chunks or Responses events) and re-emits it using the
//! Anthropic Messages event vocabulary that Claude Code expects:
//!
//! `message_start`, `content_block_start`, `content_block_delta`,
//! `content_block_stop`, `message_delta`, `message_stop`.
//!
//! Both upstream shapes are recognised per event rather than configured up
//! front, because a single provider may emit either one depending on which
//! endpoint the request was routed to.

use std::collections::BTreeMap;

use serde_json::{Value, json};

use crate::openai::{extract_sse_data, find_sse_separator};

/// Render one Anthropic SSE frame (named event plus JSON payload).
#[must_use]
pub fn anthropic_frame(event: &str, payload: &Value) -> String {
    format!("event: {event}\ndata: {payload}\n\n")
}

/// Map an `OpenAI` `finish_reason` onto an Anthropic `stop_reason`.
#[must_use]
pub fn map_stop_reason(finish_reason: &str) -> &'static str {
    match finish_reason {
        "length" | "max_tokens" | "max_output_tokens" => "max_tokens",
        "tool_calls" | "function_call" | "tool_use" => "tool_use",
        _ => "end_turn",
    }
}

/// Incremental `OpenAI` SSE to Anthropic SSE translator.
///
/// Feed upstream bytes to [`AnthropicStreamTranslator::push`] and flush with
/// [`AnthropicStreamTranslator::finish`] when the upstream stream ends.
#[derive(Debug, Clone)]
pub struct AnthropicStreamTranslator {
    /// Model id reported by the upstream that actually served the request.
    model: String,
    id: String,
    buffer: String,
    started: bool,
    finished: bool,
    /// Index of the content block currently open, if any.
    open_block: Option<usize>,
    /// Anthropic index of the text block, once opened.
    text_index: Option<usize>,
    /// Upstream tool-call index (chat) or output index (responses) mapped to
    /// the Anthropic content-block index.
    tool_indices: BTreeMap<i64, usize>,
    server_tool_indices: BTreeMap<i64, (usize, String)>,
    next_index: usize,
    stop_reason: Option<String>,
    stop_sequence: Option<String>,
    stop_filter: crate::stop_sequences::StopSequenceFilter,
    input_tokens: u64,
    output_tokens: u64,
    web_search_requests: u64,
}

impl AnthropicStreamTranslator {
    /// Create a translator for one bridged request.
    #[must_use]
    pub fn new(requested_model: &str) -> Self {
        Self {
            model: requested_model.to_string(),
            id: format!("msg_{}", uuid::Uuid::new_v4().simple()),
            buffer: String::new(),
            started: false,
            finished: false,
            open_block: None,
            text_index: None,
            tool_indices: BTreeMap::new(),
            server_tool_indices: BTreeMap::new(),
            next_index: 0,
            stop_reason: None,
            stop_sequence: None,
            stop_filter: crate::stop_sequences::StopSequenceFilter::default(),
            input_tokens: 0,
            output_tokens: 0,
            web_search_requests: 0,
        }
    }

    /// Enforce Anthropic `stop_sequences` locally for translated backends.
    #[must_use]
    pub fn with_stop_sequences(mut self, sequences: Vec<String>) -> Self {
        self.stop_filter = crate::stop_sequences::StopSequenceFilter::new(sequences);
        self
    }

    /// Push raw upstream bytes and return zero or more Anthropic SSE frames.
    pub fn push(&mut self, chunk: &[u8]) -> Vec<String> {
        self.buffer.push_str(&String::from_utf8_lossy(chunk));
        let mut frames = Vec::new();
        while let Some((idx, separator_len)) = find_sse_separator(&self.buffer) {
            let block = self.buffer[..idx].to_string();
            self.buffer.drain(..idx + separator_len);
            frames.extend(self.translate_block(&block));
        }
        frames
    }

    /// Emit the closing frames if the upstream ended without a terminal event.
    pub fn finish(&mut self) -> Vec<String> {
        if self.finished {
            return Vec::new();
        }
        let mut frames = self.ensure_started();
        let pending = self.stop_filter.finish();
        frames.extend(self.emit_text_delta(&pending));
        frames.extend(self.close_stream());
        frames
    }

    fn translate_block(&mut self, block: &str) -> Vec<String> {
        let data = extract_sse_data(block);
        if data.is_empty() {
            return Vec::new();
        }
        if data == "[DONE]" {
            return self.finish();
        }
        let Ok(event) = serde_json::from_str::<Value>(&data) else {
            return Vec::new();
        };
        if event
            .get("type")
            .and_then(Value::as_str)
            .is_some_and(|t| t.starts_with("response."))
        {
            self.translate_response_event(&event)
        } else {
            self.translate_chat_event(&event)
        }
    }

    // ---- OpenAI Chat Completions chunks -------------------------------

    fn translate_chat_event(&mut self, event: &Value) -> Vec<String> {
        if self.finished {
            return Vec::new();
        }
        self.capture_model(event.get("model"));
        let mut frames = self.ensure_started();
        self.absorb_usage(event.get("usage"));

        let Some(choice) = event
            .get("choices")
            .and_then(Value::as_array)
            .and_then(|c| c.first())
        else {
            return frames;
        };
        if let Some(delta) = choice.get("delta") {
            if let Some(text) = delta.get("content").and_then(Value::as_str)
                && !text.is_empty()
            {
                frames.extend(self.text_delta(text));
            }
            if let Some(calls) = delta.get("tool_calls").and_then(Value::as_array) {
                for call in calls {
                    frames.extend(self.tool_call_delta(call));
                }
            }
        }
        if let Some(reason) = choice.get("finish_reason").and_then(Value::as_str) {
            self.stop_reason = Some(map_stop_reason(reason).to_string());
        }
        frames
    }

    fn tool_call_delta(&mut self, call: &Value) -> Vec<String> {
        let key = call.get("index").and_then(Value::as_i64).unwrap_or(0);
        let mut frames = Vec::new();
        if !self.tool_indices.contains_key(&key) {
            let pending = self.stop_filter.finish();
            frames.extend(self.emit_text_delta(&pending));
            let id = call.get("id").and_then(Value::as_str).map_or_else(
                || format!("toolu_{}", uuid::Uuid::new_v4().simple()),
                String::from,
            );
            let name = call
                .get("function")
                .and_then(|f| f.get("name"))
                .and_then(Value::as_str)
                .unwrap_or("")
                .to_string();
            frames.extend(self.close_open_block());
            let index = self.next_index;
            self.next_index += 1;
            self.tool_indices.insert(key, index);
            self.open_block = Some(index);
            frames.push(anthropic_frame(
                "content_block_start",
                &json!({
                    "type": "content_block_start",
                    "index": index,
                    "content_block": {"type": "tool_use", "id": id, "name": name, "input": {}},
                }),
            ));
        }
        let index = self.tool_indices[&key];
        if let Some(args) = call
            .get("function")
            .and_then(|f| f.get("arguments"))
            .and_then(Value::as_str)
            && !args.is_empty()
        {
            frames.push(anthropic_frame(
                "content_block_delta",
                &json!({
                    "type": "content_block_delta",
                    "index": index,
                    "delta": {"type": "input_json_delta", "partial_json": args},
                }),
            ));
        }
        frames
    }

    // ---- OpenAI Responses events --------------------------------------

    fn translate_response_event(&mut self, event: &Value) -> Vec<String> {
        if self.finished {
            return Vec::new();
        }
        let kind = event.get("type").and_then(Value::as_str).unwrap_or("");
        self.capture_model(
            event
                .get("response")
                .and_then(|response| response.get("model")),
        );
        let mut frames = self.ensure_started();
        match kind {
            "response.output_text.delta" => {
                if let Some(text) = event.get("delta").and_then(Value::as_str)
                    && !text.is_empty()
                {
                    frames.extend(self.text_delta(text));
                }
            }
            "response.output_item.added" | "response.output_item.done" => {
                let item = event.get("item").unwrap_or(&Value::Null);
                if item.get("type").and_then(Value::as_str) == Some("function_call") {
                    let key = event
                        .get("output_index")
                        .and_then(Value::as_i64)
                        .unwrap_or(0);
                    frames.extend(self.tool_call_delta(&json!({
                        "index": key,
                        "id": item.get("call_id").or_else(|| item.get("id")).cloned().unwrap_or(Value::Null),
                        "function": {"name": item.get("name").cloned().unwrap_or(Value::Null)},
                    })));
                } else if item.get("type").and_then(Value::as_str) == Some("web_search_call") {
                    let key = event
                        .get("output_index")
                        .and_then(Value::as_i64)
                        .unwrap_or(0);
                    if kind == "response.output_item.added" {
                        frames.extend(self.server_tool_start(key, item));
                    } else if item.get("status").and_then(Value::as_str) == Some("completed") {
                        frames.extend(self.server_tool_result(key, item));
                    }
                }
            }
            "response.function_call_arguments.delta" => {
                let key = event
                    .get("output_index")
                    .and_then(Value::as_i64)
                    .unwrap_or(0);
                if let Some(args) = event.get("delta").and_then(Value::as_str) {
                    frames.extend(self.tool_call_delta(&json!({
                        "index": key,
                        "function": {"arguments": args},
                    })));
                }
            }
            "response.completed" | "response.incomplete" | "response.failed" => {
                let response = event.get("response").unwrap_or(&Value::Null);
                self.absorb_usage(response.get("usage"));
                if self.stop_reason.is_none() {
                    self.stop_reason = Some(
                        if kind == "response.incomplete" {
                            "max_tokens"
                        } else if self.tool_indices.is_empty() {
                            "end_turn"
                        } else {
                            "tool_use"
                        }
                        .to_string(),
                    );
                }
                let pending = self.stop_filter.finish();
                frames.extend(self.emit_text_delta(&pending));
                frames.extend(self.close_stream());
            }
            _ => {}
        }
        frames
    }

    fn server_tool_start(&mut self, key: i64, item: &Value) -> Vec<String> {
        if self.server_tool_indices.contains_key(&key) {
            return Vec::new();
        }
        let mut frames = Vec::new();
        let pending = self.stop_filter.finish();
        frames.extend(self.emit_text_delta(&pending));
        frames.extend(self.close_open_block());
        let index = self.next_index;
        self.next_index += 1;
        let id = item.get("id").and_then(Value::as_str).map_or_else(
            || format!("srvtoolu_{}", uuid::Uuid::new_v4().simple()),
            str::to_string,
        );
        self.server_tool_indices.insert(key, (index, id.clone()));
        self.open_block = Some(index);
        frames.push(anthropic_frame(
            "content_block_start",
            &json!({
                "type": "content_block_start",
                "index": index,
                "content_block": {
                    "type": "server_tool_use",
                    "id": id,
                    "name": "web_search",
                    "input": item.get("action").cloned().unwrap_or_else(|| json!({})),
                },
            }),
        ));
        frames
    }

    fn server_tool_result(&mut self, key: i64, item: &Value) -> Vec<String> {
        let mut frames = Vec::new();
        if !self.server_tool_indices.contains_key(&key) {
            frames.extend(self.server_tool_start(key, item));
        }
        let Some((_, id)) = self.server_tool_indices.get(&key).cloned() else {
            return frames;
        };
        frames.extend(self.close_open_block());
        let index = self.next_index;
        self.next_index += 1;
        frames.push(anthropic_frame(
            "content_block_start",
            &json!({
                "type": "content_block_start",
                "index": index,
                "content_block": {
                    "type": "web_search_tool_result",
                    "tool_use_id": id,
                    "content": [],
                },
            }),
        ));
        frames.push(anthropic_frame(
            "content_block_stop",
            &json!({"type": "content_block_stop", "index": index}),
        ));
        self.web_search_requests = self.web_search_requests.saturating_add(1);
        frames
    }

    fn capture_model(&mut self, model: Option<&Value>) {
        if self.started {
            return;
        }
        if let Some(model) = model.and_then(Value::as_str) {
            self.model = model.to_string();
        }
    }

    // ---- shared -------------------------------------------------------

    fn absorb_usage(&mut self, usage: Option<&Value>) {
        let Some(usage) = usage else { return };
        for key in ["input_tokens", "prompt_tokens"] {
            if let Some(v) = usage.get(key).and_then(Value::as_u64) {
                self.input_tokens = v;
            }
        }
        for key in ["output_tokens", "completion_tokens"] {
            if let Some(v) = usage.get(key).and_then(Value::as_u64) {
                self.output_tokens = v;
            }
        }
    }

    fn ensure_started(&mut self) -> Vec<String> {
        if self.started {
            return Vec::new();
        }
        self.started = true;
        vec![anthropic_frame(
            "message_start",
            &json!({
                "type": "message_start",
                "message": {
                    "id": self.id,
                    "type": "message",
                    "role": "assistant",
                    "model": self.model,
                    "content": [],
                    "stop_reason": Value::Null,
                    "stop_sequence": Value::Null,
                    "usage": {"input_tokens": self.input_tokens, "output_tokens": 0},
                },
            }),
        )]
    }

    fn text_delta(&mut self, text: &str) -> Vec<String> {
        let (visible, matched) = self.stop_filter.push(text);
        let mut frames = self.emit_text_delta(&visible);
        if let Some(sequence) = matched {
            self.stop_reason = Some("end_turn".into());
            self.stop_sequence = Some(sequence);
            frames.extend(self.close_stream());
        }
        frames
    }

    fn emit_text_delta(&mut self, text: &str) -> Vec<String> {
        if text.is_empty() {
            return Vec::new();
        }
        let mut frames = Vec::new();
        // Reuse the text block only while it is still the open one: Anthropic
        // allows a single open content block at a time, so text arriving after
        // a tool block starts a fresh text block instead.
        let index =
            if let (Some(index), true) = (self.text_index, self.open_block == self.text_index) {
                index
            } else {
                frames.extend(self.close_open_block());
                let index = self.next_index;
                self.next_index += 1;
                self.text_index = Some(index);
                self.open_block = Some(index);
                frames.push(anthropic_frame(
                    "content_block_start",
                    &json!({
                        "type": "content_block_start",
                        "index": index,
                        "content_block": {"type": "text", "text": ""},
                    }),
                ));
                index
            };
        frames.push(anthropic_frame(
            "content_block_delta",
            &json!({
                "type": "content_block_delta",
                "index": index,
                "delta": {"type": "text_delta", "text": text},
            }),
        ));
        frames
    }

    fn close_open_block(&mut self) -> Vec<String> {
        let Some(index) = self.open_block.take() else {
            return Vec::new();
        };
        vec![anthropic_frame(
            "content_block_stop",
            &json!({"type": "content_block_stop", "index": index}),
        )]
    }

    fn close_stream(&mut self) -> Vec<String> {
        if self.finished {
            return Vec::new();
        }
        self.finished = true;
        let mut frames = self.close_open_block();
        let stop_reason = self
            .stop_reason
            .clone()
            .unwrap_or_else(|| "end_turn".to_string());
        let mut usage = json!({
            "input_tokens": self.input_tokens,
            "output_tokens": self.output_tokens,
        });
        if self.web_search_requests > 0 {
            usage["server_tool_use"] = json!({
                "web_search_requests": self.web_search_requests,
                "web_fetch_requests": 0,
            });
        }
        frames.push(anthropic_frame(
            "message_delta",
            &json!({
                "type": "message_delta",
                "delta": {"stop_reason": stop_reason, "stop_sequence": self.stop_sequence},
                "usage": usage,
            }),
        ));
        frames.push(anthropic_frame(
            "message_stop",
            &json!({"type": "message_stop"}),
        ));
        frames
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn joined(frames: &[String]) -> String {
        frames.join("")
    }

    #[test]
    fn translates_chat_chunks_to_anthropic_events() {
        let mut t = AnthropicStreamTranslator::new("claude-sonnet-4-5");
        let mut out = String::new();
        out.push_str(&joined(&t.push(
            b"data: {\"object\":\"chat.completion.chunk\",\"choices\":[{\"delta\":{\"role\":\"assistant\"}}]}\n\n",
        )));
        out.push_str(&joined(&t.push(
            b"data: {\"object\":\"chat.completion.chunk\",\"choices\":[{\"delta\":{\"content\":\"Hel\"}}]}\n\n",
        )));
        out.push_str(&joined(&t.push(
            b"data: {\"object\":\"chat.completion.chunk\",\"choices\":[{\"delta\":{\"content\":\"lo\"},\"finish_reason\":\"stop\"}]}\n\n",
        )));
        out.push_str(&joined(&t.push(b"data: [DONE]\n\n")));

        assert!(out.contains("event: message_start"));
        assert!(out.contains("\"model\":\"claude-sonnet-4-5\""));
        assert!(out.contains("event: content_block_start"));
        assert!(out.contains("\"text_delta\""));
        assert!(out.contains("\"text\":\"Hel\""));
        assert!(out.contains("\"text\":\"lo\""));
        assert!(out.contains("event: content_block_stop"));
        assert!(out.contains("\"stop_reason\":\"end_turn\""));
        assert!(out.contains("event: message_stop"));
    }

    #[test]
    fn translates_chat_tool_calls_to_tool_use_blocks() {
        let mut t = AnthropicStreamTranslator::new("claude-sonnet-4-5");
        let mut out = String::new();
        out.push_str(&joined(&t.push(
            b"data: {\"choices\":[{\"delta\":{\"tool_calls\":[{\"index\":0,\"id\":\"call_1\",\"function\":{\"name\":\"get_time\",\"arguments\":\"\"}}]}}]}\n\n",
        )));
        out.push_str(&joined(&t.push(
            b"data: {\"choices\":[{\"delta\":{\"tool_calls\":[{\"index\":0,\"function\":{\"arguments\":\"{\\\"tz\\\":\"}}]}}]}\n\n",
        )));
        out.push_str(&joined(&t.push(
            b"data: {\"choices\":[{\"delta\":{},\"finish_reason\":\"tool_calls\"}]}\n\n",
        )));
        out.push_str(&joined(&t.finish()));

        assert!(out.contains("\"type\":\"tool_use\""));
        assert!(out.contains("\"name\":\"get_time\""));
        assert!(out.contains("\"id\":\"call_1\""));
        assert!(out.contains("\"input_json_delta\""));
        assert!(out.contains("\"stop_reason\":\"tool_use\""));
    }

    #[test]
    fn translates_responses_events_to_anthropic_events() {
        let mut t = AnthropicStreamTranslator::new("claude-opus-4-7");
        let mut out = String::new();
        out.push_str(&joined(&t.push(
            b"data: {\"type\":\"response.created\",\"response\":{\"id\":\"resp_1\"}}\n\n",
        )));
        out.push_str(&joined(&t.push(
            b"data: {\"type\":\"response.output_text.delta\",\"delta\":\"hi\"}\n\n",
        )));
        out.push_str(&joined(&t.push(
            b"data: {\"type\":\"response.completed\",\"response\":{\"usage\":{\"input_tokens\":11,\"output_tokens\":3}}}\n\n",
        )));

        assert!(out.contains("event: message_start"));
        assert!(out.contains("\"text\":\"hi\""));
        assert!(out.contains("\"output_tokens\":3"));
        assert!(out.contains("event: message_stop"));
    }

    #[test]
    fn responses_function_calls_become_tool_use() {
        let mut t = AnthropicStreamTranslator::new("claude-opus-4-7");
        let mut out = String::new();
        out.push_str(&joined(&t.push(
            b"data: {\"type\":\"response.output_item.added\",\"output_index\":0,\"item\":{\"type\":\"function_call\",\"call_id\":\"fc_1\",\"name\":\"lookup\"}}\n\n",
        )));
        out.push_str(&joined(&t.push(
            b"data: {\"type\":\"response.function_call_arguments.delta\",\"output_index\":0,\"delta\":\"{\\\"q\\\":1}\"}\n\n",
        )));
        out.push_str(&joined(&t.push(
            b"data: {\"type\":\"response.completed\",\"response\":{}}\n\n",
        )));

        assert!(out.contains("\"type\":\"tool_use\""));
        assert!(out.contains("\"name\":\"lookup\""));
        assert!(out.contains("\"input_json_delta\""));
        assert!(out.contains("\"stop_reason\":\"tool_use\""));
    }

    #[test]
    fn responses_web_search_stays_a_server_tool_and_reports_usage() {
        let mut t = AnthropicStreamTranslator::new("gpt-5.6-sol");
        let mut out = String::new();
        out.push_str(&joined(&t.push(
            b"data:{\"type\":\"response.output_item.added\",\"output_index\":0,\"item\":{\"type\":\"web_search_call\",\"id\":\"ws_1\",\"status\":\"in_progress\",\"action\":{\"query\":\"Rust\"}}}\n\n",
        )));
        out.push_str(&joined(&t.push(
            b"data:{\"type\":\"response.output_item.done\",\"output_index\":0,\"item\":{\"type\":\"web_search_call\",\"id\":\"ws_1\",\"status\":\"completed\"}}\n\n",
        )));
        out.push_str(&joined(
            &t.push(b"data:{\"type\":\"response.completed\",\"response\":{}}\n\n"),
        ));

        assert!(out.contains("\"type\":\"server_tool_use\""));
        assert!(out.contains("\"type\":\"web_search_tool_result\""));
        assert!(out.contains("\"web_search_requests\":1"));
        assert!(!out.contains("\"type\":\"tool_use\""));
    }

    #[test]
    fn anthropic_stop_sequence_is_enforced_across_sse_chunks() {
        let mut t =
            AnthropicStreamTranslator::new("gpt-5.6-sol").with_stop_sequences(vec!["<END>".into()]);
        let first = joined(
            &t.push(b"data:{\"type\":\"response.output_text.delta\",\"delta\":\"visible<E\"}\n\n"),
        );
        let second = joined(
            &t.push(b"data:{\"type\":\"response.output_text.delta\",\"delta\":\"ND>hidden\"}\n\n"),
        );
        let out = format!("{first}{second}");
        assert!(out.contains("visible"));
        assert!(!out.contains("\"text\":\"<END>\""));
        assert!(!out.contains("hidden"));
        assert!(out.contains("\"stop_sequence\":\"<END>\""));
        assert!(out.contains("event: message_stop"));
    }

    #[test]
    fn finish_is_idempotent_and_always_terminates_the_stream() {
        let mut t = AnthropicStreamTranslator::new("claude-sonnet-4-5");
        let first = joined(&t.finish());
        assert!(first.contains("event: message_start"));
        assert!(first.contains("event: message_stop"));
        assert!(t.finish().is_empty());
    }
}
