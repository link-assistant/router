//! The host process behind `router deploy --mode host` (issue #626).
//!
//! Separated behind [`HostRuntime`] so the migration, its refusals and its
//! rollback are tested without starting processes or reading a Keychain.

use std::io::{Read as _, Write as _};
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use std::time::{Duration, Instant};

/// How a host Router process is started.
pub(super) struct Launch<'a> {
    pub executable: &'a Path,
    pub port: u16,
    pub data_dir: &'a Path,
    /// Passed through the environment only, never argv.
    pub token_secret: &'a str,
    pub log: &'a Path,
    /// Original file credential source, when a container used a live file.
    pub claude_home: Option<&'a Path>,
}

/// Where the host login lives; presence only, never its bytes.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub(super) enum ClaudeLogin {
    Keychain,
    File,
    Absent,
}

impl ClaudeLogin {
    pub(super) const fn as_str(self) -> &'static str {
        match self {
            Self::Keychain => "keychain",
            Self::File => "file",
            Self::Absent => "absent",
        }
    }
}

pub(super) trait HostRuntime {
    /// The Router binary a host deployment runs: this one.
    fn executable(&self) -> Result<PathBuf, String>;
    fn spawn(&self, launch: &Launch<'_>) -> Result<u32, String>;
    /// Whether `pid` is still a `serve` process of `executable`, so a reused
    /// pid is never mistaken for the deployment or signalled.
    fn serving(&self, pid: u32, executable: &Path) -> bool;
    fn terminate(&self, pid: u32) -> Result<(), String>;
    /// The HTTP status of `GET path` on the loopback `port`, if it answers.
    fn status(&self, port: u16, path: &str, bearer: Option<&str>) -> Option<u16>;
    fn free_port(&self) -> Result<u16, String>;
    fn user_id(&self) -> Option<u32>;
    fn claude_login(&self) -> ClaudeLogin;
    /// `router tokens list --json` over the host's view of the data.
    fn token_inventory(&self, executable: &Path, data_dir: &Path) -> Result<String, String>;
    /// Read a bound token's model set without issuing tokens or copying OAuth.
    fn catalog(
        &self,
        port: u16,
        bearer: &str,
    ) -> Result<std::collections::BTreeSet<String>, String> {
        // `router deploy` runs inside the `#[tokio::main]` runtime, where
        // building and blocking on a second runtime panics (issue #662). The
        // probe gets a thread of its own, so it works from both contexts.
        std::thread::scope(|scope| {
            scope
                .spawn(|| catalog_on_own_runtime(port, bearer))
                .join()
                .unwrap_or_else(|_| Err("catalog probe failed".into()))
        })
    }
}

/// The body of [`HostRuntime::catalog`], on a thread with no runtime.
fn catalog_on_own_runtime(
    port: u16,
    bearer: &str,
) -> Result<std::collections::BTreeSet<String>, String> {
    let runtime = tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()
        .map_err(|_| "catalog runtime unavailable")?;
    runtime.block_on(async {
        let client = reqwest::Client::builder()
            .no_proxy()
            .timeout(Duration::from_secs(10))
            .build()
            .map_err(|_| "catalog client unavailable")?;
        let response = client
            .get(format!("http://127.0.0.1:{port}/api/models"))
            .bearer_auth(bearer)
            .send()
            .await
            .map_err(|_| "issued-token catalog request failed")?;
        if !response.status().is_success() {
            return Err("issued-token catalog was rejected".into());
        }
        let body: serde_json::Value = response.json().await.map_err(|_| "catalog JSON invalid")?;
        let rows = body["data"].as_array().ok_or("catalog models absent")?;
        rows.iter()
            .map(|row| {
                let id = row["id"].as_str().ok_or("catalog model ID absent")?;
                Ok(format!(
                    "{}/{id}",
                    row["owned_by"].as_str().unwrap_or_default()
                ))
            })
            .collect()
    })
}

/// The real host: processes, loopback HTTP and the platform secret store.
#[derive(Default)]
pub(super) struct System {
    /// Children started by this run, reaped on termination so a stopped
    /// candidate does not linger as a zombie that still answers `kill -0`.
    children: Mutex<Vec<Child>>,
}

impl HostRuntime for System {
    fn executable(&self) -> Result<PathBuf, String> {
        std::env::current_exe()
            .and_then(|path| path.canonicalize())
            .map_err(|error| format!("could not resolve the Router executable: {error}"))
    }

    fn spawn(&self, launch: &Launch<'_>) -> Result<u32, String> {
        let log = open_log(launch.log)?;
        let error_log = log
            .try_clone()
            .map_err(|error| format!("could not open {}: {error}", launch.log.display()))?;
        let mut command = crate::operation_context::command(launch.executable);
        command
            .arg("serve")
            .current_dir(launch.data_dir)
            .env("ROUTER_HOST", "127.0.0.1")
            .env("ROUTER_PORT", launch.port.to_string())
            .env("DATA_DIR", launch.data_dir)
            .env("STORAGE_POLICY", "text")
            .env("TOKEN_SECRET", launch.token_secret)
            // One loopback listener, exactly where the relay published.
            .env_remove("LISTENERS")
            .stdin(Stdio::null())
            .stdout(log)
            .stderr(error_log);
        // The deployed server inherits this shell. An emergency any-token
        // switch exported for a local incident must not ride along into a
        // deployment (issue #645): it is enabled only by an explicit flag.
        for name in link_assistant_router::emergency_auth::ENV_VARS {
            command.env_remove(name);
        }
        // `--env` passthrough (issue #679); reserved names are refused earlier.
        for (name, value) in &super::runtime_env::current().env {
            command.env(name, value);
        }
        if let Some(home) = launch.claude_home {
            command
                .env("CLAUDE_CODE_HOME", home)
                .env("CLAUDE_CONFIG_DIR", home);
        }
        detach(&mut command);
        let child = crate::operation_context::spawn_process(&mut command).map_err(|error| {
            format!(
                "could not start {} serve: {error}",
                launch.executable.display()
            )
        })?;
        let pid = child.id();
        self.children
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner)
            .push(child);
        Ok(pid)
    }

    fn serving(&self, pid: u32, executable: &Path) -> bool {
        if self.exited(pid) {
            return false;
        }
        crate::operation_context::process_output(crate::operation_context::command("ps").args([
            "-p",
            &pid.to_string(),
            "-o",
            "command=",
        ]))
        .is_ok_and(|output| {
            let command = String::from_utf8_lossy(&output.stdout);
            output.status.success()
                && command.contains(&executable.display().to_string())
                && command.split_whitespace().any(|word| word == "serve")
        })
    }

    fn terminate(&self, pid: u32) -> Result<(), String> {
        signal("TERM", pid);
        let deadline = Instant::now() + Duration::from_secs(15);
        while Instant::now() < deadline {
            if self.exited(pid) || !alive(pid) {
                return Ok(());
            }
            std::thread::sleep(Duration::from_millis(100));
        }
        signal("KILL", pid);
        std::thread::sleep(Duration::from_millis(200));
        if self.exited(pid) || !alive(pid) {
            Ok(())
        } else {
            Err(format!("host Router process {pid} did not stop"))
        }
    }

    fn status(&self, port: u16, path: &str, bearer: Option<&str>) -> Option<u16> {
        let mut stream = std::net::TcpStream::connect(("127.0.0.1", port)).ok()?;
        stream
            .set_read_timeout(Some(Duration::from_secs(10)))
            .ok()?;
        stream
            .set_write_timeout(Some(Duration::from_secs(5)))
            .ok()?;
        let authorization = bearer.map_or_else(String::new, |token| {
            format!("Authorization: Bearer {token}\r\n")
        });
        write!(
            stream,
            "GET {path} HTTP/1.1\r\nHost: localhost\r\n{authorization}Connection: close\r\n\r\n"
        )
        .ok()?;
        let mut head = [0_u8; 64];
        let read = stream.read(&mut head).ok()?;
        String::from_utf8_lossy(&head[..read])
            .split_whitespace()
            .nth(1)?
            .parse()
            .ok()
    }

    fn free_port(&self) -> Result<u16, String> {
        std::net::TcpListener::bind(("127.0.0.1", 0))
            .and_then(|listener| listener.local_addr())
            .map(|address| address.port())
            .map_err(|error| format!("no free loopback port for the host candidate: {error}"))
    }

    fn user_id(&self) -> Option<u32> {
        let output = crate::operation_context::process_output(
            crate::operation_context::command("id").arg("-u"),
        )
        .ok()?;
        String::from_utf8_lossy(&output.stdout).trim().parse().ok()
    }

    fn claude_login(&self) -> ClaudeLogin {
        // The secret is dropped here; only its presence is used.
        if link_assistant_router::platform_keychain::lookup(
            link_assistant_router::subscription::SubscriptionProvider::Claude,
        )
        .is_some()
        {
            return ClaudeLogin::Keychain;
        }
        let home = link_assistant_router::env_paths::directory("CLAUDE_CONFIG_DIR").or_else(|| {
            link_assistant_router::env_paths::directory("HOME").map(|home| home.join(".claude"))
        });
        if home.is_some_and(|home| home.join(".credentials.json").is_file()) {
            ClaudeLogin::File
        } else {
            ClaudeLogin::Absent
        }
    }

    fn token_inventory(&self, executable: &Path, data_dir: &Path) -> Result<String, String> {
        let output = crate::operation_context::process_output(
            crate::operation_context::command(executable)
                .args(["tokens", "list", "--json"])
                .env("DATA_DIR", data_dir)
                .env("STORAGE_POLICY", "text")
                .stdin(Stdio::null()),
        )
        .map_err(|error| format!("could not list tokens: {error}"))?;
        if !output.status.success() {
            return Err(format!(
                "`router tokens list` failed: {}",
                String::from_utf8_lossy(&output.stderr).trim()
            ));
        }
        Ok(String::from_utf8_lossy(&output.stdout).into_owned())
    }
}

impl System {
    /// Whether a child this run started has exited, reaping it if so.
    fn exited(&self, pid: u32) -> bool {
        let mut children = self
            .children
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner);
        children
            .iter_mut()
            .find(|child| child.id() == pid)
            .is_some_and(|child| matches!(child.try_wait(), Ok(Some(_))))
    }
}

fn open_log(path: &Path) -> Result<std::fs::File, String> {
    let mut options = std::fs::OpenOptions::new();
    options.create(true).append(true);
    #[cfg(unix)]
    {
        use std::os::unix::fs::OpenOptionsExt as _;
        options.mode(0o600);
    }
    let mut file = options
        .open(path)
        .map_err(|error| format!("could not open {}: {error}", path.display()))?;
    let _ = writeln!(
        file,
        "--- router deploy --mode host {}",
        crate::operation_context::now().to_rfc3339()
    );
    Ok(file)
}

/// Its own process group: closing the terminal that ran `router deploy`
/// signals that terminal's jobs, not the deployment.
#[cfg(unix)]
fn detach(command: &mut Command) {
    use std::os::unix::process::CommandExt as _;
    command.process_group(0);
}

#[cfg(not(unix))]
const fn detach(_command: &mut Command) {}

fn signal(name: &str, pid: u32) {
    #[cfg(unix)]
    let _ = crate::operation_context::process_output(
        crate::operation_context::command("kill")
            .args([&format!("-{name}"), &pid.to_string()])
            .stdout(Stdio::null())
            .stderr(Stdio::null()),
    )
    .map(|output| output.status);
    #[cfg(windows)]
    let _ = (
        name,
        crate::operation_context::process_output(
            crate::operation_context::command("taskkill").args(["/PID", &pid.to_string(), "/F"]),
        )
        .map(|output| output.status),
    );
}

fn alive(pid: u32) -> bool {
    // A stopped process whose parent (not this command, which may have
    // exited long ago) has not reaped it yet is a zombie: `kill -0` still
    // succeeds for it, `ps` reports state `Z`.
    #[cfg(unix)]
    {
        crate::operation_context::process_output(crate::operation_context::command("ps").args([
            "-p",
            &pid.to_string(),
            "-o",
            "stat=",
        ]))
        .is_ok_and(|output| {
            let state = String::from_utf8_lossy(&output.stdout);
            let state = state.trim();
            output.status.success() && !state.is_empty() && !state.starts_with('Z')
        })
    }
    #[cfg(windows)]
    {
        crate::operation_context::process_output(
            &mut crate::operation_context::command("tasklist").args([
                "/FI",
                &format!("PID eq {pid}"),
                "/NH",
            ]),
        )
        .is_ok_and(|output| String::from_utf8_lossy(&output.stdout).contains(&pid.to_string()))
    }
}

#[cfg(test)]
mod tests {
    use super::{HostRuntime as _, System};

    /// `router deploy` probes the candidate from inside its own runtime; the
    /// probe must not build a nested one there (issue #662).
    #[tokio::test(flavor = "multi_thread", worker_threads = 2)]
    async fn the_catalog_probe_works_inside_the_deploy_runtime() {
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let port = listener.local_addr().unwrap().port();
        let app = axum::Router::new().route(
            "/api/models",
            axum::routing::get(|| async {
                axum::Json(serde_json::json!({
                    "data": [{"id": "claude-fixture", "owned_by": "anthropic"}]
                }))
            }),
        );
        let server = tokio::spawn(async move { axum::serve(listener, app).await.unwrap() });

        let catalog = System::default().catalog(port, "probe-token");

        server.abort();
        assert_eq!(
            catalog.unwrap().into_iter().collect::<Vec<_>>(),
            ["anthropic/claude-fixture"]
        );
    }
}
