use super::*;

#[test]
fn detects_string_and_block_warmups() {
    assert!(is_warmup_request(&json!({
        "messages": [{"role": "user", "content": "Warmup"}]
    })));
    assert!(is_warmup_request(&json!({
        "messages": [{"role": "user", "content": [
            {"type": "text", "text": "Warmup", "cache_control": {"type": "ephemeral"}}
        ]}]
    })));
}

#[test]
fn ignores_anything_else() {
    for body in [
        json!({"messages": [{"role": "user", "content": "Warm up the oven"}]}),
        json!({"messages": [{"role": "assistant", "content": "Warmup"}]}),
        json!({"messages": [
            {"role": "user", "content": "Warmup"},
            {"role": "assistant", "content": "OK"},
            {"role": "user", "content": "Warmup"}
        ]}),
        json!({"messages": [{"role": "user", "content": [
            {"type": "text", "text": "Warmup"},
            {"type": "image", "source": {}}
        ]}]}),
        json!({"messages": []}),
        json!({}),
    ] {
        assert!(!is_warmup_request(&body), "{body}");
    }
}
