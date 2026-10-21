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
//!
//! The log is now named `requests.lino`, because that is what it holds. A log
//! left under the old name is renamed on its token's next write rather than
//! read under two names forever, and one that has not been written since is
//! still found and still read.

use std::fmt::Write as _;
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
            "GET /api/health HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n{extra_headers}\r\n"
        )
        .ok()?;
        let mut response = String::new();
        stream.read_to_string(&mut response).ok()?;
        Some(response)
    }

    fn log_path(&self) -> PathBuf {
        self.data_dir.join("requests/unauthenticated/requests.lino")
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
            line.starts_with("(#o "),
            "a record must be a marked links-notation object: {line}"
        );
        // The property that actually failed in issue #350: the notation's own
        // parser has to accept a file this project calls links notation, and
        // the codec has to decode it to the structure the record meant.
        assert!(
            links_notation::parse_lino(line).is_ok(),
            "parse_lino must accept a line this project writes: {line}"
        );
        assert!(
            lino_objects_codec::decode(line).is_ok(),
            "the codec must decode a line this project writes: {line}"
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

/// A log an earlier release wrote is renamed, kept, and appended to.
///
/// Nothing is rewritten and nothing is lost: the file takes the name that
/// describes it, every record already in it stays exactly as it was, and new
/// records append in links notation.
#[test]
fn a_json_log_from_an_earlier_release_still_reads_and_migrates_in_place() {
    let directory = tempfile::tempdir().expect("temporary data directory");
    let token_directory = directory.path().join("requests/unauthenticated");
    std::fs::create_dir_all(&token_directory).expect("create the log directory");
    let legacy_path = token_directory.join("requests.jsonl");
    let path = token_directory.join("requests.lino");

    // Exactly what an earlier release left behind: JSON, one object per line.
    let legacy = serde_json::json!({
        "phase": "client_request",
        "correlation_id": "legacy-correlation",
        "model": "claude-opus-4",
        "time": "2026-08-24T15:24:36.409091995+00:00",
    });
    std::fs::write(&legacy_path, format!("{legacy}\n")).expect("write the legacy log");

    let router = Router::start(directory.path(), &[]);
    router
        .get("x-test-marker: issue-346-migration\r\n")
        .expect("a successful request");
    let log = router.log_containing("issue-346-migration");
    drop(router);

    // The file is renamed, not abandoned: `requests.jsonl` described JSON,
    // and the bytes in it are links notation now (issue #346).
    assert!(
        path.is_file(),
        "the log must have been renamed to requests.lino"
    );
    assert!(
        !legacy_path.exists(),
        "the old name must not be left behind holding the same records"
    );

    let lines = records(&log);
    assert!(
        lines.len() > 1,
        "the router must have kept the existing records and appended: {log}"
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

/// An idle token's history survives under the old name.
///
/// The rename happens on write. A token nobody has called since the upgrade
/// has no write to trigger it, so its log stays `requests.jsonl` — and it must
/// still be found and read, or upgrading would appear to erase the history of
/// every quiet token (issue #346).
#[test]
fn a_log_never_written_since_the_rename_is_still_read() {
    let directory = tempfile::tempdir().expect("temporary data directory");
    let idle = directory.path().join("requests/aa11-idle-token");
    std::fs::create_dir_all(&idle).expect("create the idle token directory");
    let record = serde_json::json!({
        "phase": "client_request",
        "correlation_id": "idle-token-history",
        "method": "GET",
        "uri": "/health",
        "time": "2026-08-24T15:24:36.409091995+00:00",
    });
    std::fs::write(idle.join("requests.jsonl"), format!("{record}\n")).expect("write");

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
        "an un-renamed log must read cleanly: {rendered}"
    );
    assert!(
        !rendered.contains("records 0") && !rendered.contains("exchanges 0"),
        "an idle token's history must still be counted: {rendered}"
    );
}

/// The rename keeps every byte, and the bound still sees them.
///
/// Two ways this could go wrong and both lose data: the old file left orphaned
/// beside a new empty one, or the size cap treating a renamed log as empty and
/// letting the token exceed its budget (issue #346).
#[test]
fn the_rename_preserves_the_records_and_the_size_accounting() {
    let directory = tempfile::tempdir().expect("temporary data directory");
    let token_directory = directory.path().join("requests/unauthenticated");
    std::fs::create_dir_all(&token_directory).expect("create the log directory");
    let legacy_path = token_directory.join("requests.jsonl");

    let mut seeded = String::new();
    for sequence in 0..20 {
        let record = serde_json::json!({
            "phase": "client_request",
            "correlation_id": format!("seeded-{sequence:02}"),
            "time": "2026-08-24T15:24:36.409091995+00:00",
        });
        let _ = writeln!(seeded, "{record}");
    }
    std::fs::write(&legacy_path, &seeded).expect("write the legacy log");
    let seeded_bytes = seeded.len();

    let router = Router::start(directory.path(), &[]);
    router
        .get("x-test-marker: issue-346-preserved\r\n")
        .expect("a successful request");
    let log = router.log_containing("issue-346-preserved");
    drop(router);

    assert!(
        !legacy_path.exists(),
        "the old file must not be left orphaned beside the new one"
    );
    // Every seeded correlation is still there, and the file grew rather than
    // being replaced.
    for sequence in 0..20 {
        let needle = format!("seeded-{sequence:02}");
        assert!(
            log.contains(&needle),
            "the rename dropped record {needle}: {} bytes now",
            log.len()
        );
    }
    assert!(
        log.len() > seeded_bytes,
        "the log must have grown from {seeded_bytes} bytes, found {}",
        log.len()
    );
}
