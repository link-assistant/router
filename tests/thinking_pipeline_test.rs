//! Regression coverage for canonical thinking controls (issue #725).
use link_assistant_router::{anthropic_bridge, gemini_bridge, openai};
use serde_json::json;

#[test]
fn chat_suffix_selects_base_model_and_thinking_budget() {
    let request = serde_json::from_value(json!({
        "model":"claude-sonnet-4-5(16384)",
        "messages":[{"role":"user","content":"hi"}],
        "max_tokens":24000
    }))
    .unwrap();
    let body = openai::chat_completion_to_anthropic(&request);
    assert_eq!(body["model"], "claude-sonnet-4-5");
    assert_eq!(body["thinking"]["budget_tokens"], 16384);
}

#[test]
fn chat_reasoning_effort_translates_to_gemini() {
    let body = gemini_bridge::chat_to_gemini_request(&json!({
        "model":"gemini-example",
        "messages":[{"role":"user","content":"hi"}],
        "reasoning_effort":"medium"
    }));
    assert_eq!(
        body["generationConfig"]["thinkingConfig"]["thinkingBudget"],
        8192
    );
}

#[test]
fn gemini_budget_translates_to_chat() {
    let body = gemini_bridge::gemini_request_to_chat(
        "exact-model",
        &json!({
            "contents":[{"role":"user","parts":[{"text":"hi"}]}],
            "generationConfig":{"thinkingConfig":{"thinkingBudget":8192}}
        }),
    );
    assert_eq!(body["reasoning_effort"], "medium");
}

#[test]
fn anthropic_manual_budget_translates_to_chat() {
    let body = anthropic_bridge::anthropic_to_chat_request(
        &json!({"messages":[{"role":"user","content":"hi"}],
            "thinking":{"type":"enabled","budget_tokens":8192}}),
        "exact-model",
    );
    assert_eq!(body["reasoning_effort"], "medium");
}
