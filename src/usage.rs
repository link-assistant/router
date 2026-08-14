//! Upstream usage extraction for per-token spend budgets.

use serde_json::Value;

use crate::token::TokenManager;

/// Extract input plus output tokens from one vendor JSON payload.
#[must_use]
pub fn token_count(value: &Value) -> Option<u64> {
    let (total, input, output) = token_parts(value)?;
    total.or_else(|| Some(input.unwrap_or(0).saturating_add(output.unwrap_or(0))))
}

fn token_parts(value: &Value) -> Option<(Option<u64>, Option<u64>, Option<u64>)> {
    if let Some(usage) = value.get("usage") {
        if let Some(total) = usage.get("total_tokens").and_then(Value::as_u64) {
            return Some((Some(total), None, None));
        }
        let input = first_u64(usage, &["input_tokens", "prompt_tokens"]);
        let output = first_u64(usage, &["output_tokens", "completion_tokens"]);
        if input.is_some() || output.is_some() {
            return Some((None, input, output));
        }
    }
    if let Some(usage) = value.get("usageMetadata") {
        if let Some(total) = usage.get("totalTokenCount").and_then(Value::as_u64) {
            return Some((Some(total), None, None));
        }
        let input = usage.get("promptTokenCount").and_then(Value::as_u64);
        let output = usage.get("candidatesTokenCount").and_then(Value::as_u64);
        if input.is_some() || output.is_some() {
            return Some((None, input, output));
        }
    }
    value
        .get("response")
        .or_else(|| value.get("message"))
        .and_then(token_parts)
}

fn first_u64(value: &Value, fields: &[&str]) -> Option<u64> {
    fields
        .iter()
        .find_map(|field| value.get(*field).and_then(Value::as_u64))
}

/// Incrementally collects usage from JSON or Server-Sent Events.
///
/// The accumulated count is persisted when the response stream completes or
/// the client disconnects and drops it.
pub struct UsageTracker {
    manager: TokenManager,
    token_id: String,
    json_body: Vec<u8>,
    buffer: Vec<u8>,
    total_tokens: u64,
    input_tokens: u64,
    output_tokens: u64,
    saw_sse: bool,
}

impl UsageTracker {
    #[must_use]
    pub fn new(manager: TokenManager, token_id: impl Into<String>) -> Self {
        Self {
            manager,
            token_id: token_id.into(),
            json_body: Vec::new(),
            buffer: Vec::new(),
            total_tokens: 0,
            input_tokens: 0,
            output_tokens: 0,
            saw_sse: false,
        }
    }

    /// Feed the next raw response chunk.
    pub fn feed(&mut self, bytes: &[u8]) {
        if !self.saw_sse {
            self.json_body.extend_from_slice(bytes);
        }
        self.buffer.extend_from_slice(bytes);
        while let Some(newline) = self.buffer.iter().position(|byte| *byte == b'\n') {
            let mut line: Vec<u8> = self.buffer.drain(..=newline).collect();
            while matches!(line.last(), Some(b'\n' | b'\r')) {
                line.pop();
            }
            let Some(data) = line.strip_prefix(b"data:") else {
                continue;
            };
            self.saw_sse = true;
            self.json_body.clear();
            self.add_json(data.strip_prefix(b" ").unwrap_or(data));
        }
    }

    fn add_json(&mut self, bytes: &[u8]) {
        if bytes == b"[DONE]" {
            return;
        }
        if let Ok(value) = serde_json::from_slice::<Value>(bytes) {
            if let Some((total, input, output)) = token_parts(&value) {
                self.total_tokens = self.total_tokens.max(total.unwrap_or(0));
                self.input_tokens = self.input_tokens.max(input.unwrap_or(0));
                self.output_tokens = self.output_tokens.max(output.unwrap_or(0));
            }
        }
    }
}

impl Drop for UsageTracker {
    fn drop(&mut self) {
        if !self.saw_sse {
            let body = std::mem::take(&mut self.json_body);
            self.add_json(&body);
        } else if !self.buffer.is_empty() {
            let remaining = std::mem::take(&mut self.buffer);
            let data = remaining
                .strip_prefix(b"data:")
                .and_then(|value| value.strip_prefix(b" "))
                .unwrap_or(&remaining);
            self.add_json(data);
        }
        let tokens = self
            .total_tokens
            .max(self.input_tokens.saturating_add(self.output_tokens));
        if tokens > 0
            && let Err(error) = self.manager.record_token_usage(&self.token_id, tokens)
        {
            tracing::warn!(token_id = %self.token_id, "failed to persist token usage: {error}");
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::token::IssueRequest;

    #[test]
    fn extracts_supported_vendor_usage_shapes() {
        assert_eq!(
            token_count(&serde_json::json!({"usage":{"input_tokens":3,"output_tokens":2}})),
            Some(5)
        );
        assert_eq!(
            token_count(
                &serde_json::json!({"usage":{"prompt_tokens":4,"completion_tokens":6,"total_tokens":10}})
            ),
            Some(10)
        );
        assert_eq!(
            token_count(
                &serde_json::json!({"usageMetadata":{"promptTokenCount":7,"candidatesTokenCount":8}})
            ),
            Some(15)
        );
        assert_eq!(
            token_count(&serde_json::json!({"usageMetadata":{"totalTokenCount":15}})),
            Some(15)
        );
        assert_eq!(
            token_count(
                &serde_json::json!({"type":"message_start","message":{"usage":{"input_tokens":3,"output_tokens":2}}})
            ),
            Some(5)
        );
        assert_eq!(token_count(&serde_json::json!({"usage": {}})), None);
        assert_eq!(token_count(&serde_json::json!({"usageMetadata": {}})), None);
    }

    #[test]
    fn streamed_usage_is_accumulated_and_persisted() {
        let manager = TokenManager::new("usage-secret");
        let token = manager
            .issue(&IssueRequest {
                ttl_hours: 1,
                label: "stream",
                max_tokens: Some(5),
                ..IssueRequest::default()
            })
            .unwrap();
        let id = manager.validate_token(&token).unwrap().sub;
        {
            let mut tracker = UsageTracker::new(manager.clone(), &id);
            tracker.feed(b"event: message_start\ndata: {\"message\":{\"usage\":{\"input_tokens\":3,\"output_tokens\":1}}}\n\n");
            tracker.feed(b"data: {\"usage\":{\"output_tokens\":2}}\n\n");
        }
        assert_eq!(manager.store().get(&id).unwrap().unwrap().used_tokens, 5);
        assert!(matches!(
            manager.enforce_request_budget(&id),
            Err(crate::token::TokenError::TokenLimitExceeded)
        ));
    }

    #[test]
    fn multiline_json_usage_is_persisted() {
        let manager = TokenManager::new("usage-secret");
        let token = manager.issue_token(1, "json").unwrap();
        let id = manager.validate_token(&token).unwrap().sub;
        {
            let mut tracker = UsageTracker::new(manager.clone(), &id);
            tracker.feed(b"{\n  \"usage\": {\"input_tokens\": 3,\n");
            tracker.feed(b"  \"output_tokens\": 2}\n}\n");
        }
        assert_eq!(manager.store().get(&id).unwrap().unwrap().used_tokens, 5);
    }

    #[test]
    fn unterminated_final_sse_frame_is_persisted() {
        let manager = TokenManager::new("usage-secret");
        let token = manager.issue_token(1, "sse").unwrap();
        let id = manager.validate_token(&token).unwrap().sub;
        {
            let mut tracker = UsageTracker::new(manager.clone(), &id);
            tracker.feed(
                b"data: {\"usage\":{\"input_tokens\":3}}\n\ndata: {\"usage\":{\"output_tokens\":2}}",
            );
        }
        assert_eq!(manager.store().get(&id).unwrap().unwrap().used_tokens, 5);
    }
}
