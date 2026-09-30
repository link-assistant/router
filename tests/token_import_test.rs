//! `router tokens import` (issue #644): copy token records back after a
//! rollback, data-root switch or restore without altering any existing one.

use std::fs;

use link_assistant_router::config::StoragePolicy;
use link_assistant_router::storage::{
    MemoryTokenStore, TokenRecord, TokenStore, build_token_store,
};
use link_assistant_router::token_import::{
    Conflict, ImportMode, ImportOptions, import, read_source, render,
};
use tempfile::tempdir;

fn record(id: &str) -> TokenRecord {
    TokenRecord {
        github_repos: vec!["owner/repo".into()],
        id: id.into(),
        label: "run".into(),
        issued_at: 1_700_000_000,
        expires_at: 4_000_000_000,
        revoked: false,
        ephemeral: true,
        run_lease_expires_at: Some(3_900_000_000),
        sliding_window_seconds: Some(86_400),
        account: Some("primary".into()),
        max_requests: Some(100),
        used_requests: 7,
        max_tokens: Some(1_000_000),
        used_tokens: 12_345,
        reserved_tokens: 99,
        rate_limit_per_minute: Some(30),
        rate_window_started_at: 1_700_000_100,
        rate_window_requests: 3,
        scope: "run".into(),
        client_kind: Some("claude".into()),
        principal_id: Some("alice".into()),
        model_policy: link_assistant_router::model_contract::ModelAccessPolicy::default(),
    }
}

const fn merge<'a>() -> ImportOptions<'a> {
    ImportOptions {
        mode: ImportMode::MergeMissing,
        dry_run: false,
        ids: &[],
        backup_directory: None,
    }
}

#[test]
fn a_missing_record_is_copied_with_every_field_and_existing_ones_are_untouched() {
    let target = MemoryTokenStore::new();
    let mut kept = record("kept");
    kept.max_requests = Some(1);
    target.put(kept.clone()).unwrap();
    let mut differing = record("kept");
    differing.max_requests = Some(1_000);

    let report = import(&target, vec![record("run"), differing], merge()).unwrap();

    assert_eq!(report.added, ["run"]);
    assert_eq!(
        report.conflicts,
        [Conflict {
            id: "kept".into(),
            fields: vec!["max_requests".into()]
        }]
    );
    assert_eq!(target.get("run").unwrap(), Some(record("run")));
    assert_eq!(target.get("kept").unwrap(), Some(kept));
}

#[test]
fn a_second_import_changes_nothing_and_a_dry_run_writes_nothing() {
    let target = MemoryTokenStore::new();
    let dry = ImportOptions {
        dry_run: true,
        ..merge()
    };
    let planned = import(&target, vec![record("run")], dry).unwrap();
    assert_eq!(planned.added, ["run"]);
    assert!(target.list().unwrap().is_empty());

    import(&target, vec![record("run")], merge()).unwrap();
    let again = import(&target, vec![record("run")], merge()).unwrap();
    assert!(!again.writes());
    assert_eq!(again.unchanged, ["run"]);
}

#[test]
fn replace_never_revives_a_revoked_record_nor_lowers_usage_and_backs_up_first() {
    let backups = tempdir().unwrap();
    let target = MemoryTokenStore::new();
    let mut revoked = record("run");
    revoked.revoked = true;
    revoked.used_requests = 50;
    target.put(revoked).unwrap();
    let mut incoming = record("run");
    incoming.label = "renamed".into();

    let options = ImportOptions {
        mode: ImportMode::Replace,
        backup_directory: Some(backups.path()),
        ..merge()
    };
    let report = import(&target, vec![incoming], options).unwrap();

    let stored = target.get("run").unwrap().unwrap();
    assert!(stored.revoked);
    assert_eq!(stored.used_requests, 50);
    assert_eq!(stored.label, "renamed");
    assert_eq!(report.kept_revoked, ["run"]);
    let backup = report.backup.expect("replace takes a backup");
    let saved: Vec<TokenRecord> = serde_json::from_slice(&fs::read(backup).unwrap()).unwrap();
    assert_eq!(saved[0].label, "run");
}

#[test]
fn merge_mode_never_revives_a_revoked_record_either() {
    let target = MemoryTokenStore::new();
    let mut revoked = record("run");
    revoked.revoked = true;
    target.put(revoked.clone()).unwrap();

    let report = import(&target, vec![record("run")], merge()).unwrap();

    assert_eq!(report.conflicts[0].fields, ["revoked"]);
    assert_eq!(target.get("run").unwrap(), Some(revoked));
}

#[test]
fn an_id_filter_imports_only_the_named_records_and_reports_unknown_ones() {
    let target = MemoryTokenStore::new();
    let ids = ["run".to_string(), "absent".to_string()];
    let options = ImportOptions {
        ids: &ids,
        ..merge()
    };

    let report = import(&target, vec![record("run"), record("other")], options).unwrap();

    assert_eq!(report.added, ["run"]);
    assert_eq!(report.missing_from_source, ["absent"]);
    assert!(target.get("other").unwrap().is_none());
}

#[test]
fn every_source_shape_reads_the_same_records() {
    for policy in [
        StoragePolicy::Text,
        StoragePolicy::Binary,
        StoragePolicy::Both,
    ] {
        let root = tempdir().unwrap();
        let data = root.path().join("data");
        fs::create_dir_all(&data).unwrap();
        build_token_store(policy, &data)
            .unwrap()
            .put(record("run"))
            .unwrap();

        assert_eq!(
            read_source(root.path()).unwrap(),
            [record("run")],
            "{policy:?} root"
        );
        assert_eq!(
            read_source(&data).unwrap(),
            [record("run")],
            "{policy:?} data"
        );
        for name in ["tokens.lino", "tokens.bin"] {
            let file = data.join(name);
            if file.is_file() {
                let renamed = root.path().join(format!("copy.{}", &name[7..]));
                fs::copy(&file, &renamed).unwrap();
                assert_eq!(read_source(&renamed).unwrap(), [record("run")], "{name}");
            }
        }
    }

    let checkpoint = tempdir().unwrap();
    let json = checkpoint.path().join("tokens.json");
    fs::write(&json, serde_json::to_vec(&[record("run")]).unwrap()).unwrap();
    assert_eq!(read_source(checkpoint.path()).unwrap(), [record("run")]);
    assert_eq!(read_source(&json).unwrap(), [record("run")]);
}

#[test]
fn an_empty_or_unknown_source_is_refused() {
    let empty = tempdir().unwrap();
    assert!(read_source(empty.path()).unwrap_err().contains("holds no"));
    let other = empty.path().join("notes.txt");
    fs::write(&other, "x").unwrap();
    assert!(read_source(&other).is_err());
    assert!(read_source(&empty.path().join("missing")).is_err());
}

#[test]
fn the_rendered_report_names_ids_and_fields_only() {
    let target = MemoryTokenStore::new();
    let mut kept = record("kept");
    kept.expires_at = 1;
    target.put(kept).unwrap();
    let report = import(&target, vec![record("run"), record("kept")], merge()).unwrap();
    let text = render(&report);
    assert!(text.contains("+ run"));
    assert!(text.contains("kept differs in expires_at"));
}

#[test]
fn records_issued_while_an_import_runs_are_all_kept() {
    let data = tempdir().unwrap();
    let target = build_token_store(StoragePolicy::Text, data.path()).unwrap();
    let source: Vec<TokenRecord> = (0..20).map(|n| record(&format!("imported-{n}"))).collect();
    std::thread::scope(|scope| {
        let writer = scope.spawn(|| {
            let other = build_token_store(StoragePolicy::Text, data.path()).unwrap();
            for n in 0..20 {
                other.put(record(&format!("issued-{n}"))).unwrap();
            }
        });
        import(target.as_ref(), source, merge()).unwrap();
        writer.join().unwrap();
    });
    let reopened = build_token_store(StoragePolicy::Text, data.path()).unwrap();
    assert_eq!(reopened.list().unwrap().len(), 40);
}

#[test]
fn a_binary_target_receives_byte_equal_records() {
    let data = tempdir().unwrap();
    let target = build_token_store(StoragePolicy::Binary, data.path()).unwrap();
    import(target.as_ref(), vec![record("run")], merge()).unwrap();
    let reopened = build_token_store(StoragePolicy::Binary, data.path()).unwrap();
    assert_eq!(reopened.get("run").unwrap(), Some(record("run")));
}

fn router_cli(data: &std::path::Path, arguments: &[&str]) -> std::process::Output {
    std::process::Command::new(env!("CARGO_BIN_EXE_link-assistant-router"))
        .args(arguments)
        .env("TOKEN_SECRET", "import-test-secret")
        .env("STORAGE_POLICY", "text")
        .env("DATA_DIR", data)
        .env("NO_COLOR", "1")
        .arg("--local")
        .output()
        .expect("the router binary runs")
}

#[test]
fn the_cli_merges_by_default_replaces_only_when_asked_and_refuses_unknown_ids() {
    let old_root = tempdir().unwrap();
    let old_data = old_root.path().join("data");
    fs::create_dir_all(&old_data).unwrap();
    let old = build_token_store(StoragePolicy::Text, &old_data).unwrap();
    old.put(record("run")).unwrap();
    let mut widened = record("kept");
    widened.max_requests = None;
    old.put(widened).unwrap();

    let serving = tempdir().unwrap();
    let target = build_token_store(StoragePolicy::Text, serving.path()).unwrap();
    target.put(record("kept")).unwrap();
    let from = old_root.path().to_str().unwrap();

    let dry = router_cli(
        serving.path(),
        &["tokens", "import", "--from", from, "--dry-run", "--json"],
    );
    let report: serde_json::Value = serde_json::from_slice(&dry.stdout).unwrap();
    assert_eq!(report["added"], serde_json::json!(["run"]));
    assert_eq!(
        dry.status.code(),
        Some(2),
        "a conflict is left alone and signalled"
    );
    assert!(target.get("run").unwrap().is_none());

    let merged = router_cli(serving.path(), &["tokens", "import", "--from", from]);
    let text = String::from_utf8_lossy(&merged.stdout);
    assert!(text.contains("kept differs in max_requests"), "{text}");
    assert_eq!(target.get("run").unwrap(), Some(record("run")));
    assert_eq!(target.get("kept").unwrap(), Some(record("kept")));

    let missing = router_cli(
        serving.path(),
        &["tokens", "import", "--from", from, "--id", "nope"],
    );
    assert_eq!(missing.status.code(), Some(2));

    let replaced = router_cli(
        serving.path(),
        &["tokens", "import", "--from", from, "--replace"],
    );
    assert!(
        replaced.status.success(),
        "{}",
        String::from_utf8_lossy(&replaced.stderr)
    );
    assert_eq!(target.get("kept").unwrap().unwrap().max_requests, None);
    assert_eq!(
        fs::read_dir(serving.path().join("token-import-backups"))
            .unwrap()
            .count(),
        1
    );
}

#[test]
fn an_imported_record_does_not_make_a_token_signed_with_another_secret_valid() {
    use link_assistant_router::token::TokenManager;
    let issuer_store = tempdir().unwrap();
    let issuer = TokenManager::with_store(
        "the-old-secret",
        build_token_store(StoragePolicy::Text, issuer_store.path()).unwrap(),
    );
    let token = issuer.issue_token(1, "run").unwrap();

    let serving = tempdir().unwrap();
    let store = build_token_store(StoragePolicy::Text, serving.path()).unwrap();
    import(
        store.as_ref(),
        read_source(issuer_store.path()).unwrap(),
        merge(),
    )
    .unwrap();
    let manager = TokenManager::with_store("a-new-secret", store);
    assert!(manager.validate_token(&token).is_err());
}
