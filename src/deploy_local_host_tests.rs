//! Issue #626: `router deploy --mode host` moves the stable listener to a
//! host Router that reads the Keychain login in place, and back.

use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::process::ExitCode;
use std::sync::Mutex;

use link_assistant_router::cli::{ClaudeCredentials, DeployMode};

use super::super::run_assessed;
use super::status_tests::mutations;
use super::{FakeRunner, RELAY, deploy_args};
use crate::deploy_local::docker::Docker;
use crate::deploy_local::host_runtime::{ClaudeLogin, HostRuntime, Launch};
use crate::deploy_local::secret::fingerprint;
use crate::deploy_local::{Provision, State};

const SECRET: &str = "integration-test-signing-secret";
const EXECUTABLE: &str = "/opt/router/bin/router";
const CANDIDATE_PORT: u16 = 49_152;

struct Process {
    port: u16,
    secret: String,
}

#[derive(Default)]
struct HostWorld {
    next_pid: u32,
    processes: HashMap<u32, Process>,
    spawned_ports: Vec<u16>,
    logs: Vec<PathBuf>,
    /// Ports whose process never becomes healthy.
    unhealthy: Vec<u16>,
    /// Replaces the verdict on a token probe.
    probe_status: Option<u16>,
    probes: usize,
    /// Another program already answering on the stable port.
    foreign_listener: bool,
}

#[derive(Default)]
struct FakeHost(Mutex<HostWorld>);

impl FakeHost {
    fn world(&self) -> std::sync::MutexGuard<'_, HostWorld> {
        self.0.lock().unwrap()
    }
}

impl HostRuntime for FakeHost {
    fn executable(&self) -> Result<PathBuf, String> {
        Ok(PathBuf::from(EXECUTABLE))
    }

    fn spawn(&self, launch: &Launch<'_>) -> Result<u32, String> {
        let mut world = self.world();
        assert_eq!(launch.executable, Path::new(EXECUTABLE));
        assert!(launch.data_dir.ends_with("data"));
        world.next_pid += 1;
        let pid = 1000 + world.next_pid;
        world.spawned_ports.push(launch.port);
        world.logs.push(launch.log.to_path_buf());
        world.processes.insert(
            pid,
            Process {
                port: launch.port,
                secret: launch.token_secret.to_string(),
            },
        );
        drop(world);
        Ok(pid)
    }

    fn serving(&self, pid: u32, executable: &Path) -> bool {
        executable == Path::new(EXECUTABLE) && self.world().processes.contains_key(&pid)
    }

    fn terminate(&self, pid: u32) -> Result<(), String> {
        self.world().processes.remove(&pid);
        Ok(())
    }

    fn status(&self, port: u16, path: &str, bearer: Option<&str>) -> Option<u16> {
        let mut world = self.world();
        if world.foreign_listener && port == 8080 {
            return Some(404);
        }
        let secret = world
            .processes
            .values()
            .find(|process| process.port == port)?
            .secret
            .clone();
        if path == "/api/health" {
            return Some(if world.unhealthy.contains(&port) {
                503
            } else {
                200
            });
        }
        world.probes += 1;
        let verified = bearer
            .and_then(|token| token.strip_prefix(link_assistant_router::token::TOKEN_PREFIX))
            .is_some_and(|jwt| {
                jsonwebtoken::decode::<link_assistant_router::token::TokenClaims>(
                    jwt,
                    &jsonwebtoken::DecodingKey::from_secret(secret.as_bytes()),
                    &jsonwebtoken::Validation::default(),
                )
                .is_ok()
            });
        Some(
            world
                .probe_status
                .unwrap_or(if verified { 403 } else { 401 }),
        )
    }

    fn free_port(&self) -> Result<u16, String> {
        Ok(CANDIDATE_PORT)
    }

    fn user_id(&self) -> Option<u32> {
        None
    }

    fn claude_login(&self) -> ClaudeLogin {
        ClaudeLogin::Keychain
    }

    fn token_inventory(&self, _executable: &Path, _data_dir: &Path) -> Result<String, String> {
        Ok("[]".to_string())
    }
}

fn run(
    runner: &FakeRunner,
    host: &FakeHost,
    root: &Path,
    configure: impl FnOnce(&mut link_assistant_router::cli::DeployArgs),
) -> ExitCode {
    let mut args = deploy_args();
    configure(&mut args);
    run_assessed(
        &args,
        root,
        "router:1",
        SECRET,
        Docker::with_runner(runner.clone()),
        &|_, _| Provision::Isolated,
        host,
    )
}

fn host_mode(args: &mut link_assistant_router::cli::DeployArgs) {
    args.mode = Some(DeployMode::Host);
}

/// A converged container deployment with an issued client token.
fn installed(root: &Path) -> (FakeRunner, String) {
    let runner = FakeRunner::default();
    let host = FakeHost::default();
    assert_eq!(run(&runner, &host, root, |_| {}), ExitCode::SUCCESS);
    runner.0.lock().unwrap().token_inventory = r#"[{"id":"laptop","label":"laptop","issued_at":1,"expires_at":4102444800,"revoked":false}]"#.into();
    runner.0.lock().unwrap().commands.clear();
    let backend = State::new(root).current().unwrap().unwrap();
    (runner, backend)
}

fn running(runner: &FakeRunner, name: &str) -> bool {
    runner.0.lock().unwrap().containers[name].running
}

fn no_secret_leaks(runner: &FakeRunner, root: &Path) {
    for argument in runner.0.lock().unwrap().commands.iter().flatten() {
        assert!(!argument.contains(SECRET), "{argument}");
    }
    for entry in std::fs::read_dir(root.join("state")).unwrap() {
        let path = entry.unwrap().path();
        if path.is_file() {
            let bytes = std::fs::read(&path).unwrap();
            assert!(
                !String::from_utf8_lossy(&bytes).contains(SECRET),
                "{}",
                path.display()
            );
        }
    }
}

#[test]
fn the_plan_is_read_only() {
    let root = tempfile::tempdir().unwrap();
    let (runner, backend) = installed(root.path());
    let host = FakeHost::default();

    let code = run(&runner, &host, root.path(), |args| {
        host_mode(args);
        args.status = true;
    });

    assert_eq!(code, ExitCode::SUCCESS);
    assert!(mutations(&runner.0.lock().unwrap()).is_empty());
    assert!(host.world().spawned_ports.is_empty());
    assert!(State::new(root.path()).host().unwrap().is_none());
    assert!(running(&runner, &RELAY) && running(&runner, &backend));
}

#[test]
fn open_connections_and_live_runs_refuse_the_move_before_anything_changes() {
    let root = tempfile::tempdir().unwrap();
    let (runner, backend) = installed(root.path());
    let host = FakeHost::default();
    runner
        .0
        .lock()
        .unwrap()
        .connection_counts
        .insert(backend, [2, 2, 2].into());

    assert_eq!(
        run(&runner, &host, root.path(), host_mode),
        ExitCode::from(2)
    );
    assert!(mutations(&runner.0.lock().unwrap()).is_empty());
    assert!(host.world().spawned_ports.is_empty());

    runner.0.lock().unwrap().connection_counts.clear();
    runner.0.lock().unwrap().token_inventory = r#"[{"id":"run-1","label":"claude","issued_at":1,"expires_at":4102444800,"revoked":false,"ephemeral":true,"run_lease_expires_at":4102444800,"model_policy":{"allowed_models":["glm-5"]}}]"#.into();
    assert_eq!(
        run(&runner, &host, root.path(), host_mode),
        ExitCode::from(2)
    );
    assert!(mutations(&runner.0.lock().unwrap()).is_empty());
    assert!(host.world().spawned_ports.is_empty());
    assert!(State::new(root.path()).host().unwrap().is_none());
}

#[test]
fn a_validated_candidate_takes_over_the_stable_listener_and_the_containers_come_back() {
    let root = tempfile::tempdir().unwrap();
    let (runner, backend) = installed(root.path());
    let host = FakeHost::default();

    assert_eq!(
        run(&runner, &host, root.path(), host_mode),
        ExitCode::SUCCESS
    );

    // Candidate first on an ephemeral port, then the stable port.
    assert_eq!(host.world().spawned_ports, [CANDIDATE_PORT, 8080]);
    assert_eq!(host.world().probes, 2);
    assert_eq!(host.world().processes.len(), 1, "the candidate was stopped");
    let record = State::new(root.path()).host().unwrap().unwrap();
    assert_eq!(record.port, 8080);
    assert_eq!(record.token_secret, fingerprint(SECRET));
    assert_eq!(record.previous_backend.as_deref(), Some(backend.as_str()));
    // Stopped, not removed, and the relay pointer is untouched.
    assert!(!running(&runner, &RELAY) && !running(&runner, &backend));
    assert_eq!(
        State::new(root.path()).current().unwrap().as_deref(),
        Some(backend.as_str())
    );

    // A rerun without a mode keeps host mode and changes nothing.
    runner.0.lock().unwrap().commands.clear();
    assert_eq!(run(&runner, &host, root.path(), |_| {}), ExitCode::SUCCESS);
    assert_eq!(host.world().spawned_ports.len(), 2);
    assert!(mutations(&runner.0.lock().unwrap()).is_empty());
    assert_eq!(
        run(&runner, &host, root.path(), |args| args.status = true),
        ExitCode::SUCCESS
    );

    // The rollback command restores the same containers.
    let code = run(&runner, &host, root.path(), |args| {
        args.mode = Some(DeployMode::Container);
    });
    assert_eq!(code, ExitCode::SUCCESS);
    assert!(running(&runner, &RELAY) && running(&runner, &backend));
    assert!(host.world().processes.is_empty());
    assert!(State::new(root.path()).host().unwrap().is_none());
    assert_eq!(
        State::new(root.path()).current().unwrap().as_deref(),
        Some(backend.as_str())
    );
    no_secret_leaks(&runner, root.path());
}

#[test]
fn a_candidate_rejecting_the_deployment_tokens_changes_nothing() {
    let root = tempfile::tempdir().unwrap();
    let (runner, backend) = installed(root.path());
    let host = FakeHost::default();
    host.world().probe_status = Some(401);

    assert_eq!(
        run(&runner, &host, root.path(), host_mode),
        ExitCode::from(1)
    );

    assert_eq!(host.world().spawned_ports, [CANDIDATE_PORT]);
    assert!(host.world().processes.is_empty());
    assert!(mutations(&runner.0.lock().unwrap()).is_empty());
    assert!(running(&runner, &RELAY) && running(&runner, &backend));
    assert!(State::new(root.path()).host().unwrap().is_none());
}

#[test]
fn a_failed_start_on_the_stable_port_restarts_the_relay() {
    let root = tempfile::tempdir().unwrap();
    let (runner, backend) = installed(root.path());
    let host = FakeHost::default();
    host.world().unhealthy.push(8080);

    assert_eq!(
        run(&runner, &host, root.path(), host_mode),
        ExitCode::from(1)
    );

    assert_eq!(host.world().spawned_ports, [CANDIDATE_PORT, 8080]);
    assert!(host.world().processes.is_empty());
    assert!(running(&runner, &RELAY) && running(&runner, &backend));
    assert!(State::new(root.path()).host().unwrap().is_none());
    no_secret_leaks(&runner, root.path());
}

#[test]
fn host_mode_without_containers_down_and_refusals() {
    let root = tempfile::tempdir().unwrap();
    let runner = FakeRunner::default();
    let host = FakeHost::default();

    // Selecting a container login makes no sense for the host Router.
    let code = run(&runner, &host, root.path(), |args| {
        host_mode(args);
        args.claude_credentials = Some(ClaudeCredentials::Share);
    });
    assert_eq!(code, ExitCode::from(2));

    // Something else answering on the port is never replaced.
    host.world().foreign_listener = true;
    assert_eq!(
        run(&runner, &host, root.path(), host_mode),
        ExitCode::from(2)
    );
    host.world().foreign_listener = false;
    assert!(host.world().spawned_ports.is_empty());

    assert_eq!(
        run(&runner, &host, root.path(), host_mode),
        ExitCode::SUCCESS
    );
    assert_eq!(host.world().spawned_ports, [8080]);
    assert!(runner.0.lock().unwrap().containers.is_empty());
    assert!(
        State::new(root.path())
            .host()
            .unwrap()
            .unwrap()
            .previous_backend
            .is_none()
    );

    assert_eq!(
        run(&runner, &host, root.path(), |args| args.down = true),
        ExitCode::from(2)
    );
    assert_eq!(host.world().processes.len(), 1);
    let code = run(&runner, &host, root.path(), |args| {
        args.down = true;
        args.yes = true;
    });
    assert_eq!(code, ExitCode::SUCCESS);
    assert!(host.world().processes.is_empty());
    assert!(State::new(root.path()).host().unwrap().is_none());
    no_secret_leaks(&runner, root.path());
}

#[test]
fn the_return_plan_is_read_only() {
    let root = tempfile::tempdir().unwrap();
    let (runner, backend) = installed(root.path());
    let host = FakeHost::default();
    assert_eq!(
        run(&runner, &host, root.path(), host_mode),
        ExitCode::SUCCESS
    );
    runner.0.lock().unwrap().commands.clear();

    let code = run(&runner, &host, root.path(), |args| {
        args.mode = Some(DeployMode::Container);
        args.status = true;
    });

    assert_eq!(code, ExitCode::SUCCESS);
    assert!(mutations(&runner.0.lock().unwrap()).is_empty());
    assert_eq!(host.world().processes.len(), 1);
    assert!(State::new(root.path()).host().unwrap().is_some());
    assert!(!running(&runner, &RELAY) && !running(&runner, &backend));
}

#[test]
fn a_relay_failing_on_return_leaves_the_host_router_serving() {
    let root = tempfile::tempdir().unwrap();
    let (runner, backend) = installed(root.path());
    let host = FakeHost::default();
    assert_eq!(
        run(&runner, &host, root.path(), host_mode),
        ExitCode::SUCCESS
    );
    let before = State::new(root.path()).host().unwrap().unwrap();
    // The backend becomes healthy; the relay never does.
    runner.0.lock().unwrap().health_results = [true, false, false].into();

    let code = run(&runner, &host, root.path(), |args| {
        args.mode = Some(DeployMode::Container);
    });

    assert_eq!(code, ExitCode::from(1));
    assert!(!running(&runner, &RELAY));
    let after = State::new(root.path()).host().unwrap().unwrap();
    assert_ne!(after.pid, before.pid, "the host Router was restarted");
    assert_eq!(after.previous_backend.as_deref(), Some(backend.as_str()));
    assert!(host.serving(after.pid, Path::new(EXECUTABLE)));
    assert_eq!(host.world().spawned_ports, [CANDIDATE_PORT, 8080, 8080]);
    no_secret_leaks(&runner, root.path());
}

#[test]
fn leaving_a_host_deployment_without_containers() {
    let root = tempfile::tempdir().unwrap();
    let runner = FakeRunner::default();
    let host = FakeHost::default();
    assert_eq!(
        run(&runner, &host, root.path(), host_mode),
        ExitCode::SUCCESS
    );

    let code = run(&runner, &host, root.path(), |args| {
        args.mode = Some(DeployMode::Container);
        args.status = true;
    });
    assert_eq!(code, ExitCode::SUCCESS);
    assert_eq!(host.world().processes.len(), 1);

    // A new container cannot claim the host's Keychain access. Refuse first.
    let code = run(&runner, &host, root.path(), |args| {
        args.mode = Some(DeployMode::Container);
    });
    assert_ne!(code, ExitCode::SUCCESS);
    assert_eq!(host.world().processes.len(), 1);
    let code = run(&runner, &host, root.path(), |args| {
        args.mode = Some(DeployMode::Container);
        args.accept_access_loss = true;
    });
    assert_eq!(code, ExitCode::SUCCESS);
    assert!(host.world().processes.is_empty());
    assert!(State::new(root.path()).host().unwrap().is_none());
    let backend = State::new(root.path()).current().unwrap().unwrap();
    assert!(running(&runner, &RELAY) && running(&runner, &backend));
    no_secret_leaks(&runner, root.path());
}

/// Issue #658: request logs past the checkpoint budget do not block a move,
/// and a covered file past it is a blocker `--status` names before the run.
#[test]
fn the_plan_predicts_the_data_checkpoint() {
    let root = tempfile::tempdir().unwrap();
    let (runner, _) = installed(root.path());
    let host = FakeHost::default();
    let logs = root.path().join("data/requests/laptop");
    std::fs::create_dir_all(&logs).unwrap();
    std::fs::File::create(logs.join("requests.lino"))
        .unwrap()
        .set_len(300 * 1024 * 1024)
        .unwrap();
    let status = |runner: &FakeRunner| {
        run(runner, &host, root.path(), |args| {
            host_mode(args);
            args.status = true;
        })
    };
    assert_eq!(status(&runner), ExitCode::SUCCESS);

    let sessions = root.path().join("data/sessions");
    std::fs::create_dir_all(&sessions).unwrap();
    std::fs::File::create(sessions.join("huge.lino"))
        .unwrap()
        .set_len(300 * 1024 * 1024)
        .unwrap();
    assert_eq!(status(&runner), ExitCode::from(1));
    assert_eq!(
        run(&runner, &host, root.path(), host_mode),
        ExitCode::from(2)
    );
    assert!(mutations(&runner.0.lock().unwrap()).is_empty());
    assert!(host.world().spawned_ports.is_empty());
}

/// Issue #659: without `TOKEN_SECRET`, a host serving this build is neither
/// "not converged" nor given a `start-host` step.
#[test]
fn status_without_the_secret_reports_unknown_convergence_and_no_plan() {
    let root = tempfile::tempdir().unwrap();
    let runner = FakeRunner::default();
    let host = FakeHost::default();
    assert_eq!(
        run(&runner, &host, root.path(), host_mode),
        ExitCode::SUCCESS
    );
    let mut status = super::coordinator(runner.clone(), root.path(), "router:1", 8080, false);
    let (steps, convergence) = status.host_status_summary(&host).unwrap();
    assert!(steps.is_empty());
    assert_eq!(convergence, "converged=true");

    let placeholder = link_assistant_router::token_secret::placeholder("status");
    status.token_secret = &placeholder;
    let (steps, convergence) = status.host_status_summary(&host).unwrap();
    assert!(steps.is_empty(), "{steps:?}");
    assert!(
        convergence.starts_with("converged=unknown reason=\"TOKEN_SECRET was not supplied"),
        "{convergence}"
    );
    let code = run_assessed(
        &{
            let mut args = deploy_args();
            host_mode(&mut args);
            args.status = true;
            args
        },
        root.path(),
        "router:1",
        &placeholder,
        Docker::with_runner(runner),
        &|_, _| Provision::Isolated,
        &host,
    );
    assert_eq!(code, ExitCode::SUCCESS);
    assert_eq!(host.world().processes.len(), 1);
}
