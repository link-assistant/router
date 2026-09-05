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
    pub frequency_penalty: Option<f32>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub presence_penalty: Option<f32>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub logit_bias: Option<BTreeMap<String, f32>>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub seed: Option<i64>,
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
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub response_format: Option<Value>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub parallel_tool_calls: Option<bool>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub n: Option<u32>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub modalities: Option<Value>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub audio: Option<Value>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub logprobs: Option<bool>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub top_logprobs: Option<u32>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub safety_identifier: Option<String>,
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
    if let Some(identifier) = &req.safety_identifier {
        body["metadata"] = json!({"user_id": identifier});
    }
    // Anthropic rejects a request specifying both, and Gemini CLI sends both by
    // default with no way to suppress either — so a valid Gemini request and a
    // reachable Claude model combined into a permanent `400` (issue #216).
    // `temperature` wins because it is the more commonly tuned knob and the one
    // a caller is likelier to have set deliberately; `top_p` is carried only
    // when it is the sole nucleus-sampling parameter, so a caller who tuned just
    // that still gets the sampling they asked for.
    match (req.temperature, req.top_p) {
        (Some(t), _) => body["temperature"] = json!(t),
        (None, Some(p)) => body["top_p"] = json!(p),
        (None, None) => {}
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
        crate::structured_output::chat_format(req.response_format.as_ref())
            .ok()
            .flatten(),
    );
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
    if let Some(object) = body.as_object_mut() {
        if capabilities.temperature == crate::capabilities::Capability::Unsupported {
            object.remove("temperature");
        }
        if capabilities.top_p == crate::capabilities::Capability::Unsupported {
            object.remove("top_p");
        }
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
            if !body.get("output_config").is_some_and(Value::is_object) {
                body["output_config"] = json!({});
            }
            body["output_config"]["effort"] = json!(adaptive_effort(effort));
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
/// The router keeps **no built-in alias table**. A table of vendor names
/// compiled into the binary inevitably points at models that are renamed,
/// withdrawn or not entitled for the account (issue #192), so an alias is now
/// purely operator configuration, checked against the live catalog by
/// [`resolve_model_with`].
///
/// This form passes a request through only when the caller already named a
/// model directly; anything else returns `None` so the handler answers
/// `model_selection_required` rather than substituting a guess.
#[must_use]
pub fn resolve_model(requested: &str) -> Option<String> {
    resolve_model_with(requested, &BTreeMap::new(), &[])
}

/// Resolve `requested` against operator aliases and a live catalog.
///
/// Order: an exact catalog entry wins, then an operator alias whose target the
/// catalog still advertises. An alias pointing at a model the account no longer
/// has resolves to `None` rather than routing somewhere unintended.
///
/// An empty `catalog` means "not discovered yet"; the request is then accepted
/// only if an alias names it, so a router that has not finished its first
/// discovery does not reject everything outright.
#[must_use]
pub fn resolve_model_with(
    requested: &str,
    aliases: &BTreeMap<String, String>,
    catalog: &[String],
) -> Option<String> {
    let advertises = |id: &str| catalog.is_empty() || catalog.iter().any(|entry| entry == id);

    if catalog.iter().any(|entry| entry == requested) {
        return Some(requested.to_string());
    }
    let lower = requested.to_lowercase();
    if let Some(target) = aliases
        .get(requested)
        .or_else(|| aliases.get(lower.as_str()))
        && advertises(target)
    {
        return Some(target.clone());
    }
    // With no catalog to check against, a directly named model is taken at
    // face value; the upstream is the authority on whether it exists.
    (catalog.is_empty() && !requested.is_empty()).then(|| requested.to_string())
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

/// `/v1/models` listing in the `OpenAI` list-shape.
///
/// Takes the ids to advertise rather than embedding any: the router must never
/// publish a model name that came from its own source code (issue #192).
/// Callers pass a live catalog, so an account that has discovered nothing
/// advertises nothing.
#[must_use]
pub fn list_models_from(models: &[String], owner: &str) -> Value {
    let now = chrono::Utc::now().timestamp();
    let data: Vec<Value> = models
        .iter()
        .map(|id| {
            json!({
                "id": id,
                "object": "model",
                "created": now,
                "owned_by": owner,
            })
        })
        .collect();
    json!({"object": "list", "data": data})
}

#[path = "openai_tools.rs"]
mod tools;

#[path = "openai_stream.rs"]
mod stream;

pub use stream::{OpenAIStreamShape, OpenAIStreamTranslator};

pub(crate) use tools::{extract_text, translate_parts, translate_tool_choice, translate_tools};
pub use tools::{
    invalid_anthropic_tool_definition, untranslatable_anthropic_tool_choice,
    untranslatable_anthropic_tools, untranslatable_chat_tool_history,
};

#[cfg(test)]
#[path = "openai_request_tests.rs"]
mod request_tests;

#[cfg(test)]
#[path = "openai_response_tests.rs"]
mod tests;
