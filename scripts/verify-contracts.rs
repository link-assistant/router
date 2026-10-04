#!/usr/bin/env rust-script
//! Router-owned verification of the contracts downstream projects depend on.
//!
//! Downstream integrations used to carry their own copies of Router's generic
//! tests: catalogs, client wrappers, entitlement matrices, request logs,
//! backup/reset/restore and deployment lifecycle (issue #629). This command
//! runs Router's own tests for each of those areas and writes one
//! machine-readable result, so a downstream keeps only its
//! application-specific assertions and reads the rest from here.
//!
//! A green run is not parity. A test that skipped for want of a vendor client,
//! a credential or a container runtime proved nothing, so each area reports the
//! skipped tests by name and `parity` is true only when no area failed or
//! skipped anything.
//!
//! ```bash
//! rust-script scripts/verify-contracts.rs                    # every area
//! rust-script scripts/verify-contracts.rs --area request-logs
//! rust-script scripts/verify-contracts.rs --require-parity   # exit 3 unless proven
//! rust-script scripts/verify-contracts.rs --list
//! ```
//!
//! The result is written to `target/verification/result.json` (or `--output`),
//! and each area's full test output beside it. Exit status: 0 when nothing
//! failed, 1 when a test failed, 2 for a usage error, 3 when `--require-parity`
//! was given and some area is not proven.
//!
//! ```cargo
//! [dependencies]
//! serde_json = "1"
//! tempfile = "3"
//! [target.'cfg(windows)'.dependencies]
//! process-wrap = { version = "10.0.1", default-features = false, features = ["std", "job-object"] }
//! ```

use serde_json::{Value, json};
use std::collections::BTreeMap;
use std::path::{Path, PathBuf};
use std::process::{Command, exit};

#[path = "../src/bounded_process.rs"]
mod bounded_process;
#[path = "../src/verification_client.rs"]
mod verification_client;

const SCHEMA: &str = "link-assistant-router/verification/v1";
/// The variable `tests/common/tiers.rs` appends each skip to, as JSON lines.
const SKIP_LOG: &str = "ROUTER_VERIFICATION_SKIPS";

/// One `cargo test` invocation.
struct Run {
    /// `--test` targets.
    targets: &'static [&'static str],
    /// Unit tests instead: `--lib` or `--bin <name>`.
    unit: &'static [&'static str],
    filter: Option<&'static str>,
    /// Tests that share machine-wide state (a container name) run serially.
    serial: bool,
}

struct Area {
    name: &'static str,
    covers: &'static str,
    /// What an area needs beyond `cargo`, so a skip can be acted on.
    enable: &'static str,
    runs: &'static [Run],
}

const fn tests(targets: &'static [&'static str]) -> Run {
    Run {
        targets,
        unit: &[],
        filter: None,
        serial: false,
    }
}

const fn unit(unit: &'static [&'static str], filter: &'static str) -> Run {
    Run {
        targets: &[],
        unit,
        filter: Some(filter),
        serial: false,
    }
}

const AREAS: &[Area] = &[
    Area {
        name: "catalogs",
        covers: "token-authorized /api/models and /v1/models: entitlement filtering, synthetic and namespaced rows, credential carriers, split origins, live provider catalogs",
        enable: "LEFINE_API_KEY for the live catalog",
        runs: &[
            tests(&[
                "credential_carrier_test",
                "synthetic_catalog_test",
                "gemini_namespace_test",
                "clients_split_origins_test",
                "client_ownership_test",
                "managed_server_test",
                "lefine_live_test",
            ]),
            unit(&["--lib"], "model_catalog"),
        ],
    },
    Area {
        name: "real-clients",
        covers: "Claude Code, Codex and OpenCode real binaries against a loopback Router, plus the separately gated host CLI lifecycle",
        enable: "ROUTER_REAL_CLIENT_TESTS=1 with the vendor CLIs on PATH; ROUTER_HOST_CLI_TESTS=1 with ROUTER_HOST_CLI_URL and ROUTER_HOST_CLI_TOKEN",
        runs: &[Run {
            targets: &["real_clients_test", "host_client_lifecycle_test"],
            unit: &[],
            filter: None,
            serial: true,
        }],
    },
    Area {
        name: "zai-only-entitlements",
        covers: "a token entitled only to z.ai: catalog rows, Claude and Codex launch profiles, pinned selection, usage normalization",
        enable: "ROUTER_LIVE_ZAI_API_KEY (and ROUTER_LIVE_ZAI_CLAUDE_CONTEXT_TEST=1 for the billed probe)",
        runs: &[
            tests(&[
                "with_router_test",
                "clients_cli_test",
                "live_model_selection_test",
                "subscription_usage_live_test",
            ]),
            unit(&["--lib"], "with_command"),
        ],
    },
    Area {
        name: "anthropic-mock-contracts",
        covers: "Anthropic-enabled and mixed entitlements: native Anthropic surfaces, cross-vendor translation, Claude picker rows",
        enable: "nothing; mocked protocol and authorization contracts only",
        runs: &[
            tests(&[
                "router_e2e_test",
                "cross_vendor_translation_test",
                "claude_auth_test",
            ]),
            unit(&["--lib"], "with_command"),
        ],
    },
    Area {
        name: "anthropic-entitlements",
        covers: "live personal Anthropic and z.ai union catalog, actual Claude picker, exact model identities and successful real responses through a single-owner serving Router",
        enable: "ROUTER_LIVE_CLAUDE_CREDENTIAL_JSON, ROUTER_LIVE_MIXED_URL, ROUTER_LIVE_MIXED_TOKEN and ROUTER_LIVE_MIXED_INFERENCE=1; a safe OS boundary and installed Claude",
        runs: &[Run {
            targets: &[
                "mixed_entitlements_live_test",
                "subscription_usage_live_test",
            ],
            unit: &[],
            filter: None,
            serial: true,
        }],
    },
    Area {
        name: "request-logs",
        covers: "request logging, denied-request records, `router logs`, log format migration, conversation records",
        enable: "nothing",
        runs: &[tests(&[
            "request_logging_test",
            "request_log_line_test",
            "denied_request_logging_test",
            "logs_command_test",
            "log_format_migration_test",
            "conversation_record_test",
        ])],
    },
    Area {
        name: "backup-reset-restore",
        covers: "client profile backup, reset and restore, active-profile tracking and maintenance",
        enable: "nothing",
        runs: &[tests(&[
            "clients_lifecycle_test",
            "clients_maintenance_test",
            "clients_active_profile_test",
        ])],
    },
    Area {
        name: "rolling-updates",
        covers: "`router deploy`: candidate-first updates that drain streams, TOKEN_SECRET continuity, relay rotation, inconsistent-state recovery, host mode",
        enable: "a container runtime and ROUTER_DEPLOY_TEST_IMAGE (plus ROUTER_DEPLOY_TEST_PREVIOUS_IMAGE for relay rotation)",
        runs: &[
            unit(&["--bin", "router"], "deploy_local"),
            Run {
                targets: &[
                    "deploy_host_test",
                    "deploy_docker_test",
                    "deploy_docker_secret_test",
                    "deploy_docker_relay_test",
                    "deploy_docker_claude_share_test",
                    "deploy_docker_host_test",
                ],
                unit: &[],
                filter: None,
                serial: true,
            },
        ],
    },
    Area {
        name: "staging",
        covers: "independent disposable primary/candidate Docker namespaces, live GLM stream continuity, real Claude flagship/Flash responses and picker, isolated logs, retained primary tokens/profile/sessions/catalog",
        enable: "ROUTER_STAGING_LIVE_TESTS=1, ROUTER_STAGING_DISPOSABLE_HOST=1, ROUTER_STAGING_ZAI_API_KEY, ROUTER_DEPLOY_TEST_IMAGE and installed Claude; static key only, no copied OAuth",
        runs: &[Run {
            targets: &["staging_live_test"],
            unit: &[],
            filter: None,
            serial: true,
        }],
    },
];

#[derive(Debug, Default, PartialEq, Eq)]
struct Counts {
    passed: u64,
    failed: u64,
    ignored: u64,
}

/// Sum libtest's `test result:` lines. They are printed after a binary's
/// tests finish, so parallel output never interleaves them.
fn counts(output: &str) -> Counts {
    let mut total = Counts::default();
    for line in output.lines() {
        let Some(rest) = line.trim().strip_prefix("test result: ") else {
            continue;
        };
        for part in rest.split(|c| c == '.' || c == ';') {
            let mut words = part.split_whitespace();
            let (Some(number), Some(label)) = (words.next(), words.next()) else {
                continue;
            };
            let Ok(number) = number.parse::<u64>() else {
                continue;
            };
            match label {
                "passed" => total.passed += number,
                "failed" => total.failed += number,
                "ignored" => total.ignored += number,
                _ => {}
            }
        }
    }
    total
}

/// Skips announced through `tests/common/tiers.rs`, one per test.
fn skips(log: &str) -> Vec<Value> {
    let mut unique = BTreeMap::new();
    for line in log.lines() {
        if let Ok(skip) = serde_json::from_str::<Value>(line) {
            if let Some(test) = skip["test"].as_str() {
                unique.entry(test.to_string()).or_insert(skip);
            }
        }
    }
    unique.into_values().collect()
}

/// `proven` only when every declared target ran, none failed, and none
/// skipped or were ignored: a skipped case or an unexecuted target never
/// counts toward parity.
fn status(succeeded: bool, counts: &Counts, skipped: usize, not_run: usize) -> &'static str {
    if !succeeded || counts.failed > 0 {
        "failed"
    } else if not_run > 0 || skipped > 0 || counts.ignored > 0 || counts.passed == 0 {
        "not-proven"
    } else {
        "proven"
    }
}

/// How many test binaries reported a `test result:` line.
fn results(output: &str) -> usize {
    output
        .lines()
        .filter(|line| line.trim().starts_with("test result: "))
        .count()
}

/// One `cargo test` invocation per declared target, labelled by that target.
///
/// Plain `cargo test` stops at the first failing test binary, so every target
/// after it silently went unexecuted while the area reported only what ran
/// (issue #655). One invocation per target, each with `--no-fail-fast`, makes
/// every declared target produce its own result or be named as not run.
fn invocations(run: &Run) -> Vec<(String, Vec<String>)> {
    if run.targets.is_empty() {
        return vec![(run.unit.join(" "), cargo_args(run, None))];
    }
    run.targets
        .iter()
        .map(|target| ((*target).to_string(), cargo_args(run, Some(target))))
        .collect()
}

fn cargo_args(run: &Run, target: Option<&str>) -> Vec<String> {
    let mut args = vec![
        "test".to_string(),
        "--locked".to_string(),
        "--no-fail-fast".to_string(),
    ];
    args.extend(run.unit.iter().map(|arg| (*arg).to_string()));
    if let Some(target) = target {
        args.extend(["--test".to_string(), target.to_string()]);
    }
    if let Some(filter) = run.filter {
        args.push(filter.to_string());
    }
    args.extend(["--".to_string(), "--nocapture".to_string()]);
    if run.serial {
        args.push("--test-threads=1".to_string());
    }
    args
}

fn verify(
    area: &Area,
    directory: &Path,
    variables: &[(String, String)],
    client_filter: Option<&str>,
) -> Value {
    let skip_log = directory.join(format!("{}.skips", area.name));
    verify_with(area, directory, client_filter, |args| {
        match Command::new("cargo")
            .args(args)
            .env(SKIP_LOG, &skip_log)
            .envs(variables.iter().map(|(key, value)| (key, value)))
            .output()
        {
            Ok(result) => (
                result.status.success(),
                format!(
                    "{}{}",
                    String::from_utf8_lossy(&result.stderr),
                    String::from_utf8_lossy(&result.stdout)
                ),
            ),
            Err(error) => (false, format!("could not run cargo: {error}\n")),
        }
    })
}

/// [`verify`] with the `cargo` invocation injected: `cargo` receives the
/// arguments and returns its success and combined output.
fn verify_with(
    area: &Area,
    directory: &Path,
    client_filter: Option<&str>,
    mut cargo: impl FnMut(&[String]) -> (bool, String),
) -> Value {
    let skip_log = directory.join(format!("{}.skips", area.name));
    let _ = std::fs::remove_file(&skip_log);
    let mut output = String::new();
    let mut succeeded = true;
    let mut commands = Vec::new();
    let mut targets = Vec::new();
    let mut not_run = Vec::new();
    for run in area.runs {
        for (target, mut args) in invocations(run) {
            if let Some(filter) = client_filter.filter(|_| area.name == "real-clients") {
                args.insert(
                    args.iter()
                        .position(|arg| arg == "--")
                        .expect("test separator"),
                    filter.to_string(),
                );
            }
            commands.push(format!("cargo {}", args.join(" ")));
            eprintln!("verify {}: cargo {}", area.name, args.join(" "));
            let (ran, text) = cargo(&args);
            succeeded &= ran;
            let counted = counts(&text);
            let reported = results(&text) > 0;
            if !reported {
                not_run.push(target.clone());
            }
            targets.push(json!({
                "target": target,
                "status": if !reported { "not-run" } else { status(ran, &counted, 0, 0) },
                "passed": counted.passed,
                "failed": counted.failed,
                "ignored": counted.ignored,
            }));
            output.push_str(&format!("==> verify {} target {target}\n", area.name));
            output.push_str(&text);
        }
    }
    let log = directory.join(format!("{}.log", area.name));
    if let Err(error) = std::fs::write(&log, &output) {
        eprintln!("warning: could not write {}: {error}", log.display());
    }
    let counts = counts(&output);
    let skipped = skips(&std::fs::read_to_string(&skip_log).unwrap_or_default());
    let status = status(succeeded, &counts, skipped.len(), not_run.len());
    eprintln!(
        "verify {}: {status} passed={} failed={} ignored={} skipped={} not_run={}{}",
        area.name,
        counts.passed,
        counts.failed,
        counts.ignored,
        skipped.len(),
        not_run.len(),
        named(&not_run)
    );
    json!({
        "name": area.name,
        "covers": area.covers,
        "status": status,
        "ran": true,
        "passed": counts.passed,
        "failed": counts.failed,
        "ignored": counts.ignored,
        "skipped": skipped,
        "not_run": not_run,
        "targets": targets,
        "enable_skipped_with": area.enable,
        "commands": commands,
        "log": log.display().to_string(),
    })
}

/// ` (a, b)` for a non-empty list, so a summary count names what it counts.
fn named(items: &[String]) -> String {
    if items.is_empty() {
        String::new()
    } else {
        format!(" ({})", items.join(", "))
    }
}

/// Areas that executed no test at all, with the reason, and every declared
/// target that produced no result, as `area/target`.
///
/// Counted separately from skipped tests: an area that never ran is not two
/// skipped tests, and the summary must not read as if it were (issue #654).
fn unexecuted(areas: &[Value]) -> (Vec<Value>, Vec<String>) {
    let not_run_areas = areas
        .iter()
        .filter(|area| area["ran"] == false)
        .map(|area| json!({"name": area["name"], "reason": area["reason"]}))
        .collect();
    let not_run_targets = areas
        .iter()
        .flat_map(|area| {
            let name = area["name"].as_str().unwrap_or_default().to_string();
            area["not_run"]
                .as_array()
                .into_iter()
                .flatten()
                .filter_map(Value::as_str)
                .map(move |target| format!("{name}/{target}"))
                .collect::<Vec<_>>()
        })
        .collect();
    (not_run_areas, not_run_targets)
}

/// The one-line summary; every count names what it counts.
fn summary(
    parity: bool,
    failed: bool,
    skipped: usize,
    areas_not_run: &[Value],
    targets_not_run: &[String],
    output: &Path,
) -> String {
    let area_names: Vec<String> = areas_not_run
        .iter()
        .filter_map(|area| area["name"].as_str().map(str::to_string))
        .collect();
    format!(
        "verification parity={parity} failed={failed} skipped={skipped} areas_not_run={}{} targets_not_run={}{} result={}",
        area_names.len(),
        named(&area_names),
        targets_not_run.len(),
        named(targets_not_run),
        output.display()
    )
}

fn usage() -> ! {
    eprintln!(
        "usage: rust-script scripts/verify-contracts.rs [--area NAME]... [--output PATH] [--require-parity] [--list]"
    );
    exit(2);
}

fn git_commit() -> Option<String> {
    let output = Command::new("git")
        .args(["rev-parse", "HEAD"])
        .output()
        .ok()?;
    output
        .status
        .success()
        .then(|| String::from_utf8_lossy(&output.stdout).trim().to_string())
}

fn router_version() -> Option<String> {
    let manifest = std::fs::read_to_string("Cargo.toml").ok()?;
    manifest
        .lines()
        .find_map(|line| line.strip_prefix("version = "))
        .map(|version| version.trim_matches('"').to_string())
}

fn needs_client_preparation(area: &str) -> bool {
    matches!(
        area,
        "real-clients" | "anthropic-entitlements" | "zai-only-entitlements" | "staging"
    )
}

fn main() {
    let mut selected = Vec::new();
    let mut output = PathBuf::from("target/verification/result.json");
    let mut require_parity = false;
    let mut client_filter = None;
    let mut prepare_only = false;
    let mut args = std::env::args().skip(1);
    while let Some(arg) = args.next() {
        match arg.as_str() {
            "--area" => selected.push(args.next().unwrap_or_else(|| usage())),
            "--output" => output = PathBuf::from(args.next().unwrap_or_else(|| usage())),
            "--require-parity" => require_parity = true,
            "--client" => client_filter = Some(args.next().unwrap_or_else(|| usage())),
            "--prepare-clients" => prepare_only = true,
            "--list" => {
                for area in AREAS {
                    println!("{}\t{}", area.name, area.covers);
                }
                return;
            }
            _ => usage(),
        }
    }
    for name in &selected {
        if !AREAS.iter().any(|area| area.name == name) {
            eprintln!("error: unknown area {name}; see --list");
            exit(2);
        }
    }
    let directory = output
        .parent()
        .filter(|parent| !parent.as_os_str().is_empty())
        .map_or_else(|| PathBuf::from("."), Path::to_path_buf);
    if let Err(error) = std::fs::create_dir_all(&directory) {
        eprintln!("error: could not create {}: {error}", directory.display());
        exit(2);
    }
    let directory = directory.canonicalize().unwrap_or(directory);

    let needs_clients = prepare_only
        || selected.is_empty()
        || selected.iter().any(|name| needs_client_preparation(name));
    let clients: Vec<&str> = if client_filter.is_some()
        || prepare_only
        || selected.is_empty()
        || selected.iter().any(|name| name == "real-clients")
    {
        client_filter.as_deref().into_iter().collect()
    } else if selected.iter().any(|name| name == "zai-only-entitlements") {
        vec!["claude", "codex"]
    } else {
        vec!["claude"]
    };
    if let Some(client) = &client_filter {
        if !verification_client::CLIENTS
            .iter()
            .any(|(name, _)| name == client)
        {
            usage();
        }
    }
    let (preparation, variables) = if needs_clients {
        verification_client::prepare(&clients)
    } else {
        (Vec::new(), Vec::new())
    };
    let preparation_failed = preparation.iter().any(|item| item["status"] == "failed");
    let preparation_unproven = preparation
        .iter()
        .any(|item| item["status"] == "not-proven");
    // Persist discovery even when compilation is refused or preparation fails.
    std::fs::write(
        directory.join("clients.json"),
        serde_json::to_string_pretty(&preparation).expect("JSON"),
    )
    .expect("write client preparation");
    let areas: Vec<Value> = AREAS
        .iter()
        .filter(|area| selected.is_empty() || selected.iter().any(|name| name == area.name))
        .filter(|_| !prepare_only)
        .map(|area| {
            if needs_client_preparation(area.name) && (preparation_failed || preparation_unproven) {
                json!({"name":area.name,"status":if preparation_failed {"failed"} else {"not-proven"},"ran":false,"skipped":[],"not_run":[],"reason":"client preparation did not complete; no vendor probes or Cargo test compilation attempted","enable_with":"docs/testing-tiers.md#proving-the-vendor-areas-from-macos"})
            } else { verify(area, &directory, &variables, client_filter.as_deref()) }
        })
        .collect();
    let failed = preparation_failed || areas.iter().any(|area| area["status"] == "failed");
    let parity = !prepare_only
        && !preparation_unproven
        && client_filter.is_none()
        && selected.is_empty()
        && areas.iter().all(|area| area["status"] == "proven");
    let skipped: usize = areas
        .iter()
        .map(|area| area["skipped"].as_array().map_or(0, Vec::len))
        .sum();
    let (areas_not_run, targets_not_run) = unexecuted(&areas);
    let result = json!({
        "schema": SCHEMA,
        "router_version": router_version(),
        "commit": git_commit(),
        "generated_at_unix": std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map_or(0, |elapsed| elapsed.as_secs()),
        "complete": !prepare_only && selected.is_empty() && client_filter.is_none(),
        "parity": parity,
        "failed": failed,
        "skipped": skipped,
        "areas_not_run": areas_not_run,
        "targets_not_run": targets_not_run,
        "areas": areas,
        "client_preparation": preparation,
    });
    let rendered = serde_json::to_string_pretty(&result).expect("a JSON value renders");
    if let Err(error) = std::fs::write(&output, format!("{rendered}\n")) {
        eprintln!("error: could not write {}: {error}", output.display());
        exit(2);
    }
    println!(
        "{}",
        summary(
            parity,
            failed,
            skipped,
            &areas_not_run,
            &targets_not_run,
            &output
        )
    );
    if failed {
        exit(1);
    }
    if require_parity && !parity {
        eprintln!(
            "error: parity was required, but some area is not proven; its skipped tests, unexecuted areas and targets, and how to enable them are in {}",
            output.display()
        );
        exit(3);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn result_lines_are_summed_across_binaries() {
        let output = "running 2 tests\nSKIP [tier3-real-client-offline] a: x\ntest a ... oktest result: garbage\n\
                      test result: ok. 11 passed; 0 failed; 2 ignored; 0 measured; 0 filtered out; finished in 0.01s\n\
                      test result: FAILED. 3 passed; 1 failed; 0 ignored; 0 measured; 4 filtered out; finished in 1.00s\n";
        assert_eq!(
            counts(output),
            Counts {
                passed: 14,
                failed: 1,
                ignored: 2
            }
        );
    }

    #[test]
    fn a_skip_is_counted_once_per_test() {
        let log = r#"{"tier":"tier4-live-credentialed","test":"a","reason":"K is not set"}
{"tier":"tier4-live-credentialed","test":"a","reason":"K is not set"}
not json
{"tier":"tier2-integration","test":"b","reason":"no runtime"}
"#;
        let skipped = skips(log);
        assert_eq!(skipped.len(), 2);
        assert_eq!(skipped[1]["reason"], "no runtime");
    }

    #[test]
    fn a_green_run_with_skips_is_not_parity() {
        let green = Counts {
            passed: 400,
            failed: 0,
            ignored: 0,
        };
        assert_eq!(status(true, &green, 0, 0), "proven");
        assert_eq!(status(true, &green, 1, 0), "not-proven");
        assert_eq!(status(true, &green, 0, 1), "not-proven");
        assert_eq!(status(true, &Counts::default(), 0, 0), "not-proven");
        assert_eq!(status(false, &green, 0, 0), "failed");
        let ignored = Counts {
            ignored: 1,
            ..green
        };
        assert_eq!(status(true, &ignored, 0, 0), "not-proven");
    }

    #[test]
    fn every_area_names_existing_test_targets() {
        // rust-script builds and runs in a cache directory, but compiles the
        // script from its own path in the checkout.
        let tests = Path::new(file!())
            .ancestors()
            .nth(2)
            .expect("scripts/ sits in the repository root")
            .join("tests");
        for area in AREAS {
            for run in area.runs {
                for target in run.targets {
                    assert!(
                        tests.join(format!("{target}.rs")).is_file(),
                        "{}: {target} is not a test target",
                        area.name
                    );
                }
            }
        }
    }

    #[test]
    fn serial_runs_pass_one_thread_and_never_fail_fast() {
        let rolling = &AREAS
            .iter()
            .find(|area| area.name == "rolling-updates")
            .unwrap()
            .runs[1];
        for (_, args) in invocations(rolling) {
            assert!(args.contains(&"--no-fail-fast".to_string()), "{args:?}");
            assert!(args.ends_with(&["--nocapture".to_string(), "--test-threads=1".to_string()]));
        }
        assert_eq!(
            invocations(&unit(&["--bin", "router"], "deploy_local")),
            [(
                "--bin router".to_string(),
                [
                    "test",
                    "--locked",
                    "--no-fail-fast",
                    "--bin",
                    "router",
                    "deploy_local",
                    "--",
                    "--nocapture"
                ]
                .map(String::from)
                .to_vec()
            )]
        );
    }

    #[test]
    fn every_declared_target_is_its_own_invocation() {
        let rolling = &AREAS
            .iter()
            .find(|area| area.name == "rolling-updates")
            .unwrap()
            .runs[1];
        let labels: Vec<String> = invocations(rolling)
            .into_iter()
            .map(|(label, _)| label)
            .collect();
        assert_eq!(
            labels,
            rolling
                .targets
                .iter()
                .map(|t| t.to_string())
                .collect::<Vec<_>>()
        );
        for (label, args) in invocations(rolling) {
            let at = args.iter().position(|arg| arg == "--test").expect("--test");
            assert_eq!(args[at + 1], label);
            assert_eq!(args.iter().filter(|arg| *arg == "--test").count(), 1);
        }
    }

    /// Issue #655: a failing first target no longer hides the others, and a
    /// target that produced no `test result:` line is named, not omitted.
    #[test]
    fn a_failing_first_target_does_not_hide_the_rest() {
        const AREA: Area = Area {
            name: "fixture",
            covers: "fixture",
            enable: "nothing",
            runs: &[tests(&[
                "first_fails",
                "second_passes",
                "third_never_reports",
            ])],
        };
        let directory = tempfile::tempdir().unwrap();
        let mut seen = Vec::new();
        let area = verify_with(&AREA, directory.path(), None, |args| {
            let target = args[args.iter().position(|arg| arg == "--test").unwrap() + 1].clone();
            seen.push(target.clone());
            match target.as_str() {
                "first_fails" => (
                    false,
                    "test result: FAILED. 1 passed; 2 failed; 0 ignored\n".into(),
                ),
                "second_passes" => (
                    true,
                    "test result: ok. 8 passed; 0 failed; 0 ignored\n".into(),
                ),
                _ => (false, "error: could not compile\n".into()),
            }
        });
        assert_eq!(
            seen,
            ["first_fails", "second_passes", "third_never_reports"]
        );
        assert_eq!(area["status"], "failed");
        assert_eq!(area["passed"], 9);
        assert_eq!(area["failed"], 2);
        assert_eq!(area["not_run"], json!(["third_never_reports"]));
        let statuses: Vec<&str> = area["targets"]
            .as_array()
            .unwrap()
            .iter()
            .map(|target| target["status"].as_str().unwrap())
            .collect();
        assert_eq!(statuses, ["failed", "proven", "not-run"]);
        let (areas_not_run, targets_not_run) = unexecuted(&[area]);
        assert!(areas_not_run.is_empty());
        let line = summary(
            false,
            true,
            0,
            &areas_not_run,
            &targets_not_run,
            Path::new("r.json"),
        );
        assert!(
            line.contains("targets_not_run=1 (fixture/third_never_reports)"),
            "{line}"
        );
    }

    /// Issue #654: areas that never ran are counted and named in the summary,
    /// separately from skipped tests.
    #[test]
    fn areas_that_never_ran_are_named_in_the_summary() {
        let reason = "client preparation did not complete";
        let areas = [
            json!({"name": "catalogs", "ran": true, "skipped": [{"test": "a"}, {"test": "b"}], "not_run": []}),
            json!({"name": "real-clients", "ran": false, "reason": reason, "skipped": [], "not_run": []}),
            json!({"name": "staging", "ran": false, "reason": reason, "skipped": [], "not_run": []}),
        ];
        let (areas_not_run, targets_not_run) = unexecuted(&areas);
        assert_eq!(areas_not_run.len(), 2);
        assert_eq!(areas_not_run[0]["reason"], reason);
        let line = summary(
            false,
            false,
            2,
            &areas_not_run,
            &targets_not_run,
            Path::new("r.json"),
        );
        assert_eq!(
            line,
            "verification parity=false failed=false skipped=2 areas_not_run=2 (real-clients, staging) targets_not_run=0 result=r.json"
        );
    }
}
