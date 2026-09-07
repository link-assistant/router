use super::*;
use crate::credential_store::CredentialStore as _;

#[test]
fn adopted_file_is_one_refresh_chain_for_vendor_and_router() {
    let source_home = tempfile::tempdir().expect("vendor home");
    let router_home = tempfile::tempdir().expect("Router home");
    let source = source_home.path().join("auth.json");
    std::fs::write(
        &source,
        r#"{"auth_mode":"chatgpt","tokens":{"id_token":"kept","access_token":"old-access","refresh_token":"old-refresh"}}"#,
    )
    .expect("vendor credential");
    let pointer = reference_external_credential(&source, "transaction-1").expect("reference");
    let reader = SubscriptionReader::new(SubscriptionProvider::Codex, router_home.path());
    let router_path = reader
        .install_document(&pointer)
        .expect("install reference");

    let (loaded, origin) = reader.read_token_from().expect("read adopted credential");
    assert_eq!(origin, crate::platform_keychain::Origin::AdoptedFile);
    assert_eq!(loaded.refresh_token.as_deref(), Some("old-refresh"));
    reader
        .prepare_refresh(&loaded)
        .expect("shared file is writable");

    let successor = SubscriptionToken {
        access_token: "new-access".into(),
        refresh_token: Some("new-refresh".into()),
        expires_at_ms: Some(9_999_999_999_999),
        account_id: None,
        resource_url: None,
    };
    reader.persist(&successor).expect("advance shared chain");

    let vendor_document = std::fs::read_to_string(&source).expect("vendor document");
    assert!(vendor_document.contains("new-access"));
    assert!(vendor_document.contains("new-refresh"));
    assert!(vendor_document.contains("\"id_token\": \"kept\""));
    let router_document = std::fs::read_to_string(router_path).expect("Router reference");
    assert!(has_promotion_receipt(&router_document, "transaction-1"));
    assert!(!router_document.contains("old-access"));
    assert!(!router_document.contains("new-access"));

    let restarted = SubscriptionReader::new(SubscriptionProvider::Codex, router_home.path());
    let restarted = restarted.read_token().expect("restart reads shared chain");
    assert_eq!(restarted.access_token, successor.access_token);
    assert_eq!(restarted.refresh_token, successor.refresh_token);
}

#[test]
fn adopted_refresh_updates_the_vendor_file_for_every_provider() {
    for provider in SubscriptionProvider::ALL {
        let source_home = tempfile::tempdir().expect("vendor home");
        let router_home = tempfile::tempdir().expect("Router home");
        let source = source_home
            .path()
            .join(provider.canonical_credential_filename());
        let document = match provider {
            SubscriptionProvider::Claude => serde_json::json!({
                "claudeAiOauth": {
                    "accessToken": "old-access",
                    "refreshToken": "old-refresh",
                    "expiresAt": 9_999_999_999_999_i64
                },
                "vendor_marker": "preserved"
            }),
            SubscriptionProvider::Codex => serde_json::json!({
                "auth_mode": "chatgpt",
                "tokens": {
                    "id_token": "kept",
                    "access_token": "old-access",
                    "refresh_token": "old-refresh"
                },
                "vendor_marker": "preserved"
            }),
            SubscriptionProvider::Gemini => serde_json::json!({
                "access_token": "old-access",
                "refresh_token": "old-refresh",
                "expiry_date": 9_999_999_999_999_i64,
                "vendor_marker": "preserved"
            }),
            SubscriptionProvider::Qwen => serde_json::json!({
                "access_token": "old-access",
                "refresh_token": "old-refresh",
                "expiry_date": 9_999_999_999_999_i64,
                "resource_url": "portal.qwen.ai",
                "vendor_marker": "preserved"
            }),
        };
        std::fs::write(&source, document.to_string()).expect("vendor credential");
        let pointer = reference_external_credential(&source, "transaction").expect("reference");
        let reader = SubscriptionReader::new(provider, router_home.path());
        let router_path = reader
            .install_document(&pointer)
            .expect("install reference");
        let (loaded, origin) = reader.read_token_from().expect("read adopted credential");
        assert_eq!(origin, crate::platform_keychain::Origin::AdoptedFile);
        reader
            .prepare_refresh(&loaded)
            .expect("shared source is writable");

        let successor = SubscriptionToken {
            access_token: "new-access".into(),
            refresh_token: Some("new-refresh".into()),
            expires_at_ms: Some(9_999_999_999_998),
            account_id: loaded.account_id,
            resource_url: loaded.resource_url,
        };
        reader.persist(&successor).expect("advance shared chain");

        let vendor_document = std::fs::read_to_string(&source).expect("vendor document");
        assert!(vendor_document.contains("new-access"), "{provider}");
        assert!(vendor_document.contains("new-refresh"), "{provider}");
        assert!(vendor_document.contains("vendor_marker"), "{provider}");
        let router_document = std::fs::read_to_string(router_path).expect("Router reference");
        assert!(!router_document.contains("new-access"), "{provider}");
        assert!(!router_document.contains("new-refresh"), "{provider}");

        let restarted = SubscriptionReader::new(provider, router_home.path());
        let restarted = restarted.read_token().expect("restart reads shared chain");
        assert_eq!(restarted.access_token, successor.access_token, "{provider}");
        assert_eq!(
            restarted.refresh_token, successor.refresh_token,
            "{provider}"
        );
    }
}

#[test]
fn adopted_reference_rejects_relative_and_nested_sources() {
    let home = tempfile::tempdir().expect("Router home");
    let path = home.path().join("auth.json");
    let relative = serde_json::json!({
        "_link_assistant_router": {
            "credential_source": "../vendor/auth.json",
            "promotion_receipt": "transaction-1"
        }
    });
    std::fs::write(&path, relative.to_string()).expect("relative reference");
    let reader = SubscriptionReader::new(SubscriptionProvider::Codex, home.path());
    assert!(reader.read_token().is_err());

    let source = home.path().join("source.json");
    std::fs::write(&source, relative.to_string()).expect("nested reference");
    let pointer = reference_external_credential(&source, "transaction-2").expect("reference");
    std::fs::write(&path, pointer).expect("nested pointer");
    assert!(reader.read_token().is_err());
}
