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
        covers: "every supported wrapper (Claude Code, Codex, Gemini, Qwen, OpenCode) launched as its real vendor binary against a loopback Router, and the host CLI lifecycle",
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
            targets: &["mixed_entitlements_live_test", "subscription_usage_live_test"],
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

/// `proven` only when tests ran, none failed, and none skipped or were
/// ignored: a skipped case never counts toward parity.
fn status(succeeded: bool, counts: &Counts, skipped: usize) -> &'static str {
    if !succeeded || counts.failed > 0 {
        "failed"
    } else if skipped > 0 || counts.ignored > 0 || counts.passed == 0 {
        "not-proven"
    } else {
        "proven"
    }
}

fn cargo_args(run: &Run) -> Vec<String> {
    let mut args = vec!["test".to_string(), "--locked".to_string()];
    args.extend(run.unit.iter().map(|arg| (*arg).to_string()));
    for target in run.targets {
        args.extend(["--test".to_string(), (*target).to_string()]);
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
    let _ = std::fs::remove_file(&skip_log);
    let mut output = String::new();
    let mut succeeded = true;
    let mut commands = Vec::new();
    for run in area.runs {
        let mut args = cargo_args(run);
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
        match Command::new("cargo")
            .args(&args)
            .env(SKIP_LOG, &skip_log)
            .envs(variables.iter().map(|(key, value)| (key, value)))
            .output()
        {
            Ok(result) => {
                succeeded &= result.status.success();
                output.push_str(&String::from_utf8_lossy(&result.stdout));
                output.push_str(&String::from_utf8_lossy(&result.stderr));
            }
            Err(error) => {
                succeeded = false;
                output.push_str(&format!("could not run cargo: {error}\n"));
            }
        }
    }
    let log = directory.join(format!("{}.log", area.name));
    if let Err(error) = std::fs::write(&log, &output) {
        eprintln!("warning: could not write {}: {error}", log.display());
    }
    let counts = counts(&output);
    let skipped = skips(&std::fs::read_to_string(&skip_log).unwrap_or_default());
    let status = status(succeeded, &counts, skipped.len());
    eprintln!(
        "verify {}: {status} passed={} failed={} ignored={} skipped={}",
        area.name,
        counts.passed,
        counts.failed,
        counts.ignored,
        skipped.len()
    );
    json!({
        "name": area.name,
        "covers": area.covers,
        "status": status,
        "passed": counts.passed,
        "failed": counts.failed,
        "ignored": counts.ignored,
        "skipped": skipped,
        "enable_skipped_with": area.enable,
        "commands": commands,
        "log": log.display().to_string(),
    })
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

    let needs_clients =
        prepare_only || selected.is_empty() || selected.iter().any(|name| name == "real-clients");
    let clients: Vec<&str> = client_filter.as_deref().into_iter().collect();
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
            if area.name == "real-clients" && (preparation_failed || preparation_unproven) {
                json!({"name":area.name,"status":if preparation_failed {"failed"} else {"not-proven"},"skipped":[],"reason":"client preparation did not complete; no vendor probes or Cargo test compilation attempted"})
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
        "areas": areas,
        "client_preparation": preparation,
    });
    let rendered = serde_json::to_string_pretty(&result).expect("a JSON value renders");
    if let Err(error) = std::fs::write(&output, format!("{rendered}\n")) {
        eprintln!("error: could not write {}: {error}", output.display());
        exit(2);
    }
    println!(
        "verification parity={parity} failed={failed} skipped={skipped} result={}",
        output.display()
    );
    if failed {
        exit(1);
    }
    if require_parity && !parity {
        eprintln!(
            "error: parity was required, but some area is not proven; its skipped tests and how to enable them are in {}",
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
        assert_eq!(status(true, &green, 0), "proven");
        assert_eq!(status(true, &green, 1), "not-proven");
        assert_eq!(status(true, &Counts::default(), 0), "not-proven");
        assert_eq!(status(false, &green, 0), "failed");
        let ignored = Counts {
            ignored: 1,
            ..green
        };
        assert_eq!(status(true, &ignored, 0), "not-proven");
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
    fn serial_runs_pass_one_thread() {
        let args = cargo_args(&AREAS[AREAS.len() - 1].runs[1]);
        assert!(args.ends_with(&["--nocapture".to_string(), "--test-threads=1".to_string()]));
        assert_eq!(
            cargo_args(&unit(&["--bin", "router"], "deploy_local")),
            [
                "test",
                "--locked",
                "--bin",
                "router",
                "deploy_local",
                "--",
                "--nocapture"
            ]
        );
    }
}
