use super::*;

fn record(id: &str) -> TokenRecord {
    serde_json::from_value(serde_json::json!({"id":id,"label":"private","issued_at":1,"expires_at":4_102_444_800_i64,"revoked":false})).unwrap()
}
fn root() -> tempfile::TempDir {
    let root = tempfile::tempdir().unwrap();
    fs::create_dir_all(root.path().join("data/requests/one")).unwrap();
    fs::write(
        root.path().join("data/requests/one/requests.lino"),
        b"old history",
    )
    .unwrap();
    fs::write(
        root.path().join("data/requests/one/oauth_creds.json"),
        b"do-not-copy",
    )
    .unwrap();
    fs::create_dir_all(root.path().join("credentials")).unwrap();
    fs::write(
        root.path().join("credentials/.credentials.json"),
        b"rotating-secret",
    )
    .unwrap();
    root
}

#[test]
fn additive_and_replacement_restore_keep_separate_oauth_authority() {
    let root = root();
    let snapshot = capture(root.path(), &[record("old")], "secret").unwrap();
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt as _;
        for path in [root.path().join(".state-backups"), snapshot.clone()] {
            assert_eq!(
                fs::metadata(path).unwrap().permissions().mode() & 0o777,
                0o700
            );
        }
        for name in ["tokens.lino", "tokens.json", "manifest.json"] {
            assert_eq!(
                fs::metadata(snapshot.join(name))
                    .unwrap()
                    .permissions()
                    .mode()
                    & 0o777,
                0o600
            );
        }
    }
    assert!(!snapshot.join("credentials").exists());
    assert!(!snapshot.join("requests/one/oauth_creds.json").exists());
    let data = root.path().join("data");
    let store = build_token_store(StoragePolicy::Both, &data).unwrap();
    let mut changed = record("old");
    changed.revoked = true;
    store.put(changed).unwrap();
    store.put(record("new")).unwrap();
    drop(store);
    fs::write(data.join("requests/one/requests.lino"), b"new history").unwrap();
    restore(root.path(), &snapshot, "secret", false).unwrap();
    let store = build_token_store_read_only(StoragePolicy::Both, &data).unwrap();
    assert!(store.get("old").unwrap().unwrap().revoked);
    assert!(store.get("new").unwrap().is_some());
    assert_eq!(
        fs::read(data.join("requests/one/requests.lino")).unwrap(),
        b"new history"
    );
    drop(store);
    restore(root.path(), &snapshot, "secret", true).unwrap();
    let store = build_token_store_read_only(StoragePolicy::Both, &data).unwrap();
    assert!(!store.get("old").unwrap().unwrap().revoked);
    assert!(store.get("new").unwrap().is_none());
    assert_eq!(
        fs::read(data.join("requests/one/requests.lino")).unwrap(),
        b"old history"
    );
    assert_eq!(
        fs::read(root.path().join("credentials/.credentials.json")).unwrap(),
        b"rotating-secret"
    );
}

#[test]
fn corrupt_checkpoint_and_changed_secret_refuse_before_data_writes() {
    let root = root();
    let snapshot = capture(root.path(), &[record("one")], "secret").unwrap();
    let before = fs::read(root.path().join("data/requests/one/requests.lino")).unwrap();
    assert!(restore(root.path(), &snapshot, "changed", true).is_err());
    fs::write(snapshot.join("requests/one/requests.lino"), b"tampered").unwrap();
    assert!(restore(root.path(), &snapshot, "secret", true).is_err());
    assert_eq!(
        fs::read(root.path().join("data/requests/one/requests.lino")).unwrap(),
        before
    );
    assert!(!root.path().join("data/tokens.lino").exists());
}

#[test]
fn replacement_with_an_empty_inventory_cannot_revive_a_text_projection() {
    let root = root();
    let snapshot = capture(root.path(), &[], "secret").unwrap();
    let data = root.path().join("data");
    let store = build_token_store(StoragePolicy::Both, &data).unwrap();
    store.put(record("created-later")).unwrap();
    drop(store);
    restore(root.path(), &snapshot, "secret", true).unwrap();
    assert!(
        build_token_store_read_only(StoragePolicy::Both, &data)
            .unwrap()
            .list()
            .unwrap()
            .is_empty()
    );
}

#[test]
fn nested_checkpoint_paths_use_portable_manifest_keys_and_restore() {
    let root = root();
    let relative = Path::new("requests").join("one").join("requests.lino");
    let snapshot = capture(root.path(), &[], "secret").unwrap();
    let manifest: Manifest =
        serde_json::from_slice(&fs::read(snapshot.join("manifest.json")).unwrap()).unwrap();
    assert_eq!(
        manifest.files.get("requests/one/requests.lino"),
        Some(&hex(b"old history"))
    );
    assert!(manifest.files.keys().all(|key| !key.contains('\\')));
    fs::remove_file(root.path().join("data").join(&relative)).unwrap();
    restore(root.path(), &snapshot, "secret", false).unwrap();
    assert_eq!(
        fs::read(root.path().join("data").join(relative)).unwrap(),
        b"old history"
    );
}

#[test]
fn unsafe_manifest_paths_and_missing_tokens_refuse_before_writes() {
    let root = root();
    let snapshot = capture(root.path(), &[record("one")], "secret").unwrap();
    let manifest_path = snapshot.join("manifest.json");
    let original: serde_json::Value =
        serde_json::from_slice(&fs::read(&manifest_path).unwrap()).unwrap();
    for invalid in [
        "../credentials/.credentials.json",
        "requests/../providers.lenv",
        "requests/oauth_creds.json",
        "/tokens.json",
    ] {
        let mut manifest = original.clone();
        manifest["files"][invalid] = serde_json::json!("invalid");
        fs::write(&manifest_path, manifest.to_string()).unwrap();
        assert!(restore(root.path(), &snapshot, "secret", true).is_err());
    }
    let mut manifest = original;
    manifest["files"]
        .as_object_mut()
        .unwrap()
        .remove("tokens.json");
    fs::write(&manifest_path, manifest.to_string()).unwrap();
    assert!(restore(root.path(), &snapshot, "secret", true).is_err());
    assert_eq!(
        fs::read(root.path().join("data/requests/one/requests.lino")).unwrap(),
        b"old history"
    );
    assert!(!root.path().join("data/tokens.lino").exists());
}

#[test]
fn capture_refuses_finite_byte_depth_and_deadline_budgets() {
    let root = root();
    let destination = tempfile::tempdir().unwrap();
    let mut manifest = Manifest {
        schema: SCHEMA.into(),
        signing_secret_sha256: String::new(),
        files: BTreeMap::new(),
        excluded: Vec::new(),
    };
    let source = root.path().join("data/requests/one/requests.lino");
    let relative = Path::new("requests/one/requests.lino");
    let mut remaining = 1;
    assert!(
        copy_tree(
            &source,
            relative,
            destination.path(),
            &mut manifest,
            &mut remaining,
            Instant::now() + Duration::from_secs(1)
        )
        .is_err()
    );
    let mut remaining = LIMIT;
    assert!(
        copy_tree(
            &source,
            relative,
            destination.path(),
            &mut manifest,
            &mut remaining,
            Instant::now()
        )
        .is_err()
    );
    let deep = Path::new("requests").join(vec!["one"; 33].join("/"));
    assert!(
        copy_tree(
            &source,
            &deep,
            destination.path(),
            &mut manifest,
            &mut remaining,
            Instant::now() + Duration::from_secs(1)
        )
        .is_err()
    );
}

#[cfg(unix)]
#[test]
fn symlinked_state_never_becomes_a_credential_snapshot_or_restore_target() {
    use std::os::unix::fs::symlink;
    let root = root();
    symlink(
        root.path().join("credentials/.credentials.json"),
        root.path().join("data/requests/one/link"),
    )
    .unwrap();
    assert!(capture(root.path(), &[], "secret").is_err());
    fs::remove_file(root.path().join("data/requests/one/link")).unwrap();
    let snapshot = capture(root.path(), &[], "secret").unwrap();
    fs::remove_file(root.path().join("data/requests/one/requests.lino")).unwrap();
    symlink(
        root.path().join("credentials/.credentials.json"),
        root.path().join("data/requests/one/requests.lino"),
    )
    .unwrap();
    assert!(restore(root.path(), &snapshot, "secret", true).is_err());
    assert_eq!(
        fs::read(root.path().join("credentials/.credentials.json")).unwrap(),
        b"rotating-secret"
    );
}

#[cfg(unix)]
#[test]
fn empty_inventory_restore_checks_its_text_destination_and_snapshot_root() {
    use std::os::unix::fs::symlink;
    let root = root();
    let snapshot = capture(root.path(), &[], "secret").unwrap();
    let credential = root.path().join("credentials/.credentials.json");
    symlink(&credential, root.path().join("data/tokens.lino")).unwrap();
    assert!(restore(root.path(), &snapshot, "secret", true).is_err());
    assert_eq!(fs::read(&credential).unwrap(), b"rotating-secret");
    fs::remove_file(root.path().join("data/tokens.lino")).unwrap();
    let alias = root.path().join("backup-alias");
    symlink(snapshot, &alias).unwrap();
    assert!(restore(root.path(), &alias, "secret", true).is_err());
    assert!(!root.path().join("data/tokens.lino").exists());
}
