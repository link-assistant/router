//! OpenAI-compatible API surface.
//!
//! Issue #7 R5 / R12 require the router to expose:
//!
//! - `POST /v1/chat/completions` — `OpenAI` Chat Completions
//! - `POST /v1/responses` — `OpenAI` Responses (newer agentic API)
//! - `GET  /v1/models` — model discovery
//!
//! These translate to / from the upstream Anthropic Messages API so any
//! client written for the `OpenAI` SDK can talk to Claude MAX through us.
//!
//! The translation surface is intentionally minimal but extensible:
//!
//! - `OpenAIChatCompletionRequest` mirrors the `OpenAI` request shape; we
//!   convert it to an Anthropic `messages` payload and forward via the
//!   existing proxy plumbing.
//! - `to_chat_completion_response` converts the upstream Anthropic
//!   response (whether streamed SSE chunks or a buffered JSON body) to
//!   the `OpenAI` Chat Completions response shape.
//!
//! Streaming Anthropic SSE responses are translated incrementally into the
//! matching `OpenAI` Chat Completions or Responses SSE event shape.

use std::collections::BTreeMap;

use serde::{Deserialize, Serialize};
use serde_json::{Value, json};

/// One chat message in the `OpenAI` request.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ChatMessage {
    pub role: String,
    /// `OpenAI` permits `content` as either a string or an array of parts.
    /// We accept both via `Value` and normalise downstream.
    #[serde(default)]
    pub content: Value,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
    /// Identifier of the tool call answered by a `role=tool` message.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub tool_call_id: Option<String>,
    /// Function calls emitted by an assistant turn.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub tool_calls: Option<Value>,
}

/// `OpenAI` `POST /v1/chat/completions` request body.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OpenAIChatCompletionRequest {
    pub model: String,
    pub messages: Vec<ChatMessage>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub max_tokens: Option<u32>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub max_completion_tokens: Option<u32>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub temperature: Option<f32>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub top_p: Option<f32>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub stream: Option<bool>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub stop: Option<Value>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub tools: Option<Value>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub tool_choice: Option<Value>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub reasoning_effort: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub reasoning: Option<Value>,
}

/// Translate an `OpenAI` Chat Completions request to an Anthropic Messages
/// request body (returned as a JSON value).
#[must_use]
pub fn chat_completion_to_anthropic(req: &OpenAIChatCompletionRequest) -> Value {
    let mut system_chunks: Vec<String> = Vec::new();
    let mut messages: Vec<Value> = Vec::new();

    for msg in &req.messages {
        let role = msg.role.as_str();
        match role {
            "system" | "developer" => {
                if let Some(text) = extract_text(&msg.content) {
                    system_chunks.push(text);
                }
            }
            "user" | "assistant" => {
                let mut anthropic_content = match &msg.content {
                    Value::String(s) => Value::String(s.clone()),
                    Value::Array(parts) => Value::Array(translate_parts(parts)),
                    _ => Value::String(extract_text(&msg.content).unwrap_or_default()),
                };
                if role == "assistant"
                    && let Some(tool_calls) = msg.tool_calls.as_ref().and_then(Value::as_array)
                {
                    let mut blocks = match anthropic_content {
                        Value::String(ref text) if text.is_empty() => Vec::new(),
                        Value::String(text) => vec![json!({"type": "text", "text": text})],
                        Value::Array(blocks) => blocks,
                        _ => Vec::new(),
                    };
                    blocks.extend(tool_calls.iter().map(|call| {
                        let function = call.get("function").unwrap_or(&Value::Null);
                        let arguments = function
                            .get("arguments")
                            .and_then(Value::as_str)
                            .and_then(|raw| serde_json::from_str::<Value>(raw).ok())
                            .unwrap_or_else(|| json!({}));
                        json!({
                            "type": "tool_use",
                            "id": call.get("id").and_then(Value::as_str).unwrap_or_default(),
                            "name": function.get("name").and_then(Value::as_str).unwrap_or_default(),
                            "input": arguments,
                        })
                    }));
                    anthropic_content = Value::Array(blocks);
                }
                messages.push(json!({
                    "role": role,
                    "content": anthropic_content,
                }));
            }
            "tool" => {
                // OpenAI uses role=tool for tool results; Anthropic models
                // these as a `tool_result` user content block.
                let txt = extract_text(&msg.content).unwrap_or_default();
                messages.push(json!({
                    "role": "user",
                    "content": [
                        {
                            "type": "tool_result",
                            "tool_use_id": msg.tool_call_id.clone().unwrap_or_default(),
                            "content": txt
                        }
                    ]
                }));
            }
            _ => {}
        }
    }

    let explicit_max_tokens = req.max_completion_tokens.or(req.max_tokens);
    let max_tokens = explicit_max_tokens.unwrap_or(4096);

    let mut body = json!({
        "model": map_model(&req.model),
        "max_tokens": max_tokens,
        "messages": messages,
    });

    if !system_chunks.is_empty() {
        body["system"] = Value::String(system_chunks.join("\n\n"));
    }
    if let Some(t) = req.temperature {
        body["temperature"] = json!(t);
    }
    if let Some(t) = req.top_p {
        body["top_p"] = json!(t);
    }
    if req.stream == Some(true) {
        body["stream"] = json!(true);
    }
    if let Some(stops) = &req.stop {
        body["stop_sequences"] = match stops {
            Value::String(s) => json!([s]),
            other => other.clone(),
        };
    }
    if let Some(tools) = &req.tools {
        body["tools"] = translate_tools(tools);
    }
    if let Some(choice) = &req.tool_choice {
        body["tool_choice"] = translate_tool_choice(choice);
    }
    if let Some(reasoning) = &req.reasoning {
        body["reasoning"] = reasoning.clone();
    } else if let Some(effort) = &req.reasoning_effort {
        body["reasoning"] = json!({"effort": effort});
    }
    reconcile_subscription_parameters_with_limit_origin(
        crate::subscription::SubscriptionProvider::Claude,
        &mut body,
        explicit_max_tokens.is_some(),
    );
    body
}

/// Reconcile request parameters with the selected subscription backend.
///
/// `ChatGPT` subscription inference rejects `temperature` for every advertised
/// model. Claude 5 rejects it too, while older Claude generations retain it.
pub(crate) fn reconcile_subscription_parameters(
    provider: crate::subscription::SubscriptionProvider,
    body: &mut Value,
) {
    reconcile_subscription_parameters_with_limit_origin(provider, body, true);
}

pub(crate) fn reconcile_subscription_parameters_with_limit_origin(
    provider: crate::subscription::SubscriptionProvider,
    body: &mut Value,
    output_limit_was_explicit: bool,
) {
    let model = body.get("model").and_then(Value::as_str);
    let adaptive_thinking = crate::capabilities::claude_uses_adaptive_thinking(model);
    let capabilities = crate::capabilities::subscription(provider, model);
    if capabilities.temperature == crate::capabilities::Capability::Unsupported
        && let Some(object) = body.as_object_mut()
    {
        object.remove("temperature");
    }
    if provider == crate::subscription::SubscriptionProvider::Claude {
        reconcile_claude_thinking(body, adaptive_thinking, output_limit_was_explicit);
    }
}

const CLAUDE_DEFAULT_MAX_TOKENS: u64 = 8_192;
const CLAUDE_MIN_THINKING_BUDGET: u64 = 1_024;
const CLAUDE_OUTPUT_HEADROOM: u64 = 8_192;
const CLAUDE_OUTPUT_FLOOR: u64 = 4_096;
const CLAUDE_FIXED_TOKEN_CEILING: u64 = 32_000;
const CLAUDE_ADAPTIVE_TOKEN_CEILING: u64 = 40_192;

fn reasoning_budget(effort: &str) -> u64 {
    match effort {
        "minimal" => 1_024,
        "low" => 4_096,
        "medium" => 8_192,
        "xhigh" => 24_576,
        "max" => 32_000,
        _ => 16_384,
    }
}

fn adaptive_effort(effort: &str) -> &'static str {
    match effort {
        "minimal" | "low" => "low",
        "medium" => "medium",
        "xhigh" | "max" => "max",
        _ => "high",
    }
}

fn reconcile_claude_thinking(
    body: &mut Value,
    adaptive_thinking: bool,
    output_limit_was_explicit: bool,
) {
    let requested_effort = body
        .pointer("/reasoning/effort")
        .and_then(Value::as_str)
        .map(str::to_string);
    if let Some(object) = body.as_object_mut() {
        object.remove("reasoning");
    }
    let thinking_present = body.get("thinking").is_some();
    if !thinking_present
        && requested_effort
            .as_deref()
            .is_some_and(|effort| effort != "none")
    {
        let effort = requested_effort.as_deref().unwrap_or("high");
        let requested_budget = reasoning_budget(effort);
        if adaptive_thinking {
            body["thinking"] = json!({"type": "adaptive"});
            body["output_config"] = json!({"effort": adaptive_effort(effort)});
            if !output_limit_was_explicit {
                body["max_tokens"] = json!(
                    CLAUDE_DEFAULT_MAX_TOKENS
                        .max(requested_budget.saturating_add(CLAUDE_OUTPUT_HEADROOM))
                        .min(CLAUDE_ADAPTIVE_TOKEN_CEILING)
                );
            }
        } else {
            let mut max_tokens = body
                .get("max_tokens")
                .and_then(Value::as_u64)
                .unwrap_or(CLAUDE_DEFAULT_MAX_TOKENS);
            if !output_limit_was_explicit {
                max_tokens = max_tokens
                    .max(requested_budget.saturating_add(CLAUDE_OUTPUT_HEADROOM))
                    .min(CLAUDE_FIXED_TOKEN_CEILING);
                body["max_tokens"] = json!(max_tokens);
            }
            let available = max_tokens
                .saturating_sub(CLAUDE_OUTPUT_FLOOR)
                .max(CLAUDE_MIN_THINKING_BUDGET);
            body["thinking"] = json!({
                "type": "enabled",
                "budget_tokens": requested_budget.min(available),
            });
        }
    }
    let max_tokens = body
        .get("max_tokens")
        .and_then(Value::as_u64)
        .unwrap_or(CLAUDE_DEFAULT_MAX_TOKENS);
    let thinking_enabled = body
        .get("thinking")
        .and_then(|thinking| thinking.get("type"))
        .and_then(Value::as_str)
        .is_some_and(|kind| matches!(kind, "enabled" | "adaptive"));
    if thinking_enabled {
        if let Some(budget) = body
            .pointer("/thinking/budget_tokens")
            .and_then(Value::as_u64)
            && budget.saturating_add(CLAUDE_OUTPUT_FLOOR) > max_tokens
            && max_tokens > CLAUDE_MIN_THINKING_BUDGET
        {
            body["thinking"]["budget_tokens"] = json!(
                max_tokens
                    .saturating_sub(CLAUDE_OUTPUT_FLOOR)
                    .max(CLAUDE_MIN_THINKING_BUDGET)
            );
        }
        if let Some(object) = body.as_object_mut() {
            object.remove("temperature");
            object.remove("top_p");
        }
    }
}

/// Translate the upstream Anthropic JSON response to an `OpenAI` Chat
/// Completions response.
#[must_use]
pub fn anthropic_to_chat_completion(anthropic: &Value, resolved_model: &str) -> Value {
    let id = anthropic.get("id").and_then(Value::as_str).map_or_else(
        || format!("chatcmpl-{}", uuid::Uuid::new_v4()),
        String::from,
    );

    let mut content = String::new();
    let mut tool_calls: Vec<Value> = Vec::new();
    if let Some(blocks) = anthropic.get("content").and_then(Value::as_array) {
        for block in blocks {
            match block.get("type").and_then(Value::as_str) {
                Some("text") => {
                    if let Some(t) = block.get("text").and_then(Value::as_str) {
                        content.push_str(t);
                    }
                }
                Some("tool_use") => {
                    let name = block.get("name").and_then(Value::as_str).unwrap_or("");
                    let input = block.get("input").cloned().unwrap_or(Value::Null);
                    let id = block.get("id").and_then(Value::as_str).unwrap_or("");
                    tool_calls.push(json!({
                        "id": id,
                        "type": "function",
                        "function": {
                            "name": name,
                            "arguments": serde_json::to_string(&input).unwrap_or_default(),
                        }
                    }));
                }
                _ => {}
            }
        }
    }

    let mut message = json!({"role": "assistant", "content": content});
    if !tool_calls.is_empty() {
        message["tool_calls"] = Value::Array(tool_calls);
    }

    let finish_reason = match anthropic
        .get("stop_reason")
        .and_then(Value::as_str)
        .unwrap_or("end_turn")
    {
        "max_tokens" => "length",
        "end_turn" | "stop_sequence" => "stop",
        "tool_use" => "tool_calls",
        other => other,
    };

    let usage = anthropic.get("usage").cloned().unwrap_or(Value::Null);
    let prompt_tokens = usage
        .get("input_tokens")
        .and_then(Value::as_i64)
        .unwrap_or(0);
    let completion_tokens = usage
        .get("output_tokens")
        .and_then(Value::as_i64)
        .unwrap_or(0);

    let served_model = anthropic
        .get("model")
        .and_then(Value::as_str)
        .unwrap_or(resolved_model);

    json!({
        "id": id,
        "object": "chat.completion",
        "created": chrono::Utc::now().timestamp(),
        "model": served_model,
        "choices": [
            {
                "index": 0,
                "message": message,
                "finish_reason": finish_reason,
            }
        ],
        "usage": {
            "prompt_tokens": prompt_tokens,
            "completion_tokens": completion_tokens,
            "total_tokens": prompt_tokens + completion_tokens,
        }
    })
}

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
    buffer: String,
    sent_chat_role: bool,
    sent_response_created: bool,
    sent_final: bool,
    usage_requested: Option<()>,
    input_tokens: u64,
    output_tokens: u64,
    response_output_text: String,
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
            buffer: String::new(),
            sent_chat_role: false,
            sent_response_created: false,
            sent_final: false,
            usage_requested: None,
            input_tokens: 0,
            output_tokens: 0,
            response_output_text: String::new(),
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
        self.buffer.push_str(&String::from_utf8_lossy(chunk));
        let mut frames = Vec::new();
        while let Some((idx, separator_len)) = find_sse_separator(&self.buffer) {
            let block = self.buffer[..idx].to_string();
            self.buffer.drain(..idx + separator_len);
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
                vec![
                    response_sse_frame(&json!({
                        "type": "response.created",
                        "response": self.response_object("in_progress", false)
                    })),
                    response_sse_frame(&json!({
                        "type": "response.in_progress",
                        "response": self.response_object("in_progress", false)
                    })),
                    response_sse_frame(&json!({
                        "type": "response.output_item.added",
                        "output_index": 0,
                        "item": self.response_output_item("in_progress", false)
                    })),
                    response_sse_frame(&json!({
                        "type": "response.content_part.added",
                        "item_id": self.response_item_id(),
                        "output_index": 0,
                        "content_index": 0,
                        "part": Self::response_content_part("")
                    })),
                ]
            }
            Some("content_block_delta") => {
                if !self.sent_response_created {
                    self.sent_response_created = true;
                }
                let delta = event.get("delta").unwrap_or(&Value::Null);
                if delta.get("type").and_then(Value::as_str) != Some("text_delta") {
                    return Vec::new();
                }
                let text = delta.get("text").and_then(Value::as_str).unwrap_or("");
                self.response_output_text.push_str(text);
                vec![response_sse_frame(&json!({
                    "type": "response.output_text.delta",
                    "response_id": self.id,
                    "item_id": self.response_item_id(),
                    "output_index": 0,
                    "content_index": 0,
                    "delta": text
                }))]
            }
            Some("message_stop") => {
                self.sent_final = true;
                vec![
                    response_sse_frame(&json!({
                        "type": "response.output_text.done",
                        "item_id": self.response_item_id(),
                        "output_index": 0,
                        "content_index": 0,
                        "text": self.response_output_text
                    })),
                    response_sse_frame(&json!({
                        "type": "response.content_part.done",
                        "item_id": self.response_item_id(),
                        "output_index": 0,
                        "content_index": 0,
                        "part": Self::response_content_part(&self.response_output_text)
                    })),
                    response_sse_frame(&json!({
                        "type": "response.output_item.done",
                        "output_index": 0,
                        "item": self.response_output_item("completed", true)
                    })),
                    response_sse_frame(&json!({
                        "type": "response.completed",
                        "response": self.response_object("completed", true)
                    })),
                    done_frame(),
                ]
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
        let output = if include_output {
            vec![self.response_output_item("completed", true)]
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

pub(crate) fn find_sse_separator(buffer: &str) -> Option<(usize, usize)> {
    buffer
        .find("\r\n\r\n")
        .map(|idx| (idx, 4))
        .or_else(|| buffer.find("\n\n").map(|idx| (idx, 2)))
}

pub(crate) fn extract_sse_data(block: &str) -> String {
    block
        .lines()
        .filter_map(|line| {
            line.trim_end_matches('\r')
                .strip_prefix("data:")
                .map(str::trim_start)
        })
        .collect::<Vec<_>>()
        .join("\n")
}

fn sse_frame(value: &Value) -> String {
    format!("data: {value}\n\n")
}

fn response_sse_frame(value: &Value) -> String {
    let event = value
        .get("type")
        .and_then(Value::as_str)
        .unwrap_or("message");
    format!("event: {event}\ndata: {value}\n\n")
}

fn done_frame() -> String {
    "data: [DONE]\n\n".to_string()
}

fn map_finish_reason(reason: &str) -> &'static str {
    match reason {
        "max_tokens" => "length",
        "tool_use" => "tool_calls",
        _ => "stop",
    }
}

/// Resolve a model that the Anthropic-backed `OpenAI` surface can serve.
///
/// If the model already looks like a Claude model id (`claude-...`) it
/// is returned unchanged. `OpenAI` aliases are deliberately finite so a typo
/// cannot silently fall through to an unrelated Claude tier.
#[must_use]
pub fn resolve_model(requested: &str) -> Option<String> {
    let lower = requested.to_lowercase();
    if lower.starts_with("claude-") {
        return Some(requested.to_string());
    }
    match lower.as_str() {
        "gpt-4o-mini" | "gpt-4-mini" => Some("claude-haiku-4-5-20251001".to_string()),
        "o1" | "o1-pro" | "o3" | "o4" | "gpt-5" => Some("claude-opus-4-7".to_string()),
        "gpt-4" | "gpt-4-turbo" | "gpt-4o" => Some("claude-sonnet-4-5-20250929".to_string()),
        _ => None,
    }
}

pub(crate) fn query_stream_requested(query: &BTreeMap<String, String>) -> bool {
    query
        .get("stream")
        .is_some_and(|value| matches!(value.as_str(), "true" | "1"))
}

/// Map an explicit `OpenAI` alias to its Anthropic model ID.
///
/// Unknown names remain unchanged; request handlers reject them with a model
/// not-found response before forwarding. Keeping this infallible wrapper
/// preserves the translation helper API for downstream library callers.
#[must_use]
pub fn map_model(requested: &str) -> String {
    resolve_model(requested).unwrap_or_else(|| requested.to_string())
}

/// Static `/v1/models` listing (Anthropic-issued models, presented in the
/// `OpenAI` list-shape so OpenAI-SDK clients see something familiar).
#[must_use]
pub fn list_models() -> Value {
    let now = chrono::Utc::now().timestamp();
    let entries = [
        "claude-opus-4-7",
        "claude-sonnet-4-5-20250929",
        "claude-haiku-4-5-20251001",
        "claude-sonnet-3-5-20241022",
        "claude-haiku-3-5-20241022",
    ];
    let data: Vec<Value> = entries
        .iter()
        .map(|id| {
            json!({
                "id": id,
                "object": "model",
                "created": now,
                "owned_by": "anthropic",
            })
        })
        .collect();
    json!({"object": "list", "data": data})
}

#[path = "openai_tools.rs"]
mod tools;

pub(crate) use tools::{extract_text, translate_parts, translate_tool_choice, translate_tools};
pub use tools::{
    unsupported_anthropic_tool_type, untranslatable_anthropic_tool_choice,
    untranslatable_chat_tool_history,
};

#[cfg(test)]
#[path = "openai_request_tests.rs"]
mod request_tests;

#[cfg(test)]
#[path = "openai_response_tests.rs"]
mod tests;
