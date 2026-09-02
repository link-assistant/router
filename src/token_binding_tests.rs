use super::*;

#[test]
fn managed_client_bindings_are_signed_stored_and_validated() {
    let manager = TokenManager::new("binding-secret");
    let (token, id) = manager
        .issue_with_id(&IssueRequest {
            ttl_hours: 1,
            label: "managed-codex",
            account: Some("primary"),
            client_kind: Some("codex"),
            principal_id: Some("primary"),
            ..IssueRequest::default()
        })
        .expect("issue bound token");

    let claims = manager
        .validate_token(&token)
        .expect("validate bound token");
    assert_eq!(claims.client_kind.as_deref(), Some("codex"));
    assert_eq!(claims.principal_id.as_deref(), Some("primary"));
    let record = manager
        .store()
        .get(&id)
        .expect("read store")
        .expect("record");
    assert_eq!(record.client_kind.as_deref(), Some("codex"));
    assert_eq!(record.principal_id.as_deref(), Some("primary"));
}

#[test]
fn generic_and_admin_tokens_have_no_implicit_client_binding() {
    let manager = TokenManager::new("unbound-secret");
    for token in [
        manager.issue_token(1, "generic").expect("generic token"),
        manager
            .issue_admin_token(1, "administrator")
            .expect("admin token"),
    ] {
        let claims = manager.validate_token(&token).expect("valid token");
        assert_eq!(claims.client_kind, None);
        assert_eq!(claims.principal_id, None);
    }
}

#[test]
fn rotation_preserves_client_and_principal_without_a_widening_override() {
    let manager = TokenManager::new("rotation-binding-secret");
    let (_, id) = manager
        .issue_with_id(&IssueRequest {
            ttl_hours: 1,
            label: "managed-claude",
            account: Some("primary"),
            client_kind: Some("claude"),
            principal_id: Some("primary"),
            ..IssueRequest::default()
        })
        .expect("issue bound token");

    let rotated = manager
        .rotate_token_with(
            &id,
            &RotateOverrides {
                ttl_hours: Some(2),
                ..RotateOverrides::default()
            },
        )
        .expect("rotate token");
    let claims = manager
        .validate_token(&rotated)
        .expect("validate replacement");
    assert_eq!(claims.client_kind.as_deref(), Some("claude"));
    assert_eq!(claims.principal_id.as_deref(), Some("primary"));
}

#[test]
fn a_store_binding_that_disagrees_with_the_signed_claim_fails_closed() {
    let manager = TokenManager::new("binding-mismatch-secret");
    let (token, id) = manager
        .issue_with_id(&IssueRequest {
            ttl_hours: 1,
            label: "managed-codex",
            account: Some("primary"),
            client_kind: Some("codex"),
            principal_id: Some("primary"),
            ..IssueRequest::default()
        })
        .expect("issue bound token");
    let store = manager.store();
    let mut record = store.get(&id).unwrap().unwrap();
    record.client_kind = Some("claude".to_string());
    store.put(record).expect("replace record");

    assert!(matches!(
        manager.validate_token(&token),
        Err(TokenError::Invalid(message)) if message.contains("binding")
    ));
}

#[test]
fn incomplete_or_unknown_client_bindings_are_rejected_at_issue_time() {
    let manager = TokenManager::new("invalid-binding-secret");
    for request in [
        IssueRequest {
            ttl_hours: 1,
            client_kind: Some("codex"),
            ..IssueRequest::default()
        },
        IssueRequest {
            ttl_hours: 1,
            principal_id: Some("primary"),
            ..IssueRequest::default()
        },
        IssueRequest {
            ttl_hours: 1,
            client_kind: Some("invented-client"),
            principal_id: Some("primary"),
            ..IssueRequest::default()
        },
    ] {
        assert!(request.validate().is_err());
    }
    assert_eq!(manager.list_tokens().expect("store remains empty").len(), 0);
}
