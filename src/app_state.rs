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
    /// Registry of in-flight interactive login sessions (`/api/login`).
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
    /// `vendor_cli` is the operator-configured vendor binary
    /// (`--claude-cli-bin` / `CLAUDE_CLI_BIN`). Without it the last rung of the
    /// recovery ladder stays inert: running a vendor client is a side effect
    /// nobody should get without asking for it.
    pub fn register_credential_recovery(&self, vendor_cli: Option<&std::path::Path>) {
        self.subscription_cache
            .register_readers("primary", &self.subscription_readers);
        if let Some(router) = &self.account_router {
            router.register_credential_stores(&self.subscription_cache);
        }
        let Some(binary) = vendor_cli else {
            return;
        };
        for reader in &self.subscription_readers {
            if reader.provider() == crate::subscription::SubscriptionProvider::Claude {
                self.subscription_cache.register_vendor_cli(
                    "primary",
                    Arc::new(crate::vendor_cli_refresh::VendorCli::claude(
                        binary,
                        reader.home(),
                    )),
                );
            }
        }
    }
}
