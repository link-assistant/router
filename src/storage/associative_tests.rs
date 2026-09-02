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
    let reopened = PersistentStore::open(&path).unwrap();
    assert_eq!(reopened.records().unwrap(), vec![record]);
}
