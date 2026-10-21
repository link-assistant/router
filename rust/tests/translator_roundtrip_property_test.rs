//! Round-trip and prompt-cache prefix properties for protocol translators
//! (issues #670 and #671).
//!
//! Tool calls must keep their identifiers, names and arguments across every
//! protocol pair; prompt-cache breakpoints must land on the same blocks; and
//! translating a longer conversation must keep the translated earlier turns
//! byte-identical, otherwise the vendor prompt cache misses on every turn.

use link_assistant_router::anthropic_bridge::{
    anthropic_to_chat_request, openai_json_to_anthropic_message,
};
use link_assistant_router::gemini_bridge::{chat_to_gemini_request, gemini_request_to_chat};
use link_assistant_router::openai::{
    OpenAIChatCompletionRequest, anthropic_to_chat_completion, chat_completion_to_anthropic,
};
use proptest::prelude::*;
use serde_json::{Value, json};

#[derive(Clone, Debug)]
struct ToolCall {
    id: String,
    name: String,
    input: Value,
}

fn scalar() -> impl Strategy<Value = Value> {
    prop_oneof![
        any::<i32>().prop_map(Value::from),
        any::<bool>().prop_map(Value::from),
        "[a-zA-Z0-9 éß世界🌍\"\\\\]{0,12}".prop_map(Value::from),
    ]
}

fn object() -> impl Strategy<Value = Value> {
    let leaf = scalar();
    let nested = leaf.prop_recursive(2, 8, 3, |inner| {
        prop_oneof![
            prop::collection::vec(inner.clone(), 0..3).prop_map(Value::from),
            prop::collection::btree_map("[a-z]{1,6}", inner, 0..3)
                .prop_map(|map| Value::Object(map.into_iter().collect())),
        ]
    });
    prop::collection::btree_map("[a-z_]{1,8}", nested, 0..4)
        .prop_map(|map| Value::Object(map.into_iter().collect()))
}

fn tool_calls() -> impl Strategy<Value = Vec<ToolCall>> {
    prop::collection::vec(("[a-z0-9]{4,12}", "[a-z][a-z_]{0,10}", object()), 1..4).prop_map(
        |calls| {
            calls
                .into_iter()
                .enumerate()
                .map(|(index, (id, name, input))| ToolCall {
                    // Identifiers are unique within one assistant turn.
                    id: format!("toolu_{index}_{id}"),
                    name,
                    input,
                })
                .collect()
        },
    )
}

fn text() -> impl Strategy<Value = String> {
    "[a-zA-Z0-9 .,éß世界🌍\n]{1,40}"
}

fn tool_use_blocks(content: &Value) -> Vec<(String, String, Value)> {
    content
        .as_array()
        .into_iter()
        .flatten()
        .filter(|block| block["type"] == "tool_use")
        .map(|block| {
            (
                block["id"].as_str().unwrap_or_default().to_string(),
                block["name"].as_str().unwrap_or_default().to_string(),
                block["input"].clone(),
            )
        })
        .collect()
}

fn expected(calls: &[ToolCall]) -> Vec<(String, String, Value)> {
    calls
        .iter()
        .map(|call| (call.id.clone(), call.name.clone(), call.input.clone()))
        .collect()
}

/// An `OpenAI` Chat conversation: user turn, assistant tool calls, tool results,
/// then `turns` more user/assistant exchanges. The first user block carries a
/// prompt-cache breakpoint unless `plain` (Gemini cannot represent one).
fn chat_conversation(question: &str, calls: &[ToolCall], turns: &[String], plain: bool) -> Value {
    let mut first = json!({"type":"text","text":question});
    if !plain {
        first["prompt_cache_breakpoint"] = json!({});
    }
    let mut messages = vec![
        json!({"role":"system","content":"You are terse."}),
        json!({"role":"user","content":[first]}),
        json!({"role":"assistant","content":null,"tool_calls":calls.iter().map(|call| json!({
            "id": call.id,
            "type": "function",
            "function": {"name": call.name, "arguments": call.input.to_string()},
        })).collect::<Vec<_>>()}),
    ];
    for call in calls {
        messages.push(json!({"role":"tool","tool_call_id":call.id,"content":format!("result of {}", call.name)}));
    }
    for (index, turn) in turns.iter().enumerate() {
        let role = if index % 2 == 0 { "user" } else { "assistant" };
        messages.push(json!({"role": role, "content": turn}));
    }
    let tools: Vec<Value> = calls
        .iter()
        .map(|call| json!({"type":"function","function":{"name":call.name,"parameters":{"type":"object"}}}))
        .collect();
    json!({"model":"m","max_tokens":64,"messages":messages,"tools":tools})
}

fn to_anthropic(chat: &Value) -> Value {
    let request: OpenAIChatCompletionRequest =
        serde_json::from_value(chat.clone()).expect("valid chat request");
    chat_completion_to_anthropic(&request)
}

proptest! {
    #![proptest_config(ProptestConfig::with_cases(64))]

    /// Anthropic response -> Chat response -> Anthropic message keeps the
    /// answer text and every tool call exactly.
    #[test]
    fn anthropic_response_round_trips_through_chat(answer in text(), calls in tool_calls()) {
        let mut content = vec![json!({"type":"text","text":answer})];
        content.extend(calls.iter().map(|call| json!({
            "type":"tool_use","id":call.id,"name":call.name,"input":call.input,
        })));
        let anthropic = json!({
            "id":"msg_1","type":"message","role":"assistant","model":"claude-upstream",
            "content":content,"stop_reason":"tool_use",
            "usage":{"input_tokens":5,"output_tokens":7},
        });
        let chat = anthropic_to_chat_completion(&anthropic, "requested");
        let back = openai_json_to_anthropic_message(&chat, "requested");
        prop_assert_eq!(tool_use_blocks(&back["content"]), expected(&calls));
        let texts: Vec<&str> = back["content"].as_array().into_iter().flatten()
            .filter(|block| block["type"] == "text")
            .filter_map(|block| block["text"].as_str())
            .collect();
        prop_assert_eq!(texts.concat(), answer);
        prop_assert_eq!(&back["stop_reason"], "tool_use");
    }

    /// Chat request -> Anthropic request keeps tool calls, pairs every tool
    /// result with its call, and carries the cache breakpoint to its block.
    #[test]
    fn chat_request_tool_calls_and_cache_breakpoints_reach_anthropic(
        question in text(), calls in tool_calls(),
    ) {
        let anthropic = to_anthropic(&chat_conversation(&question, &calls, &[], false));
        let messages = anthropic["messages"].as_array().expect("messages");
        let user = &messages[0]["content"][0];
        prop_assert_eq!(&user["text"], question.as_str());
        prop_assert_eq!(&user["cache_control"], &json!({"type":"ephemeral"}));
        let uses: Vec<_> = messages.iter().flat_map(|message| tool_use_blocks(&message["content"])).collect();
        prop_assert_eq!(uses, expected(&calls));
        let results: Vec<String> = messages.iter()
            .flat_map(|message| message["content"].as_array().cloned().unwrap_or_default())
            .filter(|block| block["type"] == "tool_result")
            .map(|block| block["tool_use_id"].as_str().unwrap_or_default().to_string())
            .collect();
        let ids: Vec<String> = calls.iter().map(|call| call.id.clone()).collect();
        prop_assert_eq!(results, ids);
    }

    /// Anthropic request -> Chat request -> Anthropic request keeps every tool
    /// call and tool result pairing.
    #[test]
    fn anthropic_request_round_trips_through_chat(question in text(), calls in tool_calls()) {
        let anthropic = json!({
            "model":"claude","max_tokens":64,"system":"You are terse.",
            "messages":[
                {"role":"user","content":question},
                {"role":"assistant","content":calls.iter().map(|call| json!({
                    "type":"tool_use","id":call.id,"name":call.name,"input":call.input,
                })).collect::<Vec<_>>()},
                {"role":"user","content":calls.iter().map(|call| json!({
                    "type":"tool_result","tool_use_id":call.id,"content":"ok",
                })).collect::<Vec<_>>()},
            ],
        });
        let chat = anthropic_to_chat_request(&anthropic, "gpt");
        let back = to_anthropic(&chat);
        let uses: Vec<_> = back["messages"].as_array().into_iter().flatten()
            .flat_map(|message| tool_use_blocks(&message["content"]))
            .collect();
        prop_assert_eq!(uses, expected(&calls));
    }

    /// Chat request -> Gemini request -> Chat request keeps function names and
    /// arguments, in order.
    #[test]
    fn chat_request_round_trips_through_gemini(question in text(), calls in tool_calls()) {
        let chat = chat_conversation(&question, &calls, &[], true);
        let gemini = chat_to_gemini_request(&chat);
        let back = gemini_request_to_chat("gemini", &gemini);
        let functions: Vec<(String, Value)> = back["messages"].as_array().into_iter().flatten()
            .flat_map(|message| message["tool_calls"].as_array().cloned().unwrap_or_default())
            .map(|call| {
                let arguments = call["function"]["arguments"].as_str().unwrap_or("null");
                (
                    call["function"]["name"].as_str().unwrap_or_default().to_string(),
                    serde_json::from_str(arguments).unwrap_or(Value::Null),
                )
            })
            .collect();
        let want: Vec<(String, Value)> = calls.iter().map(|call| (call.name.clone(), call.input.clone())).collect();
        prop_assert_eq!(functions, want);
    }

    /// Prompt-cache prefix stability (issue #671): appending turns to a
    /// conversation leaves the translated system prompt, tools and earlier
    /// messages byte-identical, so an upstream prompt cache keeps hitting.
    #[test]
    fn chat_to_anthropic_keeps_the_cached_prefix_stable(
        question in text(), calls in tool_calls(),
        turns in prop::collection::vec(text(), 0..4), more in prop::collection::vec(text(), 1..4),
    ) {
        let short = to_anthropic(&chat_conversation(&question, &calls, &turns, false));
        let mut longer_turns = turns;
        longer_turns.extend(more);
        let long = to_anthropic(&chat_conversation(&question, &calls, &longer_turns, false));
        prop_assert_eq!(short["system"].to_string(), long["system"].to_string());
        prop_assert_eq!(short["tools"].to_string(), long["tools"].to_string());
        let short_messages = short["messages"].as_array().expect("messages");
        let long_messages = long["messages"].as_array().expect("messages");
        // The last short message may merge with a following same-role turn,
        // so compare every message before it.
        let stable = short_messages.len().saturating_sub(1);
        for index in 0..stable {
            prop_assert_eq!(short_messages[index].to_string(), long_messages[index].to_string());
        }
    }

    /// The same prefix property for Anthropic clients bridged to Chat providers.
    #[test]
    fn anthropic_to_chat_keeps_the_cached_prefix_stable(
        turns in prop::collection::vec(text(), 1..5), more in prop::collection::vec(text(), 1..4),
    ) {
        let request = |turns: &[String]| {
            let messages: Vec<Value> = turns.iter().enumerate().map(|(index, turn)| json!({
                "role": if index % 2 == 0 { "user" } else { "assistant" },
                "content": [{"type":"text","text":turn}],
            })).collect();
            anthropic_to_chat_request(&json!({
                "model":"claude","max_tokens":64,
                "system":[{"type":"text","text":"You are terse.","cache_control":{"type":"ephemeral"}}],
                "tools":[{"name":"lookup","input_schema":{"type":"object"}}],
                "messages":messages,
            }), "gpt")
        };
        let short = request(&turns);
        let mut longer = turns;
        longer.extend(more);
        let long = request(&longer);
        prop_assert_eq!(short["tools"].to_string(), long["tools"].to_string());
        let short_messages = short["messages"].as_array().expect("messages");
        let long_messages = long["messages"].as_array().expect("messages");
        for index in 0..short_messages.len().saturating_sub(1) {
            prop_assert_eq!(short_messages[index].to_string(), long_messages[index].to_string());
        }
    }
}
