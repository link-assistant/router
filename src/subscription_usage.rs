use axum::extract::{OriginalUri, Path, State};
use axum::http::{HeaderMap, StatusCode};
use axum::response::{IntoResponse, Response};
#[cfg(test)]
use base64::Engine as _;
use bytes::{Bytes, BytesMut};
use futures_util::StreamExt as _;
use serde_json::Value;
use std::collections::{BTreeMap, BTreeSet};

use crate::app_state::AppState;
use crate::client_policy::ClientProtocol;
use crate::subscription::{SubscriptionProvider, SubscriptionToken};

const SCHEMA_VERSION: u8 = 1;
pub(crate) const MAX_USAGE_BODY: usize = 2 * 1024 * 1024;

#[path = "subscription_usage_types.rs"]
mod types;
pub use types::{
    Credits, ExtraUsage, NamedLimit, SpendControl, SpendLimit, SubscriptionUsage, UsageEnvelope,
    UsagePool, UsageProvider, UsageState, UsageWindow,
};

#[path = "subscription_usage_normalize.rs"]
mod normalize;
#[cfg(test)]
use normalize::{anthropic_windows, openai_claim, window_from};
use normalize::{
    apply_anthropic_profile, empty_usage, normalize_anthropic, normalize_openai, normalize_zai,
    openai_claims, recognizable_anthropic_usage, recognizable_openai_usage,
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
    let selected = match selected {
        Some(name) => match parse_provider(name) {
            Some(provider) => Some(provider),
            None => return error(StatusCode::NOT_FOUND, "unknown usage provider"),
        },
        None => None,
    };
    if claims.is_admin() {
        return administrative_usage(state, &claims.sub, selected).await;
    }
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

async fn administrative_usage(
    state: AppState,
    subject: &str,
    selected: Option<UsageProvider>,
) -> Response {
    let providers = selected.map_or_else(|| UsageProvider::ALL.to_vec(), |one| vec![one]);
    let mut subscriptions = Vec::new();
    for provider in providers {
        if let Some(usage) = administrative_provider_usage(&state, subject, provider).await {
            subscriptions.push(usage);
        } else if selected.is_some() {
            return error(
                StatusCode::NOT_FOUND,
                "the requested subscription provider is not configured",
            );
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

async fn administrative_provider_usage(
    state: &AppState,
    subject: &str,
    provider: UsageProvider,
) -> Option<SubscriptionUsage> {
    let pooled_accounts = provider.subscription().and_then(|subscription| {
        state
            .account_router
            .as_ref()
            .filter(|router| router.provider() == subscription)
            .map(crate::accounts::AccountRouter::subscription_readers)
    });
    if let Some(accounts) = pooled_accounts {
        let configured = accounts.len();
        let mut samples = Vec::with_capacity(configured);
        for (principal, _) in accounts {
            let sample = match cache::cached_or_probe(state, subject, &principal, provider).await {
                ProbeResult::Usage(usage) => Some(*usage),
                ProbeResult::NotConfigured => None,
            };
            samples.push(sample);
        }
        return Some(aggregate_pool_usage(provider, configured, &samples));
    }

    match cache::cached_or_probe(
        state,
        subject,
        crate::credential_recovery_store::PRIMARY_ACCOUNT,
        provider,
    )
    .await
    {
        ProbeResult::Usage(usage) => Some(*usage),
        ProbeResult::NotConfigured => None,
    }
}

#[derive(Default)]
struct AggregateWindow {
    used: Vec<f64>,
    remaining: Vec<f64>,
    resets: BTreeSet<String>,
    contributors: usize,
}

fn aggregate_pool_usage(
    provider: UsageProvider,
    configured: usize,
    samples: &[Option<SubscriptionUsage>],
) -> SubscriptionUsage {
    let contributing = samples
        .iter()
        .flatten()
        .filter(|sample| sample.state == UsageState::Available)
        .count();
    let mut windows: BTreeMap<(String, Option<u64>), AggregateWindow> = BTreeMap::new();
    for sample in samples.iter().flatten() {
        if sample.state != UsageState::Available {
            continue;
        }
        for window in &sample.windows {
            let aggregate = windows
                .entry((window.name.clone(), window.window_seconds))
                .or_default();
            let supplied_percentage =
                window.used_percentage.is_some() || window.remaining_percentage.is_some();
            if let Some(used) = window.used_percentage {
                aggregate.used.push(used);
            }
            if let Some(remaining) = window.remaining_percentage {
                aggregate.remaining.push(remaining);
            }
            if let Some(reset) = &window.resets_at {
                aggregate.resets.insert(reset.clone());
            }
            aggregate.contributors += usize::from(supplied_percentage);
        }
    }

    let windows = windows
        .into_iter()
        .map(|((name, window_seconds), aggregate)| {
            let reset_times = aggregate.resets.into_iter().collect::<Vec<_>>();
            let resets_at = (reset_times.len() == 1).then(|| reset_times[0].clone());
            let reset_times = if reset_times.len() > 1 {
                reset_times
            } else {
                Vec::new()
            };
            UsageWindow {
                name,
                used_percentage: mean(&aggregate.used),
                remaining_percentage: mean(&aggregate.remaining),
                resets_at,
                window_seconds,
                contributors: Some(aggregate.contributors),
                reset_times,
            }
        })
        .collect();
    let mut usage = empty_usage(provider);
    usage.state = if contributing == 0 {
        UsageState::Unavailable
    } else {
        UsageState::Available
    };
    usage.status = if contributing == 0 {
        "all_accounts_unavailable"
    } else if contributing < configured {
        "partial"
    } else {
        "pooled"
    }
    .into();
    usage.pool = Some(UsagePool {
        configured_accounts: configured,
        contributing_accounts: contributing,
        unavailable_accounts: configured.saturating_sub(contributing),
    });
    usage.windows = windows;
    usage
}

fn mean(values: &[f64]) -> Option<f64> {
    let (sum, count) = values
        .iter()
        .fold((0.0, 0.0), |(sum, count), value| (sum + value, count + 1.0));
    (count > 0.0).then_some(sum / count)
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
    let mut result = match usage {
        VendorResponse::Json(value) => {
            if !recognizable_anthropic_usage(&value) {
                return unverified_usage(UsageProvider::Anthropic);
            }
            normalize_anthropic(&value)
        }
        other => return vendor_failure(UsageProvider::Anthropic, &other),
    };
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
    let payload =
        crate::zai_coding_plan::accepted_non_inference_payload(value).map_err(|error| {
            use crate::zai_coding_plan::ZaiProbeFailureKind as Kind;
            match error.kind() {
                Kind::CredentialRejected => VendorResponse::AuthenticationRejected,
                Kind::RateLimited => VendorResponse::RateLimited(None),
                Kind::Unverified => VendorResponse::Unavailable,
            }
        })?;
    payload
        .get("limits")
        .and_then(Value::as_array)
        .is_some_and(|limits| !limits.is_empty())
        .then_some(payload)
        .ok_or(VendorResponse::Unavailable)
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

#[cfg(test)]
#[path = "subscription_usage_current_tests.rs"]
mod current_tests;
