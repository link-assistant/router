use axum::extract::{OriginalUri, Path, State};
use axum::http::{HeaderMap, StatusCode};
use axum::response::{IntoResponse, Response};
use base64::Engine as _;
use bytes::{Bytes, BytesMut};
use futures_util::StreamExt as _;
use serde_json::Value;

use crate::app_state::AppState;
use crate::client_policy::ClientProtocol;
use crate::subscription::{SubscriptionProvider, SubscriptionToken};

const SCHEMA_VERSION: u8 = 1;
pub(crate) const MAX_USAGE_BODY: usize = 2 * 1024 * 1024;

#[path = "subscription_usage_types.rs"]
mod types;
pub use types::{
    Credits, NamedLimit, SubscriptionUsage, UsageEnvelope, UsageProvider, UsageState, UsageWindow,
};

#[derive(Default)]
struct SafeCredentialMetadata {
    plan: Option<String>,
    subscription_end: Option<String>,
}

enum ProbeResult {
    Usage(Box<SubscriptionUsage>),
    NotConfigured,
}

#[derive(Debug)]
enum VendorResponse {
    Json(Value),
    AuthenticationRejected,
    RateLimited(Option<u64>),
    Malformed,
    Unavailable,
}

#[derive(Debug)]
pub(crate) enum BoundedBodyError {
    TooLarge,
    Read,
}

pub(crate) async fn bounded_response_bytes(
    response: reqwest::Response,
    maximum: usize,
) -> Result<Bytes, BoundedBodyError> {
    if response
        .content_length()
        .is_some_and(|length| length > maximum as u64)
    {
        return Err(BoundedBodyError::TooLarge);
    }
    let mut bytes = BytesMut::new();
    let mut stream = response.bytes_stream();
    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|_| BoundedBodyError::Read)?;
        if bytes.len().saturating_add(chunk.len()) > maximum {
            return Err(BoundedBodyError::TooLarge);
        }
        bytes.extend_from_slice(&chunk);
    }
    Ok(bytes.freeze())
}

pub async fn usage(
    State(state): State<AppState>,
    OriginalUri(uri): OriginalUri,
    headers: HeaderMap,
) -> Response {
    usage_impl(state, uri.path(), headers, None).await
}

pub async fn usage_provider(
    State(state): State<AppState>,
    OriginalUri(uri): OriginalUri,
    Path(provider): Path<String>,
    headers: HeaderMap,
) -> Response {
    usage_impl(state, uri.path(), headers, Some(&provider)).await
}

fn parse_provider(provider: &str) -> Option<UsageProvider> {
    match provider {
        "anthropic" => Some(UsageProvider::Anthropic),
        "openai" => Some(UsageProvider::OpenAi),
        "z-ai" => Some(UsageProvider::ZAi),
        "lefine" => Some(UsageProvider::Lefine),
        "gemini" => Some(UsageProvider::Gemini),
        "qwen" => Some(UsageProvider::Qwen),
        _ => None,
    }
}

async fn usage_impl(
    state: AppState,
    path: &str,
    headers: HeaderMap,
    selected: Option<&str>,
) -> Response {
    let claims = match crate::proxy::authenticate_client(&state, &headers) {
        Ok(claims) => claims,
        Err(response) => return *response,
    };
    let Ok((client, principal)) = crate::client_policy::bound_client(&claims) else {
        return error(
            StatusCode::FORBIDDEN,
            "subscription usage requires a managed-client token",
        );
    };
    if !crate::client_policy::request_evidence(client, ClientProtocol::Catalog, path, &headers) {
        return error(
            StatusCode::FORBIDDEN,
            "request evidence does not match the token's managed-client binding",
        );
    }

    let selected = match selected {
        Some(name) => match parse_provider(name) {
            Some(provider) => Some(provider),
            None => return error(StatusCode::NOT_FOUND, "unknown usage provider"),
        },
        None => None,
    };

    let providers = selected.map_or_else(|| UsageProvider::ALL.to_vec(), |one| vec![one]);
    let mut subscriptions = Vec::new();
    for provider in providers {
        if !authorized(&state, &claims, &headers, path, provider) {
            if selected.is_some() {
                return error(
                    StatusCode::FORBIDDEN,
                    "the client token is not authorized for this subscription provider",
                );
            }
            continue;
        }
        match cache::cached_or_probe(&state, &claims.sub, principal, provider).await {
            ProbeResult::Usage(usage) => subscriptions.push(*usage),
            ProbeResult::NotConfigured if selected.is_some() => {
                return error(
                    StatusCode::NOT_FOUND,
                    "the authorized usage provider is not configured",
                );
            }
            ProbeResult::NotConfigured => {}
        }
    }
    (
        StatusCode::OK,
        axum::Json(UsageEnvelope {
            schema_version: SCHEMA_VERSION,
            subscriptions,
        }),
    )
        .into_response()
}

fn authorized(
    state: &AppState,
    claims: &crate::token::TokenClaims,
    headers: &HeaderMap,
    path: &str,
    provider: UsageProvider,
) -> bool {
    if let Some(subscription) = provider.subscription() {
        return crate::client_policy::enforce_subscription_for_claims(
            state,
            claims,
            headers,
            subscription,
            ClientProtocol::Catalog,
            path,
        )
        .is_ok();
    }
    if provider == UsageProvider::Lefine {
        let Ok((client, _)) = crate::client_policy::bound_client(claims) else {
            return false;
        };
        return selected_lefine(state).is_some_and(|provider| provider.supports_client(client));
    }
    let Ok(Some(configured)) = crate::zai_coding_plan::resolve(state) else {
        return false;
    };
    crate::zai_coding_plan::authorize_catalog(&configured, claims, headers, path).is_ok()
}

#[cfg(test)]
async fn probe_oauth_subscription(
    state: &AppState,
    principal: &str,
    provider: UsageProvider,
) -> ProbeResult {
    let subscription = provider.subscription().expect("OAuth subscription");
    if state
        .subscription_cache
        .store_for_subscription(subscription, principal)
        .is_none()
    {
        return ProbeResult::NotConfigured;
    }
    let loaded = match state
        .subscription_cache
        .load_authoritative(subscription, principal)
        .await
    {
        Ok(Some(token)) => token,
        Ok(None) => return ProbeResult::NotConfigured,
        Err(_) => return ProbeResult::Usage(Box::new(credential_unavailable(provider))),
    };
    probe_oauth_loaded_at(state, principal, provider, subscription, loaded, None).await
}

async fn probe_oauth_loaded_at(
    state: &AppState,
    principal: &str,
    provider: UsageProvider,
    subscription: SubscriptionProvider,
    loaded: SubscriptionToken,
    refresh_url_override: Option<&str>,
) -> ProbeResult {
    if matches!(provider, UsageProvider::Gemini | UsageProvider::Qwen) {
        return ProbeResult::Usage(Box::new(live_limits_unavailable(provider)));
    }
    let now_ms = chrono::Utc::now().timestamp_millis();
    let Ok(token) = state
        .subscription_cache
        .get_fresh_loaded(&state.client, subscription, principal, loaded, now_ms)
        .await
    else {
        return ProbeResult::Usage(Box::new(credential_unavailable(provider)));
    };
    let metadata = safe_credential_metadata(state, subscription, principal);
    let probe = async |token: &SubscriptionToken| match provider {
        UsageProvider::Anthropic => probe_anthropic(state, token, &metadata).await,
        UsageProvider::OpenAi => probe_openai(state, token, &metadata).await,
        UsageProvider::ZAi
        | UsageProvider::Lefine
        | UsageProvider::Gemini
        | UsageProvider::Qwen => unreachable!(),
    };
    let first = probe(&token).await;
    if first.status != "authentication_rejected" {
        return ProbeResult::Usage(Box::new(first));
    }
    let refreshed = if let Some(token_url) = refresh_url_override {
        state
            .subscription_cache
            .refresh_rejected_at(
                &state.client,
                token_url,
                subscription,
                principal,
                token,
                now_ms,
            )
            .await
    } else {
        state
            .subscription_cache
            .refresh_rejected(&state.client, subscription, principal, token, now_ms)
            .await
    };
    let Some(refreshed) = refreshed else {
        return ProbeResult::Usage(Box::new(first));
    };
    ProbeResult::Usage(Box::new(probe(&refreshed).await))
}

fn credential_unavailable(provider: UsageProvider) -> SubscriptionUsage {
    let mut usage = empty_usage(provider);
    usage.state = UsageState::Unavailable;
    usage.status = "credential_unavailable".into();
    usage
}

fn safe_credential_metadata(
    state: &AppState,
    provider: SubscriptionProvider,
    principal: &str,
) -> SafeCredentialMetadata {
    if principal != crate::credential_recovery_store::PRIMARY_ACCOUNT {
        return SafeCredentialMetadata::default();
    }
    let Some(reader) = state
        .subscription_readers
        .iter()
        .find(|reader| reader.provider() == provider)
    else {
        return SafeCredentialMetadata::default();
    };
    let Ok(source) = reader.read_document_for_import() else {
        return SafeCredentialMetadata::default();
    };
    let Ok(document) = serde_json::from_str::<Value>(&source.document) else {
        return SafeCredentialMetadata::default();
    };
    match provider {
        SubscriptionProvider::Claude => SafeCredentialMetadata {
            plan: document
                .pointer("/claudeAiOauth/subscriptionType")
                .and_then(Value::as_str)
                .map(str::to_string),
            subscription_end: None,
        },
        SubscriptionProvider::Codex => {
            let claims = document
                .pointer("/tokens/id_token")
                .and_then(Value::as_str)
                .and_then(openai_claims);
            SafeCredentialMetadata {
                plan: claims
                    .as_ref()
                    .and_then(|claims| claims.get("chatgpt_plan_type"))
                    .and_then(Value::as_str)
                    .map(str::to_string),
                subscription_end: claims
                    .as_ref()
                    .and_then(|claims| claims.get("chatgpt_subscription_active_until"))
                    .and_then(Value::as_str)
                    .map(str::to_string),
            }
        }
        SubscriptionProvider::Gemini | SubscriptionProvider::Qwen => {
            SafeCredentialMetadata::default()
        }
    }
}

async fn probe_anthropic(
    state: &AppState,
    token: &SubscriptionToken,
    metadata: &SafeCredentialMetadata,
) -> SubscriptionUsage {
    let base = state
        .subscription_base_url
        .as_deref()
        .unwrap_or("https://api.anthropic.com")
        .trim_end_matches('/');
    let usage = send_anthropic(
        state,
        &format!("{base}/api/oauth/usage"),
        &token.access_token,
    )
    .await;
    let mut result = empty_usage(UsageProvider::Anthropic);
    match usage {
        VendorResponse::Json(value) => {
            if !recognizable_anthropic_usage(&value) {
                return unverified_usage(UsageProvider::Anthropic);
            }
            result.state = UsageState::Available;
            result.status = "available".into();
            result.windows = anthropic_windows(&value);
        }
        other => return vendor_failure(UsageProvider::Anthropic, &other),
    }
    match send_anthropic(
        state,
        &format!("{base}/api/oauth/profile"),
        &token.access_token,
    )
    .await
    {
        VendorResponse::Json(profile) => apply_anthropic_profile(&mut result, &profile),
        _ => result.status = "usage_available_profile_unverified".into(),
    }
    if result.plan.is_none() {
        result.plan.clone_from(&metadata.plan);
    }
    result
}

async fn send_anthropic(state: &AppState, url: &str, token: &str) -> VendorResponse {
    send_json(
        state
            .client
            .get(url)
            .bearer_auth(token)
            .header("anthropic-beta", "oauth-2025-04-20")
            .header("content-type", "application/json")
            .header("user-agent", crate::claude_identity::oauth_user_agent()),
    )
    .await
}

async fn probe_openai(
    state: &AppState,
    token: &SubscriptionToken,
    metadata: &SafeCredentialMetadata,
) -> SubscriptionUsage {
    let client = crate::upstream_client::subscription_client(
        &state.client,
        SubscriptionProvider::Codex,
        state.subscription_base_url.is_some(),
    );
    let base = state
        .subscription_base_url
        .as_deref()
        .unwrap_or("https://chatgpt.com/backend-api")
        .trim_end_matches('/')
        .trim_end_matches("/codex");
    let response = send_json(
        client
            .get(format!("{base}/wham/usage"))
            .bearer_auth(&token.access_token)
            .headers(crate::codex_identity::headers(token.account_id.as_deref())),
    )
    .await;
    match response {
        VendorResponse::Json(value) => {
            if !recognizable_openai_usage(&value) {
                return unverified_usage(UsageProvider::OpenAi);
            }
            let mut usage = normalize_openai(&value, token);
            if usage.plan.is_none() {
                usage.plan.clone_from(&metadata.plan);
            }
            if usage.subscription_end.is_none() {
                usage
                    .subscription_end
                    .clone_from(&metadata.subscription_end);
            }
            usage
        }
        other => vendor_failure(UsageProvider::OpenAi, &other),
    }
}

#[cfg(test)]
async fn probe_zai(state: &AppState) -> ProbeResult {
    let Ok(Some(provider)) = crate::zai_coding_plan::resolve(state) else {
        return ProbeResult::NotConfigured;
    };
    probe_zai_provider(state, &provider).await
}

async fn probe_zai_provider(
    state: &AppState,
    provider: &crate::providers::ResolvedProvider,
) -> ProbeResult {
    let Some(key) = provider.api_key.as_deref().filter(|key| !key.is_empty()) else {
        return ProbeResult::NotConfigured;
    };
    let origin = provider_origin(&provider.base_url);
    let quota = send_json(zai_request(
        state,
        &format!("{origin}/api/monitor/usage/quota/limit"),
        key,
    ))
    .await;
    let quota = match quota {
        VendorResponse::Json(value) => match zai_payload(value) {
            Ok(value) => value,
            Err(failure) => {
                return ProbeResult::Usage(Box::new(vendor_failure(UsageProvider::ZAi, &failure)));
            }
        },
        other => {
            return ProbeResult::Usage(Box::new(vendor_failure(UsageProvider::ZAi, &other)));
        }
    };

    // These official non-inference probes verify the remaining usage sources.
    // Their unrestricted bodies are deliberately discarded: only normalized,
    // named limits from the quota response are public.
    let mut partial = false;
    let now = chrono::Utc::now();
    let start = (now - chrono::Duration::days(1))
        .format("%Y-%m-%d %H:00:00")
        .to_string();
    let end = now.format("%Y-%m-%d %H:59:59").to_string();
    for path in ["model-usage", "tool-usage"] {
        let response = send_json(
            zai_request(state, &format!("{origin}/api/monitor/usage/{path}"), key)
                .query(&[("startTime", &start), ("endTime", &end)]),
        )
        .await;
        match response {
            VendorResponse::Json(value) => partial |= zai_payload(value).is_err(),
            _ => partial = true,
        }
    }
    ProbeResult::Usage(Box::new(normalize_zai(&quota, partial)))
}

fn selected_lefine(state: &AppState) -> Option<crate::providers::ResolvedProvider> {
    let named = state.provider_store.resolve("lefine").ok().flatten();
    if named
        .as_ref()
        .is_some_and(|provider| provider.kind == crate::providers::ProviderKind::Lefine)
    {
        return named;
    }
    let selected = state
        .provider_store
        .resolve(&state.openai_compatible.provider_name)
        .ok()
        .flatten()
        .filter(|provider| provider.kind == crate::providers::ProviderKind::Lefine);
    if selected.is_some() {
        return selected;
    }
    let candidates = state
        .provider_store
        .list()
        .ok()?
        .into_iter()
        .filter(|record| record.enabled && record.kind == crate::providers::ProviderKind::Lefine)
        .collect::<Vec<_>>();
    (candidates.len() == 1)
        .then(|| state.provider_store.resolve_record(&candidates[0]).ok())
        .flatten()
}

#[cfg(test)]
fn probe_lefine(state: &AppState) -> ProbeResult {
    if selected_lefine(state).is_none() {
        return ProbeResult::NotConfigured;
    }
    ProbeResult::Usage(Box::new(unavailable_lefine_usage()))
}

fn unavailable_lefine_usage() -> SubscriptionUsage {
    let mut usage = empty_usage(UsageProvider::Lefine);
    usage.state = UsageState::Unavailable;
    usage.status = "usage_source_unavailable".into();
    usage
}

fn live_limits_unavailable(provider: UsageProvider) -> SubscriptionUsage {
    let mut usage = empty_usage(provider);
    usage.status = "live_limits_unavailable".into();
    usage
}

fn zai_request(state: &AppState, url: &str, key: &str) -> reqwest::RequestBuilder {
    state
        .client
        .get(url)
        .header(reqwest::header::AUTHORIZATION, key)
}

fn provider_origin(base: &str) -> String {
    reqwest::Url::parse(base)
        .ok()
        .and_then(|url| {
            let host = url.host_str()?;
            let port = url
                .port()
                .map_or_else(String::new, |port| format!(":{port}"));
            Some(format!("{}://{host}{port}", url.scheme()))
        })
        .unwrap_or_else(|| base.trim_end_matches('/').to_string())
}

fn zai_payload(value: Value) -> Result<Value, VendorResponse> {
    crate::zai_coding_plan::accepted_non_inference_payload(value).map_err(|error| {
        use crate::zai_coding_plan::ZaiProbeFailureKind as Kind;
        match error.kind() {
            Kind::CredentialRejected => VendorResponse::AuthenticationRejected,
            Kind::RateLimited => VendorResponse::RateLimited(None),
            Kind::Unverified => VendorResponse::Unavailable,
        }
    })
}

async fn send_json(request: reqwest::RequestBuilder) -> VendorResponse {
    let Ok(response) = request.send().await else {
        return VendorResponse::Unavailable;
    };
    let status = response.status();
    let retry = crate::request_routing::retry_after_duration(response.headers())
        .map(|duration| duration.as_secs());
    if status == reqwest::StatusCode::UNAUTHORIZED || status == reqwest::StatusCode::FORBIDDEN {
        return VendorResponse::AuthenticationRejected;
    }
    if status == reqwest::StatusCode::TOO_MANY_REQUESTS {
        return VendorResponse::RateLimited(retry);
    }
    if !status.is_success() {
        return VendorResponse::Unavailable;
    }
    let Ok(bytes) = bounded_response_bytes(response, MAX_USAGE_BODY).await else {
        return VendorResponse::Malformed;
    };
    serde_json::from_slice(&bytes).map_or(VendorResponse::Malformed, VendorResponse::Json)
}

fn recognizable_anthropic_usage(value: &Value) -> bool {
    [
        "five_hour",
        "seven_day",
        "seven_day_sonnet",
        "seven_day_oauth_apps",
    ]
    .into_iter()
    .filter_map(|name| value.get(name).and_then(Value::as_object))
    .any(|window| window.contains_key("utilization") || window.contains_key("resets_at"))
}

fn recognizable_openai_usage(value: &Value) -> bool {
    value
        .get("rate_limit")
        .and_then(Value::as_object)
        .is_some_and(|value| !value.is_empty())
        || value
            .get("additional_rate_limits")
            .and_then(Value::as_array)
            .is_some_and(|value| !value.is_empty())
        || value
            .get("credits")
            .and_then(Value::as_object)
            .is_some_and(|value| !value.is_empty())
}

fn anthropic_windows(value: &Value) -> Vec<UsageWindow> {
    [
        ("five_hour", "five_hour"),
        ("seven_day", "seven_day"),
        ("seven_day_sonnet", "seven_day_sonnet"),
        ("seven_day_oauth_apps", "seven_day_oauth_apps"),
    ]
    .into_iter()
    .filter_map(|(name, key)| {
        let window = value.get(key)?.as_object()?;
        Some(window_from(
            name,
            window.get("utilization").and_then(Value::as_f64),
            window
                .get("resets_at")
                .and_then(Value::as_str)
                .map(str::to_string),
            None,
        ))
    })
    .collect()
}

fn apply_anthropic_profile(usage: &mut SubscriptionUsage, profile: &Value) {
    let organization = profile.get("organization").unwrap_or(profile);
    usage.status = organization
        .get("subscription_status")
        .and_then(Value::as_str)
        .unwrap_or("available")
        .to_string();
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

fn normalize_openai(value: &Value, token: &SubscriptionToken) -> SubscriptionUsage {
    let rate_limit = value.get("rate_limit").unwrap_or(&Value::Null);
    let mut result = empty_usage(UsageProvider::OpenAi);
    result.state = UsageState::Available;
    result.status = if rate_limit.get("limit_reached").and_then(Value::as_bool) == Some(true) {
        "limit_reached".into()
    } else {
        "available".into()
    };
    result.plan = value
        .get("plan_type")
        .and_then(Value::as_str)
        .map(str::to_string)
        .or_else(|| openai_claim(token, "chatgpt_plan_type"));
    result.subscription_end = openai_claim(token, "chatgpt_subscription_active_until");
    result.windows = codex_windows(rate_limit);
    result.additional_limits = value
        .get("additional_rate_limits")
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
        .filter_map(|limit| {
            let name = limit
                .get("limit_name")
                .or_else(|| limit.get("metered_feature"))
                .and_then(Value::as_str)?;
            Some(NamedLimit {
                name: name.to_string(),
                windows: codex_windows(limit.get("rate_limit").unwrap_or(&Value::Null)),
                used: None,
                limit: None,
            })
        })
        .collect();
    result.credits = value.get("credits").and_then(|credits| {
        let balance = credits.get("balance").and_then(|value| {
            value
                .as_str()
                .map(str::to_string)
                .or_else(|| value.as_f64().map(|n| n.to_string()))
        });
        let unlimited = credits.get("unlimited").and_then(Value::as_bool);
        let overage_limit_reached = credits
            .get("overage_limit_reached")
            .and_then(Value::as_bool);
        (balance.is_some() || unlimited.is_some() || overage_limit_reached.is_some()).then_some(
            Credits {
                balance,
                unlimited,
                overage_limit_reached,
            },
        )
    });
    result
}

fn codex_windows(value: &Value) -> Vec<UsageWindow> {
    [
        ("primary", "primary_window"),
        ("secondary", "secondary_window"),
    ]
    .into_iter()
    .filter_map(|(name, key)| {
        let window = value.get(key)?;
        let resets_at = window
            .get("reset_at")
            .and_then(Value::as_i64)
            .and_then(|seconds| chrono::DateTime::from_timestamp(seconds, 0))
            .map(|time| time.to_rfc3339());
        Some(window_from(
            name,
            window.get("used_percent").and_then(Value::as_f64),
            resets_at,
            window.get("limit_window_seconds").and_then(Value::as_u64),
        ))
    })
    .collect()
}

fn openai_claim(token: &SubscriptionToken, key: &str) -> Option<String> {
    openai_claims(&token.access_token)?
        .get(key)
        .and_then(Value::as_str)
        .map(str::to_string)
}

fn openai_claims(token: &str) -> Option<Value> {
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

fn normalize_zai(value: &Value, partial: bool) -> SubscriptionUsage {
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

fn window_from(
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

fn empty_usage(provider: UsageProvider) -> SubscriptionUsage {
    SubscriptionUsage {
        provider,
        state: UsageState::Unverified,
        status: "unverified".into(),
        plan: None,
        windows: Vec::new(),
        additional_limits: Vec::new(),
        credits: None,
        subscription_end: None,
        trial_end: None,
        subscription_created: None,
        retry_after_seconds: None,
    }
}

fn unverified_usage(provider: UsageProvider) -> SubscriptionUsage {
    let mut result = empty_usage(provider);
    result.status = "usage_response_unverified".into();
    result
}

fn vendor_failure(provider: UsageProvider, failure: &VendorResponse) -> SubscriptionUsage {
    let mut result = empty_usage(provider);
    match failure {
        VendorResponse::AuthenticationRejected => {
            result.state = UsageState::Unavailable;
            result.status = "authentication_rejected".into();
        }
        VendorResponse::RateLimited(retry) => {
            result.state = UsageState::Unavailable;
            result.status = "rate_limited".into();
            result.retry_after_seconds = *retry;
        }
        VendorResponse::Malformed => result.status = "malformed_vendor_response".into(),
        VendorResponse::Unavailable => {
            result.state = UsageState::Unavailable;
            result.status = "temporarily_unavailable".into();
        }
        VendorResponse::Json(_) => unreachable!(),
    }
    result
}

fn error(status: StatusCode, message: &str) -> Response {
    crate::proxy::error_response(status, "subscription_usage_error", message)
}

#[path = "subscription_usage_cache.rs"]
mod cache;

#[cfg(test)]
#[path = "subscription_usage_tests.rs"]
mod tests;

#[cfg(test)]
#[path = "subscription_usage_http_tests.rs"]
mod http_tests;
