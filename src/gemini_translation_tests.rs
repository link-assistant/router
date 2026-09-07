use super::*;

#[test]
fn a_request_without_knobs_omits_the_generation_config() {
    let request = chat_to_gemini_request(&json!({"messages": []}));
    assert!(request.get("generationConfig").is_none());
    assert!(request.get("systemInstruction").is_none());
}

#[test]
fn max_completion_tokens_is_accepted_as_the_output_cap() {
    let request = chat_to_gemini_request(&json!({
        "messages": [],
        "max_completion_tokens": 64
    }));
    assert_eq!(request["generationConfig"]["maxOutputTokens"], 64);
}

#[test]
fn the_code_assist_envelope_carries_the_model() {
    let envelope = code_assist_envelope("models/nimbus-3-flash", &json!({"contents": []}));
    assert_eq!(envelope["model"], "nimbus-3-flash");
    assert_eq!(envelope["request"]["contents"], json!([]));
    let only_one = code_assist_envelope("models/models/exact", &json!({"contents": []}));
    assert_eq!(only_one["model"], "models/exact");
}

/// Responses are translated back into the `OpenAI` completion shape, with
/// usage carried across so spend accounting stays truthful.
#[test]
fn gemini_responses_translate_back_with_usage() {
    let response = json!({
        "candidates": [{
            "content": {"parts": [{"text": "one "}, {"text": "two"}]},
            "finishReason": "STOP"
        }],
        "usageMetadata": {"promptTokenCount": 11, "candidatesTokenCount": 5}
    });
    let chat = gemini_response_to_chat(&response, "nimbus-3-flash");

    assert_eq!(chat["model"], "nimbus-3-flash");
    assert_eq!(chat["choices"][0]["message"]["content"], "one two");
    assert_eq!(chat["choices"][0]["finish_reason"], "stop");
    assert_eq!(chat["usage"]["prompt_tokens"], 11);
    assert_eq!(chat["usage"]["completion_tokens"], 5);
    assert_eq!(chat["usage"]["total_tokens"], 16);
}

/// Code Assist nests the payload under `response`; both shapes are read.
#[test]
fn a_nested_code_assist_response_is_unwrapped() {
    let nested = json!({
        "response": {
            "candidates": [{"content": {"parts": [{"text": "inner"}]}}]
        }
    });
    let chat = gemini_response_to_chat(&nested, "nimbus-3-flash");
    assert_eq!(chat["choices"][0]["message"]["content"], "inner");
}

#[test]
fn finish_reasons_map_onto_the_openai_vocabulary() {
    assert_eq!(map_finish_reason("MAX_TOKENS"), "length");
    for blocked in ["SAFETY", "RECITATION", "BLOCKLIST", "PROHIBITED_CONTENT"] {
        assert_eq!(map_finish_reason(blocked), "content_filter", "{blocked}");
    }
    assert_eq!(map_finish_reason("STOP"), "stop");
    assert_eq!(map_finish_reason("SOMETHING_NEW"), "content_filter");
}

#[test]
fn buffered_tool_calls_preserve_identity_arguments_finish_and_usage_on_both_surfaces() {
    let gemini = json!({
        "candidates": [{
            "content": {"parts": [{"functionCall": {
                "id": "call_7", "name": "lookup", "args": {"key": "value"}
            }}]},
            "finishReason": "STOP"
        }],
        "usageMetadata": {"promptTokenCount": 2, "candidatesTokenCount": 3}
    });
    let chat = gemini_response_to_chat(&gemini, "served-model");
    assert_eq!(chat["choices"][0]["finish_reason"], "tool_calls");
    let call = &chat["choices"][0]["message"]["tool_calls"][0];
    assert_eq!(call["id"], "call_7");
    assert_eq!(call["function"]["name"], "lookup");
    assert_eq!(call["function"]["arguments"], "{\"key\":\"value\"}");
    assert_eq!(chat["usage"]["total_tokens"], 5);

    let response = responses::from_chat(
        &chat,
        "requested-model",
        responses::Finish::from_gemini(gemini_finish_reason(&gemini).unwrap()),
    );
    assert_eq!(response["status"], "completed");
    assert_eq!(response["output"][0]["type"], "function_call");
    assert_eq!(response["output"][0]["call_id"], "call_7");
    assert_eq!(response["output"][0]["name"], "lookup");
    assert_eq!(response["output"][0]["arguments"], "{\"key\":\"value\"}");
    assert_eq!(response["usage"]["total_tokens"], 5);
}

#[test]
fn buffered_prompt_blocks_do_not_become_successful_empty_responses() {
    let gemini = json!({"promptFeedback": {"blockReason": "SAFETY"}});
    let chat = gemini_response_to_chat(&gemini, "served-model");
    assert_eq!(chat["choices"][0]["finish_reason"], "content_filter");
    let response = responses::from_chat(
        &chat,
        "requested-model",
        responses::Finish::from_gemini(gemini_finish_reason(&gemini).unwrap()),
    );
    assert_eq!(response["status"], "incomplete");
    assert_eq!(
        response["incomplete_details"],
        json!({"reason": "content_filter"})
    );
}

#[test]
fn message_text_is_extracted_from_both_content_shapes() {
    assert_eq!(extract_message_text(Some(&json!("plain"))), "plain");
    assert_eq!(
        extract_message_text(Some(&json!([{"text": "a"}, {"text": "b"}]))),
        "ab"
    );
    assert_eq!(extract_message_text(Some(&json!(["a", "b"]))), "ab");
    assert_eq!(extract_message_text(None), "");
    assert_eq!(extract_message_text(Some(&json!(42))), "");
}

/// Incremental output retains the alias the caller selected without
/// Router-private metadata.
#[test]
fn incremental_chat_stream_preserves_requested_model_only() {
    let mut translator = stream::OpenAiStreamTranslator::new("catalog-alias");
    let payload = translator
        .push(
            br#"data: {"response":{"modelVersion":"future-upstream-model","candidates":[{"content":{"parts":[{"text":"hello"}]},"finishReason":"STOP"}]}}

"#,
        )
        .expect("translate Gemini SSE");
    let payload = String::from_utf8(payload.to_vec()).expect("UTF-8 SSE");
    let chunks: Vec<Value> = payload
        .lines()
        .filter_map(|line| line.strip_prefix("data: "))
        .filter(|data| *data != "[DONE]")
        .map(|data| serde_json::from_str(data).expect("JSON SSE frame"))
        .collect();
    assert_eq!(chunks.len(), 3);
    for chunk in chunks {
        assert_eq!(chunk["model"], "catalog-alias");
        assert!(chunk.get("x_router_upstream_model").is_none());
    }
    assert!(payload.ends_with("data: [DONE]\n\n"));
}
