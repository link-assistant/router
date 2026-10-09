//! Resolve capability evidence only after the upstream account is selected.
use super::ThinkingProtocol;
use crate::app_state::AppState;
use crate::subscription::SubscriptionProvider;
use serde_json::Value;

/// Validate a translated or native body against this attempt's exact catalog.
/// Missing, stale, conflicting or differently scoped evidence is unknown.
/// Returns whether the payload changed, allowing native byte replay otherwise.
#[allow(clippy::too_many_arguments)]
pub fn apply_for_account(
    state: &AppState,
    body: &mut Value,
    model: &str,
    provider: SubscriptionProvider,
    account: &str,
    inference_base: &str,
    protocol: ThinkingProtocol,
    origin: ThinkingProtocol,
    from_suffix: bool,
) -> Result<bool, String> {
    let records = state
        .model_catalogs
        .records_for_accounts(provider, &[account.to_string()]);
    let mut matching = records.iter().filter(|record| {
        record.canonical_id == model
            || (provider == SubscriptionProvider::Gemini
                && record.canonical_id == format!("models/{model}"))
    });
    let Some(record) = matching.next() else {
        return Ok(false);
    };
    if matching.next().is_some() {
        return Ok(false);
    }
    if crate::operation_context::now()
        .timestamp()
        .saturating_sub(record.fetched_at)
        > i64::try_from(crate::model_catalog::CATALOG_TTL.as_secs()).unwrap_or(i64::MAX)
    {
        return Ok(false);
    }
    // Discovery and inference must share the configured endpoint. Gemini's
    // documented public registry is separate from its Code Assist inference.
    let base = inference_base.trim_end_matches('/');
    let expected = match provider {
        SubscriptionProvider::Claude => format!("{base}/v1/models"),
        SubscriptionProvider::Codex | SubscriptionProvider::Qwen => format!("{base}/models"),
        SubscriptionProvider::Gemini => {
            if base != "https://cloudcode-pa.googleapis.com" {
                return Ok(false);
            }
            "https://generativelanguage.googleapis.com/v1beta/models".to_string()
        }
    };
    if record.raw.get("router_endpoint").and_then(Value::as_str) != Some(expected.as_str())
        || record.raw.get("router_account").and_then(Value::as_str) != Some(record.account.as_str())
        || record
            .raw
            .get("router_health_generation")
            .and_then(Value::as_str)
            != Some(record.health_generation.as_str())
    {
        return Ok(false);
    }
    let truth = crate::model_routing::thinking_model_truth(record);
    let Some(support) = super::support::from_truth(&truth, &record.canonical_id, protocol) else {
        return Ok(false);
    };
    let Some(config) = super::extract_config(body, protocol)? else {
        return Ok(false);
    };
    if support.supported == Some(false) {
        tracing::debug!(
            model,
            provider = provider.as_str(),
            account,
            "thinking dropped: exact selected model does not support it"
        );
        let original = body.clone();
        super::apply::clear(body, protocol);
        return Ok(*body != original);
    }
    let validated = super::support::validate(config, &support, origin, protocol, from_suffix)?;
    if validated == config {
        return Ok(false);
    }
    let original = body.clone();
    super::apply::apply(
        body,
        validated,
        protocol,
        Some(&support),
        &record.canonical_id,
    );
    Ok(*body != original)
}

#[cfg(test)]
#[path = "catalog_tests.rs"]
mod tests;
