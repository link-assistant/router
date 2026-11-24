use super::*;

fn record(id: &str) -> TokenRecord {
    serde_json::from_value(serde_json::json!({"id":id,"label":"private","issued_at":1,"expires_at":4_102_444_800_i64,"revoked":false})).unwrap()
}
fn root() -> tempfile::TempDir {
    let root = tempfile::tempdir().unwrap();
    fs::create_dir_all(root.path().join("data/projects/one")).unwrap();
    fs::write(
        root.path().join("data/projects/one/project.lino"),
        b"old history",
    )
    .unwrap();
    fs::write(
        root.path().join("data/projects/one/oauth_creds.json"),
        b"do-not-copy",
    )
    .unwrap();
    fs::create_dir_all(root.path().join("data/requests/one")).unwrap();
    fs::write(
        root.path().join("data/requests/one/requests.lino"),
        b"request log",
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
    assert!(!snapshot.join("projects/one/oauth_creds.json").exists());
    let data = root.path().join("data");
    let store = build_token_store(StoragePolicy::Both, &data).unwrap();
    let mut changed = record("old");
    changed.revoked = true;
    store.put(changed).unwrap();
    store.put(record("new")).unwrap();
    drop(store);
    fs::write(data.join("projects/one/project.lino"), b"new history").unwrap();
    restore(root.path(), &snapshot, "secret", false).unwrap();
    let store = build_token_store_read_only(StoragePolicy::Both, &data).unwrap();
    assert!(store.get("old").unwrap().unwrap().revoked);
    assert!(store.get("new").unwrap().is_some());
    assert_eq!(
        fs::read(data.join("projects/one/project.lino")).unwrap(),
        b"new history"
    );
    drop(store);
    restore(root.path(), &snapshot, "secret", true).unwrap();
    let store = build_token_store_read_only(StoragePolicy::Both, &data).unwrap();
    assert!(!store.get("old").unwrap().unwrap().revoked);
    assert!(store.get("new").unwrap().is_none());
    assert_eq!(
        fs::read(data.join("projects/one/project.lino")).unwrap(),
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
    let before = fs::read(root.path().join("data/projects/one/project.lino")).unwrap();
    assert!(restore(root.path(), &snapshot, "changed", true).is_err());
    fs::write(snapshot.join("projects/one/project.lino"), b"tampered").unwrap();
    assert!(restore(root.path(), &snapshot, "secret", true).is_err());
    assert_eq!(
        fs::read(root.path().join("data/projects/one/project.lino")).unwrap(),
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
    let relative = Path::new("projects").join("one").join("project.lino");
    let snapshot = capture(root.path(), &[], "secret").unwrap();
    let manifest: Manifest =
        serde_json::from_slice(&fs::read(snapshot.join("manifest.json")).unwrap()).unwrap();
    assert_eq!(
        manifest.files.get("projects/one/project.lino"),
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
        fs::read(root.path().join("data/projects/one/project.lino")).unwrap(),
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
    let source = root.path().join("data/projects/one/project.lino");
    let relative = Path::new("projects/one/project.lino");
    let mut remaining = 1;
    assert!(
        copy_tree(
            &source,
            relative,
            Some(destination.path()),
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
            Some(destination.path()),
            &mut manifest,
            &mut remaining,
            Instant::now()
        )
        .is_err()
    );
    let deep = Path::new("projects").join(vec!["one"; 33].join("/"));
    assert!(
        copy_tree(
            &source,
            &deep,
            Some(destination.path()),
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
        root.path().join("data/projects/one/link"),
    )
    .unwrap();
    assert!(capture(root.path(), &[], "secret").is_err());
    fs::remove_file(root.path().join("data/projects/one/link")).unwrap();
    let snapshot = capture(root.path(), &[], "secret").unwrap();
    fs::remove_file(root.path().join("data/projects/one/project.lino")).unwrap();
    symlink(
        root.path().join("credentials/.credentials.json"),
        root.path().join("data/projects/one/project.lino"),
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

#[test]
fn request_logs_beyond_the_budget_stay_in_place_and_never_block() {
    let root = root();
    // Sparse: larger than the whole budget without writing its bytes.
    fs::File::create(root.path().join("data/requests/one/requests.lino"))
        .unwrap()
        .set_len(LIMIT + 1)
        .unwrap();
    assert!(checkpoint_status(root.path()).is_ok());
    let snapshot = capture(root.path(), &[record("one")], "secret").unwrap();
    assert!(!snapshot.join("requests").exists());
    let manifest: Manifest =
        serde_json::from_slice(&fs::read(snapshot.join("manifest.json")).unwrap()).unwrap();
    assert!(
        manifest
            .files
            .keys()
            .all(|key| !key.starts_with("requests"))
    );
    assert!(
        manifest
            .excluded
            .iter()
            .any(|item| item.starts_with("requests"))
    );
    restore(root.path(), &snapshot, "secret", true).unwrap();
    assert_eq!(
        fs::metadata(root.path().join("data/requests/one/requests.lino"))
            .unwrap()
            .len(),
        LIMIT + 1
    );
}

#[test]
fn an_oversized_covered_file_is_the_same_blocker_in_status_and_capture() {
    let root = root();
    let oversized = root.path().join("data/sessions/huge.lino");
    fs::create_dir_all(oversized.parent().unwrap()).unwrap();
    fs::File::create(&oversized)
        .unwrap()
        .set_len(LIMIT + 1)
        .unwrap();
    let predicted = checkpoint_status(root.path()).unwrap_err();
    let actual = checkpoint_remedy(&capture(root.path(), &[], "secret").unwrap_err());
    assert_eq!(predicted, actual);
    let path = root
        .path()
        .canonicalize()
        .unwrap()
        .join("data/sessions/huge.lino");
    assert!(
        predicted.contains(&format!("256 MiB budget at {}", path.display())),
        "{predicted}"
    );
    assert!(
        predicted.contains(&format!("({} bytes", LIMIT + 1)),
        "{predicted}"
    );
}

#[cfg(unix)]
#[test]
fn refusals_name_their_reason_and_path() {
    use std::os::unix::fs::symlink;
    let root = root();
    let link = root.path().join("data/projects/one/link");
    symlink(root.path().join("credentials/.credentials.json"), &link).unwrap();
    let reason = capture(root.path(), &[], "secret").unwrap_err().to_string();
    assert!(reason.contains("symlink"), "{reason}");
    assert!(reason.ends_with("projects/one/link"), "{reason}");
    assert_eq!(
        checkpoint_status(root.path()).unwrap_err(),
        checkpoint_remedy(&io::Error::other(reason))
    );
}

/// A root reached through a symlink, as macOS reaches `/private/var` through
/// `/var`, must be named the same way by `--status` and by the real run.
#[cfg(unix)]
#[test]
fn status_and_capture_name_the_same_path_for_a_symlinked_root() {
    use std::os::unix::fs::symlink;
    let root = root();
    let oversized = root.path().join("data/sessions/huge.lino");
    fs::create_dir_all(oversized.parent().unwrap()).unwrap();
    fs::File::create(&oversized)
        .unwrap()
        .set_len(LIMIT + 1)
        .unwrap();
    let alias_parent = tempfile::tempdir().unwrap();
    let alias = alias_parent.path().join("alias");
    symlink(root.path(), &alias).unwrap();
    let predicted = checkpoint_status(&alias).unwrap_err();
    let actual = checkpoint_remedy(&capture(&alias, &[], "secret").unwrap_err());
    assert_eq!(predicted, actual);
}
