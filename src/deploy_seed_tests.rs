use super::*;

const SECRET: &str = "seed-test-secret";

fn claude_home(document: &str) -> tempfile::TempDir {
    let home = tempfile::tempdir().unwrap();
    std::fs::create_dir(home.path().join(".claude")).unwrap();
    std::fs::write(home.path().join(".claude/.credentials.json"), document).unwrap();
    home
}

fn claude_document(refresh: &str) -> String {
    json!({"claudeAiOauth": {
        "accessToken": "sk-ant-oat01-access",
        "refreshToken": refresh,
        "expiresAt": 4_102_444_800_000_i64,
        "scopes": ["user:inference"],
    }})
    .to_string()
}

fn stored(home: &tempfile::TempDir) -> Value {
    serde_json::from_str(
        &std::fs::read_to_string(home.path().join(".claude/.credentials.json")).unwrap(),
    )
    .unwrap()
}

#[test]
fn providers_parse_with_aliases_and_deduplicate() {
    let names = ["anthropic", "codex", "claude", "ChatGPT"].map(String::from);
    assert_eq!(
        parse_providers(&names).unwrap(),
        [SeedProvider::Claude, SeedProvider::Codex]
    );
    assert!(parse_providers(&["gemini".into()]).is_err());
}

#[test]
fn the_fingerprint_names_the_chain_not_the_access_token() {
    let one = fingerprint(SECRET, SeedProvider::Claude, "refresh-a");
    assert_eq!(one, fingerprint(SECRET, SeedProvider::Claude, "refresh-a"));
    assert_ne!(one, fingerprint(SECRET, SeedProvider::Codex, "refresh-a"));
    assert_ne!(one, fingerprint(SECRET, SeedProvider::Claude, "refresh-b"));
    assert_ne!(one, fingerprint("other", SeedProvider::Claude, "refresh-a"));
    assert!(!one.contains("refresh-a"));
}

#[test]
fn a_seed_is_marked_pending_then_handed_over_and_never_leaks_its_debug() {
    let home = claude_home(&claude_document("refresh-a"));
    let seed = prepare(SeedProvider::Claude, home.path(), "router@far", SECRET).unwrap();
    assert!(!format!("{seed:?}").contains("refresh-a"));
    assert!(seed.document.contains("refresh-a"));
    assert!(!seed.document.contains(METADATA_KEY));

    seed.mark_pending("router@far").unwrap();
    let value = stored(&home);
    assert_eq!(
        value.pointer("/_link_assistant_router/refresh_owner"),
        Some(&json!("external"))
    );
    assert_eq!(
        handover_of(&value).unwrap(),
        (
            "router@far".to_string(),
            seed.fingerprint.clone(),
            "pending".to_string()
        )
    );
    assert_eq!(
        crate::credential_source::describe_document(&value.to_string()).as_str(),
        "external",
        "this machine's Router no longer refreshes the chain"
    );

    assert_eq!(
        seed.settle("router@far", Some("imported")).unwrap(),
        "handed-over"
    );
    assert_eq!(handover_of(&stored(&home)).unwrap().2, "handed-over");

    // A re-run reads the marked source, strips the metadata again and keeps
    // the same fingerprint, so the target's receipt makes it a no-op.
    let again = prepare(SeedProvider::Claude, home.path(), "router@far", SECRET).unwrap();
    assert_eq!(again.fingerprint, seed.fingerprint);
    assert_eq!(again.document, seed.document);

    // Seeding the same chain to a second server is a fork.
    let fork = prepare(SeedProvider::Claude, home.path(), "router@other", SECRET).unwrap_err();
    assert!(fork.contains("fork"), "{fork}");
}

#[test]
fn a_target_with_its_own_login_restores_the_source_and_no_answer_stays_pending() {
    let original = claude_document("refresh-b");
    let home = claude_home(&original);
    let seed = prepare(SeedProvider::Claude, home.path(), "far", SECRET).unwrap();
    seed.mark_pending("far").unwrap();
    assert_eq!(seed.settle("far", None).unwrap(), "pending");
    assert_eq!(handover_of(&stored(&home)).unwrap().2, "pending");
    assert_eq!(
        seed.settle("far", Some("kept-existing")).unwrap(),
        "restored"
    );
    assert_eq!(
        std::fs::read_to_string(home.path().join(".claude/.credentials.json")).unwrap(),
        original
    );
}

#[test]
fn a_missing_login_is_refused_before_anything_is_written() {
    let home = tempfile::tempdir().unwrap();
    let error = prepare(SeedProvider::Codex, home.path(), "far", SECRET).unwrap_err();
    assert!(error.starts_with("--seed-credential codex"), "{error}");
    // The vendor reader may create its home directory; no file is written.
    let written: Vec<_> = walk(home.path());
    assert!(written.is_empty(), "{written:?}");
}

fn walk(dir: &std::path::Path) -> Vec<std::path::PathBuf> {
    std::fs::read_dir(dir)
        .into_iter()
        .flatten()
        .flatten()
        .flat_map(|entry| {
            let path = entry.path();
            if path.is_dir() {
                walk(&path)
            } else {
                vec![path]
            }
        })
        .collect()
}
