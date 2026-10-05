//! `router tunnel up|status|down` with stand-in `ssh` and `docker` on PATH
//! and a mock Router behind the forwarded port (issue #682).
#![cfg(unix)]

use std::io::{Read as _, Write as _};
use std::os::unix::fs::PermissionsExt as _;
use std::path::PathBuf;
use std::process::{Command, Output};

const TOKEN: &str = "la_sk_tunnel-test-token-never-in-argv";

/// A Router stand-in: `/api/health` answers 200, `/v1/models` 200 only for
/// the expected bearer token.
fn mock_router() -> u16 {
    let listener = std::net::TcpListener::bind(("127.0.0.1", 0)).unwrap();
    let port = listener.local_addr().unwrap().port();
    std::thread::spawn(move || {
        for stream in listener.incoming() {
            let Ok(mut stream) = stream else { continue };
            let mut request = Vec::new();
            let mut buffer = [0_u8; 1024];
            while !request.windows(4).any(|window| window == b"\r\n\r\n") {
                match stream.read(&mut buffer) {
                    Ok(0) | Err(_) => break,
                    Ok(read) => request.extend_from_slice(&buffer[..read]),
                }
            }
            let request = String::from_utf8_lossy(&request).to_ascii_lowercase();
            let health = request.starts_with("get /api/health ");
            let authorized = request.starts_with("get /v1/models ")
                && request.contains(&format!(
                    "authorization: bearer {}",
                    TOKEN.to_ascii_lowercase()
                ));
            let status = if health || authorized {
                "200 OK"
            } else {
                "401 Unauthorized"
            };
            let _ = write!(
                stream,
                "HTTP/1.1 {status}\r\nContent-Length: 2\r\nConnection: close\r\n\r\n{{}}"
            );
        }
    });
    port
}

struct Harness {
    home: tempfile::TempDir,
}

impl Harness {
    fn new() -> Self {
        let home = tempfile::tempdir().unwrap();
        let bin = home.path().join("bin");
        std::fs::create_dir(&bin).unwrap();
        let stub = |name: &str, body: &str| {
            let path = bin.join(name);
            std::fs::write(
                &path,
                format!("#!/bin/sh\nprintf '%s\\n' \"$@\" >> \"$0.arguments\"\n{body}\n"),
            )
            .unwrap();
            std::fs::set_permissions(&path, std::fs::Permissions::from_mode(0o755)).unwrap();
        };
        stub("ssh", "exec sleep 60");
        stub(
            "docker",
            "case \"$1\" in run) echo container-id ;; inspect) echo true ;; esac",
        );
        std::fs::write(
            home.path().join("known_hosts"),
            "far.example ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIExampleOnly\n",
        )
        .unwrap();
        std::fs::write(home.path().join("id"), "not-a-real-key\n").unwrap();
        Self { home }
    }

    fn path(&self, name: &str) -> PathBuf {
        self.home.path().join(name)
    }

    fn arguments(&self, program: &str) -> String {
        std::fs::read_to_string(self.path("bin").join(format!("{program}.arguments")))
            .unwrap_or_default()
    }

    fn tunnel(&self, args: &[&str]) -> Output {
        let path = format!(
            "{}:{}",
            self.path("bin").display(),
            std::env::var("PATH").unwrap_or_default()
        );
        Command::new(env!("CARGO_BIN_EXE_router"))
            .arg("tunnel")
            .args(args)
            .env("PATH", path)
            .env("HOME", self.home.path())
            .env("LINK_ASSISTANT_ROUTER_TOKEN", TOKEN)
            .env_remove("TOKEN_SECRET")
            .output()
            .expect("router runs")
    }
}

fn text(output: &Output) -> String {
    format!(
        "{}{}",
        String::from_utf8_lossy(&output.stdout),
        String::from_utf8_lossy(&output.stderr)
    )
}

fn known(harness: &Harness) -> String {
    harness.path("known_hosts").display().to_string()
}

#[test]
fn ssh_forward_comes_up_on_loopback_with_a_pinned_key_and_checks_the_router() {
    let harness = Harness::new();
    let port = mock_router().to_string();
    let known = known(&harness);
    let target = [
        "--server",
        "router@far.example",
        "--local-port",
        &port,
        "--ssh-known-hosts",
        &known,
    ];
    let up = harness.tunnel(&[&["up"][..], &target, &["--wait", "10"]].concat());
    assert!(up.status.success(), "{}", text(&up));
    assert!(text(&up).contains("health=200"), "{}", text(&up));
    assert!(text(&up).contains("models=200"), "{}", text(&up));
    assert!(!text(&up).contains(TOKEN));

    // The supervisor starts ssh in the background; wait until the stub has
    // written its whole argv (the destination comes last).
    let deadline = std::time::Instant::now() + std::time::Duration::from_secs(10);
    while !harness.arguments("ssh").contains("router@far.example")
        && std::time::Instant::now() < deadline
    {
        std::thread::sleep(std::time::Duration::from_millis(20));
    }
    let arguments = harness.arguments("ssh");
    for expected in [
        "-L\n127.0.0.1:".to_string() + &port + ":127.0.0.1:8080",
        "StrictHostKeyChecking=yes".to_string(),
        format!("UserKnownHostsFile={known}"),
        "ServerAliveInterval=30".to_string(),
        "ExitOnForwardFailure=yes".to_string(),
        "router@far.example".to_string(),
    ] {
        assert!(
            arguments.contains(&expected),
            "{expected} not in {arguments}"
        );
    }
    for absent in [TOKEN, "0.0.0.0", "accept-new", "GatewayPorts=yes"] {
        assert!(!arguments.contains(absent), "{absent} in {arguments}");
    }

    let again = harness.tunnel(&[&["up"][..], &target].concat());
    assert!(again.status.success(), "{}", text(&again));
    assert!(text(&again).contains("already up"), "{}", text(&again));

    let status = harness.tunnel(&[&["status"][..], &target].concat());
    assert!(status.status.success(), "{}", text(&status));
    assert!(
        text(&status).contains("tunnel=running via=ssh"),
        "{}",
        text(&status)
    );

    let down = harness.tunnel(&[&["down"][..], &target].concat());
    assert!(down.status.success(), "{}", text(&down));
    let status = harness.tunnel(&[&["status"][..], &target].concat());
    assert_eq!(status.status.code(), Some(1), "{}", text(&status));
    assert!(
        text(&status).contains("tunnel=stopped"),
        "{}",
        text(&status)
    );
}

#[test]
fn docker_companion_runs_forward_mode_on_the_host_network_without_secrets() {
    let harness = Harness::new();
    let port = mock_router().to_string();
    let known = known(&harness);
    let identity = harness.path("id").display().to_string();
    let target = [
        "--server",
        "router@far.example",
        "--via",
        "docker",
        "--local-port",
        &port,
        "--remote-port",
        "18080",
        "--ssh-identity",
        &identity,
        "--ssh-known-hosts",
        &known,
    ];
    let up = harness.tunnel(&[&["up"][..], &target].concat());
    assert!(up.status.success(), "{}", text(&up));
    assert!(text(&up).contains("models=200"), "{}", text(&up));

    let arguments = harness.arguments("docker");
    for expected in [
        "run\n-d\n".to_string(),
        "--restart\nunless-stopped".to_string(),
        "--network\nhost".to_string(),
        "TUNNEL_MODE=forward".to_string(),
        format!("TUNNEL_LOCAL_PORT={port}"),
        "TUNNEL_TARGET_PORT=18080".to_string(),
        format!("{identity}:/run/secrets/ssh-key:ro"),
        format!("{known}:/run/secrets/known-hosts:ro"),
    ] {
        assert!(
            arguments.contains(&expected),
            "{expected} not in {arguments}"
        );
    }
    for absent in [TOKEN, "0.0.0.0", "-p\n", "not-a-real-key"] {
        assert!(!arguments.contains(absent), "{absent} in {arguments}");
    }

    let down = harness.tunnel(&[&["down"][..], &target].concat());
    assert!(down.status.success(), "{}", text(&down));
    assert!(
        harness
            .arguments("docker")
            .contains("rm\n-f\nrouter-tunnel-router-far-example-")
    );
}

#[test]
fn up_refuses_an_unpinned_host_key_and_a_wrong_token_fails_the_check() {
    let harness = Harness::new();
    let port = mock_router().to_string();
    let refused = harness.tunnel(&[
        "up",
        "--server",
        "router@far.example",
        "--local-port",
        &port,
    ]);
    assert_eq!(refused.status.code(), Some(2), "{}", text(&refused));
    assert!(text(&refused).contains("--ssh-known-hosts"));
    assert!(harness.arguments("ssh").is_empty(), "ssh never ran");

    let known = known(&harness);
    let path = format!(
        "{}:{}",
        harness.path("bin").display(),
        std::env::var("PATH").unwrap_or_default()
    );
    let target = [
        "--server",
        "router@far.example",
        "--local-port",
        &port,
        "--ssh-known-hosts",
        &known,
    ];
    let wrong = Command::new(env!("CARGO_BIN_EXE_router"))
        .arg("tunnel")
        .args([&["up"][..], &target].concat())
        .env("PATH", &path)
        .env("HOME", harness.home.path())
        .env("LINK_ASSISTANT_ROUTER_TOKEN", "la_sk_wrong")
        .output()
        .unwrap();
    assert_eq!(wrong.status.code(), Some(1), "{}", text(&wrong));
    assert!(text(&wrong).contains("models=401"), "{}", text(&wrong));
    let _ = harness.tunnel(&[&["down"][..], &target].concat());
}
