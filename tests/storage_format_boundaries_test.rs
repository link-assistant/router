//! Every persisted file is in the format its documentation claims.
//!
//! `#336` converted the request log to links notation, but the README still
//! described it as an "append-only operational stream" excluded from the
//! conversion, `lino_json`'s boundary comment listed only the small stores,
//! and the CHANGELOG carried both "stays JSON Lines for now, deliberately"
//! and "is written in links notation" inside one release section. The
//! behaviour and the documented decision disagreed, which is how a deliberate
//! choice becomes indistinguishable from an oversight (issue #346).
//!
//! Prose drifts. These tests are the executable half of that decision: each
//! asserts the format of a file the router writes, so changing a format means
//! changing a test that states why the format was chosen.

use std::io::{Read, Write};
use std::net::{TcpListener, TcpStream};
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::time::{Duration, Instant};

struct Router {
    child: Child,
    port: u16,
    data_dir: PathBuf,
}

impl Drop for Router {
    fn drop(&mut self) {
        let _ = self.child.kill();
        let _ = self.child.wait();
    }
}

impl Router {
    /// Start a router writing into `data_dir`, with any extra arguments.
    fn start(data_dir: &Path, arguments: &[&str]) -> Self {
        let port = TcpListener::bind("127.0.0.1:0")
            .expect("bind an ephemeral port")
            .local_addr()
            .expect("ephemeral address")
            .port();
        let child = Command::new(env!("CARGO_BIN_EXE_link-assistant-router"))
            .arg("serve")
            .args(arguments)
            .env("TOKEN_SECRET", "storage-format-boundaries-test-secret")
            .env("ROUTER_HOST", "127.0.0.1")
            .env("ROUTER_PORT", port.to_string())
            .env("DATA_DIR", data_dir)
            .env("STORAGE_POLICY", "text")
            .env("CLAUDE_CODE_HOME", data_dir.join("claude"))
            .env("DISABLE_LOGIN_API", "true")
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .spawn()
            .expect("start router");
        let router = Self {
            child,
            port,
            data_dir: data_dir.to_path_buf(),
        };
        router.wait_until_ready();
        router
    }

    fn get(&self, extra_headers: &str) -> Option<String> {
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

    fn log_path(&self) -> PathBuf {
        self.data_dir
            .join("requests/unauthenticated/requests.jsonl")
    }

    /// The log, once a record containing `needle` has landed.
    fn log_containing(&self, needle: &str) -> String {
        let deadline = Instant::now() + Duration::from_secs(5);
        while Instant::now() < deadline {
            if let Ok(log) = std::fs::read_to_string(self.log_path())
                && log.contains(needle)
            {
                return log;
            }
            std::thread::sleep(Duration::from_millis(25));
        }
        panic!("no record containing {needle} was written");
    }

    fn wait_until_ready(&self) {
        let deadline = Instant::now() + Duration::from_secs(30);
        while Instant::now() < deadline {
            if self.get("").is_some_and(|r| r.starts_with("HTTP/1.1 200")) {
                return;
            }
            std::thread::sleep(Duration::from_millis(50));
        }
        panic!("router did not become ready");
    }
}

/// Whether a line parses as JSON.
fn is_json(line: &str) -> bool {
    serde_json::from_str::<serde_json::Value>(line).is_ok()
}

fn records(log: &str) -> Vec<&str> {
    log.lines().filter(|line| !line.trim().is_empty()).collect()
}

/// The per-token request log is readable links notation, one record per line.
///
/// Three properties at once, because the log needs all three and no encoder
/// the codec ships offers them together: readable rather than base64, one
/// record per line so the compactor's newline cut lands on a boundary, and
/// machine-readable on the way back.
#[test]
fn the_request_log_is_readable_links_notation_one_record_per_line() {
    let directory = tempfile::tempdir().expect("temporary data directory");
    let router = Router::start(directory.path(), &[]);
    router
        .get("x-test-marker: issue-346-format\r\n")
        .expect("a successful request");
    let log = router.log_containing("issue-346-format");

    let lines = records(&log);
    assert!(!lines.is_empty(), "the router recorded nothing");
    for line in &lines {
        assert!(
            !is_json(line),
            "a record is still JSON, so the conversion regressed: {line}"
        );
        assert!(
            line.starts_with("((:"),
            "a record must be a links-notation object: {line}"
        );
        assert!(
            link_assistant_router::lino_json::decode_line(line).is_some(),
            "a record the router wrote must read back: {line}"
        );
        assert_eq!(
            line.lines().count(),
            1,
            "a record must not span lines, or compaction cuts inside one: {line}"
        );
    }

    // Readable, not base64: the point of the single-line emitter is that a
    // header or a model name is still findable with `grep` (issues #328, #336).
    assert!(
        log.contains("issue-346-format"),
        "strings must be written as themselves, not encoded: {log}"
    );
}

/// A log an earlier release wrote as JSON keeps reading, and migrates in place.
///
/// This is what makes the conversion safe to ship without a migration step:
/// the bytes already on disk are not rewritten, they are read as they are, and
/// a file becomes links notation record by record as new ones are appended.
#[test]
fn a_json_log_from_an_earlier_release_still_reads_and_migrates_in_place() {
    let directory = tempfile::tempdir().expect("temporary data directory");
    let token_directory = directory.path().join("requests/unauthenticated");
    std::fs::create_dir_all(&token_directory).expect("create the log directory");
    let path = token_directory.join("requests.jsonl");

    // Exactly what an earlier release left behind: JSON, one object per line.
    let legacy = serde_json::json!({
        "phase": "client_request",
        "correlation_id": "legacy-correlation",
        "model": "claude-opus-4",
        "time": "2026-08-24T15:24:36.409091995+00:00",
    });
    std::fs::write(&path, format!("{legacy}\n")).expect("write the legacy log");

    let router = Router::start(directory.path(), &[]);
    router
        .get("x-test-marker: issue-346-migration\r\n")
        .expect("a successful request");
    let log = router.log_containing("issue-346-migration");
    drop(router);

    let lines = records(&log);
    assert!(
        lines.len() > 1,
        "the router must have appended to the existing log: {log}"
    );
    assert!(
        is_json(lines[0]) && lines[0].contains("claude-opus-4"),
        "the legacy record is left exactly as it was, not rewritten: {}",
        lines[0]
    );
    assert!(
        lines[1..].iter().any(|line| !is_json(line)),
        "records appended after it are links notation: {log}"
    );

    // Both halves read, which is what "migrates in place" has to mean for the
    // reader. A reader left on one encoding would drop the other half.
    let decoded = lines
        .iter()
        .filter_map(|line| link_assistant_router::lino_json::decode_line(line))
        .collect::<Vec<_>>();
    assert_eq!(
        decoded.len(),
        lines.len(),
        "every record in a mixed-format file must read: {log}"
    );
    assert!(
        decoded
            .iter()
            .any(|record| record["correlation_id"] == "legacy-correlation"),
        "including the legacy one: {log}"
    );
}

/// `router logs` reports a mixed-format file as whole, not as damage.
///
/// The integrity line counts unparsable records. Had the reader been left on
/// one encoding, every record in the other half would be counted as
/// corruption, and an operator would go looking for a disk fault.
#[test]
fn a_mixed_format_log_reports_no_integrity_damage() {
    let directory = tempfile::tempdir().expect("temporary data directory");
    let token_directory = directory.path().join("requests/unauthenticated");
    std::fs::create_dir_all(&token_directory).expect("create the log directory");

    let json_record = serde_json::json!({
        "phase": "client_request",
        "correlation_id": "mixed",
        "method": "GET",
        "uri": "/health",
        "time": "2026-08-24T15:24:36.409091995+00:00",
    });
    let lino_record = link_assistant_router::lino_json::encode_line(&serde_json::json!({
        "phase": "client_response",
        "correlation_id": "mixed",
        "status": 200,
        "time": "2026-08-24T15:24:37.409091995+00:00",
    }))
    .expect("encode a record");
    std::fs::write(
        token_directory.join("requests.jsonl"),
        format!("{json_record}\n{lino_record}\n"),
    )
    .expect("write the mixed log");

    let output = Command::new(env!("CARGO_BIN_EXE_link-assistant-router"))
        .args([
            "logs",
            "summary",
            "--data-dir",
            directory.path().to_str().expect("a printable path"),
        ])
        .env("TOKEN_SECRET", "storage-format-boundaries-test-secret")
        .output()
        .expect("run router logs");
    let rendered = format!(
        "{}{}",
        String::from_utf8_lossy(&output.stdout),
        String::from_utf8_lossy(&output.stderr)
    );
    assert!(
        rendered.contains("0 unparsable record"),
        "a mixed-format log is whole, not damaged: {rendered}"
    );
}
