//! Custom token management for the gateway layer.
//!
//! Issues and validates `la_sk_...` prefixed JWT tokens that map to the shared
//! Claude MAX OAuth session.
//!
//! `TokenManager` wraps a [`TokenStore`] (see [`crate::storage`]) so issued
//! tokens, their metadata, and their revocation flags survive process
//! restarts. The default ([`TokenManager::new`]) keeps everything in memory
//! for backwards compatibility with the legacy server boot path.

use chrono::{Duration, Utc};
use jsonwebtoken::{DecodingKey, EncodingKey, Header, Validation, decode, encode};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use uuid::Uuid;

use crate::storage::{MemoryTokenStore, RequestAdmission, StorageError, TokenRecord, TokenStore};

/// Prefix for all router-issued custom tokens.
pub const TOKEN_PREFIX: &str = "la_sk_";

/// Scope claim marking a token as an administrative credential.
///
/// A token carrying this scope unlocks the administrative endpoints
/// (`/api/tokens*`, `/api/providers*`, `/api/login*`) in addition to the
/// inference proxy. Tokens issued without a scope may only proxy inference.
pub const ADMIN_SCOPE: &str = "admin";

/// JWT claims stored inside each custom token.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TokenClaims {
    /// Subject — a unique token identifier.
    pub sub: String,
    /// Issued at (Unix timestamp).
    pub iat: i64,
    /// Expiration (Unix timestamp).
    pub exp: i64,
    /// Optional label for this token.
    #[serde(default)]
    pub label: String,
    /// Privilege scope. Empty means an ordinary client token; [`ADMIN_SCOPE`]
    /// marks an administrative credential.
    #[serde(default, skip_serializing_if = "String::is_empty")]
    pub scope: String,
}

impl TokenClaims {
    /// Whether these claims carry the administrative scope.
    #[must_use]
    pub fn is_admin(&self) -> bool {
        self.scope == ADMIN_SCOPE
    }
}

/// Parameters for [`TokenManager::issue`].
///
/// Grouped into a struct because issuance varies along independent policy
/// axes (TTL, label, account pin, budgets, rate, scope) and a positional
/// argument list at that width is easy to mis-order at the call site.
#[derive(Debug, Default, Clone)]
pub struct IssueRequest<'a> {
    /// Time-to-live in hours.
    pub ttl_hours: i64,
    /// Human-readable label recorded alongside the token.
    pub label: &'a str,
    /// Optional strict account binding (multi-account mode).
    pub account: Option<&'a str>,
    /// Optional cap on upstream requests; `None` means unlimited.
    pub max_requests: Option<u64>,
    /// Optional cap on upstream-reported input plus output tokens.
    pub max_tokens: Option<u64>,
    /// Optional fixed-window request rate for this credential.
    pub rate_limit_per_minute: Option<u64>,
    /// Privilege scope; empty for an ordinary client token.
    pub scope: &'a str,
}

/// Manages creation, validation, and revocation of custom tokens.
#[derive(Clone)]
pub struct TokenManager {
    secret: String,
    store: Arc<dyn TokenStore>,
}

impl TokenManager {
    /// Create a new token manager backed by an in-memory store.
    #[must_use]
    pub fn new(secret: &str) -> Self {
        Self::with_store(secret, Arc::new(MemoryTokenStore::new()))
    }

    /// Create a new token manager backed by the provided persistent store.
    #[must_use]
    pub fn with_store(secret: &str, store: Arc<dyn TokenStore>) -> Self {
        Self {
            secret: secret.to_string(),
            store,
        }
    }

    /// Borrow the underlying token store (used by admin endpoints / CLI).
    #[must_use]
    pub fn store(&self) -> Arc<dyn TokenStore> {
        Arc::clone(&self.store)
    }

    /// Issue a new custom token with the given TTL and optional label.
    ///
    /// Returns the full token string including the `la_sk_` prefix.
    pub fn issue_token(
        &self,
        ttl_hours: i64,
        label: &str,
    ) -> Result<String, jsonwebtoken::errors::Error> {
        self.issue_token_for(ttl_hours, label, None)
    }

    /// Issue a token bound to a specific account.
    pub fn issue_token_for(
        &self,
        ttl_hours: i64,
        label: &str,
        account: Option<&str>,
    ) -> Result<String, jsonwebtoken::errors::Error> {
        self.issue_token_full(ttl_hours, label, account, None)
    }

    /// Issue a token bound to a specific account with an optional request cap.
    ///
    /// `max_requests` bounds how many upstream requests the token may make
    /// before the proxy starts rejecting it with HTTP 429. `None` means the
    /// token is unlimited. This is the knob that lets an operator hand a task
    /// a token that can only consume a fixed share of the shared subscription.
    pub fn issue_token_full(
        &self,
        ttl_hours: i64,
        label: &str,
        account: Option<&str>,
        max_requests: Option<u64>,
    ) -> Result<String, jsonwebtoken::errors::Error> {
        self.issue(&IssueRequest {
            ttl_hours,
            label,
            account,
            max_requests,
            max_tokens: None,
            rate_limit_per_minute: None,
            scope: "",
        })
    }

    /// Issue an administrative token.
    ///
    /// The result is an ordinary `la_sk_…` JWT that additionally carries
    /// `"scope": "admin"`, so it validates on exactly the same code path as a
    /// client token — same signature check, same expiry, same revocation —
    /// while being distinguishable from one that may only proxy inference.
    pub fn issue_admin_token(
        &self,
        ttl_hours: i64,
        label: &str,
    ) -> Result<String, jsonwebtoken::errors::Error> {
        self.issue(&IssueRequest {
            ttl_hours,
            label,
            account: None,
            max_requests: None,
            max_tokens: None,
            rate_limit_per_minute: None,
            scope: ADMIN_SCOPE,
        })
    }

    /// Issue a token described by [`IssueRequest`].
    pub fn issue(&self, request: &IssueRequest<'_>) -> Result<String, jsonwebtoken::errors::Error> {
        self.issue_with_id(request).map(|(token, _)| token)
    }

    /// Issue a token and return it together with its record id (`sub`).
    ///
    /// Callers that persist a credential on behalf of a user need the id to be
    /// able to revoke exactly that token later; recovering it by decoding the
    /// JWT afterwards would duplicate the trust decision made here.
    pub fn issue_with_id(
        &self,
        request: &IssueRequest<'_>,
    ) -> Result<(String, String), jsonwebtoken::errors::Error> {
        let ttl_hours = request.ttl_hours;
        let label = request.label;
        let account = request.account;
        let max_requests = request.max_requests;
        let now = Utc::now();
        let exp = now + Duration::hours(ttl_hours);
        let claims = TokenClaims {
            sub: Uuid::new_v4().to_string(),
            iat: now.timestamp(),
            exp: exp.timestamp(),
            label: label.to_string(),
            scope: request.scope.to_string(),
        };
        let jwt = encode(
            &Header::default(),
            &claims,
            &EncodingKey::from_secret(self.secret.as_bytes()),
        )?;
        // Persist a record so list/revoke survive restarts. Storage failures
        // are logged but do not block token issuance for in-memory tests.
        let record = TokenRecord {
            id: claims.sub.clone(),
            label: claims.label.clone(),
            issued_at: claims.iat,
            expires_at: claims.exp,
            revoked: false,
            account: account.map(String::from),
            max_requests,
            used_requests: 0,
            max_tokens: request.max_tokens,
            used_tokens: 0,
            rate_limit_per_minute: request.rate_limit_per_minute,
            rate_window_started_at: 0,
            rate_window_requests: 0,
            scope: claims.scope,
        };
        let id = record.id.clone();
        if let Err(e) = self.store.put(record) {
            tracing::warn!("token store put failed: {e}");
        }
        Ok((format!("{TOKEN_PREFIX}{jwt}"), id))
    }

    /// Enforce (and record) the per-token request budget for `token_id`.
    ///
    /// Call this once per proxied upstream request, after the token has been
    /// validated. Returns:
    /// * `Ok(())` when the request is within budget (the used-request counter
    ///   is incremented as a side effect), or
    /// * `Err(TokenError::LimitExceeded)` when the token has reached its cap.
    ///
    /// Tokens issued without a `max_requests` cap are always permitted.
    pub fn enforce_request_budget(&self, token_id: &str) -> Result<(), TokenError> {
        match self
            .store
            .try_admit_request(token_id, Utc::now().timestamp())
        {
            Ok(RequestAdmission::Admitted) => Ok(()),
            Ok(RequestAdmission::RequestLimitExceeded) => Err(TokenError::LimitExceeded),
            Ok(RequestAdmission::TokenLimitExceeded) => Err(TokenError::TokenLimitExceeded),
            Ok(RequestAdmission::RateLimitExceeded) => Err(TokenError::RateLimitExceeded),
            Err(e) => Err(TokenError::Storage(e.to_string())),
        }
    }

    /// Persist actual input plus output tokens reported by an upstream response.
    pub fn record_token_usage(&self, token_id: &str, tokens: u64) -> Result<(), TokenError> {
        self.store
            .record_token_usage(token_id, tokens)
            .map_err(|error| TokenError::Storage(error.to_string()))
    }

    /// Return the strict account binding stored for a router-issued token.
    pub fn account_for(&self, token_id: &str) -> Result<Option<String>, TokenError> {
        self.store
            .get(token_id)
            .map(|record| record.and_then(|record| record.account))
            .map_err(|error| TokenError::Storage(error.to_string()))
    }

    /// Validate a custom token string.
    ///
    /// Strips the `la_sk_` prefix, decodes the JWT, checks expiration and
    /// revocation status, and returns the claims if valid.
    pub fn validate_token(&self, token: &str) -> Result<TokenClaims, TokenError> {
        let jwt = token
            .strip_prefix(TOKEN_PREFIX)
            .ok_or(TokenError::InvalidPrefix)?;

        let token_data = decode::<TokenClaims>(
            jwt,
            &DecodingKey::from_secret(self.secret.as_bytes()),
            &Validation::default(),
        )
        .map_err(|e| match e.kind() {
            jsonwebtoken::errors::ErrorKind::ExpiredSignature => TokenError::Expired,
            _ => TokenError::Invalid(e.to_string()),
        })?;

        let revoked = self
            .store
            .get(&token_data.claims.sub)
            .map_err(|e| TokenError::Storage(e.to_string()))?
            .is_some_and(|r| r.revoked);
        if revoked {
            return Err(TokenError::Revoked);
        }

        Ok(token_data.claims)
    }

    /// Validate a token and require that it carries [`ADMIN_SCOPE`].
    ///
    /// Returns [`TokenError::InsufficientScope`] for a token that is otherwise
    /// valid but was issued without the administrative scope, so a leaked
    /// client token can never be replayed against the admin endpoints.
    pub fn validate_admin_token(&self, token: &str) -> Result<TokenClaims, TokenError> {
        let claims = self.validate_token(token)?;
        if claims.is_admin() {
            Ok(claims)
        } else {
            Err(TokenError::InsufficientScope)
        }
    }

    /// Whether at least one usable administrative token exists.
    ///
    /// "Usable" means recorded, not revoked, and not yet expired. Boot uses
    /// this to decide whether a deployment already has a way in before
    /// minting a bootstrap credential.
    pub fn has_active_admin_token(&self) -> Result<bool, TokenError> {
        let now = Utc::now().timestamp();
        Ok(self.list_tokens()?.iter().any(|record| {
            record.scope == ADMIN_SCOPE && !record.revoked && record.expires_at > now
        }))
    }

    /// Rotate an administrative token: issue a replacement and revoke the old
    /// one in a single step.
    ///
    /// This is the operation a flat shared secret cannot express — "new token,
    /// old one expired" — and is why the admin credential is modelled as a
    /// JWT with a `sub` in the first place. The replacement is issued *before*
    /// the old subject is revoked so a storage failure cannot leave the
    /// deployment with no admin credential at all.
    pub fn rotate_admin_token(
        &self,
        current_sub: &str,
        ttl_hours: i64,
        label: &str,
    ) -> Result<String, TokenError> {
        let record = self
            .store
            .get(current_sub)
            .map_err(|error| TokenError::Storage(error.to_string()))?
            .ok_or_else(|| TokenError::Invalid(format!("unknown token id {current_sub}")))?;
        if record.scope != ADMIN_SCOPE {
            return Err(TokenError::Invalid(format!(
                "token {current_sub} is not an admin token"
            )));
        }
        self.rotate_token(current_sub, ttl_hours, label)
    }

    /// Replace any stored token while preserving its account and controls.
    pub fn rotate_token(
        &self,
        current_sub: &str,
        ttl_hours: i64,
        label: &str,
    ) -> Result<String, TokenError> {
        let record = self
            .store
            .get(current_sub)
            .map_err(|error| TokenError::Storage(error.to_string()))?
            .ok_or_else(|| TokenError::Invalid(format!("unknown token id {current_sub}")))?;
        let replacement_label = if label.is_empty() {
            &record.label
        } else {
            label
        };
        let replacement = self
            .issue(&IssueRequest {
                ttl_hours,
                label: replacement_label,
                account: record.account.as_deref(),
                max_requests: record.max_requests,
                max_tokens: record.max_tokens,
                rate_limit_per_minute: record.rate_limit_per_minute,
                scope: &record.scope,
            })
            .map_err(|error| TokenError::Invalid(error.to_string()))?;
        self.revoke_token(current_sub)?;
        Ok(replacement)
    }

    /// Re-enable a previously revoked token by its subject ID.
    ///
    /// This exists for exactly one caller: the two-phase admin claim (see
    /// [`crate::admin`]). Phase one mints the admin JWT *revoked*, so an
    /// abandoned mint is inert everywhere — it cannot authorise anything and
    /// cannot brick the deployment. Phase two reinstates it, which is what
    /// turns the candidate into the active administrator credential.
    ///
    /// # Errors
    ///
    /// Returns [`TokenError::NotFound`] when no record carries `token_id`, and
    /// [`TokenError::Storage`] when the store cannot be written.
    pub fn reinstate_token(&self, token_id: &str) -> Result<(), TokenError> {
        let mut record = self
            .store
            .get(token_id)
            .map_err(|error| TokenError::Storage(error.to_string()))?
            .ok_or_else(|| TokenError::NotFound(token_id.to_string()))?;
        record.revoked = false;
        self.store
            .put(record)
            .map_err(|error| TokenError::Storage(error.to_string()))
    }

    /// Revoke every usable admin token except `keep_id`.
    ///
    /// Used when a first visitor claims administration: the credential minted
    /// at startup (`bootstrap-admin`) must stop working at that instant, and
    /// must *show* as revoked in the API, CLI and UI rather than lingering as
    /// an apparently active row.
    ///
    /// Returns the ids that were revoked.
    ///
    /// # Errors
    ///
    /// Propagates store failures from listing or revoking.
    pub fn revoke_other_admin_tokens(&self, keep_id: &str) -> Result<Vec<String>, TokenError> {
        let now = Utc::now().timestamp();
        let stale: Vec<String> = self
            .list_tokens()?
            .into_iter()
            .filter(|record| {
                record.scope == ADMIN_SCOPE
                    && !record.revoked
                    && record.expires_at > now
                    && record.id != keep_id
            })
            .map(|record| record.id)
            .collect();
        for id in &stale {
            self.revoke_token(id)?;
        }
        Ok(stale)
    }

    /// Revoke a token by its subject ID. Idempotent.
    pub fn revoke_token(&self, token_id: &str) -> Result<(), TokenError> {
        match self.store.revoke(token_id) {
            Ok(true) => Ok(()),
            Ok(false) => match self.store.get(token_id) {
                Ok(Some(record)) if record.revoked => Ok(()),
                Ok(Some(_)) => Err(TokenError::Storage(format!(
                    "token {token_id} could not be revoked"
                ))),
                Ok(None) => Err(TokenError::NotFound(token_id.to_string())),
                Err(error) => Err(TokenError::Storage(error.to_string())),
            },
            Err(e) => Err(TokenError::Storage(e.to_string())),
        }
    }

    /// List all known tokens (for admin / CLI inspection).
    pub fn list_tokens(&self) -> Result<Vec<TokenRecord>, TokenError> {
        self.store
            .list()
            .map_err(|e: StorageError| TokenError::Storage(e.to_string()))
    }
}

/// Compare two secrets without leaking their contents through timing.
///
/// Both sides are hashed with SHA-256 first, so the comparison always runs
/// over 32 bytes and neither the length nor the position of the first
/// differing byte is observable. The fold over the whole digest is what makes
/// it constant-time; a plain `==` on the raw strings (which is what the flat
/// `TOKEN_ADMIN_KEY` path used to do) short-circuits on the first mismatch.
#[must_use]
pub fn constant_time_eq(a: &str, b: &str) -> bool {
    use sha2::{Digest, Sha256};

    let left = Sha256::digest(a.as_bytes());
    let right = Sha256::digest(b.as_bytes());
    let mut diff = 0u8;
    for (x, y) in left.iter().zip(right.iter()) {
        diff |= x ^ y;
    }
    diff == 0
}

/// Errors related to token operations.
#[derive(Debug)]
pub enum TokenError {
    /// Token does not start with the expected prefix.
    InvalidPrefix,
    /// Token has expired.
    Expired,
    /// Token has been revoked.
    Revoked,
    /// No stored token has the requested subject ID.
    NotFound(String),
    /// Token is otherwise invalid.
    Invalid(String),
    /// Token is valid but lacks the privilege scope the operation requires.
    InsufficientScope,
    /// Token has reached its per-token request budget (`max_requests`).
    LimitExceeded,
    /// Token has reached its upstream-reported token budget (`max_tokens`).
    TokenLimitExceeded,
    /// Token has reached its configured one-minute request rate.
    RateLimitExceeded,
    /// Storage backend failure.
    Storage(String),
}

impl std::fmt::Display for TokenError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::InvalidPrefix => {
                write!(f, "Token must start with '{TOKEN_PREFIX}' prefix")
            }
            Self::Expired => write!(f, "Token has expired"),
            Self::Revoked => write!(f, "Token has been revoked"),
            Self::NotFound(id) => write!(f, "Token not found: {id}"),
            Self::Invalid(msg) => write!(f, "Invalid token: {msg}"),
            Self::InsufficientScope => {
                write!(f, "Token does not carry the '{ADMIN_SCOPE}' scope")
            }
            Self::LimitExceeded => {
                write!(f, "Token has reached its request limit")
            }
            Self::TokenLimitExceeded => write!(f, "Token has reached its token limit"),
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
    pub const fn client_message(&self) -> &'static str {
        match self {
            Self::InvalidPrefix | Self::Invalid(_) => "invalid token",
            Self::Expired => "Token has expired",
            Self::Revoked => "Token has been revoked",
            Self::NotFound(_) => "token not found",
            Self::InsufficientScope => "insufficient token scope",
            Self::LimitExceeded => "Token has reached its request limit",
            Self::TokenLimitExceeded => "Token has reached its token limit",
            Self::RateLimitExceeded => "Token has reached its per-minute rate limit",
            Self::Storage(_) => "token validation failed",
        }
    }
}

impl std::error::Error for TokenError {}

#[cfg(test)]
mod tests {
    use super::*;

    fn test_manager() -> TokenManager {
        TokenManager::new("test-secret-for-unit-tests")
    }

    #[test]
    fn test_issue_token_has_prefix() {
        let mgr = test_manager();
        let token = mgr.issue_token(24, "test").expect("should issue token");
        assert!(token.starts_with(TOKEN_PREFIX));
    }

    #[test]
    fn test_validate_valid_token() {
        let mgr = test_manager();
        let token = mgr.issue_token(24, "my-label").expect("should issue");
        let claims = mgr.validate_token(&token).expect("should validate");
        assert_eq!(claims.label, "my-label");
        assert!(!claims.sub.is_empty());
    }

    #[test]
    fn test_validate_wrong_prefix() {
        let mgr = test_manager();
        let result = mgr.validate_token("wrong_prefix_abc");
        assert!(matches!(result, Err(TokenError::InvalidPrefix)));
    }

    #[test]
    fn test_validate_invalid_jwt() {
        let mgr = test_manager();
        let result = mgr.validate_token("la_sk_not-a-valid-jwt");
        assert!(matches!(result, Err(TokenError::Invalid(_))));
    }

    #[test]
    fn test_revoke_token() {
        let mgr = test_manager();
        let token = mgr.issue_token(24, "revoke-me").expect("should issue");
        let claims = mgr.validate_token(&token).expect("should validate first");

        mgr.revoke_token(&claims.sub).expect("should revoke");
        mgr.revoke_token(&claims.sub)
            .expect("repeated revocation should stay idempotent");

        let result = mgr.validate_token(&token);
        assert!(matches!(result, Err(TokenError::Revoked)));
    }

    #[test]
    fn test_revoke_unknown_token_reports_not_found() {
        let result = test_manager().revoke_token("missing-token-id");
        assert!(matches!(result, Err(TokenError::NotFound(id)) if id == "missing-token-id"));
    }

    #[test]
    fn test_expired_token() {
        let mgr = test_manager();
        // Issue with 0 hours TTL — should expire immediately
        let token = mgr.issue_token(0, "expired").expect("should issue");
        // Token with exp == iat should be expired by the time we validate
        let result = mgr.validate_token(&token);
        // This might or might not be expired depending on clock resolution,
        // so we just verify it doesn't panic
        match result {
            Ok(_) | Err(TokenError::Expired) => {} // both acceptable
            Err(e) => panic!("Unexpected error: {e}"),
        }
    }

    #[test]
    fn test_list_tokens_returns_records() {
        let mgr = test_manager();
        let _t1 = mgr.issue_token(1, "one").unwrap();
        let _t2 = mgr.issue_token(1, "two").unwrap();
        let list = mgr.list_tokens().unwrap();
        assert_eq!(list.len(), 2);
        let labels: Vec<_> = list.iter().map(|r| r.label.as_str()).collect();
        assert!(labels.contains(&"one"));
        assert!(labels.contains(&"two"));
    }

    #[test]
    fn account_binding_is_available_during_request_routing() {
        let mgr = test_manager();
        let token = mgr.issue_token_for(1, "bound", Some("account-2")).unwrap();
        let claims = mgr.validate_token(&token).unwrap();

        assert_eq!(
            mgr.account_for(&claims.sub).unwrap().as_deref(),
            Some("account-2")
        );
    }

    #[test]
    fn test_unlimited_token_never_hits_budget() {
        let mgr = test_manager();
        let token = mgr.issue_token(24, "unlimited").unwrap();
        let claims = mgr.validate_token(&token).unwrap();
        // No max_requests → every request is permitted.
        for _ in 0..1000 {
            mgr.enforce_request_budget(&claims.sub)
                .expect("unlimited token must never be limited");
        }
    }

    #[test]
    fn test_request_budget_enforced() {
        let mgr = test_manager();
        let token = mgr
            .issue_token_full(24, "capped", None, Some(3))
            .expect("should issue capped token");
        let claims = mgr.validate_token(&token).unwrap();

        // First three requests are allowed and recorded.
        mgr.enforce_request_budget(&claims.sub).unwrap();
        mgr.enforce_request_budget(&claims.sub).unwrap();
        mgr.enforce_request_budget(&claims.sub).unwrap();

        // The fourth exceeds the budget.
        let r = mgr.enforce_request_budget(&claims.sub);
        assert!(matches!(r, Err(TokenError::LimitExceeded)));

        // Usage is persisted on the record.
        let rec = mgr
            .list_tokens()
            .unwrap()
            .into_iter()
            .find(|r| r.id == claims.sub)
            .unwrap();
        assert_eq!(rec.max_requests, Some(3));
        assert_eq!(rec.used_requests, 3);
    }

    #[test]
    fn actual_token_spend_stops_only_the_exhausted_token() {
        let mgr = test_manager();
        let capped = mgr
            .issue(&IssueRequest {
                ttl_hours: 24,
                label: "capped",
                max_tokens: Some(5),
                ..IssueRequest::default()
            })
            .unwrap();
        let other = mgr.issue_token(24, "other").unwrap();
        let capped_id = mgr.validate_token(&capped).unwrap().sub;
        let other_id = mgr.validate_token(&other).unwrap().sub;

        mgr.enforce_request_budget(&capped_id).unwrap();
        mgr.record_token_usage(&capped_id, 5).unwrap();

        assert!(matches!(
            mgr.enforce_request_budget(&capped_id),
            Err(TokenError::TokenLimitExceeded)
        ));
        mgr.enforce_request_budget(&other_id)
            .expect("one token's spend must not affect another token");
    }

    #[test]
    fn per_token_rate_limit_rejects_only_the_bursting_token() {
        let mgr = test_manager();
        let limited = mgr
            .issue(&IssueRequest {
                ttl_hours: 24,
                label: "limited",
                rate_limit_per_minute: Some(1),
                ..IssueRequest::default()
            })
            .unwrap();
        let other = mgr.issue_token(24, "other").unwrap();
        let limited_id = mgr.validate_token(&limited).unwrap().sub;
        let other_id = mgr.validate_token(&other).unwrap().sub;

        mgr.enforce_request_budget(&limited_id).unwrap();
        assert!(matches!(
            mgr.enforce_request_budget(&limited_id),
            Err(TokenError::RateLimitExceeded)
        ));
        mgr.enforce_request_budget(&other_id)
            .expect("rate windows must be isolated by token id");
    }

    #[test]
    fn test_budget_for_unknown_token_is_permitted() {
        // A token id with no stored record (e.g. memory store cleared) is not
        // budget-limited — validation, not budgeting, is the gate there.
        let mgr = test_manager();
        mgr.enforce_request_budget("no-such-id").unwrap();
    }

    #[test]
    fn test_persistent_store_roundtrip() {
        use crate::storage::TextTokenStore;
        let dir = tempfile::tempdir().unwrap();
        let store: Arc<dyn TokenStore> =
            Arc::new(TextTokenStore::open(dir.path().join("t.lino")).unwrap());
        let mgr = TokenManager::with_store("k", Arc::clone(&store));
        let tok = mgr.issue_token(1, "persisted").unwrap();
        let claims = mgr.validate_token(&tok).unwrap();

        // re-open the same store with a fresh manager
        let store2: Arc<dyn TokenStore> =
            Arc::new(TextTokenStore::open(dir.path().join("t.lino")).unwrap());
        let mgr2 = TokenManager::with_store("k", store2);
        // record should still be there
        assert_eq!(mgr2.list_tokens().unwrap().len(), 1);
        // revocation persists
        mgr2.revoke_token(&claims.sub).unwrap();
        let store3: Arc<dyn TokenStore> =
            Arc::new(TextTokenStore::open(dir.path().join("t.lino")).unwrap());
        let mgr3 = TokenManager::with_store("k", store3);
        let r = mgr3.validate_token(&tok);
        assert!(matches!(r, Err(TokenError::Revoked)));
    }

    #[test]
    fn test_admin_scope_is_carried_by_claims_and_records() {
        let mgr = test_manager();
        let token = mgr.issue_admin_token(1, "ops").expect("should issue");
        let claims = mgr.validate_token(&token).expect("should validate");
        assert!(claims.is_admin());
        assert_eq!(claims.scope, ADMIN_SCOPE);

        let records = mgr.list_tokens().expect("should list");
        assert_eq!(records.len(), 1);
        assert_eq!(records[0].scope, ADMIN_SCOPE);
    }

    #[test]
    fn test_client_tokens_carry_no_scope() {
        let mgr = test_manager();
        let token = mgr.issue_token(1, "client").expect("should issue");
        let claims = mgr.validate_token(&token).expect("should validate");
        assert!(!claims.is_admin());
        assert!(claims.scope.is_empty());
        assert!(matches!(
            mgr.validate_admin_token(&token),
            Err(TokenError::InsufficientScope)
        ));
    }

    #[test]
    fn test_has_active_admin_token_tracks_revocation_and_expiry() {
        let mgr = test_manager();
        assert!(!mgr.has_active_admin_token().expect("should query"));

        mgr.issue_token(1, "client").expect("should issue");
        assert!(
            !mgr.has_active_admin_token().expect("should query"),
            "client tokens must not satisfy the admin-credential check"
        );

        mgr.issue(&IssueRequest {
            ttl_hours: -1,
            label: "stale",
            scope: ADMIN_SCOPE,
            ..IssueRequest::default()
        })
        .expect("should issue");
        assert!(
            !mgr.has_active_admin_token().expect("should query"),
            "expired admin tokens must not count"
        );

        let token = mgr.issue_admin_token(1, "ops").expect("should issue");
        assert!(mgr.has_active_admin_token().expect("should query"));

        let claims = mgr.validate_token(&token).expect("should validate");
        mgr.revoke_token(&claims.sub).expect("should revoke");
        assert!(!mgr.has_active_admin_token().expect("should query"));
    }

    #[test]
    fn test_rotate_admin_token_issues_a_replacement_and_revokes_the_old_one() {
        let mgr = test_manager();
        let old = mgr.issue_admin_token(1, "ops").expect("should issue");
        let old_claims = mgr.validate_token(&old).expect("should validate");

        let new = mgr
            .rotate_admin_token(&old_claims.sub, 2, "ops-rotated")
            .expect("should rotate");

        let new_claims = mgr.validate_admin_token(&new).expect("should validate");
        assert_eq!(new_claims.label, "ops-rotated");
        assert_ne!(new_claims.sub, old_claims.sub);
        assert!(matches!(mgr.validate_token(&old), Err(TokenError::Revoked)));
        assert!(mgr.has_active_admin_token().expect("should query"));
    }

    #[test]
    fn test_rotate_admin_token_rejects_an_unknown_subject() {
        let mgr = test_manager();
        let live = mgr.issue_admin_token(1, "ops").expect("should issue");

        assert!(mgr.rotate_admin_token("not-an-id", 1, "typo").is_err());
        // The existing credential must survive a failed rotation, and no
        // replacement may have been handed out.
        assert!(mgr.validate_admin_token(&live).is_ok());
        assert_eq!(mgr.list_tokens().expect("should list").len(), 1);
    }

    #[test]
    fn ordinary_token_rotation_preserves_its_controls_and_revokes_the_old_token() {
        let mgr = test_manager();
        let old = mgr
            .issue(&IssueRequest {
                ttl_hours: 1,
                label: "worker",
                account: Some("account-2"),
                max_requests: Some(10),
                max_tokens: Some(1_000),
                rate_limit_per_minute: Some(3),
                scope: "",
            })
            .unwrap();
        let old_claims = mgr.validate_token(&old).unwrap();

        let new = mgr.rotate_token(&old_claims.sub, 2, "").unwrap();
        let new_claims = mgr.validate_token(&new).unwrap();
        let record = mgr.store().get(&new_claims.sub).unwrap().unwrap();

        assert_eq!(record.label, "worker");
        assert_eq!(record.account.as_deref(), Some("account-2"));
        assert_eq!(record.max_requests, Some(10));
        assert_eq!(record.max_tokens, Some(1_000));
        assert_eq!(record.rate_limit_per_minute, Some(3));
        assert!(matches!(mgr.validate_token(&old), Err(TokenError::Revoked)));
    }

    #[test]
    fn test_constant_time_eq_matches_string_equality() {
        assert!(constant_time_eq("", ""));
        assert!(constant_time_eq("s3cret", "s3cret"));
        assert!(!constant_time_eq("s3cret", "s3crev"));
        // Length differences must not short-circuit into a match.
        assert!(!constant_time_eq("s3cret", "s3cre"));
        assert!(!constant_time_eq("s3cre", "s3cret"));
    }
}
