use super::*;
use std::sync::Barrier;
use std::thread;
use tempfile::tempdir;

fn sample_record(id: &str) -> TokenRecord {
    TokenRecord {
        github_repos: Vec::new(),
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
        reserved_tokens: 0,
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
        github_repos: Vec::new(),
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
        reserved_tokens: 0,
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

/// Reservations are enforced inside the same locked read-modify-write that
/// counts requests, so concurrent admissions cannot overshoot (issue #195).
#[test]
fn reservations_bound_concurrent_admissions() {
    use std::sync::Arc;
    use std::thread;

    let store: Arc<dyn TokenStore> = Arc::new(MemoryTokenStore::new());
    let mut record = sample_record("concurrent");
    record.max_tokens = Some(100);
    store.put(record).expect("put");

    // Eight threads each try to reserve 40; only two can fit under 100.
    let admitted = Arc::new(std::sync::atomic::AtomicUsize::new(0));
    let mut handles = Vec::new();
    for _ in 0..8 {
        let store = Arc::clone(&store);
        let admitted = Arc::clone(&admitted);
        handles.push(thread::spawn(move || {
            if store
                .try_admit_request_reserving("concurrent", 0, 40)
                .expect("admit")
                == RequestAdmission::Admitted
            {
                admitted.fetch_add(1, std::sync::atomic::Ordering::SeqCst);
            }
        }));
    }
    for handle in handles {
        handle.join().expect("join");
    }

    assert_eq!(
        admitted.load(std::sync::atomic::Ordering::SeqCst),
        2,
        "only the reservations that fit may be admitted"
    );
    let stored = store.get("concurrent").expect("get").expect("record");
    assert_eq!(stored.reserved_tokens, 80);
    assert!(stored.used_tokens + stored.reserved_tokens <= 100);
}

#[test]
fn settlement_releases_the_reservation_and_records_real_usage() {
    let store: Arc<dyn TokenStore> = Arc::new(MemoryTokenStore::new());
    let mut record = sample_record("settle");
    record.max_tokens = Some(1_000);
    store.put(record).expect("put");

    assert_eq!(
        store.try_admit_request_reserving("settle", 0, 500).unwrap(),
        RequestAdmission::Admitted
    );
    store
        .settle_token_usage("settle", 500, 120)
        .expect("settle");

    let stored = store.get("settle").expect("get").expect("record");
    assert_eq!(stored.reserved_tokens, 0);
    assert_eq!(stored.used_tokens, 120);
}

#[test]
fn stale_reservations_are_cleared_on_demand() {
    let store: Arc<dyn TokenStore> = Arc::new(MemoryTokenStore::new());
    let mut record = sample_record("stale");
    record.max_tokens = Some(100);
    store.put(record).expect("put");

    store
        .try_admit_request_reserving("stale", 0, 100)
        .expect("admit");
    // The budget is fully reserved, so nothing more fits.
    assert_eq!(
        store.try_admit_request_reserving("stale", 0, 1).unwrap(),
        RequestAdmission::TokenLimitExceeded
    );

    assert_eq!(store.release_stale_reservations().expect("release"), 1);
    assert_eq!(
        store.try_admit_request_reserving("stale", 0, 100).unwrap(),
        RequestAdmission::Admitted
    );
    // A second sweep has nothing left to clear.
    store.release_stale_reservations().expect("release");
}

/// A request declaring no output budget is still refused once the cap is spent.
#[test]
fn an_exhausted_budget_rejects_even_a_zero_reservation() {
    let store: Arc<dyn TokenStore> = Arc::new(MemoryTokenStore::new());
    let mut record = sample_record("spent");
    record.max_tokens = Some(10);
    record.used_tokens = 10;
    store.put(record).expect("put");

    assert_eq!(
        store.try_admit_request_reserving("spent", 0, 0).unwrap(),
        RequestAdmission::TokenLimitExceeded
    );
}

/// A repository scope survives a store round-trip, so a scoped token does not
/// quietly widen to the whole account across a restart (issue #262).
#[test]
fn a_repository_scope_survives_a_store_round_trip() {
    let directory = tempfile::tempdir().expect("data dir");
    let store = build_token_store(StoragePolicy::Text, directory.path()).expect("open the store");
    let mut record = sample_record("scoped");
    record.github_repos = vec!["acme/demo".to_string(), "acme/other".to_string()];
    store.put(record).expect("persist");

    let reopened =
        build_token_store(StoragePolicy::Text, directory.path()).expect("reopen the store");
    let loaded = reopened.get("scoped").expect("read").expect("present");

    assert_eq!(
        loaded.github_repos,
        vec!["acme/demo".to_string(), "acme/other".to_string()]
    );
}

/// A record written before the field existed loads as unrestricted, so an
/// existing store keeps working and its tokens keep the access they had.
#[test]
fn a_record_without_the_field_loads_as_unrestricted() {
    let directory = tempfile::tempdir().expect("data dir");
    let store = build_token_store(StoragePolicy::Text, directory.path()).expect("open the store");
    let record = sample_record("legacy");
    assert!(record.github_repos.is_empty());
    store.put(record).expect("persist");

    let reopened =
        build_token_store(StoragePolicy::Text, directory.path()).expect("reopen the store");

    assert!(
        reopened
            .get("legacy")
            .expect("read")
            .expect("present")
            .github_repos
            .is_empty()
    );
}
