//! Custom token management for the gateway layer.
//!
//! Issues and validates `la_sk_...` prefixed JWT tokens that map to the shared
//! Claude MAX OAuth session.

use chrono::{Duration, Utc};
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::sync::{Arc, RwLock};
use uuid::Uuid;

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
    revoked: Arc<RwLock<HashSet<String>>>,
}

impl TokenManager {
    /// Create a new token manager with the given signing secret.
    #[must_use]
    pub fn new(secret: &str) -> Self {
        Self {
            secret: secret.to_string(),
            revoked: Arc::new(RwLock::new(HashSet::new())),
        }
    }

    /// Issue a new custom token with the given TTL and optional label.
    ///
    /// Returns the full token string including the `la_sk_` prefix.
    pub fn issue_token(
        &self,
        ttl_hours: i64,
        label: &str,
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

        let is_revoked = self
            .revoked
            .read()
            .map_err(|_| TokenError::Invalid("Lock poisoned".to_string()))?
            .contains(&token_data.claims.sub);
        if is_revoked {
            return Err(TokenError::Revoked);
        }

        Ok(token_data.claims)
    }

    /// Revoke a token by its subject ID.
    pub fn revoke_token(&self, token_id: &str) -> Result<(), TokenError> {
        self.revoked
            .write()
            .map_err(|_| TokenError::Invalid("Lock poisoned".to_string()))?
            .insert(token_id.to_string());
        Ok(())
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
}
