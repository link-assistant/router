//! Incremental Anthropic SSE to `OpenAI` SSE translation.
//!
//! Split from `openai.rs` to keep that file within the repository's 1000-line
//! limit. The streamed and non-streaming translations must agree; see the
//! drift-guard test in `openai_response_tests.rs` (issue #218).

use std::collections::BTreeMap;

use serde_json::{Value, json};

use super::{done_frame, extract_sse_data, map_finish_reason, response_sse_frame, sse_frame};

/// OpenAI-compatible stream response shape to emit while translating
/// Anthropic SSE events.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum OpenAIStreamShape {
    ChatCompletion,
    Response,
}

/// Incremental Anthropic SSE to `OpenAI` SSE translator.
#[derive(Debug, Clone)]
pub struct OpenAIStreamTranslator {
    shape: OpenAIStreamShape,
    served_model: String,
    id: String,
    created: i64,
    buffer: Vec<u8>,
    sent_chat_role: bool,
    sent_response_created: bool,
    sent_final: bool,
    usage_requested: Option<()>,
    input_tokens: u64,
    output_tokens: u64,
    response_output_text: String,
    /// The output slot the text item occupies, once any text has arrived.
    ///
    /// `None` until then, which is what keeps a tool-only turn from carrying an
    /// empty `output_text` item: a well-formed, successful, empty answer is
    /// worse than an error, because the client cannot tell anything went wrong
    /// (issue #218). The item is announced on first text rather than up front.
    response_text_item: Option<u64>,
    /// Streamed tool calls, keyed by the upstream content-block index.
    ///
    /// Anthropic announces a `tool_use` block and then streams its arguments as
    /// `input_json_delta` fragments, so the name and identifier must be held
    /// until the arguments are complete.
    response_tool_calls: BTreeMap<u64, ResponseToolCall>,
    /// Output slots already used, so each item gets a distinct `output_index`.
    response_output_index: u64,
}

/// A `function_call` item being assembled from an upstream `tool_use` block.
#[derive(Clone, Debug)]
struct ResponseToolCall {
    call_id: String,
    name: String,
    arguments: String,
    output_index: u64,
}

impl ResponseToolCall {
    /// The completed item, in the same shape the non-streaming path builds
    /// (`responses::chat_tool_call_to_responses`), so the two agree.
    fn item(&self) -> Value {
        json!({
            "id": format!("fc-{}", self.call_id),
            "type": "function_call",
            "status": "completed",
            "call_id": self.call_id,
            "name": self.name,
            "arguments": if self.arguments.is_empty() { "{}" } else { &self.arguments },
        })
    }
}

impl OpenAIStreamTranslator {
    /// Create a stream translator for one upstream request.
    #[must_use]
    pub fn new(shape: OpenAIStreamShape, resolved_model: &str) -> Self {
        let prefix = match shape {
            OpenAIStreamShape::ChatCompletion => "chatcmpl",
            OpenAIStreamShape::Response => "resp",
        };
        Self {
            shape,
            served_model: resolved_model.to_string(),
            id: format!("{prefix}-{}", uuid::Uuid::new_v4()),
            created: chrono::Utc::now().timestamp(),
            buffer: Vec::new(),
            sent_chat_role: false,
            sent_response_created: false,
            sent_final: false,
            usage_requested: None,
            input_tokens: 0,
            output_tokens: 0,
            response_output_text: String::new(),
            response_text_item: None,
            response_tool_calls: BTreeMap::new(),
            response_output_index: 0,
        }
    }

    /// Request a final Chat Completions usage chunk with empty choices.
    #[must_use]
    pub const fn with_include_usage(mut self, include_usage: bool) -> Self {
        self.usage_requested = if include_usage { Some(()) } else { None };
        self
    }

    /// Push raw upstream bytes and return zero or more `OpenAI` SSE frames.
    pub fn push(&mut self, chunk: &[u8]) -> Vec<String> {
        let mut frames = Vec::new();
        for block in crate::sse::push_blocks(&mut self.buffer, chunk) {
            frames.extend(self.translate_block(&block));
        }
        frames
    }

    fn translate_block(&mut self, block: &str) -> Vec<String> {
        let data = extract_sse_data(block);
        if data.is_empty() {
            return Vec::new();
        }
        if data == "[DONE]" {
            self.sent_final = true;
            return vec![done_frame()];
        }
        let Ok(event) = serde_json::from_str::<Value>(&data) else {
            return Vec::new();
        };
        match self.shape {
            OpenAIStreamShape::ChatCompletion => self.translate_chat_event(&event),
            OpenAIStreamShape::Response => self.translate_response_event(&event),
        }
    }

    fn translate_chat_event(&mut self, event: &Value) -> Vec<String> {
        match event.get("type").and_then(Value::as_str) {
            Some("message_start") => {
                self.capture_upstream_identity(event);
                self.capture_anthropic_usage(event.pointer("/message/usage"));
                if let Some(id) = event
                    .get("message")
                    .and_then(|m| m.get("id"))
                    .and_then(Value::as_str)
                {
                    self.id = format!("chatcmpl-{id}");
                }
                self.sent_chat_role = true;
                vec![self.chat_frame(&json!({"role": "assistant"}), None)]
            }
            Some("content_block_start") => {
                let block = event.get("content_block").unwrap_or(&Value::Null);
                if block.get("type").and_then(Value::as_str) != Some("tool_use") {
                    return Vec::new();
                }
                self.sent_chat_role = true;
                let index = event.get("index").and_then(Value::as_u64).unwrap_or(0);
                let id = block.get("id").and_then(Value::as_str).unwrap_or("");
                let name = block.get("name").and_then(Value::as_str).unwrap_or("");
                vec![self.chat_frame(
                    &json!({
                        "tool_calls": [{
                            "index": index,
                            "id": id,
                            "type": "function",
                            "function": {"name": name, "arguments": ""}
                        }]
                    }),
                    None,
                )]
            }
            Some("content_block_delta") => {
                let delta = event.get("delta").unwrap_or(&Value::Null);
                match delta.get("type").and_then(Value::as_str) {
                    Some("text_delta") => {
                        let text = delta.get("text").and_then(Value::as_str).unwrap_or("");
                        let mut payload = json!({"content": text});
                        if !self.sent_chat_role {
                            payload["role"] = Value::String("assistant".into());
                            self.sent_chat_role = true;
                        }
                        vec![self.chat_frame(&payload, None)]
                    }
                    Some("input_json_delta") => {
                        let partial = delta
                            .get("partial_json")
                            .and_then(Value::as_str)
                            .unwrap_or("");
                        let index = event.get("index").and_then(Value::as_u64).unwrap_or(0);
                        vec![self.chat_frame(
                            &json!({
                                "tool_calls": [{
                                    "index": index,
                                    "function": {"arguments": partial}
                                }]
                            }),
                            None,
                        )]
                    }
                    _ => Vec::new(),
                }
            }
            Some("message_delta") => {
                self.capture_anthropic_usage(event.get("usage"));
                event
                    .get("delta")
                    .and_then(|d| d.get("stop_reason"))
                    .and_then(Value::as_str)
                    .map_or_else(Vec::new, |reason| {
                        self.sent_final = true;
                        vec![self.chat_frame(&json!({}), Some(map_finish_reason(reason)))]
                    })
            }
            Some("message_stop") => {
                let mut frames = Vec::new();
                if !self.sent_final {
                    frames.push(self.chat_frame(&json!({}), Some("stop")));
                    self.sent_final = true;
                }
                if self.usage_requested.is_some() {
                    frames.push(self.chat_usage_frame());
                }
                frames.push(done_frame());
                frames
            }
            _ => Vec::new(),
        }
    }

    fn translate_response_event(&mut self, event: &Value) -> Vec<String> {
        match event.get("type").and_then(Value::as_str) {
            Some("message_start") => {
                self.capture_upstream_identity(event);
                if let Some(id) = event
                    .get("message")
                    .and_then(|m| m.get("id"))
                    .and_then(Value::as_str)
                {
                    self.id = format!("resp-{id}");
                }
                self.sent_response_created = true;
                // The message item is announced when the first text arrives,
                // not here: a tool-only turn must not carry an empty
                // `output_text` item (issue #218).
                vec![
                    response_sse_frame(&json!({
                        "type": "response.created",
                        "response": self.response_object("in_progress", false)
                    })),
                    response_sse_frame(&json!({
                        "type": "response.in_progress",
                        "response": self.response_object("in_progress", false)
                    })),
                ]
            }
            Some("content_block_start") => {
                // Anthropic announces a tool call here, with the identifier and
                // name the caller needs before any arguments arrive.
                let block = event.get("content_block").unwrap_or(&Value::Null);
                if block.get("type").and_then(Value::as_str) != Some("tool_use") {
                    return Vec::new();
                }
                self.sent_response_created = true;
                let index = event.get("index").and_then(Value::as_u64).unwrap_or(0);
                let call = ResponseToolCall {
                    call_id: block
                        .get("id")
                        .and_then(Value::as_str)
                        .unwrap_or_default()
                        .to_string(),
                    name: block
                        .get("name")
                        .and_then(Value::as_str)
                        .unwrap_or_default()
                        .to_string(),
                    arguments: String::new(),
                    output_index: self.take_output_index(),
                };
                let frame = response_sse_frame(&json!({
                    "type": "response.output_item.added",
                    "output_index": call.output_index,
                    "item": {
                        "id": format!("fc-{}", call.call_id),
                        "type": "function_call",
                        "status": "in_progress",
                        "call_id": call.call_id,
                        "name": call.name,
                        "arguments": "",
                    }
                }));
                self.response_tool_calls.insert(index, call);
                vec![frame]
            }
            Some("content_block_delta") => {
                if !self.sent_response_created {
                    self.sent_response_created = true;
                }
                let delta = event.get("delta").unwrap_or(&Value::Null);
                match delta.get("type").and_then(Value::as_str) {
                    Some("text_delta") => {
                        let text = delta.get("text").and_then(Value::as_str).unwrap_or("");
                        let mut frames = self.open_response_text_item();
                        self.response_output_text.push_str(text);
                        frames.push(response_sse_frame(&json!({
                            "type": "response.output_text.delta",
                            "response_id": self.id,
                            "item_id": self.response_item_id(),
                            "output_index": self.response_text_item.unwrap_or(0),
                            "content_index": 0,
                            "delta": text
                        })));
                        frames
                    }
                    Some("input_json_delta") => {
                        // The arguments arrive as fragments that must be
                        // concatenated in order; a fragment is not valid JSON on
                        // its own.
                        let partial = delta
                            .get("partial_json")
                            .and_then(Value::as_str)
                            .unwrap_or("");
                        let index = event.get("index").and_then(Value::as_u64).unwrap_or(0);
                        let Some(call) = self.response_tool_calls.get_mut(&index) else {
                            return Vec::new();
                        };
                        call.arguments.push_str(partial);
                        vec![response_sse_frame(&json!({
                            "type": "response.function_call_arguments.delta",
                            "item_id": format!("fc-{}", call.call_id),
                            "output_index": call.output_index,
                            "delta": partial
                        }))]
                    }
                    _ => Vec::new(),
                }
            }
            Some("content_block_stop") => {
                let index = event.get("index").and_then(Value::as_u64).unwrap_or(0);
                let Some(call) = self.response_tool_calls.get(&index) else {
                    return Vec::new();
                };
                let arguments = if call.arguments.is_empty() {
                    "{}"
                } else {
                    &call.arguments
                };
                vec![
                    response_sse_frame(&json!({
                        "type": "response.function_call_arguments.done",
                        "item_id": format!("fc-{}", call.call_id),
                        "output_index": call.output_index,
                        "arguments": arguments
                    })),
                    response_sse_frame(&json!({
                        "type": "response.output_item.done",
                        "output_index": call.output_index,
                        "item": call.item()
                    })),
                ]
            }
            Some("message_stop") => {
                self.sent_final = true;
                let mut frames = Vec::new();
                // Only close the text item if one was ever opened. A tool-only
                // turn previously ended here with `"text": ""`, which reads to
                // the caller as a successful empty answer (issue #218).
                if let Some(index) = self.response_text_item {
                    frames.push(response_sse_frame(&json!({
                        "type": "response.output_text.done",
                        "item_id": self.response_item_id(),
                        "output_index": index,
                        "content_index": 0,
                        "text": self.response_output_text
                    })));
                    frames.push(response_sse_frame(&json!({
                        "type": "response.content_part.done",
                        "item_id": self.response_item_id(),
                        "output_index": index,
                        "content_index": 0,
                        "part": Self::response_content_part(&self.response_output_text)
                    })));
                    frames.push(response_sse_frame(&json!({
                        "type": "response.output_item.done",
                        "output_index": index,
                        "item": self.response_output_item("completed", true)
                    })));
                }
                frames.push(response_sse_frame(&json!({
                    "type": "response.completed",
                    "response": self.response_object("completed", true)
                })));
                frames.push(done_frame());
                frames
            }
            _ => Vec::new(),
        }
    }

    fn chat_frame(&self, delta: &Value, finish_reason: Option<&str>) -> String {
        sse_frame(&json!({
            "id": self.id,
            "object": "chat.completion.chunk",
            "created": self.created,
            "model": self.served_model,
            "choices": [{
                "index": 0,
                "delta": delta,
                "finish_reason": finish_reason
            }]
        }))
    }

    fn chat_usage_frame(&self) -> String {
        sse_frame(&json!({
            "id": self.id,
            "object": "chat.completion.chunk",
            "created": self.created,
            "model": self.served_model,
            "choices": [],
            "usage": {
                "prompt_tokens": self.input_tokens,
                "completion_tokens": self.output_tokens,
                "total_tokens": self.input_tokens + self.output_tokens,
            }
        }))
    }

    fn capture_anthropic_usage(&mut self, usage: Option<&Value>) {
        let Some(usage) = usage else {
            return;
        };
        self.input_tokens = usage
            .get("input_tokens")
            .and_then(Value::as_u64)
            .unwrap_or(self.input_tokens);
        self.output_tokens = usage
            .get("output_tokens")
            .and_then(Value::as_u64)
            .unwrap_or(self.output_tokens);
    }

    fn response_object(&self, status: &str, include_output: bool) -> Value {
        // The completed response lists every item the stream produced, in the
        // order the caller saw them: a tool-only turn carries just its
        // `function_call` items, and a mixed turn carries both (issue #218).
        let output = if include_output {
            let mut items: Vec<(u64, Value)> = self
                .response_tool_calls
                .values()
                .map(|call| (call.output_index, call.item()))
                .collect();
            if let Some(index) = self.response_text_item {
                items.push((index, self.response_output_item("completed", true)));
            }
            items.sort_by_key(|(index, _)| *index);
            items.into_iter().map(|(_, item)| item).collect()
        } else {
            Vec::new()
        };
        json!({
            "id": self.id,
            "object": "response",
            "created_at": self.created,
            "model": self.served_model,
            "status": status,
            "output": output
        })
    }

    fn response_item_id(&self) -> String {
        format!("msg-{}", self.id)
    }

    /// Claim the next output slot, so text and each tool call are distinct
    /// items in the response as Anthropic's increasing block indices intend.
    const fn take_output_index(&mut self) -> u64 {
        let index = self.response_output_index;
        self.response_output_index += 1;
        index
    }

    /// Announce the text item on first use, so a tool-only turn never carries
    /// an empty one (issue #218).
    fn open_response_text_item(&mut self) -> Vec<String> {
        if self.response_text_item.is_some() {
            return Vec::new();
        }
        let index = self.take_output_index();
        self.response_text_item = Some(index);
        vec![
            response_sse_frame(&json!({
                "type": "response.output_item.added",
                "output_index": index,
                "item": self.response_output_item("in_progress", false)
            })),
            response_sse_frame(&json!({
                "type": "response.content_part.added",
                "item_id": self.response_item_id(),
                "output_index": index,
                "content_index": 0,
                "part": Self::response_content_part("")
            })),
        ]
    }

    fn response_content_part(text: &str) -> Value {
        json!({"type": "output_text", "text": text, "annotations": []})
    }

    fn response_output_item(&self, status: &str, include_content: bool) -> Value {
        let content = if include_content {
            vec![Self::response_content_part(&self.response_output_text)]
        } else {
            Vec::new()
        };
        json!({
            "id": self.response_item_id(),
            "type": "message",
            "status": status,
            "role": "assistant",
            "content": content
        })
    }

    fn capture_upstream_identity(&mut self, event: &Value) {
        if let Some(model) = event
            .get("message")
            .and_then(|message| message.get("model"))
            .and_then(Value::as_str)
        {
            self.served_model = model.to_string();
        }
    }
}
