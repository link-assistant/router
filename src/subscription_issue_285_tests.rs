use super::*;

#[test]
fn explicit_import_home_does_not_adopt_a_newer_keychain_credential() {
    let dir = tempfile::tempdir().unwrap();
    let reader = claude_home_expiring_at(dir.path(), 1_000);
    let store = serde_json::json!({
        "claudeAiOauth": {
            "accessToken": "keychain-access",
            "refreshToken": "keychain-refresh",
            "expiresAt": 9_999_999_i64,
        }
    })
    .to_string();

    // The lower-level selector would prefer the newer platform-store
    // credential if import supplied it.
    let keychain = reader
        .parse_store_credential(&store)
        .expect("the simulated store credential should parse");
    let (selected, origin) = reader
        .select_store(Some(keychain))
        .expect("a credential is available");
    assert_eq!(origin, crate::platform_keychain::Origin::Keychain);
    assert_eq!(selected.access_token, "keychain-access");

    // The real import path must not supply the machine-wide store for an
    // explicitly named non-default home.
    let source = reader
        .read_document_for_import()
        .expect("the explicitly named credential should be importable");
    assert_eq!(source.origin, crate::platform_keychain::Origin::File);
    assert_eq!(source.token.access_token, "file-access");
    assert!(source.document.contains("file-access"));
    assert!(!source.document.contains("keychain-access"));
    assert!(!reader.is_vendor_default_home());
    assert!(reader.read_token_from_keychain().is_none());
}

fn claude_home_expiring_at(dir: &std::path::Path, expires_at_ms: i64) -> SubscriptionReader {
    std::fs::write(
        dir.join(".credentials.json"),
        serde_json::json!({
            "claudeAiOauth": {
                "accessToken": "file-access",
                "refreshToken": "file-refresh",
                "expiresAt": expires_at_ms,
            }
        })
        .to_string(),
    )
    .unwrap();
    SubscriptionReader::new(SubscriptionProvider::Claude, dir)
}
