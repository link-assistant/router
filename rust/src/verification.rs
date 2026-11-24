//! Importable Router-owned verification; never launches the Router binary.

/// Arguments accepted by the verification command.
#[derive(clap::Args, Debug)]
pub struct VerificationArgs {
    /// Arguments to the Router verification harness.
    #[arg(trailing_var_arg = true, allow_hyphen_values = true)]
    pub arguments: Vec<String>,
}

use serde_json::{Value, json};
use std::collections::BTreeMap;
use std::fmt::Write as _;
use std::path::{Path, PathBuf};
use std::process::ExitCode;

use crate::verification_client;

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
            unit(&["--lib"], "deploy_local"),
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
        name: "deploy-configuration",
        covers: "`router deploy --config`: declarative TOML, runtime env passthrough and its fingerprint, instance names, SSH port/identity/pinned known_hosts/keepalive/deadline, deploy token policy, `--provider-key` validation modes, verification profiles and the `--json` document",
        enable: "nothing; a stand-in ssh records the session",
        runs: &[
            tests(&["deploy_config_test"]),
            unit(&["--lib"], "deploy_config"),
            unit(&["--lib"], "deploy_remote"),
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
        for part in rest.split(['.', ';']) {
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
        if let Ok(skip) = serde_json::from_str::<Value>(line)
            && let Some(test) = skip["test"].as_str()
        {
            unique.entry(test.to_string()).or_insert(skip);
        }
    }
    unique.into_values().collect()
}

/// `proven` only when every declared target ran, none failed, and none
/// skipped or were ignored: a skipped case or an unexecuted target never
/// counts toward parity.
const fn status(succeeded: bool, counts: &Counts, skipped: usize, not_run: usize) -> &'static str {
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
        match crate::operation_context::bounded_output(
            crate::operation_context::command("cargo")
                .args(args)
                .env(SKIP_LOG, &skip_log)
                .envs(variables.iter().map(|(key, value)| (key, value))),
            crate::operation_context::current()
                .map_or(std::time::Duration::from_secs(3600), |context| {
                    context.process_deadline
                }),
        ) {
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
                "status": if reported { status(ran, &counted, 0, 0) } else { "not-run" },
                "passed": counted.passed,
                "failed": counted.failed,
                "ignored": counted.ignored,
            }));
            let _ = writeln!(output, "==> verify {} target {target}", area.name);
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
        .map(|area| json!({"name": area["name"], "reason": area["reason"], "enable_with": area["enable_with"]}))
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

fn usage() -> ExitCode {
    eprintln!(
        "usage: rust-script scripts/verify-contracts.rs [--area NAME]... [--output PATH] [--require-parity] [--list]"
    );
    ExitCode::from(2)
}

fn git_commit() -> Option<String> {
    let output = crate::operation_context::bounded_output(
        crate::operation_context::command("git").args(["rev-parse", "HEAD"]),
        std::time::Duration::from_secs(60),
    )
    .ok()?;
    output
        .status
        .success()
        .then(|| String::from_utf8_lossy(&output.stdout).trim().to_string())
}

fn router_version() -> Option<String> {
    let manifest = std::fs::read_to_string(
        crate::operation_context::current_dir()
            .ok()?
            .join("Cargo.toml"),
    )
    .ok()?;
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

/// Verification adapter shared by the CLI and importable API.
pub fn run_cli(arguments: Vec<String>) -> ExitCode {
    let mut selected = Vec::new();
    let mut output = PathBuf::from("target/verification/result.json");
    let mut require_parity = false;
    let mut client_filter = None;
    let mut prepare_only = false;
    let mut args = arguments.into_iter();
    while let Some(arg) = args.next() {
        match arg.as_str() {
            "--area" => selected.push(match args.next() {
                Some(value) => value,
                None => return usage(),
            }),
            "--output" => {
                output = PathBuf::from(match args.next() {
                    Some(value) => value,
                    None => return usage(),
                });
            }
            "--require-parity" => require_parity = true,
            "--client" => {
                client_filter = Some(match args.next() {
                    Some(value) => value,
                    None => return usage(),
                });
            }
            "--prepare-clients" => prepare_only = true,
            "--list" => {
                for area in AREAS {
                    println!("{}\t{}", area.name, area.covers);
                }
                return ExitCode::SUCCESS;
            }
            _ => return usage(),
        }
    }
    for name in &selected {
        if !AREAS.iter().any(|area| area.name == name) {
            eprintln!("error: unknown area {name}; see --list");
            return ExitCode::from(2);
        }
    }
    if output.is_relative()
        && let Some(context) = crate::operation_context::current()
    {
        output = context.working_directory.join(output);
    }
    let directory = output
        .parent()
        .filter(|parent| !parent.as_os_str().is_empty())
        .map_or_else(|| PathBuf::from("."), Path::to_path_buf);
    if let Err(error) = std::fs::create_dir_all(&directory) {
        eprintln!("error: could not create {}: {error}", directory.display());
        return ExitCode::from(2);
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
    if let Some(client) = &client_filter
        && !verification_client::CLIENTS
            .iter()
            .any(|(name, _)| name == client)
    {
        return usage();
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
    let client_evidence = directory.join("clients.json");
    if let Err(error) = std::fs::write(
        &client_evidence,
        serde_json::to_string_pretty(&preparation).expect("JSON"),
    ) {
        eprintln!(
            "error: could not write {}: {error}",
            client_evidence.display()
        );
        return ExitCode::from(2);
    }
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
        "generated_at_unix": crate::operation_context::now().timestamp(),
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
        return ExitCode::from(2);
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
    for client in &preparation {
        println!(
            "client={} proven={} source={} host={}{}",
            client["client"].as_str().unwrap_or("unknown"),
            client["observed"].as_str().unwrap_or("not-proven"),
            client["source"].as_str().unwrap_or("installed"),
            client["host_installed"].as_str().unwrap_or("unknown"),
            if client["host_mismatch"] == true {
                " WARNING: proven version differs from host"
            } else {
                ""
            }
        );
    }
    crate::operation_output::record(result);
    if failed {
        return ExitCode::from(1);
    }
    if require_parity && !parity {
        eprintln!(
            "error: parity was required, but some area is not proven; its skipped tests, unexecuted areas and targets, and how to enable them are in {}",
            output.display()
        );
        return ExitCode::from(3);
    }
    ExitCode::SUCCESS
}
#[cfg(test)]
#[path = "verification_tests.rs"]
mod tests;

/// Run the shared verifier in-process. The result contains the saved result.json document.
///
/// ```no_run
/// # async fn example() -> Result<(), Box<dyn std::error::Error>> {
/// use link_assistant_router::{verification, operation_context::OperationContext};
/// let report = verification::run(OperationContext::default(), vec!["--area".into(), "deploy-configuration".into()]).await?;
/// assert!(report.success);
/// # Ok(()) }
/// ```
pub async fn run(
    context: crate::operation_context::OperationContext,
    arguments: Vec<String>,
) -> Result<crate::operations::OperationResult, crate::operations::OperationError> {
    crate::operations::request(
        context,
        crate::cli::Command::Verify(VerificationArgs { arguments }),
    )
    .await
}
