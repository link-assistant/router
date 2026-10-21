use super::*;

#[test]
fn translates_chat_to_gemini_contents_and_system() {
    let body = json!({
        "model": "gemini-2.5-pro",
        "messages": [
            {"role": "system", "content": "be terse"},
            {"role": "user", "content": "hi"},
            {"role": "assistant", "content": "hello"},
            {"role": "user", "content": "more"}
        ],
        "temperature": 0.5,
        "max_tokens": 256
    });
    let g = chat_to_gemini_request(&body);
    let contents = g["contents"].as_array().unwrap();
    assert_eq!(contents.len(), 3);
    assert_eq!(contents[0]["role"], "user");
    assert_eq!(contents[1]["role"], "model");
    assert_eq!(g["systemInstruction"]["parts"][0]["text"], "be terse");
    assert_eq!(g["generationConfig"]["maxOutputTokens"], 256);
    assert_eq!(g["generationConfig"]["temperature"], 0.5);
}

#[test]
fn translates_gemini_response_to_chat() {
    let resp = json!({
        "candidates": [{
            "content": { "role": "model", "parts": [{"text": "answer"}] },
            "finishReason": "STOP"
        }],
        "usageMetadata": { "promptTokenCount": 3, "candidatesTokenCount": 5 }
    });
    let chat = gemini_response_to_chat(&resp, "gemini-2.5-pro");
    assert_eq!(chat["choices"][0]["message"]["content"], "answer");
    assert_eq!(chat["choices"][0]["finish_reason"], "stop");
    assert_eq!(chat["usage"]["total_tokens"], 8);
}

#[test]
fn unwraps_code_assist_response_envelope() {
    let resp = json!({
        "response": {
            "candidates": [{ "content": { "parts": [{"text": "x"}] }, "finishReason": "MAX_TOKENS" }]
        }
    });
    let chat = gemini_response_to_chat(&resp, "gemini-2.5-pro");
    assert_eq!(chat["choices"][0]["message"]["content"], "x");
    assert_eq!(chat["choices"][0]["finish_reason"], "length");
}

#[test]
fn envelope_includes_model() {
    let env = code_assist_envelope("gemini-2.5-pro", &json!({"contents": []}));
    assert_eq!(env["model"], "gemini-2.5-pro");
    assert!(env.get("request").is_some());
}

#[test]
fn responses_input_projects_to_messages() {
    let body = json!({
        "model": "gemini-2.5-pro",
        "instructions": "sys",
        "input": [{"role": "user", "content": "hi"}],
        "max_output_tokens": 100
    });
    let chat = crate::gemini_bridge::responses_to_chat_checked(&body).unwrap();
    let messages = chat["messages"].as_array().unwrap();
    assert_eq!(messages[0]["role"], "system");
    assert_eq!(messages[1]["role"], "user");
    assert_eq!(chat["max_tokens"], 100);
}

#[test]
fn select_model_uses_the_live_catalog_only() {
    // Synthetic names: the router must hold no real Gemini ids (issue #192).
    let catalog = vec!["nimbus-3-flash".to_string(), "nimbus-9-pro".to_string()];
    // A model the account advertises is served unchanged.
    assert_eq!(
        select_model(
            Some("nimbus-3-flash"),
            &catalog,
            crate::bridge_selection::BridgeModelPolicy::default()
        ),
        Some("nimbus-3-flash".to_string())
    );
    // A model it does not advertise is refused, not substituted.
    assert_eq!(
        select_model(
            Some("absent-1"),
            &catalog,
            crate::bridge_selection::BridgeModelPolicy::default()
        ),
        None
    );
    // No requested model falls back to the operator policy over the catalog.
    assert_eq!(
        select_model(
            None,
            &catalog,
            crate::bridge_selection::BridgeModelPolicy::default()
        ),
        Some("nimbus-3-flash".to_string())
    );
    // Nothing discovered and nothing requested selects nothing.
    assert_eq!(
        select_model(
            None,
            &[],
            crate::bridge_selection::BridgeModelPolicy::default()
        ),
        None
    );
}

#[test]
fn parses_gemini_and_vertex_native_actions() {
    assert_eq!(
        native::parse_native_target("models/gemini-2.5-pro:generateContent"),
        Some(("gemini-2.5-pro".into(), false))
    );
    assert_eq!(
        native::parse_native_target(
            "projects/p/locations/us/publishers/google/models/gemini-2.5-flash:streamGenerateContent"
        ),
        Some(("gemini-2.5-flash".into(), true))
    );
    assert!(native::parse_native_target("models/gemini-2.5-pro:countTokens").is_none());
}
