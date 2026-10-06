//! z.ai inference refusals that are not rate limits (issue #657).
//!
//! z.ai answers an exhausted Coding Plan with HTTP 429 and an Anthropic-shaped
//! `rate_limit_error`, so a client that honours the protocol retries forever:
//!
//! ```json
//! {"error":{"code":"1113","message":"[1113][Insufficient balance or no resource package. Please recharge.][<request id>]","type":"rate_limit_error"},"type":"error"}
//! ```
//!
//! The business code says what the status does not. Codes for an empty
//! balance, an expired or missing package, or a model the plan does not
//! include are rewritten into a non-retryable `402` naming the reason, the code
//! and the upstream request id, and the account is recorded as exhausted so
//! usage, health and catalog surfaces report it. Codes that are genuinely
//! temporary (`1302`, `1305`, `1308`, `1313`) are relayed unchanged.
//!
//! Codes from <https://docs.z.ai/api-reference/api-code>.

use std::fmt::Write as _;
use std::time::SystemTime;

use axum::http::{HeaderValue, StatusCode};
use axum::response::{IntoResponse, Response};
use serde_json::{Value, json};

/// Business codes meaning the account cannot serve until the operator acts or
/// a weekly/monthly period ends: no balance or resource package (1113), an
/// expired package (1309, 1314), an exhausted weekly or monthly limit (1310),
/// a plan that excludes the model or scenario (1311, 1315), and an
/// insufficient balance or spend limit (1316–1321). 1302, 1305, 1308 and 1313
/// are request-rate or short-window limits and stay retryable.
const EXHAUSTED_CODES: &[u32] = &[
    1113, 1309, 1310, 1311, 1314, 1315, 1316, 1317, 1318, 1319, 1320, 1321,
];

/// Upper bound on an error body Router reads to classify it. z.ai error bodies
/// are a few hundred bytes; anything larger is relayed without inspection.
pub(crate) const MAX_CLASSIFIED_BODY: usize = 16 * 1024;

/// One classified non-retryable z.ai refusal.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ZaiExhaustion {
    /// The z.ai business code, e.g. `1113`.
    pub code: u32,
    /// z.ai's own reason, without the code and request-id brackets.
    pub reason: String,
    /// The upstream request id, when z.ai supplied one.
    pub request_id: Option<String>,
    /// When Router observed it.
    pub observed_at: SystemTime,
}

impl ZaiExhaustion {
    /// The operator-facing sentence every surface uses.
    ///
    /// z.ai's reason usually ends with its own full stop; it is trimmed so the
    /// summary can be followed by another sentence without `..` (issue #664).
    #[must_use]
    pub fn summary(&self) -> String {
        format!(
            "z.ai Coding Plan cannot serve requests (code {}): {}",
            self.code,
            self.reason.trim_end().trim_end_matches(['.', '。'])
        )
    }

    /// Seconds since the Unix epoch at which it was observed.
    #[must_use]
    pub fn observed_unix(&self) -> u64 {
        self.observed_at
            .duration_since(SystemTime::UNIX_EPOCH)
            .map_or(0, |elapsed| elapsed.as_secs())
    }

    /// The fields surfaces publish, without anything secret.
    #[must_use]
    pub fn to_json(&self) -> Value {
        json!({
            "state": "exhausted",
            "code": self.code.to_string(),
            "reason": self.reason,
            "request_id": self.request_id,
            "observed_at_unix": self.observed_unix(),
            "summary": self.summary(),
        })
    }
}

/// The business code in a z.ai error body, as a string or a number, under
/// `error.code` (inference) or a top-level `code` (non-inference).
fn business_code(value: &Value) -> Option<u32> {
    let code = value.pointer("/error/code").or_else(|| value.get("code"))?;
    match code {
        Value::String(text) => text.trim().parse().ok(),
        Value::Number(number) => number.as_u64().and_then(|n| u32::try_from(n).ok()),
        _ => None,
    }
}

/// Split `[1113][reason][request id]` into its reason and request id.
fn bracketed(message: &str) -> (Option<String>, Option<String>) {
    let parts = message
        .split(']')
        .filter_map(|part| part.trim().strip_prefix('['))
        .map(str::to_string)
        .collect::<Vec<_>>();
    match parts.as_slice() {
        [_, reason, request_id, ..] => (Some(reason.clone()), Some(request_id.clone())),
        [_, reason] => (Some(reason.clone()), None),
        _ => (None, None),
    }
}

/// Classify a z.ai error body; `Some` only for a non-retryable account state.
#[must_use]
pub fn classify(body: &[u8]) -> Option<ZaiExhaustion> {
    let value = serde_json::from_slice::<Value>(body).ok()?;
    let code = business_code(&value)?;
    if !EXHAUSTED_CODES.contains(&code) {
        return None;
    }
    let message = value
        .pointer("/error/message")
        .or_else(|| value.get("msg"))
        .or_else(|| value.get("message"))
        .and_then(Value::as_str)
        .unwrap_or_default();
    let (reason, request_id) = bracketed(message);
    let reason = reason
        .filter(|reason| !reason.is_empty())
        .or_else(|| (!message.is_empty()).then(|| message.to_string()))
        .unwrap_or_else(|| "the account has no usable balance or resource package".into());
    let request_id = request_id
        .or_else(|| {
            value
                .get("request_id")
                .or_else(|| value.pointer("/error/request_id"))
                .and_then(Value::as_str)
                .map(str::to_string)
        })
        .filter(|id| !id.is_empty());
    Some(ZaiExhaustion {
        code,
        reason,
        request_id,
        observed_at: crate::operation_context::system_time(),
    })
}

/// The non-retryable client response for an exhausted account.
///
/// `402` is outside every client's retry set (Anthropic and `OpenAI` SDKs, Claude
/// Code and Codex retry 408, 409, 429 and 5xx), so the client stops and shows
/// the message. The Anthropic surface uses Anthropic's `billing_error`; the
/// `OpenAI` surfaces use `insufficient_quota`, the type their clients already
/// treat as terminal.
#[must_use]
pub fn client_response(surface: crate::metrics::Surface, exhaustion: &ZaiExhaustion) -> Response {
    let message = format!(
        "{}. Recharge the z.ai plan or choose another model (for example with /model).",
        exhaustion.summary()
    );
    let code = exhaustion.code.to_string();
    let body = match surface {
        crate::metrics::Surface::Anthropic => json!({
            "type": "error",
            "error": {
                "type": "billing_error",
                "message": message,
                "upstream_code": code,
                "upstream_request_id": exhaustion.request_id,
            },
            "request_id": exhaustion.request_id,
        }),
        crate::metrics::Surface::OpenAIChat | crate::metrics::Surface::OpenAIResponses => json!({
            "error": {
                "type": "insufficient_quota",
                "code": "insufficient_quota",
                "message": message,
                "param": null,
                "upstream_code": code,
                "upstream_request_id": exhaustion.request_id,
            }
        }),
    };
    let mut response = (StatusCode::PAYMENT_REQUIRED, axum::Json(body)).into_response();
    if let Ok(value) = HeaderValue::from_str(&code) {
        response
            .headers_mut()
            .insert("x-router-upstream-error-code", value);
    }
    response
}

/// Whether the provider answers with z.ai business codes: the Coding Plan, or
/// an OpenAI-compatible provider pointed at a z.ai or Zhipu endpoint.
pub(crate) fn speaks_zai_business_codes(provider: &crate::providers::ResolvedProvider) -> bool {
    provider.kind == crate::providers::ProviderKind::ZaiCodingPlan
        || reqwest::Url::parse(&provider.base_url)
            .ok()
            .and_then(|url| url.host_str().map(str::to_ascii_lowercase))
            .is_some_and(|host| {
                ["z.ai", "bigmodel.cn"]
                    .iter()
                    .any(|domain| host == *domain || host.ends_with(&format!(".{domain}")))
            })
}

/// Clear a recorded exhaustion when z.ai serves again, and say whether this
/// response is a z.ai 4xx that [`relay_refusal`] must classify.
pub(crate) fn is_refusal_to_classify(
    state: &crate::proxy::AppState,
    provider: &crate::providers::ResolvedProvider,
    status: StatusCode,
) -> bool {
    if !speaks_zai_business_codes(provider) {
        return false;
    }
    if status.is_success() {
        state.provider_store.clear_exhaustion(&provider.name);
    }
    status.is_client_error()
}

/// Relay a z.ai 4xx, rewriting an exhausted account into a non-retryable
/// error and recording it (issue #657). Any other refusal, including a genuine
/// rate limit, is relayed with its status, headers and body unchanged.
pub(crate) async fn relay_refusal(
    state: &crate::proxy::AppState,
    provider: &crate::providers::ResolvedProvider,
    surface: crate::metrics::Surface,
    upstream_resp: reqwest::Response,
    correlation_id: &str,
) -> Response {
    let status = StatusCode::from_u16(upstream_resp.status().as_u16())
        .unwrap_or(StatusCode::INTERNAL_SERVER_ERROR);
    let mut headers = crate::proxy::relay_response_headers(upstream_resp.headers());
    let content_type = upstream_resp
        .headers()
        .get("content-type")
        .cloned()
        .unwrap_or_else(|| HeaderValue::from_static("application/json"));
    // The upstream status was already counted; a failed read is not counted twice.
    let body = match upstream_resp.bytes().await {
        Ok(bytes) => bytes,
        Err(e) => {
            return crate::proxy::error_response(
                StatusCode::BAD_GATEWAY,
                "api_error",
                &format!("z.ai upstream body read failed: {e}"),
            );
        }
    };
    state
        .request_log
        .record_upstream_body(correlation_id, &body);
    let exhaustion = (body.len() <= MAX_CLASSIFIED_BODY)
        .then(|| classify(&body))
        .flatten();
    if let Some(exhaustion) = exhaustion {
        tracing::warn!(
            provider = %provider.name,
            code = exhaustion.code,
            "{}; answering 402 instead of relaying z.ai's 429",
            exhaustion.summary()
        );
        let response = client_response(surface, &exhaustion);
        state
            .provider_store
            .record_exhaustion(&provider.name, exhaustion);
        return response;
    }
    headers.insert("content-type", content_type);
    let mut response = Response::new(axum::body::Body::from(body));
    *response.status_mut() = status;
    *response.headers_mut() = headers;
    response
}

/// The data-directory file that keeps recorded exhaustions.
///
/// A restart, `router doctor` and `deploy --status` thereby see what the
/// serving process learned. It holds codes and z.ai's public reason, never a
/// secret.
pub const STATE_FILE: &str = "provider-exhaustion.json";

/// The exhaustions recorded under `data_dir`, by provider name. A missing or
/// unreadable file means none were recorded.
#[must_use]
pub fn load(data_dir: &std::path::Path) -> std::collections::HashMap<String, ZaiExhaustion> {
    let Ok(text) = std::fs::read_to_string(data_dir.join(STATE_FILE)) else {
        return std::collections::HashMap::new();
    };
    let Ok(Value::Object(entries)) = serde_json::from_str::<Value>(&text) else {
        return std::collections::HashMap::new();
    };
    entries
        .into_iter()
        .filter_map(|(name, entry)| {
            let code = business_code(&json!({ "code": entry.get("code")? }))?;
            let observed = entry.get("observed_at_unix").and_then(Value::as_u64)?;
            Some((
                name,
                ZaiExhaustion {
                    code,
                    reason: entry.get("reason")?.as_str()?.to_string(),
                    request_id: entry
                        .get("request_id")
                        .and_then(Value::as_str)
                        .map(str::to_string),
                    observed_at: SystemTime::UNIX_EPOCH + std::time::Duration::from_secs(observed),
                },
            ))
        })
        .collect()
}

/// Replace the recorded exhaustions under `data_dir`; an empty map removes the
/// file. Failures are logged, not fatal: the in-memory state still answers.
pub(crate) fn save(
    data_dir: &std::path::Path,
    exhaustions: &std::collections::HashMap<String, ZaiExhaustion>,
) {
    let path = data_dir.join(STATE_FILE);
    let result = if exhaustions.is_empty() {
        match std::fs::remove_file(&path) {
            Err(error) if error.kind() != std::io::ErrorKind::NotFound => Err(error),
            _ => Ok(()),
        }
    } else {
        let entries = exhaustions
            .iter()
            .map(|(name, exhaustion)| (name.clone(), exhaustion.to_json()))
            .collect::<serde_json::Map<_, _>>();
        crate::durable_file::atomic_write_owner_only(
            &path,
            Value::Object(entries).to_string().as_bytes(),
        )
    };
    if let Err(error) = result {
        tracing::warn!(path = %path.display(), "could not persist provider exhaustion: {error}");
    }
}

/// One newline-terminated `key=value` line per recorded exhaustion under
/// `data_dir`, for `deploy --status` and `router doctor`; empty when none.
#[must_use]
pub fn status_report(data_dir: &std::path::Path) -> String {
    let mut lines = load(data_dir)
        .into_iter()
        .map(|(name, exhaustion)| {
            format!(
                "provider_exhausted provider={name} upstream_code={} observed_at_unix={} reason={}",
                exhaustion.code,
                exhaustion.observed_unix(),
                serde_json::to_string(&exhaustion.summary()).unwrap_or_default()
            )
        })
        .collect::<Vec<_>>();
    lines.sort();
    lines.into_iter().map(|line| line + "\n").collect()
}

/// The exhaustion section of `router doctor`, and whether any was recorded.
///
/// `doctor` runs as a separate process with its own `DATA_DIR`, while a local
/// deployment keeps its state under `<root>/data`. It reported nothing for an
/// exhausted plan that a host deployment had recorded (issue #664), so it now
/// inspects each candidate directory and names every one it read.
#[must_use]
pub fn doctor_report(data_dirs: &[std::path::PathBuf]) -> (String, bool) {
    let mut report = String::new();
    let mut seen = std::collections::HashSet::new();
    let mut found = false;
    for data_dir in data_dirs.iter().filter(|dir| seen.insert(dir.as_path())) {
        let lines = status_report(data_dir);
        let result = if lines.is_empty() {
            "none recorded"
        } else {
            found = true;
            "recorded"
        };
        let _ = write!(
            report,
            "provider exhaustion     : {result} in {}\n{lines}",
            data_dir.display()
        );
    }
    if !found {
        report.push_str(
            "note: a deployment started with --root DIR records it in DIR/data; run doctor \
             with DATA_DIR=DIR/data to inspect that deployment\n",
        );
    }
    (report, found)
}

#[cfg(test)]
mod tests {
    use super::*;

    const EXHAUSTED: &str = r#"{"error":{"code":"1113","message":"[1113][Insufficient balance or no resource package. Please recharge.][20261004-abc]","type":"rate_limit_error"},"type":"error"}"#;

    #[test]
    fn the_exact_1113_body_is_exhaustion_with_reason_and_request_id() {
        let exhaustion = classify(EXHAUSTED.as_bytes()).expect("1113 is exhaustion");
        assert_eq!(exhaustion.code, 1113);
        assert_eq!(
            exhaustion.reason,
            "Insufficient balance or no resource package. Please recharge."
        );
        assert_eq!(exhaustion.request_id.as_deref(), Some("20261004-abc"));
    }

    #[test]
    fn genuine_rate_limits_and_other_bodies_are_not_exhaustion() {
        for code in ["1302", "1305", "1308", "1313"] {
            let body = format!(
                r#"{{"error":{{"code":"{code}","message":"[{code}][slow down][id]","type":"rate_limit_error"}},"type":"error"}}"#
            );
            assert_eq!(classify(body.as_bytes()), None, "{code}");
        }
        assert_eq!(classify(b"not json"), None);
        assert_eq!(classify(br#"{"error":{"type":"rate_limit_error"}}"#), None);
    }

    #[test]
    fn numeric_and_top_level_codes_are_recognised() {
        let exhaustion =
            classify(br#"{"code":1311,"msg":"plan does not include this model","success":false}"#)
                .expect("1311 is exhaustion");
        assert_eq!(exhaustion.code, 1311);
        assert_eq!(exhaustion.reason, "plan does not include this model");
        assert_eq!(exhaustion.request_id, None);
    }

    #[tokio::test]
    async fn the_anthropic_response_is_a_non_retryable_billing_error() {
        let exhaustion = classify(EXHAUSTED.as_bytes()).expect("exhaustion");
        let response = client_response(crate::metrics::Surface::Anthropic, &exhaustion);
        assert_eq!(response.status(), StatusCode::PAYMENT_REQUIRED);
        assert_eq!(response.headers()["x-router-upstream-error-code"], "1113");
        let body = axum::body::to_bytes(response.into_body(), usize::MAX)
            .await
            .expect("body");
        let value: Value = serde_json::from_slice(&body).expect("json");
        assert_eq!(value["type"], "error");
        assert_eq!(value["error"]["type"], "billing_error");
        assert_eq!(value["error"]["upstream_code"], "1113");
        assert_eq!(value["error"]["upstream_request_id"], "20261004-abc");
        let message = value["error"]["message"].as_str().expect("message");
        assert!(message.contains("code 1113"), "{message}");
        assert!(message.contains("Insufficient balance"), "{message}");
        assert!(
            !message.contains(".."),
            "issue #664 double period: {message}"
        );
        assert!(
            message.contains("Please recharge. Recharge the z.ai plan"),
            "{message}"
        );
    }

    #[tokio::test]
    async fn the_openai_response_is_insufficient_quota() {
        let exhaustion = classify(EXHAUSTED.as_bytes()).expect("exhaustion");
        let response = client_response(crate::metrics::Surface::OpenAIResponses, &exhaustion);
        assert_eq!(response.status(), StatusCode::PAYMENT_REQUIRED);
        let body = axum::body::to_bytes(response.into_body(), usize::MAX)
            .await
            .expect("body");
        let value: Value = serde_json::from_slice(&body).expect("json");
        assert_eq!(value["error"]["code"], "insufficient_quota");
        assert_eq!(value["error"]["upstream_code"], "1113");
    }

    #[test]
    fn a_recorded_exhaustion_survives_a_restart_and_reaches_offline_status() {
        let data = tempfile::tempdir().unwrap();
        let store = crate::providers::ProviderStore::open(data.path(), "secret").unwrap();
        store.record_exhaustion("z-ai", classify(EXHAUSTED.as_bytes()).unwrap());

        let reopened = crate::providers::ProviderStore::open(data.path(), "secret").unwrap();
        let recorded = reopened.exhaustion("z-ai").unwrap();
        assert_eq!(recorded.code, 1113);
        assert_eq!(recorded.request_id.as_deref(), Some("20261004-abc"));
        let report = status_report(data.path());
        assert!(
            report.starts_with("provider_exhausted provider=z-ai upstream_code=1113 "),
            "{report}"
        );
        assert!(report.contains("Insufficient balance"), "{report}");

        reopened.clear_exhaustion("z-ai");
        assert!(!data.path().join(STATE_FILE).exists());

        assert_eq!(status_report(data.path()), "");
        let restarted = crate::providers::ProviderStore::open(data.path(), "secret").unwrap();
        assert!(restarted.exhaustion("z-ai").is_none());
    }

    #[test]
    fn doctor_names_every_data_dir_it_inspected_and_finds_a_deployment_record() {
        let own = tempfile::tempdir().unwrap();
        let deployment = tempfile::tempdir().unwrap();
        let (report, found) = doctor_report(&[own.path().into(), deployment.path().into()]);
        assert!(!found, "{report}");
        assert!(report.contains(&format!("none recorded in {}", own.path().display())));
        assert!(report.contains("DATA_DIR=DIR/data"), "{report}");

        let store = crate::providers::ProviderStore::open(deployment.path(), "secret").unwrap();
        store.record_exhaustion("z-ai", classify(EXHAUSTED.as_bytes()).unwrap());
        let (report, found) = doctor_report(&[
            own.path().into(),
            deployment.path().into(),
            deployment.path().into(),
        ]);
        assert!(found, "{report}");
        assert!(report.contains(&format!("recorded in {}", deployment.path().display())));
        assert_eq!(
            report.matches("provider_exhausted provider=z-ai").count(),
            1,
            "{report}"
        );
        assert!(!report.contains("DATA_DIR=DIR/data"), "{report}");
    }
}
