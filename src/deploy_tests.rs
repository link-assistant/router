//! Converge properties of `router deploy`, against a fake container runtime.
//!
//! The acceptance tests in the issue are statements about *sequences* of runs
//! from many starting states: a second run performs no action, a container
//! stopped out of band is restored, `--status` changes nothing, a deployment with
//! no credential still converges. Those need dozens of runs, so they are pinned
//! here against a fake; `tests/deploy_docker_test.rs` proves the same command
//! works against a real Docker daemon (issues #570, #572).

use std::sync::Mutex;

use crate::deploy::runtime::{ContainerRuntime, ContainerState, RunSpec};
use crate::deploy::{CONTAINER, Plan, converge, down, immutable_ref};

/// A container runtime in memory, recording every call.
///
/// The recording is the point: "performs no actions" is a claim about calls
/// made, not about the final state, and a fake that only tracks state cannot
/// distinguish a converged run from one that restarted a healthy container.
#[derive(Default)]
struct FakeRuntime {
    state: Mutex<FakeState>,
}

#[derive(Default)]
struct FakeState {
    available: Option<String>,
    container: Option<ContainerState>,
    image_present: bool,
    healthy: bool,
    other_listeners: Vec<String>,
    exec_result: Option<Result<String, String>>,
    /// Labels of tokens the deployment has issued so far.
    issued_labels: Vec<String>,
    calls: Vec<String>,
}

impl FakeRuntime {
    fn healthy_deployment() -> Self {
        let fake = Self::default();
        {
            let mut state = fake.state.lock().expect("fake state");
            state.available = Some("29.0.0".to_string());
            state.container = Some(ContainerState::Running);
            state.image_present = true;
            state.healthy = true;
            state.exec_result = Some(Ok("la_sk_example".to_string()));
        }
        fake
    }

    /// A machine with a runtime and an image, but nothing deployed.
    fn empty() -> Self {
        let fake = Self::default();
        {
            let mut state = fake.state.lock().expect("fake state");
            state.available = Some("29.0.0".to_string());
            state.container = None;
            state.image_present = true;
            // A created container answers: the readiness step polls, so a fake
            // that never becomes healthy would only test the timeout.
            state.healthy = true;
            state.exec_result = Some(Ok("la_sk_example".to_string()));
        }
        fake
    }

    fn set(&self, mutate: impl FnOnce(&mut FakeState)) {
        mutate(&mut self.state.lock().expect("fake state"));
    }

    fn calls(&self) -> Vec<String> {
        self.state.lock().expect("fake state").calls.clone()
    }

    /// Calls that change the deployment, as opposed to inspecting it.
    fn mutations(&self) -> Vec<String> {
        self.calls()
            .into_iter()
            .filter(|call| {
                ["run:", "start:", "remove:", "build:"]
                    .iter()
                    .any(|verb| call.starts_with(verb))
            })
            .collect()
    }

    fn record(&self, call: impl Into<String>) {
        self.state
            .lock()
            .expect("fake state")
            .calls
            .push(call.into());
    }
}

impl ContainerRuntime for FakeRuntime {
    fn available(&self) -> Result<String, String> {
        self.record("available");
        self.state
            .lock()
            .expect("fake state")
            .available
            .clone()
            .ok_or_else(|| "the Docker daemon is not running or unreachable".to_string())
    }

    fn state(&self, name: &str) -> Result<ContainerState, String> {
        self.record(format!("state:{name}"));
        Ok(self
            .state
            .lock()
            .expect("fake state")
            .container
            .unwrap_or(ContainerState::Absent))
    }

    fn run(&self, spec: &RunSpec) -> Result<(), String> {
        self.record(format!("run:{}", spec.name));
        self.set(|state| state.container = Some(ContainerState::Running));
        Ok(())
    }

    fn start(&self, name: &str) -> Result<(), String> {
        self.record(format!("start:{name}"));
        self.set(|state| state.container = Some(ContainerState::Running));
        Ok(())
    }

    fn remove(&self, name: &str) -> Result<(), String> {
        self.record(format!("remove:{name}"));
        self.set(|state| state.container = None);
        Ok(())
    }

    fn image_present(&self, image: &str) -> Result<bool, String> {
        self.record(format!("image_present:{image}"));
        Ok(self.state.lock().expect("fake state").image_present)
    }

    fn build(&self, image: &str, _context: &str) -> Result<(), String> {
        self.record(format!("build:{image}"));
        self.set(|state| state.image_present = true);
        Ok(())
    }

    fn container_image(&self, name: &str) -> Result<Option<String>, String> {
        self.record(format!("container_image:{name}"));
        Ok(Some("sha256:fake".to_string()))
    }

    fn health(&self, port: u16) -> bool {
        self.record(format!("health:{port}"));
        self.state.lock().expect("fake state").healthy
    }

    fn listeners_on(&self, port: u16) -> Result<Vec<String>, String> {
        self.record(format!("listeners_on:{port}"));
        Ok(self
            .state
            .lock()
            .expect("fake state")
            .other_listeners
            .clone())
    }

    fn exec(&self, name: &str, arguments: &[&str]) -> Result<String, String> {
        let verb = arguments.get(2).copied().unwrap_or("");
        self.record(format!("exec:{name}:{verb}"));
        if verb == "list" {
            // The store as the deployment would report it: whatever has been
            // minted so far, so the token step can converge on its own output.
            let state = self.state.lock().expect("fake state");
            return Ok(state.issued_labels.join("\n"));
        }
        let result = self
            .state
            .lock()
            .expect("fake state")
            .exec_result
            .clone()
            .unwrap_or_else(|| Ok(String::new()));
        if result.is_ok() {
            self.set(|state| state.issued_labels.push("deploy".to_string()));
        }
        result
    }
}

/// A plan whose directories exist, so the credential-home step is not the thing
/// under test in every case.
fn plan(root: &std::path::Path) -> Plan {
    let plan = Plan::local(root, "ghcr.io/link-assistant/router:1.9.0", "deploy-secret");
    std::fs::create_dir_all(&plan.credential_home).expect("credential home");
    std::fs::create_dir_all(&plan.data_home).expect("data home");
    plan
}

#[test]
fn a_converged_deployment_performs_no_actions_on_a_second_run() {
    let root = tempfile::tempdir().expect("root");
    let runtime = FakeRuntime::healthy_deployment();
    let plan = plan(root.path());

    let first = converge(&runtime, &plan);
    assert!(first.converged(), "{:?}", first.failure());

    // The property that makes the command usable as a fixture: a test may call
    // it unconditionally, and a converged deployment is untouched.
    let before = runtime.mutations().len();
    let second = converge(&runtime, &plan);
    assert!(second.converged(), "{:?}", second.failure());
    assert!(
        !second.changed_anything(),
        "a converged run reports no action: {:?}",
        second
            .steps
            .iter()
            .map(super::deploy::step::StepReport::line)
            .collect::<Vec<_>>()
    );
    assert_eq!(
        runtime.mutations().len(),
        before,
        "a converged run mutates nothing: {:?}",
        runtime.mutations()
    );
    // Specifically including the client token: minting one per run would both
    // break this property and grow the token store without bound.
    let issues = runtime
        .calls()
        .iter()
        .filter(|call| call.ends_with(":issue"))
        .count();
    assert_eq!(issues, 1, "the token is minted once, not per run");
}

#[test]
fn an_empty_machine_is_brought_to_a_healthy_deployment() {
    let root = tempfile::tempdir().expect("root");
    let runtime = FakeRuntime::empty();

    let report = converge(&runtime, &plan(root.path()));

    assert!(report.converged(), "{:?}", report.failure());
    assert!(report.changed_anything());
    assert!(
        runtime.mutations().contains(&format!("run:{CONTAINER}")),
        "the container is created: {:?}",
        runtime.mutations()
    );
}

#[test]
fn a_container_stopped_out_of_band_is_restored_rather_than_recreated() {
    let root = tempfile::tempdir().expect("root");
    let runtime = FakeRuntime::healthy_deployment();
    runtime.set(|state| state.container = Some(ContainerState::Stopped));

    let report = converge(&runtime, &plan(root.path()));

    assert!(report.converged(), "{:?}", report.failure());
    assert!(
        runtime.mutations().contains(&format!("start:{CONTAINER}")),
        "it is started: {:?}",
        runtime.mutations()
    );
    // Recreating would discard the volume's identity — and with it the issued
    // tokens and the request log — for a container that only needed starting.
    assert!(
        !runtime.mutations().contains(&format!("run:{CONTAINER}")),
        "it is not recreated: {:?}",
        runtime.mutations()
    );
}

#[test]
fn status_changes_nothing_even_when_the_deployment_is_absent() {
    let root = tempfile::tempdir().expect("root");
    let runtime = FakeRuntime::empty();
    runtime.set(|state| {
        state.container = None;
        state.image_present = false;
        state.healthy = false;
    });
    let mut plan = plan(root.path());
    plan.status_only = true;
    plan.build_context = Some(root.path().to_path_buf());

    let report = converge(&runtime, &plan);

    assert!(
        !report.changed_anything(),
        "--status is a report: {:?}",
        runtime.mutations()
    );
    assert!(
        runtime.mutations().is_empty(),
        "--status makes no mutating call: {:?}",
        runtime.mutations()
    );
    // And it still says what is missing, rather than reporting a healthy void.
    let skips = report.skips();
    assert!(
        skips.iter().any(|(step, _)| *step == "container"),
        "the absent container is reported: {skips:?}"
    );
}

#[test]
fn a_deployment_with_no_credential_still_converges_and_says_what_it_skipped() {
    let root = tempfile::tempdir().expect("root");
    let runtime = FakeRuntime::empty();
    // The deployment is up, but it holds no subscription, so it can mint no
    // client token. That is a state, not a failure: a withdrawn subscription
    // once made a deployment impossible to update at all.
    runtime.set(|state| {
        state.exec_result = Some(Err("no subscription credential is configured".to_string()));
    });

    let report = converge(&runtime, &plan(root.path()));

    assert!(
        report.converged(),
        "an empty deployment converges: {:?}",
        report.failure()
    );
    let skips = report.skips();
    let token_skip = skips
        .iter()
        .find(|(step, _)| *step == "client-token")
        .expect("the token step reports itself skipped");
    assert!(
        token_skip.1.contains("subscription"),
        "the skip names what was missing: {token_skip:?}"
    );
}

#[test]
fn a_stray_instance_on_the_port_fails_the_run_and_names_it() {
    let root = tempfile::tempdir().expect("root");
    let runtime = FakeRuntime::healthy_deployment();
    runtime.set(|state| state.other_listeners = vec!["someone-elses-router".to_string()]);

    let report = converge(&runtime, &plan(root.path()));

    let failure = report.failure().expect("a stray instance fails the run");
    assert_eq!(failure.step, "stray-instance");
    assert!(
        failure.found.contains("someone-elses-router"),
        "the failure names the stray container: {failure}"
    );
    // A failing prerequisite stops the run: continuing would produce a second,
    // confusing failure caused by the first.
    assert!(
        !runtime
            .mutations()
            .iter()
            .any(|call| call.starts_with("run:")),
        "nothing is created while a stray holds the port: {:?}",
        runtime.mutations()
    );
}

#[test]
fn our_own_container_on_the_port_is_not_a_stray() {
    let root = tempfile::tempdir().expect("root");
    let runtime = FakeRuntime::healthy_deployment();
    runtime.set(|state| state.other_listeners = vec![CONTAINER.to_string()]);

    let report = converge(&runtime, &plan(root.path()));

    assert!(
        report.converged(),
        "the deployment's own listener is expected: {:?}",
        report.failure()
    );
}

#[test]
fn an_unreachable_runtime_is_reported_once_rather_than_per_step() {
    let root = tempfile::tempdir().expect("root");
    let runtime = FakeRuntime::default();

    let report = converge(&runtime, &plan(root.path()));

    let failure = report.failure().expect("no runtime fails the run");
    assert_eq!(failure.step, "runtime");
    assert_eq!(
        report.steps.len(),
        1,
        "the run stops at the first failure: {:?}",
        report
            .steps
            .iter()
            .map(super::deploy::step::StepReport::line)
            .collect::<Vec<_>>()
    );
}

#[test]
fn a_failure_names_the_step_what_was_expected_and_why_it_matters() {
    let root = tempfile::tempdir().expect("root");
    let runtime = FakeRuntime::default();

    let report = converge(&runtime, &plan(root.path()));
    let failure = report.failure().expect("a failure");

    // The shape issue #572 asks for: a test asserts on the report, not on a
    // stack trace, so an operator who did not write the step can act on it.
    assert!(!failure.step.is_empty());
    assert!(!failure.expected.is_empty());
    assert!(!failure.found.is_empty());
    assert!(
        failure.purpose.len() > 20,
        "the purpose explains what the check protects: {}",
        failure.purpose
    );
    let rendered = failure.to_string();
    for part in ["expected:", "found:", "why:"] {
        assert!(rendered.contains(part), "{rendered}");
    }
}

#[test]
fn every_step_reports_its_own_duration() {
    let root = tempfile::tempdir().expect("root");
    let runtime = FakeRuntime::healthy_deployment();

    let report = converge(&runtime, &plan(root.path()));

    // Per-step timing is how "deployment is slow" becomes actionable at all.
    assert!(!report.steps.is_empty());
    for step in &report.steps {
        assert!(
            step.line().contains("ms") || step.failed(),
            "{}",
            step.line()
        );
    }
    assert!(report.total() >= std::time::Duration::ZERO);
}

#[test]
fn a_moving_image_reference_is_refused_with_the_reason() {
    for moving in [
        "ghcr.io/link-assistant/router:latest",
        "ghcr.io/link-assistant/router:main",
        "ghcr.io/link-assistant/router",
    ] {
        let error = immutable_ref(moving).expect_err("a moving ref is refused");
        assert!(
            error.contains("moving") || error.contains("latest"),
            "{moving}: {error}"
        );
    }
    // A release tag and a digest are both immutable enough to deploy.
    immutable_ref("ghcr.io/link-assistant/router:1.9.0").expect("a release tag");
    immutable_ref("ghcr.io/link-assistant/router@sha256:abc").expect("a digest");
}

#[test]
fn a_moving_reference_stops_the_run_before_anything_is_created() {
    let root = tempfile::tempdir().expect("root");
    let runtime = FakeRuntime::empty();
    let mut plan = plan(root.path());
    plan.image = "ghcr.io/link-assistant/router:latest".to_string();

    let report = converge(&runtime, &plan);

    assert_eq!(
        report.failure().expect("refused").step,
        "image-ref",
        "the reference is checked before the deployment is touched"
    );
    assert!(runtime.mutations().is_empty(), "{:?}", runtime.mutations());
}

#[test]
fn an_absent_image_is_built_from_the_given_context() {
    let root = tempfile::tempdir().expect("root");
    let runtime = FakeRuntime::empty();
    runtime.set(|state| state.image_present = false);
    let mut plan = plan(root.path());
    plan.build_context = Some(root.path().to_path_buf());

    let report = converge(&runtime, &plan);

    assert!(report.converged(), "{:?}", report.failure());
    assert!(
        runtime
            .mutations()
            .iter()
            .any(|call| call.starts_with("build:")),
        "{:?}",
        runtime.mutations()
    );
}

#[test]
fn an_absent_image_with_no_build_context_fails_rather_than_guessing() {
    let root = tempfile::tempdir().expect("root");
    let runtime = FakeRuntime::empty();
    runtime.set(|state| state.image_present = false);

    let report = converge(&runtime, &plan(root.path()));

    let failure = report.failure().expect("nothing to run");
    assert_eq!(failure.step, "image");
    assert!(failure.found.contains("no build context"), "{failure}");
}

#[test]
fn readiness_is_polled_over_http_rather_than_trusting_the_container_state() {
    let root = tempfile::tempdir().expect("root");
    let runtime = FakeRuntime::empty();
    // The container runs and never answers: `docker ps` would call this healthy.
    runtime.set(|state| {
        state.container = Some(ContainerState::Running);
        state.healthy = false;
    });
    let mut plan = plan(root.path());
    plan.status_only = true;

    let report = converge(&runtime, &plan);

    assert!(
        runtime
            .calls()
            .iter()
            .any(|call| call.starts_with("health:")),
        "health is probed over HTTP: {:?}",
        runtime.calls()
    );
    let skips = report.skips();
    assert!(
        skips.iter().any(|(step, _)| *step == "readiness"),
        "an Up-but-silent container is reported: {skips:?}"
    );
}

#[test]
fn the_container_mounts_the_credential_home_read_only_and_the_data_home_writable() {
    let root = tempfile::tempdir().expect("root");
    let plan = plan(root.path());

    let spec = crate::deploy::spec_for(&plan);

    let credential = spec
        .mounts
        .iter()
        .find(|(host, _, _)| host == &plan.credential_home.display().to_string())
        .expect("the credential mount");
    assert!(credential.2, "the credential mount is read-only");
    let data = spec
        .mounts
        .iter()
        .find(|(host, _, _)| host == &plan.data_home.display().to_string())
        .expect("the data mount");
    assert!(!data.2, "the data mount is writable");
    // Separate paths: the request log cannot live on the read-only mount, which
    // is exactly the failure the split exists to prevent.
    assert_ne!(credential.1, data.1);
}

#[test]
fn the_run_specification_carries_no_secret_on_the_command_line() {
    let root = tempfile::tempdir().expect("root");
    let plan = plan(root.path());

    let spec = crate::deploy::spec_for(&plan);

    // The value travels in the child's environment; only the *name* is ever an
    // argument, so a secret cannot reach `ps` or a shell history (issue #572).
    let secret = spec
        .env
        .iter()
        .find(|(key, _)| key == "TOKEN_SECRET")
        .expect("the signing secret is passed");
    assert_eq!(secret.1, plan.token_secret);
    assert!(
        !spec.name.contains(&plan.token_secret) && !spec.image.contains(&plan.token_secret),
        "no secret is part of an identifier"
    );
}

#[test]
fn down_refuses_without_consent_and_then_removes_only_its_own_container() {
    let runtime = FakeRuntime::healthy_deployment();

    let refusal = down(&runtime, false).expect_err("removal needs consent");
    assert!(refusal.contains("--yes"), "{refusal}");
    assert!(
        runtime.mutations().is_empty(),
        "a refused removal changes nothing: {:?}",
        runtime.mutations()
    );

    let removed = down(&runtime, true).expect("consented removal");
    assert!(removed.contains(CONTAINER));
    assert_eq!(runtime.mutations(), vec![format!("remove:{CONTAINER}")]);
}

#[test]
fn down_is_idempotent_on_an_absent_deployment() {
    let runtime = FakeRuntime::healthy_deployment();
    runtime.set(|state| state.container = None);

    let message = down(&runtime, true).expect("an absent deployment is not an error");

    assert!(message.contains("already absent"), "{message}");
    assert!(runtime.mutations().is_empty(), "{:?}", runtime.mutations());
}

#[test]
fn a_missing_credential_home_is_created_with_owner_only_access() {
    let root = tempfile::tempdir().expect("root");
    let runtime = FakeRuntime::empty();
    // Deliberately not pre-created, unlike `plan()`.
    let plan = Plan::local(
        &root.path().join("fresh"),
        "ghcr.io/link-assistant/router:1.9.0",
        "deploy-secret",
    );

    let report = converge(&runtime, &plan);

    assert!(report.converged(), "{:?}", report.failure());
    assert!(plan.credential_home.is_dir(), "the mount point exists");
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt as _;
        let mode = std::fs::metadata(&plan.credential_home)
            .expect("metadata")
            .permissions()
            .mode()
            & 0o777;
        assert_eq!(mode, 0o700, "a credential directory is owner-only");
    }
}
