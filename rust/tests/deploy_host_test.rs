//! `router deploy --mode host` with the real binary (issue #626).
//!
//! On macOS the live Claude Code login is in the Keychain, which a container
//! cannot read, so Anthropic needs the Router on the host. This test issues a
//! client token into a deployment's data directory, starts the host Router
//! with `router deploy --mode host`, and checks over real HTTP that the
//! token still authorizes, that a rerun and `--status` are read-only no-ops,
//! that neither the secret nor the token is printed, and that `--down`
//! stops the process. It needs no container runtime.
#![cfg(unix)]

use std::io::{Read as _, Write as _};
use std::path::{Path, PathBuf};
use std::process::Output;

mod common;

const SECRET: &str = "deploy-host-test-secret";

struct Host {
    home: tempfile::TempDir,
    port: u16,
}

impl Host {
    fn root(&self) -> PathBuf {
        self.home.path().join("deploy")
    }

    fn deploy(&self, extra: &[&str]) -> Output {
        self.deploy_with(extra, &[])
    }

    fn deploy_with(&self, extra: &[&str], env: &[(&str, &str)]) -> Output {
        let port = self.port.to_string();
        let root = self.root().display().to_string();
        let mut args = vec!["deploy", "--port", &port, "--root", &root];
        args.extend_from_slice(extra);
        let mut variables = vec![("TOKEN_SECRET", SECRET)];
        variables.extend_from_slice(env);
        let output = common::router_with_env(self.home.path(), &args, &variables);
        println!(
            "$ router {}\n{}{}",
            args.join(" "),
            String::from_utf8_lossy(&output.stdout),
            String::from_utf8_lossy(&output.stderr)
        );
        output
    }

    fn pid(&self) -> Option<u32> {
        let record = std::fs::read_to_string(self.root().join("state/host")).ok()?;
        serde_json::from_str::<serde_json::Value>(&record).ok()?["pid"]
            .as_u64()
            .and_then(|pid| u32::try_from(pid).ok())
    }

    fn status(&self, path: &str, token: Option<&str>) -> Option<u16> {
        let mut stream = std::net::TcpStream::connect(("127.0.0.1", self.port)).ok()?;
        stream
            .set_read_timeout(Some(std::time::Duration::from_secs(10)))
            .ok()?;
        let authorization = token.map_or_else(String::new, |token| {
            format!("Authorization: Bearer {token}\r\n")
        });
        write!(
            stream,
            "GET {path} HTTP/1.1\r\nHost: localhost\r\n{authorization}Connection: close\r\n\r\n"
        )
        .ok()?;
        let mut response = String::new();
        stream.read_to_string(&mut response).ok()?;
        response.split_whitespace().nth(1)?.parse().ok()
    }
}

impl Drop for Host {
    fn drop(&mut self) {
        if let Some(pid) = self.pid() {
            let _ = std::process::Command::new("kill")
                .arg(pid.to_string())
                .status();
        }
    }
}

fn free_port() -> u16 {
    std::net::TcpListener::bind(("127.0.0.1", 0))
        .unwrap()
        .local_addr()
        .unwrap()
        .port()
}

fn issue_token(home: &Path, data: &Path) -> String {
    let data = data.display().to_string();
    let output = common::router_with_env(
        home,
        &["tokens", "issue", "--label", "laptop"],
        &[("TOKEN_SECRET", SECRET), ("DATA_DIR", &data)],
    );
    assert!(output.status.success(), "{output:?}");
    String::from_utf8_lossy(&output.stdout)
        .split_whitespace()
        .find(|word| word.starts_with(link_assistant_router::token::TOKEN_PREFIX))
        .expect("the issued token is printed")
        .to_string()
}

fn text(output: &Output) -> String {
    format!(
        "{}{}",
        String::from_utf8_lossy(&output.stdout),
        String::from_utf8_lossy(&output.stderr)
    )
}

#[test]
fn a_serving_host_on_another_port_blocks_status_and_mutation() {
    let host = Host {
        home: tempfile::tempdir().unwrap(),
        port: free_port(),
    };
    assert!(host.deploy(&["--mode", "host"]).status.success());
    let pid = host.pid().unwrap();
    let other_port = free_port().to_string();
    let root = host.root().display().to_string();
    for status in [true, false] {
        let mut args = vec![
            "deploy",
            "--root",
            &root,
            "--mode",
            "host",
            "--port",
            &other_port,
        ];
        if status {
            args.push("--status");
        }
        let output = common::router_with_env(host.home.path(), &args, &[("TOKEN_SECRET", SECRET)]);
        let rendered = text(&output);
        assert!(!output.status.success(), "{rendered}");
        assert!(rendered.contains("port-mismatch"), "{rendered}");
        assert!(!rendered.contains("action=start-host"), "{rendered}");
        assert_eq!(host.pid(), Some(pid));
        assert_eq!(host.status("/api/health", None), Some(200));
    }
    assert!(host.deploy(&["--down", "--yes"]).status.success());
}

#[test]
fn config_alone_starts_and_reconciles_the_requested_host_listener() {
    for section in ["deploy", "local"] {
        let host = Host {
            home: tempfile::tempdir().unwrap(),
            port: free_port(),
        };
        let config = host.home.path().join("router-deploy.toml");
        std::fs::write(
            &config,
            format!(
                "[{section}]\nmode = \"host\"\nport = {}\nroot = {:?}\n",
                host.port,
                host.root().to_str().unwrap()
            ),
        )
        .unwrap();
        let run = |status: bool| {
            let mut args = vec!["deploy", "--config", config.to_str().unwrap()];
            if status {
                args.push("--status");
            }
            std::process::Command::new(env!("CARGO_BIN_EXE_link-assistant-router"))
                .args(&args)
                .env("HOME", host.home.path())
                .env("TOKEN_SECRET", SECRET)
                .env("DATA_DIR", host.home.path().join("router-data"))
                .env_remove("ROUTER_PORT")
                .output()
                .unwrap()
        };
        let output = run(false);
        assert!(output.status.success(), "{}", text(&output));
        let pid = host.pid().unwrap();
        assert_eq!(host.status("/api/health", None), Some(200));
        let status = run(true);
        assert!(
            text(&status).contains("converged=true"),
            "{}",
            text(&status)
        );
        assert_eq!(host.pid(), Some(pid));
        assert!(host.deploy(&["--down", "--yes"]).status.success());
    }
}

#[test]
fn host_mode_serves_the_deployment_tokens_and_stops_on_down() {
    let host = Host {
        home: tempfile::tempdir().unwrap(),
        port: free_port(),
    };
    let token = issue_token(host.home.path(), &host.root().join("data"));

    let plan = host.deploy(&["--mode", "host", "--status"]);
    assert!(plan.status.success(), "{}", text(&plan));
    assert!(text(&plan).contains("status_is_read_only=true"));
    assert!(host.pid().is_none(), "a plan starts nothing");

    let deployed = host.deploy(&["--mode", "host"]);
    assert!(deployed.status.success(), "{}", text(&deployed));
    assert!(text(&deployed).contains("host deployment ready"));
    let pid = host.pid().expect("the host process is recorded");

    assert_eq!(host.status("/api/health", None), Some(200));
    // 401 means the signature was rejected; a generic token without a
    // managed-client binding gets 403 once it is authenticated.
    let authorized = host.status("/api/models", Some(&token));
    assert!(
        authorized.is_some_and(|status| status != 401),
        "{authorized:?}"
    );
    assert_eq!(host.status("/api/models", Some("la_sk_forged")), Some(401));

    // Host mode stays selected without the flag, and a rerun changes nothing.
    let status = host.deploy(&["--status"]);
    assert!(status.status.success(), "{}", text(&status));
    assert!(text(&status).contains("converged=true"));
    let status = host.deploy(&["--status", "--json"]);
    assert!(status.status.success(), "{}", text(&status));
    let response: serde_json::Value = serde_json::from_slice(&status.stdout).unwrap();
    link_assistant_router::contracts::validation::operation("deploy", &response).unwrap();
    let data = &response["data"];
    assert_eq!(data["schema"], "link-assistant-router/local-deployment/v1");
    assert_eq!(data["mode"], "host");
    assert_eq!(data["host_process"]["pid"], pid);
    assert_eq!(data["host_process"]["port"], host.port);
    assert_eq!(data["host_process"]["serving"], true);
    assert_eq!(data["converged"], true);
    assert_eq!(data["status_is_read_only"], true);
    assert_eq!(data["blockers"], serde_json::json!([]));
    assert!(!text(&status).contains(SECRET));
    let again = host.deploy(&[]);
    assert!(again.status.success(), "{}", text(&again));
    assert!(text(&again).contains("already converged"));
    assert_eq!(host.pid(), Some(pid));

    for output in [&plan, &deployed, &status, &again] {
        assert!(!text(output).contains(SECRET));
        assert!(!text(output).contains(&token));
    }

    let down = host.deploy(&["--down", "--yes"]);
    assert!(down.status.success(), "{}", text(&down));
    assert!(host.pid().is_none());
    assert_eq!(host.status("/api/health", None), None);
}

/// Issue #684: a host deployment with a custom `--root` is registered, so
/// `router doctor --local` reports that deployment's provider exhaustion
/// without `DATA_DIR` pointing at it, and names a registered root it lost.
#[test]
fn doctor_finds_a_registered_custom_root_and_names_a_lost_one() {
    let host = Host {
        home: tempfile::tempdir().unwrap(),
        port: free_port(),
    };
    let deployed = host.deploy(&["--mode", "host"]);
    assert!(deployed.status.success(), "{}", text(&deployed));
    let registry = host
        .home
        .path()
        .join(".link-assistant-router/deployments.json");
    let recorded = std::fs::read_to_string(&registry).expect("the deploy is registered");
    assert!(recorded.contains("\"host\""), "{recorded}");
    assert!(!recorded.contains(SECRET), "{recorded}");

    std::fs::write(
        host.root().join("data/provider-exhaustion.json"),
        r#"{"zai":{"code":1113,"reason":"Insufficient balance","request_id":"req-684","observed_at_unix":1}}"#,
    )
    .unwrap();
    let doctor = common::router_with_env(host.home.path(), &["doctor", "--local"], &[]);
    let report = text(&doctor);
    let data = host.root().join("data").display().to_string();
    assert!(
        report.contains(&format!("provider exhaustion     : recorded in {data}")),
        "{report}"
    );
    assert!(report.contains("1113"), "{report}");

    let down = host.deploy(&["--down", "--yes"]);
    assert!(down.status.success(), "{}", text(&down));
    let forgotten = std::fs::read_to_string(&registry).unwrap();
    assert!(
        !forgotten.contains(&host.root().display().to_string()),
        "{forgotten}"
    );

    // A registered root that disappeared is named rather than skipped.
    let lost = host.home.path().join("lost-root");
    std::fs::write(
        &registry,
        format!(
            r#"{{"deployments":[{{"root":"{}","mode":"host","port":1,"registered_at":1}}]}}"#,
            lost.display()
        ),
    )
    .unwrap();
    let doctor = common::router_with_env(host.home.path(), &["doctor", "--local"], &[]);
    let report = text(&doctor);
    assert!(report.contains("could not see"), "{report}");
    assert!(report.contains(&lost.display().to_string()), "{report}");
}

/// A stand-in service manager on PATH that logs each invocation.
fn stub_managers(home: &Path) -> String {
    use std::os::unix::fs::PermissionsExt as _;
    let bin = home.join("bin");
    std::fs::create_dir_all(&bin).unwrap();
    for name in ["systemctl", "launchctl"] {
        let path = bin.join(name);
        std::fs::write(&path, "#!/bin/sh\nprintf '%s\\n' \"$*\" >> \"$0.log\"\n").unwrap();
        std::fs::set_permissions(&path, std::fs::Permissions::from_mode(0o755)).unwrap();
    }
    format!(
        "{}:{}",
        bin.display(),
        std::env::var("PATH").unwrap_or_default()
    )
}

fn mode_of(path: &Path) -> u32 {
    use std::os::unix::fs::PermissionsExt as _;
    std::fs::metadata(path).unwrap().permissions().mode() & 0o777
}

/// Issue #684: `--install-service` writes a systemd user unit or a launchd
/// agent for the same binary, data directory and port, with the signing
/// secret in a `0600` file named by `TOKEN_SECRET_FILE` and never in the
/// unit; `--uninstall-service` and `--down` remove it.
#[test]
fn install_service_writes_a_unit_without_the_secret_and_removes_it() {
    let host = Host {
        home: tempfile::tempdir().unwrap(),
        port: free_port(),
    };
    let home = host.home.path();
    let path = stub_managers(home);
    let systemd = [
        ("PATH", path.as_str()),
        ("LINK_ASSISTANT_ROUTER_SERVICE_MANAGER", "systemd"),
    ];

    let installed = host.deploy_with(&["--mode", "host", "--install-service"], &systemd);
    assert!(installed.status.success(), "{}", text(&installed));
    assert!(!text(&installed).contains(SECRET));
    let unit_path = home.join(".config/systemd/user/link-assistant-router.service");
    let unit = std::fs::read_to_string(&unit_path).expect("the unit is written");
    let secret_file = host.root().join("state/token-secret");
    assert!(!unit.contains(SECRET), "the secret is not in the unit");
    for expected in [
        format!(
            "ExecStart=\"{}\" serve",
            env!("CARGO_BIN_EXE_link-assistant-router")
        ),
        format!("Environment=\"ROUTER_PORT={}\"", host.port),
        "Environment=\"ROUTER_HOST=127.0.0.1\"".to_string(),
        format!(
            "Environment=\"DATA_DIR={}\"",
            host.root().join("data").display()
        ),
        format!(
            "Environment=\"TOKEN_SECRET_FILE={}\"",
            secret_file.display()
        ),
        "Restart=on-failure".to_string(),
    ] {
        assert!(unit.contains(&expected), "{expected} not in {unit}");
    }
    assert_eq!(mode_of(&secret_file), 0o600);
    assert_eq!(mode_of(&unit_path), 0o600);
    assert_eq!(
        std::fs::read_to_string(&secret_file).unwrap().trim_end(),
        SECRET
    );
    let calls = std::fs::read_to_string(home.join("bin/systemctl.log")).unwrap();
    assert!(calls.contains("--user daemon-reload"), "{calls}");
    assert!(
        calls.contains("--user enable link-assistant-router.service"),
        "{calls}"
    );
    assert!(!calls.contains(SECRET), "{calls}");

    // The file alone signs what the deployment accepts: a token issued with
    // only TOKEN_SECRET_FILE authorizes against the running Router.
    let data = host.root().join("data").display().to_string();
    let file = secret_file.display().to_string();
    let issued = common::router_with_env(
        home,
        &["tokens", "issue", "--label", "service"],
        &[
            ("TOKEN_SECRET", ""),
            ("TOKEN_SECRET_FILE", &file),
            ("DATA_DIR", &data),
        ],
    );
    assert!(issued.status.success(), "{}", text(&issued));
    let token = String::from_utf8_lossy(&issued.stdout)
        .split_whitespace()
        .find(|word| word.starts_with(link_assistant_router::token::TOKEN_PREFIX))
        .expect("a token is printed")
        .to_string();
    let authorized = host.status("/api/models", Some(&token));
    assert!(
        authorized.is_some_and(|status| status != 401),
        "{authorized:?}"
    );

    let removed = host.deploy_with(&["--uninstall-service"], &systemd);
    assert!(removed.status.success(), "{}", text(&removed));
    assert!(!unit_path.exists() && !secret_file.exists());
    let calls = std::fs::read_to_string(home.join("bin/systemctl.log")).unwrap();
    assert!(
        calls.contains("--user disable link-assistant-router.service"),
        "{calls}"
    );
    assert!(host.pid().is_some(), "the deployment itself keeps serving");

    let launchd = [
        ("PATH", path.as_str()),
        ("LINK_ASSISTANT_ROUTER_SERVICE_MANAGER", "launchd"),
    ];
    let installed = host.deploy_with(&["--install-service"], &launchd);
    assert!(installed.status.success(), "{}", text(&installed));
    let plist_path = home.join("Library/LaunchAgents/com.link-assistant.router.plist");
    let plist = std::fs::read_to_string(&plist_path).expect("the agent is written");
    assert!(!plist.contains(SECRET));
    assert!(plist.contains("<key>TOKEN_SECRET_FILE</key>"), "{plist}");
    assert!(plist.contains("<key>KeepAlive</key>"), "{plist}");
    assert_eq!(mode_of(&plist_path), 0o600);
    let calls = std::fs::read_to_string(home.join("bin/launchctl.log")).unwrap();
    assert!(calls.contains("enable gui/"), "{calls}");

    let down = host.deploy_with(&["--down", "--yes"], &launchd);
    assert!(down.status.success(), "{}", text(&down));
    assert!(!plist_path.exists());
    let calls = std::fs::read_to_string(home.join("bin/launchctl.log")).unwrap();
    assert!(calls.contains("bootout gui/"), "{calls}");
    assert!(calls.contains("disable gui/"), "{calls}");
}
