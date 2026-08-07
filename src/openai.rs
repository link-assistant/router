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
                let anthropic_content = match &msg.content {
                    Value::String(s) => Value::String(s.clone()),
                    Value::Array(parts) => Value::Array(translate_parts(parts)),
                    _ => Value::String(extract_text(&msg.content).unwrap_or_default()),
                };
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
                        { "type": "tool_result", "content": txt }
                    ]
                }));
            }
            _ => {}
        }
    }

    let max_tokens = req.max_completion_tokens.or(req.max_tokens).unwrap_or(4096);

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
    body
}

/// Translate the upstream Anthropic JSON response to an `OpenAI` Chat
/// Completions response.
#[must_use]
pub fn anthropic_to_chat_completion(anthropic: &Value, requested_model: &str) -> Value {
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

    json!({
        "id": id,
        "object": "chat.completion",
        "created": chrono::Utc::now().timestamp(),
        "model": requested_model,
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
    requested_model: String,
    id: String,
    created: i64,
    buffer: String,
    sent_chat_role: bool,
    sent_response_created: bool,
    sent_final: bool,
}

impl OpenAIStreamTranslator {
    /// Create a stream translator for one upstream request.
    #[must_use]
    pub fn new(shape: OpenAIStreamShape, requested_model: &str) -> Self {
        let prefix = match shape {
            OpenAIStreamShape::ChatCompletion => "chatcmpl",
            OpenAIStreamShape::Response => "resp",
        };
        Self {
            shape,
            requested_model: requested_model.to_string(),
            id: format!("{prefix}-{}", uuid::Uuid::new_v4()),
            created: chrono::Utc::now().timestamp(),
            buffer: String::new(),
            sent_chat_role: false,
            sent_response_created: false,
            sent_final: false,
        }
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
            Some("message_delta") => event
                .get("delta")
                .and_then(|d| d.get("stop_reason"))
                .and_then(Value::as_str)
                .map_or_else(Vec::new, |reason| {
                    self.sent_final = true;
                    vec![self.chat_frame(&json!({}), Some(map_finish_reason(reason)))]
                }),
            Some("message_stop") => {
                let mut frames = Vec::new();
                if !self.sent_final {
                    frames.push(self.chat_frame(&json!({}), Some("stop")));
                    self.sent_final = true;
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
                if let Some(id) = event
                    .get("message")
                    .and_then(|m| m.get("id"))
                    .and_then(Value::as_str)
                {
                    self.id = format!("resp-{id}");
                }
                self.sent_response_created = true;
                vec![sse_frame(&json!({
                    "type": "response.created",
                    "response": self.response_object("in_progress", "")
                }))]
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
                vec![sse_frame(&json!({
                    "type": "response.output_text.delta",
                    "response_id": self.id,
                    "item_id": format!("msg-{}", self.id),
                    "output_index": 0,
                    "content_index": 0,
                    "delta": text
                }))]
            }
            Some("message_stop") => {
                self.sent_final = true;
                vec![
                    sse_frame(&json!({
                        "type": "response.completed",
                        "response": self.response_object("completed", "")
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
            "model": self.requested_model,
            "choices": [{
                "index": 0,
                "delta": delta,
                "finish_reason": finish_reason
            }]
        }))
    }

    fn response_object(&self, status: &str, text: &str) -> Value {
        json!({
            "id": self.id,
            "object": "response",
            "created_at": self.created,
            "model": self.requested_model,
            "status": status,
            "output": [{
                "type": "message",
                "role": "assistant",
                "content": [{"type": "output_text", "text": text}]
            }]
        })
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

/// Map common OpenAI-style model aliases to Anthropic model IDs.
///
/// If the model already looks like a Claude model id (`claude-...`) it
/// is returned unchanged so callers can pass through Claude-native names.
#[must_use]
pub fn map_model(requested: &str) -> String {
    let lower = requested.to_lowercase();
    if lower.starts_with("claude-") {
        return requested.to_string();
    }
    match lower.as_str() {
        "gpt-4o-mini" | "gpt-4-mini" => "claude-haiku-4-5-20251001".to_string(),
        "o1" | "o1-pro" | "o3" | "o4" | "gpt-5" => "claude-opus-4-7".to_string(),
        // Any other model (including gpt-4, gpt-4-turbo, gpt-4o, unknowns)
        // maps to the default Sonnet tier.
        _ => "claude-sonnet-4-5-20250929".to_string(),
    }
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

pub(crate) fn extract_text(content: &Value) -> Option<String> {
    match content {
        Value::String(s) => Some(s.clone()),
        Value::Array(parts) => {
            let mut buf = String::new();
            for p in parts {
                if let Some(t) = p.get("text").and_then(Value::as_str) {
                    buf.push_str(t);
                } else if let Some(s) = p.as_str() {
                    buf.push_str(s);
                }
            }
            if buf.is_empty() { None } else { Some(buf) }
        }
        _ => None,
    }
}

fn translate_parts(parts: &[Value]) -> Vec<Value> {
    parts
        .iter()
        .filter_map(|p| {
            let kind = p.get("type").and_then(Value::as_str).unwrap_or("text");
            match kind {
                "text" | "input_text" | "output_text" => {
                    let text = p.get("text").and_then(Value::as_str).unwrap_or("");
                    Some(json!({"type": "text", "text": text}))
                }
                "image_url" => {
                    let url = p
                        .get("image_url")
                        .and_then(|v| v.get("url"))
                        .and_then(Value::as_str)
                        .unwrap_or("");
                    Some(json!({
                        "type": "image",
                        "source": {"type": "url", "url": url}
                    }))
                }
                _ => None,
            }
        })
        .collect()
}

pub(crate) fn translate_tools(tools: &Value) -> Value {
    match tools {
        Value::Array(arr) => {
            let mapped: Vec<Value> = arr
                .iter()
                .filter_map(|t| {
                    let kind = t.get("type").and_then(Value::as_str).unwrap_or("function");
                    if kind != "function" {
                        return None;
                    }
                    let func = t.get("function")?;
                    let name = func.get("name").and_then(Value::as_str)?.to_string();
                    let description = func
                        .get("description")
                        .cloned()
                        .unwrap_or(Value::String(String::new()));
                    let parameters = func.get("parameters").cloned().unwrap_or_else(|| json!({}));
                    Some(json!({
                        "name": name,
                        "description": description,
                        "input_schema": parameters,
                    }))
                })
                .collect();
            Value::Array(mapped)
        }
        other => other.clone(),
    }
}

fn translate_tool_choice(choice: &Value) -> Value {
    match choice {
        Value::String(s) => match s.as_str() {
            "required" => json!({"type": "any"}),
            "none" => json!({"type": "none"}),
            // "auto" plus any unrecognised string default to auto.
            _ => json!({"type": "auto"}),
        },
        Value::Object(map) => {
            if let Some(func) = map.get("function").and_then(Value::as_object) {
                if let Some(name) = func.get("name").and_then(Value::as_str) {
                    return json!({"type": "tool", "name": name});
                }
            }
            json!({"type": "auto"})
        }
        _ => json!({"type": "auto"}),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn translates_basic_chat_completion() {
        let req = OpenAIChatCompletionRequest {
            model: "gpt-4o".into(),
            messages: vec![
                ChatMessage {
                    role: "system".into(),
                    content: Value::String("You are helpful.".into()),
                    name: None,
                },
                ChatMessage {
                    role: "user".into(),
                    content: Value::String("Hello".into()),
                    name: None,
                },
            ],
            max_tokens: Some(100),
            max_completion_tokens: None,
            temperature: Some(0.5),
            top_p: None,
            stream: None,
            stop: None,
            tools: None,
            tool_choice: None,
        };
        let body = chat_completion_to_anthropic(&req);
        assert_eq!(body["model"], "claude-sonnet-4-5-20250929");
        assert_eq!(body["max_tokens"], 100);
        assert_eq!(body["temperature"], 0.5);
        assert_eq!(body["system"], "You are helpful.");
        let msgs = body["messages"].as_array().unwrap();
        assert_eq!(msgs.len(), 1);
        assert_eq!(msgs[0]["role"], "user");
        assert_eq!(msgs[0]["content"], "Hello");
    }

    #[test]
    fn preserves_claude_native_model_id() {
        let req = OpenAIChatCompletionRequest {
            model: "claude-opus-4-7".into(),
            messages: vec![ChatMessage {
                role: "user".into(),
                content: Value::String("hi".into()),
                name: None,
            }],
            max_tokens: None,
            max_completion_tokens: None,
            temperature: None,
            top_p: None,
            stream: None,
            stop: None,
            tools: None,
            tool_choice: None,
        };
        let body = chat_completion_to_anthropic(&req);
        assert_eq!(body["model"], "claude-opus-4-7");
        assert_eq!(body["max_tokens"], 4096);
    }

    #[test]
    fn translates_multipart_user_content() {
        let req = OpenAIChatCompletionRequest {
            model: "gpt-4o".into(),
            messages: vec![ChatMessage {
                role: "user".into(),
                content: json!([
                    {"type": "text", "text": "describe"},
                    {"type": "image_url", "image_url": {"url": "https://example.com/x.png"}}
                ]),
                name: None,
            }],
            max_tokens: Some(50),
            max_completion_tokens: None,
            temperature: None,
            top_p: None,
            stream: None,
            stop: None,
            tools: None,
            tool_choice: None,
        };
        let body = chat_completion_to_anthropic(&req);
        let parts = body["messages"][0]["content"].as_array().unwrap();
        assert_eq!(parts[0]["type"], "text");
        assert_eq!(parts[0]["text"], "describe");
        assert_eq!(parts[1]["type"], "image");
        assert_eq!(parts[1]["source"]["url"], "https://example.com/x.png");
    }

    #[test]
    fn translates_tool_call_blocks() {
        let req = OpenAIChatCompletionRequest {
            model: "gpt-4".into(),
            messages: vec![ChatMessage {
                role: "user".into(),
                content: Value::String("search for X".into()),
                name: None,
            }],
            max_tokens: None,
            max_completion_tokens: None,
            temperature: None,
            top_p: None,
            stream: None,
            stop: None,
            tools: Some(json!([
                {
                    "type": "function",
                    "function": {
                        "name": "search",
                        "description": "search",
                        "parameters": {"type": "object"}
                    }
                }
            ])),
            tool_choice: Some(json!("required")),
        };
        let body = chat_completion_to_anthropic(&req);
        assert_eq!(body["tools"][0]["name"], "search");
        assert_eq!(body["tool_choice"]["type"], "any");
    }

    #[test]
    fn anthropic_to_chat_basic() {
        let antrhopic_resp = json!({
            "id": "msg_1",
            "content": [
                {"type": "text", "text": "hello back"}
            ],
            "stop_reason": "end_turn",
            "usage": {"input_tokens": 5, "output_tokens": 3}
        });
        let out = anthropic_to_chat_completion(&antrhopic_resp, "gpt-4o");
        assert_eq!(out["model"], "gpt-4o");
        assert_eq!(out["choices"][0]["message"]["role"], "assistant");
        assert_eq!(out["choices"][0]["message"]["content"], "hello back");
        assert_eq!(out["choices"][0]["finish_reason"], "stop");
        assert_eq!(out["usage"]["prompt_tokens"], 5);
        assert_eq!(out["usage"]["completion_tokens"], 3);
        assert_eq!(out["usage"]["total_tokens"], 8);
    }

    #[test]
    fn anthropic_tool_use_to_openai_tool_calls() {
        let resp = json!({
            "id": "msg_x",
            "content": [
                {"type": "tool_use", "id": "t1", "name": "lookup", "input": {"q": "rust"}}
            ],
            "stop_reason": "tool_use"
        });
        let out = anthropic_to_chat_completion(&resp, "gpt-4");
        let calls = out["choices"][0]["message"]["tool_calls"]
            .as_array()
            .unwrap();
        assert_eq!(calls[0]["id"], "t1");
        assert_eq!(calls[0]["function"]["name"], "lookup");
        assert!(
            calls[0]["function"]["arguments"]
                .as_str()
                .unwrap()
                .contains("rust")
        );
        assert_eq!(out["choices"][0]["finish_reason"], "tool_calls");
    }

    #[test]
    fn translates_anthropic_text_stream_to_openai_chat_chunks() {
        let mut translator =
            OpenAIStreamTranslator::new(OpenAIStreamShape::ChatCompletion, "gpt-4o");
        let frames = translator.push(
            br#"event: message_start
data: {"type":"message_start","message":{"id":"msg_1"}}

event: content_block_delta
data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"hello"}}

event: message_delta
data: {"type":"message_delta","delta":{"stop_reason":"end_turn"}}

event: message_stop
data: {"type":"message_stop"}

"#,
        );
        let joined = frames.join("");
        assert!(joined.contains("\"object\":\"chat.completion.chunk\""));
        assert!(joined.contains("\"role\":\"assistant\""));
        assert!(joined.contains("\"content\":\"hello\""));
        assert!(joined.contains("\"finish_reason\":\"stop\""));
        assert!(joined.contains("data: [DONE]"));
    }

    #[test]
    fn translates_anthropic_text_stream_to_openai_response_events() {
        let mut translator = OpenAIStreamTranslator::new(OpenAIStreamShape::Response, "gpt-4o");
        let frames = translator.push(
            br#"event: message_start
data: {"type":"message_start","message":{"id":"msg_1"}}

event: content_block_delta
data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"hello"}}

event: message_stop
data: {"type":"message_stop"}

"#,
        );
        let joined = frames.join("");
        assert!(joined.contains("\"type\":\"response.created\""));
        assert!(joined.contains("\"type\":\"response.output_text.delta\""));
        assert!(joined.contains("\"delta\":\"hello\""));
        assert!(joined.contains("\"type\":\"response.completed\""));
        assert!(joined.contains("data: [DONE]"));
    }

    #[test]
    fn list_models_includes_known_ids() {
        let v = list_models();
        let arr = v["data"].as_array().unwrap();
        let ids: Vec<&str> = arr
            .iter()
            .filter_map(|m| m.get("id").and_then(Value::as_str))
            .collect();
        assert!(ids.contains(&"claude-opus-4-7"));
        assert!(ids.contains(&"claude-sonnet-4-5-20250929"));
    }
}
