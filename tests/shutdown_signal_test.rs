//! `serve` stops when it is asked to, rather than when it is killed.
//!
//! Issue #334 was reported from a deployment where every `docker stop` waited
//! out its full grace period and was then `SIGKILL`ed — 30 seconds to stop an
//! idle router, with any in-flight stream severed at the timeout rather than
//! allowed to finish. Only `ctrl_c` was awaited, so `SIGTERM` reached no
//! handler at all.
//!
//! Unix only: there is no `SIGTERM` on Windows, and the graceful path there is
//! reached through `ctrl_c`, which a test cannot raise against another process.

#![cfg(unix)]

use std::io::{Read as _, Write as _};
use std::net::{TcpListener, TcpStream};
use std::process::{Child, Command, Stdio};
use std::time::{Duration, Instant};

struct Router {
    child: Child,
    port: u16,
    _data_dir: tempfile::TempDir,
}

impl Drop for Router {
    fn drop(&mut self) {
        // Only reached when a test failed before stopping the child itself.
        let _ = self.child.kill();
        let _ = self.child.wait();
    }
}

impl Router {
    fn start() -> Self {
        let port = TcpListener::bind("127.0.0.1:0")
            .expect("bind an ephemeral port")
            .local_addr()
            .expect("ephemeral address")
            .port();
        let data_dir = tempfile::tempdir().expect("temporary data directory");
        let child = Command::new(env!("CARGO_BIN_EXE_link-assistant-router"))
            .arg("serve")
            .env("TOKEN_SECRET", "shutdown-signal-test-secret")
            .env("ROUTER_HOST", "127.0.0.1")
            .env("ROUTER_PORT", port.to_string())
            .env("DATA_DIR", data_dir.path())
            .env("CLAUDE_CODE_HOME", data_dir.path().join("claude"))
            .env("DISABLE_LOGIN_API", "true")
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .spawn()
            .expect("start router");
        let router = Self {
            child,
            port,
            _data_dir: data_dir,
        };
        router.wait_until_ready();
        router
    }

    fn wait_until_ready(&self) {
        let deadline = Instant::now() + Duration::from_secs(30);
        while Instant::now() < deadline {
            if self.get("/api/health").is_some() {
                return;
            }
            std::thread::sleep(Duration::from_millis(100));
        }
        panic!("router did not become ready");
    }

    fn get(&self, path: &str) -> Option<String> {
        let mut stream = TcpStream::connect(("127.0.0.1", self.port)).ok()?;
        write!(
            stream,
            "GET {path} HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n"
        )
        .ok()?;
        let mut response = String::new();
        stream.read_to_string(&mut response).ok()?;
        Some(response)
    }

    /// Send `SIGTERM`, the signal `docker stop` and Kubernetes send.
    ///
    /// Through `kill(1)` rather than the libc call, so the test needs no
    /// `unsafe` and no dependency this crate does not already build with.
    fn terminate(&self) {
        let sent = Command::new("kill")
            .args(["-TERM", &self.child.id().to_string()])
            .status()
            .expect("run kill");
        assert!(sent.success(), "SIGTERM could not be delivered");
    }

    fn wait(&mut self) -> std::process::ExitStatus {
        self.child.wait().expect("the router exits")
    }
}

/// An idle deployment stops immediately and reports success.
///
/// Measured on the reported deployment: `docker stop -t 30` took 30.4 seconds
/// with nothing in flight, because the signal was discarded and the container
/// was `SIGKILL`ed when the grace period expired. Exit code 0 is what
/// distinguishes "the router stopped" from "the router was killed" — a stop
/// that ends in 143 or 137 has drained nothing.
#[test]
fn an_idle_router_stops_promptly_and_exits_zero() {
    let mut router = Router::start();

    let started = Instant::now();
    router.terminate();
    let status = router.wait();
    let elapsed = started.elapsed();

    assert!(
        status.success(),
        "an asked-for stop must exit 0, got {status:?}"
    );
    assert!(
        elapsed < Duration::from_secs(5),
        "an idle router has nothing to drain and must not wait: took {elapsed:?}"
    );
}

/// The listener stops accepting once it has been asked to stop.
///
/// The other half of a drain: a stop that kept accepting new work would never
/// finish, and one that never stopped accepting was the reason the grace
/// period had to be waited out.
#[test]
fn a_stopped_router_stops_answering() {
    let mut router = Router::start();
    assert!(
        router
            .get("/api/health")
            .is_some_and(|body| body.contains("200")),
        "the router answers before it is asked to stop"
    );

    router.terminate();
    let status = router.wait();
    assert!(status.success(), "clean stop, got {status:?}");

    assert!(
        router.get("/api/health").is_none(),
        "a stopped router must not still be answering"
    );
}
