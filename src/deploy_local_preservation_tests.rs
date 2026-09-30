//! Health alone must not authorize an access-losing cutover.

use super::{Existing, FakeRunner, coordinator};

fn installed(root: &std::path::Path) -> FakeRunner {
    let runner = FakeRunner::default();
    let current = coordinator(runner.clone(), root, "router:1", 9090, false);
    current.create_directories().unwrap();
    current.deploy(&Existing::Absent).unwrap();
    let backend = current.state.active().unwrap().unwrap().backend;
    let mut world = runner.0.lock().unwrap();
    world.catalog_baseline_container = Some(backend);
    world.token_inventory = r#"[{"id":"claude-laptop","label":"laptop","issued_at":1,"expires_at":4102444800,"revoked":false,"client_kind":"claude","principal_id":"primary"}]"#.into();
    drop(world);
    runner
}

#[test]
fn a_healthy_zai_candidate_cannot_hide_lost_anthropic_authority() {
    let root = tempfile::tempdir().unwrap();
    let runner = installed(root.path());
    runner.0.lock().unwrap().candidate_catalog_models = Some(vec!["z.ai/glm-5.3".into()]);
    let update = coordinator(runner.clone(), root.path(), "router:2", 9090, false);
    let existing = update.existing().unwrap();
    let before = update.state.active().unwrap().unwrap();
    let error = update.deploy(&existing).unwrap_err();
    assert!(error.contains("anthropic/claude-sonnet"), "{error}");
    assert_eq!(update.state.current().unwrap().unwrap(), before.backend);
    assert!(runner.0.lock().unwrap().containers[&before.backend].running);
    assert!(!error.contains(super::DEFAULT_SECRET));
}

#[test]
fn changed_credential_sources_are_refused_before_candidate_preparation() {
    let root = tempfile::tempdir().unwrap();
    let runner = installed(root.path());
    let update = coordinator(runner.clone(), root.path(), "router:2", 9090, false);
    let existing = update.existing().unwrap();
    let before = update.state.active().unwrap().unwrap();
    let mut world = runner.0.lock().unwrap();
    world
        .containers
        .get_mut(&before.backend)
        .unwrap()
        .mounts
        .insert("/data/claude".into(), "/different-login".into());
    world.commands.clear();
    drop(world);
    assert!(
        update
            .deploy(&existing)
            .unwrap_err()
            .contains("source differs")
    );
    let world = runner.0.lock().unwrap();
    assert!(!world.commands.iter().any(|args| matches!(
        args.first().map(String::as_str),
        Some("pull" | "build" | "run" | "stop" | "rm")
    )));
    assert!(world.containers[&before.backend].running);
    drop(world);
}

#[test]
fn explicit_access_loss_permission_is_separate_from_connection_force() {
    let root = tempfile::tempdir().unwrap();
    let runner = installed(root.path());
    runner.0.lock().unwrap().candidate_catalog_models = Some(vec!["z.ai/glm-5.3".into()]);
    let mut update = coordinator(runner, root.path(), "router:2", 9090, true);
    let existing = update.existing().unwrap();
    assert!(update.deploy(&existing).is_err());
    update.accept_access_loss = true;
    update.deploy(&existing).unwrap();
    assert_eq!(
        update.state.active().unwrap().unwrap().image_ref,
        "router:2"
    );
}

#[test]
fn failed_candidate_retains_a_noncredential_checkpoint() {
    let root = tempfile::tempdir().unwrap();
    let runner = installed(root.path());
    std::fs::create_dir_all(root.path().join("data/requests/session")).unwrap();
    std::fs::write(
        root.path().join("data/requests/session/requests.lino"),
        b"historical request",
    )
    .unwrap();
    std::fs::write(
        root.path().join("credentials/.credentials.json"),
        b"rotating-credential-do-not-copy",
    )
    .unwrap();
    runner.0.lock().unwrap().candidate_catalog_models = Some(vec!["z.ai/glm-5.3".into()]);
    let update = coordinator(runner, root.path(), "router:2", 9090, false);
    assert!(update.deploy(&update.existing().unwrap()).is_err());
    let backup = std::fs::read_dir(root.path().join(".state-backups"))
        .expect("recoverable checkpoint before candidate startup")
        .next()
        .unwrap()
        .unwrap()
        .path();
    let manifest = std::fs::read_to_string(backup.join("manifest.json")).unwrap();
    assert!(manifest.contains("requests/session/requests.lino"));
    assert!(!manifest.contains("rotating-credential-do-not-copy"));
    assert_eq!(
        std::fs::read(backup.join("requests/session/requests.lino")).unwrap(),
        b"historical request"
    );
    assert!(!backup.join("credentials").exists());
    assert!(backup.join("tokens.json").exists());
}

#[test]
fn owned_serving_deployments_refuse_restore_without_stopping_anything() {
    let root = tempfile::tempdir().unwrap();
    let runner = super::FakeRunner::default();
    let coordinator = super::coordinator(runner.clone(), root.path(), "router:1", 9090, false);
    coordinator.create_directories().unwrap();
    coordinator.deploy(&super::Existing::Absent).unwrap();
    let snapshot =
        super::super::data_backup::capture(root.path(), &[], super::DEFAULT_SECRET).unwrap();
    let before = runner.0.lock().unwrap().commands.len();
    assert!(
        coordinator
            .restore_state(
                &snapshot,
                false,
                &super::super::host_runtime::System::default()
            )
            .is_err()
    );
    assert!(
        !runner.0.lock().unwrap().commands[before..]
            .iter()
            .any(|args| matches!(args[0].as_str(), "stop" | "rm" | "run"))
    );
}

#[test]
fn stopped_deployment_restore_checkpoints_current_state_and_keeps_new_data() {
    let root = tempfile::tempdir().unwrap();
    let runner = FakeRunner::default();
    let coordinator = coordinator(runner, root.path(), "router:1", 9090, false);
    coordinator.create_directories().unwrap();
    std::fs::create_dir_all(root.path().join("data/projects")).unwrap();
    std::fs::write(root.path().join("data/projects/old"), b"old project").unwrap();
    let snapshot =
        super::super::data_backup::capture(root.path(), &[], super::DEFAULT_SECRET).unwrap();
    std::fs::remove_file(root.path().join("data/projects/old")).unwrap();
    std::fs::write(root.path().join("data/projects/new"), b"new project").unwrap();
    coordinator
        .restore_state(
            &snapshot,
            false,
            &super::super::host_runtime::System::default(),
        )
        .unwrap();
    assert_eq!(
        std::fs::read(root.path().join("data/projects/old")).unwrap(),
        b"old project"
    );
    assert_eq!(
        std::fs::read(root.path().join("data/projects/new")).unwrap(),
        b"new project"
    );
    assert_eq!(
        std::fs::read_dir(root.path().join(".state-backups"))
            .unwrap()
            .count(),
        2
    );
    // A tampered source refuses, after preserving the pre-restore state.
    std::fs::write(snapshot.join("projects/old"), b"tampered").unwrap();
    assert!(
        coordinator
            .restore_state(
                &snapshot,
                true,
                &super::super::host_runtime::System::default()
            )
            .unwrap_err()
            .contains("checksum mismatch")
    );
    assert_eq!(
        std::fs::read(root.path().join("data/projects/old")).unwrap(),
        b"old project"
    );
}

#[test]
fn pending_deployment_restore_refuses_without_recovering_the_transaction() {
    let root = tempfile::tempdir().unwrap();
    let runner = FakeRunner::default();
    let coordinator = coordinator(runner.clone(), root.path(), "router:1", 9090, false);
    coordinator.create_directories().unwrap();
    let snapshot =
        super::super::data_backup::capture(root.path(), &[], super::DEFAULT_SECRET).unwrap();
    let transaction = super::Transaction {
        version: 1,
        phase: super::Phase::Prepared,
        previous: None,
        previous_kind: super::PreviousKind::None,
        previous_port: None,
        candidate: "pending-candidate".into(),
        image_ref: "router:2".into(),
        image_id: "sha256:new".into(),
        port: 9090,
    };
    coordinator.state.write_transaction(&transaction).unwrap();
    assert!(
        coordinator
            .restore_state(
                &snapshot,
                false,
                &super::super::host_runtime::System::default()
            )
            .unwrap_err()
            .contains("pending deployment")
    );
    assert_eq!(
        coordinator.state.transaction().unwrap().unwrap().phase,
        super::Phase::Prepared
    );
    assert!(
        !runner
            .0
            .lock()
            .unwrap()
            .commands
            .iter()
            .any(|args| matches!(args[0].as_str(), "stop" | "rm" | "run"))
    );
    assert_eq!(
        std::fs::read_dir(root.path().join(".state-backups"))
            .unwrap()
            .count(),
        1
    );
}

#[test]
#[cfg(unix)]
fn access_loss_permission_cannot_authorize_a_failed_data_checkpoint() {
    use std::os::unix::fs::symlink;
    let root = tempfile::tempdir().unwrap();
    let runner = installed(root.path());
    std::fs::create_dir_all(root.path().join("data/projects")).unwrap();
    std::fs::write(root.path().join("credentials/private"), b"never-copy").unwrap();
    symlink(
        root.path().join("credentials/private"),
        root.path().join("data/projects/link"),
    )
    .unwrap();
    let mut update = coordinator(runner.clone(), root.path(), "router:2", 9090, true);
    update.accept_access_loss = true;
    runner.0.lock().unwrap().commands.clear();
    assert!(
        update
            .deploy(&update.existing().unwrap())
            .unwrap_err()
            .contains("checkpoint failed")
    );
    assert!(
        !runner
            .0
            .lock()
            .unwrap()
            .commands
            .iter()
            .any(|args| matches!(args[0].as_str(), "pull" | "build" | "run" | "stop" | "rm"))
    );
}

#[test]
fn a_forced_secret_change_checkpoints_the_original_encryption_identity() {
    use sha2::Digest as _;
    let root = tempfile::tempdir().unwrap();
    let runner = installed(root.path());
    runner.0.lock().unwrap().token_inventory = "[]".into();
    let mut update = coordinator(runner, root.path(), "router:2", 9090, true);
    update.token_secret = "explicit-replacement-secret";
    update
        .preservation_baseline(&update.existing().unwrap())
        .unwrap();
    let snapshot = std::fs::read_dir(root.path().join(".state-backups"))
        .unwrap()
        .next()
        .unwrap()
        .unwrap()
        .path();
    let manifest: serde_json::Value =
        serde_json::from_slice(&std::fs::read(snapshot.join("manifest.json")).unwrap()).unwrap();
    assert_eq!(
        manifest["signing_secret_sha256"],
        hex::encode(sha2::Sha256::digest(super::DEFAULT_SECRET.as_bytes()))
    );
    assert!(
        super::super::data_backup::restore(root.path(), &snapshot, update.token_secret, true)
            .is_err()
    );
}
