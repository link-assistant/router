#!/usr/bin/env rust-script
//! Compare two saved Criterion baselines and fail on a regression (#672).
//!
//! ```text
//! cargo bench --bench hot_paths -- --save-baseline pr-base   # on the base commit
//! cargo bench --bench hot_paths -- --save-baseline pr-head   # on the head commit
//! rust-script scripts/compare-benchmarks.rs pr-base pr-head [--threshold 25] [--dir target/criterion]
//! ```
//!
//! Reads `<dir>/<benchmark id>/<baseline>/estimates.json` for every benchmark,
//! compares the median, prints a Markdown table (also appended to
//! `$GITHUB_STEP_SUMMARY` when set) and exits non-zero when any benchmark is
//! more than `--threshold` percent slower in `head` than in `base`.
//! Benchmarks present on only one side are listed but never fail the run.
//!
//! ```cargo
//! [dependencies]
//! serde_json = "1"
//! ```

use std::collections::BTreeMap;
use std::fmt::Write as _;
use std::path::{Path, PathBuf};
use std::process::ExitCode;

use serde_json::Value;

fn main() -> ExitCode {
    let args: Vec<String> = std::env::args().skip(1).collect();
    let option = |name: &str| {
        args.iter()
            .position(|arg| arg == name)
            .and_then(|index| args.get(index + 1).cloned())
    };
    let positional: Vec<&String> = {
        let mut skip = false;
        args.iter()
            .filter(|arg| {
                if skip {
                    skip = false;
                    return false;
                }
                if arg.starts_with("--") {
                    skip = true;
                    return false;
                }
                true
            })
            .collect()
    };
    let (Some(base), Some(head)) = (positional.first(), positional.get(1)) else {
        eprintln!("usage: compare-benchmarks.rs <base-baseline> <head-baseline> [--threshold PCT] [--dir DIR]");
        return ExitCode::from(2);
    };
    let threshold: f64 = match option("--threshold").map(|value| value.parse()) {
        None => 25.0,
        Some(Ok(value)) => value,
        Some(Err(_)) => {
            eprintln!("--threshold takes a percentage");
            return ExitCode::from(2);
        }
    };
    let dir = PathBuf::from(option("--dir").unwrap_or_else(|| "target/criterion".into()));
    let base_estimates = medians(&dir, base);
    let head_estimates = medians(&dir, head);
    if head_estimates.is_empty() {
        eprintln!("no `{head}` baseline under {}", dir.display());
        return ExitCode::from(2);
    }

    let mut table = format!(
        "| Benchmark | {base} | {head} | Change |\n| --- | ---: | ---: | ---: |\n"
    );
    let mut regressions = Vec::new();
    let mut ids: Vec<&String> = base_estimates.keys().chain(head_estimates.keys()).collect();
    ids.sort();
    ids.dedup();
    for id in ids {
        let row = match (base_estimates.get(id), head_estimates.get(id)) {
            (Some(&old), Some(&new)) => {
                let change = (new / old - 1.0) * 100.0;
                let flag = if change > threshold {
                    regressions.push(format!("{id}: {change:+.1}%"));
                    " (regression)"
                } else {
                    ""
                };
                format!("| {id} | {} | {} | {change:+.1}%{flag} |", time(old), time(new))
            }
            (None, Some(&new)) => format!("| {id} | - | {} | new |", time(new)),
            (Some(&old), None) => format!("| {id} | {} | - | removed |", time(old)),
            (None, None) => continue,
        };
        let _ = writeln!(table, "{row}");
    }
    let verdict = if regressions.is_empty() {
        format!("No benchmark is more than {threshold}% slower.\n")
    } else {
        format!(
            "{} benchmark(s) more than {threshold}% slower: {}\n",
            regressions.len(),
            regressions.join(", ")
        )
    };
    let report = format!("### Benchmarks: `{head}` against `{base}` (median)\n\n{table}\n{verdict}");
    print!("{report}");
    if let Ok(summary) = std::env::var("GITHUB_STEP_SUMMARY") {
        let existing = std::fs::read_to_string(&summary).unwrap_or_default();
        let _ = std::fs::write(&summary, existing + &report);
    }
    if regressions.is_empty() {
        ExitCode::SUCCESS
    } else {
        ExitCode::FAILURE
    }
}

/// Median time in nanoseconds of every benchmark saved under `baseline`,
/// keyed by benchmark id (its path below `dir`).
fn medians(dir: &Path, baseline: &str) -> BTreeMap<String, f64> {
    let mut found = BTreeMap::new();
    let mut pending = vec![dir.to_path_buf()];
    while let Some(current) = pending.pop() {
        for entry in std::fs::read_dir(&current).into_iter().flatten().flatten() {
            let path = entry.path();
            if !path.is_dir() {
                continue;
            }
            let estimates = path.join("estimates.json");
            if path.file_name().is_some_and(|name| name == baseline) && estimates.is_file() {
                let median = std::fs::read_to_string(&estimates)
                    .ok()
                    .and_then(|text| serde_json::from_str::<Value>(&text).ok())
                    .and_then(|value| value["median"]["point_estimate"].as_f64());
                if let (Some(median), Ok(id)) = (median, current.strip_prefix(dir)) {
                    found.insert(id.display().to_string(), median);
                }
            } else {
                pending.push(path);
            }
        }
    }
    found
}

fn time(nanos: f64) -> String {
    if nanos >= 1e6 {
        format!("{:.2} ms", nanos / 1e6)
    } else if nanos >= 1e3 {
        format!("{:.2} us", nanos / 1e3)
    } else {
        format!("{nanos:.0} ns")
    }
}
