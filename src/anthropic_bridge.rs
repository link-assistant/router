//! Anthropic Messages surface over non-Anthropic upstreams.
//!
//! Claude Code (and every other client that speaks only the Anthropic dialect)
//! sends `POST /v1/messages`. Before this module existed, that surface could
//! only be served by the Anthropic upstream, so a Codex/Qwen/Gemini
//! subscription could not back Claude Code — the gap named by issue #45.
//!
//! The bridge is deliberately an *adapter*, not a second forwarder: it
//! translates the request into the `OpenAI` dialect the target provider already
//! understands, delegates to the existing per-provider forwarder (which owns
//! credential resolution, refresh, account selection, cooldowns and budget
//! enforcement), and translates the reply back into Anthropic shape.
//!
//! Streaming replies are translated incrementally by
//! [`crate::anthropic_stream::AnthropicStreamTranslator`].
//!
//! Translation is not subscription authority. Consumer-subscription bridges
//! are denied by default and run only after `client_policy` authorizes the
//! exact signed client/provider pair; issue #45's historical default is
//! superseded by issue #389. Ordinary API-key providers and the separately
//! policy-gated z.ai Coding Plan retain their own credential rules.

use axum::http::{HeaderMap, StatusCode};
use axum::response::{IntoResponse, Response};
use serde_json::{Value, json};

use crate::anthropic_stream::map_stop_reason;
use crate::app_state::AppState;
use crate::bridge_selection::{ModelSelectionRequired, SelectionFailure};
use crate::config::UpstreamProvider;
use crate::metrics::Surface;

/// Default `max_tokens` used when a bridged Anthropic request omits it.
/// The Anthropic Messages API requires the field; `OpenAI` upstreams do not.
pub(crate) const DEFAULT_MAX_TOKENS: u64 = 4096;

/// Whether the Anthropic surface must be bridged for this upstream provider.
///
/// `Anthropic` needs no translation, and `Gonka`/`Crater` keep the behaviour
/// they already had on this surface.
#[must_use]
pub const fn is_bridged(provider: UpstreamProvider) -> bool {
    matches!(
        provider,
        UpstreamProvider::Codex
            | UpstreamProvider::Qwen
            | UpstreamProvider::Gemini
            | UpstreamProvider::OpenAICompatible
            | UpstreamProvider::ZaiCodingPlan
    )
}

/// Resolve the upstream model id for a bridged request.
///
/// The client sends an Anthropic model name (`claude-…`), which means nothing
/// to a Codex or Qwen upstream. Resolution order:
///
/// 1. the operator's configured `--bridge-model`, when set;
/// 2. otherwise the account's **live catalog**, narrowed by the operator's
///    `--bridge-model-policy`.
///
/// No per-provider constant is consulted. When the live catalog cannot supply a
/// model the request fails with `model_selection_required` instead of being
/// routed to a name from the router's own source (issue #192).
///
/// For the generic OpenAI-compatible provider an empty string is returned so
/// that the provider's own `default_model` is applied by its forwarder.
///
/// # Errors
///
/// Returns [`ModelSelectionRequired`] when the provider's catalog has not been
/// discovered, its credential is unusable, or it advertises no models.
pub fn resolve_bridge_model(state: &AppState) -> Result<String, ModelSelectionRequired> {
    resolve_bridge_model_for_account(state, None)
}

fn resolve_bridge_model_for_account(
    state: &AppState,
    router_account: Option<&str>,
) -> Result<String, ModelSelectionRequired> {
    let Some(provider) = state.upstream_provider.subscription_provider() else {
        // Left empty on purpose: `forward_openai_compatible` substitutes the
        // provider record's `default_model` when `model` is absent or empty.
        return Ok(state.bridge_model.clone().unwrap_or_else(|| {
            state
                .openai_compatible
                .default_model
                .clone()
                .unwrap_or_default()
        }));
    };

    let status = router_account.map_or_else(
        || state.model_catalogs.status(provider),
        |account| state.model_catalogs.status_for(provider, account),
    );
    let fail = |reason| {
        Err(ModelSelectionRequired {
            provider: provider.as_str().to_string(),
            reason,
        })
    };
    if !status.discovered {
        return fail(SelectionFailure::NotDiscovered);
    }
    if !status.credential_healthy {
        return fail(SelectionFailure::CredentialUnavailable);
    }
    if let Some(model) = state
        .bridge_model
        .as_deref()
        .filter(|model| !model.is_empty())
    {
        return catalog_contains_current_generation(&status, model)
            .then(|| model.to_string())
            .map_or_else(|| fail(SelectionFailure::ConfiguredModelUnavailable), Ok);
    }
    let selected = state
        .bridge_model_policy
        .choose(status.routable_models())
        .map_or_else(|| fail(SelectionFailure::EmptyCatalog), Ok)?;
    if catalog_contains_current_generation(&status, &selected) {
        Ok(selected)
    } else {
        fail(SelectionFailure::CredentialUnavailable)
    }
}

fn catalog_contains_current_generation(
    status: &crate::model_catalog::CatalogStatus,
    model: &str,
) -> bool {
    let expected_account = status.account.as_deref();
    let Some(record) = status
        .records
        .iter()
        .find(|record| record.canonical_id == model)
    else {
        return false;
    };
    (!record.health_generation.is_empty())
        && expected_account.is_none_or(|account| record.account == account)
        && status.records.iter().all(|candidate| {
            candidate.health_generation == record.health_generation
                && expected_account.is_none_or(|account| candidate.account == account)
        })
}

/// Translate an Anthropic Messages request body into an `OpenAI` Chat
/// Completions request body.
///
/// Vendor blocks with no `OpenAI` equivalent (`thinking`, `redacted_thinking`)
/// are dropped rather than guessed at; that limitation is documented in
/// `docs/use-cases/chatgpt-in-claude-code.md`.
#[must_use]
pub fn anthropic_to_chat_request(body: &Value, upstream_model: &str) -> Value {
    let mut messages: Vec<Value> = Vec::new();

    if let Some(system) = body.get("system")
        && let Some(text) = system_text(system)
    {
        messages.push(json!({"role": "system", "content": text}));
    }

    for message in body
        .get("messages")
        .and_then(Value::as_array)
        .map(Vec::as_slice)
        .unwrap_or_default()
    {
        let role = message
            .get("role")
            .and_then(Value::as_str)
            .unwrap_or("user");
        let content = message.get("content").unwrap_or(&Value::Null);
        match content {
            Value::String(text) => {
                messages.push(json!({"role": role, "content": text}));
            }
            Value::Array(blocks) => translate_content_blocks(role, blocks, &mut messages),
            _ => {}
        }
    }

    let max_tokens = body
        .get("max_tokens")
        .and_then(Value::as_u64)
        .unwrap_or(DEFAULT_MAX_TOKENS);

    let mut out = json!({
        "model": upstream_model,
        "messages": messages,
        "max_tokens": max_tokens,
    });

    for key in ["temperature", "top_p"] {
        if let Some(value) = body.get(key) {
            out[key] = value.clone();
        }
    }
    if body.get("stream").and_then(Value::as_bool) == Some(true) {
        out["stream"] = json!(true);
    }
    if let Some(stops) = body.get("stop_sequences") {
        out["stop"] = stops.clone();
    }
    if let Some(tools) = body.get("tools").and_then(Value::as_array) {
        let mapped = translate_tools(tools);
        if !mapped.is_empty() {
            out["tools"] = Value::Array(mapped);
        }
    }
    if let Some(choice) = body.get("tool_choice")
        && let Some(mapped) = translate_tool_choice(choice)
    {
        out["tool_choice"] = mapped;
    }
    out
}

/// `system` accepts a plain string or an array of text blocks.
fn system_text(system: &Value) -> Option<String> {
    match system {
        Value::String(s) if !s.is_empty() => Some(s.clone()),
        Value::Array(blocks) => {
            let joined = blocks
                .iter()
                .filter_map(|b| b.get("text").and_then(Value::as_str))
                .collect::<Vec<_>>()
                .join("\n\n");
            (!joined.is_empty()).then_some(joined)
        }
        _ => None,
    }
}

/// Translate one Anthropic message's content blocks, appending the resulting
/// `OpenAI` messages. `tool_result` blocks become separate `role: "tool"`
/// messages, which is how the `OpenAI` dialect models the same thing.
fn translate_content_blocks(role: &str, blocks: &[Value], messages: &mut Vec<Value>) {
    let mut text = String::new();
    let mut parts: Vec<Value> = Vec::new();
    let mut tool_calls: Vec<Value> = Vec::new();
    let mut tool_results: Vec<Value> = Vec::new();

    for block in blocks {
        match block.get("type").and_then(Value::as_str).unwrap_or("text") {
            "text" => {
                let value = block.get("text").and_then(Value::as_str).unwrap_or("");
                text.push_str(value);
                parts.push(json!({"type": "text", "text": value}));
            }
            "image" => {
                if let Some(url) = image_data_url(block.get("source")) {
                    parts.push(json!({"type": "image_url", "image_url": {"url": url}}));
                }
            }
            "tool_use" => {
                let input = block.get("input").cloned().unwrap_or_else(|| json!({}));
                tool_calls.push(json!({
                    "id": block.get("id").and_then(Value::as_str).unwrap_or_default(),
                    "type": "function",
                    "function": {
                        "name": block.get("name").and_then(Value::as_str).unwrap_or_default(),
                        "arguments": serde_json::to_string(&input).unwrap_or_else(|_| "{}".into()),
                    }
                }));
            }
            "tool_result" => {
                tool_results.push(json!({
                    "role": "tool",
                    "tool_call_id": block
                        .get("tool_use_id")
                        .and_then(Value::as_str)
                        .unwrap_or_default(),
                    "content": tool_result_text(block.get("content")),
                }));
            }
            // `thinking` / `redacted_thinking` and any future vendor block have
            // no OpenAI equivalent and are dropped.
            _ => {}
        }
    }

    let has_image = parts
        .iter()
        .any(|p| p.get("type").and_then(Value::as_str) == Some("image_url"));
    if !text.is_empty() || !tool_calls.is_empty() || has_image {
        let content = if has_image {
            Value::Array(parts)
        } else {
            Value::String(text)
        };
        let mut message = json!({"role": role, "content": content});
        if !tool_calls.is_empty() {
            message["tool_calls"] = Value::Array(tool_calls);
        }
        messages.push(message);
    }
    messages.extend(tool_results);
}

fn image_data_url(source: Option<&Value>) -> Option<String> {
    let source = source?;
    match source.get("type").and_then(Value::as_str) {
        Some("url") => source.get("url").and_then(Value::as_str).map(String::from),
        Some("base64") => {
            let media = source.get("media_type").and_then(Value::as_str)?;
            let data = source.get("data").and_then(Value::as_str)?;
            Some(format!("data:{media};base64,{data}"))
        }
        _ => None,
    }
}

fn tool_result_text(content: Option<&Value>) -> String {
    match content {
        Some(Value::String(s)) => s.clone(),
        Some(Value::Array(blocks)) => blocks
            .iter()
            .filter_map(|b| b.get("text").and_then(Value::as_str))
            .collect::<Vec<_>>()
            .join("\n"),
        Some(other) => other.to_string(),
        None => String::new(),
    }
}

fn translate_tools(tools: &[Value]) -> Vec<Value> {
    tools
        .iter()
        .map(|tool| {
            if tool
                .get("type")
                .and_then(Value::as_str)
                .is_some_and(|kind| kind.starts_with("web_search_"))
            {
                return json!({"type": "web_search"});
            }
            if tool
                .get("type")
                .and_then(Value::as_str)
                .is_some_and(|kind| kind.starts_with("web_fetch_"))
            {
                return json!({"type": "web_fetch"});
            }
            let name = tool.get("name").and_then(Value::as_str).unwrap_or_default();
            json!({
                "type": "function",
                "function": {
                    "name": name,
                    "description": tool
                        .get("description")
                        .cloned()
                        .unwrap_or(Value::String(String::new())),
                    "parameters": tool
                        .get("input_schema")
                        .cloned()
                        .unwrap_or_else(|| json!({"type": "object", "properties": {}})),
                }
            })
        })
        .collect()
}

fn translate_tool_choice(choice: &Value) -> Option<Value> {
    match choice.get("type").and_then(Value::as_str)? {
        "auto" => Some(json!("auto")),
        "any" => Some(json!("required")),
        "none" => Some(json!("none")),
        "tool" => {
            let name = choice.get("name").and_then(Value::as_str)?;
            Some(json!({"type": "function", "function": {"name": name}}))
        }
        _ => None,
    }
}

/// Translate an `OpenAI` Chat Completions **or** Responses JSON object into an
/// Anthropic `message` object.
///
/// The shape is detected from the payload because the bridged providers do not
/// all answer with the same one: Codex replies with a Responses object while
/// the others reply with a chat completion.
#[must_use]
pub fn openai_json_to_anthropic_message(payload: &Value, requested_model: &str) -> Value {
    if payload.get("object").and_then(Value::as_str) == Some("response")
        || payload.get("output").is_some()
    {
        responses_to_anthropic_message(payload, requested_model)
    } else {
        chat_completion_to_anthropic_message(payload, requested_model)
    }
}

fn chat_completion_to_anthropic_message(payload: &Value, requested_model: &str) -> Value {
    let choice = payload
        .get("choices")
        .and_then(Value::as_array)
        .and_then(|c| c.first())
        .cloned()
        .unwrap_or(Value::Null);
    let message = choice.get("message").unwrap_or(&Value::Null);

    let mut content: Vec<Value> = Vec::new();
    if let Some(text) = message.get("content").and_then(Value::as_str)
        && !text.is_empty()
    {
        content.push(json!({"type": "text", "text": text}));
    }
    for call in message
        .get("tool_calls")
        .and_then(Value::as_array)
        .map(Vec::as_slice)
        .unwrap_or_default()
    {
        content.push(tool_use_block(
            call.get("id").and_then(Value::as_str).unwrap_or_default(),
            call.get("function")
                .and_then(|f| f.get("name"))
                .and_then(Value::as_str)
                .unwrap_or_default(),
            call.get("function")
                .and_then(|f| f.get("arguments"))
                .and_then(Value::as_str)
                .unwrap_or("{}"),
        ));
    }

    let stop_reason = choice
        .get("finish_reason")
        .and_then(Value::as_str)
        .map_or("end_turn", map_stop_reason);
    let usage = payload.get("usage");
    message_envelope(
        payload.get("id").and_then(Value::as_str),
        requested_model,
        &content,
        stop_reason,
        usage_field(usage, &["prompt_tokens", "input_tokens"]),
        usage_field(usage, &["completion_tokens", "output_tokens"]),
    )
}

fn responses_to_anthropic_message(payload: &Value, requested_model: &str) -> Value {
    let mut content: Vec<Value> = Vec::new();
    let mut saw_tool_call = false;
    let mut web_search_requests = 0_u64;
    for item in payload
        .get("output")
        .and_then(Value::as_array)
        .map(Vec::as_slice)
        .unwrap_or_default()
    {
        match item.get("type").and_then(Value::as_str).unwrap_or("") {
            "message" => {
                let text: String = item
                    .get("content")
                    .and_then(Value::as_array)
                    .map(|parts| {
                        parts
                            .iter()
                            .filter_map(|p| p.get("text").and_then(Value::as_str))
                            .collect::<Vec<_>>()
                            .join("")
                    })
                    .unwrap_or_default();
                if !text.is_empty() {
                    content.push(json!({"type": "text", "text": text}));
                }
            }
            "function_call" => {
                saw_tool_call = true;
                content.push(tool_use_block(
                    item.get("call_id")
                        .or_else(|| item.get("id"))
                        .and_then(Value::as_str)
                        .unwrap_or_default(),
                    item.get("name").and_then(Value::as_str).unwrap_or_default(),
                    item.get("arguments")
                        .and_then(Value::as_str)
                        .unwrap_or("{}"),
                ));
            }
            "web_search_call" => {
                let id = item.get("id").and_then(Value::as_str).unwrap_or_default();
                content.push(json!({
                    "type": "server_tool_use",
                    "id": id,
                    "name": "web_search",
                    "input": item.get("action").cloned().unwrap_or_else(|| json!({})),
                }));
                if item.get("status").and_then(Value::as_str) == Some("completed") {
                    web_search_requests = web_search_requests.saturating_add(1);
                    content.push(json!({
                        "type": "web_search_tool_result",
                        "tool_use_id": id,
                        "content": [],
                    }));
                }
            }
            _ => {}
        }
    }

    let stop_reason = if saw_tool_call {
        "tool_use"
    } else if payload.get("status").and_then(Value::as_str) == Some("incomplete") {
        "max_tokens"
    } else {
        "end_turn"
    };
    let usage = payload.get("usage");
    let mut message = message_envelope(
        payload.get("id").and_then(Value::as_str),
        requested_model,
        &content,
        stop_reason,
        usage_field(usage, &["input_tokens", "prompt_tokens"]),
        usage_field(usage, &["output_tokens", "completion_tokens"]),
    );
    if web_search_requests > 0 {
        message["usage"]["server_tool_use"] = json!({
            "web_search_requests": web_search_requests,
            "web_fetch_requests": 0,
        });
    }
    message
}

fn tool_use_block(id: &str, name: &str, arguments: &str) -> Value {
    let input = serde_json::from_str::<Value>(arguments).unwrap_or_else(|_| json!({}));
    json!({
        "type": "tool_use",
        "id": if id.is_empty() { format!("toolu_{}", uuid::Uuid::new_v4().simple()) } else { id.to_string() },
        "name": name,
        "input": input,
    })
}

fn usage_field(usage: Option<&Value>, keys: &[&str]) -> u64 {
    usage
        .and_then(|u| keys.iter().find_map(|k| u.get(*k).and_then(Value::as_u64)))
        .unwrap_or(0)
}

fn message_envelope(
    id: Option<&str>,
    model: &str,
    content: &[Value],
    stop_reason: &str,
    input_tokens: u64,
    output_tokens: u64,
) -> Value {
    json!({
        "id": id.map_or_else(|| format!("msg_{}", uuid::Uuid::new_v4().simple()), String::from),
        "type": "message",
        "role": "assistant",
        "model": model,
        "content": content,
        "stop_reason": stop_reason,
        "stop_sequence": Value::Null,
        "usage": {"input_tokens": input_tokens, "output_tokens": output_tokens},
    })
}

fn enforce_anthropic_stop(message: &mut Value, sequences: &[String]) {
    let Some(content) = message.get_mut("content").and_then(Value::as_array_mut) else {
        return;
    };
    let mut matched = None;
    let mut keep = content.len();
    for (index, block) in content.iter_mut().enumerate() {
        let Some(text) = block.get_mut("text") else {
            continue;
        };
        let Some(mut visible) = text.as_str().map(str::to_string) else {
            continue;
        };
        if let Some(sequence) = crate::stop_sequences::truncate(&mut visible, sequences) {
            *text = Value::String(visible);
            matched = Some(sequence);
            keep = index + 1;
            break;
        }
    }
    content.truncate(keep);
    if let Some(sequence) = matched {
        message["stop_reason"] = Value::String("end_turn".into());
        message["stop_sequence"] = Value::String(sequence);
    }
}

fn unsupported_server_tool(body: &Value, provider: UpstreamProvider) -> Option<String> {
    provider.subscription_provider().and_then(|subscription| {
        crate::capabilities::unsupported_server_tool_type(subscription, body.get("tools"))
    })
}

pub(crate) fn untranslatable_anthropic_tool(body: &Value) -> Option<String> {
    if let Some(tools) = body.get("tools") {
        let Some(tools) = tools.as_array() else {
            return Some("tools must be an array".into());
        };
        for tool in tools {
            let kind = tool.get("type").and_then(Value::as_str);
            if kind.is_some_and(|kind| {
                kind.starts_with("web_search_") || kind.starts_with("web_fetch_")
            }) {
                continue;
            }
            if let Some(kind) = kind
                && kind != "custom"
            {
                return Some(format!("unsupported Anthropic tool type: {kind}"));
            }
            if tool.get("name").and_then(Value::as_str).is_none() {
                return Some("client tool is missing a string name".into());
            }
        }
    }
    if let Some(choice) = body.get("tool_choice") {
        let Some(kind) = choice.get("type").and_then(Value::as_str) else {
            return Some("tool_choice is missing a string type".into());
        };
        if !matches!(kind, "auto" | "any" | "none" | "tool") {
            return Some(format!("unsupported Anthropic tool_choice type: {kind}"));
        }
        if kind == "tool" && choice.get("name").and_then(Value::as_str).is_none() {
            return Some("tool_choice type=tool is missing a string name".into());
        }
    }
    None
}

/// Estimate the input token count of an Anthropic Messages request.
///
/// `POST /v1/messages/count_tokens` has no equivalent on the bridged
/// upstreams, so the router answers locally. The estimate uses the widely
/// quoted ~4 characters per token heuristic plus a small per-message overhead;
/// it is documented as an estimate rather than an exact count.
#[must_use]
pub fn count_tokens_estimate(body: &Value) -> u64 {
    let mut chars = 0usize;
    let mut messages = 0usize;
    if let Some(system) = body.get("system").and_then(system_text) {
        chars += system.len();
    }
    for message in body
        .get("messages")
        .and_then(Value::as_array)
        .map(Vec::as_slice)
        .unwrap_or_default()
    {
        messages += 1;
        chars += json_text_len(message.get("content").unwrap_or(&Value::Null));
    }
    if let Some(tools) = body.get("tools") {
        chars += tools.to_string().len();
    }
    // 4 chars/token, plus ~4 tokens of role and delimiter overhead per message.
    (chars as u64).div_ceil(4) + (messages as u64) * 4
}

fn json_text_len(content: &Value) -> usize {
    match content {
        Value::String(s) => s.len(),
        Value::Array(blocks) => blocks.iter().map(json_text_len).sum(),
        Value::Object(_) => content
            .get("text")
            .and_then(Value::as_str)
            .map_or_else(|| content.to_string().len(), str::len),
        _ => 0,
    }
}

/// Entry point for the Anthropic surface when the upstream is not Anthropic.
///
/// `/v1/messages/count_tokens` is answered locally because the bridged
/// upstreams expose no equivalent endpoint; everything else is forwarded.
pub async fn handle_anthropic_surface(
    state: &AppState,
    headers: &HeaderMap,
    path: &str,
    body: Value,
) -> Response {
    handle_anthropic_surface_routed(state, headers, path, body, None).await
}

pub(crate) async fn handle_anthropic_surface_routed(
    state: &AppState,
    headers: &HeaderMap,
    path: &str,
    body: Value,
    subscription: Option<&crate::model_routing::ValidatedSubscription>,
) -> Response {
    if state.upstream_provider == UpstreamProvider::ZaiCodingPlan {
        if path.ends_with("/count_tokens") {
            return crate::zai_coding_plan::count_tokens(state, headers, path, &body);
        }
        return crate::zai_coding_plan::forward(
            state,
            headers,
            body,
            path,
            crate::client_policy::ClientProtocol::AnthropicMessages,
            Surface::Anthropic,
        )
        .await;
    }
    if path.ends_with("/count_tokens") {
        // Answered locally, so no delegate forwarder validates the token for
        // us. Do it here: an expired or revoked token must not get an estimate
        // either. The request budget is deliberately *not* consumed, since
        // nothing is spent upstream.
        let claims = match count_tokens_claims(&state.token_manager, headers) {
            Ok(claims) => claims,
            Err(response) => return *response,
        };
        crate::audit::record_authorised_request(
            state,
            &claims,
            Surface::Anthropic,
            path,
            Some(&body),
        );
        return (
            StatusCode::OK,
            axum::Json(json!({"input_tokens": count_tokens_estimate(&body)})),
        )
            .into_response();
    }
    forward_anthropic_messages_routed(state, headers, path, body, subscription).await
}

/// Validate the client token for a locally answered `count_tokens` request.
pub(crate) fn count_tokens_claims(
    token_manager: &crate::token::TokenManager,
    headers: &HeaderMap,
) -> Result<crate::token::TokenClaims, Box<Response>> {
    let Some(token) = crate::proxy::extract_client_token(headers) else {
        return Err(Box::new(anthropic_error(
            StatusCode::UNAUTHORIZED,
            crate::proxy::CREDENTIAL_CARRIER_HINT.as_bytes(),
        )));
    };
    token_manager.validate_token(token).map_err(|e| {
        let status = match &e {
            crate::token::TokenError::Revoked => StatusCode::FORBIDDEN,
            _ => StatusCode::UNAUTHORIZED,
        };
        Box::new(anthropic_error(status, e.client_message().as_bytes()))
    })
}

/// Serve `POST /v1/messages` from a non-Anthropic upstream.
///
/// Delegates to the provider's existing `OpenAI`-dialect forwarder and
/// translates both directions. Metrics are recorded by the delegate under
/// [`Surface::Anthropic`] so the bridged traffic is attributed to the surface
/// the client actually used.
pub async fn forward_anthropic_messages(
    state: &AppState,
    headers: &HeaderMap,
    anthropic_body: Value,
) -> Response {
    forward_anthropic_messages_routed(state, headers, "/v1/messages", anthropic_body, None).await
}

async fn forward_anthropic_messages_routed(
    state: &AppState,
    headers: &HeaderMap,
    path: &str,
    anthropic_body: Value,
    subscription: Option<&crate::model_routing::ValidatedSubscription>,
) -> Response {
    if anthropic_body
        .get("max_tokens")
        .and_then(Value::as_u64)
        .is_none_or(|limit| limit == 0)
    {
        // Keep authentication ahead of request validation even though the
        // delegated forwarder is not reached for a malformed Messages body.
        if let Err(response) = count_tokens_claims(&state.token_manager, headers) {
            return *response;
        }
        return anthropic_error(StatusCode::BAD_REQUEST, b"max_tokens is required");
    }
    if anthropic_body
        .get("messages")
        .and_then(Value::as_array)
        .is_none_or(Vec::is_empty)
    {
        if let Err(response) = count_tokens_claims(&state.token_manager, headers) {
            return *response;
        }
        return anthropic_error(
            StatusCode::BAD_REQUEST,
            b"messages must contain at least one message",
        );
    }
    if let Some(kind) = unsupported_server_tool(&anthropic_body, state.upstream_provider) {
        if let Err(response) = count_tokens_claims(&state.token_manager, headers) {
            return *response;
        }
        return anthropic_error(
            StatusCode::BAD_REQUEST,
            format!("Unsupported tool type for selected provider: {kind}").as_bytes(),
        );
    }
    if let Some(reason) = crate::capabilities::unhonourable_server_tool_request(
        anthropic_body.get("tools"),
        anthropic_body.get("tool_choice"),
    ) {
        if let Err(response) = count_tokens_claims(&state.token_manager, headers) {
            return *response;
        }
        return anthropic_error(StatusCode::BAD_REQUEST, reason.as_bytes());
    }
    if let Some(reason) = untranslatable_anthropic_tool(&anthropic_body) {
        if let Err(response) = count_tokens_claims(&state.token_manager, headers) {
            return *response;
        }
        return anthropic_error(StatusCode::BAD_REQUEST, reason.as_bytes());
    }
    // Preserve the requested identity for the reply. A request that names no
    // model has none to echo; the resolved upstream model is reported
    // separately, so nothing is invented here (issue #192).
    let requested_model = anthropic_body
        .get("model")
        .and_then(Value::as_str)
        .unwrap_or_default()
        .to_string();
    let stream_requested = anthropic_body
        .get("stream")
        .and_then(Value::as_bool)
        .unwrap_or(false);
    let stop_sequences = crate::stop_sequences::from_value(anthropic_body.get("stop_sequences"));
    // No source-code fallback: when the live catalog cannot name a model the
    // request is refused rather than routed to a guess (issue #192).
    let bound_subscription;
    let subscription = if let Some(candidate) = subscription.filter(|item| item.uses_account_pool())
    {
        let claims = match count_tokens_claims(&state.token_manager, headers) {
            Ok(claims) => claims,
            Err(response) => return *response,
        };
        let pinned_account = match state.token_manager.account_for(&claims.sub) {
            Ok(account) => account,
            Err(error) => {
                return crate::proxy::error_response(
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "api_error",
                    &format!("failed to resolve token account binding: {error}"),
                );
            }
        };
        let context = crate::request_routing::request_routing_context(
            headers,
            &anthropic_body,
            pinned_account,
        );
        bound_subscription = match candidate.bind_for_context(state, &context).await {
            Ok(subscription) => Some(subscription),
            Err(error) => {
                return crate::proxy::error_response(
                    StatusCode::SERVICE_UNAVAILABLE,
                    "account_unavailable",
                    &error,
                );
            }
        };
        bound_subscription.as_ref()
    } else {
        subscription
    };
    let upstream_model = match resolve_bridge_model_for_account(
        state,
        subscription.and_then(|item| item.account_name()),
    ) {
        Ok(model) => model,
        Err(error) => {
            return crate::proxy::error_response(
                StatusCode::SERVICE_UNAVAILABLE,
                crate::bridge_selection::MODEL_SELECTION_REQUIRED,
                &error.to_string(),
            );
        }
    };
    let chat_body = anthropic_to_chat_request(&anthropic_body, &upstream_model);

    let upstream = match state.upstream_provider {
        UpstreamProvider::Codex => {
            let responses_body = crate::responses::chat_completion_to_responses(&chat_body);
            crate::subscription_proxy::forward_subscription_openai_routed(
                state,
                headers,
                responses_body,
                &chat_body,
                "/v1/responses",
                Surface::Anthropic,
                crate::subscription_proxy::RoutedSubscriptionContext {
                    validated: subscription,
                    entitlement: None,
                    native_route: false,
                },
            )
            .await
        }
        UpstreamProvider::Qwen => {
            crate::subscription_proxy::forward_subscription_openai_routed(
                state,
                headers,
                chat_body.clone(),
                &chat_body,
                "/v1/chat/completions",
                Surface::Anthropic,
                crate::subscription_proxy::RoutedSubscriptionContext {
                    validated: subscription,
                    entitlement: None,
                    native_route: false,
                },
            )
            .await
        }
        UpstreamProvider::Gemini => {
            crate::gemini::forward_chat_completions_as_routed(
                state,
                headers,
                chat_body,
                Surface::Anthropic,
                subscription,
            )
            .await
        }
        _ => {
            crate::provider_proxy::forward_provider_at_routed(
                state,
                headers,
                chat_body.clone(),
                &chat_body,
                crate::provider_proxy::ProviderForwardOptions {
                    path,
                    upstream_path: "/v1/chat/completions",
                    surface: Surface::Anthropic,
                    copy_anthropic_headers: false,
                    protocol: crate::client_policy::ClientProtocol::AnthropicMessages,
                    native_protocol: false,
                },
            )
            .await
        }
    };

    translate_upstream_response(
        upstream,
        &requested_model,
        &upstream_model,
        stream_requested,
        &stop_sequences,
    )
    .await
}

#[path = "anthropic_bridge_response.rs"]
mod response;
pub(crate) use response::translate_upstream_response;

/// Re-shape an upstream error body as an Anthropic error envelope.
#[path = "anthropic_bridge_error.rs"]
mod error;
use error::anthropic_error;
