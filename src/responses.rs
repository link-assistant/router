//! `OpenAI` Responses-API (`POST /v1/responses`) request/response translation.
//!
//! The newer agentic Responses API is a superset of Chat Completions. The
//! `ChatGPT` backend used by Codex subscriptions speaks *only* this dialect, so
//! the router both accepts Responses requests (projecting them to Anthropic
//! Messages) and projects Chat Completions requests onto the Responses shape
//! when forwarding to Codex. Shared field-shaping helpers live in
//! [`crate::openai`].

use serde::{Deserialize, Serialize};
use serde_json::{Value, json};

use crate::openai::{
    extract_text, map_model, reconcile_subscription_parameters, translate_parts, translate_tools,
};

/// `OpenAI` `POST /v1/responses` request body. We accept the superset and
/// project to Anthropic Messages, so unknown keys are ignored.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OpenAIResponseRequest {
    pub model: String,
    /// Either a single string or a structured input list.
    pub input: Value,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub instructions: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub max_output_tokens: Option<u32>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub temperature: Option<f32>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub stream: Option<bool>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub tools: Option<Value>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub reasoning: Option<Value>,
}

/// Translate an `OpenAI` Responses-API request to Anthropic Messages.
#[must_use]
pub fn response_to_anthropic(req: &OpenAIResponseRequest) -> Value {
    let mut system_chunks: Vec<String> = req.instructions.iter().cloned().collect();
    let mut messages: Vec<Value> = Vec::new();
    match &req.input {
        Value::String(s) => {
            messages.push(json!({"role": "user", "content": s}));
        }
        Value::Array(items) => {
            for item in items {
                if let Some(role) = item.get("role").and_then(Value::as_str) {
                    let content = item.get("content").cloned().unwrap_or(Value::Null);
                    match role {
                        "system" | "developer" => {
                            if let Some(text) = extract_text(&content) {
                                system_chunks.push(text);
                            }
                        }
                        "user" | "assistant" => {
                            let anthropic_content = match content {
                                Value::String(text) => Value::String(text),
                                Value::Array(parts) => Value::Array(translate_parts(&parts)),
                                other => Value::String(extract_text(&other).unwrap_or_default()),
                            };
                            messages.push(json!({
                                "role": role,
                                "content": anthropic_content,
                            }));
                        }
                        _ => {}
                    }
                } else if item.get("type").and_then(Value::as_str) == Some("function_call") {
                    let arguments = item
                        .get("arguments")
                        .and_then(Value::as_str)
                        .and_then(|raw| serde_json::from_str::<Value>(raw).ok())
                        .unwrap_or_else(|| json!({}));
                    messages.push(json!({
                        "role": "assistant",
                        "content": [{
                            "type": "tool_use",
                            "id": item.get("call_id").or_else(|| item.get("id")).and_then(Value::as_str).unwrap_or_default(),
                            "name": item.get("name").and_then(Value::as_str).unwrap_or_default(),
                            "input": arguments,
                        }]
                    }));
                } else if item.get("type").and_then(Value::as_str) == Some("function_call_output") {
                    messages.push(json!({
                        "role": "user",
                        "content": [{
                            "type": "tool_result",
                            "tool_use_id": item.get("call_id").and_then(Value::as_str).unwrap_or_default(),
                            "content": item.get("output").and_then(Value::as_str).unwrap_or_default(),
                        }]
                    }));
                } else if let Some(text) = item.as_str() {
                    messages.push(json!({"role": "user", "content": text}));
                }
            }
        }
        _ => {}
    }

    let max_tokens = req.max_output_tokens.unwrap_or(4096);
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
    if req.stream == Some(true) {
        body["stream"] = json!(true);
    }
    if let Some(tools) = &req.tools {
        body["tools"] = translate_tools(tools);
    }
    if let Some(reasoning) = &req.reasoning {
        body["reasoning"] = reasoning.clone();
    }
    reconcile_subscription_parameters(crate::subscription::SubscriptionProvider::Claude, &mut body);
    body
}

/// Normalise a Responses-API `input` field to the typed list shape.
///
/// The documented Responses API accepts either a bare string or a list of
/// input items, but the `ChatGPT` backend accepts only the list form and
/// answers a string with `{"detail":"Input must be a list"}` (HTTP 400). Both
/// documented forms therefore have to be normalised here before forwarding:
/// a string becomes a single user turn, and bare strings inside the list get
/// the same treatment. Anything already typed is passed through untouched.
#[must_use]
pub fn normalize_input_items(input: &Value) -> Value {
    fn user_turn(text: &str) -> Value {
        json!({
            "type": "message",
            "role": "user",
            "content": [{"type": "input_text", "text": text}],
        })
    }
    match input {
        Value::String(text) => json!([user_turn(text)]),
        Value::Array(items) => Value::Array(
            items
                .iter()
                .map(|item| item.as_str().map_or_else(|| item.clone(), user_turn))
                .collect(),
        ),
        other => other.clone(),
    }
}

/// Translate an `OpenAI` Chat Completions request body to an `OpenAI`
/// Responses-API request body.
///
/// The `ChatGPT` backend used by Codex subscriptions speaks only the Responses
/// API, so Chat Completions requests are projected onto it: `system`/`developer`
/// turns become `instructions`, remaining turns become typed `input` items, and
/// the token/sampling knobs are renamed to their Responses equivalents. The
/// caller's `model` is preserved verbatim (Codex expects e.g. `gpt-5-codex`).
#[must_use]
pub fn chat_completion_to_responses(body: &Value) -> Value {
    let model = body
        .get("model")
        .and_then(Value::as_str)
        .unwrap_or("gpt-5-codex");

    let mut instructions: Vec<String> = Vec::new();
    let mut input: Vec<Value> = Vec::new();
    if let Some(messages) = body.get("messages").and_then(Value::as_array) {
        for msg in messages {
            let role = msg.get("role").and_then(Value::as_str).unwrap_or("user");
            let content = msg.get("content").cloned().unwrap_or(Value::Null);
            match role {
                "system" | "developer" => {
                    if let Some(text) = extract_text(&content) {
                        instructions.push(text);
                    }
                }
                "tool" => input.push(json!({
                    "type": "function_call_output",
                    "call_id": msg
                        .get("tool_call_id")
                        .and_then(Value::as_str)
                        .unwrap_or_default(),
                    "output": extract_text(&content).unwrap_or_default(),
                })),
                _ => {
                    let text = extract_text(&content).unwrap_or_default();
                    let tool_calls = msg.get("tool_calls").and_then(Value::as_array);
                    let has_tool_calls = matches!(tool_calls, Some(calls) if !calls.is_empty());
                    // A tool-only assistant turn is represented by its
                    // `function_call` items, without an empty message item.
                    if !text.is_empty() || !has_tool_calls {
                        // Responses input uses `input_text` for user-side
                        // content and `output_text` for prior assistant turns.
                        let part_type = if role == "assistant" {
                            "output_text"
                        } else {
                            "input_text"
                        };
                        input.push(json!({
                            "role": role,
                            "content": [{ "type": part_type, "text": text }],
                        }));
                    }
                    if let Some(tool_calls) = tool_calls {
                        input.extend(tool_calls.iter().filter_map(chat_tool_call_to_responses));
                    }
                }
            }
        }
    }

    let mut out = json!({
        "model": model,
        "input": input,
    });
    out["reasoning"] = body
        .get("reasoning")
        .cloned()
        .or_else(|| {
            body.get("reasoning_effort")
                .cloned()
                .map(|effort| json!({"effort": effort}))
        })
        .unwrap_or_else(|| json!({"effort": crate::clients::DEFAULT_OPENAI_REASONING_EFFORT}));
    if !instructions.is_empty() {
        out["instructions"] = Value::String(instructions.join("\n\n"));
    }
    if let Some(max) = body
        .get("max_completion_tokens")
        .or_else(|| body.get("max_tokens"))
        .and_then(Value::as_u64)
    {
        out["max_output_tokens"] = json!(max);
    }
    if let Some(t) = body.get("temperature").and_then(Value::as_f64) {
        out["temperature"] = json!(t);
    }
    if let Some(t) = body.get("top_p").and_then(Value::as_f64) {
        out["top_p"] = json!(t);
    }
    if let Some(tools) = body.get("tools") {
        out["tools"] = chat_tools_to_responses(tools);
    }
    if let Some(choice) = body.get("tool_choice") {
        out["tool_choice"] = chat_tool_choice_to_responses(choice);
    }
    if body.get("stream").and_then(Value::as_bool) == Some(true) {
        out["stream"] = Value::Bool(true);
    }
    out
}

fn chat_tool_call_to_responses(call: &Value) -> Option<Value> {
    let function = call.get("function")?;
    Some(json!({
        "type": "function_call",
        "call_id": call.get("id").and_then(Value::as_str).unwrap_or_default(),
        "name": function.get("name").and_then(Value::as_str).unwrap_or_default(),
        "arguments": function
            .get("arguments")
            .and_then(Value::as_str)
            .unwrap_or("{}"),
    }))
}

fn chat_tools_to_responses(tools: &Value) -> Value {
    let Value::Array(tools) = tools else {
        return tools.clone();
    };
    Value::Array(
        tools
            .iter()
            .map(|tool| {
                if tool.get("type").and_then(Value::as_str) != Some("function") {
                    return tool.clone();
                }
                let Some(function) = tool.get("function") else {
                    return tool.clone();
                };
                let mut mapped = json!({
                    "type": "function",
                    "name": function.get("name").cloned().unwrap_or(Value::Null),
                    "description": function
                        .get("description")
                        .cloned()
                        .unwrap_or(Value::String(String::new())),
                    "parameters": function
                        .get("parameters")
                        .cloned()
                        .unwrap_or_else(|| json!({})),
                });
                if let Some(strict) = function.get("strict") {
                    mapped["strict"] = strict.clone();
                }
                mapped
            })
            .collect(),
    )
}

fn chat_tool_choice_to_responses(choice: &Value) -> Value {
    let Some(function) = choice.get("function") else {
        return choice.clone();
    };
    json!({
        "type": "function",
        "name": function.get("name").cloned().unwrap_or(Value::Null),
    })
}

/// Translate a completed Responses object into a Chat Completions object.
#[must_use]
pub fn response_to_chat_completion(response: &Value, requested_model: &str) -> Value {
    let response_id = response
        .get("id")
        .and_then(Value::as_str)
        .unwrap_or_default();
    let id = response_id.strip_prefix("chatcmpl-").map_or_else(
        || format!("chatcmpl-{response_id}"),
        |_| response_id.to_string(),
    );
    let model = response
        .get("model")
        .and_then(Value::as_str)
        .unwrap_or(requested_model);
    let created = response
        .get("created_at")
        .and_then(Value::as_i64)
        .unwrap_or_else(|| chrono::Utc::now().timestamp());

    let mut content = String::new();
    let mut tool_calls = Vec::new();
    if let Some(output) = response.get("output").and_then(Value::as_array) {
        for item in output {
            match item.get("type").and_then(Value::as_str) {
                Some("message") => {
                    if let Some(parts) = item.get("content").and_then(Value::as_array) {
                        for part in parts {
                            if matches!(
                                part.get("type").and_then(Value::as_str),
                                Some("output_text" | "text")
                            ) {
                                if let Some(text) = part.get("text").and_then(Value::as_str) {
                                    content.push_str(text);
                                }
                            }
                        }
                    }
                }
                Some("function_call") => {
                    let call_id = item
                        .get("call_id")
                        .or_else(|| item.get("id"))
                        .and_then(Value::as_str)
                        .unwrap_or_default();
                    tool_calls.push(json!({
                        "id": call_id,
                        "type": "function",
                        "function": {
                            "name": item.get("name").and_then(Value::as_str).unwrap_or_default(),
                            "arguments": item.get("arguments").and_then(Value::as_str).unwrap_or_default(),
                        }
                    }));
                }
                _ => {}
            }
        }
    }

    let finish_reason = if !tool_calls.is_empty() {
        "tool_calls"
    } else if response.get("status").and_then(Value::as_str) == Some("incomplete") {
        "length"
    } else {
        "stop"
    };
    let mut message = json!({"role": "assistant", "content": content});
    if !tool_calls.is_empty() {
        message["tool_calls"] = Value::Array(tool_calls);
        if content.is_empty() {
            message["content"] = Value::Null;
        }
    }

    let input_tokens = response
        .pointer("/usage/input_tokens")
        .and_then(Value::as_u64)
        .unwrap_or(0);
    let output_tokens = response
        .pointer("/usage/output_tokens")
        .and_then(Value::as_u64)
        .unwrap_or(0);
    let total_tokens = response
        .pointer("/usage/total_tokens")
        .and_then(Value::as_u64)
        .unwrap_or(input_tokens + output_tokens);
    let mut usage = json!({
        "prompt_tokens": input_tokens,
        "completion_tokens": output_tokens,
        "total_tokens": total_tokens,
    });
    if let Some(details) = response.pointer("/usage/input_tokens_details") {
        usage["prompt_tokens_details"] = details.clone();
    }
    if let Some(details) = response.pointer("/usage/output_tokens_details") {
        usage["completion_tokens_details"] = details.clone();
    }

    json!({
        "id": id,
        "object": "chat.completion",
        "created": created,
        "model": model,
        "choices": [{
            "index": 0,
            "message": message,
            "finish_reason": finish_reason,
        }],
        "usage": usage,
    })
}

/// Enforce Chat stop sequences on a buffered translated response.
pub(crate) fn enforce_chat_stop(response: &mut Value, sequences: &[String]) {
    let Some(choice) = response
        .get_mut("choices")
        .and_then(Value::as_array_mut)
        .and_then(|choices| choices.first_mut())
    else {
        return;
    };
    let Some(text) = choice
        .pointer_mut("/message/content")
        .and_then(|value| value.as_str())
        .map(str::to_string)
    else {
        return;
    };
    let mut visible = text;
    if crate::stop_sequences::truncate(&mut visible, sequences).is_some() {
        choice["message"]["content"] = Value::String(visible);
        choice["finish_reason"] = Value::String("stop".into());
    }
}

/// Incrementally translate Responses SSE events into Chat Completions chunks.
pub struct ResponsesChatStreamTranslator {
    model: String,
    id: String,
    created: i64,
    buffer: String,
    sent_role: bool,
    sent_final: bool,
    include_usage: bool,
    input_tokens: u64,
    output_tokens: u64,
    total_tokens: u64,
    tool_indices: std::collections::BTreeSet<u64>,
    stop_filter: crate::stop_sequences::StopSequenceFilter,
}

impl ResponsesChatStreamTranslator {
    /// Create a translator for one Codex-backed Chat Completions request.
    #[must_use]
    pub fn new(requested_model: &str) -> Self {
        Self {
            model: requested_model.to_string(),
            id: format!("chatcmpl-{}", uuid::Uuid::new_v4()),
            created: chrono::Utc::now().timestamp(),
            buffer: String::new(),
            sent_role: false,
            sent_final: false,
            include_usage: false,
            input_tokens: 0,
            output_tokens: 0,
            total_tokens: 0,
            tool_indices: std::collections::BTreeSet::new(),
            stop_filter: crate::stop_sequences::StopSequenceFilter::default(),
        }
    }

    /// Request the protocol's final empty-choices usage chunk.
    #[must_use]
    pub const fn with_include_usage(mut self, include_usage: bool) -> Self {
        self.include_usage = include_usage;
        self
    }

    /// Enforce Chat `stop` locally when the Responses backend cannot accept it.
    #[must_use]
    pub fn with_stop_sequences(mut self, sequences: Vec<String>) -> Self {
        self.stop_filter = crate::stop_sequences::StopSequenceFilter::new(sequences);
        self
    }

    /// Push raw upstream bytes and return complete Chat Completions SSE frames.
    pub fn push(&mut self, chunk: &[u8]) -> Vec<String> {
        self.buffer.push_str(&String::from_utf8_lossy(chunk));
        let mut frames = Vec::new();
        while let Some((index, separator_len)) = find_sse_separator(&self.buffer) {
            let block = self.buffer[..index].to_string();
            self.buffer.drain(..index + separator_len);
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
            return if self.sent_final {
                Vec::new()
            } else {
                self.sent_final = true;
                vec![done_frame()]
            };
        }
        let Ok(event) = serde_json::from_str::<Value>(&data) else {
            return Vec::new();
        };
        self.translate_event(&event)
    }

    fn translate_event(&mut self, event: &Value) -> Vec<String> {
        if self.sent_final {
            return Vec::new();
        }
        match event.get("type").and_then(Value::as_str) {
            Some("response.created") => {
                if let Some(response) = event.get("response") {
                    self.capture_identity(response);
                    self.capture_usage(response);
                }
                self.role_frame()
            }
            Some("response.output_text.delta") => {
                let text = event
                    .get("delta")
                    .and_then(Value::as_str)
                    .unwrap_or_default();
                let (text, matched) = self.stop_filter.push(text);
                let mut frames = self.role_frame();
                if !text.is_empty() {
                    frames.push(self.chat_frame(&json!({"content": text}), None));
                }
                if matched.is_some() {
                    self.sent_final = true;
                    frames.push(self.chat_frame(&json!({}), Some("stop")));
                    frames.push(done_frame());
                }
                frames
            }
            Some("response.output_item.added" | "response.output_item.done") => {
                self.translate_function_call(event)
            }
            Some("response.function_call_arguments.delta") => {
                let index = event
                    .get("output_index")
                    .and_then(Value::as_u64)
                    .unwrap_or(0);
                let delta = event
                    .get("delta")
                    .and_then(Value::as_str)
                    .unwrap_or_default();
                vec![self.chat_frame(
                    &json!({"tool_calls": [{
                        "index": index,
                        "function": {"arguments": delta}
                    }]}),
                    None,
                )]
            }
            Some("response.completed" | "response.incomplete" | "response.failed") => {
                if let Some(response) = event.get("response") {
                    self.capture_identity(response);
                    self.capture_usage(response);
                }
                let finish_reason = if !self.tool_indices.is_empty() {
                    "tool_calls"
                } else if event.get("type").and_then(Value::as_str) == Some("response.incomplete") {
                    "length"
                } else {
                    "stop"
                };
                let mut frames = Vec::new();
                let pending = self.stop_filter.finish();
                if !pending.is_empty() {
                    frames.extend(self.role_frame());
                    frames.push(self.chat_frame(&json!({"content": pending}), None));
                }
                self.sent_final = true;
                frames.push(self.chat_frame(&json!({}), Some(finish_reason)));
                if self.include_usage {
                    frames.push(self.usage_frame());
                }
                frames.push(done_frame());
                frames
            }
            _ => Vec::new(),
        }
    }

    fn translate_function_call(&mut self, event: &Value) -> Vec<String> {
        let item = event.get("item").unwrap_or(&Value::Null);
        if item.get("type").and_then(Value::as_str) != Some("function_call") {
            return Vec::new();
        }
        let index = event
            .get("output_index")
            .and_then(Value::as_u64)
            .unwrap_or(0);
        if !self.tool_indices.insert(index) {
            return Vec::new();
        }
        let mut frames = self.role_frame();
        let pending = self.stop_filter.finish();
        if !pending.is_empty() {
            frames.push(self.chat_frame(&json!({"content": pending}), None));
        }
        frames.push(self.chat_frame(
            &json!({"tool_calls": [{
                "index": index,
                "id": item.get("call_id").or_else(|| item.get("id")).and_then(Value::as_str).unwrap_or_default(),
                "type": "function",
                "function": {
                    "name": item.get("name").and_then(Value::as_str).unwrap_or_default(),
                    "arguments": item.get("arguments").and_then(Value::as_str).unwrap_or_default(),
                }
            }]}),
            None,
        ));
        frames
    }

    fn capture_identity(&mut self, response: &Value) {
        if let Some(id) = response.get("id").and_then(Value::as_str) {
            self.id = format!("chatcmpl-{id}");
        }
        if let Some(model) = response.get("model").and_then(Value::as_str) {
            self.model = model.to_string();
        }
        if let Some(created) = response.get("created_at").and_then(Value::as_i64) {
            self.created = created;
        }
    }

    fn capture_usage(&mut self, response: &Value) {
        let Some(usage) = response.get("usage") else {
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
        self.total_tokens = usage
            .get("total_tokens")
            .and_then(Value::as_u64)
            .unwrap_or(self.input_tokens + self.output_tokens);
    }

    fn role_frame(&mut self) -> Vec<String> {
        if self.sent_role {
            Vec::new()
        } else {
            self.sent_role = true;
            vec![self.chat_frame(&json!({"role": "assistant"}), None)]
        }
    }

    fn chat_frame(&self, delta: &Value, finish_reason: Option<&str>) -> String {
        format!(
            "data: {}\n\n",
            json!({
                "id": self.id,
                "object": "chat.completion.chunk",
                "created": self.created,
                "model": self.model,
                "choices": [{
                    "index": 0,
                    "delta": delta,
                    "finish_reason": finish_reason,
                }]
            })
        )
    }

    fn usage_frame(&self) -> String {
        format!(
            "data: {}\n\n",
            json!({
                "id": self.id,
                "object": "chat.completion.chunk",
                "created": self.created,
                "model": self.model,
                "choices": [],
                "usage": {
                    "prompt_tokens": self.input_tokens,
                    "completion_tokens": self.output_tokens,
                    "total_tokens": self.total_tokens,
                }
            })
        )
    }
}

fn find_sse_separator(buffer: &str) -> Option<(usize, usize)> {
    buffer
        .find("\r\n\r\n")
        .map(|index| (index, 4))
        .or_else(|| buffer.find("\n\n").map(|index| (index, 2)))
}

fn extract_sse_data(block: &str) -> String {
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

fn done_frame() -> String {
    "data: [DONE]\n\n".to_string()
}

/// Translate an Anthropic JSON response to an `OpenAI` Responses-API response.
#[must_use]
pub fn anthropic_to_response(anthropic: &Value, resolved_model: &str) -> Value {
    let id = anthropic
        .get("id")
        .and_then(Value::as_str)
        .map_or_else(|| format!("resp-{}", uuid::Uuid::new_v4()), String::from);
    let mut text = String::new();
    let mut output = Vec::new();
    if let Some(blocks) = anthropic.get("content").and_then(Value::as_array) {
        for block in blocks {
            match block.get("type").and_then(Value::as_str) {
                Some("text") => {
                    if let Some(t) = block.get("text").and_then(Value::as_str) {
                        text.push_str(t);
                    }
                }
                Some("tool_use") => output.push(json!({
                    "type": "function_call",
                    "call_id": block.get("id").and_then(Value::as_str).unwrap_or_default(),
                    "name": block.get("name").and_then(Value::as_str).unwrap_or_default(),
                    "arguments": serde_json::to_string(
                        block.get("input").unwrap_or(&Value::Null)
                    ).unwrap_or_else(|_| "{}".into()),
                    "status": "completed",
                })),
                Some("server_tool_use") => output.push(json!({
                    "type": "web_search_call",
                    "id": block.get("id").and_then(Value::as_str).unwrap_or_default(),
                    "status": "in_progress",
                    "action": block.get("input").cloned().unwrap_or_else(|| json!({})),
                })),
                Some("web_search_tool_result") => {
                    if let Some(item) = output.iter_mut().rev().find(|item| {
                        item.get("type").and_then(Value::as_str) == Some("web_search_call")
                            && item.get("id") == block.get("tool_use_id")
                    }) {
                        item["status"] = Value::String("completed".into());
                    }
                }
                _ => {}
            }
        }
    }
    if !text.is_empty() || output.is_empty() {
        output.push(json!({
            "type": "message",
            "role": "assistant",
            "content": [{ "type": "output_text", "text": text }]
        }));
    }
    let served_model = anthropic
        .get("model")
        .and_then(Value::as_str)
        .unwrap_or(resolved_model);
    json!({
        "id": id,
        "object": "response",
        "created_at": chrono::Utc::now().timestamp(),
        "model": served_model,
        "status": "completed",
        "output": output,
        "usage": anthropic.get("usage").cloned().unwrap_or(Value::Null),
    })
}

#[cfg(test)]
#[path = "responses_stream_tests.rs"]
mod stream_tests;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn responses_api_translation() {
        let req = OpenAIResponseRequest {
            model: "gpt-4o".into(),
            input: Value::String("write a haiku".into()),
            instructions: Some("be poetic".into()),
            max_output_tokens: Some(128),
            temperature: Some(0.9),
            stream: None,
            tools: None,
            reasoning: None,
        };
        let body = response_to_anthropic(&req);
        assert_eq!(body["model"], "claude-sonnet-4-5-20250929");
        assert_eq!(body["system"], "be poetic");
        assert_eq!(body["max_tokens"], 128);
        assert_eq!(body["messages"][0]["content"], "write a haiku");

        let resp = json!({
            "id": "msg_1",
            "model": "claude-sonnet-4-5-20250929",
            "content": [{"type":"text","text":"line1"}]
        });
        let out = anthropic_to_response(&resp, "gpt-4o");
        assert_eq!(out["object"], "response");
        assert_eq!(out["model"], "claude-sonnet-4-5-20250929");
        assert_eq!(out["output"][0]["content"][0]["text"], "line1");
    }

    #[test]
    fn buffered_chat_stop_is_enforced_locally() {
        let mut response = json!({
            "choices": [{
                "message": {"role": "assistant", "content": "visible<END>hidden"},
                "finish_reason": "length"
            }]
        });
        enforce_chat_stop(&mut response, &["<END>".into()]);
        assert_eq!(response["choices"][0]["message"]["content"], "visible");
        assert_eq!(response["choices"][0]["finish_reason"], "stop");
    }

    #[test]
    fn responses_structured_input_translates_to_anthropic() {
        let req = OpenAIResponseRequest {
            model: "gpt-5".into(),
            input: json!([
                {
                    "role": "developer",
                    "content": [{"type": "input_text", "text": "be terse"}]
                },
                {
                    "role": "system",
                    "content": [{"type": "input_text", "text": "answer plainly"}]
                },
                {
                    "role": "user",
                    "content": [
                        {"type": "input_text", "text": "describe this"},
                        {"type": "input_image", "image_url": "https://example.com/image.png"}
                    ]
                },
                {
                    "role": "assistant",
                    "content": [{"type": "output_text", "text": "a prior answer"}]
                }
            ]),
            instructions: Some("follow policy".into()),
            max_output_tokens: None,
            temperature: None,
            stream: None,
            tools: None,
            reasoning: None,
        };

        let body = response_to_anthropic(&req);

        assert_eq!(
            body["system"],
            "follow policy\n\nbe terse\n\nanswer plainly"
        );
        assert_eq!(body["messages"].as_array().map(Vec::len), Some(2));
        assert_eq!(body["messages"][0]["role"], "user");
        assert_eq!(
            body["messages"][0]["content"],
            json!([
                {"type": "text", "text": "describe this"},
                {
                    "type": "image",
                    "source": {"type": "url", "url": "https://example.com/image.png"}
                }
            ])
        );
        assert_eq!(body["messages"][1]["role"], "assistant");
        assert_eq!(
            body["messages"][1]["content"],
            json!([{"type": "text", "text": "a prior answer"}])
        );
    }

    #[test]
    fn chat_completion_projects_to_responses_input() {
        let body = json!({
            "model": "gpt-5-codex",
            "messages": [
                {"role": "system", "content": "be terse"},
                {"role": "user", "content": "hello"},
                {"role": "assistant", "content": "hi"}
            ],
            "max_tokens": 256,
        });
        let out = chat_completion_to_responses(&body);
        assert_eq!(out["model"], "gpt-5-codex");
        assert_eq!(out["instructions"], "be terse");
        assert_eq!(out["max_output_tokens"], 256);
        assert_eq!(out["input"][0]["role"], "user");
        assert_eq!(out["input"][0]["content"][0]["type"], "input_text");
        assert_eq!(out["input"][1]["content"][0]["type"], "output_text");
    }

    #[test]
    fn chat_completion_projects_tools_and_results_to_responses() {
        let body = json!({
            "model": "gpt-5.6-sol",
            "tools": [{
                "type": "function",
                "function": {
                    "name": "get_weather",
                    "description": "Get the weather",
                    "parameters": {
                        "type": "object",
                        "properties": {"city": {"type": "string"}}
                    },
                    "strict": true
                }
            }],
            "tool_choice": {"type": "function", "function": {"name": "get_weather"}},
            "messages": [
                {"role": "user", "content": "weather in Moscow?"},
                {
                    "role": "assistant",
                    "content": null,
                    "tool_calls": [{
                        "id": "call_weather_1",
                        "type": "function",
                        "function": {
                            "name": "get_weather",
                            "arguments": "{\"city\":\"Moscow\"}"
                        }
                    }]
                },
                {
                    "role": "tool",
                    "tool_call_id": "call_weather_1",
                    "content": "cold"
                }
            ]
        });

        let out = chat_completion_to_responses(&body);

        assert_eq!(
            out["tools"][0],
            json!({
                "type": "function",
                "name": "get_weather",
                "description": "Get the weather",
                "parameters": {
                    "type": "object",
                    "properties": {"city": {"type": "string"}}
                },
                "strict": true
            })
        );
        assert_eq!(
            out["tool_choice"],
            json!({"type": "function", "name": "get_weather"})
        );
        assert_eq!(
            out["input"][1],
            json!({
                "type": "function_call",
                "call_id": "call_weather_1",
                "name": "get_weather",
                "arguments": "{\"city\":\"Moscow\"}"
            })
        );
        assert_eq!(
            out["input"][2],
            json!({
                "type": "function_call_output",
                "call_id": "call_weather_1",
                "output": "cold"
            })
        );
    }

    #[test]
    fn chat_completion_preserves_stream_request_for_codex() {
        let body = json!({
            "model": "gpt-5.6-sol",
            "messages": [{"role": "user", "content": "hello"}],
            "stream": true,
        });

        let out = chat_completion_to_responses(&body);

        assert_eq!(out["stream"], true);
    }

    #[test]
    fn codex_response_converts_to_chat_completion() {
        let response = json!({
            "id": "resp_1",
            "object": "response",
            "created_at": 1_786_448_400,
            "model": "gpt-5.6-sol",
            "status": "completed",
            "output": [{
                "id": "msg_1",
                "type": "message",
                "role": "assistant",
                "content": [{"type": "output_text", "text": "13"}]
            }],
            "usage": {"input_tokens": 9, "output_tokens": 2, "total_tokens": 11}
        });

        let out = response_to_chat_completion(&response, "gpt-5.6-sol");

        assert_eq!(out["object"], "chat.completion");
        assert_eq!(out["choices"][0]["message"]["role"], "assistant");
        assert_eq!(out["choices"][0]["message"]["content"], "13");
        assert_eq!(out["choices"][0]["finish_reason"], "stop");
        assert_eq!(out["usage"]["prompt_tokens"], 9);
        assert_eq!(out["usage"]["completion_tokens"], 2);
        assert_eq!(out["usage"]["total_tokens"], 11);
        assert!(out.get("output").is_none());
        assert!(out.get("instructions").is_none());
    }

    #[test]
    fn codex_function_calls_convert_to_chat_tool_calls() {
        let response = json!({
            "id": "resp_tools",
            "model": "gpt-5.6-sol",
            "status": "completed",
            "output": [{
                "id": "fc_1",
                "call_id": "call_1",
                "type": "function_call",
                "name": "get_weather",
                "arguments": "{\"city\":\"Paris\"}"
            }]
        });

        let out = response_to_chat_completion(&response, "gpt-5.6-sol");

        assert!(out["choices"][0]["message"]["content"].is_null());
        assert_eq!(out["choices"][0]["finish_reason"], "tool_calls");
        assert_eq!(
            out["choices"][0]["message"]["tool_calls"][0]["id"],
            "call_1"
        );
        assert_eq!(
            out["choices"][0]["message"]["tool_calls"][0]["function"]["name"],
            "get_weather"
        );
    }

    #[test]
    fn normalizes_string_input_and_preserves_typed_input() {
        let typed = json!([{
            "type": "message",
            "role": "user",
            "content": [{"type": "input_text", "text": "скажи ок"}],
        }]);
        assert_eq!(
            normalize_input_items(&Value::String("скажи ок".into())),
            typed
        );
        assert_eq!(normalize_input_items(&typed), typed);
    }

    #[test]
    fn drops_temperature_for_claude_5_models() {
        let req = OpenAIResponseRequest {
            model: "claude-opus-5".into(),
            input: Value::String("hello".into()),
            instructions: None,
            max_output_tokens: None,
            temperature: Some(0.7),
            stream: None,
            tools: None,
            reasoning: None,
        };
        let body = response_to_anthropic(&req);
        assert!(body.get("temperature").is_none());
    }

    #[test]
    fn responses_reasoning_is_preserved_as_claude_thinking() {
        let req: OpenAIResponseRequest = serde_json::from_value(json!({
            "model":"claude-opus-5",
            "input":"hello",
            "max_output_tokens":40_000,
            "reasoning":{"effort":"xhigh"}
        }))
        .unwrap();
        let body = response_to_anthropic(&req);

        assert_eq!(body["thinking"]["budget_tokens"], 32_768);
        assert!(body.get("reasoning").is_none());
    }

    #[test]
    fn prior_function_items_survive_responses_to_anthropic_translation() {
        let req: OpenAIResponseRequest = serde_json::from_value(json!({
            "model": "gpt-5.6-sol",
            "input": [
                {"type": "function_call", "call_id": "call_1", "name": "lookup", "arguments": "{\"q\":1}"},
                {"type": "function_call_output", "call_id": "call_1", "output": "found"}
            ]
        }))
        .unwrap();
        let body = response_to_anthropic(&req);
        assert_eq!(body["messages"][0]["content"][0]["type"], "tool_use");
        assert_eq!(body["messages"][0]["content"][0]["id"], "call_1");
        assert_eq!(body["messages"][1]["content"][0]["type"], "tool_result");
        assert_eq!(body["messages"][1]["content"][0]["tool_use_id"], "call_1");
    }
}
