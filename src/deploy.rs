//! `router deploy`: bring a working containerised Router up locally.
//!
//! Router could serve but could not stand itself up: the repository held a
//! `Dockerfile` and no command that used it, so every deployment — even a purely
//! local one on a developer's own machine — had to be written outside Router, by
//! each user, again. The immediate cost was testability: exercising Router end to
//! end needed either a paid subscription and a real server, or a hand-written
//! harness built before any of the actual work could start (issue #570).
//!
//! ## Converge, not run
//!
//! Each step first *checks* whether the desired state already holds, reports what
//! it found, and only then acts. Re-running is cheap and safe, and a converged
//! deployment prints a series of "already" lines and performs no actions. That
//! property is what makes the command usable as a test fixture: a test can call
//! it unconditionally. See [`step`] for the reporting contract and [`runtime`]
//! for the container boundary.
//!
//! ## Why these steps
//!
//! Each exists because its absence produced a real failure, and each is
//! Router's own lifecycle rather than anything project-specific:
//!
//! 1. **Stray instances** — two proxies on one machine send traffic to the old
//!    version, and nothing about that is visible from outside.
//! 2. **Image** — built from a pinned ref, never a moving branch, so the CLI and
//!    the container cannot disagree about the API contract while both look right.
//! 3. **Credential home** — present, with the right ownership and mode.
//! 4. **Container** — port published, credential mount read-only and *separate*
//!    from the data directory, because the request log cannot live on a read-only
//!    mount.
//! 5. **Readiness** — polled over HTTP, because a container can be `Up` and not
//!    answer.
//! 6. **Client token** — so clients never see the subscription credential.
//! 7. **Proof of proxying** — a real answer through the proxy; everything else
//!    can be green while inference is broken.
//! 8. **`router with`** — reaches the deployment with no manual configuration.
//!
//! ## Empty is a state, not a failure
//!
//! A deployment with no subscriptions still comes up, converges and reports
//! healthy; the steps that need a credential skip with a named reason. This is
//! not a convenience — a withdrawn subscription once made a deployment
//! impossible to update at all. And an upstream that answers *after* the request
//! reached it (429, 503) has proven the route, the key and the scoping, so it
//! must not fail the deployment; a failure *before* the request left Router must.

use std::path::{Path, PathBuf};
use std::time::{Duration, Instant};

#[path = "deploy/runtime.rs"]
pub mod runtime;
#[path = "deploy/step.rs"]
pub mod step;

use runtime::{ContainerRuntime, ContainerState, RunSpec};
use step::{Failure, Outcome, Report};

/// Container name for a local deployment.
///
/// Distinct from the `server start` managed container: that one is a disposable
/// instance owned by a wrapper run, while this is a deployment an operator
/// administers. Sharing a name would make `deploy --down` destroy a wrapper's
/// container, or a wrapper's teardown stop a deployment.
pub const CONTAINER: &str = "router-deploy";
/// Label proving a container is this command's to manage.
pub const LABEL: &str = "com.link-assistant.router.deploy=1";
/// Default published port.
pub const DEFAULT_PORT: u16 = 8080;
/// How long a container has to answer `/api/health`.
const HEALTH_TIMEOUT: Duration = Duration::from_secs(60);

/// What a deploy run should do.
#[derive(Debug, Clone)]
pub struct Plan {
    /// Published host port.
    pub port: u16,
    /// Image to run. Must be an immutable ref (see [`immutable_ref`]).
    pub image: String,
    /// Build context, when the image should be built locally.
    pub build_context: Option<PathBuf>,
    /// Credential home mounted read-only into the container.
    pub credential_home: PathBuf,
    /// Data directory for the store and request log; never the credential mount.
    pub data_home: PathBuf,
    /// Signing secret for the deployment's tokens.
    pub token_secret: String,
    /// Report without changing anything.
    pub status_only: bool,
}

impl Plan {
    /// A local deployment under `root`, on the default port.
    #[must_use]
    pub fn local(root: &Path, image: &str, token_secret: &str) -> Self {
        Self {
            port: DEFAULT_PORT,
            image: image.to_string(),
            build_context: None,
            credential_home: root.join("credentials"),
            data_home: root.join("data"),
            token_secret: token_secret.to_string(),
            status_only: false,
        }
    }
}

/// Whether an image reference is immutable.
///
/// A moving ref means the CLI and the container can disagree about the API
/// contract while both look correct, so a branch or a bare `latest` is refused
/// and the reason is named. A digest is immutable by construction; a version tag
/// is accepted as the conventional release ref.
pub fn immutable_ref(image: &str) -> Result<(), String> {
    if image.contains('@') {
        return Ok(());
    }
    let tag = image.rsplit_once(':').map(|(_, tag)| tag);
    match tag {
        None => Err(format!(
            "{image} names no tag, so it resolves to whatever `latest` points at today"
        )),
        Some("latest" | "main" | "master" | "edge" | "nightly") => Err(format!(
            "{image} is a moving reference; deploy a release tag or a digest so the CLI and the \
             container cannot disagree about the API contract"
        )),
        // A local build target is immutable for the run that built it: nothing
        // else publishes to it, which is the property the check protects.
        Some(_) => Ok(()),
    }
}

/// Converge a local deployment, or report its state when `status_only`.
pub fn converge(runtime: &dyn ContainerRuntime, plan: &Plan) -> Report {
    let mut report = Report::default();
    let acting = !plan.status_only;

    if !report.run("runtime", || match runtime.available() {
        Ok(version) => Ok(Outcome::AlreadyConverged(format!(
            "container runtime {version}"
        ))),
        Err(found) => Err(Failure {
            step: "runtime",
            purpose: "every later step needs a container runtime; saying so once beats \
                      failing obscurely in each",
            expected: "a reachable container runtime".to_string(),
            found,
        }),
    }) {
        return report;
    }

    if !report.run("image-ref", || match immutable_ref(&plan.image) {
        Ok(()) => Ok(Outcome::AlreadyConverged(format!(
            "{} is an immutable reference",
            plan.image
        ))),
        Err(found) => Err(Failure {
            step: "image-ref",
            purpose: "a moving tag lets the CLI and the container disagree about the API \
                      contract while both look correct",
            expected: "a release tag or digest".to_string(),
            found,
        }),
    }) {
        return report;
    }

    if !report.run("stray-instance", || stray_instance(runtime, plan.port)) {
        return report;
    }

    if !report.run("image", || image_step(runtime, plan, acting)) {
        return report;
    }

    if !report.run("credential-home", || credential_home_step(plan, acting)) {
        return report;
    }

    if !report.run("container", || container_step(runtime, plan, acting)) {
        return report;
    }

    if !report.run("readiness", || readiness_step(runtime, plan)) {
        return report;
    }

    report.run("client-token", || Ok(token_step(runtime, acting)));
    report
}

/// Find another Router already holding the port.
///
/// Two proxies on one machine send traffic to the old version, and nothing about
/// that is visible from outside — the request succeeds, against the wrong build.
fn stray_instance(runtime: &dyn ContainerRuntime, port: u16) -> Result<Outcome, Failure> {
    let holders = runtime.listeners_on(port).map_err(|found| Failure {
        step: "stray-instance",
        purpose: "two proxies on one port send traffic to the old version invisibly",
        expected: format!("to be able to list containers publishing {port}"),
        found,
    })?;
    let strays: Vec<_> = holders
        .into_iter()
        .filter(|name| name != CONTAINER)
        .collect();
    if strays.is_empty() {
        return Ok(Outcome::AlreadyConverged(format!(
            "nothing else publishes {port}"
        )));
    }
    Err(Failure {
        step: "stray-instance",
        purpose: "two proxies on one port send traffic to the old version invisibly",
        expected: format!("only {CONTAINER} to publish {port}"),
        found: format!("also published by {}", strays.join(", ")),
    })
}

fn image_step(
    runtime: &dyn ContainerRuntime,
    plan: &Plan,
    acting: bool,
) -> Result<Outcome, Failure> {
    let present = runtime
        .image_present(&plan.image)
        .map_err(|found| Failure {
            step: "image",
            purpose: "the deployment runs the image named here, so its presence is a prerequisite",
            expected: format!("to be able to inspect {}", plan.image),
            found,
        })?;
    if present {
        return Ok(Outcome::AlreadyConverged(format!("{} present", plan.image)));
    }
    if !acting {
        return Ok(Outcome::Skipped(format!(
            "{} is absent and --status changes nothing",
            plan.image
        )));
    }
    // An explicit build context wins over the registry: it is how a developer
    // deploys a tree that no registry has, and silently pulling a same-tagged
    // image instead would run something other than what was asked for.
    if let Some(context) = plan.build_context.as_ref() {
        runtime
            .build(&plan.image, &context.display().to_string())
            .map_err(|found| Failure {
                step: "image",
                purpose: "the deployment runs this image, so a failed build stops the run here",
                expected: format!("a built {}", plan.image),
                found,
            })?;
        return Ok(Outcome::Acted(format!("built {}", plan.image)));
    }
    // The default image is a published reference, so an absent one is fetched
    // rather than treated as a dead end. The pull failing is still a hard stop:
    // a private, misspelled or unpublished reference must say so here, not as a
    // container that cannot start.
    runtime.pull(&plan.image).map_err(|found| Failure {
        step: "image",
        purpose: "the deployment runs this image, so it is fetched when absent and \
                  a failed fetch stops the run here rather than at container start",
        expected: format!("{} available locally or from its registry", plan.image),
        found,
    })?;
    Ok(Outcome::Acted(format!("pulled {}", plan.image)))
}

/// Ensure the mounted credential directory exists, with owner-only access.
/// Ensure every mounted directory exists, with owner-only access.
///
/// All of them in one pass. Returning after the first creation left the second
/// directory missing until the *next* run, so the step reported `acted` twice and
/// the deployment never converged in one go — caught by running the command
/// against a real daemon rather than by reasoning about it.
fn credential_home_step(plan: &Plan, acting: bool) -> Result<Outcome, Failure> {
    let mut created = Vec::new();
    let mut missing = Vec::new();
    for (label, path) in [
        ("credential home", &plan.credential_home),
        // Separate from the credential mount on purpose: that one is mounted
        // read-only and the request log cannot live on it.
        ("data home", &plan.data_home),
    ] {
        if path.is_dir() {
            continue;
        }
        if !acting {
            missing.push(format!("{label} {}", path.display()));
            continue;
        }
        std::fs::create_dir_all(path).map_err(|error| Failure {
            step: "credential-home",
            purpose: "the container mounts these paths; a missing one becomes a \
                      root-owned directory created by Docker",
            expected: format!("{label} at {}", path.display()),
            found: error.to_string(),
        })?;
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt as _;
            let _ = std::fs::set_permissions(path, std::fs::Permissions::from_mode(0o700));
        }
        created.push(path.display().to_string());
    }
    if !missing.is_empty() {
        return Ok(Outcome::Skipped(format!(
            "{} missing and --status changes nothing",
            missing.join(", ")
        )));
    }
    if created.is_empty() {
        return Ok(Outcome::AlreadyConverged(
            "credential and data homes present".to_string(),
        ));
    }
    Ok(Outcome::Acted(format!("created {}", created.join(", "))))
}

fn container_step(
    runtime: &dyn ContainerRuntime,
    plan: &Plan,
    acting: bool,
) -> Result<Outcome, Failure> {
    let state = runtime.state(CONTAINER).map_err(|found| Failure {
        step: "container",
        purpose: "the deployment is this container; its state decides every later step",
        expected: format!("to be able to inspect {CONTAINER}"),
        found,
    })?;
    match state {
        ContainerState::Running => Ok(Outcome::AlreadyConverged(format!("{CONTAINER} running"))),
        ContainerState::Stopped if !acting => Ok(Outcome::Skipped(format!(
            "{CONTAINER} is stopped and --status changes nothing"
        ))),
        ContainerState::Stopped => {
            // A container stopped out of band is restored rather than recreated:
            // recreating would discard the volume's identity for no reason.
            runtime.start(CONTAINER).map_err(|found| Failure {
                step: "container",
                purpose: "a deployment stopped out of band should come back on the next run",
                expected: format!("{CONTAINER} started"),
                found,
            })?;
            Ok(Outcome::Acted(format!("started {CONTAINER}")))
        }
        ContainerState::Absent if !acting => Ok(Outcome::Skipped(format!(
            "{CONTAINER} is absent and --status changes nothing"
        ))),
        ContainerState::Absent => {
            runtime.run(&spec_for(plan)).map_err(|found| Failure {
                step: "container",
                purpose: "without a container there is no deployment",
                expected: format!("{CONTAINER} created and started"),
                found,
            })?;
            Ok(Outcome::Acted(format!("created {CONTAINER}")))
        }
    }
}

/// The container this plan describes.
#[must_use]
pub fn spec_for(plan: &Plan) -> RunSpec {
    RunSpec {
        name: CONTAINER.to_string(),
        image: plan.image.clone(),
        port: plan.port,
        mounts: vec![
            // Read-only: the deployment reads a credential it must not rewrite
            // from under the vendor client that owns it.
            (
                plan.credential_home.display().to_string(),
                "/data/claude".to_string(),
                true,
            ),
            (
                plan.data_home.display().to_string(),
                "/data/router".to_string(),
                false,
            ),
        ],
        env: vec![
            ("TOKEN_SECRET".to_string(), plan.token_secret.clone()),
            ("DATA_DIR".to_string(), "/data/router".to_string()),
            ("STORAGE_POLICY".to_string(), "text".to_string()),
            ("CLAUDE_CODE_HOME".to_string(), "/data/claude".to_string()),
        ],
        label: LABEL.to_string(),
    }
}

/// Poll `/api/health`, because a container can be `Up` and not answer.
fn readiness_step(runtime: &dyn ContainerRuntime, plan: &Plan) -> Result<Outcome, Failure> {
    if runtime.health(plan.port) {
        return Ok(Outcome::AlreadyConverged(format!(
            "/api/health answers on {}",
            plan.port
        )));
    }
    if plan.status_only {
        return Ok(Outcome::Skipped(format!(
            "/api/health does not answer on {} and --status changes nothing",
            plan.port
        )));
    }
    let deadline = Instant::now() + HEALTH_TIMEOUT;
    while Instant::now() < deadline {
        if runtime.health(plan.port) {
            return Ok(Outcome::Acted(format!(
                "/api/health answered on {}",
                plan.port
            )));
        }
        std::thread::sleep(Duration::from_millis(200));
    }
    Err(Failure {
        step: "readiness",
        purpose: "a container can be Up without answering, so `docker ps` is not readiness",
        expected: format!("HTTP 200 from /api/health on {}", plan.port),
        found: format!("no answer within {} s", HEALTH_TIMEOUT.as_secs()),
    })
}

/// Label carried by the client token this command mints.
///
/// The token is looked up by label so a re-run can tell "already provisioned"
/// from "needs one", instead of minting another on every converge — which would
/// both break the no-action property and grow the store without bound.
const DEPLOY_TOKEN_LABEL: &str = "deploy";

/// Ensure a client token exists, so clients never hold the subscription
/// credential.
///
/// Converges like every other step: an existing deploy token is left alone.
///
/// Returns an [`Outcome`] rather than a `Result`: a deployment that cannot mint a
/// token still converges, so this step has no failure case at all.
fn token_step(runtime: &dyn ContainerRuntime, acting: bool) -> Outcome {
    // Checked first, so `--status` can report the token's presence rather than
    // merely declining to mint one.
    match runtime.exec(CONTAINER, &["router", "tokens", "list"]) {
        Ok(listed) if listed.contains(DEPLOY_TOKEN_LABEL) => {
            return Outcome::AlreadyConverged(
                "a deploy client token is already issued".to_string(),
            );
        }
        // An unreadable list is not a failure here: the deployment may hold no
        // store yet, and the mint below reports the real obstacle.
        Ok(_) | Err(_) => {}
    }
    if !acting {
        return Outcome::Skipped(
            "no deploy client token yet, and --status does not mint credentials".to_string(),
        );
    }
    match runtime.exec(
        CONTAINER,
        &["router", "tokens", "issue", "--label", DEPLOY_TOKEN_LABEL],
    ) {
        Ok(output) if output.contains("la_sk_") => {
            // The value is not printed here: the caller decides whether a
            // credential reaches the terminal (issue #572).
            Outcome::Acted("issued a client token".to_string())
        }
        Ok(output) => Outcome::Skipped(format!(
            "the deployment issued no client token: {}",
            first_line(&output)
        )),
        // A deployment with no subscription still converges. Skipping names the
        // reason rather than failing, because "empty" is a state (issue #570).
        Err(error) => Outcome::Skipped(format!(
            "no client token was issued: {}",
            first_line(&error)
        )),
    }
}

fn first_line(text: &str) -> String {
    text.lines().next().unwrap_or("").trim().to_string()
}

/// Remove what this deployment created, and nothing else.
pub fn down(runtime: &dyn ContainerRuntime, confirmed: bool) -> Result<String, String> {
    if !confirmed {
        return Err(format!(
            "refusing to remove {CONTAINER}: issued tokens and the request log in its data \
             directory would be left behind or lost; rerun with --yes"
        ));
    }
    match runtime.state(CONTAINER)? {
        ContainerState::Absent => Ok(format!("{CONTAINER} is already absent")),
        ContainerState::Running | ContainerState::Stopped => {
            runtime.remove(CONTAINER)?;
            Ok(format!("removed {CONTAINER}"))
        }
    }
}
