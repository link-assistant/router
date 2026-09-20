//! Renewable wrapper-process leases used by safe local deployment inventory.

use super::{IssueRequest, ModelAccessPolicy, TokenError, TokenManager};

/// How long a wrapper stays provably live without another heartbeat.
pub const RUN_LEASE_TTL_SECONDS: i64 = 120;

impl TokenManager {
    /// Issue an ephemeral, model-pinned token with an explicit liveness lease.
    pub fn issue_ephemeral_with_model_policy_and_run_lease(
        &self,
        request: &IssueRequest<'_>,
        model_policy: &ModelAccessPolicy,
    ) -> Result<String, jsonwebtoken::errors::Error> {
        self.issue_with_id_and_model_policy(
            request,
            true,
            model_policy,
            Some(RUN_LEASE_TTL_SECONDS),
        )
        .map(|(token, _)| token)
    }

    /// Extend an existing lease; an authenticated wrapper may recover after a
    /// server outage, but a legacy record with no lease is never promoted.
    pub fn renew_run_lease(&self, token_id: &str) -> Result<i64, TokenError> {
        self.store
            .renew_run_lease(
                token_id,
                chrono::Utc::now().timestamp(),
                RUN_LEASE_TTL_SECONDS,
            )
            .map_err(|error| TokenError::Storage(error.to_string()))?
            .ok_or_else(|| {
                TokenError::Invalid(
                    "run lease is absent, revoked, expired as a token, or not ephemeral"
                        .to_string(),
                )
            })
    }
}
