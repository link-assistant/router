use super::*;
use crate::clients::TokenSource;

#[test]
fn rollback_ids_are_opaque_names_not_paths() {
    assert!(validate_id("abc-DEF_123").is_ok());
    assert!(validate_id("../escape").is_err());
    assert!(validate_id("a/b").is_err());
    assert!(validate_id("").is_err());
}

#[test]
fn every_setup_write_is_rolled_back_for_every_supported_client() {
    let clients = [
        ClientKind::Codex,
        ClientKind::ClaudeCode,
        ClientKind::GrokCli,
        ClientKind::Opencode,
        ClientKind::QwenCode,
        ClientKind::Agent,
    ];
    for client in clients {
        for stage in ["config", "environment", "metadata", "undo-state"] {
            let home = tempfile::tempdir().expect("home");
            let manager = ClientManager::isolated(home.path());
            let credential = ManagedCredential {
                client: client.to_string(),
                source: TokenSource::Minted,
                token_id: Some("candidate-id".into()),
                label: Some(format!("client-{client}")),
                issued_at: Some(1),
                router: Some("http://router.test:8080".into()),
                principal_id: Some("primary".into()),
                config_sha256: None,
            };
            FAIL_AFTER_WRITE.set(Some(stage));
            let result = manager.apply_repair(
                client,
                "http://router.test:8080",
                "la_sk_candidate",
                &credential,
                &[RouterModel {
                    id: "future-model".into(),
                    owned_by: "future-provider".into(),
                }],
            );
            FAIL_AFTER_WRITE.set(None);
            let error = result.expect_err("the injected write must fail");
            assert!(
                error.to_string().contains(stage),
                "{client}/{stage}: {error}"
            );
            for path in manager.repair_paths(client) {
                assert!(
                    !path.exists(),
                    "{client}/{stage} left a transaction target at {}",
                    path.display()
                );
            }
        }
    }
}

#[test]
fn every_configure_write_is_rolled_back_for_every_file_configurable_client() {
    let clients = [
        ClientKind::Codex,
        ClientKind::ClaudeCode,
        ClientKind::Opencode,
        ClientKind::QwenCode,
        ClientKind::Agent,
    ];
    for client in clients {
        for stage in ["config", "environment", "metadata"] {
            let home = tempfile::tempdir().expect("home");
            let manager = ClientManager::isolated(home.path());
            let credential = ManagedCredential {
                client: client.to_string(),
                source: TokenSource::Minted,
                token_id: Some("candidate-id".into()),
                label: Some(format!("configure-{client}")),
                issued_at: Some(1),
                router: Some("http://router.test:8080".into()),
                principal_id: Some("primary".into()),
                config_sha256: None,
            };
            FAIL_AFTER_WRITE.set(Some(stage));
            let result = manager.apply_configure_transaction(
                client,
                "http://router.test:8080",
                "la_sk_candidate",
                &credential,
                &[RouterModel {
                    id: "future-model".into(),
                    owned_by: "future-provider".into(),
                }],
            );
            FAIL_AFTER_WRITE.set(None);
            let error = result.expect_err("the injected write must fail");
            assert!(
                error.to_string().contains(stage),
                "{client}/{stage}: {error}"
            );
            for path in manager.repair_paths(client) {
                assert!(
                    !path.exists(),
                    "{client}/{stage} left a transaction target at {}",
                    path.display()
                );
            }
        }
    }
}

fn credential() -> ManagedCredential {
    ManagedCredential {
        client: "claude".into(),
        source: TokenSource::Supplied,
        token_id: Some("record-id-not-a-secret".into()),
        label: None,
        issued_at: None,
        router: Some("http://router.test:8080".into()),
        principal_id: Some("primary".into()),
        config_sha256: None,
    }
}

#[test]
fn repair_snapshot_is_private_secret_free_and_exactly_rollbackable() {
    let home = tempfile::tempdir().expect("home");
    let manager = ClientManager::isolated(home.path());
    let path = manager.config_path(ClientKind::ClaudeCode);
    fs::create_dir_all(path.parent().unwrap()).unwrap();
    let original = br#"{"helper":"preserved","env":{"ANTHROPIC_AUTH_TOKEN":"vendor-secret","ANTHROPIC_BASE_URL":"https://helper.invalid"}}"#;
    fs::write(&path, original).unwrap();
    set_mode(&path, 0o640).unwrap();

    let result = manager
        .apply_repair(
            ClientKind::ClaudeCode,
            "http://router.test:8080",
            "la_sk_router_secret",
            &credential(),
            &[],
        )
        .expect("repair");
    assert_eq!(result.after, OwnershipState::ManagedIntact);
    let id = result.backup_id.as_deref().expect("snapshot id");
    let root = manager.repair_root().join(id);
    let manifest = fs::read_to_string(root.join("manifest.json")).unwrap();
    assert!(!manifest.contains("vendor-secret"));
    assert!(!manifest.contains("la_sk_router_secret"));
    #[cfg(unix)]
    {
        assert_eq!(file_mode(&root), Some(0o700));
        for entry in fs::read_dir(&root).unwrap() {
            assert_eq!(file_mode(&entry.unwrap().path()), Some(0o600));
        }
    }

    manager
        .rollback_repair(ClientKind::ClaudeCode, id)
        .expect("rollback");
    assert_eq!(fs::read(&path).unwrap(), original);
    #[cfg(unix)]
    assert_eq!(file_mode(&path), Some(0o640));
    assert!(!manager.environment_path(ClientKind::ClaudeCode).exists());
    assert!(
        !manager
            .credential_metadata_path(ClientKind::ClaudeCode)
            .exists()
    );
}

#[test]
fn codex_repair_removes_only_the_foreign_catalog_constraint_and_rolls_back_exactly() {
    let home = tempfile::tempdir().expect("home");
    let manager = ClientManager::isolated(home.path());
    let path = manager.config_path(ClientKind::Codex);
    fs::create_dir_all(path.parent().unwrap()).unwrap();
    let catalog = home.path().join("foreign-models.json");
    fs::write(&catalog, br#"{"models":[{"slug":"foreign-only"}]}"#).unwrap();
    let original = format!(
        r#"model_provider = "foreign"
model_catalog_json = {:?}
model_reasoning_effort = "high"

[mcp_servers.keep]
command = "kept-mcp"
"#,
        catalog.to_string_lossy()
    );
    fs::write(&path, original.as_bytes()).unwrap();
    set_mode(&path, 0o640).unwrap();
    let auth = path.parent().unwrap().join("auth.json");
    fs::write(&auth, br#"{"auth":"untouched"}"#).unwrap();
    let credential = ManagedCredential {
        client: "codex".into(),
        source: TokenSource::Supplied,
        token_id: Some("record-id-not-a-secret".into()),
        label: None,
        issued_at: None,
        router: Some("http://router.test:8080".into()),
        principal_id: Some("primary".into()),
        config_sha256: None,
    };

    let result = manager
        .apply_repair(
            ClientKind::Codex,
            "http://router.test:8080",
            "la_sk_router_secret",
            &credential,
            &[],
        )
        .expect("repair");
    let repaired = fs::read_to_string(&path).unwrap();
    assert!(!repaired.contains("model_catalog_json"));
    assert!(repaired.contains("model_reasoning_effort = \"high\""));
    assert!(repaired.contains("command = \"kept-mcp\""));
    assert_eq!(fs::read(&auth).unwrap(), br#"{"auth":"untouched"}"#);

    manager
        .rollback_repair(
            ClientKind::Codex,
            result.backup_id.as_deref().expect("snapshot id"),
        )
        .expect("rollback");
    assert_eq!(fs::read(&path).unwrap(), original.as_bytes());
    #[cfg(unix)]
    assert_eq!(file_mode(&path), Some(0o640));
    assert_eq!(fs::read(&auth).unwrap(), br#"{"auth":"untouched"}"#);
}

#[test]
fn codex_repair_refuses_missing_and_invalid_catalogs_without_touching_user_files() {
    for invalid_json in [false, true] {
        let home = tempfile::tempdir().expect("home");
        let manager = ClientManager::isolated(home.path());
        let path = manager.config_path(ClientKind::Codex);
        fs::create_dir_all(path.parent().unwrap()).unwrap();
        let catalog = home.path().join("foreign-models.json");
        if invalid_json {
            fs::write(&catalog, b"not-json").unwrap();
        }
        let original = format!("model_catalog_json = {:?}\n", catalog.to_string_lossy());
        fs::write(&path, original.as_bytes()).unwrap();
        set_mode(&path, 0o640).unwrap();
        let auth = path.parent().unwrap().join("auth.json");
        fs::write(&auth, br#"{"auth":"untouched"}"#).unwrap();
        let config_mtime = fs::metadata(&path).unwrap().modified().unwrap();
        let auth_mtime = fs::metadata(&auth).unwrap().modified().unwrap();

        manager
            .apply_repair(
                ClientKind::Codex,
                "http://router.test:8080",
                "la_sk_router_secret",
                &credential(),
                &[],
            )
            .expect_err("unsafe catalog target must be refused");

        assert_eq!(fs::read(&path).unwrap(), original.as_bytes());
        assert_eq!(
            fs::metadata(&path).unwrap().modified().unwrap(),
            config_mtime
        );
        assert_eq!(fs::read(&auth).unwrap(), br#"{"auth":"untouched"}"#);
        assert_eq!(fs::metadata(&auth).unwrap().modified().unwrap(), auth_mtime);
        assert!(!manager.environment_path(ClientKind::Codex).exists());
        assert!(!manager.credential_metadata_path(ClientKind::Codex).exists());
    }
}

#[cfg(unix)]
#[test]
fn codex_repair_refuses_a_symlinked_catalog_without_touching_user_files() {
    use std::os::unix::fs::symlink;

    let home = tempfile::tempdir().expect("home");
    let manager = ClientManager::isolated(home.path());
    let path = manager.config_path(ClientKind::Codex);
    fs::create_dir_all(path.parent().unwrap()).unwrap();
    let target = home.path().join("target-models.json");
    fs::write(&target, br#"{"models":[]}"#).unwrap();
    let catalog = home.path().join("foreign-models.json");
    symlink(&target, &catalog).unwrap();
    let original = format!("model_catalog_json = {:?}\n", catalog.to_string_lossy());
    fs::write(&path, original.as_bytes()).unwrap();
    let auth = path.parent().unwrap().join("auth.json");
    fs::write(&auth, br#"{"auth":"untouched"}"#).unwrap();

    let error = manager
        .apply_repair(
            ClientKind::Codex,
            "http://router.test:8080",
            "la_sk_router_secret",
            &credential(),
            &[],
        )
        .expect_err("symlinked catalog must be refused");

    assert!(error.to_string().contains("symlink"), "{error}");
    assert_eq!(fs::read(&path).unwrap(), original.as_bytes());
    assert_eq!(fs::read(&auth).unwrap(), br#"{"auth":"untouched"}"#);
    assert_eq!(fs::read_link(&catalog).unwrap(), target);
    assert!(!manager.environment_path(ClientKind::Codex).exists());
}

#[test]
fn rollback_refuses_a_post_repair_edit() {
    let home = tempfile::tempdir().expect("home");
    let manager = ClientManager::isolated(home.path());
    let result = manager
        .apply_repair(
            ClientKind::ClaudeCode,
            "http://router.test:8080",
            "la_sk_router_secret",
            &credential(),
            &[],
        )
        .expect("repair");
    fs::write(
        manager.config_path(ClientKind::ClaudeCode),
        b"user edited after repair",
    )
    .unwrap();
    let error = manager
        .rollback_repair(ClientKind::ClaudeCode, result.backup_id.as_deref().unwrap())
        .expect_err("must preserve later edits");
    assert!(error.to_string().contains("changed after repair"));
}

#[test]
fn repair_lock_covers_analysis_and_preserves_a_waiting_user_edit() {
    let home = tempfile::tempdir().expect("home");
    let path = home.path().join(".claude/settings.json");
    fs::create_dir_all(path.parent().unwrap()).unwrap();
    fs::write(&path, br#"{"theme":"before"}"#).unwrap();

    let manager = ClientManager::isolated(home.path());
    let lock_path = manager.repair_lock_path(ClientKind::ClaudeCode);
    fs::create_dir_all(lock_path.parent().unwrap()).unwrap();
    let held = fs::OpenOptions::new()
        .read(true)
        .write(true)
        .create(true)
        .truncate(false)
        .open(&lock_path)
        .unwrap();
    held.lock().unwrap();

    let repair_home = home.path().to_path_buf();
    let (sent, received) = std::sync::mpsc::channel();
    let worker = std::thread::spawn(move || {
        let manager = ClientManager::isolated(&repair_home);
        let result = manager.apply_repair(
            ClientKind::ClaudeCode,
            "http://router.test:8080",
            "la_sk_router_secret",
            &credential(),
            &[],
        );
        sent.send(result).unwrap();
    });

    std::thread::sleep(std::time::Duration::from_millis(50));
    assert!(
        received.try_recv().is_err(),
        "repair ignored its client lock"
    );
    fs::write(&path, br#"{"theme":"edited-while-waiting"}"#).unwrap();
    drop(held);

    let result = received
        .recv_timeout(std::time::Duration::from_secs(5))
        .expect("repair completed after lock release")
        .expect("repair succeeded");
    worker.join().unwrap();
    manager
        .rollback_repair(ClientKind::ClaudeCode, result.backup_id.as_deref().unwrap())
        .expect("rollback latest pre-repair bytes");
    assert_eq!(
        fs::read(&path).unwrap(),
        br#"{"theme":"edited-while-waiting"}"#
    );
}

#[cfg(unix)]
#[test]
fn repair_refuses_symlink_targets() {
    use std::os::unix::fs::symlink;

    let home = tempfile::tempdir().expect("home");
    let manager = ClientManager::isolated(home.path());
    let outside = home.path().join("outside");
    fs::write(&outside, b"outside").unwrap();
    let path = manager.config_path(ClientKind::ClaudeCode);
    fs::create_dir_all(path.parent().unwrap()).unwrap();
    symlink(&outside, &path).unwrap();
    let error = manager
        .apply_repair(
            ClientKind::ClaudeCode,
            "http://router.test:8080",
            "la_sk_router_secret",
            &credential(),
            &[],
        )
        .expect_err("symlink must be refused");
    assert!(error.to_string().contains("symlink"));
    assert_eq!(fs::read(&outside).unwrap(), b"outside");
}
