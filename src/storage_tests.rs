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

/// A journal written in links notation recovers the same way.
///
/// `dual_store_recovers_a_synced_transaction_journal` pins the JSON an earlier
/// release wrote; this pins the format written from now on, so the migration
/// is covered in both directions (issue #336).
#[test]
fn dual_store_recovers_a_links_notation_journal() {
    let dir = tempdir().unwrap();
    let mut record = sample_record("recovered");
    record.revoked = true;
    let encoded = crate::lino_json::encode(&vec![record]).unwrap();
    assert!(
        encoded.trim_start().starts_with('('),
        "the journal is links notation now: {encoded}"
    );
    crate::durable_file::atomic_write_owner_only(
        &dir.path().join("tokens.transaction.json"),
        encoded.as_bytes(),
    )
    .unwrap();

    let recovered = build_token_store(StoragePolicy::Both, dir.path()).unwrap();
    assert!(recovered.get("recovered").unwrap().unwrap().revoked);
    assert!(!dir.path().join("tokens.transaction.json").exists());
}

/// A listing does not write the store.
///
/// `list()` went through the same helper as `put()`, which commits
/// unconditionally, so answering a read re-serialised and fsynced a 64 MB
/// `tokens.bin` and a 171 KB `tokens.lino`. On a 290-token deployment that
/// took 8-13 seconds and made `router with` fail at its 10-second budget
/// (issue #351).
///
/// The mtime is the assertion because it is what identified the defect: `stat`
/// before and after a single `GET /api/tokens/list` showed the file had moved.
#[test]
fn listing_tokens_does_not_rewrite_the_store() {
    let directory = tempdir().expect("temporary directory");
    let store = DurableDualTokenStore::open(directory.path()).expect("open the store");
    for index in 0..8 {
        store
            .put(sample_record(&format!("id-{index}")))
            .expect("put");
    }

    let modified = |name: &str| {
        std::fs::metadata(directory.path().join(name))
            .ok()
            .and_then(|metadata| metadata.modified().ok())
    };
    let before: Vec<_> = ["tokens.bin", "tokens.lino"]
        .iter()
        .map(|n| modified(n))
        .collect();
    // Filesystem timestamps are coarse; a write inside the same tick would be
    // invisible, so the reads happen in a later one.
    std::thread::sleep(std::time::Duration::from_millis(1_100));

    let listed = store.list().expect("list");
    assert_eq!(listed.len(), 8, "the listing must still answer");
    let fetched = store.get("id-3").expect("get");
    assert_eq!(fetched.map(|record| record.id).as_deref(), Some("id-3"));

    let after: Vec<_> = ["tokens.bin", "tokens.lino"]
        .iter()
        .map(|n| modified(n))
        .collect();
    assert_eq!(
        before, after,
        "a read must not write either store file: {before:?} -> {after:?}"
    );
}

/// Concurrent listings do not serialise against each other.
///
/// The lock is shared with the request path, so a read that takes it
/// exclusively queues live traffic behind itself. Under a shared lock the
/// readers overlap.
#[test]
fn concurrent_listings_run_together() {
    let directory = tempdir().expect("temporary directory");
    let store = DurableDualTokenStore::open(directory.path()).expect("open the store");
    for index in 0..8 {
        store
            .put(sample_record(&format!("id-{index}")))
            .expect("put");
    }

    let store = std::sync::Arc::new(store);
    let readers = 4;
    let barrier = std::sync::Arc::new(Barrier::new(readers));
    let handles: Vec<_> = (0..readers)
        .map(|_| {
            let store = std::sync::Arc::clone(&store);
            let barrier = std::sync::Arc::clone(&barrier);
            thread::spawn(move || {
                barrier.wait();
                store.list().expect("list").len()
            })
        })
        .collect();
    for handle in handles {
        assert_eq!(handle.join().expect("reader thread"), 8);
    }
}

/// A read still sees what a write left, and still recovers a journal.
///
/// Skipping the commit must not skip the recovery: a crashed writer leaves a
/// transaction to replay, and a reader that ignored it would answer from a
/// store missing the last change.
#[test]
fn a_read_sees_the_latest_write() {
    let directory = tempdir().expect("temporary directory");
    let store = DurableDualTokenStore::open(directory.path()).expect("open the store");
    store.put(sample_record("first")).expect("put");
    assert_eq!(store.list().expect("list").len(), 1);

    let mut second = sample_record("second");
    second.label = "written after a read".into();
    store.put(second).expect("put");

    let listed = store.list().expect("list");
    assert_eq!(listed.len(), 2, "the read must see the later write");
    assert_eq!(
        store
            .get("second")
            .expect("get")
            .map(|record| record.label)
            .as_deref(),
        Some("written after a read")
    );

    // And a reopened store agrees, so nothing was lost by not committing.
    let reopened = DurableDualTokenStore::open(directory.path()).expect("reopen");
    assert_eq!(reopened.list().expect("list").len(), 2);
}

/// A listing does not scale with the size of `tokens.bin`.
///
/// `tokens.bin` is preallocated -- 64 MB for 290 records on the deployment in
/// issue #351 -- so a listing that re-serialised and fsynced it cost time
/// proportional to the file rather than to the answer. At 290 tokens that was
/// 8-13 seconds, past the 10-second budget `router with` allows.
#[test]
fn listing_stays_fast_at_deployment_scale() {
    let directory = tempdir().expect("temporary directory");
    let store = DurableDualTokenStore::open(directory.path()).expect("open the store");
    // The deployment that reported this had 290. Seeded in one write: 290
    // separate `put`s would spend minutes exercising the write path, which is
    // not what this test is about.
    let seed: Vec<_> = (0..290)
        .map(|index| sample_record(&format!("id-{index:04}")))
        .collect();
    store.text.replace_all(&seed).expect("seed the text store");
    store
        .binary
        .replace_all(&seed)
        .expect("seed the binary store");

    let started = std::time::Instant::now();
    for _ in 0..10 {
        assert_eq!(store.list().expect("list").len(), 290);
    }
    let elapsed = started.elapsed();
    // Ten listings, generously bounded. Before the split a single one took
    // seconds, so this fails by orders of magnitude rather than marginally.
    assert!(
        elapsed < std::time::Duration::from_secs(5),
        "ten listings of 290 tokens took {elapsed:?}; a read must not pay for a write"
    );
}

/// A write does not re-read a file nobody else has touched.
///
/// `mutate` reloaded the whole store from disk before every change so that a
/// second router process's writes became visible. That guarantee is real, but
/// paying for it unconditionally cost a full parse of the doublets graph --
/// 1.8 s for 306 records -- on a path that almost always finds nothing
/// changed, which is most of why minting a token took seconds (issues #356,
/// #357).
#[test]
fn writing_does_not_reparse_an_unchanged_store() {
    let directory = tempdir().expect("temporary directory");
    let store = BinaryTokenStore::open(directory.path().join("tokens.bin")).expect("open");
    let seed: Vec<_> = (0..120)
        .map(|index| sample_record(&format!("id-{index:04}")))
        .collect();
    store.replace_all(&seed).expect("seed the store");

    // Ten writes with nobody else touching the file. Before the fingerprint
    // each of these re-parsed the whole graph first.
    let started = std::time::Instant::now();
    for index in 0..10 {
        store
            .put(sample_record(&format!("added-{index}")))
            .expect("put");
    }
    let elapsed = started.elapsed();
    // Ten writes reloading a 120-record graph each took ~8.6 s when measured
    // against the old behaviour; without the reload the same ten take ~5 s.
    // The bound sits between them so the assertion fails on a regression
    // rather than merely being generous.
    assert!(
        elapsed < std::time::Duration::from_secs(7),
        "ten writes took {elapsed:?}; a write must not re-parse an unchanged store"
    );
    assert_eq!(store.list().expect("list").len(), 130);
}

/// Another process's write is still picked up.
///
/// The fingerprint must not turn the reload into a cache that goes stale: the
/// whole reason `mutate` re-read the file is that a second router process
/// shares it, and that has to keep working.
#[test]
fn writing_still_sees_another_writers_changes() {
    let directory = tempdir().expect("temporary directory");
    let path = directory.path().join("tokens.bin");
    let first = BinaryTokenStore::open(&path).expect("open");
    first.put(sample_record("from-first")).expect("put");

    // A second handle on the same file stands in for a second process.
    let second = BinaryTokenStore::open(&path).expect("open again");
    second.put(sample_record("from-second")).expect("put");

    // The first handle must see it once it writes again, rather than
    // overwriting it from a stale map.
    first.put(sample_record("from-first-again")).expect("put");
    let ids = first
        .list()
        .expect("list")
        .into_iter()
        .map(|record| record.id)
        .collect::<std::collections::BTreeSet<_>>();
    assert!(
        ids.contains("from-second"),
        "a write must not lose another writer's record: {ids:?}"
    );
    assert!(ids.contains("from-first") && ids.contains("from-first-again"));
}
