use std::collections::HashMap;

use serde_json::{Value, json};

const LINE_LIMIT: usize = 256 * 1024;
const QUEUE_LIMIT: usize = 64;
const MAX_TOKEN_BYTES: usize = 116;

#[derive(Default)]
pub(super) struct SseDeltas {
    pending: HashMap<String, String>,
    queue: Vec<(Vec<u8>, Option<Vec<u8>>)>,
    queue_bytes: usize,
    line: Vec<u8>,
    skip_line: bool,
}

impl SseDeltas {
    pub(super) fn feed(
        &mut self,
        bytes: &[u8],
        eof: bool,
        tokens: &HashMap<Vec<u8>, Vec<u8>>,
    ) -> Vec<u8> {
        let mut output = Vec::new();
        for next in bytes.split_inclusive(|&byte| byte == b'\n') {
            let complete = next.ends_with(b"\n");
            if self.skip_line || self.line.len() + next.len() > LINE_LIMIT {
                self.drain(&mut output, false);
                output.append(&mut self.line);
                output.extend_from_slice(next);
                self.skip_line = !complete;
            } else {
                self.line.extend_from_slice(next);
                if complete {
                    let original = std::mem::take(&mut self.line);
                    self.event_line(original, &mut output, tokens);
                }
            }
        }
        if eof {
            self.drain(&mut output, false);
            output.append(&mut self.line);
        }
        output
    }

    fn drain(&mut self, output: &mut Vec<u8>, changed: bool) {
        for (original, joined) in self.queue.drain(..) {
            output.extend(if changed {
                joined.unwrap_or(original)
            } else {
                original
            });
        }
        self.queue_bytes = 0;
        self.pending.clear();
    }

    fn event_line(
        &mut self,
        original: Vec<u8>,
        output: &mut Vec<u8>,
        tokens: &HashMap<Vec<u8>, Vec<u8>>,
    ) {
        let (terminal, joined) = self.parse_line(&original, tokens).unwrap_or((false, None));
        self.queue_bytes += original.len();
        self.queue.push((original, joined));
        if terminal
            || self.queue.len() >= QUEUE_LIMIT
            || self.pending.len() > QUEUE_LIMIT
            || self.queue_bytes > LINE_LIMIT
        {
            self.drain(output, false);
        } else if self.pending.is_empty() {
            self.drain(output, true);
        }
    }

    fn parse_line(
        &mut self,
        original: &[u8],
        tokens: &HashMap<Vec<u8>, Vec<u8>>,
    ) -> Option<(bool, Option<Vec<u8>>)> {
        let payload = std::str::from_utf8(original.strip_prefix(b"data:")?)
            .ok()?
            .trim();
        if payload == "[DONE]" {
            return Some((true, None));
        }
        let mut event: Value = serde_json::from_str(payload).ok()?;
        let terminal = matches!(
            event["type"].as_str(),
            Some(
                "response.completed"
                    | "response.done"
                    | "response.failed"
                    | "response.incomplete"
                    | "message_stop"
            )
        );
        let mut changed = false;
        visit_deltas(&mut event, |field, key, lane| {
            let Some(value) = field.get(key).and_then(Value::as_str) else {
                return;
            };
            let Some(lane) = lane.as_array().filter(|parts| {
                parts.iter().all(|part| {
                    part.is_null()
                        || part.as_str().is_some_and(|text| text.len() <= 256)
                        || part.is_i64()
                })
            }) else {
                return;
            };
            let id = serde_json::to_string(lane).expect("serializable SSE output lane");
            let mut text = self.pending.remove(&id).unwrap_or_default();
            text.push_str(value);
            if let Some(start) = prefix_start(&text, tokens) {
                self.pending.insert(id, text.split_off(start));
            }
            if text != value {
                field[key] = Value::String(text);
                changed = true;
            }
        });
        let joined = if changed {
            let newline = if original.ends_with(b"\r\n") {
                "\r\n"
            } else {
                "\n"
            };
            Some(format!("data: {event}{newline}").into_bytes())
        } else {
            None
        };
        Some((terminal, joined))
    }
}

fn prefix_start(text: &str, tokens: &HashMap<Vec<u8>, Vec<u8>>) -> Option<usize> {
    let text = text.as_bytes();
    let start = text.len().saturating_sub(MAX_TOKEN_BYTES - 1);
    (start..text.len()).find(|&index| {
        let tail = &text[index..];
        tail[0] == b'['
            && tokens
                .keys()
                .any(|token| token.len() > tail.len() && token.starts_with(tail))
    })
}

fn visit_deltas(event: &mut Value, mut visit: impl FnMut(&mut Value, &str, Value)) {
    match event["type"].as_str() {
        Some("response.output_text.delta" | "response.text.delta") => {
            let lane = json!([
                "response",
                event["response_id"],
                event["item_id"],
                event["output_index"],
                event["content_index"]
            ]);
            visit(event, "delta", lane);
            return;
        }
        Some("content_block_delta") => {
            let lane = json!(["anthropic", event["index"]]);
            if event["delta"]["type"] == "text_delta" {
                visit(&mut event["delta"], "text", lane);
            }
            return;
        }
        _ => {}
    }
    let id = event["id"].clone();
    if let Some(choices) = event.get_mut("choices").and_then(Value::as_array_mut) {
        for (index, choice) in choices.iter_mut().enumerate() {
            let index = choice.get("index").cloned().unwrap_or_else(|| json!(index));
            if let Some(delta) = choice.get_mut("delta") {
                visit(delta, "content", json!(["choices", id, index]));
            }
        }
    }
    if let Some(candidates) = event.get_mut("candidates").and_then(Value::as_array_mut) {
        for (index, candidate) in candidates.iter_mut().enumerate() {
            let index = candidate
                .get("index")
                .cloned()
                .unwrap_or_else(|| json!(index));
            if let Some(parts) = candidate
                .pointer_mut("/content/parts")
                .and_then(Value::as_array_mut)
            {
                for (part_index, part) in parts.iter_mut().enumerate() {
                    visit(part, "text", json!(["candidates", index, part_index]));
                }
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const TOKEN: &str = "[[Router_00000000000000000000000000000000_Company_1]]";

    #[test]
    fn joins_chat_anthropic_and_gemini_text_in_independent_lanes() {
        let tokens = HashMap::from([(TOKEN.as_bytes().to_vec(), b"private".to_vec())]);
        let mut state = SseDeltas::default();
        let (first, last) = TOKEN.split_at(19);
        let chat =
            |text: &str| json!({"id":"chat","choices":[{"index":0,"delta":{"content":text}}]});
        let anthropic = |text: &str| json!({"type":"content_block_delta","index":1,"delta":{"type":"text_delta","text":text}});
        let gemini = |text: &str| json!({"candidates":[{"content":{"parts":[{"text":text}]}}]});
        let frame = |event: Value| format!("data: {event}\r\n\r\n");
        let input = [
            chat(first),
            anthropic(first),
            gemini(first),
            gemini(last),
            anthropic(last),
            chat(last),
        ]
        .map(frame)
        .concat();
        let output = state.feed(input.as_bytes(), false, &tokens);
        let output: Vec<Value> = std::str::from_utf8(&output)
            .unwrap()
            .lines()
            .filter_map(|line| serde_json::from_str(line.strip_prefix("data: ")?).ok())
            .collect();
        assert_eq!(
            output,
            [
                chat(""),
                anthropic(""),
                gemini(""),
                gemini(TOKEN),
                anthropic(TOKEN),
                chat(TOKEN)
            ]
        );
    }

    #[test]
    fn preserves_bytes_when_delta_or_buffer_is_unsupported() {
        let tokens = HashMap::from([(TOKEN.as_bytes().to_vec(), b"private".to_vec())]);
        let mut state = SseDeltas::default();
        let pending = format!(
            "data: {}\n",
            json!({"type":"response.text.delta","delta":"[["})
        );
        assert_eq!(state.feed(pending.as_bytes(), false, &tokens).len(), 0);
        let long = vec![b'x'; LINE_LIMIT + 1];
        let mut expected = pending.into_bytes();
        expected.extend_from_slice(&long);
        assert_eq!(state.feed(&long, false, &tokens), expected);
        assert_eq!(
            state
                .feed(b"still in line\n[unframed]", true, &tokens)
                .as_slice(),
            b"still in line\n[unframed]"
        );
        let unknown =
            b"data: {\"type\":\"content_block_delta\",\"delta\":{\"type\":\"input_json_delta\"}}\n";
        assert_eq!(state.feed(unknown, false, &tokens).as_slice(), unknown);
        let malformed = b"data: not-valid-json\n";
        assert_eq!(state.feed(malformed, false, &tokens).as_slice(), malformed);
    }
}
