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
    // Padding must never truncate or alter a value that already fills the
    // column.
    assert_eq!(format!("[{:<3}]", SubscriptionProvider::Gemini), "[gemini]");
    // The unpadded rendering is unchanged.
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
    // header.payload.signature with payload carrying the nested account id.
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
    // resource_url overrides the default DashScope base and gets the exact
    // `/v1` suffix Qwen Code itself adds, plus a scheme when absent.
    assert_eq!(
        token.base_url(SubscriptionProvider::Qwen),
        "https://portal.qwen.ai/v1"
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
    // Without the override env var set, falls back to <home>/<subdir>.
    let home = SubscriptionProvider::Codex.resolve_home("/home/alice");
    assert!(home.ends_with(".codex"));
}

/// A rotated refresh token must reach disk, or the next process start
/// replays a token the vendor has already spent (issue #205).
#[test]
fn write_token_persists_a_rotated_refresh_token_for_codex() {
    let dir = tempdir();
    // The real Codex layout, including fields this crate does not model.
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
    // Fields the vendor CLI relies on must survive the merge.
    assert_eq!(written["tokens"]["id_token"], "id-1");
    assert_eq!(written["auth_mode"], "chatgpt");
    assert_eq!(written["tokens"]["account_id"], "acct_1");
    // The refresh is stamped so the vendor CLI sees it happened.
    assert_ne!(written["last_refresh"], "2026-08-11T11:31:03Z");

    // And the round trip reads back what was written.
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
    // Vendor-only fields are untouched.
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

/// Write a Claude credential file holding `expires_at_ms`, and return a reader
/// rooted at its home.
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

/// The bug in #249: the file had expired hours ago while the Keychain held a
/// live credential, and the router read only the file. The live one must win.
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

/// The file must keep winning when it is the newer credential, so a stale
/// keychain entry left by an older client cannot drag a working router back.
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

/// A store that merely mirrors the file must change nothing: equal expiries
/// mean there is no evidence the store is ahead.
#[test]
fn an_equal_keychain_entry_leaves_the_file_in_place() {
    let dir = tempfile::tempdir().unwrap();
    let reader = claude_home_expiring_at(dir.path(), 5_000);

    let (_, origin) = reader
        .select_store(Some(keychain_token("keychain-access", Some(5_000))))
        .expect("a credential is available");

    assert_eq!(origin, crate::platform_keychain::Origin::File);
}

/// With no store entry the reader must behave exactly as it did before #249 —
/// this is what every non-macOS platform, and every other provider, sees.
#[test]
fn without_a_store_the_file_is_used_unchanged() {
    let dir = tempfile::tempdir().unwrap();
    let reader = claude_home_expiring_at(dir.path(), 5_000);

    let (token, origin) = reader
        .select_store(None)
        .expect("a credential is available");

    assert_eq!(origin, crate::platform_keychain::Origin::File);
    assert_eq!(token.access_token, "file-access");
}

/// A keychain credential must be usable even with no credential file at all:
/// a machine that only ever logged in through a recent client has no file.
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

/// A file promotion cannot replace a platform-store credential with a later
/// expiry. Import must detect that the candidate would remain shadowed and
/// refuse before reporting success.
#[test]
fn a_newer_platform_credential_would_shadow_an_import_candidate() {
    let candidate = keychain_token("candidate", Some(6_000));

    assert!(SubscriptionReader::candidate_is_shadowed_by_store(
        &candidate,
        Some(keychain_token("keychain", Some(7_000)))
    ));
    assert!(!SubscriptionReader::candidate_is_shadowed_by_store(
        &candidate,
        Some(keychain_token("keychain", Some(6_000)))
    ));
    assert!(!SubscriptionReader::candidate_is_shadowed_by_store(
        &candidate, None
    ));
}

/// Neither store holding a credential must still report the file's error, so a
/// machine with nothing configured says what it always said.
#[test]
fn with_neither_store_the_file_error_is_reported() {
    let dir = tempfile::tempdir().unwrap();
    let reader = SubscriptionReader::new(SubscriptionProvider::Claude, dir.path());

    assert!(reader.select_store(None).is_err());
}

/// An expiry-less store credential must not displace a file that has a usable
/// expiry: an unknown expiry cannot be shown to be newer.
#[test]
fn a_store_credential_without_an_expiry_does_not_displace_the_file() {
    let dir = tempfile::tempdir().unwrap();
    let reader = claude_home_expiring_at(dir.path(), 5_000);

    let (_, origin) = reader
        .select_store(Some(keychain_token("keychain-access", None)))
        .expect("a credential is available");

    assert_eq!(origin, crate::platform_keychain::Origin::File);
}

/// A reader rooted somewhere other than the vendor's default home must never
/// consult the machine-wide store.
///
/// The store holds one entry for the whole machine. Letting it answer for a
/// pooled account would make every account in a pool report the same
/// subscription — turning a fix for one stale credential into silent
/// cross-account leakage.
#[test]
fn a_pooled_home_never_consults_the_machine_store() {
    let dir = tempfile::tempdir().unwrap();
    let reader = SubscriptionReader::new(SubscriptionProvider::Claude, dir.path());

    assert!(
        !reader.is_vendor_default_home(),
        "a temp directory is not the vendor default home"
    );
    assert!(
        reader.read_token_from_keychain().is_none(),
        "a pooled reader must not read the machine-wide store"
    );
}

/// The store holds the same JSON shape the file does, so the vendor's own
/// entry must parse without a second parser.
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

/// An entry this crate cannot read must leave the file as the source rather
/// than failing the command — the pre-#249 behaviour on every platform.
#[test]
fn an_unreadable_store_entry_yields_no_credential() {
    let reader = SubscriptionReader::new(SubscriptionProvider::Claude, "/nonexistent");

    assert!(reader.parse_store_credential("not json at all").is_none());
    assert!(reader.parse_store_credential("{}").is_none());
    assert!(
        reader
            .parse_store_credential(r#"{"claudeAiOauth":{}}"#)
            .is_none(),
        "an entry with no token must not be adopted"
    );
}

/// Every provider names an upstream, so a missing default cannot silently
/// route a subscription at the wrong vendor.
#[test]
fn every_provider_has_a_default_upstream() {
    for provider in SubscriptionProvider::ALL {
        let base = provider.default_base_url();
        assert!(
            base.starts_with("https://"),
            "{provider} must default to an HTTPS upstream, got {base}"
        );
    }
}

/// Each error variant renders its own message, so an operator sees what went
/// wrong rather than the variant's name.
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
        assert!(
            !rendered.contains("SubscriptionError"),
            "the variant name leaked into the message: {rendered}"
        );
    }
}

/// Qwen returns a bare host, so the scheme and `/v1` suffix are added; a base
/// that already ends in `/v1` is left alone.
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
    assert!(completed.ends_with("/v1"), "{completed}");

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

/// An adopted credential lands where the provider's own client writes, which
/// is not the same as the first name it is searched under.
///
/// Claude is *read* from `credentials.json` first for legacy-pool parity but
/// Claude Code *writes* `.credentials.json`, so installing under the
/// search-first name would leave the vendor client with a file it does not
/// recognise (issue #274).
#[test]
fn an_installed_document_lands_where_the_vendor_client_writes() {
    let dir = tempfile::tempdir().expect("home");
    let reader = SubscriptionReader::new(SubscriptionProvider::Claude, dir.path());
    let document = r#"{"claudeAiOauth":{"accessToken":"a","refreshToken":"r","expiresAt":1}}"#;

    let installed = reader.install_document(document).expect("install");

    assert_eq!(installed, dir.path().join(".credentials.json"));
    assert_eq!(
        std::fs::read_to_string(&installed).expect("read back"),
        document
    );
    assert_eq!(
        SubscriptionProvider::Claude.canonical_credential_filename(),
        ".credentials.json"
    );
    assert_eq!(
        SubscriptionProvider::Codex.canonical_credential_filename(),
        "auth.json"
    );
}

/// The document is handed back verbatim, so fields the router does not model
/// survive an import.
///
/// `SubscriptionToken` carries no `id_token`, and Codex derives its account id
/// from that field on every read — re-serializing a parsed token would drop
/// exactly what the next read depends on.
#[test]
fn the_import_source_keeps_fields_the_token_does_not_model() {
    let dir = tempfile::tempdir().expect("home");
    let document = r#"{"auth_mode":"chatgpt","tokens":{"id_token":"i","access_token":"a","refresh_token":"r"}}"#;
    std::fs::write(dir.path().join("auth.json"), document).expect("plant");
    let reader = SubscriptionReader::new(SubscriptionProvider::Codex, dir.path());

    let source = reader.read_document_for_import().expect("read for import");

    assert_eq!(
        source.document, document,
        "the document must survive verbatim"
    );
    assert_eq!(source.origin, crate::platform_keychain::Origin::File);
    assert!(source.document.contains("id_token"));
    assert!(source.document.contains("auth_mode"));
}

/// The reported credential is the installed one (issue #280).
///
/// Import read the source twice through two methods that select the platform
/// store by different rules: the document consulted the store for any home,
/// while the token describing it consulted the store only for the vendor's
/// default home. An import always names a source that differs from the
/// destination — otherwise there is nothing to adopt — so on macOS the two
/// disagreed on every run, and a live Keychain credential was installed under
/// the stale file's verdict: `EXPIRED 3 days ago ... REJECTED by the vendor`
/// for a credential that served traffic seconds later.
///
/// The direction that matters: the verdict must follow the bytes, whichever
/// store won.
#[test]
fn the_described_credential_is_the_installed_one() {
    let dir = tempfile::tempdir().unwrap();
    // The #280 shape: a file that expired long ago beside a live store entry.
    let reader = claude_home_expiring_at(dir.path(), 1_000);
    let store = serde_json::json!({
        "claudeAiOauth": {
            "accessToken": "keychain-access",
            "refreshToken": "keychain-refresh",
            "expiresAt": 9_999_999_i64,
        }
    })
    .to_string();

    let source = reader
        .import_from_store(Some(&store))
        .expect("a credential is available");

    assert_eq!(
        source.origin,
        crate::platform_keychain::Origin::Keychain,
        "the live store credential is the one to adopt"
    );
    assert_eq!(
        source.document, store,
        "the store credential is what gets installed"
    );
    assert_eq!(
        source.token.access_token, "keychain-access",
        "the described token must be the installed document's, not the file's"
    );
    assert_eq!(
        source.token.expires_at_ms,
        Some(9_999_999),
        "reporting the file's expiry is what declared a working credential dead"
    );
}

/// The same invariant with the file winning: the verdict follows the bytes.
///
/// Guards the inverse failure the issue names — a stale credential installed
/// under a fresh verdict — so the fix cannot be read as "always prefer the
/// store".
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
    })
    .to_string();

    let source = reader
        .import_from_store(Some(&store))
        .expect("a credential is available");

    assert_eq!(source.origin, crate::platform_keychain::Origin::File);
    assert_eq!(source.token.access_token, "file-access");
    assert!(source.document.contains("file-access"));
}

/// An explicitly named source is read as given, whatever the store holds
/// (issue #285).
///
/// The platform store is a single machine-wide entry, so consulting it for any
/// home let it answer for a directory it does not describe. On macOS it usually
/// holds the newest credential, so it beat every named source and no spelling
/// of `auth import <provider> <dir>` could reach the file the operator pointed
/// at — a pool of per-account directories collapsed onto the one interactive
/// login.
///
/// Asserted through `import_source_keychain`, which is the function the guard
/// lives in: `import_from_store` takes the store entry as a parameter, so a
/// test that called it directly would bypass the guard and pass either way.
/// This also keeps the test honest on every platform — the real Keychain is
/// never read, which no test may do.
#[test]
fn a_named_source_does_not_consult_the_platform_store() {
    let dir = tempfile::tempdir().unwrap();
    let reader = claude_home_expiring_at(dir.path(), 1_000);

    assert!(
        !reader.is_vendor_default_home(),
        "a temp directory is not the vendor's home, which is what makes this the #285 case"
    );
    assert!(
        !reader.consults_platform_store_for_import(),
        "an explicitly named source must not reach for the machine-wide store"
    );
    // And the lookup itself yields nothing, which is what the caller sees.
    assert!(reader.import_source_keychain().is_none());
}

/// The unqualified case still consults the store, so issue #249 keeps working.
///
/// `auth import claude` with no directory resolves to the vendor's own home,
/// where a live Keychain credential sits beside a file nothing rotates. Gating
/// the store on the *default* home is what separates "adopt the login this
/// machine has" from "adopt this credential, from there" — the distinction
/// issue #285 asked for. Without this the fix would silently undo #249.
///
/// `HOME` is read rather than set: this process never mutates the environment
/// (the crate denies `unsafe_code`, and a shared variable is not a test's to
/// change), so the reader is built against whatever home this run really has.
#[test]
fn the_vendor_default_home_still_consults_the_platform_store() {
    let Ok(home) = std::env::var("HOME") else {
        // Nothing to assert about a default home that cannot be resolved.
        return;
    };
    let reader = SubscriptionReader::new(
        SubscriptionProvider::Claude,
        SubscriptionProvider::Claude.resolve_home(&home),
    );

    assert!(
        reader.consults_platform_store_for_import(),
        "the vendor's own home must still consult the store, or the #249 recovery is lost"
    );
}

/// A home with no credential is an error naming the home, not an empty import.
#[test]
fn importing_from_an_empty_home_is_an_error() {
    let dir = tempfile::tempdir().expect("home");
    let reader = SubscriptionReader::new(SubscriptionProvider::Codex, dir.path());

    let error = reader
        .read_document_for_import()
        .expect_err("an absent credential must not import as empty");

    assert!(format!("{error}").contains("codex"), "{error}");
}

/// A syntactically valid vendor document with no access token is distinct from
/// an absent file and must report the provider and path it rejected.
#[test]
fn a_credential_document_without_an_access_token_is_rejected() {
    let dir = tempfile::tempdir().expect("credential home");
    let path = dir.path().join("oauth_creds.json");
    std::fs::write(&path, r#"{"refresh_token":"orphaned"}"#).expect("credential file");
    let reader = SubscriptionReader::new(SubscriptionProvider::Qwen, dir.path());

    let error = reader.read_token().expect_err("access token is mandatory");

    assert!(matches!(error, SubscriptionError::NoToken(_)));
    assert!(error.to_string().contains("qwen"), "{error}");
    assert!(
        error.to_string().contains(&path.display().to_string()),
        "{error}"
    );
}

/// A malformed credential cannot be rewritten because doing so would discard
/// vendor-owned fields that the router cannot reconstruct.
#[test]
fn write_token_refuses_to_replace_a_malformed_vendor_document() {
    let dir = tempfile::tempdir().expect("credential home");
    std::fs::write(dir.path().join("oauth_creds.json"), "not json").expect("credential file");
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
        Err(SubscriptionError::ParseError(_))
    ));
    assert_eq!(
        std::fs::read_to_string(dir.path().join("oauth_creds.json")).unwrap(),
        "not json"
    );
}

/// Hand-written Claude credentials may use the legacy flat `snake_case` shape.
/// Refresh must preserve that shape instead of introducing a second dialect.
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

/// A named account home cannot be shadowed by the machine-wide platform store;
/// only the vendor's default home is eligible to consult that store.
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

/// A directory occupying the credential filename is an I/O failure, not an
/// absent credential that refresh may replace.
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

/// Withdrawal must surface an occupied credential path it cannot remove rather
/// than report success while the reader still finds that path.
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
