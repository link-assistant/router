//! Authorisation decision for the administrative endpoints.
//!
//! Kept separate from [`crate::proxy`] so the rule can be exercised directly by
//! unit tests without standing up an [`crate::app_state::AppState`], and so the
//! HTTP layer holds nothing but header plumbing.

use crate::token::{TokenManager, constant_time_eq};

/// Decide whether a caller may touch the administrative endpoints.
///
/// Two credentials are accepted, in this order:
///
/// 1. an admin-scoped `la_sk_…` JWT (see [`crate::token::ADMIN_SCOPE`]) —
///    identified, expiring, revocable, and rotatable;
/// 2. the flat `TOKEN_ADMIN_KEY` bootstrap secret, compared in constant time.
///    It is kept because it is the only way to provision the *first* credential
///    in a deployment that configures everything externally.
///
/// When neither is presented the request is refused, unless the operator
/// explicitly opted out with `--allow-anonymous-admin`. That default is the
/// inverse of the historical behaviour, where an unconfigured admin key left
/// the token-administration endpoints wide open.
#[must_use]
pub fn admin_access_granted(
    manager: &TokenManager,
    provided: Option<&str>,
    admin_key: Option<&str>,
    allow_anonymous: bool,
) -> bool {
    if let Some(provided) = provided {
        if manager.validate_admin_token(provided).is_ok() {
            return true;
        }
        if let Some(required) = admin_key
            && constant_time_eq(provided, required)
        {
            return true;
        }
    }
    allow_anonymous
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::token::{IssueRequest, TokenError};

    fn manager() -> TokenManager {
        TokenManager::new("secret-for-admin-auth-tests")
    }

    /// Reproduces the issue: with no admin key configured, an unauthenticated
    /// request used to be authorised (`POST /api/tokens` answered `200`).
    #[test]
    fn unauthenticated_request_is_refused_when_no_credential_is_configured() {
        assert!(!admin_access_granted(&manager(), None, None, false));
    }

    #[test]
    fn unauthenticated_request_is_refused_when_an_admin_key_is_configured() {
        assert!(!admin_access_granted(
            &manager(),
            None,
            Some("s3cret"),
            false
        ));
    }

    #[test]
    fn anonymous_access_requires_an_explicit_opt_out() {
        assert!(admin_access_granted(&manager(), None, None, true));
    }

    #[test]
    fn admin_scoped_token_is_accepted() {
        let mgr = manager();
        let token = mgr
            .issue_admin_token(1, "ops")
            .expect("should issue admin token");
        assert!(admin_access_granted(&mgr, Some(&token), None, false));
    }

    #[test]
    fn ordinary_client_token_is_rejected() {
        let mgr = manager();
        let token = mgr.issue_token(1, "client").expect("should issue");
        assert!(matches!(
            mgr.validate_admin_token(&token),
            Err(TokenError::InsufficientScope)
        ));
        assert!(!admin_access_granted(&mgr, Some(&token), None, false));
    }

    #[test]
    fn revoked_admin_token_is_rejected() {
        let mgr = manager();
        let token = mgr.issue_admin_token(1, "ops").expect("should issue");
        let claims = mgr.validate_token(&token).expect("should validate");
        mgr.revoke_token(&claims.sub).expect("should revoke");
        assert!(!admin_access_granted(&mgr, Some(&token), None, false));
    }

    #[test]
    fn expired_admin_token_is_rejected() {
        let mgr = manager();
        let token = mgr
            .issue(&IssueRequest {
                ttl_hours: -1,
                label: "stale",
                scope: crate::token::ADMIN_SCOPE,
                ..IssueRequest::default()
            })
            .expect("should issue");
        assert!(!admin_access_granted(&mgr, Some(&token), None, false));
    }

    #[test]
    fn flat_admin_key_still_works_as_a_bootstrap_credential() {
        let mgr = manager();
        assert!(admin_access_granted(
            &mgr,
            Some("s3cret"),
            Some("s3cret"),
            false
        ));
        assert!(!admin_access_granted(
            &mgr,
            Some("wrong"),
            Some("s3cret"),
            false
        ));
    }
}
