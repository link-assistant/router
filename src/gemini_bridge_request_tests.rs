use super::*;

#[test]
fn chat_tool_contract_and_two_turn_history_are_exact() {
    let schema = json!({
        "type": "object",
        "properties": {"city": {"type": "string"}},
        "required": ["city"]
    });
    let request = chat_to_gemini_request_checked(&json!({
        "messages": [
            {"role": "user", "content": "weather?"},
            {"role": "assistant", "content": null, "tool_calls": [{
                "id": "call_weather", "type": "function",
                "function": {"name": "weather", "arguments": "{\"city\":\"Lisbon\"}"}
            }]},
            {"role": "tool", "tool_call_id": "call_weather", "content": "{\"c\":21}"},
            {"role": "user", "content": "summarize"}
        ],
        "tools": [{"type": "function", "function": {
            "name": "weather", "description": "look up weather", "parameters": schema,
            "strict": false
        }}],
        "tool_choice": "required"
    }))
    .unwrap();

    assert_eq!(
        request["tools"],
        json!([{"functionDeclarations": [{
            "name": "weather", "description": "look up weather", "parameters": schema
        }]}])
    );
    assert_eq!(
        request["toolConfig"],
        json!({"functionCallingConfig": {"mode": "ANY"}})
    );
    assert_eq!(
        request["contents"],
        json!([
            {"role": "user", "parts": [{"text": "weather?"}]},
            {"role": "model", "parts": [{"functionCall": {
                "id": "call_weather", "name": "weather", "args": {"city": "Lisbon"}
            }}]},
            {"role": "user", "parts": [{"functionResponse": {
                "id": "call_weather", "name": "weather", "response": {"c": 21}
            }}]},
            {"role": "user", "parts": [{"text": "summarize"}]}
        ])
    );
}

#[test]
fn responses_tool_contract_and_two_turn_history_are_exact() {
    let body = json!({
        "model": "live-model",
        "input": [
            {"role": "user", "content": [{"type": "input_text", "text": "weather?"}]},
            {"type": "function_call", "call_id": "call_7", "name": "weather",
             "arguments": "{\"city\":\"Hanoi\"}"},
            {"type": "function_call_output", "call_id": "call_7", "output": "{\"c\":31}"}
        ],
        "tools": [{"type": "function", "name": "weather", "description": "weather",
            "parameters": {"type": "object"}, "strict": false}],
        "tool_choice": {"type": "function", "name": "weather"}
    });
    let chat = responses_to_chat_checked(&body).unwrap();
    assert_eq!(
        chat["tool_choice"],
        json!({"type": "function", "function": {"name": "weather"}})
    );
    let request = chat_to_gemini_request_checked(&chat).unwrap();
    assert_eq!(
        request["tools"],
        json!([{"functionDeclarations": [{
            "name": "weather", "description": "weather", "parameters": {"type": "object"}
        }]}])
    );
    assert_eq!(
        request["toolConfig"],
        json!({"functionCallingConfig": {"mode": "ANY", "allowedFunctionNames": ["weather"]}})
    );
    assert_eq!(
        request["contents"][1]["parts"][0]["functionCall"],
        json!({"id": "call_7", "name": "weather", "args": {"city": "Hanoi"}})
    );
    assert_eq!(
        request["contents"][2]["parts"][0]["functionResponse"],
        json!({"id": "call_7", "name": "weather", "response": {"c": 31}})
    );
}

#[test]
fn chat_and_responses_images_preserve_mime_uri_and_order() {
    let chat = json!({"messages": [{"role": "user", "content": [
        {"type": "text", "text": "before"},
        {"type": "image_url", "image_url": {"url": "data:image/png;base64,QUJD"}},
        {"type": "text", "text": "between"},
        {"type": "image_url", "image_url": {"url": "https://images.test/a.webp"}}
    ]}]});
    let expected = json!([
        {"text": "before"},
        {"inlineData": {"mimeType": "image/png", "data": "QUJD"}},
        {"text": "between"},
        {"fileData": {"fileUri": "https://images.test/a.webp"}}
    ]);
    assert_eq!(
        chat_to_gemini_request_checked(&chat).unwrap()["contents"][0]["parts"],
        expected
    );

    let responses = json!({"input": [{"role": "user", "content": [
        {"type": "input_image", "image_url": "data:image/png;base64,QUJD"},
        {"type": "input_text", "text": "after"}
    ]}]});
    let chat = responses_to_chat_checked(&responses).unwrap();
    assert_eq!(
        chat_to_gemini_request_checked(&chat).unwrap()["contents"][0]["parts"],
        json!([
            {"inlineData": {"mimeType": "image/png", "data": "QUJD"}},
            {"text": "after"}
        ])
    );
}

#[test]
fn gemini_images_preserve_image_only_and_mixed_turns() {
    let chat = gemini_request_to_chat_checked(
        "model",
        &json!({"contents": [
            {"role": "user", "parts": [{
                "inlineData": {"mimeType": "image/png", "data": "QUJD"}
            }]},
            {"role": "model", "parts": [{"text": "seen"}]},
            {"role": "user", "parts": [
                {"text": "before"},
                {"fileData": {"mimeType": "image/webp", "fileUri": "https://images.test/a.webp"}},
                {"text": "after"}
            ]}
        ]}),
    )
    .unwrap();
    let messages = chat["messages"].as_array().unwrap();
    assert_eq!(messages.len(), 3);
    assert_eq!(
        messages[0]["content"],
        json!([{"type": "image_url", "image_url": {
            "url": "data:image/png;base64,QUJD"
        }}])
    );
    assert_eq!(
        messages[2]["content"],
        json!([
            {"type": "text", "text": "before"},
            {"type": "image_url", "image_url": {"url": "https://images.test/a.webp"}},
            {"type": "text", "text": "after"}
        ])
    );
}

#[test]
fn anthropic_images_reach_the_same_gemini_parts() {
    let body = json!({"messages": [{"role": "user", "content": [
        {"type": "image", "source": {"type": "base64", "media_type": "image/png", "data": "QUJD"}},
        {"type": "text", "text": "middle"},
        {"type": "image", "source": {"type": "url", "url": "https://images.test/b.jpg"}}
    ]}]});
    crate::bridge_request::validate_anthropic_request(
        &body,
        crate::bridge_request::BridgeTarget::Gemini,
    )
    .unwrap();
    let chat = crate::bridge_request::anthropic_to_chat_request(&body, "model");
    assert_eq!(
        chat_to_gemini_request_checked(&chat).unwrap()["contents"][0]["parts"],
        json!([
            {"inlineData": {"mimeType": "image/png", "data": "QUJD"}},
            {"text": "middle"},
            {"fileData": {"fileUri": "https://images.test/b.jpg"}}
        ])
    );
}

#[test]
fn function_results_keep_order_and_consume_explicit_ids() {
    let request = json!({"contents": [
        {"role": "model", "parts": [
            {"functionCall": {"id": "a", "name": "same", "args": {"n": 1}}},
            {"functionCall": {"id": "b", "name": "same", "args": {"n": 2}}}
        ]},
        {"role": "user", "parts": [
            {"functionResponse": {"id": "b", "name": "same", "response": {"n": 2}}},
            {"functionResponse": {"id": "a", "name": "same", "response": {"n": 1}}},
            {"text": "after"},
            {"inlineData": {"mimeType": "image/png", "data": "QUJD"}}
        ]}
    ]});
    let chat = gemini_request_to_chat_checked("model", &request).unwrap();
    assert_eq!(chat["messages"][1]["tool_call_id"], "b");
    assert_eq!(chat["messages"][2]["tool_call_id"], "a");
    assert_eq!(
        chat["messages"][3]["content"],
        json!([
            {"type": "text", "text": "after"},
            {"type": "image_url", "image_url": {"url": "data:image/png;base64,QUJD"}}
        ])
    );

    let mut ambiguous = request.clone();
    ambiguous["contents"][1]["parts"] = json!([{
        "functionResponse": {"name": "same", "response": {}}
    }]);
    assert!(
        gemini_request_to_chat_checked("model", &ambiguous)
            .unwrap_err()
            .contains("ambiguous")
    );

    let mut reused = request;
    reused["contents"][1]["parts"] = json!([
        {"functionResponse": {"id": "a", "name": "same", "response": {}}},
        {"functionResponse": {"id": "a", "name": "same", "response": {}}}
    ]);
    assert!(gemini_request_to_chat_checked("model", &reused).is_err());
}

#[test]
fn unsupported_tools_images_and_interleaving_fail_closed() {
    let invalid_chat = [
        json!({"messages": [], "future_field": true}),
        json!({"messages": [], "tools": [{"type": "web_search"}]}),
        json!({"messages": [], "tools": [{"type": "function", "function": {
            "name": "x", "strict": true
        }}]}),
        json!({"messages": [], "tool_choice": {"type": "allowed_tools"}}),
        json!({"messages": [{"role": "user", "content": [{
            "type": "image_url", "image_url": {"url": "data:image/svg+xml;base64,QUJD"}
        }]}]}),
        json!({"messages": [{"role": "user", "content": [{
            "type": "image_url", "image_url": {"url": "data:image/png;base64,!"}
        }]}]}),
    ];
    for body in invalid_chat {
        assert!(chat_to_gemini_request_checked(&body).is_err(), "{body}");
    }

    for body in [
        json!({"contents": [], "futureField": true}),
        json!({"contents": [], "safetySettings": [{
            "category": "HARM_CATEGORY_HARASSMENT",
            "threshold": "BLOCK_LOW_AND_ABOVE"
        }]}),
        json!({"contents": [], "store": true}),
        json!({"contents": [], "store": false}),
        json!({"contents": [], "tools": [{"googleSearch": {}}]}),
        json!({"contents": [{"role": "user", "parts": [{
            "fileData": {"fileUri": "gs://private/image.png"}
        }]}]}),
        json!({"contents": [{"role": "user", "parts": [{"text": "x", "futurePart": true}]}]}),
        json!({"contents": [
            {"role": "model", "parts": [{"functionCall": {"id": "a", "name": "x", "args": {}}}]},
            {"role": "user", "parts": [
                {"text": "before"},
                {"functionResponse": {"id": "a", "name": "x", "response": {}}}
            ]}
        ]}),
    ] {
        assert!(
            gemini_request_to_chat_checked("model", &body).is_err(),
            "{body}"
        );
    }

    assert!(responses_to_chat_checked(&json!({"input": "x", "future_field": true})).is_err());
}
