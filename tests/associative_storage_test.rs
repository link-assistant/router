use std::fs;

use link_assistant_router::storage::{BinaryTokenStore, TextTokenStore, TokenRecord, TokenStore};

use tempfile::tempdir;

fn sample_record() -> TokenRecord {
    TokenRecord {
        github_repos: Vec::new(),
        id: "6fdf2800-72c6-47dc-9050-67bc66fa72fc".into(),
        label: "official codec compatibility".into(),
        issued_at: 1_700_000_000,
        expires_at: 1_700_001_000,
        revoked: false,
        sliding_window_seconds: None,
        account: Some("primary".into()),
        max_requests: Some(100),
        used_requests: 7,
        max_tokens: Some(10_000),
        used_tokens: 250,
        reserved_tokens: 0,
        rate_limit_per_minute: Some(20),
        rate_window_started_at: 1_700_000_000,
        rate_window_requests: 3,
        scope: "admin".into(),
        client_kind: Some("codex".into()),
        principal_id: Some("primary".into()),
    }
}

#[test]
fn text_store_is_decodable_by_the_official_lino_codec() {
    let dir = tempdir().unwrap();
    let path = dir.path().join("tokens.lino");
    let store = TextTokenStore::open(&path).unwrap();
    store.put(sample_record()).unwrap();

    let encoded = std::fs::read_to_string(path).unwrap();
    links_notation::parse_lino(&encoded)
        .expect("tokens.lino must parse as upstream Links Notation");
    lino_objects_codec::decode(&encoded)
        .expect("tokens.lino must be real Links Notation understood by the official codec");
}

#[test]
fn binary_store_is_a_reopenable_native_doublets_links_network() {
    let dir = tempdir().unwrap();
    let path = dir.path().join("tokens.bin");
    let store = BinaryTokenStore::open(&path).unwrap();
    let mut record = sample_record();
    record.label = "large associative value".repeat(500);
    store.put(record.clone()).unwrap();

    let bytes = fs::read(&path).unwrap();
    assert!(!bytes.starts_with(b"LARTOK01"));

    assert_eq!(
        BinaryTokenStore::open(path)
            .unwrap()
            .get(&record.id)
            .unwrap(),
        Some(record)
    );
}

#[test]
fn legacy_text_store_is_loaded_and_migrated() {
    let dir = tempdir().unwrap();
    let path = dir.path().join("tokens.lino");
    fs::write(
        &path,
        concat!(
            "# Link.Assistant.Router token store\n",
            "(token legacy (label \"old format\") (issued_at 1) ",
            "(expires_at 2) (revoked false) (account \"primary\") ",
            "(max_requests 10) (used_requests 3) (scope \"admin\"))\n",
        ),
    )
    .unwrap();

    let store = TextTokenStore::open(&path).unwrap();
    let record = store.get("legacy").unwrap().unwrap();
    assert_eq!(record.label, "old format");
    assert_eq!(record.max_requests, Some(10));
    assert_eq!(record.used_requests, 3);

    let migrated = fs::read_to_string(path).unwrap();
    assert!(!migrated.contains("(token legacy"));
    lino_objects_codec::decode(&migrated).expect("legacy text must migrate to official Lino");
}

#[test]
fn legacy_binary_store_is_loaded_and_migrated() {
    let dir = tempdir().unwrap();
    let path = dir.path().join("tokens.bin");
    let record = sample_record();
    let json = serde_json::to_vec(&record).unwrap();
    let mut legacy = b"LARTOK01".to_vec();
    legacy.extend_from_slice(&u32::try_from(json.len()).unwrap().to_le_bytes());
    legacy.extend_from_slice(&json);
    fs::write(&path, legacy).unwrap();

    let store = BinaryTokenStore::open(&path).unwrap();
    assert_eq!(store.get(&record.id).unwrap(), Some(record));
    assert!(!fs::read(path).unwrap().starts_with(b"LARTOK01"));
}
