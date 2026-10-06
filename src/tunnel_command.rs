//! `router tunnel up|status|down --server TARGET` (issue #682).
//!
//! Reaches a remote Router from this machine over an SSH local forward bound
//! to `127.0.0.1` only. The forward runs either as the tunnel companion
//! container (`--via docker`, restarted by Docker's `unless-stopped` policy)
//! or as a local `ssh -L` under a small supervisor loop that reconnects after
//! a drop (`--via ssh`). The far side's host key is pinned: `up` requires
//! `--ssh-known-hosts` and runs with `StrictHostKeyChecking=yes`, never
//! `accept-new`. `docker` and `ssh` are found on `PATH`.
//!
//! `up` and `status` check `/api/health` and, with a client token in
//! `LINK_ASSISTANT_ROUTER_TOKEN`, an authorized `/v1/models` through the
//! tunnel. The token is sent as a header only; it is never in any argv.

use std::path::{Path, PathBuf};
use std::process::{ExitCode, Stdio};
use std::time::Duration;

use clap::{Args, Subcommand, ValueEnum};
use serde::{Deserialize, Serialize};

/// The client token `up` and `status` authorize `/v1/models` with.
pub const TOKEN_ENV: &str = "LINK_ASSISTANT_ROUTER_TOKEN";

/// The tunnel companion image built from `docker/tunnel/Dockerfile`.
pub const DEFAULT_IMAGE: &str = "link-assistant-router-tunnel";

/// Reconnects a dropped `ssh -L`; the arguments arrive as `"$@"`.
const SUPERVISOR: &str = "while :; do \"$@\"; sleep 5; done";

#[derive(Debug, Args)]
pub struct TunnelArgs {
    #[command(subcommand)]
    pub op: TunnelOp,
}

#[derive(Debug, Subcommand)]
pub enum TunnelOp {
    /// Start the forward (a no-op when it already runs), then check it.
    Up(TunnelTarget),
    /// Report whether the forward runs and the Router answers through it.
    Status(TunnelTarget),
    /// Stop the forward and forget it.
    Down(TunnelTarget),
}

/// How the forward runs.
#[derive(Clone, Copy, Debug, Default, Deserialize, Eq, PartialEq, Serialize, ValueEnum)]
#[serde(rename_all = "kebab-case")]
pub enum Via {
    /// A local `ssh -L`, reconnected by a supervisor loop.
    #[default]
    Ssh,
    /// The tunnel companion container on the host network.
    Docker,
}

#[derive(Clone, Debug, Args)]
pub struct TunnelTarget {
    /// SSH destination (`user@host`; `--via ssh` also accepts a config alias).
    #[arg(long, value_name = "TARGET")]
    pub server: String,
    /// The loopback port on this machine.
    #[arg(long, default_value_t = 8080)]
    pub local_port: u16,
    /// The Router's loopback port on the server.
    #[arg(long, default_value_t = 8080)]
    pub remote_port: u16,
    /// SSH port on the server.
    #[arg(long)]
    pub ssh_port: Option<u16>,
    /// Private key for the server (required with `--via docker`).
    #[arg(long, value_name = "FILE")]
    pub ssh_identity: Option<PathBuf>,
    /// Pinned `known_hosts` file for the server (required by `up`).
    #[arg(long, value_name = "FILE")]
    pub ssh_known_hosts: Option<PathBuf>,
    #[arg(long, value_enum, default_value_t)]
    pub via: Via,
    /// Tunnel companion image for `--via docker`.
    #[arg(long, default_value = DEFAULT_IMAGE)]
    pub image: String,
    /// Seconds `up` waits for the Router to answer through the tunnel.
    #[arg(long, default_value_t = 30)]
    pub wait: u64,
}

/// What `up` started, so `status` and `down` find it.
#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
struct Record {
    via: Via,
    server: String,
    local_port: u16,
    remote_port: u16,
    /// The supervisor's process group (`--via ssh`).
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pid: Option<u32>,
    /// The container name (`--via docker`).
    #[serde(default, skip_serializing_if = "Option::is_none")]
    container: Option<String>,
}

/// A name for the forward that is safe in a file and container name. A short
/// hash of the exact server keeps `a@b.c` and `a-b-c` apart.
#[must_use]
pub fn tunnel_name(server: &str, local_port: u16) -> String {
    use sha2::Digest as _;
    let digest = sha2::Sha256::digest(server.as_bytes());
    let sanitized: String = server
        .chars()
        .map(|c| if c.is_ascii_alphanumeric() { c } else { '-' })
        .collect();
    format!(
        "router-tunnel-{sanitized}-{}-{local_port}",
        hex::encode(&digest[..4])
    )
}

fn state_dir() -> Result<PathBuf, String> {
    crate::operation_context::var_os("HOME")
        .filter(|home| !home.is_empty())
        .map(|home| {
            PathBuf::from(home)
                .join(".link-assistant-router")
                .join("tunnels")
        })
        .ok_or_else(|| "HOME is not set; the tunnel state location is unknown".to_string())
}

fn pinned(target: &TunnelTarget) -> Result<&Path, String> {
    let known = target.ssh_known_hosts.as_deref().ok_or(
        "--ssh-known-hosts is required: the server's host key is pinned, never accepted on first use",
    )?;
    match std::fs::metadata(known) {
        Ok(metadata) if metadata.len() > 0 => Ok(known),
        _ => Err(format!(
            "{} must be a readable, non-empty `known_hosts` file pinning the server's host key",
            known.display()
        )),
    }
}

fn forward_spec(target: &TunnelTarget) -> String {
    format!(
        "127.0.0.1:{}:127.0.0.1:{}",
        target.local_port, target.remote_port
    )
}

/// The `ssh` argv for `--via ssh`; paths and ports only, never a secret.
///
/// # Errors
///
/// When the host key is not pinned.
pub fn ssh_arguments(target: &TunnelTarget) -> Result<Vec<String>, String> {
    let known = pinned(target)?;
    let mut arguments = vec!["-N".to_string()];
    if let Some(port) = target.ssh_port {
        arguments.extend(["-p".to_string(), port.to_string()]);
    }
    if let Some(identity) = &target.ssh_identity {
        arguments.extend([
            "-i".to_string(),
            identity.display().to_string(),
            "-o".to_string(),
            "IdentitiesOnly=yes".to_string(),
        ]);
    }
    for option in [
        "BatchMode=yes".to_string(),
        "ExitOnForwardFailure=yes".to_string(),
        "StrictHostKeyChecking=yes".to_string(),
        format!("UserKnownHostsFile={}", known.display()),
        "GlobalKnownHostsFile=/dev/null".to_string(),
        "GatewayPorts=no".to_string(),
        "ServerAliveInterval=30".to_string(),
        "ServerAliveCountMax=3".to_string(),
    ] {
        arguments.extend(["-o".to_string(), option]);
    }
    arguments.extend([
        "-L".to_string(),
        forward_spec(target),
        "--".to_string(),
        target.server.clone(),
    ]);
    Ok(arguments)
}

/// The `docker run` argv for `--via docker`; paths and ports only.
///
/// The container shares the host network so its `127.0.0.1` listener is
/// this machine's loopback; nothing is published with `-p`.
///
/// # Errors
///
/// When the host key is not pinned, there is no identity, or the server is
/// not `user@host`.
pub fn docker_arguments(target: &TunnelTarget, name: &str) -> Result<Vec<String>, String> {
    let known = pinned(target)?;
    let identity = target
        .ssh_identity
        .as_deref()
        .ok_or("--via docker needs --ssh-identity to mount into the companion")?;
    let (user, host) = target
        .server
        .split_once('@')
        .filter(|(user, host)| !user.is_empty() && !host.is_empty())
        .ok_or("--via docker needs --server user@host")?;
    let absolute = |path: &Path| {
        std::path::absolute(path)
            .map(|path| path.display().to_string())
            .map_err(|error| format!("could not resolve {}: {error}", path.display()))
    };
    let mut arguments: Vec<String> = [
        "run",
        "-d",
        "--name",
        name,
        "--restart",
        "unless-stopped",
        "--network",
        "host",
        "--label",
        "link-assistant.router.tunnel=forward",
    ]
    .map(str::to_string)
    .to_vec();
    // The key is mounted as it is on the host, usually 0600 and owned by the
    // caller: run the companion as that owner so it can read it. The image
    // gives such a user a passwd entry at start (ssh needs one).
    if let Some((uid, gid)) = owner(identity).filter(|(uid, _)| *uid != 0) {
        arguments.extend([
            "--user".to_string(),
            format!("{uid}:{gid}"),
            "--group-add".to_string(),
            "0".to_string(),
        ]);
    }
    for (variable, value) in [
        ("TUNNEL_MODE", "forward".to_string()),
        ("TUNNEL_SSH_HOST", host.to_string()),
        ("TUNNEL_SSH_USER", user.to_string()),
        ("TUNNEL_SSH_PORT", target.ssh_port.unwrap_or(22).to_string()),
        ("TUNNEL_LOCAL_PORT", target.local_port.to_string()),
        ("TUNNEL_TARGET_PORT", target.remote_port.to_string()),
        ("TUNNEL_SSH_KEY", "/run/secrets/ssh-key".to_string()),
        ("TUNNEL_KNOWN_HOSTS", "/run/secrets/known-hosts".to_string()),
    ] {
        arguments.extend(["-e".to_string(), format!("{variable}={value}")]);
    }
    arguments.extend([
        "-v".to_string(),
        format!("{}:/run/secrets/ssh-key:ro", absolute(identity)?),
        "-v".to_string(),
        format!("{}:/run/secrets/known-hosts:ro", absolute(known)?),
        target.image.clone(),
    ]);
    Ok(arguments)
}

/// The owner of `path` as `(uid, gid)`; `None` off Unix or when unreadable.
fn owner(path: &Path) -> Option<(u32, u32)> {
    #[cfg(unix)]
    {
        use std::os::unix::fs::MetadataExt as _;
        std::fs::metadata(path)
            .ok()
            .map(|metadata| (metadata.uid(), metadata.gid()))
    }
    #[cfg(not(unix))]
    {
        let _ = path;
        None
    }
}

/// Whether `pid` still runs the supervisor named `name`, so a pid the system
/// has since reused for another process is never signalled. When neither
/// `/proc` nor `ps` can tell, the recorded pid is trusted.
fn is_supervisor(pid: u32, name: &str) -> bool {
    if let Ok(command_line) = std::fs::read(format!("/proc/{pid}/cmdline")) {
        return command_line
            .split(|byte| *byte == 0)
            .any(|argument| argument == name.as_bytes());
    }
    match crate::operation_context::process_output(
        crate::operation_context::command("ps")
            .args(["-o", "args=", "-p", &pid.to_string()])
            .stdin(Stdio::null())
            .stderr(Stdio::null()),
    ) {
        Ok(output) if output.status.success() => {
            String::from_utf8_lossy(&output.stdout).contains(name)
        }
        // `ps` exits non-zero when no such process exists.
        Ok(_) => false,
        Err(_) => true,
    }
}

fn output(program: &str, arguments: &[String]) -> Result<String, String> {
    let output = crate::operation_context::process_output(
        crate::operation_context::command(program)
            .args(arguments)
            .stdin(Stdio::null()),
    )
    .map_err(|error| format!("could not run {program}: {error}"))?;
    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
    } else {
        Err(format!(
            "{program} {} failed: {}",
            arguments.first().map_or("", String::as_str),
            String::from_utf8_lossy(&output.stderr).trim()
        ))
    }
}

fn alive(record: &Record) -> bool {
    match record.via {
        Via::Ssh => record.pid.is_some_and(|pid| {
            is_supervisor(pid, &tunnel_name(&record.server, record.local_port))
                && crate::operation_context::process_output(
                    crate::operation_context::command("kill")
                        .args(["-0", &pid.to_string()])
                        .stderr(Stdio::null()),
                )
                .map(|output| output.status)
                .is_ok_and(|status| status.success())
        }),
        Via::Docker => record.container.as_ref().is_some_and(|name| {
            output(
                "docker",
                &[
                    "inspect".to_string(),
                    "--format".to_string(),
                    "{{.State.Running}}".to_string(),
                    name.clone(),
                ],
            )
            .is_ok_and(|running| running == "true")
        }),
    }
}

fn read_record(path: &Path) -> Option<Record> {
    serde_json::from_slice(&std::fs::read(path).ok()?).ok()
}

fn start(target: &TunnelTarget, name: &str, directory: &Path) -> Result<Record, String> {
    let mut record = Record {
        via: target.via,
        server: target.server.clone(),
        local_port: target.local_port,
        remote_port: target.remote_port,
        pid: None,
        container: None,
    };
    match target.via {
        Via::Docker => {
            let arguments = docker_arguments(target, name)?;
            // A stopped companion of the same name would refuse the run.
            let _ = output(
                "docker",
                &["rm".to_string(), "-f".to_string(), name.to_string()],
            );
            output("docker", &arguments)?;
            record.container = Some(name.to_string());
        }
        Via::Ssh => {
            let arguments = ssh_arguments(target)?;
            let log = std::fs::File::create(directory.join(format!("{name}.log")))
                .map_err(|error| format!("could not open the tunnel log: {error}"))?;
            let mut command = crate::operation_context::command("sh");
            // `$0` names the tunnel, so `down` can recognise the process.
            command
                .args(["-c", SUPERVISOR, name, "ssh"])
                .args(&arguments)
                .stdin(Stdio::null())
                .stdout(Stdio::null())
                .stderr(log);
            #[cfg(unix)]
            std::os::unix::process::CommandExt::process_group(&mut command, 0);
            let child = crate::operation_context::spawn_process(&mut command)
                .map_err(|error| format!("could not start ssh: {error}"))?;
            record.pid = Some(child.id());
        }
    }
    Ok(record)
}

fn stop(record: &Record) {
    match (record.via, record.pid, &record.container) {
        (Via::Ssh, Some(pid), _)
            if is_supervisor(pid, &tunnel_name(&record.server, record.local_port)) =>
        {
            // The supervisor leads its own process group: end it and its ssh.
            let _ = crate::operation_context::process_output(
                crate::operation_context::command("kill")
                    .args(["-TERM", "--", &format!("-{pid}")])
                    .stderr(Stdio::null()),
            )
            .map(|output| output.status);
        }
        (Via::Docker, _, Some(name)) => {
            let _ = output(
                "docker",
                &["rm".to_string(), "-f".to_string(), name.clone()],
            );
        }
        _ => {}
    }
}

/// One HTTP status through the tunnel, or `None` when nothing answered.
async fn probe(port: u16, path: &str, token: Option<&str>) -> Option<u16> {
    let client = reqwest::Client::builder()
        .no_proxy()
        .timeout(Duration::from_secs(10))
        .build()
        .ok()?;
    let mut request = client.get(format!("http://127.0.0.1:{port}{path}"));
    if let Some(token) = token {
        request = request.bearer_auth(token);
    }
    request
        .send()
        .await
        .ok()
        .map(|response| response.status().as_u16())
}

/// What answered through the tunnel.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
enum Checked {
    /// Health and, with a token, the authorized catalog answered `200`.
    Usable,
    /// The Router answered, but not as expected (a wrong token, say).
    Refused,
    /// Nothing healthy answered before the wait ran out.
    Unreachable,
}

/// Check the Router through the tunnel.
async fn check(port: u16, wait: u64) -> Checked {
    let deadline = tokio::time::Instant::now() + Duration::from_secs(wait);
    let health = loop {
        let status = probe(port, "/api/health", None).await;
        if status == Some(200) || tokio::time::Instant::now() >= deadline {
            break status;
        }
        tokio::time::sleep(Duration::from_millis(500)).await;
    };
    println!(
        "health={}",
        health.map_or_else(|| "unreachable".to_string(), |status| status.to_string())
    );
    if health != Some(200) {
        return Checked::Unreachable;
    }
    let token = crate::operation_context::var(TOKEN_ENV)
        .ok()
        .filter(|token| !token.is_empty());
    let Some(token) = token else {
        println!("models=skipped (set {TOKEN_ENV} to check an authorized /v1/models)");
        return Checked::Usable;
    };
    let models = probe(port, "/v1/models", Some(&token)).await;
    println!(
        "models={}",
        models.map_or_else(|| "unreachable".to_string(), |status| status.to_string())
    );
    if models == Some(200) {
        Checked::Usable
    } else {
        Checked::Refused
    }
}

/// Run `router tunnel`.
pub async fn run(args: &TunnelArgs) -> ExitCode {
    let (TunnelOp::Up(target) | TunnelOp::Status(target) | TunnelOp::Down(target)) = &args.op;
    let directory = match state_dir() {
        Ok(directory) => directory,
        Err(error) => {
            eprintln!("error: {error}");
            return ExitCode::from(2);
        }
    };
    let name = tunnel_name(&target.server, target.local_port);
    let path = directory.join(format!("{name}.json"));
    let existing = read_record(&path);
    let described = format!(
        "local=127.0.0.1:{} server={} remote=127.0.0.1:{}",
        target.local_port, target.server, target.remote_port
    );
    match &args.op {
        TunnelOp::Down(_) => {
            if let Some(record) = &existing {
                stop(record);
            }
            let _ = std::fs::remove_file(&path);
            println!("tunnel=down {described}");
            ExitCode::SUCCESS
        }
        TunnelOp::Status(_) => {
            let running = existing.as_ref().is_some_and(alive);
            let via = existing.as_ref().map_or("none", |record| match record.via {
                Via::Ssh => "ssh",
                Via::Docker => "docker",
            });
            println!(
                "tunnel={} via={via} {described}",
                if running { "running" } else { "stopped" }
            );
            if running && check(target.local_port, 0).await == Checked::Usable {
                ExitCode::SUCCESS
            } else {
                ExitCode::from(1)
            }
        }
        TunnelOp::Up(_) => up(target, &name, &directory, &path, existing, &described).await,
    }
}

async fn up(
    target: &TunnelTarget,
    name: &str,
    directory: &Path,
    path: &Path,
    existing: Option<Record>,
    described: &str,
) -> ExitCode {
    if let Err(error) = pinned(target) {
        eprintln!("error: {error}");
        return ExitCode::from(2);
    }
    if let Some(record) = existing.filter(alive) {
        if record.via == target.via && record.remote_port == target.remote_port {
            println!("tunnel=running {described} (already up; nothing started)");
            return if check(target.local_port, target.wait).await == Checked::Usable {
                ExitCode::SUCCESS
            } else {
                ExitCode::from(1)
            };
        }
        stop(&record);
    }
    if let Err(error) = std::fs::create_dir_all(directory) {
        eprintln!("error: could not create {}: {error}", directory.display());
        return ExitCode::from(1);
    }
    let record = match start(target, name, directory) {
        Ok(record) => record,
        Err(error) => {
            eprintln!("error: {error}");
            return ExitCode::from(if error.starts_with("--") { 2 } else { 1 });
        }
    };
    let encoded = serde_json::to_vec_pretty(&record).unwrap_or_default();
    if let Err(error) = crate::durable_file::atomic_write_owner_only(path, &encoded) {
        stop(&record);
        eprintln!(
            "error: {}",
            crate::durable_file::describe_write_failure(path, &error)
        );
        return ExitCode::from(1);
    }
    println!("tunnel=started {described}");
    match check(target.local_port, target.wait).await {
        Checked::Usable => ExitCode::SUCCESS,
        Checked::Refused => {
            eprintln!(
                "error: the Router answered through the tunnel but refused the check; \
                 the tunnel stays up (`router tunnel down` stops it)"
            );
            ExitCode::from(1)
        }
        Checked::Unreachable => {
            // A wrong host key or an unreachable server will not fix itself:
            // do not leave a supervisor retrying it forever.
            stop(&record);
            let _ = std::fs::remove_file(path);
            println!("tunnel=stopped {described}");
            eprintln!(
                "error: nothing answered through the tunnel within {}s, so it was stopped; \
                 see the tunnel log in {}",
                target.wait,
                directory.display()
            );
            ExitCode::from(1)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn target(known: &Path) -> TunnelTarget {
        TunnelTarget {
            server: "router@far.example".to_string(),
            local_port: 18080,
            remote_port: 8080,
            ssh_port: Some(2222),
            ssh_identity: Some(PathBuf::from("/keys/id")),
            ssh_known_hosts: Some(known.to_path_buf()),
            via: Via::Ssh,
            image: DEFAULT_IMAGE.to_string(),
            wait: 0,
        }
    }

    #[test]
    fn the_ssh_forward_binds_loopback_and_pins_the_host_key() {
        let known = tempfile::NamedTempFile::new().unwrap();
        std::fs::write(known.path(), "far.example ssh-ed25519 AAAA\n").unwrap();
        let arguments = ssh_arguments(&target(known.path())).unwrap().join(" ");
        assert!(
            arguments.contains("-L 127.0.0.1:18080:127.0.0.1:8080"),
            "{arguments}"
        );
        assert!(
            arguments.contains("StrictHostKeyChecking=yes"),
            "{arguments}"
        );
        assert!(arguments.contains("GatewayPorts=no"), "{arguments}");
        assert!(!arguments.contains("0.0.0.0") && !arguments.contains("accept-new"));
    }

    #[test]
    fn an_unpinned_host_key_is_refused() {
        let mut target = target(Path::new("/nonexistent/known_hosts"));
        assert!(ssh_arguments(&target).is_err());
        target.ssh_known_hosts = None;
        assert!(
            ssh_arguments(&target)
                .unwrap_err()
                .contains("--ssh-known-hosts")
        );
    }

    #[test]
    fn the_companion_shares_the_host_network_and_publishes_nothing() {
        let known = tempfile::NamedTempFile::new().unwrap();
        std::fs::write(known.path(), "far.example ssh-ed25519 AAAA\n").unwrap();
        let arguments = docker_arguments(&target(known.path()), "router-tunnel-x").unwrap();
        assert!(
            arguments
                .windows(2)
                .any(|pair| pair == ["--network", "host"])
        );
        assert!(!arguments.iter().any(|argument| argument == "-p"));
        assert!(arguments.contains(&"TUNNEL_MODE=forward".to_string()));
        // The identity path is made absolute, which adds a drive on Windows.
        assert!(arguments.iter().any(|argument| {
            argument.ends_with(":/run/secrets/ssh-key:ro") && argument.contains("id")
        }));
    }

    #[test]
    fn tunnel_names_are_safe_file_and_container_names() {
        let name = tunnel_name("deploy@host.example", 8080);
        assert!(
            name.starts_with("router-tunnel-deploy-host-example-") && name.ends_with("-8080"),
            "{name}"
        );
        assert!(name.chars().all(|c| c.is_ascii_alphanumeric() || c == '-'));
        assert_ne!(name, tunnel_name("deploy-host-example", 8080));
    }

    #[test]
    fn a_reused_pid_is_not_taken_for_the_supervisor() {
        // This test process is alive but is no tunnel supervisor.
        assert!(!is_supervisor(
            std::process::id(),
            "router-tunnel-x-00000000-1"
        ));
    }

    #[cfg(unix)]
    #[test]
    fn the_companion_runs_as_the_key_owner() {
        use std::os::unix::fs::MetadataExt as _;
        let known = tempfile::NamedTempFile::new().unwrap();
        std::fs::write(known.path(), "far.example ssh-ed25519 AAAA\n").unwrap();
        let key = tempfile::NamedTempFile::new().unwrap();
        let mut target = target(known.path());
        target.ssh_identity = Some(key.path().to_path_buf());
        let metadata = std::fs::metadata(key.path()).unwrap();
        let arguments = docker_arguments(&target, "router-tunnel-x").unwrap();
        let user = format!("{}:{}", metadata.uid(), metadata.gid());
        assert_eq!(
            arguments
                .windows(2)
                .any(|pair| pair == ["--user", user.as_str()]),
            metadata.uid() != 0,
            "{arguments:?}"
        );
    }
}
