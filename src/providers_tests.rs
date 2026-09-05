use super::*;
use tempfile::tempdir;

fn upsert() -> ProviderUpsert {
    ProviderUpsert {
        name: "litellm".into(),
        kind: Some("openai-compatible".into()),
        base_url: "http://localhost:4000/v1/".into(),
        default_model: Some("claude-sonnet".into()),
        models: Some(vec!["claude-sonnet".into()]),
        supported_clients: Some(vec!["opencode".into()]),
        api_key: Some("sk-test".into()),
        api_key_env: None,
        encrypted_api_key: None,
        enabled: Some(true),
        subscriber_id: None,
        acknowledge_intermediary_risk: None,
        acknowledge_unsupported_clients: None,
        if_absent: false,
    }
}

#[test]
fn provider_store_encrypts_and_resolves_api_key() {
    let dir = tempdir().unwrap();
    let store = ProviderStore::open(dir.path(), "secret").unwrap();
    let record = store.upsert(upsert()).unwrap();

    assert!(record.encrypted_api_key.is_some());
    assert_ne!(record.encrypted_api_key.as_deref(), Some("sk-test"));

    let resolved = store.resolve("litellm").unwrap().unwrap();
    assert_eq!(resolved.api_key.as_deref(), Some("sk-test"));
    assert_eq!(resolved.base_url, "http://localhost:4000/v1");

    let reopened = ProviderStore::open(dir.path(), "secret").unwrap();
    assert_eq!(
        reopened
            .resolve("litellm")
            .unwrap()
            .unwrap()
            .api_key
            .as_deref(),
        Some("sk-test")
    );
}

#[test]
fn persisted_provider_kind_spellings_round_trip_through_import() {
    assert_eq!(
        ProviderKind::from_str_opt("open-a-i-compatible"),
        Some(ProviderKind::OpenAICompatible)
    );
    assert_eq!(
        ProviderKind::from_str_opt("zai-coding-plan"),
        Some(ProviderKind::ZaiCodingPlan)
    );
    assert_eq!(
        ProviderKind::from_str_opt("lefine"),
        Some(ProviderKind::Lefine)
    );
    assert_eq!(ProviderKind::from_str_opt("future-provider"), None);
}

#[test]
fn provider_store_redacts_saved_secret() {
    let dir = tempdir().unwrap();
    let store = ProviderStore::open(dir.path(), "secret").unwrap();
    store.upsert(upsert()).unwrap();

    let redacted = store.list_redacted().unwrap();
    assert!(redacted[0].has_encrypted_api_key);
}

fn zai_upsert(enabled: Option<bool>, acknowledged: bool) -> ProviderUpsert {
    ProviderUpsert {
        name: "z-ai-personal".into(),
        kind: Some("z.ai-coding-plan".into()),
        base_url: "https://api.z.ai".into(),
        default_model: Some("glm-5".into()),
        models: Some(vec!["glm-5".into()]),
        supported_clients: None,
        api_key: Some("zai-secret".into()),
        api_key_env: None,
        encrypted_api_key: None,
        enabled,
        subscriber_id: Some("owner-a".into()),
        acknowledge_intermediary_risk: Some(acknowledged),
        acknowledge_unsupported_clients: Some(Vec::new()),
        if_absent: false,
    }
}

#[test]
fn coding_plan_defaults_disabled_and_requires_explicit_risk_acknowledgement() {
    let dir = tempdir().unwrap();
    let store = ProviderStore::open(dir.path(), "secret").unwrap();
    let disabled = store.upsert(zai_upsert(None, false)).unwrap();
    assert!(!disabled.enabled);
    assert!(store.resolve("z-ai-personal").unwrap().is_none());

    let error = store.upsert(zai_upsert(Some(true), false)).unwrap_err();
    assert!(error.to_string().contains("acknowledge-intermediary-risk"));
    let enabled = store.upsert(zai_upsert(Some(true), true)).unwrap();
    assert!(enabled.enabled);
    assert!(enabled.encrypted_api_key.is_some());
    assert!(
        !serde_json::to_string(&enabled.redacted())
            .unwrap()
            .contains("zai-secret")
    );
}

#[test]
fn lefine_kind_derives_only_native_chat_completion_clients() {
    let dir = tempdir().unwrap();
    let store = ProviderStore::open(dir.path(), "secret").unwrap();
    let mut input = upsert();
    input.name = "lefine".into();
    input.kind = Some("lefine".into());
    input.base_url = "https://lefine.pro/v1".into();
    input.default_model = None;
    input.supported_clients = None;
    input.models = Some(vec!["configured/exact-id".into()]);

    let record = store.upsert(input).unwrap();

    assert_eq!(record.kind.as_str(), "lefine");
    assert_eq!(
        record.effective_supported_clients(),
        vec!["grok", "opencode", "qwen"]
    );
}

#[test]
fn coding_plan_accepts_future_models_but_rejects_multiple_enabled_subscribers() {
    let dir = tempdir().unwrap();
    let store = ProviderStore::open(dir.path(), "secret").unwrap();
    let mut future = zai_upsert(Some(true), true);
    future.models = Some(vec!["future-saffron-91".into()]);
    let stored = store.upsert(future).unwrap();
    assert_eq!(stored.models, ["future-saffron-91"]);
    let mut second = zai_upsert(Some(true), true);
    second.name = "another-subscriber".into();
    second.subscriber_id = Some("owner-b".into());
    assert!(
        store
            .upsert(second)
            .unwrap_err()
            .to_string()
            .contains("only one personal")
    );
}

#[test]
fn independently_opened_provider_stores_do_not_lose_updates() {
    let dir = tempdir().unwrap();
    let first = ProviderStore::open(dir.path(), "secret").unwrap();
    let second = ProviderStore::open(dir.path(), "secret").unwrap();
    first.upsert(upsert()).unwrap();
    let mut other = upsert();
    other.name = "other".into();
    other.base_url = "https://other.example/v1".into();
    second.upsert(other).unwrap();

    assert_eq!(first.list().unwrap().len(), 2);
    assert_eq!(second.list().unwrap().len(), 2);
}

#[test]
fn import_indented_provider_config() {
    let input = r#"
litellm
  kind "openai-compatible"
  base-url "http://litellm:4000/v1"
  model "claude-sonnet"
  models "claude-sonnet,gpt-4o"
  api-key "sk-local"
"#;
    let parsed = parse_provider_import(input).unwrap();
    assert_eq!(parsed.len(), 1);
    assert_eq!(parsed[0].name, "litellm");
    assert_eq!(parsed[0].base_url, "http://litellm:4000/v1");
    assert_eq!(
        parsed[0].models.as_ref().unwrap(),
        &vec!["claude-sonnet".to_string(), "gpt-4o".to_string()]
    );
}

#[test]
fn indented_import_covers_client_policy_fields_and_rejects_ambiguous_input() {
    let input = r#"
ordinary
  api_base "https://ordinary.example/v1"
  supported-clients "codex, opencode"
  api-key-env "ORDINARY_API_KEY"
  enabled yes
personal
  kind "z.ai-coding-plan"
  base_url "https://api.z.ai"
  subscriber-id "owner"
  acknowledge-intermediary-risk true
  acknowledge-unsupported-clients "cursor, agent"
"#;
    let parsed = parse_provider_import(input).expect("parse complete policy fields");
    assert_eq!(parsed.len(), 2);
    assert_eq!(
        parsed[0].supported_clients.as_deref(),
        Some(&["codex".to_string(), "opencode".to_string()][..])
    );
    assert_eq!(parsed[0].api_key_env.as_deref(), Some("ORDINARY_API_KEY"));
    assert_eq!(parsed[0].enabled, Some(true));
    assert_eq!(parsed[1].subscriber_id.as_deref(), Some("owner"));
    assert_eq!(parsed[1].acknowledge_intermediary_risk, Some(true));
    assert_eq!(
        parsed[1].acknowledge_unsupported_clients.as_deref(),
        Some(&["cursor".to_string(), "agent".to_string()][..])
    );

    for invalid in [
        "  base-url https://orphan.example",
        "ordinary\n  future-field value",
        "ordinary\n  base-url",
        "# comments only",
    ] {
        assert!(
            parse_provider_import(invalid).is_err(),
            "ambiguous manifest must fail: {invalid}"
        );
    }
}

#[test]
fn import_json_provider_config() {
    let input = r#"{"providers":[{"name":"litellm","base_url":"http://litellm:4000/v1"}]}"#;
    let parsed = parse_provider_import(input).unwrap();
    assert_eq!(parsed[0].name, "litellm");
}

#[test]
fn a_mutation_recovers_an_uncommitted_predecessor_before_loading_it() {
    let dir = tempdir().unwrap();
    let store = ProviderStore::open(dir.path(), "secret").unwrap();
    let mut original = upsert();
    original.name = "original".into();
    store.upsert(original).unwrap();
    let path = dir.path().join("providers.lenv");
    let prior = std::fs::read(&path).unwrap();

    let mut interrupted = upsert();
    interrupted.name = "uncommitted".into();
    store.upsert(interrupted).unwrap();
    let rollback = dir.path().join(".providers.lenv.router-rollback");
    let mut rollback_document = vec![1];
    rollback_document.extend_from_slice(&prior);
    crate::durable_file::atomic_write_owner_only(&rollback, &rollback_document).unwrap();

    let mut later = upsert();
    later.name = "later".into();
    store.upsert(later).unwrap();

    let names = ProviderStore::open(dir.path(), "secret")
        .unwrap()
        .list()
        .unwrap()
        .into_iter()
        .map(|record| record.name)
        .collect::<Vec<_>>();
    assert_eq!(names, ["later", "original"]);
    assert!(!rollback.exists());
}

#[test]
fn import_provider_store_lenv_preserves_encrypted_key() {
    let source_dir = tempdir().unwrap();
    let source = ProviderStore::open(source_dir.path(), "secret").unwrap();
    source.upsert(upsert()).unwrap();

    let target_dir = tempdir().unwrap();
    let target = ProviderStore::open(target_dir.path(), "secret").unwrap();
    let imported = target
        .import_file(&source_dir.path().join("providers.lenv"))
        .unwrap();

    assert_eq!(imported, 1);
    assert_eq!(
        target
            .resolve("litellm")
            .unwrap()
            .unwrap()
            .api_key
            .as_deref(),
        Some("sk-test")
    );
}

/// A record encrypted under a published stand-in is named as disclosed,
/// not surfaced as an opaque decryption failure: that key can be read out
/// of the router's own source, so it has to be rotated (issue #300).
#[test]
fn a_key_encrypted_under_a_placeholder_is_reported_as_disclosed() {
    use aes_gcm::aead::Aead as _;

    let placeholder = crate::token_secret::LEGACY_PLACEHOLDERS[0];
    // What the old build wrote: encryption under a key published in the
    // source. `cipher` refuses to produce this now, which is the fix; the
    // record it already wrote still has to be recognised.
    let legacy = legacy_cipher(placeholder).expect("legacy key");
    let nonce = Nonce::default();
    let ciphertext = legacy
        .encrypt(&nonce, b"sk-real-vendor-key".as_ref())
        .expect("encrypt under the placeholder");
    let mut packed = nonce.to_vec();
    packed.extend_from_slice(&ciphertext);
    let encrypted = format!("aes256gcm:{}", STANDARD.encode(&packed));

    let error = decrypt_api_key(&encrypted, "a-real-signing-secret")
        .expect_err("a real secret cannot decrypt it");
    let message = error.to_string();

    assert!(
        message.contains("disclosed"),
        "the operator must be told the key is compromised: {message}"
    );
    assert!(
        message.contains(placeholder),
        "and which stand-in it was encrypted under: {message}"
    );
    assert!(
        message.contains("rotate"),
        "and what to do about it: {message}"
    );
    // A genuinely wrong secret still fails plainly, without crying wolf.
    let sound = encrypt_api_key("sk-real-vendor-key", "the-right-secret").expect("encrypt");
    let error = decrypt_api_key(&sound, "the-wrong-secret").expect_err("wrong key");
    assert!(
        !error.to_string().contains("disclosed"),
        "an ordinary mismatch is not a disclosure: {error}"
    );
}
