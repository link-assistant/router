//! Shared onboarding lifecycle for provider adapters.
//!
//! Existing CLI and serving entry points retain their behavior. This contract
//! composes their durable credential acceptance, refresh, catalog and cooldown
//! components for new adapters and the onboarding conformance suite. It does
//! not grant client entitlements; final dispatch must still check client policy.

use std::path::{Path, PathBuf};
use std::sync::Arc;
use std::time::Duration;

use crate::account_http::EgressProxy;
use crate::accounts::{AccountRouter, ObservedLimits, UpstreamObservation};
use crate::model_catalog::CatalogRecord;
use crate::pool_failover::RetryReason;
use crate::subscription::{SubscriptionProvider, SubscriptionReader, SubscriptionToken};
use crate::upstream_guard::{GuardedResolver, NetworkPolicy};

/// Login mechanisms an adapter explicitly supports.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum LoginFlow {
    /// OAuth device code with bounded polling.
    DeviceCode,
    /// OAuth PKCE with a local browser callback.
    Loopback,
    /// OAuth PKCE with a pasted authorization code.
    AuthorizationCode,
    /// Secure API-key input; no OAuth refresh is necessary.
    ApiKey,
    /// Authorization initiated by the vendor's own CLI.
    VendorCli,
}

/// Token and catalog destinations, explicit so tests need no vendor access.
#[derive(Debug, Clone)]
pub struct ConnectorEndpoints {
    /// OAuth token endpoint.
    pub token_url: String,
    /// Base preceding the provider-specific model-list path.
    pub catalog_base: String,
}

impl ConnectorEndpoints {
    /// Official endpoints for an existing subscription provider.
    #[must_use]
    pub fn for_provider(provider: SubscriptionProvider) -> Self {
        Self {
            token_url: crate::refresh::provider_token_url(provider).to_string(),
            catalog_base: if provider == SubscriptionProvider::Gemini {
                "https://generativelanguage.googleapis.com".into()
            } else {
                provider.default_base_url().into()
            },
        }
    }
}

/// Credential-bearing HTTP transport with explicit network and egress policy.
///
/// Host literals are checked before a request is built; guarded DNS checks
/// resolved addresses at dial time. A remote proxy resolves destinations
/// itself and must enforce its own equivalent DNS policy.
#[derive(Clone)]
pub struct ConnectorTransport {
    policy: NetworkPolicy,
    client: reqwest::Client,
}

impl ConnectorTransport {
    /// Build a bounded, redirect-free client, honoring the configured proxy.
    ///
    /// # Errors
    /// Returns a secret-free failure if the proxy or client cannot be built.
    pub fn new(policy: NetworkPolicy, proxy: Option<&EgressProxy>) -> Result<Self, String> {
        let mut builder = crate::upstream_client::upstream_client_builder()
            .timeout(Duration::from_secs(120))
            .dns_resolver(Arc::new(GuardedResolver::new(policy)));
        if let Some(proxy) = proxy {
            builder = builder.no_proxy().proxy(proxy.resolve()?);
        }
        let client = builder
            .build()
            .map_err(|_| "could not initialize provider connector transport".to_string())?;
        Ok(Self { policy, client })
    }

    /// Check a destination before attaching credentials or dialing.
    ///
    /// # Errors
    /// Invalid/non-HTTP destinations, embedded credentials, or refused hosts.
    pub fn check_url(&self, destination: &str) -> Result<(), String> {
        let url = reqwest::Url::parse(destination)
            .map_err(|_| "invalid provider connector destination".to_string())?;
        if !matches!(url.scheme(), "http" | "https")
            || !url.username().is_empty()
            || url.password().is_some()
        {
            return Err(
                "provider connector destinations require HTTP(S) without URL credentials".into(),
            );
        }
        self.policy
            .check_base_url(destination)
            .map_err(|error| error.to_string())
    }

    /// Build an upstream request after validating its destination.
    ///
    /// # Errors
    /// The destination fails [`Self::check_url`]. Redirects are never followed.
    pub fn request(
        &self,
        method: reqwest::Method,
        destination: &str,
    ) -> Result<reqwest::RequestBuilder, String> {
        self.check_url(destination)?;
        Ok(self.client.request(method, destination))
    }
}

/// The lifecycle every onboarded adapter must implement.
///
/// Native flow initiation produces a vendor credential document; completion
/// is the shared durable acceptance boundary. Associated types let API-key
/// adapters use their own identity, encrypted store and quota state rather
/// than adopt an OAuth subscription format. See `docs/providers/onboarding.md`
/// for the terms, client-policy, test-tier and model-truth requirements.
#[async_trait::async_trait]
pub trait ProviderConnector: Send + Sync {
    /// Identity from the adapter's existing provider registry.
    type Provider: Copy + Send + Sync;

    /// Loaded authorization material; API keys need no refresh token.
    type Credential: Send + Sync;

    /// Catalog record retaining exact IDs, metadata and provenance.
    type CatalogEntry: Send;

    /// Existing cooldown/pause state for this credential class.
    type QuotaState: Sync;

    /// Provider identity; protocol compatibility grants no entitlements.
    fn provider(&self) -> Self::Provider;

    /// Supported initiation mechanisms, with no implicit fallback.
    fn login_flows(&self) -> &'static [LoginFlow];

    /// Validate and persist completed login material, preserving working
    /// credentials on rejection. OAuth adapters accept a fresh native-login
    /// document; copied external credentials must use the existing import
    /// path, which never spends an externally owned refresh link.
    async fn complete_login(&self, document: &str) -> Result<PathBuf, String>;

    /// Load the authoritative store, refreshing expiring credentials before
    /// expiry and persisting successors before return. API-key adapters load
    /// their encrypted store and explicitly document that refresh is unnecessary.
    async fn fresh_token(&self, now_ms: i64) -> Result<Self::Credential, String>;

    /// Fetch the authenticated catalog with exact IDs and vendor metadata.
    async fn catalog(&self, token: &Self::Credential) -> Result<Vec<Self::CatalogEntry>, String>;

    /// Extract quota signals into Router's existing cooldown and pause states.
    fn observe_upstream(
        &self,
        router: &Self::QuotaState,
        observation: &UpstreamObservation<'_>,
    ) -> Result<ObservedLimits, String>;

    /// Classify a status using Router's current pre-first-byte retry policy.
    fn classify_error(&self, status: u16) -> Option<RetryReason>;
}

/// Adapter over the existing subscription lifecycle components.
pub struct SubscriptionConnector {
    reader: SubscriptionReader,
    data_dir: PathBuf,
    cache: crate::refresh::TokenCache,
    transport: ConnectorTransport,
    endpoints: ConnectorEndpoints,
}

impl SubscriptionConnector {
    /// Construct one account adapter with explicit endpoints and transport.
    ///
    /// # Errors
    /// Refuses unsafe destinations before any credentials are read or sent.
    pub fn new(
        provider: SubscriptionProvider,
        home: impl AsRef<Path>,
        data_dir: impl AsRef<Path>,
        transport: ConnectorTransport,
        endpoints: ConnectorEndpoints,
    ) -> Result<Self, String> {
        transport.check_url(&endpoints.token_url)?;
        transport.check_url(&endpoints.catalog_base)?;
        let reader = SubscriptionReader::new(provider, home.as_ref());
        let cache = crate::refresh::TokenCache::registered_for(
            std::slice::from_ref(&reader),
            data_dir.as_ref(),
        );
        Ok(Self {
            reader,
            data_dir: data_dir.as_ref().to_path_buf(),
            cache,
            transport,
            endpoints,
        })
    }

    /// The checked transport used for token, catalog and inference requests.
    #[must_use]
    pub const fn transport(&self) -> &ConnectorTransport {
        &self.transport
    }
}

#[async_trait::async_trait]
impl ProviderConnector for SubscriptionConnector {
    type Provider = SubscriptionProvider;
    type Credential = SubscriptionToken;
    type CatalogEntry = CatalogRecord;
    type QuotaState = AccountRouter;

    fn provider(&self) -> SubscriptionProvider {
        self.reader.provider()
    }

    fn login_flows(&self) -> &'static [LoginFlow] {
        match self.provider() {
            SubscriptionProvider::Claude => &[LoginFlow::AuthorizationCode],
            SubscriptionProvider::Codex => &[LoginFlow::DeviceCode, LoginFlow::Loopback],
            SubscriptionProvider::Gemini | SubscriptionProvider::Qwen => &[LoginFlow::VendorCli],
        }
    }

    async fn complete_login(&self, document: &str) -> Result<PathBuf, String> {
        crate::credential_acceptance::accept_candidate_with_client(
            &self.data_dir,
            self.provider(),
            document,
            &self.transport.client,
            Some(&self.endpoints.token_url),
            Some(&self.endpoints.catalog_base),
        )
        .await
        .map_err(|error| error.to_string())?
        .promote_replacement(&self.reader, &self.data_dir)
        .await
        .map_err(|error| error.to_string())
    }

    async fn fresh_token(&self, now_ms: i64) -> Result<SubscriptionToken, String> {
        self.cache
            .get_fresh_registered_at(
                &self.transport.client,
                &self.endpoints.token_url,
                self.provider(),
                crate::credential_recovery_store::PRIMARY_ACCOUNT,
                now_ms,
            )
            .await
    }

    async fn catalog(&self, token: &SubscriptionToken) -> Result<Vec<CatalogRecord>, String> {
        crate::model_catalog::fetch_provider_catalog_records(
            &self.transport.client,
            self.provider(),
            token,
            Some(&self.endpoints.catalog_base),
        )
        .await
    }

    fn observe_upstream(
        &self,
        router: &AccountRouter,
        observation: &UpstreamObservation<'_>,
    ) -> Result<ObservedLimits, String> {
        if router.provider() != self.provider() {
            return Err("provider connector observation belongs to another pool".into());
        }
        Ok(router.observe_upstream(&UpstreamObservation {
            retry_after: observation
                .retry_after
                .or_else(|| crate::request_routing::retry_after_duration(observation.headers)),
            ..*observation
        }))
    }

    fn classify_error(&self, status: u16) -> Option<RetryReason> {
        crate::pool_failover::classify_status(status)
    }
}
