//! A router already listening locally is used instead of a managed container.
//!
//! Issue #250: with nothing selected explicitly, `with` and `auth` started a
//! managed Docker container without asking whether a router was already
//! running — including one reachable on localhost because an SSH tunnel
//! forwards a remote deployment there. That made the expensive branch the
//! default and split state silently, since the new container has its own
//! credential directory and token store.
//!
//! These drive the released binary as a subprocess so the whole path is
//! exercised — candidate selection, the health handshake, and the reporting —
//! rather than a function called in isolation. `ROUTER_PORT` is read at
//! runtime by both the server and the discovery probe, which is what lets a
//! test pin the port without mutating this process's environment.

use std::io::Read as _;
use std::net::TcpListener;
use std::process::{Child, Command, Stdio};
use std::time::{Duration, Instant};

/// A router process on its own port, killed when the test ends.
struct Router {
    child: Child,
    port: u16,
    _data: tempfile::TempDir,
}

impl Drop for Router {
    fn drop(&mut self) {
        let _ = self.child.kill();
        let _ = self.child.wait();
    }
}

/// Whether `url` answers a router health check, over a bare TCP request.
///
/// Hand-rolled to match the other integration tests: the workspace carries no
/// blocking HTTP client for tests.
fn health_ok(url: &str) -> bool {
    use std::io::Write as _;
    use std::net::TcpStream;

    let Some(rest) = url.strip_prefix("http://") else {
        return false;
    };
    let Some((authority, path)) = rest.split_once('/') else {
        return false;
    };
    let Ok(mut stream) = TcpStream::connect(authority) else {
        return false;
    };
    if stream
        .write_all(
            format!("GET /{path} HTTP/1.1\r\nHost: {authority}\r\nConnection: close\r\n\r\n")
                .as_bytes(),
        )
        .is_err()
    {
        return false;
    }
    let mut response = String::new();
    stream.read_to_string(&mut response).is_ok() && response.contains(" 200 ")
}

fn free_port() -> u16 {
    // `bind(":0")` then drop releases the port before the child binds it, so
    // another test binary running concurrently can take it in that window.
    // The loser then sends its requests to the winner's router, which answers
    // with its own tokens -- seen on CI as a scoped token appearing
    // unrestricted, because the reply came from a router that had never heard
    // of the scope (issue #368).
    //
    // The OS still picks the port, since only it knows what is already in use.
    // What is added is that no port is handed out twice within this process,
    // which removes the collisions between the suites of one binary; a caller
    // that still loses to another binary retries (see `Router::start`).
    use std::sync::{Mutex, OnceLock};
    static HANDED_OUT: OnceLock<Mutex<std::collections::HashSet<u16>>> = OnceLock::new();
    let seen = HANDED_OUT.get_or_init(|| Mutex::new(std::collections::HashSet::new()));
    for _ in 0..4_000 {
        let port = TcpListener::bind("127.0.0.1:0")
            .expect("bind ephemeral")
            .local_addr()
            .expect("address")
            .port();
        if seen.lock().expect("port registry").insert(port) {
            return port;
        }
    }
    panic!("no unused ephemeral port")
}

impl Router {
    /// Start a router, retrying if a sibling test binary won the port.
    ///
    /// `free_port` releases the port before the child binds it, so a
    /// concurrent test binary can take it. Losing is recoverable -- the next
    /// port differs -- so it is retried (issue #368).
    fn start() -> Self {
        for _ in 0..10 {
            if let Some(router) = Self::try_start() {
                return router;
            }
        }
        panic!("could not claim a port for the router in ten attempts");
    }

    fn try_start() -> Option<Self> {
        let data = tempfile::tempdir().expect("data dir");
        let port = free_port();
        let child = Command::new(env!("CARGO_BIN_EXE_link-assistant-router"))
            .arg("serve")
            .env("TOKEN_SECRET", "local-discovery-test-secret")
            .env("ROUTER_HOST", "127.0.0.1")
            .env("ROUTER_PORT", port.to_string())
            .env("STORAGE_POLICY", "text")
            .env("DATA_DIR", data.path())
            .env("CLAUDE_CODE_HOME", data.path().join("claude"))
            .env("DISABLE_LOGIN_API", "true")
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .spawn()
            .expect("start a router");
        let mut router = Self {
            child,
            port,
            _data: data,
        };
        router.await_health().then_some(router)
    }

    /// Wait for *this* router, reporting whether it is the one answering.
    ///
    /// A router replying on the port is not necessarily this one: a sibling
    /// binary that won the race answers `/api/health` just the same. A child that
    /// lost exits, so its liveness is what tells the two apart (issue #368).
    fn await_health(&mut self) -> bool {
        let deadline = Instant::now() + Duration::from_secs(30);
        let url = format!("http://127.0.0.1:{}/api/health", self.port);
        while Instant::now() < deadline {
            match self.child.try_wait() {
                Ok(Some(_)) => return false,
                Ok(None) => {}
                Err(error) => panic!("cannot poll the router: {error}"),
            }
            if health_ok(&url) {
                return true;
            }
            std::thread::sleep(Duration::from_millis(100));
        }
        panic!("router never became healthy on port {}", self.port);
    }
}

/// A directory holding a `docker` that reports no published ports.
///
/// Discovery asks Docker which ports are published, so on a developer machine
/// running any container the answer is whatever happens to be up. A test about
/// "nothing is listening" has to say what the machine is, rather than assume a
/// quiet one — the same fragility that made the `auth` tests depend on the
/// developer's own router.
fn docker_reporting_nothing() -> tempfile::TempDir {
    let bin = tempfile::tempdir().expect("stub bin directory");
    let docker = bin.path().join("docker");
    std::fs::write(&docker, "#!/bin/sh\nexit 0\n").expect("write docker stub");
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt as _;
        std::fs::set_permissions(&docker, std::fs::Permissions::from_mode(0o755))
            .expect("make the stub executable");
    }
    bin
}

/// Run `router` with nothing selected, pointing discovery at `port`.
///
/// `isolated` replaces `docker` with a stub reporting no containers, for the
/// cases that assert nothing is discoverable.
fn status_with_candidate_isolated(port: u16, isolated: bool) -> String {
    let config = tempfile::tempdir().expect("config home");
    let home = tempfile::tempdir().expect("home");
    let stub = isolated.then(docker_reporting_nothing);
    let mut command = Command::new(env!("CARGO_BIN_EXE_link-assistant-router"));
    command
        .args(["server", "status"])
        .env("XDG_CONFIG_HOME", config.path())
        .env("HOME", home.path())
        .env("TOKEN_SECRET", "local-discovery-test-secret")
        // The candidate list reads `ROUTER_PORT`, which is how a router started
        // on a non-default port is found.
        .env("ROUTER_PORT", port.to_string())
        .env_remove("ROUTER_URL")
        .env_remove("LINK_ASSISTANT_ROUTER_URL");
    if let Some(stub) = stub.as_ref() {
        command.env("PATH", stub.path());
    }
    let output = command.output().expect("run server status");
    String::from_utf8_lossy(&output.stdout).to_string()
}

/// Run `router` with nothing selected, pointing discovery at `port`.
fn status_with_candidate(port: u16) -> String {
    status_with_candidate_isolated(port, false)
}

/// The headline of #250: a router already listening is used, and named, rather
/// than a managed container being announced in its place.
#[test]
fn a_running_router_is_discovered_instead_of_a_container() {
    let router = Router::start();

    let status = status_with_candidate(router.port);

    assert!(
        status.contains("already-running local server"),
        "a running router must be preferred to a container: {status}"
    );
    assert!(
        status.contains(&format!("127.0.0.1:{}", router.port)),
        "the discovered router must be named: {status}"
    );
}

/// With nothing listening, the managed container remains the answer — the
/// change is only to the default's first step, not to the fallback.
#[test]
fn without_a_running_router_the_managed_container_still_answers() {
    // A port nothing is bound to: taken and released, so it is free.
    let port = free_port();

    let status = status_with_candidate_isolated(port, true);

    assert!(
        status.contains("managed local container"),
        "with nothing listening the managed container must still be the answer: {status}"
    );
}

/// A listener that is not a router must be rejected by the health handshake,
/// rather than adopted because something happened to hold the port.
#[test]
fn a_non_router_listener_is_not_adopted() {
    let listener = TcpListener::bind("127.0.0.1:0").expect("bind a decoy");
    let port = listener.local_addr().expect("local address").port();
    std::thread::spawn(move || {
        for stream in listener.incoming().take(8) {
            let Ok(mut stream) = stream else { continue };
            let mut scratch = [0; 1024];
            let _ = stream.read(&mut scratch);
            let _ = std::io::Write::write_all(
                &mut stream,
                b"HTTP/1.1 200 OK\r\ncontent-length: 5\r\nconnection: close\r\n\r\nhello",
            );
        }
    });

    let status = status_with_candidate_isolated(port, true);

    assert!(
        status.contains("managed local container"),
        "a non-router listener must not be adopted: {status}"
    );
}

/// `auth` must act on the discovered router rather than this machine's
/// credential directory: authorizing locally while a live router is one port
/// away lands the subscription where the router in use cannot see it.
#[test]
fn auth_targets_the_discovered_router() {
    let router = Router::start();
    let config = tempfile::tempdir().expect("config home");
    let home = tempfile::tempdir().expect("home");

    let output = Command::new(env!("CARGO_BIN_EXE_link-assistant-router"))
        .args(["auth", "status"])
        .env("XDG_CONFIG_HOME", config.path())
        .env("HOME", home.path())
        .env("TOKEN_SECRET", "local-discovery-test-secret")
        .env("ROUTER_PORT", router.port.to_string())
        .env_remove("ROUTER_URL")
        .env_remove("LINK_ASSISTANT_ROUTER_URL")
        .output()
        .expect("run auth status");

    // The router is unclaimed in this fixture, so the call may succeed or be
    // refused; either way it must have gone to the router rather than
    // describing local homes.
    let combined = format!(
        "{}{}",
        String::from_utf8_lossy(&output.stdout),
        String::from_utf8_lossy(&output.stderr)
    );
    assert!(
        !combined.contains(&home.path().display().to_string()),
        "auth described local homes instead of the discovered router: {combined}"
    );
}

/// `--managed` must keep `auth` local even while a router is listening, so a
/// clean-room run is unaffected by what happens to be running.
#[test]
fn managed_keeps_auth_local_even_with_a_router_listening() {
    let router = Router::start();
    let config = tempfile::tempdir().expect("config home");
    let home = tempfile::tempdir().expect("home");

    let output = Command::new(env!("CARGO_BIN_EXE_link-assistant-router"))
        .args(["auth", "status", "--managed"])
        .env("XDG_CONFIG_HOME", config.path())
        .env("HOME", home.path())
        .env("TOKEN_SECRET", "local-discovery-test-secret")
        .env("ROUTER_PORT", router.port.to_string())
        .env("CLAUDE_CODE_HOME", home.path().join(".claude"))
        .env_remove("ROUTER_URL")
        .env_remove("LINK_ASSISTANT_ROUTER_URL")
        .output()
        .expect("run auth status --managed");

    let stdout = String::from_utf8_lossy(&output.stdout);
    assert!(
        stdout.contains("claude"),
        "--managed must describe local homes: {stdout}"
    );
}
