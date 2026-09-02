use super::{ADMIN_SCOPE, TOKEN_PREFIX};

/// Errors related to token operations.
#[derive(Debug)]
pub enum TokenError {
    /// Token does not start with the expected prefix.
    InvalidPrefix,
    /// Token has expired.
    ///
    /// `Some` when the record could be read, so the message can say when the
    /// token was issued, how long it was good for, and how long ago it lapsed.
    /// A user whose day-long session died could not otherwise tell a ceiling
    /// from a clock skew from a revocation -- all three printed one sentence
    /// (issue #355).
    Expired(Option<ExpiryFacts>),
    /// Token has been revoked.
    Revoked,
    /// No stored token has the requested subject ID.
    NotFound(String),
    /// Token is otherwise invalid.
    Invalid(String),
    /// Token is valid but lacks the privilege scope the operation requires.
    InsufficientScope,
    /// Token has reached its per-token request budget (`max_requests`).
    ///
    /// `Some` carries used and limit, which the store was holding when it
    /// refused the request (issue #355).
    LimitExceeded(Option<BudgetFacts>),
    /// Token has reached its upstream-reported token budget (`max_tokens`).
    TokenLimitExceeded(Option<BudgetFacts>),
    /// Token has reached its configured one-minute request rate.
    RateLimitExceeded,
    /// Storage backend failure.
    Storage(String),
}

/// When a token was issued, when it lapsed, and how long ago that was.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ExpiryFacts {
    /// When the token was issued.
    pub issued_at: i64,
    /// When it expired.
    pub expires_at: i64,
    /// How long ago it expired, at the moment of the rejection.
    pub ago_seconds: i64,
}

/// How much of a bound has been spent.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct BudgetFacts {
    /// The amount already consumed.
    pub used: u64,
    /// The bound it was measured against.
    pub limit: u64,
}

/// Render a unix timestamp for a person reading an error message.
fn render_time(seconds: i64) -> String {
    chrono::DateTime::from_timestamp(seconds, 0)
        .map_or_else(|| seconds.to_string(), |time| time.to_rfc3339())
}

/// Render a span of seconds as the largest unit that stays readable.
///
/// "expired 3d ago" answers the question a user has; a unix timestamp does not.
fn render_duration(seconds: i64) -> String {
    let seconds = seconds.abs();
    match seconds {
        0..=90 => format!("{seconds}s"),
        91..=5399 => format!("{}m", (seconds + 30) / 60),
        5400..=172_799 => format!("{}h", (seconds + 1800) / 3600),
        _ => format!("{}d", (seconds + 43200) / 86400),
    }
}

impl std::fmt::Display for TokenError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::InvalidPrefix => {
                write!(f, "Token must start with '{TOKEN_PREFIX}' prefix")
            }
            Self::Expired(None) => write!(f, "Token has expired"),
            Self::Expired(Some(facts)) => write!(
                f,
                "Token expired at {} ({} ago)",
                render_time(facts.expires_at),
                render_duration(facts.ago_seconds)
            ),
            Self::Revoked => write!(f, "Token has been revoked"),
            Self::NotFound(id) => write!(f, "Token not found: {id}"),
            Self::Invalid(msg) => write!(f, "Invalid token: {msg}"),
            Self::InsufficientScope => {
                write!(f, "Token does not carry the '{ADMIN_SCOPE}' scope")
            }
            Self::LimitExceeded(None) => write!(f, "Token has reached its request limit"),
            Self::LimitExceeded(Some(facts)) => write!(
                f,
                "Token has reached its request limit: {} of {} requests used",
                facts.used, facts.limit
            ),
            Self::TokenLimitExceeded(None) => write!(f, "Token has reached its token limit"),
            Self::TokenLimitExceeded(Some(facts)) => write!(
                f,
                "Token has reached its token limit: {} of {} tokens used",
                facts.used, facts.limit
            ),
            Self::RateLimitExceeded => write!(f, "Token has reached its per-minute rate limit"),
            Self::Storage(msg) => write!(f, "Token storage error: {msg}"),
        }
    }
}

impl TokenError {
    /// Stable message safe to return across the unauthenticated client boundary.
    ///
    /// Decoder and storage details remain available through [`std::fmt::Display`]
    /// for server-side logs, but must not disclose parser internals to callers.
    #[must_use]
    pub fn client_message(&self) -> std::borrow::Cow<'static, str> {
        use std::borrow::Cow;
        match self {
            Self::InvalidPrefix | Self::Invalid(_) => Cow::Borrowed("invalid token"),
            // Names the router and the flag, because the client renders its
            // own advice otherwise: a Claude Code session whose per-run token
            // expired mid-work was told `Please run /login`, which points at
            // the Anthropic subscription -- a different credential entirely,
            // and re-authenticating it changes nothing (issue #341).
            Self::Expired(None) => Cow::Borrowed(
                "Token has expired: this is the router's own token, not the model provider's. \
                 A per-run token from `router with` lives for --run-ttl-hours; re-running the \
                 command mints a new one.",
            ),
            Self::Expired(Some(facts)) => Cow::Owned(format!(
                "Token has expired: this is the router's own token, not the model provider's. \
                 Issued {issued}, good for {lifetime}, expired {expired} ({ago} ago). \
                 A per-run token from `router with` lives for --run-ttl-hours; re-running the \
                 command mints a new one.",
                issued = render_time(facts.issued_at),
                lifetime = render_duration(facts.expires_at - facts.issued_at),
                expired = render_time(facts.expires_at),
                ago = render_duration(facts.ago_seconds),
            )),
            Self::Revoked => Cow::Borrowed("Token has been revoked"),
            Self::NotFound(_) => Cow::Borrowed("token not found"),
            Self::InsufficientScope => Cow::Borrowed("insufficient token scope"),
            Self::LimitExceeded(None) => Cow::Borrowed("Token has reached its request limit"),
            Self::LimitExceeded(Some(facts)) => Cow::Owned(format!(
                "Token has reached its request limit: {} of {} requests used. Issue a token \
                 with a larger --max-requests, or use a new one.",
                facts.used, facts.limit
            )),
            Self::TokenLimitExceeded(None) => Cow::Borrowed("Token has reached its token limit"),
            Self::TokenLimitExceeded(Some(facts)) => Cow::Owned(format!(
                "Token has reached its token limit: {} of {} tokens used. Issue a token with a \
                 larger --max-tokens, or use a new one.",
                facts.used, facts.limit
            )),
            Self::RateLimitExceeded => Cow::Borrowed("Token has reached its per-minute rate limit"),
            Self::Storage(_) => Cow::Borrowed("token validation failed"),
        }
    }
}

impl std::error::Error for TokenError {}
