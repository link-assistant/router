//! Shared state used by HTTP route handlers.

use std::sync::Arc;

use log_lazy::LogLazy;
use reqwest::Client;

use crate::accounts::AccountRouter;
use crate::config::UpstreamProvider;
use crate::gonka::GonkaConfig;
use crate::oauth::OAuthProvider;
use crate::providers::{OpenAICompatibleConfig, ProviderStore};
use crate::token::TokenManager;

/// Shared application state accessible by all route handlers.
#[derive(Clone)]
pub struct AppState {
    /// HTTP client for upstream requests.
    pub client: Client,
    /// Token manager for validating custom tokens.
    pub token_manager: TokenManager,
    /// OAuth provider for obtaining upstream credentials (legacy single-account).
    pub oauth_provider: OAuthProvider,
    /// Multi-account router (when configured). When `None`, the legacy
    /// `oauth_provider` is used directly.
    pub account_router: Option<AccountRouter>,
    /// Subscription credential reader for vendor OAuth providers
    /// (Codex/Gemini/Qwen). `None` for non-subscription upstreams.
    pub subscription_reader: Option<crate::subscription::SubscriptionReader>,
    /// Optional subscription API base URL override.
    ///
    /// Production leaves this unset and uses the provider's canonical URL;
    /// integration tests use it to drive the real forwarding path against a
    /// local deterministic upstream.
    pub subscription_base_url: Option<String>,
    /// Credential readers for every discoverable vendor subscription.
    pub subscription_readers: Vec<crate::subscription::SubscriptionReader>,
    /// Last known live model catalogs, refreshed independently in the background.
    pub model_catalogs: Arc<crate::model_catalog::ModelCatalogCache>,
    /// In-memory cache of refreshed subscription tokens (Codex/Gemini/Qwen).
    pub subscription_cache: Arc<crate::refresh::TokenCache>,
    /// Base URL for the upstream Anthropic API.
    pub upstream_base_url: String,
    /// Selected upstream inference provider.
    pub upstream_provider: UpstreamProvider,
    /// Gonka provider configuration when selected.
    pub gonka: Option<GonkaConfig>,
    /// Upstream model used when an Anthropic-dialect request is bridged to a
    /// non-Anthropic upstream. `None` selects one from the live catalog using
    /// [`AppState::bridge_model_policy`].
    pub bridge_model: Option<String>,
    /// How a bridge model is chosen from the live catalog when
    /// [`AppState::bridge_model`] is unset.
    pub bridge_model_policy: crate::bridge_selection::BridgeModelPolicy,
    /// Crater `ForgeFed` task provider when selected.
    pub crater: Option<Arc<dyn crate::crater::TaskProvider>>,
    /// Boot-time generic OpenAI-compatible provider config.
    pub openai_compatible: OpenAICompatibleConfig,
    /// Persisted provider records with encrypted upstream secrets.
    pub provider_store: ProviderStore,
    /// Lazy logger for verbose output.
    pub logger: LogLazy,
    /// Maximum request body accepted by raw proxy surfaces.
    pub max_proxy_request_bytes: usize,
    /// Admin credential state: the optional deploy-time key plus the
    /// first-visitor claim of the admin UI (see [`crate::admin`]).
    pub admin: Arc<crate::admin::AdminClaim>,
    /// Optional flat bootstrap admin key (Bearer) accepted by the admin
    /// endpoints alongside admin-scoped `la_sk_…` tokens.
    pub admin_key: Option<String>,
    /// Whether the admin endpoints stay open to unauthenticated callers.
    /// Defaults to `false`; set only by an explicit `--allow-anonymous-admin`.
    pub allow_anonymous_admin: bool,
    /// Live metrics counter handle.
    pub metrics: Arc<crate::metrics::Metrics>,
    /// Append-only per-token audit log (disabled unless a path is configured).
    pub audit: Arc<crate::audit::AuditLog>,
    /// Redacted bounded log of complete HTTP exchanges.
    pub request_log: Arc<crate::request_log::RequestLog>,
    /// Public base URL for `ActivityPub` actor documents.
    pub activitypub_actor_base_url: String,
    /// Public key PEM advertised by the `ActivityPub` actor.
    pub activitypub_public_key_pem: String,
    /// Optional MPP charge settings for OpenAI-compatible endpoints.
    pub mpp: crate::mpp::MppConfig,
    /// Registry of in-flight interactive login sessions (`/api/management/login`).
    pub login_manager: crate::login::LoginManager,
    /// Optional GitHub credential proxy and destructive-operation policy.
    pub github: crate::github_proxy::GitHubProxyConfig,
}

impl AppState {
    /// Tell the token cache where every subscription credential lives, and
    /// which vendor client may rotate one it cannot.
    ///
    /// Called once before the first request is served, so a refresh on the
    /// serving path can re-read and write back the same file the catalog
    /// poller does. A rotation that only ever lives in memory is lost at
    /// restart and leaves a spent refresh token on disk (issue #239).
    ///
    /// `vendor_clis` names the operator-configured vendor binaries
    /// (`--claude-cli-bin` / `CLAUDE_CLI_BIN`, `--codex-cli-bin` /
    /// `CODEX_CLI_BIN`). Without one the last rung of the recovery ladder stays
    /// inert for that provider: running a vendor client is a side effect nobody
    /// should get without asking for it.
    ///
    /// Registered per provider rather than for Claude alone. A Codex credential
    /// is an OAuth chain with the same single-use rotation, so a deployment
    /// that could recover a Claude subscription automatically but needed an
    /// operator for Codex was drawing a line the credentials do not (#275).
    pub fn register_credential_recovery(&self, vendor_clis: &VendorClis<'_>) {
        self.subscription_cache.register_readers(
            crate::credential_recovery_store::PRIMARY_ACCOUNT,
            &self.subscription_readers,
        );
        if let Some(router) = &self.account_router {
            router.register_credential_stores(&self.subscription_cache);
        }
        self.register_vendor_clis(vendor_clis);
    }

    /// Register durable data-directory recovery for every credential.
    pub fn register_credential_recovery_in(
        &self,
        data_dir: &std::path::Path,
        vendor_clis: &VendorClis<'_>,
    ) {
        self.subscription_cache.register_readers_in(
            crate::credential_recovery_store::PRIMARY_ACCOUNT,
            &self.subscription_readers,
            data_dir,
        );
        if let Some(router) = &self.account_router {
            router.register_credential_stores_in(&self.subscription_cache, data_dir);
        }
        self.register_vendor_clis(vendor_clis);
    }

    fn register_vendor_clis(&self, vendor_clis: &VendorClis<'_>) {
        for reader in &self.subscription_readers {
            let Some(binary) = vendor_clis.binary_for(reader.provider()) else {
                continue;
            };
            let Some(cli) = crate::vendor_cli_refresh::VendorCli::for_provider(
                reader.provider(),
                binary,
                reader.home(),
            ) else {
                continue;
            };
            self.subscription_cache.register_vendor_cli(
                crate::credential_recovery_store::PRIMARY_ACCOUNT,
                Arc::new(cli),
            );
        }
    }
}

impl AppState {
    /// A minimal state for exercising handlers in-process.
    ///
    /// Every field is inert: no credentials, no upstreams, no listeners. A
    /// test overrides only what it is about, so the rest cannot quietly take
    /// part in the behaviour under test.
    #[cfg(test)]
    #[must_use]
    pub fn for_tests(data_dir: &std::path::Path) -> Self {
        use std::sync::Arc;
        Self {
            client: reqwest::Client::new(),
            token_manager: crate::token::TokenManager::new("test-secret"),
            oauth_provider: crate::oauth::OAuthProvider::new(&data_dir.to_string_lossy()),
            account_router: None,
            subscription_reader: None,
            subscription_base_url: None,
            subscription_readers: Vec::new(),
            model_catalogs: Arc::new(crate::model_catalog::ModelCatalogCache::new()),
            subscription_cache: Arc::new(crate::refresh::TokenCache::new()),
            upstream_base_url: "https://api.anthropic.com".to_string(),
            upstream_provider: crate::config::UpstreamProvider::Auto,
            gonka: None,
            bridge_model: None,
            bridge_model_policy: crate::bridge_selection::BridgeModelPolicy::default(),
            crater: None,
            openai_compatible: crate::config::default_openai_compatible_config(),
            provider_store: crate::providers::ProviderStore::open(data_dir, "test-secret")
                .expect("open a provider store"),
            logger: log_lazy::LogLazy::new(),
            admin: Arc::new(crate::admin::AdminClaim::load(
                None,
                data_dir,
                std::time::Duration::from_secs(60),
            )),
            admin_key: None,
            allow_anonymous_admin: false,
            metrics: Arc::new(crate::metrics::Metrics::default()),
            audit: Arc::new(crate::audit::AuditLog::to_path(None)),
            request_log: Arc::new(crate::request_log::RequestLog::new(
                data_dir.join("requests"),
                1024 * 1024,
            )),
            activitypub_actor_base_url: "https://router.example".to_string(),
            activitypub_public_key_pem: crate::config::default_activitypub_public_key_pem(),
            mpp: crate::config::default_mpp_config(),
            login_manager: crate::login::LoginManager::new(crate::login::LoginConfig::default()),
            github: crate::github_proxy::GitHubProxyConfig::default(),
            max_proxy_request_bytes: crate::config::DEFAULT_MAX_PROXY_REQUEST_BYTES,
        }
    }
}

/// The vendor client binaries an operator configured, per provider.
///
/// A struct rather than more parameters so adding a third provider does not
/// change every call site again.
#[derive(Debug, Default, Clone, Copy)]
pub struct VendorClis<'a> {
    pub claude: Option<&'a std::path::Path>,
    pub codex: Option<&'a std::path::Path>,
}

impl<'a> VendorClis<'a> {
    /// The binary configured for `provider`, if any.
    #[must_use]
    pub const fn binary_for(
        &self,
        provider: crate::subscription::SubscriptionProvider,
    ) -> Option<&'a std::path::Path> {
        match provider {
            crate::subscription::SubscriptionProvider::Claude => self.claude,
            crate::subscription::SubscriptionProvider::Codex => self.codex,
            crate::subscription::SubscriptionProvider::Gemini
            | crate::subscription::SubscriptionProvider::Qwen => None,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn legacy_and_durable_registration_wrappers_share_the_same_readers() {
        let root = tempfile::tempdir().expect("state directory");
        let mut state = AppState::for_tests(root.path());
        state
            .subscription_readers
            .push(crate::subscription::SubscriptionReader::new(
                crate::subscription::SubscriptionProvider::Qwen,
                root.path().join("qwen"),
            ));

        state.register_credential_recovery(&VendorClis::default());
        assert!(
            state
                .subscription_cache
                .store_for_subscription(
                    crate::subscription::SubscriptionProvider::Qwen,
                    crate::credential_recovery_store::PRIMARY_ACCOUNT,
                )
                .is_some()
        );

        state.register_credential_recovery_in(root.path(), &VendorClis::default());
        assert!(
            state
                .subscription_cache
                .store_for_subscription(
                    crate::subscription::SubscriptionProvider::Qwen,
                    crate::credential_recovery_store::PRIMARY_ACCOUNT,
                )
                .is_some()
        );
    }

    #[test]
    fn registration_installs_only_supported_configured_vendor_clients() {
        let root = tempfile::tempdir().expect("state directory");
        let mut state = AppState::for_tests(root.path());
        for provider in [
            crate::subscription::SubscriptionProvider::Claude,
            crate::subscription::SubscriptionProvider::Codex,
            crate::subscription::SubscriptionProvider::Gemini,
            crate::subscription::SubscriptionProvider::Qwen,
        ] {
            state
                .subscription_readers
                .push(crate::subscription::SubscriptionReader::new(
                    provider,
                    root.path().join(provider.as_str()),
                ));
        }
        let claude = root.path().join("claude-cli");
        let codex = root.path().join("codex-cli");

        state.register_credential_recovery(&VendorClis {
            claude: Some(&claude),
            codex: Some(&codex),
        });

        for provider in [
            crate::subscription::SubscriptionProvider::Claude,
            crate::subscription::SubscriptionProvider::Codex,
        ] {
            assert!(
                state
                    .subscription_cache
                    .vendor_cli_for(provider, crate::credential_recovery_store::PRIMARY_ACCOUNT,)
                    .is_some(),
                "{provider} configured client was not registered"
            );
        }
        for provider in [
            crate::subscription::SubscriptionProvider::Gemini,
            crate::subscription::SubscriptionProvider::Qwen,
        ] {
            assert!(
                state
                    .subscription_cache
                    .vendor_cli_for(provider, crate::credential_recovery_store::PRIMARY_ACCOUNT,)
                    .is_none(),
                "{provider} must not invent an unsupported vendor probe"
            );
        }
    }
}
