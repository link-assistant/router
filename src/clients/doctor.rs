//! The `clients doctor` reachability probe.
//!
//! Split from `clients.rs` to keep that file within the repository's 1000-line
//! limit.

use std::time::Duration;

use serde_json::json;

use super::files::read_environment_value;
use super::{
    ClientError, ClientKind, ClientManager, DOCTOR_MAX_TOKENS, compact_body, doctor_model,
};

impl ClientManager {
    /// Exercise the same URL and token variable configured for the client.
    pub async fn doctor(&self, client: ClientKind) -> Result<String, ClientError> {
        if let Some(limitation) = client.setup_limitation() {
            return Err(ClientError::message(limitation));
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
        let catalog = self.catalog(&base_url, &token).await?;
        let model = doctor_model(client, &catalog)?;
        // A connectivity check is answered by a 200 with any body. Probing at
        // the ceiling — 24576 output tokens, adaptive thinking at `high`, or
        // `xhigh` reasoning — bought the deepest reasoning the account can
        // produce to find out whether a URL answers, on a command whose name,
        // help and output all say "reachability" (issue #309). #173 removed the
        // hardcoded model *name* and left the price; this is the price.
        let (url, body) = match client {
            ClientKind::Codex => (
                format!("{}/responses", base_url.trim_end_matches('/')),
                json!({
                    "model": model,
                    "input": "Reply OK",
                    "max_output_tokens": DOCTOR_MAX_TOKENS,
                    "reasoning": {"effort": "low"}
                }),
            ),
            ClientKind::ClaudeCode => (
                format!("{}/v1/messages", base_url.trim_end_matches('/')),
                json!({
                    "model":model,
                    "max_tokens":DOCTOR_MAX_TOKENS,
                    "messages":[{"role":"user", "content":"Reply OK"}]
                }),
            ),
            ClientKind::GrokCli
            | ClientKind::Opencode
            | ClientKind::QwenCode
            | ClientKind::Agent => (
                format!("{}/chat/completions", base_url.trim_end_matches('/')),
                json!({
                    "model":model,
                    "max_tokens": DOCTOR_MAX_TOKENS,
                    "reasoning_effort": "low",
                    "messages":[{"role":"user", "content":"Reply OK"}]
                }),
            ),
            ClientKind::Cursor | ClientKind::GeminiCli => unreachable!(),
        };
        let response = reqwest::Client::new()
            .post(&url)
            .bearer_auth(token)
            .json(&body)
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
