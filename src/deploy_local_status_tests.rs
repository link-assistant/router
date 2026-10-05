//! Issue #631: a serving topology without a usable durable record.

use std::collections::HashMap;
use std::path::Path;
use std::process::ExitCode;

use super::super::state::ActiveRecord;
use super::{
    Container, FakeRunner, LABEL_KEY, RELAY, SPEC_VERSION, World, coordinator, deploy_args,
    managed_container, run_with_docker,
};
use crate::deploy_local::docker::Docker;

const SECRET: &str = "integration-test-signing-secret";

pub(super) fn relay_container(root: &Path, image: &str, port: u16) -> Container {
    Container {
        running: true,
        image_ref: image.to_string(),
        image_id: format!("sha256:{image}"),
        labels: HashMap::from([
            (LABEL_KEY.to_string(), "1".to_string()),
            (format!("{LABEL_KEY}.root"), root.display().to_string()),
            (format!("{LABEL_KEY}.role"), "relay".to_string()),
            (format!("{LABEL_KEY}.spec"), SPEC_VERSION.to_string()),
            (format!("{LABEL_KEY}.port"), port.to_string()),
        ]),
        mounts: HashMap::new(),
    }
}

/// Every Docker command that could change serving state or issue a token.
pub(super) fn mutations(world: &World) -> Vec<Vec<String>> {
    world
        .commands
        .iter()
        .filter(|command| {
            let verb = command.first().map_or("", String::as_str);
            matches!(verb, "run" | "rm" | "stop" | "start" | "pull" | "build")
                || (verb == "network" && command.get(1).map(String::as_str) != Some("inspect"))
                || (verb == "exec"
                    && command
                        .iter()
                        .any(|argument| argument == "issue" || argument == "revoke"))
        })
        .cloned()
        .collect()
}

fn state_files(root: &Path) -> Vec<(String, Vec<u8>)> {
    let mut files = std::fs::read_dir(root.join("state"))
        .map(|entries| {
            entries
                .map(|entry| {
                    let entry = entry.unwrap();
                    (
                        entry.file_name().to_string_lossy().into_owned(),
                        std::fs::read(entry.path()).unwrap_or_default(),
                    )
                })
                .collect::<Vec<_>>()
        })
        .unwrap_or_default();
    files.sort();
    files
}

/// The reported v1.14.3 state: relay and backend serve, the pointer names
/// the backend, and the durable record is missing.
fn orphaned_topology(root: &Path) -> FakeRunner {
    let runner = FakeRunner::default();
    {
        let mut world = runner.0.lock().unwrap();
        world.token_inventory = r#"[{"id":"client","label":"laptop","issued_at":1,"expires_at":4102444800,"revoked":false}]"#.into();
        world
            .images
            .insert("router:1".into(), "sha256:router:1".into());
        world.containers.insert(
            "backend-a".into(),
            managed_container(root, "router:1", "sha256:router:1"),
        );
        world
            .containers
            .insert(RELAY.to_string(), relay_container(root, "router:1", 8080));
        drop(world);
    }
    let serving = coordinator(runner.clone(), root, "router:1", 8080, false);
    serving.create_directories().unwrap();
    serving.state.set_current("backend-a").unwrap();
    runner
}

fn run(runner: &FakeRunner, root: &Path, image: &str, status: bool) -> ExitCode {
    let mut args = deploy_args();
    args.status = status;
    run_with_docker(
        &args,
        root,
        image,
        SECRET,
        Docker::with_runner(runner.clone()),
    )
}

#[test]
fn status_describes_a_relay_without_an_active_record_and_changes_nothing() {
    for corrupt in [false, true] {
        let root = tempfile::tempdir().unwrap();
        let runner = orphaned_topology(root.path());
        if corrupt {
            std::fs::write(root.path().join("state/active"), b"{\"version\":1,\"back").unwrap();
        }
        let before = state_files(root.path());

        // Repeated status is idempotent: same answer, same bytes, no mutation.
        for _ in 0..2 {
            assert_eq!(
                run(&runner, root.path(), "router:1", true),
                ExitCode::from(1)
            );
            assert_eq!(state_files(root.path()), before);
        }
        let world = runner.0.lock().unwrap();
        assert!(mutations(&world).is_empty(), "{:?}", mutations(&world));
        assert!(world.containers.contains_key("backend-a"));
        drop(world);

        let status = coordinator(runner.clone(), root.path(), "router:1", 8080, false);
        let error = status.existing().unwrap_err();
        let report = status.diagnosis(&error).join("\n");
        let expected_record = if corrupt {
            "active_record=corrupt"
        } else {
            "active_record=absent"
        };
        for expected in [
            "consistency=inconsistent",
            expected_record,
            "relay_pointer=backend-a",
            "container=backend-a role=backend running=true image=router:1",
            "claude_credentials=isolated pointer=true",
            "container=router-deploy-relay role=relay running=true image=router:1",
            "port=8080",
            "connections=0",
            "run_inventory runs=0 blockers=0",
            "recovery_plan=adopt backend=backend-a image=router:1 port=8080",
            "containers_unchanged=true",
            "status_is_read_only=true",
        ] {
            assert!(report.contains(expected), "missing {expected}: {report}");
        }
        assert!(!report.contains(SECRET));
        assert!(mutations(&runner.0.lock().unwrap()).is_empty());
    }
}

#[test]
fn deploy_adopts_the_serving_topology_without_touching_a_container() {
    let root = tempfile::tempdir().unwrap();
    let runner = orphaned_topology(root.path());
    let corrupt = b"{\"version\":1,\"back".to_vec();
    std::fs::write(root.path().join("state/active"), &corrupt).unwrap();
    let tokens_before = runner.0.lock().unwrap().token_inventory.clone();

    assert_eq!(
        run(&runner, root.path(), "router:1", false),
        ExitCode::SUCCESS
    );

    let world = runner.0.lock().unwrap();
    assert!(mutations(&world).is_empty(), "{:?}", mutations(&world));
    assert_eq!(world.token_inventory, tokens_before);
    assert!(world.containers["backend-a"].running);
    assert!(world.containers[&*RELAY].running);
    drop(world);
    let adopted = coordinator(runner.clone(), root.path(), "router:1", 8080, false);
    let ActiveRecord::Valid(active) = adopted.state.active_record() else {
        panic!("adoption wrote no valid record");
    };
    assert_eq!(active.backend, "backend-a");
    assert_eq!(active.image_ref, "router:1");
    assert_eq!(active.port, 8080);
    let set_aside = std::fs::read_dir(root.path().join("state"))
        .unwrap()
        .map(|entry| entry.unwrap())
        .find(|entry| {
            entry
                .file_name()
                .to_string_lossy()
                .starts_with("active.corrupt-")
        })
        .expect("the corrupt record is kept for inspection");
    assert_eq!(std::fs::read(set_aside.path()).unwrap(), corrupt);

    // Status is healthy again and an ordinary update rolls forward.
    assert_eq!(
        run(&runner, root.path(), "router:1", true),
        ExitCode::SUCCESS
    );
    assert_eq!(
        run(&runner, root.path(), "router:2", false),
        ExitCode::SUCCESS
    );
    let world = runner.0.lock().unwrap();
    assert!(!world.containers.contains_key("backend-a"));
    assert!(
        world
            .commands
            .iter()
            .flatten()
            .all(|argument| argument != SECRET)
    );
    drop(world);
}

#[test]
fn adoption_refuses_a_newer_record_and_a_relay_owned_by_another_root() {
    let root = tempfile::tempdir().unwrap();
    let runner = orphaned_topology(root.path());
    let future = br#"{"version":2,"backend":"backend-a","image_ref":"router:1","image_id":"x","port":8080,"extra":true}"#;
    std::fs::write(root.path().join("state/active"), future).unwrap();

    assert_eq!(
        run(&runner, root.path(), "router:1", false),
        ExitCode::from(1)
    );
    assert_eq!(
        std::fs::read(root.path().join("state/active")).unwrap(),
        future
    );
    let status = coordinator(runner.clone(), root.path(), "router:1", 8080, false);
    let report = status.diagnosis("inconsistent").join("\n");
    assert!(report.contains("active_record=unsupported"), "{report}");
    assert!(report.contains("recovery_plan=manual"), "{report}");

    std::fs::remove_file(root.path().join("state/active")).unwrap();
    runner
        .0
        .lock()
        .unwrap()
        .containers
        .get_mut(&*RELAY)
        .unwrap()
        .labels
        .insert(format!("{LABEL_KEY}.root"), "/elsewhere".into());
    assert_eq!(
        run(&runner, root.path(), "router:1", false),
        ExitCode::from(1)
    );
    assert!(!root.path().join("state/active").exists());
    let report = status.diagnosis("inconsistent").join("\n");
    assert!(report.contains("owner=foreign root=/elsewhere"), "{report}");
    assert!(report.contains("recovery_plan=manual"), "{report}");
    assert!(mutations(&runner.0.lock().unwrap()).is_empty());
}
