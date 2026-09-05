//! Formatter and HTTP client shared by local and selected-remote usage commands.

use std::fmt::Write as _;
use std::process::ExitCode;

use crate::subscription_usage::{SubscriptionUsage, UsageEnvelope, UsageProvider};

pub async fn run(
    base_url: &str,
    token: Option<&str>,
    provider: Option<UsageProvider>,
    json: bool,
) -> ExitCode {
    let Some(token) = token.filter(|token| !token.is_empty()) else {
        eprintln!(
            "error: subscription usage requires a Router client token; set LINK_ASSISTANT_TOKEN or select a server with a client token"
        );
        return ExitCode::from(2);
    };
    let path = provider.map_or_else(
        || "/api/usage".to_string(),
        |provider| format!("/api/usage/{}", provider.as_str()),
    );
    let url = format!("{}{path}", base_url.trim_end_matches('/'));
    let response = match reqwest::Client::new()
        .get(&url)
        // The endpoint is Router-native rather than a vendor protocol. Send
        // the same token in all supported Router carriers so the signed client
        // kind selects its native evidence rule without decoding credentials
        // client-side.
        .bearer_auth(token)
        .header("x-api-key", token)
        .header("x-goog-api-key", token)
        .send()
        .await
    {
        Ok(response) => response,
        Err(error) => {
            eprintln!("error: router is not reachable at {url}: {error}");
            return ExitCode::from(1);
        }
    };
    let status = response.status();
    let bytes = match response.bytes().await {
        Ok(bytes) => bytes,
        Err(error) => {
            eprintln!("error: could not read Router usage response: {error}");
            return ExitCode::from(1);
        }
    };
    if !status.is_success() {
        let message = serde_json::from_slice::<serde_json::Value>(&bytes)
            .ok()
            .and_then(|body| {
                body.pointer("/error/message")
                    .or_else(|| body.pointer("/error/error/message"))
                    .and_then(serde_json::Value::as_str)
                    .map(str::to_string)
            })
            .unwrap_or_else(|| "request was refused".into());
        eprintln!("error: Router usage request failed ({status}): {message}");
        return ExitCode::from(1);
    }
    let envelope: UsageEnvelope = match serde_json::from_slice(&bytes) {
        Ok(envelope) => envelope,
        Err(error) => {
            eprintln!("error: Router returned invalid subscription usage JSON: {error}");
            return ExitCode::from(1);
        }
    };
    let output = match format_envelope(&envelope, json) {
        Ok(output) => output,
        Err(error) => {
            eprintln!("error: {error}");
            return ExitCode::from(1);
        }
    };
    print!("{output}");
    ExitCode::SUCCESS
}

fn format_envelope(envelope: &UsageEnvelope, json: bool) -> Result<String, String> {
    if json {
        return serde_json::to_string_pretty(envelope)
            .map(|mut output| {
                output.push('\n');
                output
            })
            .map_err(|error| format!("could not encode subscription usage: {error}"));
    }
    if envelope.subscriptions.is_empty() {
        return Ok("No authorized configured subscriptions.\n".into());
    }
    let mut output = String::new();
    for (index, subscription) in envelope.subscriptions.iter().enumerate() {
        if index > 0 {
            output.push('\n');
        }
        format_subscription(&mut output, subscription);
    }
    Ok(output)
}

fn format_subscription(output: &mut String, usage: &SubscriptionUsage) {
    let _ = writeln!(output, "{}", usage.provider.as_str());
    let _ = writeln!(output, "  status: {}", usage.status);
    if let Some(plan) = &usage.plan {
        let _ = writeln!(output, "  plan: {plan}");
    }
    for window in &usage.windows {
        let used = window
            .used_percentage
            .map_or_else(|| "unavailable".into(), |value| format!("{value:.1}% used"));
        let remaining = window
            .remaining_percentage
            .map(|value| format!(", {value:.1}% remaining"))
            .unwrap_or_default();
        let reset = window
            .resets_at
            .as_deref()
            .map(|value| format!(", resets {value}"))
            .unwrap_or_default();
        let _ = writeln!(output, "  {}: {used}{remaining}{reset}", window.name);
    }
    for limit in &usage.additional_limits {
        let _ = writeln!(output, "  limit {}:", limit.name);
        for window in &limit.windows {
            let used = window
                .used_percentage
                .map_or_else(|| "unavailable".into(), |value| format!("{value:.1}% used"));
            let remaining = window
                .remaining_percentage
                .map(|value| format!(", {value:.1}% remaining"))
                .unwrap_or_default();
            let reset = window
                .resets_at
                .as_deref()
                .map(|value| format!(", resets {value}"))
                .unwrap_or_default();
            let _ = writeln!(output, "    {}: {used}{remaining}{reset}", window.name);
        }
        if limit.used.is_some() || limit.limit.is_some() {
            let _ = writeln!(
                output,
                "    amount: {} / {}",
                limit
                    .used
                    .map_or_else(|| "?".into(), |value| value.to_string()),
                limit
                    .limit
                    .map_or_else(|| "?".into(), |value| value.to_string())
            );
        }
    }
    if let Some(credits) = &usage.credits {
        if credits.unlimited == Some(true) {
            let _ = writeln!(output, "  credits: unlimited");
        } else if let Some(balance) = &credits.balance {
            let _ = writeln!(output, "  credits: {balance}");
        } else if credits.overage_limit_reached == Some(true) {
            let _ = writeln!(output, "  credits: overage limit reached");
        }
    }
    if let Some(end) = &usage.subscription_end {
        let _ = writeln!(output, "  subscription ends: {end}");
    }
    if let Some(end) = &usage.trial_end {
        let _ = writeln!(output, "  trial ends: {end}");
    }
    if let Some(retry) = usage.retry_after_seconds {
        let _ = writeln!(output, "  retry after: {retry}s");
    }
}

#[cfg(test)]
#[path = "subscription_usage_cli_tests.rs"]
mod tests;
