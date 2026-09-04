//! Credential-generation-bound caching for subscription usage probes.

use std::collections::HashMap;
use std::sync::{Mutex, OnceLock};
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
    let prepared = match prepare_probe(state, principal, provider).await {
        Ok(prepared) => prepared,
        Err(result) => return result,
    };
    let key = CacheKey {
        subject: subject.to_string(),
        provider,
        generation: probe_generation(state, &prepared),
    };
    if let Some(value) = CACHE
        .get_or_init(Default::default)
        .lock()
        .ok()
        .and_then(|mut cache| {
            cache.retain(|_, entry| entry.expires > Instant::now());
            cache.get(&key).map(|entry| entry.value.clone())
        })
    {
        return ProbeResult::Usage(Box::new(value));
    }
    let result = match prepared {
        PreparedProbe::OAuth {
            subscription,
            token,
        } => probe_oauth_loaded_at(state, principal, provider, subscription, token, None).await,
        PreparedProbe::ZAi(provider) => probe_zai_provider(state, &provider).await,
        PreparedProbe::Lefine(_) => ProbeResult::Usage(Box::new(unavailable_lefine_usage())),
    };
    if let ProbeResult::Usage(value) = &result {
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
            cache.insert(
                key,
                CacheEntry {
                    value: value.as_ref().clone(),
                    expires: Instant::now() + ttl.max(Duration::from_secs(30)),
                },
            );
        }
    }
    result
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
