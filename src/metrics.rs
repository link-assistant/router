//! Live metrics and operational endpoints.
//!
//! Issue #7 R11 requires the router to expose Prometheus-compatible
//! `/metrics`, plus `/v1/usage` and `/v1/accounts` for fleet ops.
//!
//! This module provides:
//!
//! - [`Metrics`] — atomic counters that handlers update (request totals,
//!   errors, bytes streamed, per-status codes, OpenAI-translation counts).
//! - [`render_prometheus`] — formats those counters in the Prometheus
//!   text-exposition format consumed by `/metrics`.
//! - [`UsageSnapshot`] / [`usage_snapshot`] — aggregate counts and per-
//!   account usage, served as JSON by `/v1/usage`.
//! - [`MetricsRecorder`] — a tiny Tower-style helper that handlers can
//!   call from `proxy_handler` and the `OpenAI` translators.
//!
//! The implementation is intentionally lock-free (atomics + a single Mutex
//! for the per-status / per-account maps) so it stays cheap on the hot path.

use std::collections::HashMap;
use std::fmt::Write as _;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Mutex;

use serde::Serialize;

/// Live counters updated by request handlers.
#[derive(Debug, Default)]
pub struct Metrics {
    pub requests_total: AtomicU64,
    pub errors_total: AtomicU64,
    pub bytes_in: AtomicU64,
    pub bytes_out: AtomicU64,
    pub openai_chat_completions: AtomicU64,
    pub openai_responses: AtomicU64,
    pub anthropic_messages: AtomicU64,
    pub tokens_issued: AtomicU64,
    pub tokens_revoked: AtomicU64,
    pub status_counts: Mutex<HashMap<u16, u64>>,
    pub account_calls: Mutex<HashMap<String, u64>>,
}

impl Metrics {
    pub fn record_request(&self, surface: Surface, status: u16, account: Option<&str>) {
        self.requests_total.fetch_add(1, Ordering::Relaxed);
        if status >= 400 {
            self.errors_total.fetch_add(1, Ordering::Relaxed);
        }
        match surface {
            Surface::Anthropic => {
                self.anthropic_messages.fetch_add(1, Ordering::Relaxed);
            }
            Surface::OpenAIChat => {
                self.openai_chat_completions.fetch_add(1, Ordering::Relaxed);
            }
            Surface::OpenAIResponses => {
                self.openai_responses.fetch_add(1, Ordering::Relaxed);
            }
        }
        if let Ok(mut g) = self.status_counts.lock() {
            *g.entry(status).or_insert(0) += 1;
        }
        if let Some(acct) = account {
            if let Ok(mut g) = self.account_calls.lock() {
                *g.entry(acct.to_string()).or_insert(0) += 1;
            }
        }
    }

    pub fn record_bytes(&self, sent: u64, received: u64) {
        self.bytes_out.fetch_add(sent, Ordering::Relaxed);
        self.bytes_in.fetch_add(received, Ordering::Relaxed);
    }

    pub fn record_token_issued(&self) {
        self.tokens_issued.fetch_add(1, Ordering::Relaxed);
    }

    pub fn record_token_revoked(&self) {
        self.tokens_revoked.fetch_add(1, Ordering::Relaxed);
    }
}

/// Which API surface generated the request.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Surface {
    Anthropic,
    OpenAIChat,
    OpenAIResponses,
}

/// JSON-serialisable snapshot of [`Metrics`] for the `/v1/usage` endpoint.
#[derive(Debug, Serialize)]
pub struct UsageSnapshot {
    pub requests_total: u64,
    pub errors_total: u64,
    pub bytes_in: u64,
    pub bytes_out: u64,
    pub openai_chat_completions: u64,
    pub openai_responses: u64,
    pub anthropic_messages: u64,
    pub tokens_issued: u64,
    pub tokens_revoked: u64,
    pub status_counts: HashMap<u16, u64>,
    pub account_calls: HashMap<String, u64>,
}

#[must_use]
pub fn usage_snapshot(m: &Metrics) -> UsageSnapshot {
    UsageSnapshot {
        requests_total: m.requests_total.load(Ordering::Relaxed),
        errors_total: m.errors_total.load(Ordering::Relaxed),
        bytes_in: m.bytes_in.load(Ordering::Relaxed),
        bytes_out: m.bytes_out.load(Ordering::Relaxed),
        openai_chat_completions: m.openai_chat_completions.load(Ordering::Relaxed),
        openai_responses: m.openai_responses.load(Ordering::Relaxed),
        anthropic_messages: m.anthropic_messages.load(Ordering::Relaxed),
        tokens_issued: m.tokens_issued.load(Ordering::Relaxed),
        tokens_revoked: m.tokens_revoked.load(Ordering::Relaxed),
        status_counts: m
            .status_counts
            .lock()
            .map(|g| g.clone())
            .unwrap_or_default(),
        account_calls: m
            .account_calls
            .lock()
            .map(|g| g.clone())
            .unwrap_or_default(),
    }
}

/// Render the current metrics in Prometheus text-exposition format.
#[must_use]
pub fn render_prometheus(m: &Metrics) -> String {
    let snap = usage_snapshot(m);
    let mut out = String::new();
    let pairs: [(&str, u64); 9] = [
        ("link_assistant_requests_total", snap.requests_total),
        ("link_assistant_errors_total", snap.errors_total),
        ("link_assistant_bytes_in_total", snap.bytes_in),
        ("link_assistant_bytes_out_total", snap.bytes_out),
        (
            "link_assistant_openai_chat_completions_total",
            snap.openai_chat_completions,
        ),
        (
            "link_assistant_openai_responses_total",
            snap.openai_responses,
        ),
        (
            "link_assistant_anthropic_messages_total",
            snap.anthropic_messages,
        ),
        ("link_assistant_tokens_issued_total", snap.tokens_issued),
        ("link_assistant_tokens_revoked_total", snap.tokens_revoked),
    ];
    for (name, value) in pairs {
        out.push_str("# TYPE ");
        out.push_str(name);
        out.push_str(" counter\n");
        out.push_str(name);
        out.push(' ');
        out.push_str(&value.to_string());
        out.push('\n');
    }
    out.push_str("# TYPE link_assistant_status_total counter\n");
    let mut sorted_status: Vec<_> = snap.status_counts.iter().collect();
    sorted_status.sort_by_key(|(k, _)| *k);
    for (status, count) in sorted_status {
        let _ = writeln!(
            out,
            "link_assistant_status_total{{code=\"{status}\"}} {count}"
        );
    }
    out.push_str("# TYPE link_assistant_account_calls_total counter\n");
    let mut sorted_accounts: Vec<_> = snap.account_calls.iter().collect();
    sorted_accounts.sort_by(|a, b| a.0.cmp(b.0));
    for (acct, count) in sorted_accounts {
        let _ = writeln!(
            out,
            "link_assistant_account_calls_total{{account=\"{acct}\"}} {count}"
        );
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn record_and_render_basic_counters() {
        let m = Metrics::default();
        m.record_request(Surface::Anthropic, 200, Some("primary"));
        m.record_request(Surface::OpenAIChat, 200, Some("primary"));
        m.record_request(Surface::OpenAIChat, 500, Some("account-1"));
        m.record_token_issued();
        m.record_bytes(100, 50);

        let out = render_prometheus(&m);
        assert!(out.contains("link_assistant_requests_total 3"));
        assert!(out.contains("link_assistant_errors_total 1"));
        assert!(out.contains("link_assistant_anthropic_messages_total 1"));
        assert!(out.contains("link_assistant_openai_chat_completions_total 2"));
        assert!(out.contains("link_assistant_tokens_issued_total 1"));
        assert!(out.contains("code=\"200\""));
        assert!(out.contains("code=\"500\""));
        assert!(out.contains("account=\"primary\""));
    }

    #[test]
    fn usage_snapshot_returns_consistent_values() {
        let m = Metrics::default();
        m.record_request(Surface::OpenAIResponses, 200, None);
        let snap = usage_snapshot(&m);
        assert_eq!(snap.requests_total, 1);
        assert_eq!(snap.openai_responses, 1);
        assert_eq!(snap.errors_total, 0);
    }
}
