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
    /// Repositories this token may reach through the GitHub proxy.
    ///
    /// Empty means unrestricted, which is the default and the behaviour every
    /// existing token keeps: the proxy already replaces a direct credential
    /// with a mediated one, and narrowing beyond that is an opt-in an operator
    /// states per token (issue #262). Entries are `owner/repo`, matched
    /// case-insensitively as GitHub itself does.
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub github_repos: Vec<String>,
    /// Canonical Router client adapter this token is immutably bound to.
    /// Absent on manual, administrative, and pre-#389 tokens.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub client_kind: Option<String>,
    /// Trusted subscriber identity, distinct from `sub` (the token id).
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub principal_id: Option<String>,
}

impl TokenClaims {
    /// Whether this token may act on `owner/repo` through the GitHub proxy.
    ///
    /// An unrestricted token reaches whatever the operator credential reaches,
    /// which is the default: the proxy's purpose is to keep the credential out
    /// of the caller's hands, and narrowing further is an opt-in (issue #262).
    /// Comparison is case-insensitive because GitHub treats owner and repo
    /// names that way, so a scope written in one casing must not be evaded by
    /// requesting another.
    #[must_use]
    pub fn may_reach_repository(&self, repository: &str) -> bool {
        self.github_repos.is_empty()
            || self
                .github_repos
                .iter()
                .any(|allowed| allowed.eq_ignore_ascii_case(repository))
    }

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
    /// Repositories this token may reach through the GitHub proxy; empty is
    /// unrestricted (issue #262).
    pub github_repos: Vec<String>,
    /// How long the expiry slides ahead of activity, in seconds.
    ///
    /// `None` keeps the fixed clock every token had before: the expiry set
    /// here is final. `Some(window)` extends it on use, so a session that is
    /// still being typed into does not die mid-work (issue #354).
    pub sliding_window_seconds: Option<i64>,
    /// Canonical managed client adapter, paired with `principal_id`.
    pub client_kind: Option<&'a str>,
    /// Subscriber/account principal, paired with `client_kind`.
    pub principal_id: Option<&'a str>,
}

/// Constraint changes to apply while rotating a token.
///
/// Every field is optional: `None` keeps whatever the existing record carries,
/// so a rotation preserves the credential's blast radius by default and only
/// changes what the operator named explicitly.
#[derive(Debug, Default, Clone)]
pub struct RotateOverrides<'a> {
    /// Replacement label; `None` keeps the existing one.
    pub label: Option<&'a str>,
    /// Replacement TTL in hours; `None` keeps the remaining lifetime.
    pub ttl_hours: Option<i64>,
    /// Replacement request cap.
    pub max_requests: Option<u64>,
    /// Replacement token spend cap.
    pub max_tokens: Option<u64>,
    /// Replacement per-minute request rate.
    pub rate_limit_per_minute: Option<u64>,
    /// Replacement account pin.
    pub account: Option<&'a str>,
}

/// Largest TTL an issued token may carry, in hours (about ten years).
///
/// A cap keeps a mistyped TTL from minting a credential that outlives every
/// operator who remembers it, while staying far above any legitimate use.
pub const MAX_TTL_HOURS: i64 = 24 * 365 * 10;

impl IssueRequest<'_> {
    /// Check the constraint values before a token is minted.
    ///
    /// Every admin surface — CLI, HTTP, Telegram and VK — funnels through this
    /// so the same input is accepted or rejected identically everywhere
    /// (issue #194); previously only the chat commands validated anything, and
    /// they did it with their own rules.
    ///
    /// # Errors
    ///
    /// Returns a human-readable message naming the offending field.
    pub fn validate(&self) -> Result<(), String> {
        if self.ttl_hours <= 0 {
            return Err("ttl_hours must be a positive whole number of hours.".to_string());
        }
        if self.ttl_hours > MAX_TTL_HOURS {
            return Err(format!(
                "ttl_hours must not exceed {MAX_TTL_HOURS} (about ten years)."
            ));
        }
        // A zero budget mints a credential that can never serve a request; that
        // is a typo rather than an intent, so it is rejected instead of stored.
        if self.max_requests == Some(0) {
            return Err("max_requests must be greater than zero.".to_string());
        }
        if self.max_tokens == Some(0) {
            return Err("max_tokens must be greater than zero.".to_string());
        }
        if self.rate_limit_per_minute == Some(0) {
            return Err("rate_limit_per_minute must be greater than zero.".to_string());
        }
        if !self.scope.is_empty() && self.scope != ADMIN_SCOPE {
            return Err(format!(
                "scope must be empty (client) or \"{ADMIN_SCOPE}\"."
            ));
        }
        match (self.client_kind, self.principal_id) {
            (None, None) => {}
            (Some(client), Some(principal)) => {
                if !self.scope.is_empty() {
                    return Err("administrative tokens cannot carry a client binding".to_string());
                }
                if crate::clients::ClientKind::from_str_opt(client).is_none() {
                    return Err(format!("unknown Router client kind '{client}'."));
                }
                if principal.trim().is_empty() {
                    return Err("principal_id must not be empty.".to_string());
                }
                if self.account != Some(principal) {
                    return Err(
                        "principal_id must equal the token's strict account binding.".to_string(),
                    );
                }
            }
            _ => {
                return Err(
                    "client_kind and principal_id must either both be set or both be absent."
                        .to_string(),
                );
            }
        }
        for repository in &self.github_repos {
            // `owner/repo` exactly: a bare owner would read as "the whole
            // account", and a path with more segments would silently match
            // nothing, which is the wrong failure for a security control.
            let mut parts = repository.split('/');
            let valid = matches!(
                (parts.next(), parts.next(), parts.next()),
                (Some(owner), Some(repo), None)
                    if !owner.is_empty()
                        && !repo.is_empty()
                        && !owner.contains(char::is_whitespace)
                        && !repo.contains(char::is_whitespace)
            );
            if !valid {
                return Err(format!(
                    "github repository scope must be \"owner/repo\"; got \"{repository}\"."
                ));
            }
        }
        Ok(())
    }
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
            github_repos: Vec::new(),
            sliding_window_seconds: None,
            client_kind: None,
            principal_id: None,
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
            github_repos: Vec::new(),
            sliding_window_seconds: None,
            client_kind: None,
            principal_id: None,
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
        // A command that will never sign installs a stand-in secret so it need
        // not carry this machine's. Signing with one produced a normal-looking
        // `la_sk_` token anybody holding the source could forge (issue #300),
        // so it is refused here — at the moment something would be signed.
        if crate::token_secret::is_placeholder(&self.secret) {
            return Err(jsonwebtoken::errors::ErrorKind::InvalidKeyFormat.into());
        }
        let ttl_hours = request.ttl_hours;
        let label = request.label;
        let account = request.account;
        let max_requests = request.max_requests;
        let now = Utc::now();
        let exp = now + Duration::hours(ttl_hours);
        let client_kind = request
            .client_kind
            .and_then(crate::clients::ClientKind::from_str_opt)
            .map(|client| client.canonical_name().to_string());
        let claims = TokenClaims {
            sub: Uuid::new_v4().to_string(),
            iat: now.timestamp(),
            exp: exp.timestamp(),
            label: label.to_string(),
            scope: request.scope.to_string(),
            github_repos: request.github_repos.clone(),
            client_kind,
            principal_id: request.principal_id.map(str::to_string),
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
            sliding_window_seconds: request.sliding_window_seconds,
            account: account.map(String::from),
            max_requests,
            used_requests: 0,
            max_tokens: request.max_tokens,
            used_tokens: 0,
            reserved_tokens: 0,
            rate_limit_per_minute: request.rate_limit_per_minute,
            rate_window_started_at: 0,
            rate_window_requests: 0,
            scope: claims.scope,
            github_repos: claims.github_repos,
            client_kind: claims.client_kind,
            principal_id: claims.principal_id,
        };
        let id = record.id.clone();
        // A token that was handed out but never stored is worse than a
        // refusal: the router cannot recognise it, and the holder only finds
        // out when they try to use it. The failure has to reach the caller
        // rather than a log line nothing reads (issue #374).
        self.store.put(record).map_err(|error| {
            tracing::error!("token store put failed, no token issued: {error}");
            jsonwebtoken::errors::Error::from(jsonwebtoken::errors::ErrorKind::InvalidToken)
        })?;
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
        self.enforce_request_budget_reserving(token_id, 0)
    }

    /// Enforce every per-token budget and reserve `reserve` tokens of spend.
    ///
    /// `reserve` is the largest number of tokens this request could report, so a
    /// request is admitted only when its own worst case still fits under
    /// `max_tokens`. The caller must pair every `Ok(())` with
    /// [`TokenManager::settle_token_usage`] so the reservation is released.
    pub fn enforce_request_budget_reserving(
        &self,
        token_id: &str,
        reserve: u64,
    ) -> Result<(), TokenError> {
        match self
            .store
            .try_admit_request_reserving(token_id, Utc::now().timestamp(), reserve)
        {
            Ok(RequestAdmission::Admitted) => Ok(()),
            // The counts are in the record the store just compared against,
            // so the rejection can say how far over the bound the caller is
            // rather than only that they are (issue #355).
            Ok(RequestAdmission::RequestLimitExceeded) => Err(TokenError::LimitExceeded(
                self.budget_facts(token_id, |record| {
                    record.max_requests.map(|limit| BudgetFacts {
                        used: record.used_requests,
                        limit,
                    })
                }),
            )),
            Ok(RequestAdmission::TokenLimitExceeded) => Err(TokenError::TokenLimitExceeded(
                self.budget_facts(token_id, |record| {
                    record.max_tokens.map(|limit| BudgetFacts {
                        used: record.used_tokens,
                        limit,
                    })
                }),
            )),
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

    /// Release a request's reservation and record what it actually spent.
    pub fn settle_token_usage(
        &self,
        token_id: &str,
        reserved: u64,
        actual: u64,
    ) -> Result<(), TokenError> {
        self.store
            .settle_token_usage(token_id, reserved, actual)
            .map_err(|error| TokenError::Storage(error.to_string()))
    }

    /// Clear reservations orphaned by a previous process.
    pub fn release_stale_reservations(&self) -> Result<usize, TokenError> {
        self.store
            .release_stale_reservations()
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
        if crate::token_secret::is_placeholder(&self.secret) {
            return Err(TokenError::Invalid(crate::token_secret::refusal()));
        }
        let jwt = token
            .strip_prefix(TOKEN_PREFIX)
            .ok_or(TokenError::InvalidPrefix)?;

        let token_data = decode::<TokenClaims>(
            jwt,
            &DecodingKey::from_secret(self.secret.as_bytes()),
            &Validation::default(),
        )
        .or_else(|e| match e.kind() {
            // The decoder enforces the `exp` the token was signed with, which
            // a sliding token outgrows: the store holds the extended expiry,
            // and the signature says nothing about it. So a stale signature
            // is re-checked against the record before it is a rejection
            // (issue #354).
            jsonwebtoken::errors::ErrorKind::ExpiredSignature => self
                .decode_ignoring_expiry(jwt)
                .filter(|data| self.expiry_slid_past(&data.claims.sub))
                .ok_or_else(|| {
                    // The decoder knows only that the signature is stale; the
                    // record knows when it was issued and when it lapsed
                    // (issue #355).
                    TokenError::Expired(self.expiry_facts(jwt))
                }),
            _ => Err(TokenError::Invalid(e.to_string())),
        })?;

        let stored = self
            .store
            .get(&token_data.claims.sub)
            .map_err(|e| TokenError::Storage(e.to_string()))?;
        if let Some(record) = stored {
            if record.revoked {
                return Err(TokenError::Revoked);
            }
            if record.client_kind != token_data.claims.client_kind
                || record.principal_id != token_data.claims.principal_id
            {
                return Err(TokenError::Invalid(
                    "signed client binding does not match the durable token record".to_string(),
                ));
            }
        } else if token_data.claims.client_kind.is_some()
            || token_data.claims.principal_id.is_some()
        {
            return Err(TokenError::Invalid(
                "bound client token has no durable token record".to_string(),
            ));
        }

        Ok(token_data.claims)
    }

    /// Read the counts behind a spent budget from the record itself.
    ///
    /// Best effort: a rejection must still be returned if the store cannot be
    /// read, so this yields `None` rather than replacing one failure with
    /// another.
    fn budget_facts(
        &self,
        token_id: &str,
        pick: impl Fn(&TokenRecord) -> Option<BudgetFacts>,
    ) -> Option<BudgetFacts> {
        self.store
            .get(token_id)
            .ok()
            .flatten()
            .as_ref()
            .and_then(pick)
    }

    /// Test-only access to [`Self::decode_ignoring_expiry`].
    #[cfg(test)]
    pub(crate) fn decode_ignoring_expiry_for_test(&self, token: &str) -> Option<TokenClaims> {
        let jwt = token.strip_prefix(TOKEN_PREFIX)?;
        self.decode_ignoring_expiry(jwt).map(|data| data.claims)
    }

    /// Decode a token whose signature is valid but whose `exp` has passed.
    ///
    /// The signature is still verified, so a forged token cannot reach this.
    fn decode_ignoring_expiry(&self, jwt: &str) -> Option<jsonwebtoken::TokenData<TokenClaims>> {
        let validation = Validation {
            validate_exp: false,
            ..Validation::default()
        };
        decode::<TokenClaims>(
            jwt,
            &DecodingKey::from_secret(self.secret.as_bytes()),
            &validation,
        )
        .ok()
    }

    /// Whether the store says this token is still live past its signed `exp`.
    ///
    /// True only for a sliding token whose record has been pushed ahead of now
    /// by activity. A fixed-clock token, a revoked one, or one whose window
    /// has genuinely lapsed is not live, so this cannot resurrect anything the
    /// old behaviour would have refused (issue #354).
    fn expiry_slid_past(&self, token_id: &str) -> bool {
        self.store
            .get(token_id)
            .ok()
            .flatten()
            .is_some_and(|record| {
                record.sliding_window_seconds.is_some()
                    && !record.revoked
                    && record.expires_at > Utc::now().timestamp()
            })
    }

    /// The facts behind an expiry, read from the token that just failed.
    ///
    /// Decoding again with expiry validation disabled is what makes the claims
    /// readable at all -- the first decode refused them precisely because they
    /// were stale. The signature is still verified, so a forged token cannot
    /// drive this (issue #355).
    fn expiry_facts(&self, jwt: &str) -> Option<ExpiryFacts> {
        let validation = Validation {
            validate_exp: false,
            ..Validation::default()
        };
        let claims = decode::<TokenClaims>(
            jwt,
            &DecodingKey::from_secret(self.secret.as_bytes()),
            &validation,
        )
        .ok()?
        .claims;
        let expires_at = claims.exp;
        let issued_at = self
            .store
            .get(&claims.sub)
            .ok()
            .flatten()
            .map_or(expires_at, |record| record.issued_at);
        Some(ExpiryFacts {
            issued_at,
            expires_at,
            ago_seconds: Utc::now().timestamp().saturating_sub(expires_at),
        })
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
        self.rotate_token_with(
            current_sub,
            &RotateOverrides {
                label: (!label.is_empty()).then_some(label),
                ttl_hours: Some(ttl_hours),
                ..RotateOverrides::default()
            },
        )
    }

    /// Rotate a token, preserving every constraint that is not overridden.
    ///
    /// Reissue must not silently widen or narrow a credential's blast radius,
    /// so each unset override carries the stored value forward (issue #194).
    /// The replacement is minted before the old value is revoked, so a failed
    /// mint leaves the existing credential working.
    ///
    /// # Errors
    ///
    /// Returns [`TokenError::Invalid`] when the id is unknown or the resulting
    /// constraints fail [`IssueRequest::validate`], and [`TokenError::Storage`]
    /// when the store cannot be read or written.
    pub fn rotate_token_with(
        &self,
        current_sub: &str,
        overrides: &RotateOverrides<'_>,
    ) -> Result<String, TokenError> {
        let record = self
            .store
            .get(current_sub)
            .map_err(|error| TokenError::Storage(error.to_string()))?
            .ok_or_else(|| TokenError::Invalid(format!("unknown token id {current_sub}")))?;
        // Remaining lifetime is preserved when no new TTL is requested, so a
        // rotation is not a silent extension of the credential's validity.
        let remaining_hours = || {
            let remaining = record.expires_at.saturating_sub(Utc::now().timestamp());
            (remaining / 3600).max(1)
        };
        let request = IssueRequest {
            ttl_hours: overrides.ttl_hours.unwrap_or_else(remaining_hours),
            label: overrides.label.unwrap_or(&record.label),
            account: overrides.account.or(record.account.as_deref()),
            max_requests: overrides.max_requests.or(record.max_requests),
            max_tokens: overrides.max_tokens.or(record.max_tokens),
            rate_limit_per_minute: overrides
                .rate_limit_per_minute
                .or(record.rate_limit_per_minute),
            scope: &record.scope,
            // Rotation preserves the blast radius: a rotated credential that
            // silently widened to the whole account would defeat the scope
            // (issue #262).
            github_repos: record.github_repos.clone(),
            sliding_window_seconds: None,
            client_kind: record.client_kind.as_deref(),
            principal_id: record.principal_id.as_deref(),
        };
        request.validate().map_err(TokenError::Invalid)?;
        let replacement = self
            .issue(&request)
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

#[cfg(test)]
#[path = "token_tests.rs"]
mod tests;
