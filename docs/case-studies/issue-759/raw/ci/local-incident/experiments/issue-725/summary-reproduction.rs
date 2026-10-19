//! Minimum reproduction for an amount control adding an unrequested summary.
use link_assistant_router::responses;
use serde_json::json;

fn main() {
    let source = json!({"model":"exact","messages":[{"role":"user","content":"hi"}],
        "reasoning_effort":"high"});
    let body = responses::try_chat_completion_to_responses(&source).unwrap();
    assert_eq!(body["reasoning"], json!({"effort":"high"}));
}
