use link_assistant_router::storage::{TextTokenStore, TokenRecord, TokenStore};

use tempfile::tempdir;

fn sample_record() -> TokenRecord {
    TokenRecord {
        id: "6fdf2800-72c6-47dc-9050-67bc66fa72fc".into(),
        label: "official codec compatibility".into(),
        issued_at: 1_700_000_000,
        expires_at: 1_700_001_000,
        revoked: false,
        account: Some("primary".into()),
        max_requests: Some(100),
        used_requests: 7,
        scope: "admin".into(),
    }
}

#[test]
fn text_store_is_decodable_by_the_official_lino_codec() {
    let dir = tempdir().unwrap();
    let path = dir.path().join("tokens.lino");
    let store = TextTokenStore::open(&path).unwrap();
    store.put(sample_record()).unwrap();

    let encoded = std::fs::read_to_string(path).unwrap();
    lino_objects_codec::decode(&encoded)
        .expect("tokens.lino must be real Links Notation understood by the official codec");
}
