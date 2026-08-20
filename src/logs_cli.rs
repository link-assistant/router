//! The `logs` subcommand: answer questions about the request log.
//!
//! Split from `main.rs` to keep that file within the repository's 1000-line
//! limit.

use std::process::ExitCode;

use link_assistant_router::config::Config;

/// How many correlation ids to print per anomaly.
///
/// A few are actionable; hundreds on one line are not. `--json` carries the
/// complete list for tooling.
const SHOWN: usize = 5;

/// Answer a question about the request log.
///
/// The log had to be read with one-liners invented on the spot, which produced
/// confident wrong answers in both directions (issue #234).
pub fn run(
    config: &Config,
    configured_path: Option<&std::path::Path>,
    op: &link_assistant_router::cli::LogsOp,
) -> ExitCode {
    use link_assistant_router::cli::LogsOp;
    use link_assistant_router::log_analysis;

    let root = configured_path.map_or_else(
        || config.data_dir.join("requests"),
        std::path::Path::to_path_buf,
    );
    match op {
        LogsOp::Summary { token, json } => {
            let Ok((exchanges, unparsable, bytes)) =
                log_analysis::read_exchanges(&root, token.as_deref())
            else {
                eprintln!("could not read the request log at {}", root.display());
                return ExitCode::FAILURE;
            };
            let summary = log_analysis::summarise(&exchanges, unparsable, bytes);
            if *json {
                println!(
                    "{}",
                    serde_json::to_string_pretty(&summary.to_json()).unwrap_or_default()
                );
            } else {
                print!("{}", summary.render());
            }
            ExitCode::SUCCESS
        }
        LogsOp::Anomalies { token, json } => {
            let Ok((exchanges, _, _)) = log_analysis::read_exchanges(&root, token.as_deref())
            else {
                eprintln!("could not read the request log at {}", root.display());
                return ExitCode::FAILURE;
            };
            let found = log_analysis::anomalies(&exchanges);
            if *json {
                let rendered: Vec<_> = found
                    .iter()
                    .map(|anomaly| {
                        serde_json::json!({
                            "kind": anomaly.kind,
                            "detail": anomaly.detail,
                            "correlation_ids": anomaly.correlation_ids,
                        })
                    })
                    .collect();
                println!(
                    "{}",
                    serde_json::to_string_pretty(&rendered).unwrap_or_default()
                );
            } else if found.is_empty() {
                println!("no anomalies found in {}", root.display());
            } else {
                for anomaly in &found {
                    println!(
                        "{}: {} ({} exchange(s))",
                        anomaly.kind,
                        anomaly.detail,
                        anomaly.correlation_ids.len()
                    );
                    for id in anomaly.correlation_ids.iter().take(SHOWN) {
                        println!("  {id}");
                    }
                    if let Some(remaining) = anomaly
                        .correlation_ids
                        .len()
                        .checked_sub(SHOWN)
                        .filter(|n| *n > 0)
                    {
                        println!("  … {remaining} more (use --json for the full list)");
                    }
                }
            }
            // Non-zero when anything was found, so this works as a health gate.
            if found.is_empty() {
                ExitCode::SUCCESS
            } else {
                ExitCode::FAILURE
            }
        }
        LogsOp::Show {
            correlation_id,
            token,
        } => match log_analysis::show(&root, token.as_deref(), correlation_id) {
            Ok(rendered) => {
                print!("{rendered}");
                ExitCode::SUCCESS
            }
            Err(error) => {
                eprintln!("could not read the request log: {error}");
                ExitCode::FAILURE
            }
        },
    }
}
