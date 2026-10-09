//! Regression coverage for canonical thinking controls (issue #725).
use link_assistant_router::{anthropic_bridge, gemini_bridge, openai, responses};
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

#[test]
fn chat_to_responses_preserves_summary_choice_independently_of_effort() {
    let mut source = json!({"model":"exact","messages":[{"role":"user","content":"hi"}],
        "reasoning_effort":"high"});
    let body = responses::try_chat_completion_to_responses(&source).unwrap();
    assert_eq!(body["reasoning"], json!({"effort":"high"}));
    for summary in ["auto", "concise", "detailed", "none"] {
        source["reasoning"] = json!({"effort":"low","summary":summary});
        let body = responses::try_chat_completion_to_responses(&source).unwrap();
        assert_eq!(body["reasoning"], json!({"effort":"low","summary":summary}));
    }
}

#[test]
fn anthropic_budget_keeps_explicit_output_limit_and_historical_output_headroom() {
    let request = serde_json::from_value(json!({
        "model":"claude-sonnet-4-5(8192)",
        "messages":[{"role":"user","content":"hi"}],
        "max_tokens":6000,"temperature":0.4,"top_p":0.5
    }))
    .unwrap();
    let body = openai::chat_completion_to_anthropic(&request);
    assert_eq!(body["model"], "claude-sonnet-4-5");
    assert_eq!(body["max_tokens"], 6000);
    assert_eq!(
        body["thinking"],
        json!({"type":"enabled","budget_tokens":1904})
    );
    assert!(body.get("temperature").is_none());
    assert!(body.get("top_p").is_none());
}

#[test]
fn anthropic_adaptive_max_keeps_the_historical_chat_xhigh_mapping() {
    let body = anthropic_bridge::anthropic_to_chat_request(
        &json!({"messages":[{"role":"user","content":"hi"}],
            "thinking":{"type":"adaptive"},"output_config":{"effort":"max"}}),
        "exact-model",
    );
    assert_eq!(body["reasoning_effort"], "xhigh");
}
