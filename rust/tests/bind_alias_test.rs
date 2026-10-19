//! A listener alias is resolved once and the address the OS actually bound is logged.
//!
//! Docker network aliases are the motivating case: binding `0.0.0.0` would
//! expose the Router on every attached network, while the alias resolves to
//! only the intended network address (issue #545).

use std::io::{Read as _, Write as _};
use std::net::{SocketAddr, TcpStream};
use std::process::{Child, Command, Stdio};
use std::time::{Duration, Instant};

struct Router {
    child: Child,
    data_dir: tempfile::TempDir,
}

impl Drop for Router {
    fn drop(&mut self) {
        let _ = self.child.kill();
        let _ = self.child.wait();
    }
}

#[test]
fn serve_resolves_a_host_alias_and_logs_the_effective_address() {
    let data_dir = tempfile::tempdir().expect("temporary Router data");
    let child = Command::new(env!("CARGO_BIN_EXE_link-assistant-router"))
        .arg("serve")
        .env("TOKEN_SECRET", "bind-alias-test-secret")
        .env("ROUTER_HOST", "localhost")
        .env("ROUTER_PORT", "0")
        .env("DATA_DIR", data_dir.path())
        .env_remove("VERBOSE")
        .env("RUST_LOG", "info")
        .env("CLAUDE_CODE_HOME", data_dir.path().join("claude"))
        .env("DISABLE_LOGIN_API", "true")
        .env("ALLOW_ANONYMOUS_ADMIN", "true")
        .env("NO_COLOR", "1")
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .expect("start Router with a host alias");
    let mut router = Router { child, data_dir };

    let deadline = Instant::now() + Duration::from_secs(30);
    let address = 'address: loop {
        let observed = std::fs::read_to_string(router.data_dir.path().join("logs/operational.log"))
            .unwrap_or_default();
        let remaining = deadline.saturating_duration_since(Instant::now());
        assert!(
            !remaining.is_zero(),
            "no effective listen address in {observed:?}"
        );
        for line in observed.lines() {
            if let Some(rendered) = line.split("Listening on http://").nth(1)
                && let Some(candidate) = rendered.split_whitespace().next()
                && let Ok(address) = candidate.parse::<SocketAddr>()
            {
                break 'address address;
            }
        }
        if let Some(status) = router.child.try_wait().expect("read Router status") {
            panic!("Router exited with {status}; log: {observed:?}");
        }
        std::thread::sleep(Duration::from_millis(50));
    };

    assert!(
        address.ip().is_loopback(),
        "localhost resolved to {address}"
    );
    assert_ne!(
        address.port(),
        0,
        "the logged port must be the OS-assigned port"
    );
    let mut stream = TcpStream::connect(address).expect("connect to the logged address");
    write!(
        stream,
        "GET /api/health HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n"
    )
    .expect("request health from the bound address");
    let mut response = String::new();
    stream
        .read_to_string(&mut response)
        .expect("read Router health response");
    assert!(response.starts_with("HTTP/1.1 200"), "{response}");
}
