use link_assistant_router::subscription::{SubscriptionProvider, SubscriptionReader};

#[test]
fn explicit_import_home_is_authoritative() {
    let dir = tempfile::tempdir().unwrap();
    let credentials = dir.path().join(".credentials.json");
    let document = r#"{"claudeAiOauth":{"accessToken":"staged-access","refreshToken":"staged-refresh","expiresAt":1000}}"#;
    std::fs::write(&credentials, document).unwrap();

    let reader = SubscriptionReader::new(SubscriptionProvider::Claude, dir.path());
    let source = reader.read_document_for_import().expect("staged credential");

    assert_eq!(source.origin, link_assistant_router::platform_keychain::Origin::File);
    assert_eq!(source.token.access_token, "staged-access");
    assert_eq!(source.document, document);
}
