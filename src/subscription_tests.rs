//! Unit tests for [`crate::subscription`].
//!
//! Split from `subscription.rs` to keep that file within the repository's
//! 1000-line limit.

use super::*;
use std::fs;

/// `auth status` prints a padded provider column. A `Display` built on
/// `write_str` silently discards the requested width, so the format string
/// looks correct and only the rendered output disagrees — invisible to the
/// compiler, which is why this needs a test (issue #212).
#[test]
fn provider_display_honours_the_requested_width() {
    assert_eq!(
        format!("[{:<8}]", SubscriptionProvider::Codex),
        "[codex   ]"
    );
    assert_eq!(
        format!("[{:>8}]", SubscriptionProvider::Claude),
        "[  claude]"
    );
    assert_eq!(format!("[{:<3}]", SubscriptionProvider::Gemini), "[gemini]");
    assert_eq!(SubscriptionProvider::Qwen.to_string(), "qwen");
}

fn tempdir() -> PathBuf {
    let dir = std::env::temp_dir().join(format!("router-sub-{}", uuid::Uuid::new_v4()));
    fs::create_dir_all(&dir).unwrap();
    dir
}

#[test]
fn provider_roundtrip_strings() {
    for p in SubscriptionProvider::ALL {
        assert_eq!(SubscriptionProvider::from_str_opt(p.as_str()), Some(p));
    }
    assert_eq!(
        SubscriptionProvider::from_str_opt("ChatGPT"),
        Some(SubscriptionProvider::Codex)
    );
    assert_eq!(
        SubscriptionProvider::from_str_opt("dashscope"),
        Some(SubscriptionProvider::Qwen)
    );
    assert!(SubscriptionProvider::from_str_opt("unknown").is_none());
}

#[test]
fn reads_codex_auth_json() {
    let dir = tempdir();
    fs::write(
        dir.join("auth.json"),
        r#"{"tokens":{"id_token":"x","access_token":"codex-access","refresh_token":"codex-refresh","account_id":"acct_123"},"last_refresh":"2026-06-01T00:00:00Z"}"#,
    )
    .unwrap();
    let reader = SubscriptionReader::new(SubscriptionProvider::Codex, &dir);
    let token = reader.read_token().expect("codex token");
    assert_eq!(token.access_token, "codex-access");
    assert_eq!(token.refresh_token.as_deref(), Some("codex-refresh"));
    assert_eq!(token.account_id.as_deref(), Some("acct_123"));
    assert_eq!(
        token.base_url(SubscriptionProvider::Codex),
        "https://chatgpt.com/backend-api/codex"
    );
}

#[test]
fn reads_codex_account_id_from_id_token() {
    use base64::Engine as _;
    let payload = serde_json::json!({
        "https://api.openai.com/auth": { "chatgpt_account_id": "acct_from_jwt" }
    });
    let payload_b64 = base64::engine::general_purpose::URL_SAFE_NO_PAD
        .encode(serde_json::to_vec(&payload).unwrap());
    let id_token = format!("aGVhZGVy.{payload_b64}.sig");
    let dir = tempdir();
    fs::write(
        dir.join("auth.json"),
        format!(r#"{{"tokens":{{"id_token":"{id_token}","access_token":"a"}}}}"#),
    )
    .unwrap();
    let reader = SubscriptionReader::new(SubscriptionProvider::Codex, &dir);
    let token = reader.read_token().expect("codex token");
    assert_eq!(token.account_id.as_deref(), Some("acct_from_jwt"));
}

#[test]
fn reads_codex_expiry_from_access_token() {
    use base64::Engine as _;
    let dir = tempdir();
    let payload = base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(br#"{"exp":1770000000}"#);
    let access = format!("header.{payload}.signature");
    fs::write(
        dir.join("auth.json"),
        format!(r#"{{"tokens":{{"access_token":"{access}"}}}}"#),
    )
    .unwrap();
    let token = SubscriptionReader::new(SubscriptionProvider::Codex, &dir)
        .read_token()
        .unwrap();
    assert_eq!(token.expires_at_ms, Some(1_770_000_000_000));
}

#[test]
fn reads_gemini_oauth_creds() {
    let dir = tempdir();
    fs::write(
        dir.join("oauth_creds.json"),
        r#"{"access_token":"gem-access","refresh_token":"gem-refresh","expiry_date":9999999999999,"token_type":"Bearer","scope":"https://www.googleapis.com/auth/cloud-platform"}"#,
    )
    .unwrap();
    let reader = SubscriptionReader::new(SubscriptionProvider::Gemini, &dir);
    let token = reader.read_token().expect("gemini token");
    assert_eq!(token.access_token, "gem-access");
    assert_eq!(token.refresh_token.as_deref(), Some("gem-refresh"));
    assert_eq!(token.expires_at_ms, Some(9_999_999_999_999));
    assert_eq!(
        token.base_url(SubscriptionProvider::Gemini),
        "https://cloudcode-pa.googleapis.com"
    );
}

#[test]
fn reads_qwen_oauth_creds_with_resource_url() {
    let dir = tempdir();
    fs::write(
        dir.join("oauth_creds.json"),
        r#"{"access_token":"qwen-access","refresh_token":"qwen-refresh","token_type":"Bearer","resource_url":"portal.qwen.ai","expiry_date":9999999999999}"#,
    )
    .unwrap();
    let reader = SubscriptionReader::new(SubscriptionProvider::Qwen, &dir);
    let token = reader.read_token().expect("qwen token");
    assert_eq!(token.access_token, "qwen-access");
    assert_eq!(token.resource_url.as_deref(), Some("portal.qwen.ai"));
    assert_eq!(
        token.base_url(SubscriptionProvider::Qwen),
        "https://portal.qwen.ai/compatible-mode/v1"
    );
}

#[test]
fn qwen_without_resource_url_uses_default_base() {
    let dir = tempdir();
    fs::write(
        dir.join("oauth_creds.json"),
        r#"{"access_token":"qwen-access"}"#,
    )
    .unwrap();
    let reader = SubscriptionReader::new(SubscriptionProvider::Qwen, &dir);
    let token = reader.read_token().expect("qwen token");
    assert_eq!(
        token.base_url(SubscriptionProvider::Qwen),
        "https://dashscope.aliyuncs.com/compatible-mode/v1"
    );
}

#[test]
fn reads_claude_nested_credentials() {
    let dir = tempdir();
    fs::write(
        dir.join(".credentials.json"),
        r#"{"claudeAiOauth":{"accessToken":"sk-ant-oat-nested","refreshToken":"sk-ant-ort-x","expiresAt":9999999999999}}"#,
    )
    .unwrap();
    let reader = SubscriptionReader::new(SubscriptionProvider::Claude, &dir);
    let token = reader.read_token().expect("claude token");
    assert_eq!(token.access_token, "sk-ant-oat-nested");
    assert_eq!(token.refresh_token.as_deref(), Some("sk-ant-ort-x"));
    assert_eq!(token.expires_at_ms, Some(9_999_999_999_999));
}

#[test]
fn claude_pool_reader_preserves_legacy_credential_candidates() {
    let dir = tempdir();
    fs::write(dir.join("oauth.json"), r#"{"accessToken":"legacy"}"#).unwrap();
    let token = SubscriptionReader::new(SubscriptionProvider::Claude, &dir)
        .read_token()
        .unwrap();
    assert_eq!(token.access_token, "legacy");
}

#[test]
fn missing_credentials_errors() {
    let reader = SubscriptionReader::new(
        SubscriptionProvider::Gemini,
        "/tmp/router-nonexistent-sub-dir",
    );
    let err = reader.read_token().unwrap_err();
    assert!(matches!(err, SubscriptionError::NoCredentials(_)));
}

#[test]
fn expiry_detection() {
    let token = SubscriptionToken {
        access_token: "a".into(),
        refresh_token: None,
        expires_at_ms: Some(1000),
        account_id: None,
        resource_url: None,
    };
    assert!(token.is_expired(2000));
    assert!(!token.is_expired(500));
}

#[test]
fn discover_credential_path_finds_existing() {
    let dir = tempdir();
    fs::write(dir.join("oauth_creds.json"), r#"{"access_token":"x"}"#).unwrap();
    let reader = SubscriptionReader::new(SubscriptionProvider::Qwen, &dir);
    assert_eq!(
        reader.discover_credential_path(),
        Some(dir.join("oauth_creds.json"))
    );
}

#[test]
fn resolve_home_uses_subdir() {
    let home = SubscriptionProvider::Codex.resolve_home("/home/alice");
    assert!(home.ends_with(".codex"));
}

/// A rotated refresh token must reach disk, or the next process start
/// replays a token the vendor has already spent (issue #205).
#[test]
fn write_token_persists_a_rotated_refresh_token_for_codex() {
    let dir = tempdir();
    fs::write(
        dir.join("auth.json"),
        r#"{"auth_mode":"chatgpt","tokens":{"id_token":"id-1","access_token":"old-access","refresh_token":"old-refresh","account_id":"acct_1"},"last_refresh":"2026-08-11T11:31:03Z"}"#,
    )
    .unwrap();
    let reader = SubscriptionReader::new(SubscriptionProvider::Codex, &dir);
    reader
        .write_token(&SubscriptionToken {
            access_token: "new-access".into(),
            refresh_token: Some("new-refresh".into()),
            expires_at_ms: Some(9_000),
            account_id: Some("acct_1".into()),
            resource_url: None,
        })
        .expect("the rotated token should be written");
    let written: serde_json::Value =
        serde_json::from_str(&fs::read_to_string(dir.join("auth.json")).unwrap()).unwrap();
    assert_eq!(written["tokens"]["access_token"], "new-access");
    assert_eq!(written["tokens"]["refresh_token"], "new-refresh");
    assert_eq!(written["tokens"]["id_token"], "id-1");
    assert_eq!(written["auth_mode"], "chatgpt");
    assert_eq!(written["tokens"]["account_id"], "acct_1");
    assert_ne!(written["last_refresh"], "2026-08-11T11:31:03Z");
    let reread = reader.read_token().expect("re-read");
    assert_eq!(reread.access_token, "new-access");
    assert_eq!(reread.refresh_token.as_deref(), Some("new-refresh"));
}

#[test]
fn write_token_preserves_the_claude_nested_layout() {
    let dir = tempdir();
    fs::write(
        dir.join(".credentials.json"),
        r#"{"claudeAiOauth":{"accessToken":"old","refreshToken":"old-r","expiresAt":1,"scopes":["user:inference"],"subscriptionType":"max"}}"#,
    )
    .unwrap();
    let reader = SubscriptionReader::new(SubscriptionProvider::Claude, &dir);
    reader
        .write_token(&SubscriptionToken {
            access_token: "fresh".into(),
            refresh_token: Some("fresh-r".into()),
            expires_at_ms: Some(4_242),
            account_id: None,
            resource_url: None,
        })
        .expect("write");
    let written: serde_json::Value =
        serde_json::from_str(&fs::read_to_string(dir.join(".credentials.json")).unwrap()).unwrap();
    let block = &written["claudeAiOauth"];
    assert_eq!(block["accessToken"], "fresh");
    assert_eq!(block["refreshToken"], "fresh-r");
    assert_eq!(block["expiresAt"], 4_242);
    assert_eq!(block["subscriptionType"], "max");
    assert_eq!(block["scopes"][0], "user:inference");
}

#[test]
fn write_token_updates_the_flat_gemini_and_qwen_layout() {
    for (provider, extra) in [
        (SubscriptionProvider::Gemini, "\"scope\":\"cloud-platform\""),
        (
            SubscriptionProvider::Qwen,
            "\"resource_url\":\"portal.qwen.ai\"",
        ),
    ] {
        let dir = tempdir();
        fs::write(
            dir.join("oauth_creds.json"),
            format!(
                r#"{{"access_token":"old","refresh_token":"old-r","expiry_date":1,"token_type":"Bearer",{extra}}}"#
            ),
        )
        .unwrap();
        let reader = SubscriptionReader::new(provider, &dir);
        reader
            .write_token(&SubscriptionToken {
                access_token: "fresh".into(),
                refresh_token: Some("fresh-r".into()),
                expires_at_ms: Some(7_000),
                account_id: None,
                resource_url: None,
            })
            .expect("write");
        let written: serde_json::Value =
            serde_json::from_str(&fs::read_to_string(dir.join("oauth_creds.json")).unwrap())
                .unwrap();
        assert_eq!(written["access_token"], "fresh", "{provider}");
        assert_eq!(written["refresh_token"], "fresh-r", "{provider}");
        assert_eq!(written["expiry_date"], 7_000, "{provider}");
        assert_eq!(written["token_type"], "Bearer", "{provider}");
    }
}

/// Writing to a credential directory with no file is refused rather than
/// creating one the vendor CLI did not write.
#[test]
fn write_token_requires_an_existing_credential_file() {
    let dir = tempdir();
    let reader = SubscriptionReader::new(SubscriptionProvider::Codex, &dir);
    assert!(matches!(
        reader.write_token(&SubscriptionToken {
            access_token: "x".into(),
            refresh_token: None,
            expires_at_ms: None,
            account_id: None,
            resource_url: None,
        }),
        Err(SubscriptionError::NoCredentials(_))
    ));
}

fn claude_home_expiring_at(dir: &std::path::Path, expires_at_ms: i64) -> SubscriptionReader {
    fs::write(
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

fn keychain_token(access: &str, expires_at_ms: Option<i64>) -> SubscriptionToken {
    SubscriptionToken {
        access_token: access.to_string(),
        refresh_token: Some("keychain-refresh".into()),
        expires_at_ms,
        account_id: None,
        resource_url: None,
    }
}

#[test]
fn a_live_keychain_credential_beats_an_expired_file() {
    let dir = tempfile::tempdir().unwrap();
    let reader = claude_home_expiring_at(dir.path(), 1_000);
    let (token, origin) = reader
        .select_store(Some(keychain_token("keychain-access", Some(9_999_999))))
        .expect("a credential is available");
    assert_eq!(origin, crate::platform_keychain::Origin::Keychain);
    assert_eq!(token.access_token, "keychain-access");
}

#[test]
fn a_newer_file_is_not_displaced_by_a_stale_keychain_entry() {
    let dir = tempfile::tempdir().unwrap();
    let reader = claude_home_expiring_at(dir.path(), 9_999_999);
    let (token, origin) = reader
        .select_store(Some(keychain_token("keychain-access", Some(1_000))))
        .expect("a credential is available");
    assert_eq!(origin, crate::platform_keychain::Origin::File);
    assert_eq!(token.access_token, "file-access");
}

#[test]
fn an_equal_keychain_entry_leaves_the_file_in_place() {
    let dir = tempfile::tempdir().unwrap();
    let reader = claude_home_expiring_at(dir.path(), 5_000);
    let (_, origin) = reader
        .select_store(Some(keychain_token("keychain-access", Some(5_000))))
        .expect("a credential is available");
    assert_eq!(origin, crate::platform_keychain::Origin::File);
}

#[test]
fn without_a_store_the_file_is_used_unchanged() {
    let dir = tempfile::tempdir().unwrap();
    let reader = claude_home_expiring_at(dir.path(), 5_000);
    let (token, origin) = reader.select_store(None).expect("a credential is available");
    assert_eq!(origin, crate::platform_keychain::Origin::File);
    assert_eq!(token.access_token, "file-access");
}

#[test]
fn a_keychain_credential_is_used_when_no_file_exists() {
    let dir = tempfile::tempdir().unwrap();
    let reader = SubscriptionReader::new(SubscriptionProvider::Claude, dir.path());
    let (token, origin) = reader
        .select_store(Some(keychain_token("keychain-access", Some(9_999_999))))
        .expect("the store credential is available");
    assert_eq!(origin, crate::platform_keychain::Origin::Keychain);
    assert_eq!(token.access_token, "keychain-access");
}

#[test]
fn with_neither_store_the_file_error_is_reported() {
    let dir = tempfile::tempdir().unwrap();
    let reader = SubscriptionReader::new(SubscriptionProvider::Claude, dir.path());
    assert!(reader.select_store(None).is_err());
}

#[test]
fn a_store_credential_without_an_expiry_does_not_displace_the_file() {
    let dir = tempfile::tempdir().unwrap();
    let reader = claude_home_expiring_at(dir.path(), 5_000);
    let (_, origin) = reader
        .select_store(Some(keychain_token("keychain-access", None)))
        .expect("a credential is available");
    assert_eq!(origin, crate::platform_keychain::Origin::File);
}

#[test]
fn a_pooled_home_never_consults_the_machine_store() {
    let dir = tempfile::tempdir().unwrap();
    let reader = SubscriptionReader::new(SubscriptionProvider::Claude, dir.path());
    assert!(!reader.is_vendor_default_home());
    assert!(reader.read_token_from_keychain().is_none());
}

#[test]
fn a_store_entry_parses_like_the_file() {
    let reader = SubscriptionReader::new(SubscriptionProvider::Claude, "/nonexistent");
    let token = reader
        .parse_store_credential(
            r#"{"claudeAiOauth":{"accessToken":"kc-access","refreshToken":"kc-refresh","expiresAt":123}}"#,
        )
        .expect("the vendor entry must parse");
    assert_eq!(token.access_token, "kc-access");
    assert_eq!(token.refresh_token.as_deref(), Some("kc-refresh"));
    assert_eq!(token.expires_at_ms, Some(123));
}

#[test]
fn an_unreadable_store_entry_yields_no_credential() {
    let reader = SubscriptionReader::new(SubscriptionProvider::Claude, "/nonexistent");
    assert!(reader.parse_store_credential("not json at all").is_none());
    assert!(reader.parse_store_credential("{}").is_none());
    assert!(reader.parse_store_credential(r#"{"claudeAiOauth":{}}"#).is_none());
}

#[test]
fn every_provider_has_a_default_upstream() {
    for provider in SubscriptionProvider::ALL {
        let base = provider.default_base_url();
        assert!(base.starts_with("https://"), "{provider} must default to an HTTPS upstream, got {base}");
    }
}

#[test]
fn every_error_renders_its_message() {
    let errors = [
        SubscriptionError::NoCredentials("no credentials".into()),
        SubscriptionError::ReadError("read failed".into()),
        SubscriptionError::ParseError("parse failed".into()),
        SubscriptionError::NoToken("no token".into()),
    ];
    for error in errors {
        let rendered = error.to_string();
        assert!(!rendered.is_empty());
        assert!(!rendered.contains("SubscriptionError"), "the variant name leaked into the message: {rendered}");
    }
}

#[test]
fn a_qwen_resource_url_is_completed_only_where_it_is_incomplete() {
    let bare = SubscriptionToken {
        access_token: "a".into(),
        refresh_token: None,
        expires_at_ms: None,
        account_id: None,
        resource_url: Some("dashscope.example".into()),
    };
    let completed = bare.base_url(SubscriptionProvider::Qwen);
    assert!(completed.starts_with("https://"), "{completed}");
    assert!(completed.ends_with("/compatible-mode/v1"), "{completed}");
    let already_complete = SubscriptionToken {
        resource_url: Some("https://dashscope.example/compatible-mode/v1".into()),
        ..bare
    };
    assert_eq!(
        already_complete.base_url(SubscriptionProvider::Qwen),
        "https://dashscope.example/compatible-mode/v1",
        "a complete resource URL must not be rewritten"
    );
}

#[test]
fn an_installed_document_lands_where_the_vendor_client_writes() {
    let dir = tempfile::tempdir().expect("home");
    let reader = SubscriptionReader::new(SubscriptionProvider::Claude, dir.path());
    let document = r#"{"claudeAiOauth":{"accessToken":"a","refreshToken":"r","expiresAt":1}}"#;
    let installed = reader.install_document(document).expect("install");
    assert_eq!(installed, dir.path().join(".credentials.json"));
    assert_eq!(std::fs::read_to_string(&installed).expect("read back"), document);
}

#[test]
fn the_import_source_keeps_fields_the_token_does_not_model() {
    let dir = tempfile::tempdir().expect("home");
    let document = r#"{"auth_mode":"chatgpt","tokens":{"id_token":"i","access_token":"a","refresh_token":"r"}}"#;
    std::fs::write(dir.path().join("auth.json"), document).expect("plant");
    let reader = SubscriptionReader::new(SubscriptionProvider::Codex, dir.path());
    let source = reader.read_document_for_import().expect("read for import");
    assert_eq!(source.document, document);
    assert_eq!(source.origin, crate::platform_keychain::Origin::File);
    assert!(source.document.contains("id_token"));
    assert!(source.document.contains("auth_mode"));
}

#[test]
fn the_described_credential_is_the_installed_one() {
    let dir = tempfile::tempdir().unwrap();
    let reader = claude_home_expiring_at(dir.path(), 1_000);
    let store = serde_json::json!({
        "claudeAiOauth": {
            "accessToken": "keychain-access",
            "refreshToken": "keychain-refresh",
            "expiresAt": 9_999_999_i64,
        }
    }).to_string();
    let source = reader.import_from_store(Some(&store)).expect("a credential is available");
    assert_eq!(source.origin, crate::platform_keychain::Origin::Keychain);
    assert_eq!(source.document, store);
    assert_eq!(source.token.access_token, "keychain-access");
    assert_eq!(source.token.expires_at_ms, Some(9_999_999));
}

#[test]
fn a_file_newer_than_the_store_is_described_as_installed_too() {
    let dir = tempfile::tempdir().unwrap();
    let reader = claude_home_expiring_at(dir.path(), 9_999_999);
    let store = serde_json::json!({
        "claudeAiOauth": {
            "accessToken": "keychain-access",
            "refreshToken": "keychain-refresh",
            "expiresAt": 1_000_i64,
        }
    }).to_string();
    let source = reader.import_from_store(Some(&store)).expect("a credential is available");
    assert_eq!(source.origin, crate::platform_keychain::Origin::File);
    assert_eq!(source.token.access_token, "file-access");
    assert!(source.document.contains("file-access"));
}

/// An explicitly named source directory must remain authoritative when the
/// machine-wide platform credential expires later (issue #285).
#[test]
fn explicit_import_home_does_not_adopt_a_newer_keychain_credential() {
    let dir = tempfile::tempdir().unwrap();
    let reader = claude_home_expiring_at(dir.path(), 1_000);
    assert!(!reader.is_vendor_default_home());

    // The source reader must not consult the machine-wide store at all.
    assert!(reader.read_token_from_keychain().is_none());
    let source = reader
        .read_document_for_import()
        .expect("the explicitly named file is the import source");

    assert_eq!(source.origin, crate::platform_keychain::Origin::File);
    assert_eq!(source.token.access_token, "file-access");
    assert!(source.document.contains("file-access"));
    assert!(!source.document.contains("keychain-access"));
}

#[test]
fn importing_from_an_empty_home_is_an_error() {
    let dir = tempfile::tempdir().expect("home");
    let reader = SubscriptionReader::new(SubscriptionProvider::Codex, dir.path());
    let error = reader
        .read_document_for_import()
        .expect_err("an absent credential must not import as empty");
    assert!(format!("{error}").contains("codex"), "{error}");
}