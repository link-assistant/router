//! Observe in-band vendor errors without changing or replaying stream bytes.

use axum::http::HeaderMap;
use serde_json::Value;

use crate::accounts::{AccountRouter, UpstreamObservation};

const MAX_EVENT_BYTES: usize = 64 * 1024;

pub struct StreamLimits {
    router: AccountRouter,
    account: String,
    model: Option<String>,
    line: Vec<u8>,
    oversized: bool,
    relayed: bool,
}

impl StreamLimits {
    pub(crate) fn new(router: AccountRouter, account: String, model: Option<String>) -> Self {
        // Response streams outlive task-local policy dispatch. Retain its opt-out.
        let scoped = crate::account_policy_scope::current();
        let relayed = scoped.as_ref().is_some_and(|scope| {
            *scope
                .last_action
                .lock()
                .unwrap_or_else(std::sync::PoisonError::into_inner)
                == Some(crate::account_routing_policy::ErrorAction::Relay)
        });
        Self {
            router,
            account,
            model: scoped.map(|scope| scope.upstream_model.clone()).or(model),
            line: Vec::new(),
            oversized: false,
            relayed,
        }
    }

    pub(crate) fn push(&mut self, bytes: &[u8]) {
        for byte in bytes {
            if *byte == b'\n' {
                if !self.oversized {
                    let line = std::mem::take(&mut self.line);
                    if let Some(data) = line.strip_prefix(b"data:")
                        && let Ok(value) = serde_json::from_slice::<Value>(data)
                    {
                        self.observe_event(&value);
                    }
                }
                self.line.clear();
                self.oversized = false;
            } else if !self.oversized {
                if self.line.len() == MAX_EVENT_BYTES {
                    self.line.clear();
                    self.oversized = true;
                } else {
                    self.line.push(*byte);
                }
            }
        }
    }

    /// Also used by WebSocket frames, whose error is already JSON.
    pub(crate) fn observe_event(&self, value: &Value) {
        if self.relayed {
            return;
        }
        let kind = value
            .get("type")
            .and_then(Value::as_str)
            .unwrap_or_default();
        if !matches!(kind, "error" | "response.failed") {
            return;
        }
        let error = value
            .get("error")
            .or_else(|| value.pointer("/response/error"));
        let Some(error) = error else {
            return;
        };
        let terminal = crate::account_limits::terminal_quota(error);
        let codes = [error.get("type"), error.get("code")]
            .into_iter()
            .flatten()
            .filter_map(Value::as_str)
            .collect::<Vec<_>>();
        let inferred = if codes.iter().any(|code| {
            matches!(
                *code,
                "authentication_error" | "invalid_api_key" | "token_expired"
            )
        }) {
            401
        } else if terminal
            || codes
                .iter()
                .any(|code| matches!(*code, "rate_limit_error" | "rate_limit_exceeded"))
        {
            429
        } else {
            0
        };
        let status = value
            .get("status")
            .and_then(Value::as_u64)
            .or_else(|| error.get("status").and_then(Value::as_u64))
            .and_then(|status| u16::try_from(status).ok())
            .unwrap_or(inferred);
        if !matches!(status, 401 | 403 | 429) {
            return;
        }
        let retry_after = error
            .get("resets_in_seconds")
            .and_then(Value::as_u64)
            .map(std::time::Duration::from_secs);
        self.router.observe_upstream(&UpstreamObservation {
            account: &self.account,
            model: self.model.as_deref(),
            status,
            headers: &HeaderMap::new(),
            body: &serde_json::json!({"error": error}).to_string().into_bytes(),
            retry_after,
        });
    }
}
