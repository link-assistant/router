//! The `logs` subcommand, driven as an operator would drive it (issue #234).
//!
//! The value of this command is that it cannot make the two mistakes hand-written
//! greps made, so it is exercised end to end rather than only through its
//! library functions.

use std::process::Command;

use serde_json::{Value, json};

/// Write a request log the command can read.
fn write_log(root: &std::path::Path, token: &str, records: &[Value]) {
    let directory = root.join("requests").join(token);
    std::fs::create_dir_all(&directory).expect("create token directory");
    let contents = records
        .iter()
        .map(|record| serde_json::to_string(record).expect("serialize"))
        .collect::<Vec<_>>()
        .join("\n");
    std::fs::write(directory.join("requests.jsonl"), contents + "\n").expect("write log");
}

fn router(data_dir: &std::path::Path, args: &[&str]) -> std::process::Output {
    Command::new(env!("CARGO_BIN_EXE_router"))
        .arg("--data-dir")
        .arg(data_dir)
        .args(args)
        .env("TOKEN_SECRET", "logs-command-secret")
        .output()
        .expect("router runs")
}

fn truncated_stream() -> Vec<Value> {
    vec![
        json!({"correlation_id": "cut", "phase": "client_request", "uri": "/v1/messages"}),
        json!({"correlation_id": "cut", "phase": "client_response", "status": 200}),
        json!({
            "correlation_id": "cut",
            "phase": "stream_end",
            "outcome": "ended_without_terminator",
            "complete": false,
            "frames": 444
        }),
    ]
}

/// `summary` reports the shape of the log, including the integrity counts that
/// keep an operator from reading silence as evidence.
#[test]
fn summary_reports_shape_and_integrity() {
    let data = tempfile::tempdir().expect("data dir");
    write_log(data.path(), "tokenhash", &truncated_stream());

    let output = router(data.path(), &["logs", "summary"]);
    assert!(output.status.success());
    let text = String::from_utf8_lossy(&output.stdout);
    assert!(text.contains("exchanges 1"), "{text}");
    assert!(text.contains("incomplete 1"), "{text}");
    assert!(text.contains("integrity:"), "{text}");
}

/// `--json` is the input to a monitoring check, not only something a human
/// reads, so it must parse.
#[test]
fn summary_json_is_machine_readable() {
    let data = tempfile::tempdir().expect("data dir");
    write_log(data.path(), "tokenhash", &truncated_stream());

    let output = router(data.path(), &["logs", "summary", "--json"]);
    assert!(output.status.success());
    let parsed: Value =
        serde_json::from_slice(&output.stdout).expect("summary --json emits valid JSON");
    assert_eq!(parsed["exchanges"], 1);
    assert_eq!(parsed["incomplete_streams"], 1);
    assert_eq!(parsed["statuses"]["200"], 1);
}

/// `anomalies` exits non-zero when it finds something, so it gates a health
/// check; and zero when the log is clean.
#[test]
fn anomalies_exit_code_gates_a_health_check() {
    let data = tempfile::tempdir().expect("data dir");
    write_log(data.path(), "tokenhash", &truncated_stream());
    let found = router(data.path(), &["logs", "anomalies"]);
    assert!(
        !found.status.success(),
        "a log with anomalies must exit non-zero"
    );
    let text = String::from_utf8_lossy(&found.stdout);
    assert!(text.contains("stream_ended_without_terminator"), "{text}");

    let clean = tempfile::tempdir().expect("data dir");
    write_log(
        clean.path(),
        "tokenhash",
        &[
            json!({"correlation_id": "ok", "phase": "client_response", "status": 200}),
            json!({
                "correlation_id": "ok",
                "phase": "stream_end",
                "outcome": "completed",
                "complete": true,
                "frames": 3
            }),
        ],
    );
    let healthy = router(clean.path(), &["logs", "anomalies"]);
    assert!(healthy.status.success(), "a clean log must exit zero");
    assert!(
        String::from_utf8_lossy(&healthy.stdout).contains("no anomalies"),
        "a clean log should say so"
    );
}

/// The console output caps the ids it prints: the first run against real data
/// printed 849 on one line, which is unusable. `--json` keeps the full list.
#[test]
fn anomaly_ids_are_capped_on_the_console_but_complete_in_json() {
    let data = tempfile::tempdir().expect("data dir");
    let records: Vec<Value> = (0..20)
        .flat_map(|index| {
            vec![
                json!({"correlation_id": format!("id-{index:02}"), "phase": "client_response", "status": 200}),
                json!({
                    "correlation_id": format!("id-{index:02}"),
                    "phase": "stream_end",
                    "outcome": "ended_without_terminator",
                    "complete": false,
                    "frames": 1
                }),
            ]
        })
        .collect();
    write_log(data.path(), "tokenhash", &records);

    let console = router(data.path(), &["logs", "anomalies"]);
    let text = String::from_utf8_lossy(&console.stdout);
    assert!(
        text.contains("15 more"),
        "the remainder is summarised: {text}"
    );

    let structured = router(data.path(), &["logs", "anomalies", "--json"]);
    let parsed: Value = serde_json::from_slice(&structured.stdout).expect("valid JSON");
    let ids = parsed[0]["correlation_ids"].as_array().expect("ids");
    assert_eq!(ids.len(), 20, "--json carries every id");
}

/// `show` closes the loop from a named correlation id back to the records.
#[test]
fn show_renders_one_exchange() {
    let data = tempfile::tempdir().expect("data dir");
    write_log(
        data.path(),
        "tokenhash",
        &[
            json!({"correlation_id": "wanted", "phase": "client_request", "uri": "/v1/messages"}),
            json!({"correlation_id": "other", "phase": "client_request", "uri": "/elsewhere"}),
        ],
    );

    let output = router(data.path(), &["logs", "show", "wanted"]);
    assert!(output.status.success());
    let text = String::from_utf8_lossy(&output.stdout);
    assert!(text.contains("/v1/messages"), "{text}");
    assert!(!text.contains("/elsewhere"), "{text}");

    let missing = router(data.path(), &["logs", "show", "absent"]);
    assert!(
        String::from_utf8_lossy(&missing.stdout).contains("no records"),
        "an unknown id is reported, not silently empty"
    );
}

/// A log that does not exist is reported rather than presented as an empty but
/// healthy one.
#[test]
fn an_absent_log_is_not_reported_as_healthy_data() {
    let data = tempfile::tempdir().expect("data dir");
    let output = router(data.path(), &["logs", "summary"]);
    assert!(output.status.success());
    let text = String::from_utf8_lossy(&output.stdout);
    assert!(text.contains("exchanges 0"), "{text}");
}

/// `--token` narrows the analysis to one token's directory, which is what makes
/// a single client's history reviewable in isolation.
#[test]
fn a_single_token_can_be_analysed_alone() {
    let data = tempfile::tempdir().expect("data dir");
    write_log(data.path(), "aaaa1111", &truncated_stream());
    write_log(
        data.path(),
        "bbbb2222",
        &[json!({"correlation_id": "other", "phase": "client_response", "status": 200})],
    );

    let output = router(
        data.path(),
        &["logs", "summary", "--json", "--token", "aaaa1111"],
    );
    let parsed: Value = serde_json::from_slice(&output.stdout).expect("valid JSON");
    assert_eq!(parsed["exchanges"], 1, "only the requested token is read");
    assert_eq!(parsed["incomplete_streams"], 1);
}

/// A complete non-streamed exchange must produce no anomalies at the CLI, and
/// must not be counted as a stream.
///
/// This is issue #252's reproduction: ordinary JSON replies were reported as
/// streams with an unknown ending, obscuring genuine truncation signals.
/// Exercised through the binary because the exit code is what gates a health
/// check.
#[test]
fn a_complete_non_streamed_exchange_is_healthy() {
    let data = tempfile::tempdir().expect("data dir");
    write_log(
        data.path(),
        "tokenhash",
        &[
            json!({"correlation_id": "plain", "phase": "client_request", "uri": "/v1/messages"}),
            json!({"correlation_id": "plain", "phase": "upstream_request"}),
            json!({
                "correlation_id": "plain",
                "phase": "upstream_response",
                "status": 200,
                "headers": {"content-type": "application/json"}
            }),
            json!({"correlation_id": "plain", "phase": "upstream_response_body", "body": "{}"}),
            json!({
                "correlation_id": "plain",
                "phase": "client_response",
                "status": 200,
                "headers": {"content-type": "application/json"}
            }),
            json!({"correlation_id": "plain", "phase": "client_response_body", "body": "{}"}),
        ],
    );

    let found = router(data.path(), &["logs", "anomalies"]);
    assert!(
        found.status.success(),
        "a complete non-streamed exchange must exit zero: {}",
        String::from_utf8_lossy(&found.stdout)
    );
    let reported = String::from_utf8_lossy(&found.stdout);
    assert!(
        !reported.contains("no_terminal_record"),
        "a JSON reply has no terminal record by construction: {reported}"
    );

    let summary = router(data.path(), &["logs", "summary", "--json"]);
    let parsed: Value = serde_json::from_slice(&summary.stdout).expect("valid JSON");
    assert_eq!(parsed["streamed"], 0, "{parsed}");
    assert_eq!(parsed["non_streamed"], 1, "{parsed}");
    assert_eq!(parsed["unterminated_streams"], 0, "{parsed}");
}
