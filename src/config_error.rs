//! Configuration loading errors, re-exported by `config`.

/// Errors that can occur during configuration loading.
#[derive(Debug)]
pub enum ConfigError {
    /// `ROUTER_PORT` is not a valid port number.
    InvalidPort,
    /// Management access settings were invalid.
    InvalidManagementSecurity(String),
    /// The listen address could not be parsed.
    InvalidAddress,
    /// `ROUTER_HOST` was neither an IP literal nor a resolvable safe alias.
    InvalidListenHost(String),
    /// `TOKEN_SECRET` environment variable is missing or empty.
    MissingTokenSecret,
    /// `TOKEN_SECRET_FILE` was set and could not supply a secret (issue #684).
    TokenSecretFile(String),
    /// Routing mode was not recognised.
    InvalidRoutingMode,
    /// Upstream API format was not recognised.
    InvalidApiFormat,
    /// Storage policy was not recognised.
    InvalidStoragePolicy,
    /// Upstream provider was not recognised.
    InvalidUpstreamProvider,
    /// The bridge model selection policy was not recognised.
    InvalidBridgeModelPolicy(String),
    /// A consumer-subscription bridge override was not an exact reviewed cell.
    InvalidSubscriptionBridgePolicy(String),
    /// A proxied-client override did not name a reviewed proxy contract.
    InvalidProxiedClientPolicy(String),
    /// An additional primary listener did not use the documented grammar.
    InvalidPrimaryListener(String),
    /// The multi-account strategy was not recognised.
    InvalidAccountRoutingStrategy,
    /// An account request cap was not a non-negative integer.
    InvalidAccountRequestLimits,
    /// Request caps did not align with primary plus additional accounts.
    MismatchedAccountRequestLimits,
    /// Gonka was selected without a broker/API key.
    MissingGonkaApiKey,
    /// Broker/API-key mode was enabled without an explicit broker URL.
    MissingGonkaSourceUrl,
    /// Direct-wallet signing is not implemented according to the official protocol.
    UnsupportedGonkaDirectWallet,
    /// Crater was selected without `CRATER_FORGEFED_INBOX`.
    MissingCraterForgeFedInbox,
}

impl std::fmt::Display for ConfigError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::InvalidPort => write!(f, "ROUTER_PORT must be a valid port number (0-65535)"),
            Self::InvalidAddress => write!(f, "Could not parse listen address"),
            Self::InvalidListenHost(host) => write!(
                f,
                "ROUTER_HOST {host:?} did not resolve to a concrete listen address"
            ),
            Self::MissingTokenSecret => {
                write!(f, "TOKEN_SECRET environment variable is required")
            }
            Self::InvalidRoutingMode => {
                write!(f, "ROUTING_MODE must be one of: direct, cli, hybrid")
            }
            Self::InvalidApiFormat => write!(
                f,
                "UPSTREAM_API_FORMAT must be one of: anthropic, bedrock, vertex"
            ),
            Self::InvalidStoragePolicy => write!(
                f,
                "STORAGE_POLICY must be one of: memory, text, binary, both"
            ),
            Self::InvalidUpstreamProvider => write!(
                f,
                "UPSTREAM_PROVIDER must be one of: auto, anthropic, codex, gemini, qwen, gonka, crater, openai-compatible"
            ),
            Self::InvalidManagementSecurity(message)
            | Self::InvalidBridgeModelPolicy(message)
            | Self::InvalidSubscriptionBridgePolicy(message)
            | Self::InvalidProxiedClientPolicy(message)
            | Self::InvalidPrimaryListener(message)
            | Self::TokenSecretFile(message) => write!(f, "{message}"),
            Self::InvalidAccountRoutingStrategy => write!(
                f,
                "ACCOUNT_ROUTING_STRATEGY must be one of: round-robin, fill-first, least-used"
            ),
            Self::InvalidAccountRequestLimits => write!(
                f,
                "ACCOUNT_REQUEST_LIMITS must be comma-separated non-negative integers"
            ),
            Self::MismatchedAccountRequestLimits => write!(
                f,
                "ACCOUNT_REQUEST_LIMITS must contain one entry for primary and each additional account"
            ),
            Self::MissingGonkaApiKey => write!(f, "Gonka broker mode requires GONKA_API_KEY"),
            Self::MissingGonkaSourceUrl => write!(
                f,
                "Gonka broker mode requires an explicit GONKA_SOURCE_URL; official direct-wallet node endpoints are not API-key broker defaults"
            ),
            Self::UnsupportedGonkaDirectWallet => write!(
                f,
                "GONKA_PRIVATE_KEY direct-wallet mode is unsupported because Router does not implement Gonka's official endpoint-resolution and secp256k1 signing protocol; configure a broker with GONKA_API_KEY instead"
            ),
            Self::MissingCraterForgeFedInbox => {
                write!(f, "Crater provider requires CRATER_FORGEFED_INBOX")
            }
        }
    }
}

impl std::error::Error for ConfigError {}
