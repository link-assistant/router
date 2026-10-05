#!/usr/bin/env rust-script
//! Re-record the vendor cassettes under `tests/fixtures/vendor/` (#671).
//!
//! Every cassette with a `record` section is re-sent to the real vendor with a
//! real key, and its `response` is replaced by what the vendor answered —
//! after scrubbing identifiers, signatures and encrypted state. Cassettes with
//! `"record": null` (error envelopes that cannot be provoked on demand) are
//! left untouched.
//!
//! ```text
//! ANTHROPIC_API_KEY=... ANTHROPIC_FIXTURE_MODEL=... \
//! OPENAI_API_KEY=...    OPENAI_FIXTURE_MODEL=... OPENAI_CHAT_FIXTURE_MODEL=... \
//! GEMINI_API_KEY=...    GEMINI_FIXTURE_MODEL=... \
//!   rust-script scripts/record-vendor-fixtures.rs [--only <substring>] [--check]
//! ```
//!
//! A cassette whose key or model variable is unset is skipped with a notice,
//! so one vendor can be re-recorded at a time. `--check` validates every
//! cassette offline (schema, scrubbing, replayable body) without network
//! access; CI runs it. After recording, update each cassette's `expect`
//! block if the vendor's answer changed and run
//! `cargo test -j2 --test vendor_fixture_replay_test`.
//!
//! ```cargo
//! [dependencies]
//! serde_json = "1"
//! ureq = "2"
//! ```

use std::path::{Path, PathBuf};
use std::process::ExitCode;

use serde_json::{Map, Value, json};

const SCHEMA: &str = "link-assistant-router/vendor-cassette/v1";
/// Headers worth keeping: the ones Router's translators and error mapping read.
const KEPT_HEADERS: &[&str] = &["content-type", "retry-after"];
/// Substrings that must never appear in a committed cassette.
const FORBIDDEN: &[&str] = &[
    "sk-ant-",
    "sk-proj-",
    "bearer ",
    "ya29.",
    "aiza",
    "anthropic-organization-id",
    "openai-organization",
    "set-cookie",
];

fn main() -> ExitCode {
    let args: Vec<String> = std::env::args().skip(1).collect();
    let check = args.iter().any(|arg| arg == "--check");
    let only = args
        .iter()
        .position(|arg| arg == "--only")
        .and_then(|index| args.get(index + 1).cloned());
    let root = Path::new(env!("CARGO_MANIFEST_DIR"))
        .ancestors()
        .find(|dir| dir.join("tests/fixtures/vendor").is_dir())
        .map(|dir| dir.join("tests/fixtures/vendor"))
        .or_else(|| {
            let cwd = std::env::current_dir().ok()?.join("tests/fixtures/vendor");
            cwd.is_dir().then_some(cwd)
        });
    let Some(root) = root else {
        eprintln!("run from the repository root: tests/fixtures/vendor not found");
        return ExitCode::FAILURE;
    };
    let mut failures = 0;
    for path in cassettes(&root) {
        let name = path.strip_prefix(&root).unwrap_or(&path).display().to_string();
        if only.as_deref().is_some_and(|only| !name.contains(only)) {
            continue;
        }
        let result = if check {
            check_cassette(&path)
        } else {
            record_cassette(&path)
        };
        match result {
            Ok(note) => println!("{name}: {note}"),
            Err(error) => {
                failures += 1;
                eprintln!("{name}: {error}");
            }
        }
    }
    if failures == 0 {
        ExitCode::SUCCESS
    } else {
        ExitCode::FAILURE
    }
}

fn cassettes(root: &Path) -> Vec<PathBuf> {
    let mut paths = Vec::new();
    for dir in std::fs::read_dir(root).into_iter().flatten().flatten() {
        if dir.path().is_dir() {
            for file in std::fs::read_dir(dir.path()).into_iter().flatten().flatten() {
                if file.path().extension().and_then(|ext| ext.to_str()) == Some("json") {
                    paths.push(file.path());
                }
            }
        }
    }
    paths.sort();
    paths
}

fn load(path: &Path) -> Result<Value, String> {
    let text = std::fs::read_to_string(path).map_err(|error| error.to_string())?;
    serde_json::from_str(&text).map_err(|error| format!("invalid JSON: {error}"))
}

fn check_cassette(path: &Path) -> Result<String, String> {
    let text = std::fs::read_to_string(path).map_err(|error| error.to_string())?;
    let lower = text.to_ascii_lowercase();
    if let Some(needle) = FORBIDDEN.iter().find(|needle| lower.contains(**needle)) {
        return Err(format!("contains unscrubbed {needle:?}"));
    }
    let cassette = load(path)?;
    if cassette["schema"] != SCHEMA {
        return Err(format!("schema must be {SCHEMA}"));
    }
    let response = &cassette["response"];
    if response["status"].as_u64().is_none() {
        return Err("response.status missing".into());
    }
    if response["sse"].is_array() == response["json"].is_object() {
        return Err("response needs exactly one of `sse` lines or a `json` body".into());
    }
    if !cassette["expect"].is_object() {
        return Err("expect block missing".into());
    }
    if cassette["request"]
        .get("model")
        .is_some_and(|model| model != "{model}")
    {
        return Err("request.model must be the {model} placeholder".into());
    }
    Ok(if cassette["record"].is_null() {
        "ok (hand-written, not re-recordable)".into()
    } else {
        "ok".into()
    })
}

fn record_cassette(path: &Path) -> Result<String, String> {
    let mut cassette = load(path)?;
    let record = cassette["record"].clone();
    if record.is_null() {
        return Ok("skipped: not re-recordable".into());
    }
    let field = |name: &str| record[name].as_str().unwrap_or_default().to_string();
    let Ok(key) = std::env::var(field("auth_env")) else {
        return Ok(format!("skipped: {} unset", field("auth_env")));
    };
    let Ok(model) = std::env::var(field("model_env")) else {
        return Ok(format!("skipped: {} unset", field("model_env")));
    };
    let url = field("url").replace("{model}", &model);
    let mut body = cassette["request"].clone();
    if body.get("model").is_some() {
        body["model"] = json!(model);
    }
    let mut request = ureq::post(&url).set("content-type", "application/json");
    request = if field("auth_header") == "authorization" {
        request.set("authorization", &format!("Bearer {key}"))
    } else {
        request.set(&field("auth_header"), &key)
    };
    for (name, value) in record["headers"].as_object().into_iter().flatten() {
        request = request.set(name, value.as_str().unwrap_or_default());
    }
    let response = match request.send_string(&body.to_string()) {
        Ok(response) | Err(ureq::Error::Status(_, response)) => response,
        Err(error) => return Err(format!("request failed: {error}")),
    };
    let status = response.status();
    let mut headers = Map::new();
    for name in KEPT_HEADERS {
        if let Some(value) = response.header(name) {
            headers.insert((*name).to_string(), json!(value));
        }
    }
    let text = response
        .into_string()
        .map_err(|error| format!("read body: {error}"))?;
    let envelope = record["code_assist_envelope"].as_bool() == Some(true);
    let mut recorded = json!({"status": status, "headers": headers});
    if text.trim_start().starts_with('{') {
        let mut value: Value =
            serde_json::from_str(&text).map_err(|error| format!("vendor JSON: {error}"))?;
        scrub(&mut value);
        recorded["json"] = value;
    } else {
        let lines = text
            .lines()
            .map(|line| scrub_sse_line(line, envelope))
            .collect::<Vec<_>>();
        recorded["sse"] = json!(lines);
    }
    cassette["response"] = recorded;
    cassette["provenance"] = json!(format!(
        "recorded from {} with scripts/record-vendor-fixtures.rs, then scrubbed",
        url.split('?').next().unwrap_or(&url)
    ));
    let mut out = serde_json::to_string_pretty(&cassette).map_err(|error| error.to_string())?;
    out.push('\n');
    std::fs::write(path, out).map_err(|error| error.to_string())?;
    check_cassette(path)?;
    Ok(format!("recorded (HTTP {status}); review `expect` before committing"))
}

fn scrub_sse_line(line: &str, envelope: bool) -> String {
    let Some(data) = line.strip_prefix("data:") else {
        return line.to_string();
    };
    let Ok(mut value) = serde_json::from_str::<Value>(data.trim_start()) else {
        return line.to_string();
    };
    scrub(&mut value);
    if envelope {
        // Router talks to Code Assist, which wraps each public-API event.
        value = json!({"response": value, "traceId": "scrubbed"});
    }
    format!("data: {value}")
}

/// Replace live identifiers, signatures and encrypted state with stable
/// placeholders of the same shape.
fn scrub(value: &mut Value) {
    match value {
        Value::Object(map) => {
            for (key, field) in map.iter_mut() {
                match (key.as_str(), field.as_str()) {
                    ("id" | "responseId" | "item_id" | "call_id" | "tool_use_id", Some(id)) => {
                        let prefix = id.split_once('_').map_or("", |(prefix, _)| prefix);
                        *field = if prefix.is_empty() {
                            json!("scrubbed")
                        } else {
                            json!(format!("{prefix}_scrubbed"))
                        };
                    }
                    ("signature" | "encrypted_content" | "thoughtSignature", Some(_)) => {
                        *field = json!("c2NydWJiZWQ=");
                    }
                    ("system_fingerprint" | "traceId", Some(_)) => *field = json!("scrubbed"),
                    ("created" | "created_at", _) if field.is_number() => {
                        *field = json!(1_700_000_000);
                    }
                    _ => scrub(field),
                }
            }
        }
        Value::Array(items) => items.iter_mut().for_each(scrub),
        _ => {}
    }
}
