//! Staging management fixtures never invoke a real Docker daemon.
use super::super::docker::{CommandOutput, CommandRunner};
use super::*;
use std::sync::{Arc, Mutex};

#[derive(Default)]
#[allow(clippy::struct_excessive_bools)]
struct State {
    commands: Vec<Vec<String>>,
    owner: String,
    name: String,
    container: bool,
    network: bool,
    control_failed: bool,
    start_failed: bool,
}
#[derive(Clone, Default)]
struct Runner(Arc<Mutex<State>>);
impl CommandRunner for Runner {
    fn run(&self, args: &[String], _env: &[(&str, &str)]) -> Result<CommandOutput, String> {
        let mut state = self.0.lock().unwrap();
        state.commands.push(args.to_vec());
        let mut answer = String::new();
        let mut success = true;
        match args[0].as_str() {
            "info" => {
                answer = "27.0".into();
                success = !state.control_failed;
            }
            "ps" if args.iter().any(|arg| arg.contains("label=")) => {
                if state.container {
                    answer.clone_from(&state.name);
                }
            }
            "ps" => {}
            "image" => {
                answer = "sha256:stage".into();
            }
            "network" if args[1] == "ls" => {
                if state.network {
                    answer.clone_from(&state.name);
                }
            }
            "network" if args[1] == "create" => {
                state.network = true;
                state.name = args.last().unwrap().clone();
                state.owner = args
                    .iter()
                    .find_map(|arg| arg.strip_prefix(&format!("{LABEL}=")))
                    .unwrap()
                    .into();
            }
            "network" if args[1] == "rm" => state.network = false,
            "inspect" | "network" => {
                answer =
                    json!([{"Config":{"Labels":{LABEL:state.owner}},"Labels":{LABEL:state.owner}}])
                        .to_string();
            }
            "run" => {
                state.container = !state.start_failed;
                success = !state.start_failed;
            }
            "rm" => {
                state.container = false;
            }
            "exec" => {
                if args
                    .iter()
                    .any(|arg| arg == "issue" || arg.contains("console.log(j.token)"))
                {
                    answer = "la_sk_fixture".into();
                } else if args.iter().any(|arg| arg.contains("const out=")) {
                    answer = "{}".into();
                }
            }
            other => panic!("unexpected staging operation: {other}: {args:?}"),
        }
        drop(state);
        Ok(CommandOutput {
            success,
            stdout: answer.into_bytes(),
            stderr: Vec::new(),
        })
    }
}
fn args() -> DeployArgs {
    // Never recycle an ephemeral port between parallel tests: these mocked
    // deployments do not keep a real listener open after creation.
    static NEXT: std::sync::atomic::AtomicU16 = std::sync::atomic::AtomicU16::new(26000);
    let mut args = super::super::tests::deploy_args();
    args.staging = Some("fixture".into());
    args.port = (0..128)
        .find_map(|_| {
            let port = NEXT.fetch_add(1, std::sync::atomic::Ordering::Relaxed);
            TcpListener::bind(("127.0.0.1", port)).ok().map(|_| port)
        })
        .expect("available fixture port");
    args
}

fn execute(args: &DeployArgs, root: &Path, image: &str, docker: &Docker) -> Result<Value, String> {
    // Resource fixtures must not depend on space occupied by CI compilation.
    execute_with_disk(args, root, image, docker, |_| Ok(2 * 1024 * 1024))
}

#[test]
fn insufficient_or_unverifiable_capacity_refuses_before_candidate_resources() {
    for capacity in [Ok(1024 * 1024 - 1), Err("capacity unavailable".into())] {
        let parent = tempfile::tempdir().unwrap();
        let root = parent.path().join("stage");
        let runner = Runner::default();
        let docker = Docker::with_runner(runner.clone());
        let error = execute_with_disk(&args(), &root, "router:1.2.3", &docker, |_| {
            capacity.clone()
        })
        .unwrap_err();
        assert!(
            error.contains("disk") || error.contains("capacity"),
            "{error}"
        );
        assert!(!root.join("data").exists());
        let state = runner.0.lock().unwrap();
        assert!(!state.network && !state.container);
        assert!(
            state
                .commands
                .iter()
                .all(|args| args[0] == "info" || args[0] == "ps")
        );
        drop(state);
    }
}
#[test]
fn creation_status_and_cleanup_touch_only_journal_owned_resources() {
    let parent = tempfile::tempdir().unwrap();
    let root = parent.path().join("stage");
    let runner = Runner::default();
    let docker = Docker::with_runner(runner.clone());
    let mut args = args();
    assert_eq!(
        execute(&args, &root, "router:1.2.3", &docker).unwrap()["serving_health"],
        "healthy"
    );
    args.status = true;
    let before = runner.0.lock().unwrap().commands.len();
    execute(&args, &root, "router:1.2.3", &docker).unwrap();
    assert!(
        !runner.0.lock().unwrap().commands[before..]
            .iter()
            .any(|args| matches!(args[0].as_str(), "run" | "rm" | "pull" | "build"))
    );
    args.status = false;
    args.down = true;
    execute(&args, &root, "router:1.2.3", &docker).unwrap();
    let state = runner.0.lock().unwrap();
    assert!(!state.container && !state.network);
    for command in &state.commands {
        assert!(!command.iter().any(|arg| arg == super::super::RELAY
            || arg == super::super::LEGACY
            || arg == super::super::NETWORK
            || arg == "prune"));
    }
    drop(state);
    assert!(root.join("data").is_dir());
}
#[test]
fn collision_failure_and_pending_cleanup_never_recover_other_deployments() {
    let parent = tempfile::tempdir().unwrap();
    let root = parent.path().join("stage");
    let runner = Runner::default();
    let docker = Docker::with_runner(runner.clone());
    let mut args = args();
    let listener = TcpListener::bind(("127.0.0.1", args.port)).unwrap();
    assert!(
        execute(&args, &root, "router:1.2.3", &docker)
            .unwrap_err()
            .contains("listener")
    );
    drop(listener);
    runner.0.lock().unwrap().start_failed = true;
    let error = execute(&args, &root, "router:1.2.3", &docker).unwrap_err();
    assert!(error.contains("start failed"), "{error}");
    let lock = OpenOptions::new()
        .read(true)
        .write(true)
        .open(root.join("operation.lock"))
        .unwrap();
    lock.try_lock().unwrap();
    args.down = true;
    assert!(
        execute(&args, &root, "router:1.2.3", &docker)
            .unwrap_err()
            .contains("pending")
    );
    drop(lock);
    execute(&args, &root, "router:1.2.3", &docker).unwrap();
}
#[test]
fn stalled_control_and_healthy_http_are_distinct_and_status_is_read_only() {
    let parent = tempfile::tempdir().unwrap();
    let root = parent.path().join("stage");
    let runner = Runner::default();
    let docker = Docker::with_runner(runner.clone());
    let mut args = args();
    execute(&args, &root, "router:1.2.3", &docker).unwrap();
    runner.0.lock().unwrap().control_failed = true;
    let listener = TcpListener::bind(("127.0.0.1", args.port)).unwrap();
    let server = std::thread::spawn(move || {
        let (mut stream, _) = listener.accept().unwrap();
        // Read the probe's request before answering: closing a socket with
        // unread input resets the connection on Windows, and the reset can
        // reach the probe before the 200 it was sent.
        let mut request = Vec::new();
        let mut byte = [0; 1];
        while !request.ends_with(b"\r\n\r\n")
            && std::io::Read::read(&mut stream, &mut byte).unwrap_or(0) == 1
        {
            request.push(byte[0]);
        }
        std::io::Write::write_all(&mut stream, b"HTTP/1.0 200 OK\r\nContent-Length: 0\r\n\r\n")
            .unwrap();
    });
    args.status = true;
    let report = execute(&args, &root, "router:1.2.3", &docker).unwrap();
    server.join().unwrap();
    assert_eq!(report["serving_health"], "healthy");
    assert_eq!(report["control_health"], "unavailable");
    assert_eq!(report["port_ownership"], "not-proven");
    assert_eq!(report["parity"], false);
}

#[test]
fn absent_status_and_foreign_data_never_adopt_or_create_resources() {
    let parent = tempfile::tempdir().unwrap();
    let root = parent.path().join("stage");
    let runner = Runner::default();
    let docker = Docker::with_runner(runner.clone());
    let mut args = args();
    args.status = true;
    assert_eq!(
        execute(&args, &root, "router:1.2.3", &docker).unwrap()["status"],
        "absent"
    );
    assert!(!root.exists());
    args.status = false;
    fs::create_dir(&root).unwrap();
    fs::write(root.join("primary-project"), b"retain").unwrap();
    assert!(
        execute(&args, &root, "router:1.2.3", &docker)
            .unwrap_err()
            .contains("pre-existing")
    );
    assert_eq!(fs::read(root.join("primary-project")).unwrap(), b"retain");
    assert!(!root.join(MARKER).exists());
    assert!(runner.0.lock().unwrap().commands.is_empty());
}

#[test]
fn journal_drift_and_foreign_network_refuse_before_candidate_mutation() {
    let parent = tempfile::tempdir().unwrap();
    let root = parent.path().join("stage");
    let runner = Runner::default();
    let docker = Docker::with_runner(runner.clone());
    let args = args();
    execute(&args, &root, "router:1.2.3", &docker).unwrap();
    let journal = fs::read(root.join(MARKER)).unwrap();
    let mut changed: Value = serde_json::from_slice(&journal).unwrap();
    changed["root"] = json!(parent.path().join("primary"));
    fs::write(root.join(MARKER), changed.to_string()).unwrap();
    runner.0.lock().unwrap().commands.clear();
    assert!(
        execute(&args, &root, "router:1.2.3", &docker)
            .unwrap_err()
            .contains("identity/root")
    );
    assert!(runner.0.lock().unwrap().commands.is_empty());
    fs::write(root.join(MARKER), journal).unwrap();
    assert!(
        execute(&args, &root, "router:2.0.0", &docker)
            .unwrap_err()
            .contains("image/port")
    );
    {
        let mut state = runner.0.lock().unwrap();
        state.container = false;
        state.owner = "foreign-owner".into();
    }
    assert!(
        execute(&args, &root, "router:1.2.3", &docker)
            .unwrap_err()
            .contains("unowned resource")
    );
    let state = runner.0.lock().unwrap();
    assert!(state.network);
    assert!(
        !state
            .commands
            .iter()
            .any(|args| matches!(args[0].as_str(), "run" | "rm"))
    );
    drop(state);
}

#[test]
fn cleanup_refuses_unexpected_container_names_and_foreign_network_owners() {
    let parent = tempfile::tempdir().unwrap();
    let root = parent.path().join("stage");
    let runner = Runner::default();
    let docker = Docker::with_runner(runner.clone());
    let mut args = args();
    execute(&args, &root, "router:1.2.3", &docker).unwrap();
    {
        let mut state = runner.0.lock().unwrap();
        state.name = super::super::RELAY.into();
        state.commands.clear();
    }
    args.down = true;
    assert!(
        execute(&args, &root, "router:1.2.3", &docker)
            .unwrap_err()
            .contains("unexpected staging resource")
    );
    {
        let mut state = runner.0.lock().unwrap();
        assert!(state.container);
        state.container = false;
        state.name = "router-stage-fixture".into();
        state.owner = "foreign-owner".into();
    }
    assert!(
        execute(&args, &root, "router:1.2.3", &docker)
            .unwrap_err()
            .contains("network cleanup ownership")
    );
    let state = runner.0.lock().unwrap();
    assert!(state.network);
    assert!(
        !state
            .commands
            .iter()
            .any(|args| args[0] == "rm" || (args[0] == "network" && args[1] == "rm"))
    );
    drop(state);
}
