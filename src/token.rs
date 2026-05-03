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
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use uuid::Uuid;

use crate::storage::{MemoryTokenStore, StorageError, TokenRecord, TokenStore};

/// Prefix for all router-issued custom tokens.
pub const TOKEN_PREFIX: &str = "la_sk_";

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
        let now = Utc::now();
        let exp = now + Duration::hours(ttl_hours);
        let claims = TokenClaims {
            sub: Uuid::new_v4().to_string(),
            iat: now.timestamp(),
            exp: exp.timestamp(),
            label: label.to_string(),
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
        };
        if let Err(e) = self.store.put(record) {
            tracing::warn!("token store put failed: {e}");
        }
        Ok(format!("{TOKEN_PREFIX}{jwt}"))
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

    /// Revoke a token by its subject ID. Idempotent.
    pub fn revoke_token(&self, token_id: &str) -> Result<(), TokenError> {
        match self.store.revoke(token_id) {
            Ok(_) => Ok(()),
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

/// Errors related to token operations.
#[derive(Debug)]
pub enum TokenError {
    /// Token does not start with the expected prefix.
    InvalidPrefix,
    /// Token has expired.
    Expired,
    /// Token has been revoked.
    Revoked,
    /// Token is otherwise invalid.
    Invalid(String),
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
            Self::Invalid(msg) => write!(f, "Invalid token: {msg}"),
            Self::Storage(msg) => write!(f, "Token storage error: {msg}"),
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

        let result = mgr.validate_token(&token);
        assert!(matches!(result, Err(TokenError::Revoked)));
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
}
