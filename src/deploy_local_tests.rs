use std::collections::{HashMap, VecDeque};
use std::path::Path;
use std::sync::{Arc, Mutex};

use link_assistant_router::cli::DeployArgs;

use super::docker::{CommandOutput, CommandRunner, Docker};
use super::state::{Active, Phase, PreviousKind, State, Transaction};
use super::{
    Coordinator, Existing, LABEL_KEY, LEGACY, NETWORK, RELAY, SPEC_VERSION, run_with_docker,
};

#[path = "deploy_local_failure_tests.rs"]
mod failure_tests;

#[derive(Clone, Debug)]
struct Container {
    running: bool,
    image_ref: String,
    image_id: String,
    labels: HashMap<String, String>,
    mounts: HashMap<String, String>,
}

struct World {
    containers: HashMap<String, Container>,
    images: HashMap<String, String>,
    network_labels: Option<HashMap<String, String>>,
    connection_counts: HashMap<String, VecDeque<u64>>,
    commands: Vec<Vec<String>>,
    token_inventory: String,
    signing_secret_received: bool,
    health_results: VecDeque<bool>,
    health_default: bool,
    fail_backend_runs: usize,
    fail_relay_runs: usize,
    fail_token_issue: bool,
}

impl Default for World {
    fn default() -> Self {
        Self {
            containers: HashMap::new(),
            images: HashMap::new(),
            network_labels: None,
            connection_counts: HashMap::new(),
            commands: Vec::new(),
            token_inventory: "[]".to_string(),
            signing_secret_received: false,
            health_results: VecDeque::new(),
            health_default: true,
            fail_backend_runs: 0,
            fail_relay_runs: 0,
            fail_token_issue: false,
        }
    }
}

#[derive(Clone, Default)]
struct FakeRunner(Arc<Mutex<World>>);

impl FakeRunner {
    fn output(
        success: bool,
        stdout: impl Into<Vec<u8>>,
        stderr: impl Into<Vec<u8>>,
    ) -> CommandOutput {
        CommandOutput {
            success,
            stdout: stdout.into(),
            stderr: stderr.into(),
        }
    }

    #[allow(clippy::unnecessary_wraps)]
    fn ok(stdout: impl Into<Vec<u8>>) -> Result<CommandOutput, String> {
        Ok(Self::output(true, stdout, Vec::new()))
    }

    #[allow(clippy::unnecessary_wraps)]
    fn absent(subject: &str) -> Result<CommandOutput, String> {
        Ok(Self::output(
            false,
            Vec::new(),
            format!("No such object: {subject}"),
        ))
    }
}

fn option(arguments: &[String], name: &str) -> Option<String> {
    arguments
        .windows(2)
        .find(|pair| pair[0] == name)
        .map(|pair| pair[1].clone())
}

fn labels(arguments: &[String]) -> HashMap<String, String> {
    arguments
        .windows(2)
        .filter(|pair| pair[0] == "--label")
        .filter_map(|pair| pair[1].split_once('='))
        .map(|(key, value)| (key.to_string(), value.to_string()))
        .collect()
}

impl CommandRunner for FakeRunner {
    // Holding one lock for the whole simulated command makes each command an
    // atomic transition, just as one Docker CLI process is from the caller's
    // perspective.
    #[allow(clippy::significant_drop_tightening)]
    fn run(
        &self,
        arguments: &[String],
        environment: &[(&str, &str)],
    ) -> Result<CommandOutput, String> {
        let mut world = self.0.lock().unwrap();
        world.commands.push(arguments.to_vec());
        if environment.iter().any(|(key, value)| {
            *key == "TOKEN_SECRET" && *value == "integration-test-signing-secret"
        }) {
            world.signing_secret_received = true;
        }

        match arguments.first().map(String::as_str) {
            Some("info") => Self::ok("27.0\n"),
            Some("image") if arguments.get(1).map(String::as_str) == Some("inspect") => {
                let image = arguments.last().unwrap();
                world.images.get(image).cloned().map_or_else(
                    || Self::absent(image),
                    |image_id| Self::ok(format!("{image_id}\n")),
                )
            }
            Some("pull") => {
                let image = arguments.last().unwrap().clone();
                world
                    .images
                    .insert(image.clone(), format!("sha256:{image}"));
                Self::ok("pulled\n")
            }
            Some("build") => {
                let image = option(arguments, "-t").unwrap();
                world
                    .images
                    .insert(image.clone(), format!("sha256:{image}"));
                Self::ok("built\n")
            }
            Some("inspect") => inspect(&world, arguments),
            Some("network") => network(&mut world, arguments),
            Some("ps") => list_containers(&world, arguments),
            Some("run") => run_container(&mut world, arguments),
            Some("exec") => exec(&mut world, arguments),
            Some("start" | "stop") => {
                let running = arguments[0] == "start";
                let name = arguments.last().unwrap();
                let Some(container) = world.containers.get_mut(name) else {
                    return Self::absent(name);
                };
                container.running = running;
                Self::ok(format!("{name}\n"))
            }
            Some("rm") => {
                let name = arguments.last().unwrap();
                world.containers.remove(name);
                Self::ok(format!("{name}\n"))
            }
            command => Err(format!(
                "unexpected fake Docker command: {command:?} {arguments:?}"
            )),
        }
    }
}

fn inspect(world: &World, arguments: &[String]) -> Result<CommandOutput, String> {
    let name = arguments.last().unwrap();
    let Some(container) = world.containers.get(name) else {
        return FakeRunner::absent(name);
    };
    let Some(format) = option(arguments, "--format") else {
        return FakeRunner::ok("[]\n");
    };
    if format == "{{.State.Running}}" {
        return FakeRunner::ok(if container.running {
            "true\n"
        } else {
            "false\n"
        });
    }
    if format == "{{.Config.Image}}" {
        return FakeRunner::ok(format!("{}\n", container.image_ref));
    }
    if format == "{{.Image}}" {
        return FakeRunner::ok(format!("{}\n", container.image_id));
    }
    if format.contains(".Config.Labels") {
        let key = format.split('"').nth(1).unwrap();
        return FakeRunner::ok(
            container
                .labels
                .get(key)
                .map_or_else(|| "<no value>\n".to_string(), |value| format!("{value}\n")),
        );
    }
    if format.contains(".Mounts") {
        let destination = format.split('"').nth(1).unwrap();
        return FakeRunner::ok(
            container
                .mounts
                .get(destination)
                .map_or_else(String::new, |source| format!("{source}\n")),
        );
    }
    Err(format!("unexpected container inspection: {format}"))
}

fn network(world: &mut World, arguments: &[String]) -> Result<CommandOutput, String> {
    match arguments.get(1).map(String::as_str) {
        Some("inspect") => {
            let Some(network_labels) = &world.network_labels else {
                return FakeRunner::absent(NETWORK);
            };
            option(arguments, "--format").map_or_else(
                || FakeRunner::ok("[]\n"),
                |format| {
                    let key = format.split('"').nth(1).unwrap();
                    FakeRunner::ok(
                        network_labels.get(key).map_or_else(
                            || "<no value>\n".to_string(),
                            |value| format!("{value}\n"),
                        ),
                    )
                },
            )
        }
        Some("create") => {
            world.network_labels = Some(labels(arguments));
            FakeRunner::ok(format!("{NETWORK}\n"))
        }
        Some("rm") => {
            world.network_labels = None;
            FakeRunner::ok(format!("{NETWORK}\n"))
        }
        command => Err(format!("unexpected fake network command: {command:?}")),
    }
}

fn list_containers(world: &World, arguments: &[String]) -> Result<CommandOutput, String> {
    if arguments
        .iter()
        .any(|argument| argument.starts_with("publish="))
    {
        let port = arguments
            .iter()
            .find_map(|argument| argument.strip_prefix("publish="))
            .unwrap();
        let names = world
            .containers
            .iter()
            .filter(|(_, container)| {
                container.labels.get(&format!("{LABEL_KEY}.port")) == Some(&port.to_string())
            })
            .map(|(name, _)| name.as_str())
            .collect::<Vec<_>>()
            .join("\n");
        return FakeRunner::ok(names);
    }
    let requested_root = arguments
        .iter()
        .find_map(|argument| argument.strip_prefix(&format!("label={LABEL_KEY}.root=")));
    let names = world
        .containers
        .iter()
        .filter(|(_, container)| {
            requested_root.is_some_and(|root| {
                container.labels.get(LABEL_KEY).map(String::as_str) == Some("1")
                    && container
                        .labels
                        .get(&format!("{LABEL_KEY}.root"))
                        .map(String::as_str)
                        == Some(root)
            })
        })
        .map(|(name, _)| name.as_str())
        .collect::<Vec<_>>()
        .join("\n");
    FakeRunner::ok(names)
}

fn run_container(world: &mut World, arguments: &[String]) -> Result<CommandOutput, String> {
    let name = option(arguments, "--name").unwrap();
    let container_labels = labels(arguments);
    match container_labels
        .get(&format!("{LABEL_KEY}.role"))
        .map(String::as_str)
    {
        Some("backend") if world.fail_backend_runs > 0 => {
            world.fail_backend_runs -= 1;
            return Ok(FakeRunner::output(
                false,
                Vec::new(),
                "backend launch failed",
            ));
        }
        Some("relay") if world.fail_relay_runs > 0 => {
            world.fail_relay_runs -= 1;
            return Ok(FakeRunner::output(false, Vec::new(), "relay launch failed"));
        }
        _ => {}
    }
    let image_index = arguments
        .iter()
        .position(|argument| argument == "serve")
        .unwrap()
        - 1;
    let image_ref = arguments[image_index].clone();
    let image_id = world
        .images
        .entry(image_ref.clone())
        .or_insert_with(|| format!("sha256:{image_ref}"))
        .clone();
    let mounts = arguments
        .windows(2)
        .filter(|pair| pair[0] == "-v")
        .filter_map(|pair| {
            pair[1].find(":/data/").map(|separator| {
                let source = pair[1][..separator].to_string();
                let destination = pair[1][separator + 1..]
                    .strip_suffix(":ro")
                    .unwrap_or_else(|| &pair[1][separator + 1..])
                    .to_string();
                (destination, source)
            })
        })
        .collect();
    world.containers.insert(
        name.clone(),
        Container {
            running: true,
            image_ref,
            image_id,
            labels: container_labels,
            mounts,
        },
    );
    FakeRunner::ok(format!("{name}\n"))
}

fn exec(world: &mut World, arguments: &[String]) -> Result<CommandOutput, String> {
    if arguments.iter().any(|argument| argument == "tokens")
        && arguments.iter().any(|argument| argument == "list")
    {
        let inventory = if world.token_inventory.is_empty() {
            "[]"
        } else {
            &world.token_inventory
        };
        return FakeRunner::ok(format!("{inventory}\n"));
    }
    if arguments.iter().any(|argument| argument == "tokens")
        && arguments.iter().any(|argument| argument == "issue")
    {
        if world.fail_token_issue {
            return Ok(FakeRunner::output(false, Vec::new(), "token issue failed"));
        }
        return FakeRunner::ok("token-value-withheld-by-production\n");
    }
    if arguments.get(1).map(String::as_str) == Some(RELAY) {
        let backend = arguments.last().unwrap().rsplit('/').next().unwrap();
        let count = world
            .connection_counts
            .entry(backend.to_string())
            .or_default()
            .pop_front()
            .unwrap_or(0);
        return FakeRunner::ok(format!("{count}\n"));
    }
    if arguments.iter().any(|argument| argument == "bun") {
        let healthy = world
            .health_results
            .pop_front()
            .unwrap_or(world.health_default);
        return Ok(FakeRunner::output(
            healthy,
            Vec::new(),
            if healthy { "" } else { "not ready" },
        ));
    }
    Err(format!("unexpected fake container command: {arguments:?}"))
}

fn coordinator<'a>(
    runner: FakeRunner,
    root: &'a Path,
    image: &'a str,
    port: u16,
    force: bool,
) -> Coordinator<'a> {
    Coordinator {
        docker: Docker::with_runner(runner),
        state: State::new(root),
        root,
        image,
        build: None,
        port,
        token_secret: "integration-test-signing-secret",
        force,
    }
}

fn deploy_args() -> DeployArgs {
    DeployArgs {
        server: None,
        status: false,
        down: false,
        yes: false,
        force_update: false,
        port: 8080,
        public_port: None,
        image: None,
        build: None,
        root: None,
    }
}

fn managed_container(root: &Path, image: &str, image_id: &str) -> Container {
    Container {
        running: true,
        image_ref: image.to_string(),
        image_id: image_id.to_string(),
        labels: HashMap::from([
            (LABEL_KEY.to_string(), "1".to_string()),
            (format!("{LABEL_KEY}.root"), root.display().to_string()),
            (format!("{LABEL_KEY}.role"), "backend".to_string()),
            (format!("{LABEL_KEY}.spec"), SPEC_VERSION.to_string()),
            (format!("{LABEL_KEY}.image-ref"), image.to_string()),
        ]),
        mounts: HashMap::new(),
    }
}

#[test]
fn absent_install_and_managed_update_cut_over_then_drain_without_exposing_the_secret() {
    let root = tempfile::tempdir().unwrap();
    let runner = FakeRunner::default();
    let first = coordinator(runner.clone(), root.path(), "router:1", 9090, false);

    assert_eq!(first.docker.available().unwrap(), "27.0");
    assert!(matches!(first.existing().unwrap(), Existing::Absent));
    assert!(first.preflight(&Existing::Absent).unwrap().is_none());
    first.create_directories().unwrap();
    let _lock = first.acquire_lock().unwrap();
    first.deploy(&Existing::Absent).unwrap();

    let active = first.state.active().unwrap().unwrap();
    assert_eq!(
        first.state.current().unwrap().as_deref(),
        Some(active.backend.as_str())
    );
    assert_eq!(
        first.state.transaction().unwrap().unwrap().phase,
        Phase::Complete
    );
    assert!(first.no_op(&active).unwrap());
    assert!(!first.topology_needs_repair(&active).unwrap());
    assert!(
        first
            .print_status(&Existing::Managed(active.clone()))
            .unwrap()
    );

    let second = coordinator(runner.clone(), root.path(), "router:2", 9090, false);
    let existing = second.existing().unwrap();
    second.preflight(&existing).unwrap();
    runner
        .0
        .lock()
        .unwrap()
        .connection_counts
        .insert(active.backend.clone(), VecDeque::from([2, 0, 0]));
    second.deploy(&existing).unwrap();
    let replacement = second.state.active().unwrap().unwrap();
    assert_ne!(replacement.backend, active.backend);
    assert_eq!(replacement.image_ref, "router:2");

    let world = runner.0.lock().unwrap();
    assert!(world.signing_secret_received);
    assert!(!world.containers.contains_key(&active.backend));
    assert!(world.containers.contains_key(&replacement.backend));
    assert!(world.containers.contains_key(RELAY));
    assert!(
        world
            .commands
            .iter()
            .flatten()
            .all(|argument| { argument != "integration-test-signing-secret" })
    );
    drop(world);
}

#[test]
fn dispatcher_covers_status_install_no_op_repair_update_and_removal() {
    let root = tempfile::tempdir().unwrap();
    let runner = FakeRunner::default();
    let mut args = deploy_args();

    args.status = true;
    assert_ne!(
        run_with_docker(
            &args,
            root.path(),
            "router:1.0.0",
            "integration-test-signing-secret",
            Docker::with_runner(runner.clone()),
        ),
        std::process::ExitCode::SUCCESS
    );
    args.status = false;
    assert_eq!(
        run_with_docker(
            &args,
            root.path(),
            "router:1.0.0",
            "integration-test-signing-secret",
            Docker::with_runner(runner.clone()),
        ),
        std::process::ExitCode::SUCCESS
    );
    assert_eq!(
        run_with_docker(
            &args,
            root.path(),
            "router:1.0.0",
            "integration-test-signing-secret",
            Docker::with_runner(runner.clone()),
        ),
        std::process::ExitCode::SUCCESS
    );

    runner
        .0
        .lock()
        .unwrap()
        .containers
        .get_mut(RELAY)
        .unwrap()
        .running = false;
    assert_eq!(
        run_with_docker(
            &args,
            root.path(),
            "router:1.0.0",
            "integration-test-signing-secret",
            Docker::with_runner(runner.clone()),
        ),
        std::process::ExitCode::SUCCESS
    );
    assert_eq!(
        run_with_docker(
            &args,
            root.path(),
            "router:2.0.0",
            "integration-test-signing-secret",
            Docker::with_runner(runner.clone()),
        ),
        std::process::ExitCode::SUCCESS
    );

    args.down = true;
    assert_ne!(
        run_with_docker(
            &args,
            root.path(),
            "router:2.0.0",
            "integration-test-signing-secret",
            Docker::with_runner(runner.clone()),
        ),
        std::process::ExitCode::SUCCESS
    );
    args.yes = true;
    assert_eq!(
        run_with_docker(
            &args,
            root.path(),
            "router:2.0.0",
            "integration-test-signing-secret",
            Docker::with_runner(runner.clone()),
        ),
        std::process::ExitCode::SUCCESS
    );
    assert!(runner.0.lock().unwrap().containers.is_empty());

    args.down = false;
    args.yes = false;
    assert_ne!(
        run_with_docker(
            &args,
            root.path(),
            "router:latest",
            "integration-test-signing-secret",
            Docker::with_runner(runner),
        ),
        std::process::ExitCode::SUCCESS
    );
}

#[test]
fn legacy_migration_is_named_refused_by_default_and_remains_recoverable_when_forced() {
    let root = tempfile::tempdir().unwrap();
    let runner = FakeRunner::default();
    {
        let mut world = runner.0.lock().unwrap();
        world.token_inventory = r#"[{"id":"legacy-run","label":"old claude","issued_at":1,"expires_at":4102444800,"revoked":false,"ephemeral":true}]"#.into();
        world.containers.insert(
            LEGACY.to_string(),
            Container {
                running: true,
                image_ref: "router:legacy".to_string(),
                image_id: "sha256:legacy".to_string(),
                labels: HashMap::from([(LABEL_KEY.to_string(), "1".to_string())]),
                mounts: HashMap::from([
                    (
                        "/data/claude".to_string(),
                        root.path().join("credentials").display().to_string(),
                    ),
                    (
                        "/data/router".to_string(),
                        root.path().join("data").display().to_string(),
                    ),
                ]),
            },
        );
        drop(world);
    }

    let safe = coordinator(runner.clone(), root.path(), "router:2", 8080, false);
    let existing = safe.existing().unwrap();
    let refusal = safe.preflight(&existing).unwrap_err();
    assert!(refusal.contains("legacy local deployment"), "{refusal}");
    assert!(runner.0.lock().unwrap().containers.contains_key(LEGACY));
    assert_ne!(
        run_with_docker(
            &deploy_args(),
            root.path(),
            "router:2.0.0",
            "integration-test-signing-secret",
            Docker::with_runner(runner.clone()),
        ),
        std::process::ExitCode::SUCCESS
    );

    let forced = coordinator(runner.clone(), root.path(), "router:2", 8080, true);
    forced.create_directories().unwrap();
    forced.preflight(&existing).unwrap();
    forced.deploy(&existing).unwrap();
    assert!(!runner.0.lock().unwrap().containers.contains_key(LEGACY));

    forced.down().unwrap();
    let world = runner.0.lock().unwrap();
    assert!(world.containers.is_empty());
    assert!(world.network_labels.is_none());
    drop(world);
    assert!(forced.state.active().unwrap().is_none());
    assert!(forced.state.current().unwrap().is_none());
}

#[test]
fn managed_blockers_port_changes_and_foreign_listeners_are_separate_refusals() {
    let root = tempfile::tempdir().unwrap();
    let runner = FakeRunner::default();
    let initial = coordinator(runner.clone(), root.path(), "router:1", 8080, false);
    initial.create_directories().unwrap();
    initial.deploy(&Existing::Absent).unwrap();
    let active = initial.state.active().unwrap().unwrap();
    runner.0.lock().unwrap().token_inventory = r#"[{"id":"pre-policy","label":"scheduled","issued_at":1,"expires_at":4102444800,"revoked":false,"ephemeral":true}]"#.into();

    let safe = coordinator(runner.clone(), root.path(), "router:2", 8080, false);
    let refusal = safe
        .preflight(&Existing::Managed(active.clone()))
        .unwrap_err();
    assert!(refusal.contains("legacy-unpinned"), "{refusal}");

    let moved = coordinator(runner.clone(), root.path(), "router:2", 9090, false);
    let refusal = moved
        .preflight(&Existing::Managed(active.clone()))
        .unwrap_err();
    assert!(refusal.contains("stable listener"), "{refusal}");

    let forced = coordinator(runner.clone(), root.path(), "router:2", 9090, true);
    assert!(
        forced
            .preflight(&Existing::Managed(active.clone()))
            .unwrap()
            .is_some()
    );
    forced.deploy(&Existing::Managed(active.clone())).unwrap();

    runner.0.lock().unwrap().containers.insert(
        "foreign-listener".into(),
        Container {
            running: true,
            image_ref: "other:1".into(),
            image_id: "sha256:other".into(),
            labels: HashMap::from([(format!("{LABEL_KEY}.port"), "8080".into())]),
            mounts: HashMap::new(),
        },
    );
    let refusal = safe.preflight(&Existing::Managed(active)).unwrap_err();
    assert!(refusal.contains("foreign-listener"), "{refusal}");
}

#[test]
fn interrupted_managed_cutovers_restore_the_old_pointer_and_accepted_ones_finish() {
    let root = tempfile::tempdir().unwrap();
    let runner = FakeRunner::default();
    let coordinator = coordinator(runner.clone(), root.path(), "router:2", 9090, false);
    coordinator.create_directories().unwrap();
    coordinator.state.set_current("candidate").unwrap();
    {
        let mut world = runner.0.lock().unwrap();
        world.images.insert("router:1".into(), "sha256:old".into());
        world.containers.insert(
            "old".into(),
            managed_container(root.path(), "router:1", "sha256:old"),
        );
        world.containers.insert(
            "candidate".into(),
            managed_container(root.path(), "router:2", "sha256:new"),
        );
        world.containers.insert(
            RELAY.into(),
            Container {
                running: true,
                image_ref: "router:2".into(),
                image_id: "sha256:new".into(),
                labels: HashMap::from([
                    (LABEL_KEY.into(), "1".into()),
                    (
                        format!("{LABEL_KEY}.root"),
                        root.path().display().to_string(),
                    ),
                    (format!("{LABEL_KEY}.role"), "relay".into()),
                    (format!("{LABEL_KEY}.spec"), SPEC_VERSION.into()),
                    (format!("{LABEL_KEY}.port"), "9090".into()),
                ]),
                mounts: HashMap::new(),
            },
        );
        drop(world);
    }
    let prepared = Transaction {
        version: 1,
        phase: Phase::Prepared,
        previous: Some("old".into()),
        previous_kind: PreviousKind::Managed,
        previous_port: Some(8080),
        candidate: "candidate".into(),
        image_ref: "router:2".into(),
        image_id: "sha256:new".into(),
        port: 9090,
    };
    coordinator.state.write_transaction(&prepared).unwrap();
    coordinator.print_interrupted(&prepared).unwrap();
    coordinator.recover().unwrap();
    assert_eq!(coordinator.state.current().unwrap().as_deref(), Some("old"));
    assert!(
        !runner
            .0
            .lock()
            .unwrap()
            .containers
            .contains_key("candidate")
    );

    runner.0.lock().unwrap().containers.insert(
        "candidate".into(),
        managed_container(root.path(), "router:2", "sha256:new"),
    );
    coordinator.state.set_current("candidate").unwrap();
    let accepted = Transaction {
        phase: Phase::Accepted,
        previous_port: Some(9090),
        ..prepared
    };
    coordinator.state.write_transaction(&accepted).unwrap();
    coordinator.recover().unwrap();
    let active = coordinator.state.active().unwrap().unwrap();
    assert_eq!(active.backend, "candidate");
    assert!(!runner.0.lock().unwrap().containers.contains_key("old"));
}

#[test]
fn exact_no_op_repairs_stopped_owned_processes_but_rejects_record_drift() {
    let root = tempfile::tempdir().unwrap();
    let runner = FakeRunner::default();
    let coordinator = coordinator(runner.clone(), root.path(), "router:1", 8080, false);
    coordinator.create_directories().unwrap();
    let active = Active {
        version: 1,
        backend: "old".into(),
        image_ref: "router:1".into(),
        image_id: "sha256:old".into(),
        port: 8080,
    };
    coordinator.state.set_current("old").unwrap();
    coordinator.state.write_active(&active).unwrap();
    let mut old = managed_container(root.path(), "router:1", "sha256:old");
    old.running = false;
    runner
        .0
        .lock()
        .unwrap()
        .containers
        .insert("old".into(), old);

    assert!(matches!(
        coordinator.existing().unwrap(),
        Existing::Managed(_)
    ));
    assert!(coordinator.topology_needs_repair(&active).unwrap());
    assert!(coordinator.restore_topology(&active).unwrap());
    assert!(!coordinator.restore_topology(&active).unwrap());

    runner
        .0
        .lock()
        .unwrap()
        .containers
        .get_mut("old")
        .unwrap()
        .image_id = "sha256:drift".into();
    let error = coordinator.existing().unwrap_err();
    assert!(error.contains("launch specification differs"), "{error}");
}
