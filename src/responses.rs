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
    extract_text, map_model, reconcile_subscription_parameters_with_limit_origin, translate_tools,
};

#[path = "responses_anthropic.rs"]
mod anthropic_response;
pub use anthropic_response::anthropic_to_response;
#[path = "responses_input.rs"]
mod request_input;
pub use request_input::{normalize_input_items, untranslatable_tool_history};

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
    pub top_p: Option<f32>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub stream: Option<bool>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub tools: Option<Value>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub tool_choice: Option<Value>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub reasoning: Option<Value>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub text: Option<Value>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub parallel_tool_calls: Option<bool>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub background: Option<bool>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub max_tool_calls: Option<u32>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub truncation: Option<Value>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub store: Option<bool>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub stream_options: Option<Value>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub safety_identifier: Option<String>,
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
                            let anthropic_content = match &content {
                                Value::String(text) => Value::String(text.clone()),
                                Value::Array(_) => {
                                    crate::bridge_request::responses_message_content_to_anthropic(
                                        &content,
                                        role,
                                        "input message",
                                    )
                                    .unwrap_or_else(|_| content.clone())
                                }
                                other => Value::String(extract_text(other).unwrap_or_default()),
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
                    let content = crate::bridge_request::responses_output_to_anthropic(
                        item.get("output"),
                        "function_call_output.output",
                    )
                    .unwrap_or_else(|_| item.get("output").cloned().unwrap_or(Value::Null));
                    messages.push(json!({
                        "role": "user",
                        "content": [{
                            "type": "tool_result",
                            "tool_use_id": item.get("call_id").and_then(Value::as_str).unwrap_or_default(),
                            "content": content,
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
    match (req.temperature, req.top_p) {
        (Some(temperature), _) => body["temperature"] = json!(temperature),
        (None, Some(top_p)) => body["top_p"] = json!(top_p),
        (None, None) => {}
    }
    if let Some(identifier) = &req.safety_identifier {
        body["metadata"] = json!({"user_id": identifier});
    }
    if req.stream == Some(true) {
        body["stream"] = json!(true);
    }
    if let Some(tools) = &req.tools {
        body["tools"] = translate_tools(tools);
    }
    crate::bridge_controls::install_max_tool_calls(&mut body, req.max_tool_calls);
    if let Some(choice) = &req.tool_choice {
        body["tool_choice"] = crate::openai::translate_tool_choice(choice);
    }
    crate::structured_output::install_parallel_tool_policy(
        &mut body,
        req.parallel_tool_calls,
        req.tools
            .as_ref()
            .and_then(Value::as_array)
            .is_some_and(|tools| !tools.is_empty()),
    );
    crate::structured_output::install_format(
        &mut body,
        crate::structured_output::responses_format(req.text.as_ref())
            .ok()
            .flatten(),
    );
    if let Some(reasoning) = &req.reasoning {
        body["reasoning"] = reasoning.clone();
    }
    reconcile_subscription_parameters_with_limit_origin(
        crate::subscription::SubscriptionProvider::Claude,
        &mut body,
        req.max_output_tokens.is_some(),
    );
    body
}

/// Translate an `OpenAI` Chat Completions request body to an `OpenAI`
/// Responses-API request body.
///
/// The `ChatGPT` backend used by Codex subscriptions speaks only the Responses
/// API, so Chat Completions requests are projected onto it: `system`/`developer`
/// turns become `instructions`, remaining turns become typed `input` items, and
/// the token/sampling knobs are renamed to their Responses equivalents. The
/// caller's `model` is preserved verbatim; the router never substitutes a
/// vendor model name of its own.
#[must_use]
pub fn chat_completion_to_responses(body: &Value) -> Value {
    // No vendor default: an absent model stays absent so the forwarder applies
    // the provider's configured default or fails loudly (issue #192).
    let model = body.get("model").and_then(Value::as_str).unwrap_or("");

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
                        let mapped_content = content.as_array().map_or_else(
                            || vec![json!({"type": part_type, "text": text})],
                            |parts| {
                                parts
                                    .iter()
                                    .map(|part| {
                                        let mut mapped = part.clone();
                                        if matches!(
                                            part.get("type").and_then(Value::as_str),
                                            Some("text" | "input_text" | "output_text")
                                        ) {
                                            mapped["type"] = Value::String(part_type.into());
                                        }
                                        mapped
                                    })
                                    .collect()
                            },
                        );
                        input.push(json!({"role": role, "content": mapped_content}));
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
    if let Some(identifier) = body.get("safety_identifier") {
        out["safety_identifier"] = identifier.clone();
    }
    if let Some(service_tier) = body.get("service_tier") {
        out["service_tier"] = service_tier.clone();
    }
    for field in [
        "prompt_cache_key",
        "prompt_cache_options",
        "prompt_cache_retention",
        "moderation",
    ] {
        if let Some(value) = body.get(field) {
            out[field] = value.clone();
        }
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
    if response.get("status").and_then(Value::as_str) == Some("failed") {
        return response_failed_error(&json!({"response": response}));
    }
    let response_id = response
        .get("id")
        .and_then(Value::as_str)
        .unwrap_or_default();
    let id = response_id.strip_prefix("chatcmpl-").map_or_else(
        || format!("chatcmpl-{response_id}"),
        |_| response_id.to_string(),
    );
    // The caller's model id is authoritative: a catalog alias must not be
    // replaced by the concrete model the provider resolved it to.
    let served_model = response.get("model").and_then(Value::as_str);
    let model = if requested_model.is_empty() {
        served_model.unwrap_or_default()
    } else {
        requested_model
    };
    let created = response
        .get("created_at")
        .and_then(Value::as_i64)
        .unwrap_or_else(|| chrono::Utc::now().timestamp());

    let mut content = String::new();
    let mut refusal = String::new();
    let mut tool_calls = Vec::new();
    if let Some(output) = response.get("output").and_then(Value::as_array) {
        for item in output {
            match item.get("type").and_then(Value::as_str) {
                Some("message") => {
                    if let Some(parts) = item.get("content").and_then(Value::as_array) {
                        for part in parts {
                            match part.get("type").and_then(Value::as_str) {
                                Some("output_text" | "text") => {
                                    if let Some(text) = part.get("text").and_then(Value::as_str) {
                                        content.push_str(text);
                                    }
                                }
                                Some("refusal") => {
                                    if let Some(text) = part.get("refusal").and_then(Value::as_str)
                                    {
                                        refusal.push_str(text);
                                    }
                                }
                                _ => {}
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
    let null_content = content.is_empty() && (!tool_calls.is_empty() || !refusal.is_empty());
    let mut message = json!({"role": "assistant", "content": content});
    if !refusal.is_empty() {
        message["refusal"] = Value::String(refusal);
    }
    if !tool_calls.is_empty() {
        message["tool_calls"] = Value::Array(tool_calls);
    }
    if null_content {
        message["content"] = Value::Null;
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
    buffer: Vec<u8>,
    sent_role: bool,
    sent_final: bool,
    include_usage: bool,
    input_tokens: u64,
    output_tokens: u64,
    total_tokens: u64,
    tool_indices: std::collections::BTreeSet<u64>,
    refusal_indices: std::collections::BTreeSet<(u64, u64)>,
    stop_filter: crate::stop_sequences::StopSequenceFilter,
    output_limiter: crate::output_limit::OutputTokenLimiter,
}

impl ResponsesChatStreamTranslator {
    /// Create a translator for one Codex-backed Chat Completions request.
    #[must_use]
    pub fn new(requested_model: &str) -> Self {
        Self {
            model: requested_model.to_string(),
            id: format!("chatcmpl-{}", uuid::Uuid::new_v4()),
            created: chrono::Utc::now().timestamp(),
            buffer: Vec::new(),
            sent_role: false,
            sent_final: false,
            include_usage: false,
            input_tokens: 0,
            output_tokens: 0,
            total_tokens: 0,
            tool_indices: std::collections::BTreeSet::new(),
            refusal_indices: std::collections::BTreeSet::new(),
            stop_filter: crate::stop_sequences::StopSequenceFilter::default(),
            output_limiter: crate::output_limit::OutputTokenLimiter::default(),
        }
    }

    /// Request the protocol's final empty-choices usage chunk.
    #[must_use]
    pub const fn with_include_usage(mut self, include_usage: bool) -> Self {
        self.include_usage = include_usage;
        self
    }

    /// Enforce the caller's output cap locally when the backend rejects it.
    #[must_use]
    pub const fn with_output_token_limit(mut self, limit: Option<u64>) -> Self {
        self.output_limiter = crate::output_limit::OutputTokenLimiter::new(limit);
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
                let (text, capped) = self.output_limiter.push(&text);
                let mut frames = self.role_frame();
                if !text.is_empty() {
                    frames.push(self.chat_frame(&json!({"content": text}), None));
                }
                if matched.is_some() || capped {
                    self.sent_final = true;
                    let reason = if capped { "length" } else { "stop" };
                    frames.push(self.chat_frame(&json!({}), Some(reason)));
                    if self.include_usage {
                        frames.push(self.usage_frame());
                    }
                    frames.push(done_frame());
                }
                frames
            }
            Some("response.refusal.delta") => {
                let text = event
                    .get("delta")
                    .and_then(Value::as_str)
                    .unwrap_or_default();
                self.refusal_indices.insert(stream_content_key(event));
                let mut frames = self.role_frame();
                if !text.is_empty() {
                    frames.push(self.chat_frame(&json!({"refusal": text}), None));
                }
                frames
            }
            Some("response.refusal.done") => {
                if !self.refusal_indices.insert(stream_content_key(event)) {
                    return Vec::new();
                }
                let text = event
                    .get("refusal")
                    .and_then(Value::as_str)
                    .unwrap_or_default();
                let mut frames = self.role_frame();
                if !text.is_empty() {
                    frames.push(self.chat_frame(&json!({"refusal": text}), None));
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
            Some("error" | "response.failed") => {
                if let Some(response) = event.get("response") {
                    self.capture_identity(response);
                    self.capture_usage(response);
                }
                self.sent_final = true;
                vec![format!("data: {}\n\n", response_failed_error(event))]
            }
            Some("response.completed" | "response.incomplete") => {
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
        // The requested model id stays the response identity.
        if let Some(model) = response.get("model").and_then(Value::as_str)
            && self.model.is_empty()
        {
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
        let frame = json!({
            "id": self.id,
            "object": "chat.completion.chunk",
            "created": self.created,
            "model": self.model,
            "choices": [{
                "index": 0,
                "delta": delta,
                "finish_reason": finish_reason,
            }]
        });
        format!("data: {frame}\n\n")
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

/// Return the caller-safe subset of a failed Responses event in `OpenAI`'s
/// error envelope. Upstream response objects may contain operator metadata, so
/// only the fields an API client can act on cross the routing boundary.
#[must_use]
pub(crate) fn response_failed_error(event: &Value) -> Value {
    let upstream = event
        .pointer("/response/error")
        .or_else(|| event.get("error"))
        .unwrap_or(&Value::Null);
    let message = upstream
        .get("message")
        .or_else(|| event.get("message"))
        .and_then(Value::as_str)
        .unwrap_or("upstream response failed");
    let error_type = upstream
        .get("type")
        .or_else(|| event.get("error_type"))
        .and_then(Value::as_str)
        .unwrap_or("api_error");
    let mut error = serde_json::Map::from_iter([
        ("message".to_string(), Value::String(message.to_string())),
        ("type".to_string(), Value::String(error_type.to_string())),
    ]);
    if let Some(value) = upstream
        .get("code")
        .or_else(|| event.get("code"))
        .filter(|value| value.is_string() || value.is_number() || value.is_null())
    {
        error.insert("code".to_string(), value.clone());
    }
    if let Some(value) = upstream
        .get("param")
        .or_else(|| upstream.get("parameter"))
        .or_else(|| event.get("param"))
        .or_else(|| event.get("parameter"))
        .filter(|value| value.is_string() || value.is_number() || value.is_null())
    {
        error.insert("param".to_string(), value.clone());
    }
    json!({"error": error})
}

fn stream_content_key(event: &Value) -> (u64, u64) {
    (
        event
            .get("output_index")
            .and_then(Value::as_u64)
            .unwrap_or(0),
        event
            .get("content_index")
            .and_then(Value::as_u64)
            .unwrap_or(0),
    )
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

#[cfg(test)]
#[path = "responses_stream_tests.rs"]
mod stream_tests;

#[cfg(test)]
#[path = "responses_tests.rs"]
mod tests;
