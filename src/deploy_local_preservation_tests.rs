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
