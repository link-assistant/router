use super::*;
use std::sync::Barrier;
use std::thread;
use tempfile::tempdir;

fn sample_record(id: &str) -> TokenRecord {
    TokenRecord {
        id: id.into(),
        label: "test \"label\"".into(),
        issued_at: 1_700_000_000,
        expires_at: 1_700_001_000,
        revoked: false,
        account: Some("primary".into()),
        max_requests: None,
        used_requests: 0,
        max_tokens: None,
        used_tokens: 0,
        rate_limit_per_minute: None,
        rate_window_started_at: 0,
        rate_window_requests: 0,
        scope: String::new(),
    }
}

#[test]
fn memory_store_roundtrip() {
    let s = MemoryTokenStore::new();
    s.put(sample_record("a")).unwrap();
    assert_eq!(s.list().unwrap().len(), 1);
    assert!(s.get("a").unwrap().is_some());
    assert!(s.delete("a").unwrap());
    assert!(s.get("a").unwrap().is_none());
}

#[test]
fn text_store_roundtrip() {
    let dir = tempdir().unwrap();
    let path = dir.path().join("tokens.lino");
    let s = TextTokenStore::open(&path).unwrap();
    s.put(sample_record("a")).unwrap();
    s.put(sample_record("b")).unwrap();
    let s2 = TextTokenStore::open(&path).unwrap();
    let mut list = s2.list().unwrap();
    list.sort_by(|x, y| x.id.cmp(&y.id));
    assert_eq!(list.len(), 2);
    assert_eq!(list[0].id, "a");
    assert_eq!(list[0].label, "test \"label\"");
    assert_eq!(list[0].account.as_deref(), Some("primary"));
}

#[test]
fn binary_store_roundtrip() {
    let dir = tempdir().unwrap();
    let path = dir.path().join("tokens.bin");
    let s = BinaryTokenStore::open(&path).unwrap();
    s.put(sample_record("a")).unwrap();
    s.put(sample_record("b")).unwrap();
    let s2 = BinaryTokenStore::open(&path).unwrap();
    let mut list = s2.list().unwrap();
    list.sort_by(|x, y| x.id.cmp(&y.id));
    assert_eq!(list.len(), 2);
    assert_eq!(list[1].id, "b");
}

#[test]
fn stores_persist_the_admin_scope() {
    let dir = tempdir().unwrap();
    let mut admin = sample_record("admin");
    admin.scope = crate::token::ADMIN_SCOPE.to_string();

    let text_path = dir.path().join("tokens.lino");
    let text = TextTokenStore::open(&text_path).unwrap();
    text.put(admin.clone()).unwrap();
    text.put(sample_record("client")).unwrap();
    let text = TextTokenStore::open(&text_path).unwrap();
    assert_eq!(
        text.get("admin").unwrap().unwrap().scope,
        crate::token::ADMIN_SCOPE
    );
    assert!(text.get("client").unwrap().unwrap().scope.is_empty());

    let bin_path = dir.path().join("tokens.bin");
    let bin = BinaryTokenStore::open(&bin_path).unwrap();
    bin.put(admin).unwrap();
    let bin = BinaryTokenStore::open(&bin_path).unwrap();
    assert_eq!(
        bin.get("admin").unwrap().unwrap().scope,
        crate::token::ADMIN_SCOPE
    );
}

#[test]
fn dual_store_writes_both() {
    let dir = tempdir().unwrap();
    let text = Arc::new(TextTokenStore::open(dir.path().join("a.lino")).unwrap());
    let bin = Arc::new(BinaryTokenStore::open(dir.path().join("a.bin")).unwrap());
    let dual = DualTokenStore {
        primary: text.clone(),
        secondary: bin.clone(),
    };
    dual.put(sample_record("a")).unwrap();
    assert_eq!(text.list().unwrap().len(), 1);
    assert_eq!(bin.list().unwrap().len(), 1);
}

#[test]
fn dual_store_concurrent_consumption_is_atomic_and_preserves_formats() {
    const REQUESTS: usize = 32;

    let dir = tempdir().unwrap();
    let store = build_token_store(StoragePolicy::Both, dir.path()).unwrap();
    store.put(sample_record("shared")).unwrap();

    let barrier = Arc::new(Barrier::new(REQUESTS));
    let handles: Vec<_> = (0..REQUESTS)
        .map(|_| {
            let store = Arc::clone(&store);
            let barrier = Arc::clone(&barrier);
            thread::spawn(move || {
                barrier.wait();
                store.try_consume_request("shared")
            })
        })
        .collect();

    for handle in handles {
        assert!(handle.join().unwrap().unwrap());
    }

    let text = TextTokenStore::open(dir.path().join("tokens.lino")).unwrap();
    let binary = BinaryTokenStore::open(dir.path().join("tokens.bin")).unwrap();
    assert_eq!(
        text.get("shared").unwrap().unwrap().used_requests,
        REQUESTS as u64
    );
    assert_eq!(
        binary.get("shared").unwrap().unwrap().used_requests,
        REQUESTS as u64
    );
}

#[test]
fn revoke_marks_record() {
    let s = MemoryTokenStore::new();
    s.put(sample_record("a")).unwrap();
    assert!(s.revoke("a").unwrap());
    assert!(s.get("a").unwrap().unwrap().revoked);
    // second revoke is a no-op
    assert!(!s.revoke("a").unwrap());
    // unknown id returns false
    assert!(!s.revoke("missing").unwrap());
}

#[test]
fn build_token_store_dispatches_correctly() {
    let dir = tempdir().unwrap();
    let mem = build_token_store(StoragePolicy::Memory, dir.path()).unwrap();
    mem.put(sample_record("m")).unwrap();
    assert!(mem.get("m").unwrap().is_some());

    let text = build_token_store(StoragePolicy::Text, dir.path()).unwrap();
    text.put(sample_record("t")).unwrap();
    assert!(dir.path().join("tokens.lino").exists());

    let bin = build_token_store(StoragePolicy::Binary, dir.path()).unwrap();
    bin.put(sample_record("b")).unwrap();
    assert!(dir.path().join("tokens.bin").exists());

    let dual = build_token_store(StoragePolicy::Both, dir.path()).unwrap();
    dual.put(sample_record("d")).unwrap();
    // both files updated
    let text_contents = std::fs::read_to_string(dir.path().join("tokens.lino")).unwrap();
    assert!(
        associative::decode_text(&text_contents)
            .unwrap()
            .iter()
            .any(|record| record.id == "d")
    );
    assert!(
        BinaryTokenStore::open(dir.path().join("tokens.bin"))
            .unwrap()
            .get("d")
            .unwrap()
            .is_some()
    );
}

#[test]
fn independently_opened_text_stores_do_not_lose_updates() {
    let dir = tempdir().unwrap();
    let path = dir.path().join("tokens.lino");
    let first = TextTokenStore::open(&path).unwrap();
    let second = TextTokenStore::open(&path).unwrap();
    first.put(sample_record("first")).unwrap();
    second.put(sample_record("second")).unwrap();

    let reopened = TextTokenStore::open(path).unwrap();
    assert!(reopened.get("first").unwrap().is_some());
    assert!(reopened.get("second").unwrap().is_some());
}

#[test]
fn dual_store_recovers_a_synced_transaction_journal() {
    let dir = tempdir().unwrap();
    let mut record = sample_record("recovered");
    record.revoked = true;
    crate::durable_file::atomic_write_owner_only(
        &dir.path().join("tokens.transaction.json"),
        &serde_json::to_vec(&vec![record]).unwrap(),
    )
    .unwrap();

    let recovered = build_token_store(StoragePolicy::Both, dir.path()).unwrap();
    assert!(recovered.get("recovered").unwrap().unwrap().revoked);
    assert!(!dir.path().join("tokens.transaction.json").exists());
    assert!(
        TextTokenStore::open(dir.path().join("tokens.lino"))
            .unwrap()
            .get("recovered")
            .unwrap()
            .is_some()
    );
    assert!(
        BinaryTokenStore::open(dir.path().join("tokens.bin"))
            .unwrap()
            .get("recovered")
            .unwrap()
            .is_some()
    );
}

#[test]
fn lino_codec_handles_special_chars() {
    let rec = TokenRecord {
        id: "id1".into(),
        label: "with \"quote\" and \\ backslash and\nnewline".into(),
        issued_at: 1,
        expires_at: 2,
        revoked: true,
        account: None,
        max_requests: Some(100),
        used_requests: 7,
        max_tokens: Some(1_000),
        used_tokens: 250,
        rate_limit_per_minute: Some(10),
        rate_window_started_at: 1_700_000_000,
        rate_window_requests: 2,
        scope: crate::token::ADMIN_SCOPE.to_string(),
    };
    let s = associative::encode_text(std::iter::once(&rec));
    let parsed = associative::decode_text(&s).unwrap();
    assert_eq!(parsed.len(), 1);
    assert_eq!(parsed[0], rec);
}
