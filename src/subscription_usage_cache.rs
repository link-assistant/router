//! Credential-generation-bound caching for subscription usage probes.

use std::collections::HashMap;
use std::sync::{Arc, Mutex, OnceLock};
use std::time::{Duration, Instant};

use sha2::{Digest as _, Sha256};

use super::{
    AppState, ProbeResult, SubscriptionProvider, SubscriptionToken, SubscriptionUsage,
    UsageProvider, credential_unavailable, probe_oauth_loaded_at, probe_zai_provider,
    selected_lefine, unavailable_lefine_usage,
};

const STANDARD_CACHE_TTL: Duration = Duration::from_secs(3 * 60);
const ANTHROPIC_CACHE_TTL: Duration = Duration::from_secs(13 * 60);

#[derive(Clone)]
struct CacheEntry {
    value: SubscriptionUsage,
    expires: Instant,
}

#[derive(Clone, Debug, Eq, Hash, PartialEq)]
struct CacheKey {
    subject: String,
    provider: UsageProvider,
    /// Hash of the active credential and provider endpoint/configuration.
    generation: String,
}

static CACHE: OnceLock<Mutex<HashMap<CacheKey, CacheEntry>>> = OnceLock::new();
static IN_FLIGHT: OnceLock<Mutex<HashMap<CacheKey, Arc<tokio::sync::Mutex<()>>>>> = OnceLock::new();

enum PreparedProbe {
    OAuth {
        subscription: SubscriptionProvider,
        token: SubscriptionToken,
    },
    ZAi(crate::providers::ResolvedProvider),
    Lefine(crate::providers::ResolvedProvider),
}

pub(super) async fn cached_or_probe(
    state: &AppState,
    subject: &str,
    principal: &str,
    provider: UsageProvider,
) -> ProbeResult {
    cached_or_probe_at(state, subject, principal, provider, None).await
}

pub(super) async fn cached_or_probe_at(
    state: &AppState,
    subject: &str,
    principal: &str,
    provider: UsageProvider,
    refresh_url_override: Option<&str>,
) -> ProbeResult {
    loop {
        let prepared = match prepare_probe(state, principal, provider).await {
            Ok(prepared) => prepared,
            Err(result) => return result,
        };
        let key = cache_key(state, subject, provider, &prepared);
        if let Some(value) = cached_value(&key) {
            return ProbeResult::Usage(Box::new(value));
        }
        let gate = IN_FLIGHT
            .get_or_init(Default::default)
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner)
            .entry(key.clone())
            .or_insert_with(|| Arc::new(tokio::sync::Mutex::new(())))
            .clone();
        let guard = gate.lock().await;

        // A preceding caller can refresh the credential while this caller is
        // waiting. Rebind to the current generation instead of probing the
        // predecessor after the first result was already published.
        let prepared = match prepare_probe(state, principal, provider).await {
            Ok(prepared) => prepared,
            Err(result) => {
                drop(guard);
                release_gate(&key, &gate);
                return result;
            }
        };
        let current_key = cache_key(state, subject, provider, &prepared);
        if current_key != key {
            drop(guard);
            release_gate(&key, &gate);
            continue;
        }
        if let Some(value) = cached_value(&key) {
            drop(guard);
            release_gate(&key, &gate);
            return ProbeResult::Usage(Box::new(value));
        }

        let result = run_probe(state, principal, provider, prepared, refresh_url_override).await;
        cache_result(state, subject, principal, provider, &key, &result).await;
        drop(guard);
        release_gate(&key, &gate);
        return result;
    }
}

fn cache_key(
    state: &AppState,
    subject: &str,
    provider: UsageProvider,
    prepared: &PreparedProbe,
) -> CacheKey {
    CacheKey {
        subject: subject.to_string(),
        provider,
        generation: probe_generation(state, prepared),
    }
}

fn cached_value(key: &CacheKey) -> Option<SubscriptionUsage> {
    CACHE
        .get_or_init(Default::default)
        .lock()
        .ok()
        .and_then(|mut cache| {
            cache.retain(|_, entry| entry.expires > Instant::now());
            cache.get(&key).map(|entry| entry.value.clone())
        })
}

fn release_gate(key: &CacheKey, gate: &Arc<tokio::sync::Mutex<()>>) {
    let mut in_flight = IN_FLIGHT
        .get_or_init(Default::default)
        .lock()
        .unwrap_or_else(std::sync::PoisonError::into_inner);
    if in_flight
        .get(key)
        .is_some_and(|current| Arc::ptr_eq(current, gate))
    {
        in_flight.remove(key);
    }
}

async fn run_probe(
    state: &AppState,
    principal: &str,
    provider: UsageProvider,
    prepared: PreparedProbe,
    refresh_url_override: Option<&str>,
) -> ProbeResult {
    match prepared {
        PreparedProbe::OAuth {
            subscription,
            token,
        } => {
            probe_oauth_loaded_at(
                state,
                principal,
                provider,
                subscription,
                token,
                refresh_url_override,
            )
            .await
        }
        PreparedProbe::ZAi(provider) => probe_zai_provider(state, &provider).await,
        PreparedProbe::Lefine(_) => ProbeResult::Usage(Box::new(unavailable_lefine_usage())),
    }
}

async fn cache_result(
    state: &AppState,
    subject: &str,
    principal: &str,
    provider: UsageProvider,
    key: &CacheKey,
    result: &ProbeResult,
) {
    if let ProbeResult::Usage(value) = &result {
        // A rejected access token may have been refreshed and durably replaced
        // during the probe. Bind the cached result to the successor now stored
        // authoritatively, not to the predecessor prepared above.
        let insert_key = prepare_probe(state, principal, provider)
            .await
            .ok()
            .map_or_else(
                || key.clone(),
                |current| CacheKey {
                    subject: subject.to_string(),
                    provider,
                    generation: probe_generation(state, &current),
                },
            );
        let ttl = value.retry_after_seconds.map_or_else(
            || match provider {
                UsageProvider::Anthropic => ANTHROPIC_CACHE_TTL,
                UsageProvider::OpenAi | UsageProvider::ZAi | UsageProvider::Lefine => {
                    STANDARD_CACHE_TTL
                }
            },
            Duration::from_secs,
        );
        if let Ok(mut cache) = CACHE.get_or_init(Default::default).lock() {
            let now = Instant::now();
            let ttl = crate::request_routing::bounded_retry_after(ttl.max(Duration::from_secs(30)));
            cache.insert(
                insert_key,
                CacheEntry {
                    value: value.as_ref().clone(),
                    expires: now.checked_add(ttl).unwrap_or(now),
                },
            );
        }
    }
}

async fn prepare_probe(
    state: &AppState,
    principal: &str,
    provider: UsageProvider,
) -> Result<PreparedProbe, ProbeResult> {
    if let Some(subscription) = provider.subscription() {
        if state
            .subscription_cache
            .store_for_subscription(subscription, principal)
            .is_none()
        {
            return Err(ProbeResult::NotConfigured);
        }
        return match state
            .subscription_cache
            .load_authoritative(subscription, principal)
            .await
        {
            Ok(Some(token)) => Ok(PreparedProbe::OAuth {
                subscription,
                token,
            }),
            Ok(None) => Err(ProbeResult::NotConfigured),
            Err(_) => Err(ProbeResult::Usage(Box::new(credential_unavailable(
                provider,
            )))),
        };
    }
    match provider {
        UsageProvider::ZAi => crate::zai_coding_plan::resolve(state)
            .ok()
            .flatten()
            .filter(|provider| {
                provider
                    .api_key
                    .as_deref()
                    .is_some_and(|key| !key.is_empty())
            })
            .map(PreparedProbe::ZAi)
            .ok_or(ProbeResult::NotConfigured),
        UsageProvider::Lefine => selected_lefine(state)
            .map(PreparedProbe::Lefine)
            .ok_or(ProbeResult::NotConfigured),
        UsageProvider::Anthropic | UsageProvider::OpenAi => unreachable!(),
    }
}

fn probe_generation(state: &AppState, prepared: &PreparedProbe) -> String {
    fn field(hasher: &mut Sha256, value: &str) {
        hasher.update(value.len().to_le_bytes());
        hasher.update(value.as_bytes());
    }

    let mut hasher = Sha256::new();
    match prepared {
        PreparedProbe::OAuth {
            subscription,
            token,
        } => {
            hasher.update(crate::refresh::credential_fingerprint(token));
            field(&mut hasher, subscription.as_str());
            field(
                &mut hasher,
                state.subscription_base_url.as_deref().unwrap_or_default(),
            );
        }
        PreparedProbe::ZAi(provider) | PreparedProbe::Lefine(provider) => {
            field(&mut hasher, &provider.name);
            field(&mut hasher, provider.kind.as_str());
            field(&mut hasher, &provider.base_url);
            field(&mut hasher, provider.api_key.as_deref().unwrap_or_default());
            field(
                &mut hasher,
                provider.default_model.as_deref().unwrap_or_default(),
            );
            for model in &provider.models {
                field(&mut hasher, model);
            }
            for client in &provider.supported_clients {
                field(&mut hasher, client);
            }
        }
    }
    hex::encode(hasher.finalize())
}
