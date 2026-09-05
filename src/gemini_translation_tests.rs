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
    assert_eq!(map_finish_reason("SOMETHING_NEW"), "stop");
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

/// The synthetic stream is part of the public OpenAI-compatible contract: it
/// must retain the alias the caller selected without Router-private metadata.
#[tokio::test]
async fn synthetic_chat_stream_preserves_requested_model_only() {
    use http_body_util::BodyExt as _;

    let response = sse_from_chat_completion(
        &json!({
            "id": "chatcmpl-live",
            "created": 42,
            "model": "future-upstream-model",
            "choices": [{"message": {"role": "assistant", "content": "hello"}}]
        }),
        "catalog-alias",
    );

    assert_eq!(response.status(), StatusCode::OK);
    assert!(response.headers().get("x-router-upstream-model").is_none());
    assert_eq!(response.headers()["content-type"], "text/event-stream");
    let payload = String::from_utf8(
        response
            .into_body()
            .collect()
            .await
            .expect("synthetic stream body")
            .to_bytes()
            .to_vec(),
    )
    .expect("UTF-8 SSE");
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
