//! Incremental Code Assist SSE decoding and downstream protocol projection.

use std::io;

use bytes::Bytes;
use serde_json::{Value, json};

/// Incrementally split an SSE byte stream into JSON data events.
///
/// Network chunks need not align with lines or events. The official Gemini
/// CLI accepts one or more `data:` lines terminated by a blank line; comments,
/// ids, and other SSE fields are ignored.
#[derive(Default)]
struct SseJsonDecoder {
    buffered: Vec<u8>,
}

impl SseJsonDecoder {
    fn push(&mut self, bytes: &[u8]) -> io::Result<Vec<Value>> {
        self.buffered.extend_from_slice(bytes);
        let mut values = Vec::new();
        while let Some((event_end, delimiter_len)) = event_boundary(&self.buffered) {
            let event = self.buffered.drain(..event_end).collect::<Vec<_>>();
            self.buffered.drain(..delimiter_len);
            if let Some(value) = parse_event(&event)? {
                values.push(value);
            }
        }
        Ok(values)
    }
}

fn event_boundary(bytes: &[u8]) -> Option<(usize, usize)> {
    let lf = bytes.windows(2).position(|window| window == b"\n\n");
    let crlf = bytes.windows(4).position(|window| window == b"\r\n\r\n");
    match crlf {
        Some(crlf) if lf.is_none_or(|lf| crlf <= lf) => Some((crlf, 4)),
        _ => lf.map(|lf| (lf, 2)),
    }
}

fn parse_event(event: &[u8]) -> io::Result<Option<Value>> {
    let mut data = Vec::new();
    for line in event.split(|byte| *byte == b'\n') {
        let line = line.strip_suffix(b"\r").unwrap_or(line);
        let Some(value) = line.strip_prefix(b"data:") else {
            continue;
        };
        if !data.is_empty() {
            data.push(b'\n');
        }
        data.extend_from_slice(value.strip_prefix(b" ").unwrap_or(value));
    }
    if data.is_empty() || data == b"[DONE]" {
        return Ok(None);
    }
    serde_json::from_slice(&data).map(Some).map_err(|_| {
        io::Error::new(
            io::ErrorKind::InvalidData,
            "malformed Gemini SSE JSON event",
        )
    })
}

/// Remove the Code Assist response envelope while preserving each native
/// Gemini event and its order.
#[derive(Default)]
pub(super) struct NativeStreamTranslator {
    decoder: SseJsonDecoder,
}

impl NativeStreamTranslator {
    pub(super) fn push(&mut self, bytes: &[u8]) -> io::Result<Bytes> {
        let mut output = String::new();
        for event in self.decoder.push(bytes)? {
            let native = event.get("response").unwrap_or(&event);
            output.push_str("data: ");
            output.push_str(&native.to_string());
            output.push_str("\n\n");
        }
        Ok(Bytes::from(output))
    }
}

/// Translate incremental Gemini candidates into `OpenAI` Chat Completion chunks.
pub(super) struct OpenAiStreamTranslator {
    decoder: SseJsonDecoder,
    id: String,
    created: i64,
    model: String,
    role_emitted: bool,
    done: bool,
    saw_tool_call: bool,
    next_tool_index: usize,
}

impl OpenAiStreamTranslator {
    pub(super) fn new(model: impl Into<String>) -> Self {
        Self {
            decoder: SseJsonDecoder::default(),
            id: format!("chatcmpl-{}", uuid::Uuid::new_v4()),
            created: chrono::Utc::now().timestamp(),
            model: model.into(),
            role_emitted: false,
            done: false,
            saw_tool_call: false,
            next_tool_index: 0,
        }
    }

    pub(super) fn push(&mut self, bytes: &[u8]) -> io::Result<Bytes> {
        let mut output = String::new();
        for event in self.decoder.push(bytes)? {
            self.translate_event(&event, &mut output);
        }
        Ok(Bytes::from(output))
    }

    fn translate_event(&mut self, event: &Value, output: &mut String) {
        if self.done {
            return;
        }
        if let Some(error) = event.get("error") {
            push_sse(output, &openai_stream_error(error));
            self.done = true;
            return;
        }
        let response = event.get("response").unwrap_or(event);
        if let Some(error) = response.get("error") {
            push_sse(output, &openai_stream_error(error));
            self.done = true;
            return;
        }

        let candidates = response
            .get("candidates")
            .and_then(Value::as_array)
            .map(Vec::as_slice)
            .unwrap_or_default();
        if !candidates.is_empty() && !self.role_emitted {
            self.push_chunk(output, 0, &json!({"role": "assistant"}), &Value::Null, None);
            self.role_emitted = true;
        }

        let mut finished = false;
        for (candidate_offset, candidate) in candidates.iter().enumerate() {
            let index = candidate
                .get("index")
                .and_then(Value::as_u64)
                .and_then(|index| usize::try_from(index).ok())
                .unwrap_or(candidate_offset);
            if let Some(parts) = candidate
                .pointer("/content/parts")
                .and_then(Value::as_array)
            {
                for part in parts {
                    if let Some(text) = part.get("text").and_then(Value::as_str)
                        && !text.is_empty()
                    {
                        self.push_chunk(
                            output,
                            index,
                            &json!({"content": text}),
                            &Value::Null,
                            None,
                        );
                    }
                    if let Some(call) = part.get("functionCall") {
                        self.saw_tool_call = true;
                        let name = call.get("name").and_then(Value::as_str).unwrap_or("");
                        let arguments = call
                            .get("args")
                            .cloned()
                            .unwrap_or_else(|| json!({}))
                            .to_string();
                        let call_id = call.get("id").and_then(Value::as_str).map_or_else(
                            || format!("call_{}", uuid::Uuid::new_v4()),
                            str::to_string,
                        );
                        let tool_index = self.next_tool_index;
                        self.next_tool_index = self.next_tool_index.saturating_add(1);
                        self.push_chunk(
                            output,
                            index,
                            &json!({
                                "tool_calls": [{
                                    "index": tool_index,
                                    "id": call_id,
                                    "type": "function",
                                    "function": {"name": name, "arguments": arguments}
                                }]
                            }),
                            &Value::Null,
                            None,
                        );
                    }
                }
            }
            if let Some(reason) = candidate.get("finishReason").and_then(Value::as_str) {
                let reason = if reason == "STOP" && self.saw_tool_call {
                    "tool_calls"
                } else {
                    super::map_finish_reason(reason)
                };
                self.push_chunk(
                    output,
                    index,
                    &json!({}),
                    &Value::String(reason.to_string()),
                    None,
                );
                finished = true;
            }
        }

        if let Some(usage) = openai_usage(response) {
            self.push_chunk(output, 0, &json!({}), &Value::Null, Some(usage));
        }
        if finished {
            output.push_str("data: [DONE]\n\n");
            self.done = true;
        }
    }

    fn push_chunk(
        &self,
        output: &mut String,
        index: usize,
        delta: &Value,
        finish_reason: &Value,
        usage: Option<Value>,
    ) {
        let mut chunk = json!({
            "id": self.id,
            "object": "chat.completion.chunk",
            "created": self.created,
            "model": self.model,
            "choices": [{
                "index": index,
                "delta": delta,
                "finish_reason": finish_reason
            }]
        });
        if let Some(usage) = usage {
            chunk["usage"] = usage;
        }
        push_sse(output, &chunk);
    }
}

fn openai_usage(response: &Value) -> Option<Value> {
    let usage = response.get("usageMetadata")?;
    let prompt = usage
        .get("promptTokenCount")
        .and_then(Value::as_u64)
        .unwrap_or(0);
    let completion = usage
        .get("candidatesTokenCount")
        .and_then(Value::as_u64)
        .unwrap_or(0);
    let total = usage
        .get("totalTokenCount")
        .and_then(Value::as_u64)
        .unwrap_or_else(|| prompt.saturating_add(completion));
    Some(json!({
        "prompt_tokens": prompt,
        "completion_tokens": completion,
        "total_tokens": total
    }))
}

fn push_sse(output: &mut String, value: &Value) {
    output.push_str("data: ");
    output.push_str(&value.to_string());
    output.push_str("\n\n");
}

fn openai_stream_error(error: &Value) -> Value {
    let status = error.get("code").and_then(Value::as_u64);
    let (kind, code) = match status {
        Some(429) => ("rate_limit_error", "rate_limit_exceeded"),
        Some(400) => ("invalid_request_error", "invalid_request_error"),
        _ => ("api_error", "upstream_error"),
    };
    json!({"error": {
        "message": error.get("message").and_then(Value::as_str)
            .unwrap_or("upstream request failed"),
        "type": kind,
        "param": null,
        "code": code
    }})
}

/// Translate Gemini SSE events into the native `OpenAI` Responses event dialect.
pub(super) struct ResponsesStreamTranslator {
    decoder: SseJsonDecoder,
    id: String,
    created: i64,
    model: String,
    started: bool,
    done: bool,
    text: String,
    text_index: Option<usize>,
    output: Vec<(usize, Value)>,
    next_index: usize,
    usage: Value,
}

impl ResponsesStreamTranslator {
    pub(super) fn new(model: impl Into<String>) -> Self {
        Self {
            decoder: SseJsonDecoder::default(),
            id: format!("resp_{}", uuid::Uuid::new_v4()),
            created: chrono::Utc::now().timestamp(),
            model: model.into(),
            started: false,
            done: false,
            text: String::new(),
            text_index: None,
            output: Vec::new(),
            next_index: 0,
            usage: json!({"input_tokens": 0, "output_tokens": 0, "total_tokens": 0}),
        }
    }

    pub(super) fn push(&mut self, bytes: &[u8]) -> io::Result<Bytes> {
        let mut output = String::new();
        for event in self.decoder.push(bytes)? {
            self.translate_event(&event, &mut output);
        }
        Ok(Bytes::from(output))
    }

    fn translate_event(&mut self, event: &Value, output: &mut String) {
        if self.done {
            return;
        }
        let response = event.get("response").unwrap_or(event);
        if let Some(error) = event.get("error").or_else(|| response.get("error")) {
            push_sse(output, &responses_error(error));
            self.done = true;
            return;
        }
        self.start(output);
        if let Some(usage) = openai_usage(response) {
            self.usage = json!({
                "input_tokens": usage["prompt_tokens"],
                "output_tokens": usage["completion_tokens"],
                "total_tokens": usage["total_tokens"],
            });
        }
        let mut finish = None;
        for candidate in response
            .get("candidates")
            .and_then(Value::as_array)
            .map_or(&[][..], Vec::as_slice)
        {
            for part in candidate
                .pointer("/content/parts")
                .and_then(Value::as_array)
                .map_or(&[][..], Vec::as_slice)
            {
                if let Some(text) = part.get("text").and_then(Value::as_str)
                    && !text.is_empty()
                {
                    self.push_text(output, text);
                }
                if let Some(call) = part.get("functionCall") {
                    self.push_call(output, call);
                }
            }
            if let Some(reason) = candidate.get("finishReason").and_then(Value::as_str) {
                finish = Some(super::responses::Finish::from_gemini(reason));
            }
        }
        if let Some(finish) = finish {
            self.finish(output, finish);
        }
    }

    fn start(&mut self, output: &mut String) {
        if self.started {
            return;
        }
        self.started = true;
        for kind in ["response.created", "response.in_progress"] {
            push_sse(
                output,
                &json!({"type": kind, "response": self.response("in_progress", false)}),
            );
        }
    }

    fn push_text(&mut self, output: &mut String, delta: &str) {
        let index = if let Some(index) = self.text_index {
            index
        } else {
            let index = self.next_index;
            self.next_index += 1;
            self.text_index = Some(index);
            let item = self.text_item("in_progress", "");
            push_sse(
                output,
                &json!({"type": "response.output_item.added", "output_index": index, "item": item}),
            );
            push_sse(
                output,
                &json!({
                    "type": "response.content_part.added",
                    "item_id": self.text_id(),
                    "output_index": index,
                    "content_index": 0,
                    "part": {"type": "output_text", "text": "", "annotations": []}
                }),
            );
            index
        };
        self.text.push_str(delta);
        push_sse(
            output,
            &json!({
                "type": "response.output_text.delta",
                "item_id": self.text_id(),
                "output_index": index,
                "content_index": 0,
                "delta": delta
            }),
        );
    }

    fn push_call(&mut self, output: &mut String, call: &Value) {
        let index = self.next_index;
        self.next_index += 1;
        let call_id = call
            .get("id")
            .and_then(Value::as_str)
            .filter(|id| !id.is_empty())
            .map_or_else(|| format!("call_{}", uuid::Uuid::new_v4()), str::to_string);
        let name = call.get("name").and_then(Value::as_str).unwrap_or_default();
        let arguments = call
            .get("args")
            .cloned()
            .unwrap_or_else(|| json!({}))
            .to_string();
        let mut item = json!({
            "id": format!("fc_{call_id}"),
            "type": "function_call",
            "status": "in_progress",
            "call_id": call_id,
            "name": name,
            "arguments": ""
        });
        push_sse(
            output,
            &json!({"type": "response.output_item.added", "output_index": index, "item": item}),
        );
        push_sse(
            output,
            &json!({
                "type": "response.function_call_arguments.delta",
                "item_id": item["id"],
                "output_index": index,
                "delta": arguments
            }),
        );
        push_sse(
            output,
            &json!({
                "type": "response.function_call_arguments.done",
                "item_id": item["id"],
                "output_index": index,
                "arguments": arguments
            }),
        );
        item["status"] = json!("completed");
        item["arguments"] = Value::String(arguments);
        push_sse(
            output,
            &json!({"type": "response.output_item.done", "output_index": index, "item": item}),
        );
        self.output.push((index, item));
    }

    fn finish(&mut self, output: &mut String, finish: super::responses::Finish) {
        if let Some(index) = self.text_index {
            push_sse(
                output,
                &json!({
                    "type": "response.output_text.done",
                    "item_id": self.text_id(),
                    "output_index": index,
                    "content_index": 0,
                    "text": self.text
                }),
            );
            push_sse(
                output,
                &json!({
                    "type": "response.content_part.done",
                    "item_id": self.text_id(),
                    "output_index": index,
                    "content_index": 0,
                    "part": {"type": "output_text", "text": self.text, "annotations": []}
                }),
            );
            let item = self.text_item(finish.status(), &self.text);
            push_sse(
                output,
                &json!({"type": "response.output_item.done", "output_index": index, "item": item}),
            );
            self.output.push((index, item));
        }
        self.output.sort_by_key(|(index, _)| *index);
        let mut response = self.response(finish.status(), true);
        finish.apply(&mut response);
        push_sse(
            output,
            &json!({"type": finish.event(), "response": response}),
        );
        output.push_str("data: [DONE]\n\n");
        self.done = true;
    }

    fn text_id(&self) -> String {
        format!("msg_{}", self.id.trim_start_matches("resp_"))
    }

    fn text_item(&self, status: &str, text: &str) -> Value {
        json!({
            "id": self.text_id(),
            "type": "message",
            "status": status,
            "role": "assistant",
            "content": [{"type": "output_text", "text": text, "annotations": []}]
        })
    }

    fn response(&self, status: &str, include_output: bool) -> Value {
        json!({
            "id": self.id,
            "object": "response",
            "created_at": self.created,
            "status": status,
            "model": self.model,
            "output": if include_output {
                self.output.iter().map(|(_, item)| item.clone()).collect::<Vec<_>>()
            } else {
                Vec::new()
            },
            "usage": self.usage
        })
    }
}

fn responses_error(error: &Value) -> Value {
    let code = match error.get("code").and_then(Value::as_u64) {
        Some(429) => "rate_limit_exceeded",
        Some(400) => "invalid_request_error",
        _ => error
            .get("code")
            .and_then(Value::as_str)
            .unwrap_or("upstream_error"),
    };
    json!({
        "type": "error",
        "code": code,
        "message": error.get("message").and_then(Value::as_str)
            .unwrap_or("upstream request failed"),
        "param": null
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn split_events_preserve_text_tools_finish_usage_and_model() {
        let mut translator = OpenAiStreamTranslator::new("requested-model");
        let first = translator
            .push(b"data: {\"response\":{\"candidates\":[{\"content\":{\"parts\":[{\"text\":\"hel")
            .unwrap();
        assert!(first.is_empty());
        let rest = translator
            .push(b"lo\"}]}}]}}\n\ndata: {\"response\":{\"candidates\":[{\"content\":{\"parts\":[{\"functionCall\":{\"id\":\"call-live\",\"name\":\"lookup\",\"args\":{\"q\":\"x\"}}}]},\"finishReason\":\"STOP\"}],\"usageMetadata\":{\"promptTokenCount\":2,\"candidatesTokenCount\":3,\"totalTokenCount\":5}}}\n\n")
            .unwrap();
        let output = String::from_utf8(rest.to_vec()).unwrap();
        assert!(output.contains("requested-model"), "{output}");
        assert!(output.contains("hello"), "{output}");
        assert!(output.contains("call-live"), "{output}");
        assert!(output.contains("lookup"), "{output}");
        assert!(output.contains("tool_calls"), "{output}");
        assert!(output.contains(r#""total_tokens":5"#), "{output}");
        assert!(output.ends_with("data: [DONE]\n\n"), "{output}");
    }

    #[test]
    fn native_projection_unwraps_each_event_without_waiting_for_the_next() {
        let mut translator = NativeStreamTranslator::default();
        let first = translator
            .push(b"data: {\"response\":{\"candidates\":[{\"content\":{\"parts\":[{\"text\":\"one\"}]}}]}}\n\n")
            .unwrap();
        let first = String::from_utf8(first.to_vec()).unwrap();
        assert!(first.contains("one"), "{first}");
        assert!(!first.contains("response"), "{first}");
    }

    #[test]
    fn upstream_error_events_are_forwarded_without_private_payload_logging() {
        let mut translator = OpenAiStreamTranslator::new("model");
        let output = translator
            .push(b"data: {\"error\":{\"code\":429,\"message\":\"limited\"}}\n\n")
            .unwrap();
        let output = String::from_utf8(output.to_vec()).unwrap();
        assert!(output.contains("limited"), "{output}");
        assert!(output.contains("rate_limit_error"), "{output}");
        assert!(output.contains("rate_limit_exceeded"), "{output}");
        assert!(!output.contains("[DONE]"), "{output}");
    }

    fn events(output: &str) -> Vec<Value> {
        output
            .lines()
            .filter_map(|line| line.strip_prefix("data: "))
            .filter(|data| *data != "[DONE]")
            .map(|data| serde_json::from_str(data).unwrap())
            .collect()
    }

    #[test]
    fn responses_stream_preserves_text_tool_identity_finish_and_usage_across_splits() {
        let mut translator = ResponsesStreamTranslator::new("requested-model");
        assert!(
            translator
                .push(b"data: {\"response\":{\"candidates\":[{\"content\":{\"parts\":[{\"text\":\"hel")
                .unwrap()
                .is_empty()
        );
        let output = translator
            .push(b"lo\"},{\"functionCall\":{\"id\":\"call_7\",\"name\":\"lookup\",\"args\":{\"key\":\"v\"}}}]},\"finishReason\":\"STOP\"}],\"usageMetadata\":{\"promptTokenCount\":2,\"candidatesTokenCount\":3,\"totalTokenCount\":5}}}\n\n")
            .unwrap();
        let output = String::from_utf8(output.to_vec()).unwrap();
        let events = events(&output);
        assert!(events.iter().any(|event| {
            event["type"] == "response.output_text.delta" && event["delta"] == "hello"
        }));
        assert!(events.iter().any(|event| {
            event["type"] == "response.function_call_arguments.done"
                && event["arguments"] == "{\"key\":\"v\"}"
        }));
        let completed = events
            .iter()
            .find(|event| event["type"] == "response.completed")
            .unwrap();
        assert_eq!(completed["response"]["status"], "completed");
        assert_eq!(completed["response"]["model"], "requested-model");
        assert_eq!(completed["response"]["output"][1]["call_id"], "call_7");
        assert_eq!(completed["response"]["output"][1]["name"], "lookup");
        assert_eq!(completed["response"]["usage"]["total_tokens"], 5);
        assert!(output.ends_with("data: [DONE]\n\n"));
    }

    #[test]
    fn responses_stream_uses_incomplete_terminal_events_for_every_non_stop_reason() {
        for (reason, incomplete) in [
            ("MAX_TOKENS", "max_output_tokens"),
            ("SAFETY", "content_filter"),
            ("RECITATION", "content_filter"),
            ("MALFORMED_FUNCTION_CALL", "content_filter"),
        ] {
            let mut translator = ResponsesStreamTranslator::new("model");
            let payload = format!(
                "data: {{\"response\":{{\"candidates\":[{{\"content\":{{\"parts\":[{{\"text\":\"partial\"}}]}},\"finishReason\":\"{reason}\"}}]}}}}\n\n"
            );
            let output = translator.push(payload.as_bytes()).unwrap();
            let output = String::from_utf8(output.to_vec()).unwrap();
            let events = events(&output);
            let terminal = events
                .iter()
                .find(|event| event["type"] == "response.incomplete")
                .unwrap_or_else(|| panic!("missing incomplete event for {reason}: {output}"));
            assert_eq!(terminal["response"]["status"], "incomplete", "{reason}");
            assert_eq!(
                terminal["response"]["incomplete_details"]["reason"], incomplete,
                "{reason}"
            );
            assert!(!output.contains("response.completed"), "{reason}: {output}");
        }
    }

    #[test]
    fn responses_stream_errors_use_responses_error_events() {
        let mut translator = ResponsesStreamTranslator::new("model");
        let output = translator
            .push(b"data: {\"error\":{\"code\":429,\"message\":\"limited\"}}\n\n")
            .unwrap();
        let output = String::from_utf8(output.to_vec()).unwrap();
        let event = events(&output).pop().unwrap();
        assert_eq!(event["type"], "error");
        assert_eq!(event["code"], "rate_limit_exceeded");
        assert_eq!(event["message"], "limited");
        assert!(!output.contains("[DONE]"));
    }
}
