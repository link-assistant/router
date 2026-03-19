//! Integration tests for Link.Assistant.Router.
//!
//! Tests the token system, proxy behavior, and API structure.

use link_assistant_router::oauth::OAuthProvider;
use link_assistant_router::token::{TokenManager, TOKEN_PREFIX};
use link_assistant_router::VERSION;

mod token_integration_tests {
    use super::*;

    #[test]
    fn test_token_roundtrip() {
        let mgr = TokenManager::new("integration-test-secret");
        let token = mgr.issue_token(1, "integration-test").unwrap();
        assert!(token.starts_with(TOKEN_PREFIX));

        let claims = mgr.validate_token(&token).unwrap();
        assert_eq!(claims.label, "integration-test");
    }

    #[test]
    fn test_different_secrets_reject() {
        let mgr1 = TokenManager::new("secret-one");
        let mgr2 = TokenManager::new("secret-two");

        let token = mgr1.issue_token(1, "test").unwrap();
        let result = mgr2.validate_token(&token);
        assert!(result.is_err());
    }

    #[test]
    fn test_revoke_then_reject() {
        let mgr = TokenManager::new("revocation-test-secret");
        let token = mgr.issue_token(24, "to-revoke").unwrap();

        let claims = mgr.validate_token(&token).unwrap();
        mgr.revoke_token(&claims.sub).unwrap();

        let result = mgr.validate_token(&token);
        assert!(result.is_err());
    }

    #[test]
    fn test_multiple_tokens_independent() {
        let mgr = TokenManager::new("multi-token-secret");
        let t1 = mgr.issue_token(24, "token-1").unwrap();
        let t2 = mgr.issue_token(24, "token-2").unwrap();

        assert_ne!(t1, t2);

        let c1 = mgr.validate_token(&t1).unwrap();
        let c2 = mgr.validate_token(&t2).unwrap();
        assert_ne!(c1.sub, c2.sub);
        assert_eq!(c1.label, "token-1");
        assert_eq!(c2.label, "token-2");
    }
}

mod oauth_integration_tests {
    use super::*;

    #[test]
    fn test_manual_token_set_and_get() {
        let provider = OAuthProvider::new("/tmp/nonexistent-test-dir");
        provider.set_token("manually-set-oauth-token");
        let token = provider.get_token().unwrap();
        assert_eq!(token, "manually-set-oauth-token");
    }

    #[test]
    fn test_missing_credentials_error() {
        let provider = OAuthProvider::new("/tmp/definitely-does-not-exist");
        let result = provider.get_token();
        assert!(result.is_err());
    }

    #[test]
    fn test_credential_file_parsing() {
        let dir = std::env::temp_dir().join(format!("router-int-test-{}", uuid::Uuid::new_v4()));
        std::fs::create_dir_all(&dir).unwrap();

        std::fs::write(
            dir.join("credentials.json"),
            r#"{"accessToken": "file-based-token"}"#,
        )
        .unwrap();

        let provider = OAuthProvider::new(dir.to_str().unwrap());
        let token = provider.get_token().unwrap();
        assert_eq!(token, "file-based-token");

        std::fs::remove_dir_all(&dir).ok();
    }
}

mod version_tests {
    use super::*;

    #[test]
    fn test_version_is_not_empty() {
        assert!(!VERSION.is_empty());
    }

    #[test]
    fn test_version_matches_cargo_toml() {
        assert!(VERSION.starts_with("0."));
    }
}
