use super::*;

/// Hand-written Claude credentials may use the legacy flat `snake_case` shape.
#[test]
fn write_token_preserves_the_flat_snake_case_claude_layout() {
    let dir = tempfile::tempdir().expect("credential home");
    let path = dir.path().join(".credentials.json");
    std::fs::write(
        &path,
        r#"{"access_token":"old","refresh_token":"old-r","expires_at":1,"marker":true}"#,
    )
    .expect("credential file");
    let reader = SubscriptionReader::new(SubscriptionProvider::Claude, dir.path());
    reader
        .write_token(&SubscriptionToken {
            access_token: "fresh".into(),
            refresh_token: Some("fresh-r".into()),
            expires_at_ms: Some(9_000),
            account_id: None,
            resource_url: None,
        })
        .expect("flat Claude refresh");
    let written: serde_json::Value =
        serde_json::from_str(&std::fs::read_to_string(path).unwrap()).unwrap();
    assert_eq!(written["access_token"], "fresh");
    assert_eq!(written["refresh_token"], "fresh-r");
    assert_eq!(written["expires_at"], 9_000);
    assert_eq!(written["marker"], true);
    assert!(written.get("accessToken").is_none());
}

#[test]
fn a_named_home_candidate_is_never_shadowed_by_the_platform_store() {
    let dir = tempfile::tempdir().expect("named account home");
    let reader = SubscriptionReader::new(SubscriptionProvider::Claude, dir.path());
    let candidate = SubscriptionToken {
        access_token: "candidate".into(),
        refresh_token: Some("candidate-refresh".into()),
        expires_at_ms: Some(1),
        account_id: None,
        resource_url: None,
    };
    assert!(!reader.candidate_is_shadowed_by_platform_store(&candidate));
}

#[test]
fn write_token_reports_an_unreadable_credential_path() {
    let dir = tempfile::tempdir().expect("credential home");
    let path = dir.path().join("oauth_creds.json");
    std::fs::create_dir(&path).expect("blocking directory");
    let reader = SubscriptionReader::new(SubscriptionProvider::Gemini, dir.path());
    let fresh = SubscriptionToken {
        access_token: "fresh".into(),
        refresh_token: Some("fresh-refresh".into()),
        expires_at_ms: Some(1_000),
        account_id: None,
        resource_url: None,
    };
    assert!(matches!(
        reader.write_token(&fresh),
        Err(SubscriptionError::ReadError(_))
    ));
    assert!(path.is_dir());
}

#[test]
fn clearing_credentials_reports_an_unremovable_credential_path() {
    let dir = tempfile::tempdir().expect("credential home");
    let path = dir.path().join("oauth_creds.json");
    std::fs::create_dir(&path).expect("blocking directory");
    let reader = SubscriptionReader::new(SubscriptionProvider::Qwen, dir.path());
    let error = reader
        .clear_credentials()
        .expect_err("an occupied credential path must be reported");
    assert!(error.contains(&path.display().to_string()), "{error}");
    assert!(path.is_dir());
}
