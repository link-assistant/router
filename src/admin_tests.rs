//! Unit tests for the admin claim state machine ([`crate::admin`]).

use crate::admin::*;

fn claim() -> AdminClaim {
    AdminClaim::in_memory(None, Duration::from_secs(120))
}

#[test]
fn unclaimed_by_default() {
    let admin = claim();
    assert!(!admin.is_claimed());
    assert!(admin.status().bootstrap_open);
}

#[test]
fn candidate_alone_does_not_authorise() {
    let admin = claim();
    let candidate = admin.begin().expect("mint");
    assert!(!admin.verify(&candidate.token));
    assert!(!admin.is_claimed());
    assert!(admin.status().bootstrap_open);
}

#[test]
fn confirm_activates_and_closes_bootstrap() {
    let admin = claim();
    let candidate = admin.begin().expect("mint");
    admin
        .confirm(&candidate.claim_id, &candidate.token)
        .expect("confirm");
    assert!(admin.verify(&candidate.token));
    assert!(admin.is_claimed());
    assert!(!admin.status().bootstrap_open);
    assert_eq!(admin.begin().unwrap_err(), ClaimError::AlreadyClaimed);
}

#[test]
fn unconfirmed_mint_is_always_recoverable() {
    let admin = claim();
    let abandoned = admin.begin().expect("first mint");
    let second = admin.begin().expect("second mint stays allowed");
    // The abandoned candidate was discarded — only one outstanding.
    assert_eq!(
        admin.confirm(&abandoned.claim_id, &abandoned.token),
        Err(ClaimError::ClaimIdMismatch)
    );
    admin
        .confirm(&second.claim_id, &second.token)
        .expect("second confirms");
    assert!(admin.verify(&second.token));
}

#[test]
fn expired_candidate_leaves_system_unclaimed() {
    let admin = AdminClaim::in_memory(None, Duration::from_secs(0));
    let candidate = admin.begin().expect("mint");
    assert_eq!(
        admin.confirm(&candidate.claim_id, &candidate.token),
        Err(ClaimError::NoCandidate)
    );
    assert!(!admin.is_claimed());
    assert!(admin.status().bootstrap_open);
}

#[test]
fn wrong_token_is_rejected() {
    let admin = claim();
    let candidate = admin.begin().expect("mint");
    assert_eq!(
        admin.confirm(&candidate.claim_id, "la_admin_nope"),
        Err(ClaimError::TokenMismatch)
    );
    assert!(!admin.is_claimed());
}

#[test]
fn environment_key_disables_bootstrap() {
    let admin = AdminClaim::in_memory(Some("env-key".into()), Duration::from_secs(60));
    assert!(admin.is_claimed());
    assert!(admin.verify("env-key"));
    assert!(!admin.verify("other"));
    assert_eq!(
        admin.begin().unwrap_err(),
        ClaimError::ProvisionedByEnvironment
    );
}

#[test]
fn rotate_replaces_the_credential() {
    let admin = claim();
    let candidate = admin.begin().expect("mint");
    admin
        .confirm(&candidate.claim_id, &candidate.token)
        .expect("confirm");
    let replacement = admin.rotate().expect("rotate");
    assert!(admin.verify(&replacement));
    assert!(!admin.verify(&candidate.token));
}

#[test]
fn rotate_requires_an_existing_claim() {
    assert_eq!(claim().rotate().unwrap_err(), ClaimError::NoCandidate);
}

#[test]
fn claim_survives_restart() {
    let dir = tempfile::tempdir().expect("tempdir");
    let ttl = Duration::from_secs(60);
    let admin = AdminClaim::load(None, dir.path(), ttl);
    let candidate = admin.begin().expect("mint");
    admin
        .confirm(&candidate.claim_id, &candidate.token)
        .expect("confirm");

    let reloaded = AdminClaim::load(None, dir.path(), ttl);
    assert!(reloaded.is_claimed());
    assert!(reloaded.verify(&candidate.token));
    assert_eq!(reloaded.begin().unwrap_err(), ClaimError::AlreadyClaimed);
}

#[test]
fn independently_loaded_claims_have_one_cross_process_winner() {
    let dir = tempfile::tempdir().expect("tempdir");
    let ttl = Duration::from_secs(60);
    let first = AdminClaim::load(None, dir.path(), ttl);
    let second = AdminClaim::load(None, dir.path(), ttl);
    let first_candidate = first.begin().expect("first candidate");
    let second_candidate = second.begin().expect("second candidate");

    first
        .confirm(&first_candidate.claim_id, &first_candidate.token)
        .expect("first process claims");
    assert_eq!(
        second.confirm(&second_candidate.claim_id, &second_candidate.token),
        Err(ClaimError::AlreadyClaimed)
    );
    assert!(second.verify(&first_candidate.token));
    assert!(!second.verify(&second_candidate.token));
}

#[test]
fn mint_never_persists_anything() {
    let dir = tempfile::tempdir().expect("tempdir");
    let ttl = Duration::from_secs(60);
    let admin = AdminClaim::load(None, dir.path(), ttl);
    let _candidate = admin.begin().expect("mint");
    assert!(!dir.path().join(CLAIM_FILE_NAME).exists());
    assert!(!AdminClaim::load(None, dir.path(), ttl).is_claimed());
}

/// The JWT credential model. Every test above exercises the legacy opaque
/// path (no token manager attached); these attach one, which is what the
/// router itself does.
mod jwt_model {
    use super::{AdminClaim, ClaimError, CredentialKind, Duration};
    use crate::token::{ADMIN_SCOPE, TOKEN_PREFIX, TokenManager};

    fn manager() -> TokenManager {
        TokenManager::new("secret-for-admin-claim-tests")
    }

    fn claim_with(tokens: &TokenManager) -> AdminClaim {
        AdminClaim::in_memory(None, Duration::from_secs(120)).with_token_manager(tokens.clone())
    }

    fn claimed(tokens: &TokenManager) -> (AdminClaim, String) {
        let admin = claim_with(tokens);
        let candidate = admin.begin().expect("mint");
        admin
            .confirm(&candidate.claim_id, &candidate.token)
            .expect("confirm");
        (admin, candidate.token)
    }

    #[test]
    fn a_confirmed_claim_is_an_admin_scoped_jwt() {
        let tokens = manager();
        let (admin, token) = claimed(&tokens);

        assert!(
            token.starts_with(TOKEN_PREFIX),
            "claimed value is a la_sk_ JWT"
        );
        assert_eq!(
            token.trim_start_matches(TOKEN_PREFIX).split('.').count(),
            3,
            "the credential carries the three JWT segments"
        );
        let claims = tokens
            .validate_admin_token(&token)
            .expect("valid admin JWT");
        assert_eq!(claims.scope, ADMIN_SCOPE);
        assert!(!claims.sub.is_empty(), "identity");
        assert!(claims.iat > 0 && claims.exp > claims.iat, "iat/exp");
        assert_eq!(claims.label, crate::admin::CLAIM_TOKEN_LABEL);

        let status = admin.status();
        assert_eq!(status.credential_kind, CredentialKind::Jwt);
        assert_eq!(status.token_id.as_deref(), Some(claims.sub.as_str()));
        assert!(admin.verify(&token));
    }

    #[test]
    fn an_unconfirmed_candidate_authorises_nothing_anywhere() {
        let tokens = manager();
        let admin = claim_with(&tokens);
        let candidate = admin.begin().expect("mint");

        // Not the admin credential, and not a usable token on any other
        // surface either: it is minted revoked.
        assert!(!admin.verify(&candidate.token));
        assert!(tokens.validate_token(&candidate.token).is_err());
        assert!(!admin.is_claimed());
        assert!(admin.status().bootstrap_open);
    }

    #[test]
    fn confirming_retires_the_startup_bootstrap_admin_token() {
        let tokens = manager();
        let bootstrap = tokens
            .issue_admin_token(24, "bootstrap-admin")
            .expect("mint");
        assert!(tokens.validate_admin_token(&bootstrap).is_ok());

        let (admin, claimed_token) = claimed(&tokens);

        assert!(
            tokens.validate_admin_token(&bootstrap).is_err(),
            "the superseded bootstrap credential stops working"
        );
        let bootstrap_id = tokens
            .list_tokens()
            .expect("list")
            .into_iter()
            .find(|record| record.label == "bootstrap-admin")
            .expect("record");
        assert!(
            bootstrap_id.revoked,
            "and shows as revoked in the token list"
        );
        assert!(admin.verify(&claimed_token));
    }

    #[test]
    fn the_administrator_may_limit_the_credential_lifetime() {
        let tokens = manager();
        let admin = claim_with(&tokens);
        let candidate = admin.begin_with_ttl(Some(2)).expect("mint");
        assert_eq!(candidate.ttl_hours, 2);
        admin
            .confirm(&candidate.claim_id, &candidate.token)
            .expect("confirm");
        let claims = tokens
            .validate_admin_token(&candidate.token)
            .expect("valid");
        let ttl = claims.exp - claims.iat;
        assert!((7150..=7250).contains(&ttl), "two-hour TTL, got {ttl}s");

        // Absurd requests are clamped, not honoured.
        let other = claim_with(&manager());
        assert_eq!(
            other
                .begin_with_ttl(Some(i64::MAX))
                .expect("mint")
                .ttl_hours,
            crate::admin::DEFAULT_CLAIM_TTL_HOURS
        );
    }

    #[test]
    fn an_expired_claimed_jwt_stops_authorising() {
        // Reconstruct the state of a router whose claimed credential has aged
        // past its TTL: the claim file names an admin JWT that has expired.
        let dir = tempfile::tempdir().expect("tempdir");
        let tokens = manager();
        let stale = tokens
            .issue(&crate::token::IssueRequest {
                ttl_hours: -1,
                label: crate::admin::CLAIM_TOKEN_LABEL,
                scope: ADMIN_SCOPE,
                ..crate::token::IssueRequest::default()
            })
            .expect("issue");
        let id = tokens
            .list_tokens()
            .expect("list")
            .into_iter()
            .find(|record| record.label == crate::admin::CLAIM_TOKEN_LABEL)
            .expect("record")
            .id;
        std::fs::write(
            dir.path().join(crate::admin::CLAIM_FILE_NAME),
            serde_json::json!({"token_id": id, "ttl_hours": 1, "claimed_at": 1}).to_string(),
        )
        .expect("write claim");

        let admin = AdminClaim::load(None, dir.path(), Duration::from_secs(60))
            .with_token_manager(tokens);
        assert!(admin.is_claimed(), "the claim itself is still on record");
        assert!(
            !admin.verify(&stale),
            "but the expired credential authorises nothing"
        );
    }

    #[test]
    fn a_revoked_admin_jwt_stops_authorising() {
        let tokens = manager();
        let (admin, token) = claimed(&tokens);
        let id = admin.status().token_id.expect("token id");
        tokens.revoke_token(&id).expect("revoke");
        assert!(!admin.verify(&token), "revocation is enforced by verify");
    }

    #[test]
    fn rotation_mints_a_new_jwt_and_revokes_the_old_one_by_id() {
        let tokens = manager();
        let (admin, first) = claimed(&tokens);
        let first_id = admin.status().token_id.expect("token id");

        let second = admin.rotate().expect("rotate");
        let second_id = admin.status().token_id.expect("token id");

        assert_ne!(first_id, second_id);
        assert!(admin.verify(&second));
        assert!(!admin.verify(&first));
        assert!(tokens.validate_token(&first).is_err(), "old JWT is revoked");
        assert!(
            tokens
                .list_tokens()
                .expect("list")
                .into_iter()
                .any(|record| record.id == first_id && record.revoked)
        );
    }

    #[test]
    fn a_claimed_jwt_survives_restart() {
        let dir = tempfile::tempdir().expect("tempdir");
        let tokens = manager();
        let ttl = Duration::from_secs(60);
        let admin = AdminClaim::load(None, dir.path(), ttl).with_token_manager(tokens.clone());
        let candidate = admin.begin().expect("mint");
        admin
            .confirm(&candidate.claim_id, &candidate.token)
            .expect("confirm");

        let reloaded = AdminClaim::load(None, dir.path(), ttl).with_token_manager(tokens);
        assert!(reloaded.is_claimed());
        assert!(reloaded.verify(&candidate.token));
        assert_eq!(reloaded.status().credential_kind, CredentialKind::Jwt);
        assert_eq!(reloaded.begin().unwrap_err(), ClaimError::AlreadyClaimed);
    }

    #[test]
    fn the_claim_file_never_holds_the_token() {
        let dir = tempfile::tempdir().expect("tempdir");
        let tokens = manager();
        let admin = AdminClaim::load(None, dir.path(), Duration::from_secs(60))
            .with_token_manager(tokens);
        let candidate = admin.begin().expect("mint");
        admin
            .confirm(&candidate.claim_id, &candidate.token)
            .expect("confirm");
        let body = std::fs::read_to_string(dir.path().join(crate::admin::CLAIM_FILE_NAME))
            .expect("claim file");
        assert!(!body.contains(&candidate.token));
        assert!(body.contains(&admin.status().token_id.expect("token id")));
    }

    #[test]
    fn a_legacy_opaque_claim_keeps_working_and_rotates_into_a_jwt() {
        let dir = tempfile::tempdir().expect("tempdir");
        let ttl = Duration::from_secs(60);

        // A claim written by a pre-JWT release: no token manager attached.
        let legacy = AdminClaim::load(None, dir.path(), ttl);
        let candidate = legacy.begin().expect("mint");
        legacy
            .confirm(&candidate.claim_id, &candidate.token)
            .expect("confirm");
        assert!(
            candidate
                .token
                .starts_with(crate::admin::ADMIN_TOKEN_PREFIX)
        );

        // After the upgrade the operator is not locked out …
        let tokens = manager();
        let upgraded = AdminClaim::load(None, dir.path(), ttl).with_token_manager(tokens);
        assert!(upgraded.verify(&candidate.token));
        assert_eq!(
            upgraded.status().credential_kind,
            CredentialKind::LegacyOpaque
        );
        assert!(
            upgraded.uses_legacy_opaque_credential(),
            "doctor warns on this"
        );

        // … and rotating migrates the credential to the JWT model.
        let rotated = upgraded.rotate().expect("rotate");
        assert!(rotated.starts_with(TOKEN_PREFIX));
        assert!(upgraded.verify(&rotated));
        assert!(!upgraded.verify(&candidate.token));
        assert_eq!(upgraded.status().credential_kind, CredentialKind::Jwt);
        assert!(!upgraded.uses_legacy_opaque_credential());
    }
}
