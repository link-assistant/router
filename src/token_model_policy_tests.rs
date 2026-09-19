use super::*;

#[test]
fn exact_model_authority_is_durable_and_survives_rotation() {
    let mgr = test_manager();
    let policy = crate::model_contract::ModelAccessPolicy {
        allowed_models: vec!["provider/model-a".into(), "provider/model-b".into()],
        allow_substitution: true,
        substitution_source: Some("unit test opt-in".into()),
    };
    let token = mgr
        .issue_ephemeral_with_model_policy(
            &IssueRequest {
                ttl_hours: 1,
                label: "pinned-run",
                account: Some("primary"),
                client_kind: Some("codex"),
                principal_id: Some("primary"),
                ..IssueRequest::default()
            },
            &policy,
        )
        .unwrap();
    let claims = mgr.validate_token(&token).unwrap();
    assert_eq!(mgr.model_policy_for(&claims.sub).unwrap(), policy);
    assert!(mgr.authorize_model(&claims.sub, "provider/model-a").is_ok());
    let denied = mgr
        .authorize_model(&claims.sub, "provider/model-c")
        .unwrap_err();
    assert_eq!(denied.code, "model_not_allowed");
    assert_eq!(denied.allowed_models, policy.allowed_models);

    let rotated = mgr
        .rotate_token_with(&claims.sub, &RotateOverrides::default())
        .unwrap();
    let rotated_claims = mgr.validate_token(&rotated).unwrap();
    assert_eq!(mgr.model_policy_for(&rotated_claims.sub).unwrap(), policy);
}

#[test]
fn missing_model_authority_fails_closed() {
    let mgr = test_manager();

    assert!(matches!(
        mgr.model_policy_for("missing-token-id"),
        Err(TokenError::NotFound(id)) if id == "missing-token-id"
    ));
    let denied = mgr
        .authorize_model("missing-token-id", "provider/model-a")
        .unwrap_err();
    assert_eq!(denied.code, "model_policy_unavailable");
    assert_eq!(denied.requested_model, "provider/model-a");
    assert!(denied.allowed_models.is_empty());
}
