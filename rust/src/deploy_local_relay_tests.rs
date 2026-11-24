//! Issue #627: the relay follows the backend image without interrupting a
//! stream or starting a second listener.

use std::path::Path;
use std::process::ExitCode;

use super::super::state::Active;
use super::status_tests::{mutations, relay_container};
use super::{FakeRunner, RELAY, coordinator, deploy_args, managed_container, run_with_docker};
use crate::deploy_local::docker::Docker;

const SECRET: &str = "integration-test-signing-secret";

/// A converged or skewed topology: `backend-a` on `backend_image`, the relay
/// on `relay_image`, and a matching durable record.
fn topology(root: &Path, backend_image: &str, relay_image: &str) -> FakeRunner {
    let runner = FakeRunner::default();
    {
        let mut world = runner.0.lock().unwrap();
        world.token_inventory = r#"[{"id":"client","label":"laptop","issued_at":1,"expires_at":4102444800,"revoked":false}]"#.into();
        for image in [backend_image, relay_image] {
            world.images.insert(image.into(), format!("sha256:{image}"));
        }
        world.containers.insert(
            "backend-a".into(),
            managed_container(root, backend_image, &format!("sha256:{backend_image}")),
        );
        world
            .containers
            .insert(RELAY.to_string(), relay_container(root, relay_image, 8080));
        drop(world);
    }
    let serving = coordinator(runner.clone(), root, backend_image, 8080, false);
    serving.create_directories().unwrap();
    serving.state.set_current("backend-a").unwrap();
    serving
        .state
        .write_active(&Active {
            version: 1,
            backend: "backend-a".into(),
            image_ref: backend_image.into(),
            image_id: format!("sha256:{backend_image}"),
            port: 8080,
        })
        .unwrap();
    runner
}

fn run(runner: &FakeRunner, root: &Path, image: &str, status: bool, force: bool) -> ExitCode {
    let mut args = deploy_args();
    args.status = status;
    args.force_update = force;
    run_with_docker(
        &args,
        root,
        image,
        SECRET,
        Docker::with_runner(runner.clone()),
    )
}

fn relay_image(runner: &FakeRunner) -> String {
    runner.0.lock().unwrap().containers[&*RELAY]
        .image_ref
        .clone()
}

fn relay_runs(runner: &FakeRunner) -> usize {
    mutations(&runner.0.lock().unwrap())
        .iter()
        .filter(|command| command[0] == "run" && command.iter().any(|a| a == &*RELAY))
        .count()
}

fn skew(runner: &FakeRunner, root: &Path, image: &str) -> Option<String> {
    let status = coordinator(runner.clone(), root, image, 8080, false);
    let active = status.state.active().unwrap().unwrap();
    status.relay_skew(&active).unwrap()
}

#[test]
fn an_update_moves_the_relay_to_the_new_image_after_the_old_backend_drains() {
    let root = tempfile::tempdir().unwrap();
    let runner = topology(root.path(), "router:1", "router:1");
    let tokens_before = runner.0.lock().unwrap().token_inventory.clone();

    assert_eq!(
        run(&runner, root.path(), "router:2", false, false),
        ExitCode::SUCCESS
    );

    assert_eq!(relay_image(&runner), "router:2");
    assert_eq!(skew(&runner, root.path(), "router:2"), None);
    let world = runner.0.lock().unwrap();
    assert_eq!(world.token_inventory, tokens_before);
    assert!(!world.containers.contains_key("backend-a"));
    // One relay publishes the port at any time: the old one is removed
    // before its replacement starts, and only after the old backend left.
    let commands = mutations(&world);
    let position =
        |predicate: &dyn Fn(&Vec<String>) -> bool| commands.iter().position(predicate).unwrap();
    let removed_backend = position(&|c| c[0] == "rm" && c.last().unwrap() == "backend-a");
    let removed_relay = position(&|c| c[0] == "rm" && c.last().unwrap() == &*RELAY);
    let started_relay = position(&|c| c[0] == "run" && c.iter().any(|a| a == &*RELAY));
    assert!(removed_backend < removed_relay && removed_relay < started_relay);
    assert!(world.commands.iter().flatten().all(|a| a != SECRET));
    drop(world);

    assert_eq!(
        run(&runner, root.path(), "router:2", true, false),
        ExitCode::SUCCESS
    );
}

#[test]
fn a_busy_relay_is_not_rotated_and_status_reports_the_skew() {
    let root = tempfile::tempdir().unwrap();
    // The state v1.14.3 left behind: backend updated, relay on the old image.
    let runner = topology(root.path(), "router:2", "router:1");
    runner
        .0
        .lock()
        .unwrap()
        .connection_counts
        .insert("backend-a".into(), [1, 1, 1, 1, 1, 1, 1, 1].into());

    assert_eq!(
        run(&runner, root.path(), "router:2", true, false),
        ExitCode::from(1),
        "status must not call mixed images converged"
    );
    assert_eq!(
        skew(&runner, root.path(), "router:2").as_deref(),
        Some("router:1")
    );
    assert_eq!(
        run(&runner, root.path(), "router:2", false, false),
        ExitCode::from(1)
    );
    assert_eq!(relay_image(&runner), "router:1");
    assert!(
        mutations(&runner.0.lock().unwrap()).is_empty(),
        "a stream through the relay was interrupted"
    );

    // Once idle, the ordinary rerun converges without touching the backend.
    runner.0.lock().unwrap().connection_counts.clear();
    assert_eq!(
        run(&runner, root.path(), "router:2", false, false),
        ExitCode::SUCCESS
    );
    assert_eq!(relay_image(&runner), "router:2");
    let world = runner.0.lock().unwrap();
    assert!(world.containers["backend-a"].running);
    assert!(
        mutations(&world)
            .iter()
            .all(|command| command.iter().any(|a| a == &*RELAY)),
        "{:?}",
        mutations(&world)
    );
    drop(world);
    assert_eq!(relay_runs(&runner), 1);
    assert_eq!(
        run(&runner, root.path(), "router:2", true, false),
        ExitCode::SUCCESS
    );
}

#[test]
fn force_rotates_a_busy_relay_and_a_failed_rotation_restores_the_old_relay() {
    let root = tempfile::tempdir().unwrap();
    let runner = topology(root.path(), "router:2", "router:1");
    runner.0.lock().unwrap().fail_relay_runs = 1;

    assert_eq!(
        run(&runner, root.path(), "router:2", false, false),
        ExitCode::from(1)
    );
    assert_eq!(relay_image(&runner), "router:1");
    assert!(runner.0.lock().unwrap().containers[&*RELAY].running);

    runner
        .0
        .lock()
        .unwrap()
        .connection_counts
        .insert("backend-a".into(), [3, 3, 3, 3].into());
    assert_eq!(
        run(&runner, root.path(), "router:2", false, true),
        ExitCode::SUCCESS
    );
    assert_eq!(relay_image(&runner), "router:2");
    assert_eq!(skew(&runner, root.path(), "router:2"), None);
}
