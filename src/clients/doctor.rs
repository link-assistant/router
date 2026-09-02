//! The `clients doctor` reachability probe.
//!
//! Split from `clients.rs` to keep that file within the repository's 1000-line
//! limit.

use std::time::Duration;

use serde_json::json;

use super::files::read_environment_value;
use super::{
    ClientError, ClientKind, ClientManager, DOCTOR_MAX_TOKENS, OwnershipState, compact_body,
    doctor_model,
};

impl ClientManager {
    /// Exercise the same URL and token variable configured for the client.
    pub async fn doctor(&self, client: ClientKind) -> Result<String, ClientError> {
        if let Some(limitation) = client.setup_limitation() {
            return Err(ClientError::message(limitation));
        }
        if client == ClientKind::ClaudeCode {
            require_claude_gateway_version()?;
        }
        let ownership = self.analyze(client)?;
        if ownership.state != OwnershipState::ManagedIntact {
            return Err(ClientError::message(format!(
                "{} routing ownership is {:?}{}; run `clients repair {client} --dry-run` to inspect it, then `clients repair {client}`",
                client.display_name(),
                ownership.state,
                if ownership.conflicts.is_empty() {
                    String::new()
                } else {
                    format!(" (conflicts: {})", ownership.conflicts.join(", "))
                }
            )));
        }
        let status = self.status(client)?;
        let base_url = status.base_url.ok_or_else(|| {
            ClientError::message(format!(
                "{} is not configured; run `clients setup {client}`",
                client.display_name()
            ))
        })?;
        let token_env = client
            .token_env()
            .ok_or_else(|| ClientError::message("client has no router token environment"))?;
        let token = self
            .environment_var(token_env)
            .or_else(|| {
                read_environment_value(&self.environment_path(client), token_env)
                    .ok()
                    .flatten()
            })
            .ok_or_else(|| {
                ClientError::message(format!(
                    "{token_env} is unset and no managed credential exists; run `clients setup {client}`"
                ))
            })?;
        let catalog = self.catalog(client, &base_url, &token).await?;
        let model = doctor_model(client, &catalog)?;
        let (url, body) = probe_request(client, &base_url, model);
        let request = reqwest::Client::new().post(&url).json(&body);
        let request = match client {
            ClientKind::ClaudeCode => request
                .header("x-api-key", &token)
                .header("anthropic-version", "2023-06-01"),
            ClientKind::GeminiCli => request
                .header("x-goog-api-key", &token)
                .header("x-goog-api-client", "link-assistant-router-doctor"),
            ClientKind::Codex => request
                .bearer_auth(&token)
                .header("x-openai-internal-codex-responses-lite", "true"),
            ClientKind::QwenCode => request
                .bearer_auth(&token)
                .header("x-stainless-package-version", "router-doctor"),
            ClientKind::Opencode => request
                .bearer_auth(&token)
                .header("user-agent", "opencode/router-doctor")
                .header("x-session-id", "router-doctor"),
            ClientKind::GrokCli => request
                .bearer_auth(&token)
                .header("user-agent", "grok/router-doctor"),
            ClientKind::Cursor | ClientKind::Agent => request.bearer_auth(&token),
        };
        let response = request
            .timeout(Duration::from_secs(30))
            .send()
            .await
            .map_err(|error| {
                ClientError::message(format!("router is not reachable at {url}: {error}"))
            })?;
        let code = response.status();
        let response_body = response.text().await.unwrap_or_default();
        if code.is_success() {
            return Ok(format!(
                "{} reached {url} successfully ({code})",
                client.display_name()
            ));
        }
        if code.as_u16() == 401 || code.as_u16() == 403 {
            return Err(ClientError::message(format!(
                "router rejected {token_env} ({code}); the token is invalid, expired, or revoked"
            )));
        }
        if code.as_u16() == 503 {
            return Err(ClientError::message(format!(
                "router reached, but its upstream credential is unavailable ({code}): {}",
                compact_body(&response_body)
            )));
        }
        if code.as_u16() == 404 {
            return Err(ClientError::message(format!(
                "router reached, but catalog model '{model}' is unavailable ({code}): {}",
                compact_body(&response_body)
            )));
        }
        Err(ClientError::message(format!(
            "router request failed at {url} ({code}): {}",
            compact_body(&response_body)
        )))
    }
}

const MINIMUM_CLAUDE_GATEWAY_VERSION: (u64, u64, u64) = (2, 1, 255);

/// Claude Code 2.1.255 includes current gateway alias resolution as well as
/// the original discovery support introduced in 2.1.129.
fn claude_gateway_version_supported(output: &str) -> bool {
    output
        .split(|character: char| !(character.is_ascii_digit() || character == '.'))
        .find_map(|part| {
            let mut pieces = part.split('.');
            Some((
                pieces.next()?.parse::<u64>().ok()?,
                pieces.next()?.parse::<u64>().ok()?,
                pieces.next()?.parse::<u64>().ok()?,
            ))
        })
        .is_some_and(|version| version >= MINIMUM_CLAUDE_GATEWAY_VERSION)
}

/// Fail with an actionable diagnostic when an installed Claude is too old.
#[allow(clippy::redundant_pub_crate)]
pub(crate) fn require_claude_gateway_version() -> Result<(), ClientError> {
    let Ok(output) = std::process::Command::new("claude")
        .arg("--version")
        .output()
    else {
        return Ok(());
    };
    let version = format!(
        "{}{}",
        String::from_utf8_lossy(&output.stdout),
        String::from_utf8_lossy(&output.stderr)
    );
    if output.status.success() && claude_gateway_version_supported(&version) {
        return Ok(());
    }
    Err(ClientError::message(format!(
        "Claude Code >= 2.1.255 is required for current Router gateway model discovery and aliases; installed version reports '{}'. Upgrade Claude Code, then restart it to refresh ~/.claude/cache/gateway-models.json",
        version.trim()
    )))
}

/// The URL and body `doctor` probes with.
///
/// A connectivity check is answered by a 200 with any body. Probing at the
/// ceiling — 24576 output tokens, adaptive thinking at `high`, or `xhigh`
/// reasoning — bought the deepest reasoning the account can produce to find out
/// whether a URL answers, on a command whose name, help and output all say
/// "reachability" (issue #309). #173 removed the hardcoded model *name* and left
/// the price; this is the price.
///
/// Pure, so the price is assertable without spending it.
fn probe_request(client: ClientKind, base_url: &str, model: &str) -> (String, serde_json::Value) {
    let base = base_url.trim_end_matches('/');
    match client {
        ClientKind::Codex => (
            format!("{base}/responses"),
            json!({
                "model": model,
                "input": "Reply OK",
                "max_output_tokens": DOCTOR_MAX_TOKENS,
                "reasoning": {"effort": "low"}
            }),
        ),
        ClientKind::ClaudeCode => (
            format!("{base}/v1/messages"),
            json!({
                "model": model,
                "max_tokens": DOCTOR_MAX_TOKENS,
                "messages": [{"role":"user", "content":"Reply OK"}]
            }),
        ),
        ClientKind::GrokCli | ClientKind::Opencode | ClientKind::QwenCode | ClientKind::Agent => (
            format!("{base}/chat/completions"),
            json!({
                "model": model,
                "max_tokens": DOCTOR_MAX_TOKENS,
                "reasoning_effort": "low",
                "messages": [{"role":"user", "content":"Reply OK"}]
            }),
        ),
        ClientKind::Cursor | ClientKind::GeminiCli => unreachable!(),
    }
}

#[cfg(test)]
mod tests {
    use super::{DOCTOR_MAX_TOKENS, claude_gateway_version_supported, probe_request};
    use crate::clients::ClientKind;

    /// The probe asks for the cheapest answer that proves a URL responds, for
    /// every client it can probe (issue #309).
    #[test]
    fn every_probe_asks_at_the_floor_not_the_ceiling() {
        assert_eq!(DOCTOR_MAX_TOKENS, 64, "a reachability check is not a task");
        for client in ClientKind::ALL {
            if matches!(client, ClientKind::Cursor | ClientKind::GeminiCli) {
                continue;
            }
            let (url, body) = probe_request(client, "https://router.example/", "a-model");
            assert!(
                !url.contains("//chat") && !url.contains("//v1") && !url.contains("//responses"),
                "{client}: a trailing slash must not double: {url}"
            );
            assert_eq!(body["model"], "a-model", "{client} probes the given model");
            let budget = body
                .get("max_tokens")
                .or_else(|| body.get("max_output_tokens"))
                .and_then(serde_json::Value::as_u64)
                .unwrap_or_else(|| panic!("{client} must bound its output"));
            assert_eq!(
                budget,
                u64::from(DOCTOR_MAX_TOKENS),
                "{client} must probe at the floor"
            );
            let effort = body
                .get("reasoning_effort")
                .or_else(|| body.pointer("/reasoning/effort"));
            if let Some(effort) = effort {
                assert_eq!(effort, "low", "{client} must not buy deep reasoning");
            }
        }
    }

    #[test]
    fn gateway_discovery_requires_current_claude_alias_support() {
        assert!(!claude_gateway_version_supported("2.1.252 (Claude Code)"));
        assert!(claude_gateway_version_supported("2.1.255 (Claude Code)"));
        assert!(claude_gateway_version_supported("Claude Code v2.2.0"));
    }
}
