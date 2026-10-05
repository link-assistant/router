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
use std::process::{Command, ExitCode, Stdio};
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

/// A name for the forward that is safe in a file and container name.
#[must_use]
pub fn tunnel_name(server: &str, local_port: u16) -> String {
    let server: String = server
        .chars()
        .map(|c| if c.is_ascii_alphanumeric() { c } else { '-' })
        .collect();
    format!("router-tunnel-{server}-{local_port}")
}

fn state_dir() -> Result<PathBuf, String> {
    std::env::var_os("HOME")
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

fn output(program: &str, arguments: &[String]) -> Result<String, String> {
    let output = Command::new(program)
        .args(arguments)
        .stdin(Stdio::null())
        .output()
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
            Command::new("kill")
                .args(["-0", &pid.to_string()])
                .stderr(Stdio::null())
                .status()
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
            let mut command = Command::new("sh");
            command
                .args(["-c", SUPERVISOR, "router-tunnel", "ssh"])
                .args(&arguments)
                .stdin(Stdio::null())
                .stdout(Stdio::null())
                .stderr(log);
            #[cfg(unix)]
            std::os::unix::process::CommandExt::process_group(&mut command, 0);
            let child = command
                .spawn()
                .map_err(|error| format!("could not start ssh: {error}"))?;
            record.pid = Some(child.id());
        }
    }
    Ok(record)
}

fn stop(record: &Record) {
    match (record.via, record.pid, &record.container) {
        (Via::Ssh, Some(pid), _) => {
            // The supervisor leads its own process group: end it and its ssh.
            let _ = Command::new("kill")
                .args(["-TERM", "--", &format!("-{pid}")])
                .stderr(Stdio::null())
                .status();
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

/// Check the Router through the tunnel; `true` when it is usable.
async fn check(port: u16, wait: u64) -> bool {
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
        return false;
    }
    let token = std::env::var(TOKEN_ENV)
        .ok()
        .filter(|token| !token.is_empty());
    let Some(token) = token else {
        println!("models=skipped (set {TOKEN_ENV} to check an authorized /v1/models)");
        return true;
    };
    let models = probe(port, "/v1/models", Some(&token)).await;
    println!(
        "models={}",
        models.map_or_else(|| "unreachable".to_string(), |status| status.to_string())
    );
    models == Some(200)
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
            if running && check(target.local_port, 0).await {
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
            return if check(target.local_port, target.wait).await {
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
    if check(target.local_port, target.wait).await {
        ExitCode::SUCCESS
    } else {
        eprintln!(
            "error: the Router did not answer through the tunnel; see `router tunnel status` \
             and the tunnel log in {}",
            directory.display()
        );
        ExitCode::from(1)
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
        assert!(arguments.contains(&"/keys/id:/run/secrets/ssh-key:ro".to_string()));
    }

    #[test]
    fn tunnel_names_are_safe_file_and_container_names() {
        assert_eq!(
            tunnel_name("deploy@host.example", 8080),
            "router-tunnel-deploy-host-example-8080"
        );
    }
}
