//! The container runtime boundary, so converge logic is testable without Docker.
//!
//! Every step in [`crate::deploy`] reaches the outside world only through
//! [`ContainerRuntime`]. That keeps the interesting part — the order of checks,
//! what counts as converged, which failures are the deployment's fault —
//! exercisable in milliseconds against a fake, while the real implementation
//! stays a thin, auditable shell around `docker`.
//!
//! The split matters for correctness, not just speed: the properties worth
//! pinning are things like "a second run performs no actions" and "a stopped
//! container is restored", which need many runs from many starting states. A
//! suite that can only express them against a real daemon expresses few of them.

use std::process::Command;
use std::time::Duration;

/// What a container is doing, as far as the runtime can tell.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ContainerState {
    /// No container by that name.
    Absent,
    /// Exists and is running. Not the same as answering — see
    /// [`ContainerRuntime::health`].
    Running,
    /// Exists and is not running.
    Stopped,
}

impl ContainerState {
    #[must_use]
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Absent => "absent",
            Self::Running => "running",
            Self::Stopped => "stopped",
        }
    }
}

/// How a container should be created.
#[derive(Debug, Clone)]
pub struct RunSpec {
    pub name: String,
    pub image: String,
    /// Host port published to the container's listener.
    pub port: u16,
    /// `(host, container, read_only)` mounts.
    ///
    /// The credential mount is read-only and the data directory is separate,
    /// because the request log cannot live on a read-only mount — a lesson the
    /// issue records as a real failure (#570).
    pub mounts: Vec<(String, String, bool)>,
    /// Environment passed to the container. Values are never logged.
    pub env: Vec<(String, String)>,
    pub label: String,
}

/// Everything the deployment needs from a container runtime.
pub trait ContainerRuntime: Send + Sync {
    /// Fail if the runtime is unusable, with an operator-readable reason.
    fn available(&self) -> Result<String, String>;

    /// State of one container by name.
    fn state(&self, name: &str) -> Result<ContainerState, String>;

    /// Create and start a container.
    fn run(&self, spec: &RunSpec) -> Result<(), String>;

    /// Start an existing, stopped container.
    fn start(&self, name: &str) -> Result<(), String>;

    /// Remove a container, running or not.
    fn remove(&self, name: &str) -> Result<(), String>;

    /// Whether an image exists locally.
    fn image_present(&self, image: &str) -> Result<bool, String>;

    /// Build `image` from `context`, at an immutable ref.
    fn build(&self, image: &str, context: &str) -> Result<(), String>;

    /// The image a container was created from, for proving `--status` changed
    /// nothing.
    fn container_image(&self, name: &str) -> Result<Option<String>, String>;

    /// `GET /api/health` against the published port, following the rule that a
    /// container can be `Up` and not answer.
    fn health(&self, port: u16) -> bool;

    /// Names of containers holding `port`, so a stray instance is found before
    /// traffic silently goes to an old version.
    fn listeners_on(&self, port: u16) -> Result<Vec<String>, String>;

    /// Run a command inside the container, for the token and status steps.
    fn exec(&self, name: &str, arguments: &[&str]) -> Result<String, String>;
}

/// The real runtime: a thin shell around the `docker` CLI.
#[derive(Debug, Default)]
pub struct Docker;

impl Docker {
    fn docker(arguments: &[&str]) -> Result<String, String> {
        let output = Command::new("docker").args(arguments).output();
        let output = match output {
            Ok(output) => output,
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => {
                return Err("Docker is not installed".to_string());
            }
            Err(error) => return Err(error.to_string()),
        };
        if output.status.success() {
            return Ok(String::from_utf8_lossy(&output.stdout).trim().to_string());
        }
        Err(compact(&String::from_utf8_lossy(&output.stderr)))
    }
}

/// Collapse a multi-line command error into one readable line.
fn compact(text: &str) -> String {
    text.split_whitespace().collect::<Vec<_>>().join(" ")
}

/// Turn a failed `docker info` into an instruction an operator can act on.
///
/// Three different problems arrive as one failure — no binary, no permission, no
/// daemon — and each has a different remedy, so they are distinguished rather
/// than all reported as "Docker is broken".
fn explain_unavailable(error: String) -> String {
    let lowered = error.to_ascii_lowercase();
    if lowered.contains("permission denied") {
        "permission denied while connecting to Docker; add this user to the Docker group"
            .to_string()
    } else if lowered.contains("not installed") {
        error
    } else {
        format!("the Docker daemon is not running or unreachable: {error}")
    }
}

/// Read a container's state out of `docker inspect`'s answer.
///
/// A missing container is [`ContainerState::Absent`] rather than an error: it is
/// the ordinary starting state of a first deployment, and treating it as a
/// failure meant the container that should then have been created never was
/// (issue #333).
fn interpret_state(answer: Result<String, String>) -> Result<ContainerState, String> {
    match answer {
        Ok(rendered) if rendered.trim() == "running" => Ok(ContainerState::Running),
        Ok(_) => Ok(ContainerState::Stopped),
        Err(error) if is_absent(&error) => Ok(ContainerState::Absent),
        Err(error) => Err(error),
    }
}

/// Container names from a `docker ps --format {{.Names}}` listing.
fn parse_names(rendered: &str) -> Vec<String> {
    rendered
        .lines()
        .map(str::trim)
        .filter(|name| !name.is_empty())
        .map(str::to_string)
        .collect()
}

/// The `docker run` argument list for `spec`.
///
/// Separated from spawning the process because this is where the properties that
/// matter live, and they are the ones worth asserting directly: the credential
/// mount carries `:ro`, the data mount does not, and a secret's *value* never
/// becomes an argument — only its name, with the value handed to the child
/// through its environment, so it cannot appear in `ps` or a shell history
/// (issue #572).
fn run_arguments(spec: &RunSpec) -> Vec<String> {
    let mut arguments: Vec<String> = vec![
        "run".into(),
        "-d".into(),
        "--name".into(),
        spec.name.clone(),
        "--label".into(),
        spec.label.clone(),
        "-p".into(),
        format!("127.0.0.1:{}:8080", spec.port),
    ];
    for (host, container, read_only) in &spec.mounts {
        arguments.push("-v".into());
        arguments.push(if *read_only {
            format!("{host}:{container}:ro")
        } else {
            format!("{host}:{container}")
        });
    }
    for (key, _) in &spec.env {
        arguments.push("-e".into());
        arguments.push(key.clone());
    }
    arguments.push(spec.image.clone());
    arguments.push("serve".into());
    arguments
}

impl ContainerRuntime for Docker {
    fn available(&self) -> Result<String, String> {
        Self::docker(&["info", "--format", "{{.ServerVersion}}"]).map_err(explain_unavailable)
    }

    fn state(&self, name: &str) -> Result<ContainerState, String> {
        interpret_state(Self::docker(&[
            "inspect",
            "--format",
            "{{if .State.Running}}running{{else}}stopped{{end}}",
            name,
        ]))
    }

    fn run(&self, spec: &RunSpec) -> Result<(), String> {
        let mut command = Command::new("docker");
        command.args(run_arguments(spec));
        for (key, value) in &spec.env {
            command.env(key, value);
        }
        let output = command.output().map_err(|error| error.to_string())?;
        if output.status.success() {
            Ok(())
        } else {
            Err(compact(&String::from_utf8_lossy(&output.stderr)))
        }
    }

    fn start(&self, name: &str) -> Result<(), String> {
        Self::docker(&["start", name]).map(|_| ())
    }

    fn remove(&self, name: &str) -> Result<(), String> {
        Self::docker(&["rm", "-f", name]).map(|_| ())
    }

    fn image_present(&self, image: &str) -> Result<bool, String> {
        match Self::docker(&["image", "inspect", "--format", "{{.Id}}", image]) {
            Ok(id) => Ok(!id.is_empty()),
            Err(error) if is_absent(&error) => Ok(false),
            Err(error) => Err(error),
        }
    }

    fn build(&self, image: &str, context: &str) -> Result<(), String> {
        Self::docker(&["build", "-t", image, context]).map(|_| ())
    }

    fn container_image(&self, name: &str) -> Result<Option<String>, String> {
        match Self::docker(&["inspect", "--format", "{{.Image}}", name]) {
            Ok(id) => Ok(Some(id)),
            Err(error) if is_absent(&error) => Ok(None),
            Err(error) => Err(error),
        }
    }

    fn health(&self, port: u16) -> bool {
        use std::io::{Read as _, Write as _};

        let Ok(mut stream) = std::net::TcpStream::connect(("127.0.0.1", port)) else {
            return false;
        };
        let _ = stream.set_read_timeout(Some(Duration::from_secs(2)));
        let _ = stream.set_write_timeout(Some(Duration::from_secs(2)));
        if stream
            .write_all(b"GET /api/health HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n")
            .is_err()
        {
            return false;
        }
        let mut response = String::new();
        stream.read_to_string(&mut response).is_ok() && response.starts_with("HTTP/1.1 200")
    }

    fn listeners_on(&self, port: u16) -> Result<Vec<String>, String> {
        let rendered = Self::docker(&[
            "ps",
            "--filter",
            &format!("publish={port}"),
            "--format",
            "{{.Names}}",
        ])?;
        Ok(parse_names(&rendered))
    }

    fn exec(&self, name: &str, arguments: &[&str]) -> Result<String, String> {
        let mut full = vec!["exec", name];
        full.extend_from_slice(arguments);
        Self::docker(&full)
    }
}

/// Whether a Docker error means "that object does not exist".
///
/// Matched case-insensitively because Docker and Docker Desktop disagree on the
/// capitalisation, and reading "does not exist yet" as a hard failure meant the
/// container that should then have been created never was (issue #333).
fn is_absent(error: &str) -> bool {
    let lowered = error.to_ascii_lowercase();
    lowered.contains("no such object")
        || lowered.contains("no such container")
        || lowered.contains("no such image")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn docker_absence_messages_are_recognised_in_either_spelling() {
        // Docker Desktop lowercases this; the capitalised form is Docker's own.
        assert!(is_absent("Error: No such object: router-deploy"));
        assert!(is_absent("error: no such container: router-deploy"));
        assert!(is_absent("No such image: ghcr.io/x:1"));
        // A daemon that is down is *not* an absent container: treating it as one
        // would report a deployment as "needs creating" while nothing can run.
        assert!(!is_absent("Cannot connect to the Docker daemon"));
    }

    #[test]
    fn multiline_command_errors_collapse_to_one_line() {
        assert_eq!(
            compact("failed:\n  because\n  reasons"),
            "failed: because reasons"
        );
    }

    fn spec() -> RunSpec {
        RunSpec {
            name: "router-deploy".into(),
            image: "ghcr.io/link-assistant/router:1.9.0".into(),
            port: 18080,
            mounts: vec![
                ("/host/creds".into(), "/data/claude".into(), true),
                ("/host/data".into(), "/data/router".into(), false),
            ],
            env: vec![
                ("TOKEN_SECRET".into(), "a-real-signing-secret".into()),
                ("STORAGE_POLICY".into(), "text".into()),
            ],
            label: "com.link-assistant.router.deploy=1".into(),
        }
    }

    #[test]
    fn the_credential_mount_is_read_only_and_the_data_mount_is_not() {
        let arguments = run_arguments(&spec());

        // The request log cannot live on a read-only mount, so the two are
        // separate and only one carries `:ro`.
        assert!(
            arguments.contains(&"/host/creds:/data/claude:ro".to_string()),
            "{arguments:?}"
        );
        assert!(
            arguments.contains(&"/host/data:/data/router".to_string()),
            "{arguments:?}"
        );
        assert!(
            !arguments.contains(&"/host/data:/data/router:ro".to_string()),
            "the data mount stays writable: {arguments:?}"
        );
    }

    #[test]
    fn a_secret_value_never_becomes_a_command_line_argument() {
        let spec = spec();
        let arguments = run_arguments(&spec);

        // Argv is visible in `ps` and in shell history. Only the variable's name
        // is passed; the value reaches the child through its environment.
        assert!(
            arguments.contains(&"TOKEN_SECRET".to_string()),
            "the name is passed: {arguments:?}"
        );
        assert!(
            !arguments
                .iter()
                .any(|argument| argument.contains("a-real-signing-secret")),
            "the value is not: {arguments:?}"
        );
        // And it is still handed over, so the container can actually sign.
        assert!(
            spec.env
                .iter()
                .any(|(key, value)| key == "TOKEN_SECRET" && value == "a-real-signing-secret")
        );
    }

    #[test]
    fn the_port_is_published_on_loopback_only() {
        let arguments = run_arguments(&spec());

        // A local deployment must not be reachable from the network merely
        // because it was started: it holds a subscription credential.
        assert!(
            arguments.contains(&"127.0.0.1:18080:8080".to_string()),
            "{arguments:?}"
        );
    }

    #[test]
    fn the_container_is_labelled_and_named_and_serves() {
        let arguments = run_arguments(&spec());

        // The label is what proves a container is this command's to manage, so
        // `--down` cannot remove somebody else's.
        assert!(arguments.contains(&"com.link-assistant.router.deploy=1".to_string()));
        assert!(arguments.contains(&"router-deploy".to_string()));
        assert_eq!(
            arguments.last().map(String::as_str),
            Some("serve"),
            "the image's command comes last: {arguments:?}"
        );
        assert_eq!(
            arguments.first().map(String::as_str),
            Some("run"),
            "{arguments:?}"
        );
    }

    #[test]
    fn an_unusable_runtime_is_explained_by_its_actual_cause() {
        // Three problems, three remedies. Reporting them all as "Docker is
        // broken" would leave an operator guessing which one they have.
        assert!(
            explain_unavailable("Got permission denied while trying to connect".into())
                .contains("Docker group")
        );
        assert_eq!(
            explain_unavailable("Docker is not installed".into()),
            "Docker is not installed",
            "the precise message is kept rather than wrapped"
        );
        let down = explain_unavailable("Cannot connect to the Docker daemon".into());
        assert!(down.contains("not running or unreachable"), "{down}");
        assert!(
            down.contains("Cannot connect"),
            "the daemon's own words survive: {down}"
        );
    }

    #[test]
    fn a_missing_container_reads_as_absent_rather_than_as_an_error() {
        // The ordinary starting state of a first deployment. Reading it as a
        // failure meant the container that should then have been created never
        // was (issue #333).
        assert_eq!(
            interpret_state(Err("Error: No such object: router-deploy".into())),
            Ok(ContainerState::Absent)
        );
        assert_eq!(
            interpret_state(Ok("running".into())),
            Ok(ContainerState::Running)
        );
        assert_eq!(
            interpret_state(Ok("stopped".into())),
            Ok(ContainerState::Stopped)
        );
        // Trailing whitespace from the format string must not read as stopped.
        assert_eq!(
            interpret_state(Ok("running\n".into())),
            Ok(ContainerState::Running)
        );
        // A genuinely broken daemon stays an error: it is not an absent
        // container, and creating one would not fix it.
        assert!(interpret_state(Err("daemon went away".into())).is_err());
    }

    #[test]
    fn a_listing_yields_one_name_per_line_and_ignores_blanks() {
        assert_eq!(
            parse_names("router-deploy\nsomething-else\n"),
            vec!["router-deploy".to_string(), "something-else".to_string()]
        );
        // An empty listing means nothing else holds the port, which must not
        // read as one container with an empty name.
        assert!(parse_names("").is_empty());
        assert!(parse_names("\n  \n").is_empty());
    }

    #[test]
    fn container_states_have_stable_spellings() {
        // Reported to operators and asserted on by tests, so they are contract.
        assert_eq!(ContainerState::Absent.as_str(), "absent");
        assert_eq!(ContainerState::Running.as_str(), "running");
        assert_eq!(ContainerState::Stopped.as_str(), "stopped");
    }
}
