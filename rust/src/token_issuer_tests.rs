//! Unit tests for token issuing key validation.

use super::{TokenError, TokenManager, test_manager};

#[test]
fn empty_secret_cannot_issue_or_validate_tokens() {
    let manager = TokenManager::new("");
    let error = manager.issue_token(24, "test").unwrap_err();
    assert!(matches!(
        error.kind(),
        jsonwebtoken::errors::ErrorKind::InvalidKeyFormat
    ));

    let token = test_manager().issue_token(24, "test").unwrap();
    assert!(matches!(
        manager.validate_token(&token),
        Err(TokenError::IssuerSecretUnset)
    ));
}
