//! Incoming-token validation, its diagnostics, and the emergency bypass.

use axum::http::HeaderMap;
use jsonwebtoken::{DecodingKey, Validation, decode};

use super::{TokenClaims, TokenError, TokenManager, token_jwt};
use crate::auth_diagnostics::AuthDiagnostics;
use crate::emergency_auth::EmergencyAuth;

impl TokenManager {
    /// Validate a custom token string.
    ///
    /// Strips either Router carrier prefix, decodes the same JWT, checks
    /// expiration and revocation status, and returns the claims if valid.
    /// This is always the strict check: the emergency mode is applied only by
    /// [`Self::authenticate_incoming`], never here.
    pub fn validate_token(&self, token: &str) -> Result<TokenClaims, TokenError> {
        if crate::token_secret::is_placeholder(&self.secret) {
            return Err(TokenError::IssuerSecretUnset);
        }
        let jwt = token_jwt(token).ok_or(TokenError::InvalidPrefix)?;

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
            // Minted under another issuer secret: a different repair from a
            // corrupt token, so it is told apart (issue #644).
            jsonwebtoken::errors::ErrorKind::InvalidSignature => Err(TokenError::SignatureInvalid),
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
                return Err(TokenError::BindingMismatch);
            }
        } else if token_data.claims.client_kind.is_some()
            || token_data.claims.principal_id.is_some()
        {
            return Err(TokenError::MissingRecord);
        }

        Ok(token_data.claims)
    }

    /// Authenticate the Router token an incoming request presented.
    ///
    /// Normally identical to [`Self::validate_token`], plus a diagnostic
    /// record of why a rejection happened. While the explicit emergency mode
    /// is on, every non-empty token is admitted with synthetic claims instead
    /// (see [`crate::emergency_auth`]); the store is read, never written.
    pub fn authenticate_incoming(
        &self,
        token: &str,
        headers: &HeaderMap,
    ) -> Result<TokenClaims, TokenError> {
        let verdict = self.validate_token(token);
        if self.emergency.is_active() {
            let bypassed = match &verdict {
                Ok(_) => "none",
                Err(error) => error.reason_code(),
            };
            self.emergency.record_bypass(bypassed);
            let claims = crate::emergency_auth::synthetic_claims(token, headers);
            tracing::warn!(
                bypassed,
                fingerprint = %crate::emergency_auth::token_fingerprint(token),
                client = claims.client_kind.as_deref().unwrap_or("-"),
                "EMERGENCY AUTH BYPASS: admitted a Router token without normal validation"
            );
            return Ok(claims);
        }
        verdict.inspect_err(|error| self.diagnostics.record_error(error, Some(token)))
    }

    /// Live state of the explicit emergency any-token mode.
    #[must_use]
    pub fn emergency(&self) -> &EmergencyAuth {
        &self.emergency
    }

    /// Protected authentication-failure diagnostics.
    #[must_use]
    pub fn diagnostics(&self) -> &AuthDiagnostics {
        &self.diagnostics
    }
}
