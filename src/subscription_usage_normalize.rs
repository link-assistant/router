use base64::Engine as _;
use serde_json::Value;

use super::{
    Credits, ExtraUsage, NamedLimit, SpendControl, SpendLimit, SubscriptionToken,
    SubscriptionUsage, UsageProvider, UsageState, UsageWindow,
};

const ANTHROPIC_WINDOWS: [&str; 6] = [
    "five_hour",
    "seven_day",
    "seven_day_oauth_apps",
    "seven_day_opus",
    "seven_day_sonnet",
    "cinder_cove",
];

pub(super) fn recognizable_anthropic_usage(value: &Value) -> bool {
    ANTHROPIC_WINDOWS.into_iter().any(|name| {
        value
            .get(name)
            .and_then(Value::as_object)
            .is_some_and(|window| {
                window.contains_key("utilization") || window.contains_key("resets_at")
            })
    }) || value
        .get("extra_usage")
        .and_then(Value::as_object)
        .is_some_and(|extra| {
            [
                "is_enabled",
                "monthly_limit",
                "used_credits",
                "utilization",
                "currency",
                "resets_at",
            ]
            .into_iter()
            .any(|key| extra.contains_key(key))
        })
        || value
            .get("limits")
            .and_then(Value::as_array)
            .is_some_and(|limits| limits.iter().any(recognizable_anthropic_limit))
}

pub(super) fn recognizable_openai_usage(value: &Value) -> bool {
    value.get("rate_limit").is_some_and(|rate_limit| {
        rate_limit.get("allowed").and_then(Value::as_bool).is_some()
            || rate_limit
                .get("limit_reached")
                .and_then(Value::as_bool)
                .is_some()
            || codex_windows(rate_limit).iter().any(|window| {
                window.used_percentage.is_some()
                    || window.resets_at.is_some()
                    || window.window_seconds.is_some()
            })
    }) || openai_credits(value).is_some()
        || openai_spend_control(value).is_some()
        || !openai_additional_limits(value).is_empty()
        || value
            .pointer("/rate_limit_reached_type/type")
            .and_then(Value::as_str)
            .is_some()
        || reset_credits_available(value).is_some()
}

fn recognizable_anthropic_limit(value: &Value) -> bool {
    let Some(limit) = value.as_object() else {
        return false;
    };
    (limit.get("kind").and_then(Value::as_str).is_some()
        || limit.get("group").and_then(Value::as_str).is_some()
        || value
            .pointer("/scope/model/display_name")
            .and_then(Value::as_str)
            .is_some())
        && (limit.get("percent").and_then(Value::as_f64).is_some()
            || limit.get("resets_at").and_then(Value::as_str).is_some())
}

pub(super) fn normalize_anthropic(value: &Value) -> SubscriptionUsage {
    let mut result = empty_usage(UsageProvider::Anthropic);
    result.state = UsageState::Available;
    result.windows = anthropic_windows(value);
    result.extra_usage = anthropic_extra_usage(value);
    result.additional_limits = anthropic_dynamic_limits(value);
    result.limit_reached = Some(anthropic_limit_reached(&result));
    result.status = if result.limit_reached == Some(true) {
        "limit_reached".into()
    } else {
        "available".into()
    };
    result
}

pub(super) fn anthropic_windows(value: &Value) -> Vec<UsageWindow> {
    ANTHROPIC_WINDOWS
        .into_iter()
        .filter_map(|name| {
            let window = value.get(name)?.as_object()?;
            Some(window_from(
                name,
                window.get("utilization").and_then(Value::as_f64),
                window
                    .get("resets_at")
                    .and_then(|value| safe_string(value, 128)),
                None,
            ))
        })
        .collect()
}

fn anthropic_extra_usage(value: &Value) -> Option<ExtraUsage> {
    let extra = value.get("extra_usage")?.as_object()?;
    let monthly_limit = safe_number(extra.get("monthly_limit"));
    let used_credits = safe_number(extra.get("used_credits"));
    let utilization = safe_percentage(extra.get("utilization"));
    let remaining_credits = monthly_limit
        .zip(used_credits)
        .map(|(limit, used)| (limit - used).max(0.0));
    let result = ExtraUsage {
        is_enabled: extra.get("is_enabled").and_then(Value::as_bool),
        monthly_limit,
        used_credits,
        remaining_credits,
        utilization,
        currency: extra
            .get("currency")
            .and_then(|value| safe_string(value, 16)),
        resets_at: extra
            .get("resets_at")
            .or_else(|| extra.get("reset_at"))
            .and_then(|value| safe_string(value, 128)),
    };
    (result.is_enabled.is_some()
        || result.monthly_limit.is_some()
        || result.used_credits.is_some()
        || result.utilization.is_some()
        || result.currency.is_some()
        || result.resets_at.is_some())
    .then_some(result)
}

fn anthropic_dynamic_limits(value: &Value) -> Vec<NamedLimit> {
    value
        .get("limits")
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
        .filter_map(|limit| anthropic_dynamic_limit(value, limit))
        .collect()
}

fn anthropic_dynamic_limit(root: &Value, value: &Value) -> Option<NamedLimit> {
    let kind = value.get("kind").and_then(|value| safe_string(value, 128));
    let group = value.get("group").and_then(|value| safe_string(value, 128));
    let model_display_name = value
        .pointer("/scope/model/display_name")
        .and_then(|value| safe_string(value, 256));
    let percentage = safe_percentage(value.get("percent"));
    let resets_at = value
        .get("resets_at")
        .and_then(|value| safe_string(value, 128));
    if kind.is_none() && group.is_none() && model_display_name.is_none() {
        return None;
    }
    if percentage.is_none() && resets_at.is_none() {
        return None;
    }
    if duplicate_anthropic_legacy(
        root,
        kind.as_deref(),
        group.as_deref(),
        model_display_name.as_deref(),
    ) {
        return None;
    }
    let name = model_display_name
        .as_ref()
        .or(kind.as_ref())
        .or(group.as_ref())?
        .clone();
    Some(NamedLimit {
        name,
        limit_name: None,
        metered_feature: None,
        kind,
        group,
        model_display_name,
        allowed: None,
        limit_reached: percentage.map(|percent| percent >= 100.0),
        windows: vec![window_from("limit", percentage, resets_at, None)],
        used: None,
        limit: None,
    })
}

fn duplicate_anthropic_legacy(
    root: &Value,
    kind: Option<&str>,
    group: Option<&str>,
    display: Option<&str>,
) -> bool {
    let kind = kind.map(normalize_label);
    let group = group.map(normalize_label);
    let display = display.map(normalize_label);
    ANTHROPIC_WINDOWS.into_iter().any(|legacy| {
        if root.get(legacy).and_then(Value::as_object).is_none() {
            return false;
        }
        let legacy_normalized = normalize_label(legacy);
        if kind.as_deref() == Some(legacy_normalized.as_str()) {
            return true;
        }
        let Some(model_suffix) = legacy.strip_prefix("seven_day_") else {
            return false;
        };
        group.as_deref() == Some("model")
            && kind.as_deref().is_some_and(|kind| {
                kind.contains("week") || kind.contains("seven_day") || kind.contains("scoped")
            })
            && display
                .as_deref()
                .is_some_and(|display| display.contains(&normalize_label(model_suffix)))
    })
}

fn normalize_label(value: &str) -> String {
    value
        .chars()
        .map(|character| {
            if character.is_ascii_alphanumeric() {
                character.to_ascii_lowercase()
            } else {
                '_'
            }
        })
        .collect::<String>()
        .split('_')
        .filter(|part| !part.is_empty())
        .collect::<Vec<_>>()
        .join("_")
}

fn anthropic_limit_reached(usage: &SubscriptionUsage) -> bool {
    usage
        .windows
        .iter()
        .any(|window| window.used_percentage == Some(100.0))
        || usage
            .additional_limits
            .iter()
            .any(|limit| limit.limit_reached == Some(true))
        || usage
            .extra_usage
            .as_ref()
            .is_some_and(|extra| extra.is_enabled == Some(true) && extra.utilization == Some(100.0))
}

pub(super) fn apply_anthropic_profile(usage: &mut SubscriptionUsage, profile: &Value) {
    let organization = profile.get("organization").unwrap_or(profile);
    if usage.status != "limit_reached" {
        usage.status = organization
            .get("subscription_status")
            .and_then(Value::as_str)
            .unwrap_or("available")
            .to_string();
    }
    usage.plan = organization
        .get("subscription_type")
        .or_else(|| profile.get("subscription_type"))
        .and_then(Value::as_str)
        .map(str::to_string);
    usage.subscription_created = organization
        .get("subscription_created_at")
        .and_then(Value::as_str)
        .map(str::to_string);
    usage.trial_end = organization
        .get("claude_code_trial_ends_at")
        .and_then(Value::as_str)
        .map(str::to_string);
    usage.subscription_end = organization
        .get("subscription_ends_at")
        .and_then(Value::as_str)
        .map(str::to_string);
}

pub(super) fn normalize_openai(value: &Value, token: &SubscriptionToken) -> SubscriptionUsage {
    let rate_limit = value.get("rate_limit").unwrap_or(&Value::Null);
    let mut result = empty_usage(UsageProvider::OpenAi);
    result.state = UsageState::Available;
    result.allowed = rate_limit.get("allowed").and_then(Value::as_bool);
    result.limit_reached = rate_limit.get("limit_reached").and_then(Value::as_bool);
    result.plan = value
        .get("plan_type")
        .and_then(Value::as_str)
        .map(str::to_string)
        .or_else(|| openai_claim(token, "chatgpt_plan_type"));
    result.subscription_end = openai_claim(token, "chatgpt_subscription_active_until");
    result.windows = codex_windows(rate_limit);
    result.additional_limits = openai_additional_limits(value);
    result.credits = openai_credits(value);
    result.spend_control = openai_spend_control(value);
    result.rate_limit_reached_type = value
        .pointer("/rate_limit_reached_type/type")
        .and_then(|value| safe_string(value, 128));
    result.rate_limit_reset_credits_available = reset_credits_available(value);
    result.status = openai_status(&result).into();
    result
}

fn openai_additional_limits(value: &Value) -> Vec<NamedLimit> {
    value
        .get("additional_rate_limits")
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
        .filter_map(|limit| {
            let limit_name = limit
                .get("limit_name")
                .and_then(|value| safe_string(value, 256));
            let metered_feature = limit
                .get("metered_feature")
                .and_then(|value| safe_string(value, 256));
            let name = limit_name.as_ref().or(metered_feature.as_ref())?.clone();
            let rate_limit = limit.get("rate_limit").unwrap_or(&Value::Null);
            Some(NamedLimit {
                name,
                limit_name,
                metered_feature,
                kind: None,
                group: None,
                model_display_name: None,
                allowed: rate_limit.get("allowed").and_then(Value::as_bool),
                limit_reached: rate_limit.get("limit_reached").and_then(Value::as_bool),
                windows: codex_windows(rate_limit),
                used: None,
                limit: None,
            })
        })
        .collect()
}

fn openai_credits(value: &Value) -> Option<Credits> {
    let credits = value.get("credits")?.as_object()?;
    let balance = credits.get("balance").and_then(safe_numeric_string);
    let result = Credits {
        balance,
        has_credits: credits.get("has_credits").and_then(Value::as_bool),
        unlimited: credits.get("unlimited").and_then(Value::as_bool),
        overage_limit_reached: credits
            .get("overage_limit_reached")
            .and_then(Value::as_bool),
        approximate_local_messages: credits
            .get("approx_local_messages")
            .and_then(numeric_message_estimate),
        approximate_cloud_messages: credits
            .get("approx_cloud_messages")
            .and_then(numeric_message_estimate),
    };
    (result.balance.is_some()
        || result.has_credits.is_some()
        || result.unlimited.is_some()
        || result.overage_limit_reached.is_some()
        || result.approximate_local_messages.is_some()
        || result.approximate_cloud_messages.is_some())
    .then_some(result)
}

fn numeric_message_estimate(value: &Value) -> Option<u64> {
    if let Some(count) = value.as_u64() {
        return Some(count);
    }
    let values = value.as_array()?;
    let counts = values
        .iter()
        .filter_map(|entry| entry.get("count").and_then(Value::as_u64))
        .collect::<Vec<_>>();
    (!counts.is_empty()).then(|| counts.into_iter().fold(0_u64, u64::saturating_add))
}

fn openai_spend_control(value: &Value) -> Option<SpendControl> {
    let control = value.get("spend_control")?.as_object()?;
    let individual_limit = control
        .get("individual_limit")
        .and_then(Value::as_object)
        .map(|limit| SpendLimit {
            source: limit.get("source").and_then(|value| safe_string(value, 64)),
            limit: limit.get("limit").and_then(safe_numeric_string),
            used: limit.get("used").and_then(safe_numeric_string),
            remaining: limit.get("remaining").and_then(safe_numeric_string),
            used_percentage: safe_percentage(limit.get("used_percent")),
            remaining_percentage: safe_percentage(limit.get("remaining_percent")),
            reset_after_seconds: limit.get("reset_after_seconds").and_then(Value::as_u64),
            resets_at: limit.get("reset_at").and_then(epoch_timestamp),
        });
    let result = SpendControl {
        reached: control.get("reached").and_then(Value::as_bool),
        individual_limit,
    };
    (result.reached.is_some() || result.individual_limit.is_some()).then_some(result)
}

fn reset_credits_available(value: &Value) -> Option<u64> {
    value
        .get("rate_limit_reset_credits")
        .or_else(|| value.get("rate_limit_reset_credits_summary"))
        .and_then(|credits| credits.get("available_count"))
        .and_then(Value::as_u64)
}

fn openai_status(usage: &SubscriptionUsage) -> &'static str {
    if usage.rate_limit_reached_type.is_some() {
        "limit_reached"
    } else if usage
        .spend_control
        .as_ref()
        .is_some_and(|control| control.reached == Some(true))
    {
        "spend_control_reached"
    } else if usage
        .credits
        .as_ref()
        .is_some_and(|credits| credits.has_credits == Some(false))
    {
        "credits_unavailable"
    } else if usage.allowed == Some(false)
        || usage.limit_reached == Some(true)
        || usage
            .additional_limits
            .iter()
            .any(|limit| limit.allowed == Some(false) || limit.limit_reached == Some(true))
    {
        "limit_reached"
    } else {
        "available"
    }
}

fn codex_windows(value: &Value) -> Vec<UsageWindow> {
    [
        ("primary", "primary_window"),
        ("secondary", "secondary_window"),
    ]
    .into_iter()
    .filter_map(|(name, key)| {
        let window = value.get(key)?;
        Some(window_from(
            name,
            window.get("used_percent").and_then(Value::as_f64),
            window.get("reset_at").and_then(epoch_timestamp),
            window.get("limit_window_seconds").and_then(Value::as_u64),
        ))
    })
    .collect()
}

pub(super) fn openai_claim(token: &SubscriptionToken, key: &str) -> Option<String> {
    openai_claims(&token.access_token)?
        .get(key)
        .and_then(Value::as_str)
        .map(str::to_string)
}

pub(super) fn openai_claims(token: &str) -> Option<Value> {
    let payload = token.split('.').nth(1)?;
    let bytes = base64::engine::general_purpose::URL_SAFE_NO_PAD
        .decode(payload)
        .ok()?;
    let claims: Value = serde_json::from_slice(&bytes).ok()?;
    claims
        .get("https://api.openai.com/auth")?
        .as_object()
        .cloned()
        .map(Value::Object)
}

pub(super) fn normalize_zai(value: &Value, partial: bool) -> SubscriptionUsage {
    let mut result = empty_usage(UsageProvider::ZAi);
    result.state = UsageState::Available;
    result.status = if partial {
        "quota_available_details_unverified".into()
    } else {
        "available".into()
    };
    let limits = value
        .get("limits")
        .and_then(Value::as_array)
        .into_iter()
        .flatten();
    for limit in limits {
        let kind = limit
            .get("type")
            .and_then(Value::as_str)
            .unwrap_or("additional");
        let percentage = limit.get("percentage").and_then(Value::as_f64);
        if kind == "TOKENS_LIMIT" {
            result.windows.push(window_from(
                "five_hour_tokens",
                percentage,
                limit
                    .get("resetsAt")
                    .or_else(|| limit.get("resets_at"))
                    .and_then(Value::as_str)
                    .map(str::to_string),
                None,
            ));
        } else {
            result.additional_limits.push(NamedLimit {
                name: if kind == "TIME_LIMIT" {
                    "monthly_mcp".into()
                } else {
                    kind.to_ascii_lowercase()
                },
                limit_name: None,
                metered_feature: None,
                kind: Some(kind.to_string()),
                group: None,
                model_display_name: None,
                allowed: None,
                limit_reached: percentage.map(|percent| percent >= 100.0),
                windows: percentage
                    .map(|used| window_from("limit", Some(used), None, None))
                    .into_iter()
                    .collect(),
                used: limit.get("currentValue").and_then(Value::as_f64),
                limit: limit.get("usage").and_then(Value::as_f64),
            });
        }
    }
    result
}

pub(super) fn window_from(
    name: &str,
    used: Option<f64>,
    resets_at: Option<String>,
    window_seconds: Option<u64>,
) -> UsageWindow {
    let used = used.filter(|value| value.is_finite() && (0.0..=100.0).contains(value));
    UsageWindow {
        name: name.to_string(),
        used_percentage: used,
        remaining_percentage: used.map(|value| (100.0 - value).clamp(0.0, 100.0)),
        resets_at,
        window_seconds,
    }
}

pub(super) fn empty_usage(provider: UsageProvider) -> SubscriptionUsage {
    SubscriptionUsage {
        provider,
        state: UsageState::Unverified,
        status: "unverified".into(),
        allowed: None,
        limit_reached: None,
        plan: None,
        windows: Vec::new(),
        additional_limits: Vec::new(),
        credits: None,
        extra_usage: None,
        spend_control: None,
        rate_limit_reached_type: None,
        rate_limit_reset_credits_available: None,
        subscription_end: None,
        trial_end: None,
        subscription_created: None,
        retry_after_seconds: None,
    }
}

fn safe_percentage(value: Option<&Value>) -> Option<f64> {
    safe_number(value).filter(|number| (0.0..=100.0).contains(number))
}

fn safe_number(value: Option<&Value>) -> Option<f64> {
    value
        .and_then(Value::as_f64)
        .filter(|number| number.is_finite() && *number >= 0.0)
}

fn safe_numeric_string(value: &Value) -> Option<String> {
    let text = value
        .as_str()
        .map(str::to_string)
        .or_else(|| value.as_f64().map(|number| number.to_string()))?;
    (text.len() <= 64
        && text
            .parse::<f64>()
            .is_ok_and(|number| number.is_finite() && number >= 0.0))
    .then_some(text)
}

fn safe_string(value: &Value, maximum: usize) -> Option<String> {
    let text = value.as_str()?;
    (!text.is_empty()
        && text.len() <= maximum
        && !text.chars().any(char::is_control)
        && !text.contains('@'))
    .then(|| text.to_string())
}

fn epoch_timestamp(value: &Value) -> Option<String> {
    value
        .as_i64()
        .and_then(|seconds| chrono::DateTime::from_timestamp(seconds, 0))
        .map(|time| time.to_rfc3339())
}
