use super::*;

pub fn anthropic_answer(model: &str, request_body: &[u8]) -> Vec<u8> {
    let request = serde_json::from_slice::<Value>(request_body).unwrap_or(Value::Null);
    let rendered = request.to_string();
    if rendered.contains(SUBAGENT_PROMPT) && !rendered.contains("tool_result") {
        let tool_name = request["tools"]
            .as_array()
            .and_then(|tools| {
                tools.iter().find_map(|tool| {
                    tool["name"]
                        .as_str()
                        .filter(|name| matches!(*name, "Agent" | "Task"))
                })
            })
            .expect("current Claude Code advertises its subagent tool");
        return subagent_call(model, tool_name);
    }
    let message = json!({
        "id": "msg_offline", "type": "message", "role": "assistant", "model": model,
        "content": [], "stop_reason": null, "stop_sequence": null,
        "usage": {"input_tokens": 1, "output_tokens": 0}
    });
    let events = [
        (
            "message_start",
            json!({"type":"message_start", "message":message}),
        ),
        (
            "content_block_start",
            json!({"type":"content_block_start", "index":0, "content_block":{"type":"text", "text":""}}),
        ),
        (
            "content_block_delta",
            json!({"type":"content_block_delta", "index":0, "delta":{"type":"text_delta", "text":ANSWER}}),
        ),
        (
            "content_block_stop",
            json!({"type":"content_block_stop", "index":0}),
        ),
        (
            "message_delta",
            json!({"type":"message_delta", "delta":{"stop_reason":"end_turn", "stop_sequence":null}, "usage":{"output_tokens":1}}),
        ),
        ("message_stop", json!({"type":"message_stop"})),
    ];
    event_stream(&events, "write answer event")
}

fn subagent_call(model: &str, tool_name: &str) -> Vec<u8> {
    let message = json!({
        "id": "msg_subagent_request", "type": "message", "role": "assistant", "model": model,
        "content": [], "stop_reason": null, "stop_sequence": null,
        "usage": {"input_tokens": 1, "output_tokens": 0}
    });
    let input = json!({
        "description": "Verify the routed model",
        "prompt": "Reply with exactly ROUTER_CAPTURE_OK",
        "subagent_type": "general-purpose"
    });
    let events = [
        (
            "message_start",
            json!({"type":"message_start", "message":message}),
        ),
        (
            "content_block_start",
            json!({"type":"content_block_start","index":0,"content_block":{"type":"tool_use","id":"toolu_router_subagent","name":tool_name,"input":{}}}),
        ),
        (
            "content_block_delta",
            json!({"type":"content_block_delta","index":0,"delta":{"type":"input_json_delta","partial_json":input.to_string()}}),
        ),
        (
            "content_block_stop",
            json!({"type":"content_block_stop","index":0}),
        ),
        (
            "message_delta",
            json!({"type":"message_delta","delta":{"stop_reason":"tool_use","stop_sequence":null},"usage":{"output_tokens":1}}),
        ),
        ("message_stop", json!({"type":"message_stop"})),
    ];
    event_stream(&events, "write subagent event")
}

fn event_stream(events: &[(&str, Value)], context: &str) -> Vec<u8> {
    let mut body = String::new();
    for (event, value) in events {
        write!(&mut body, "event: {event}\ndata: {value}\n\n").expect(context);
    }
    http_response("200 OK", "text/event-stream", &body)
}
