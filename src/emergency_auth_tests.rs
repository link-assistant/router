use super::*;
use std::net::SocketAddr;

fn addr(value: &str) -> SocketAddr {
    value.parse().unwrap()
}

#[test]
fn the_mode_is_off_by_default_and_bounded_when_on() {
    let config = EmergencyAuthConfig::default();
    assert!(!config.enabled);
    let state = EmergencyAuth::default();
    assert!(!state.is_active());
    let until = state.enable_for_minutes(MAX_DURATION_MINUTES * 10);
    assert!(until <= now() + i64::try_from(MAX_DURATION_MINUTES * 60).unwrap());
    assert!(state.is_active());
    assert!(state.disable());
    assert!(!state.is_active());
    assert!(
        !state.disable(),
        "a second disable reports it was already off"
    );
}

#[test]
fn non_loopback_exposure_needs_an_explicit_acknowledgement() {
    let mut config = EmergencyAuthConfig {
        enabled: true,
        ..EmergencyAuthConfig::default()
    };
    assert!(
        config
            .check(&[addr("127.0.0.1:8080"), addr("[::1]:8080")])
            .is_ok()
    );
    let refused = config.check(&[addr("0.0.0.0:8080")]).unwrap_err();
    assert!(refused.contains("0.0.0.0:8080"), "{refused}");
    assert!(
        refused.contains("--emergency-allow-non-loopback"),
        "{refused}"
    );
    config.allow_non_loopback = true;
    assert!(config.check(&[addr("0.0.0.0:8080")]).is_ok());
    config.duration_minutes = 0;
    assert!(config.check(&[addr("127.0.0.1:1")]).is_err());
    config.duration_minutes = MAX_DURATION_MINUTES + 1;
    assert!(config.check(&[addr("127.0.0.1:1")]).is_err());
    // A disabled mode never refuses anything.
    assert!(
        EmergencyAuthConfig::default()
            .check(&[addr("0.0.0.0:1")])
            .is_ok()
    );
}

#[test]
fn synthetic_claims_never_name_a_real_record_or_carry_admin_scope() {
    let manager = crate::token::TokenManager::new("emergency-secret");
    let (token, id) = manager
        .issue_with_id(&crate::token::IssueRequest {
            ttl_hours: 1,
            label: "real",
            scope: crate::token::ADMIN_SCOPE,
            ..crate::token::IssueRequest::default()
        })
        .unwrap();
    let claims = synthetic_claims(&token, &HeaderMap::new());
    assert_ne!(claims.sub, id);
    assert!(is_synthetic(&claims));
    assert!(!claims.is_admin());
    assert!(!claims.sub.contains(&token));
}

#[test]
fn the_client_binding_is_inferred_from_the_request_then_the_payload() {
    let mut headers = HeaderMap::new();
    headers.insert("user-agent", "claude-cli/2.0".parse().unwrap());
    let claims = synthetic_claims("anything", &headers);
    assert_eq!(claims.client_kind.as_deref(), Some("claude"));
    assert!(claims.principal_id.is_some());

    let codex = synthetic_claims("at-garbage", &HeaderMap::new());
    assert_eq!(codex.client_kind.as_deref(), Some("codex"));

    let manager = crate::token::TokenManager::new("emergency-secret");
    let (token, _) = manager
        .issue_with_id(&crate::token::IssueRequest {
            ttl_hours: 1,
            label: "bound",
            client_kind: Some("qwen"),
            principal_id: Some("alice"),
            ..crate::token::IssueRequest::default()
        })
        .unwrap();
    let from_payload = synthetic_claims(&token, &HeaderMap::new());
    assert_eq!(from_payload.client_kind.as_deref(), Some("qwen"));
    assert_eq!(from_payload.principal_id.as_deref(), Some("alice"));

    let unbound = synthetic_claims("la_sk_not-a-jwt", &HeaderMap::new());
    assert_eq!(unbound.client_kind, None);
    assert_eq!(unbound.principal_id, None);
}

#[test]
fn bypasses_are_counted_by_reason_without_token_values() {
    let state = EmergencyAuth::default();
    state.record_bypass("revoked");
    state.record_bypass("revoked");
    state.record_bypass("signature_invalid");
    let text = state.render_prometheus();
    assert!(text.contains("link_assistant_emergency_auth_bypassed_total{reason=\"revoked\"} 2"));
    assert!(text.contains("link_assistant_emergency_auth_active 0"));
    assert_eq!(state.status().bypassed_requests, 3);
}
