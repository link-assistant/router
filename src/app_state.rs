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
    /// non-Anthropic upstream. `None` falls back to a per-provider default.
    pub bridge_model: Option<String>,
    /// Crater `ForgeFed` task provider when selected.
    pub crater: Option<Arc<dyn crate::crater::TaskProvider>>,
    /// Boot-time generic OpenAI-compatible provider config.
    pub openai_compatible: OpenAICompatibleConfig,
    /// Persisted provider records with encrypted upstream secrets.
    pub provider_store: ProviderStore,
    /// Lazy logger for verbose output.
    pub logger: LogLazy,
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
}
