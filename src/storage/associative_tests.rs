use super::*;
use tempfile::tempdir;

fn sample_record() -> TokenRecord {
    TokenRecord {
        github_repos: Vec::new(),
        id: "id/with spaces".into(),
        label: "label with \"quotes\" and a newline\n".into(),
        issued_at: i64::MIN,
        expires_at: i64::MAX,
        revoked: true,
        ephemeral: false,
        sliding_window_seconds: None,
        account: Some(String::new()),
        max_requests: Some(u64::MAX),
        used_requests: u64::MAX,
        max_tokens: Some(u64::MAX),
        used_tokens: u64::MAX,
        reserved_tokens: u64::MAX,
        rate_limit_per_minute: Some(u64::MAX),
        rate_window_started_at: i64::MAX,
        rate_window_requests: u64::MAX,
        scope: "admin".into(),
        client_kind: Some("codex".into()),
        principal_id: Some("primary".into()),
    }
}

#[test]
fn semantic_reduction_is_lossless() {
    let record = sample_record();
    let mut links = BTreeSet::from([
        SemanticLink::new(STORAGE_FORMAT, FORMAT_VERSION),
        SemanticLink::new(TYPE, TOKEN_RECORD),
        SemanticLink::new(TOKEN_RECORD, SUBTYPE),
        SemanticLink::new(SUBTYPE, VALUE),
    ]);
    links.extend(record_to_links(&record));

    assert_eq!(links_to_records(&links).unwrap(), vec![record]);
}

#[test]
fn official_lino_codec_roundtrip_is_lossless() {
    let record = sample_record();
    let encoded = encode_text(std::iter::once(&record));

    assert_eq!(decode_text(&encoded).unwrap(), vec![record]);
}

#[test]
fn fields_added_in_v0_125_4_are_optional_when_absent() {
    let mut record = sample_record();
    record.client_kind = None;
    record.principal_id = None;
    let encoded = encode_text(std::iter::once(&record));
    let pre_binding = encoded
        .lines()
        .filter(|line| !line.contains("client_kind") && !line.contains("principal_id"))
        .collect::<Vec<_>>()
        .join("\n");

    assert_eq!(decode_text(&pre_binding).unwrap(), vec![record]);
}

#[test]
fn native_doublets_links_network_reopens_across_growth_boundary() {
    let dir = tempdir().unwrap();
    let path = dir.path().join("tokens.bin");
    let mut record = sample_record();
    record.label = "large associative value".repeat(500);
    {
        let mut store = PersistentStore::open(&path).unwrap();
        store.replace(std::iter::once(&record)).unwrap();
    }

    let file = OpenOptions::new()
        .read(true)
        .write(true)
        .open(&path)
        .unwrap();
    let memory = LoadedFileMapped::new(file).unwrap();
    let links_network = unit::Store::<usize, _>::new(memory).unwrap();
    assert!(
        links_network.count() > 8 * 1024,
        "fixture must cross the upstream bootstrap page boundary"
    );
    drop(links_network);

    // Reopened from scratch: what one process wrote in place is what the
    // next one reads, across the growth boundary.
    let mut reopened = PersistentStore::open(&path).unwrap();
    assert_eq!(reopened.records().unwrap(), vec![record.clone()]);

    let mut added = sample_record();
    added.id = "record-added-after-reopen".into();
    added.label = "second large associative value".repeat(500);
    reopened.replace([&record, &added]).unwrap();
    drop(reopened);

    let final_store = PersistentStore::open(&path).unwrap();
    let mut records = final_store.records().unwrap();
    records.sort_by(|left, right| left.id.cmp(&right.id));
    let mut expected = vec![record, added];
    expected.sort_by(|left, right| left.id.cmp(&right.id));
    assert_eq!(records, expected);
}

/// A panic while the replacement is being built is contained before the
/// rename commit point. The authoritative bytes and readable record set stay
/// unchanged, and the failed candidate is removed (issue #557).
#[test]
fn failed_rebuild_preserves_the_previous_store_without_a_temporary() {
    let directory = tempdir().expect("temporary directory");
    let path = directory.path().join("tokens.bin");
    let original = sample_record();
    let mut store = PersistentStore::open(&path).expect("open store");
    store
        .replace(std::iter::once(&original))
        .expect("seed store");
    let authoritative = fs::read(&path).expect("read authoritative bytes");

    let error = store
        .rebuild(|_| panic!("forced capacity failure"))
        .expect_err("the failed candidate must not publish");

    assert!(matches!(error, StorageError::Capacity(_)));
    assert_eq!(
        fs::read(&path).expect("read preserved bytes"),
        authoritative
    );
    assert_eq!(
        store.records().expect("read preserved store"),
        vec![original]
    );
    let leftovers = fs::read_dir(directory.path())
        .expect("list store directory")
        .filter_map(Result::ok)
        .map(|entry| entry.file_name().to_string_lossy().into_owned())
        .filter(|name| name.ends_with(".rebuild"))
        .collect::<Vec<_>>();
    assert!(
        leftovers.is_empty(),
        "temporary rebuilds remain: {leftovers:?}"
    );
}
