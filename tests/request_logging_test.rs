use std::io::{Read, Write};
use std::net::{TcpListener, TcpStream};
use std::process::{Child, Command, Stdio};
use std::time::{Duration, Instant};

struct Router {
    child: Child,
    port: u16,
    data_dir: tempfile::TempDir,
}

impl Drop for Router {
    fn drop(&mut self) {
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
            .env("TOKEN_SECRET", "request-logging-test-secret")
            .env("ROUTER_HOST", "127.0.0.1")
            .env("ROUTER_PORT", port.to_string())
            .env("DATA_DIR", data_dir.path())
            .env("STORAGE_POLICY", "text")
            .env("CLAUDE_CODE_HOME", data_dir.path().join("claude"))
            .env("DISABLE_LOGIN_API", "true")
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .spawn()
            .expect("start router");
        let router = Self {
            child,
            port,
            data_dir,
        };
        router.wait_until_ready();
        router
    }

    fn request(&self, extra_headers: &str) -> Option<String> {
        let mut stream = TcpStream::connect(("127.0.0.1", self.port)).ok()?;
        write!(
            stream,
            "GET /health HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n{extra_headers}\r\n"
        )
        .ok()?;
        let mut response = String::new();
        stream.read_to_string(&mut response).ok()?;
        Some(response)
    }

    fn wait_until_ready(&self) {
        let deadline = Instant::now() + Duration::from_secs(30);
        while Instant::now() < deadline {
            if self
                .request("")
                .is_some_and(|r| r.starts_with("HTTP/1.1 200"))
            {
                return;
            }
            std::thread::sleep(Duration::from_millis(50));
        }
        panic!("router did not become ready");
    }
}

#[test]
fn successful_request_is_logged_by_default() {
    let router = Router::start();
    let response = router
        .request("x-test-marker: issue-100-request\r\n")
        .expect("successful request");
    assert!(response.starts_with("HTTP/1.1 200"));

    let log_path = router.data_dir.path().join("requests.jsonl");
    let deadline = Instant::now() + Duration::from_secs(5);
    while Instant::now() < deadline {
        if let Ok(log) = std::fs::read_to_string(&log_path)
            && log.contains("issue-100-request")
        {
            assert!(log.contains("correlation_id"));
            assert!(log.contains("client_request"));
            return;
        }
        std::thread::sleep(Duration::from_millis(25));
    }
    panic!(
        "successful request was not written to {}",
        log_path.display()
    );
}
