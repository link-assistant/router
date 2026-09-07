//! Cross-translator UTF-8 transport-boundary regressions (issue #458).

fn assert_split_scalar_is_preserved(
    frame: &str,
    scalar: &str,
    expected: &str,
    mut translate: impl FnMut(&[u8], &[u8]) -> String,
) {
    let bytes = frame.as_bytes();
    let start = frame.find(scalar).expect("scalar in frame");
    for bytes_into_scalar in 1..scalar.len() {
        let split = start + bytes_into_scalar;
        let output = translate(&bytes[..split], &bytes[split..]);
        assert!(output.contains(expected), "split {split}: {output}");
        assert!(!output.contains('\u{fffd}'), "split {split}: {output}");
    }
}

#[test]
fn openai_stream_translation_preserves_split_utf8_text_and_tool_arguments() {
    let text = r#"data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"世"}}

"#;
    assert_split_scalar_is_preserved(text, "世", "世", |left, right| {
        let mut translator = crate::openai::OpenAIStreamTranslator::new(
            crate::openai::OpenAIStreamShape::ChatCompletion,
            "requested",
        );
        translator
            .push(left)
            .into_iter()
            .chain(translator.push(right))
            .collect()
    });

    let tool = r#"data: {"type":"content_block_delta","index":0,"delta":{"type":"input_json_delta","partial_json":"{\"city\":\"東京\"}"}}

"#;
    assert_split_scalar_is_preserved(tool, "東", "東京", |left, right| {
        let mut translator = crate::openai::OpenAIStreamTranslator::new(
            crate::openai::OpenAIStreamShape::ChatCompletion,
            "requested",
        );
        translator
            .push(left)
            .into_iter()
            .chain(translator.push(right))
            .collect()
    });
}

#[test]
fn anthropic_stream_translation_preserves_split_utf8_text_and_tool_arguments() {
    let text = r#"data: {"choices":[{"delta":{"content":"世"}}]}

"#;
    assert_split_scalar_is_preserved(text, "世", "世", |left, right| {
        let mut translator = crate::anthropic_stream::AnthropicStreamTranslator::new("requested");
        translator
            .push(left)
            .into_iter()
            .chain(translator.push(right))
            .collect()
    });

    let tool = r#"data: {"choices":[{"delta":{"tool_calls":[{"index":0,"id":"call_1","function":{"name":"lookup","arguments":"{\"city\":\"東京\"}"}}]}}]}

"#;
    assert_split_scalar_is_preserved(tool, "東", "東京", |left, right| {
        let mut translator = crate::anthropic_stream::AnthropicStreamTranslator::new("requested");
        translator
            .push(left)
            .into_iter()
            .chain(translator.push(right))
            .collect()
    });
}

#[test]
fn responses_chat_translation_preserves_split_utf8_text_and_tool_arguments() {
    let text = r#"data: {"type":"response.output_text.delta","delta":"世"}

"#;
    assert_split_scalar_is_preserved(text, "世", "世", |left, right| {
        let mut translator = crate::responses::ResponsesChatStreamTranslator::new("requested");
        translator
            .push(left)
            .into_iter()
            .chain(translator.push(right))
            .collect()
    });

    let tool = r#"data: {"type":"response.function_call_arguments.delta","output_index":0,"delta":"{\"city\":\"東京\"}"}

"#;
    assert_split_scalar_is_preserved(tool, "東", "東京", |left, right| {
        let mut translator = crate::responses::ResponsesChatStreamTranslator::new("requested");
        translator
            .push(left)
            .into_iter()
            .chain(translator.push(right))
            .collect()
    });
}

#[test]
fn responses_rewriter_preserves_split_utf8_text_and_tool_arguments() {
    let text = r#"data: {"type":"response.output_text.delta","delta":"世"}

"#;
    assert_split_scalar_is_preserved(text, "世", "世", |left, right| {
        let mut rewriter = crate::output_limit::ResponsesStreamRewriter::new("requested", None);
        rewriter.push(left) + &rewriter.push(right)
    });

    let tool = r#"data: {"type":"response.function_call_arguments.delta","output_index":0,"delta":"{\"city\":\"東京\"}"}

"#;
    assert_split_scalar_is_preserved(tool, "東", "東京", |left, right| {
        let mut rewriter = crate::output_limit::ResponsesStreamRewriter::new("requested", None);
        rewriter.push(left) + &rewriter.push(right)
    });
}
