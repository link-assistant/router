#!/usr/bin/env rust-script
//! Enforce and advance the repository's line-coverage baseline.
//!
//! ```cargo
//! [dependencies]
//! serde = { version = "1", features = ["derive"] }
//! serde_json = "1"
//! ```

use serde::Deserialize;
use std::env;
use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::process::exit;

const TARGET_FLOOR: f64 = 80.0;
// Instrumented async/concurrent paths vary slightly between otherwise identical
// runs. Ignore changes smaller than one basis point so the ratchet reflects a
// reviewable coverage change rather than scheduler noise.
const TOLERANCE: f64 = 0.01;

#[derive(Deserialize)]
struct CoverageReport {
    data: Vec<CoverageData>,
}

#[derive(Deserialize)]
struct CoverageData {
    totals: CoverageTotals,
}

#[derive(Deserialize)]
struct CoverageTotals {
    lines: LineCoverage,
}

#[derive(Deserialize)]
struct LineCoverage {
    count: u64,
    covered: u64,
    percent: f64,
}

#[derive(Debug, PartialEq)]
struct Decision {
    measured: f64,
    committed: f64,
    previous: f64,
    enforced_floor: f64,
    next_baseline: f64,
    errors: Vec<String>,
}

fn decide(measured: f64, committed: f64, previous: f64, allow_decrease: bool) -> Decision {
    let enforced_floor = committed.min(TARGET_FLOOR);
    let mut errors = Vec::new();

    if !allow_decrease {
        if measured + TOLERANCE < enforced_floor {
            errors.push(format!(
                "line coverage {measured:.2}% is below the enforced floor {enforced_floor:.2}%"
            ));
        }
        if measured + TOLERANCE < committed {
            errors.push(format!(
                "line coverage {measured:.2}% is below the committed baseline {committed:.2}%"
            ));
        }
        if measured + TOLERANCE < previous {
            errors.push(format!(
                "line coverage {measured:.2}% is below the default-branch baseline {previous:.2}%"
            ));
        }
    }

    let next_baseline = if errors.is_empty() && (measured > committed + TOLERANCE || allow_decrease) {
        measured
    } else {
        committed
    };

    Decision {
        measured,
        committed,
        previous,
        enforced_floor,
        next_baseline,
        errors,
    }
}

fn required_arg(args: &[String], name: &str) -> Result<PathBuf, String> {
    let index = args
        .iter()
        .position(|arg| arg == name)
        .ok_or_else(|| format!("missing required argument {name}"))?;
    args.get(index + 1)
        .map(PathBuf::from)
        .ok_or_else(|| format!("missing value for {name}"))
}

fn optional_arg(args: &[String], name: &str) -> Option<PathBuf> {
    args.iter()
        .position(|arg| arg == name)
        .and_then(|index| args.get(index + 1))
        .map(PathBuf::from)
}

fn read_baseline(path: &Path) -> Result<f64, String> {
    let value = fs::read_to_string(path)
        .map_err(|error| format!("cannot read {}: {error}", path.display()))?;
    let baseline = value
        .trim()
        .parse::<f64>()
        .map_err(|error| format!("{} must contain one percentage: {error}", path.display()))?;
    if !(0.0..=100.0).contains(&baseline) || !baseline.is_finite() {
        return Err(format!(
            "{} contains invalid percentage {baseline}",
            path.display()
        ));
    }
    Ok(baseline)
}

fn read_report(path: &Path) -> Result<LineCoverage, String> {
    let contents = fs::read_to_string(path)
        .map_err(|error| format!("cannot read {}: {error}", path.display()))?;
    let mut report: CoverageReport = serde_json::from_str(&contents)
        .map_err(|error| format!("cannot parse {}: {error}", path.display()))?;
    report
        .data
        .pop()
        .map(|data| data.totals.lines)
        .ok_or_else(|| format!("{} contains no coverage data", path.display()))
}

fn summary(decision: &Decision, lines: &LineCoverage, exception: bool) -> String {
    let delta = decision.measured - decision.previous;
    let status = if decision.errors.is_empty() {
        "Pass"
    } else {
        "Fail"
    };
    let mut output = format!(
        "## Test coverage\n\n| Metric | Value |\n| --- | ---: |\n\
         | Status | **{status}** |\n\
         | Lines | {} / {} |\n\
         | Line coverage | {:.2}% |\n\
         | Default-branch baseline | {:.2}% |\n\
         | Delta | {delta:+.2}% |\n\
         | Enforced floor | {:.2}% |\n\
         | Target floor | {TARGET_FLOOR:.2}% |\n",
        lines.covered, lines.count, decision.measured, decision.previous, decision.enforced_floor,
    );
    if decision.next_baseline > decision.committed + TOLERANCE {
        output.push_str("\nCoverage increased; `coverage-baseline.txt` was advanced. Commit that reviewable change.\n");
    } else if decision.next_baseline + TOLERANCE < decision.committed && exception {
        output.push_str("\nThe `coverage-exception` escape hatch lowered the baseline; commit and review that change explicitly.\n");
    }
    for error in &decision.errors {
        output.push_str(&format!("\n- ❌ {error}\n"));
    }
    output
}

fn append_summary(path: Option<&Path>, contents: &str) -> Result<(), String> {
    if let Some(path) = path {
        let mut file = fs::OpenOptions::new()
            .create(true)
            .append(true)
            .open(path)
            .map_err(|error| format!("cannot open {}: {error}", path.display()))?;
        file.write_all(contents.as_bytes())
            .map_err(|error| format!("cannot write {}: {error}", path.display()))?;
    }
    Ok(())
}

fn update_baseline(path: &Path, committed: f64, next: f64) -> Result<bool, String> {
    if (next - committed).abs() <= TOLERANCE {
        return Ok(false);
    }
    fs::write(path, format!("{next:.6}\n"))
        .map_err(|error| format!("cannot update {}: {error}", path.display()))?;
    Ok(true)
}

fn run() -> Result<(), String> {
    let args: Vec<String> = env::args().collect();
    let report_path = required_arg(&args, "--report")?;
    let baseline_path = required_arg(&args, "--baseline")?;
    let previous_path = optional_arg(&args, "--previous-baseline");
    let summary_path = optional_arg(&args, "--summary");
    let exception = args.iter().any(|arg| arg == "--allow-decrease");

    let lines = read_report(&report_path)?;
    let committed = read_baseline(&baseline_path)?;
    let previous = previous_path
        .as_deref()
        .map(read_baseline)
        .transpose()?
        .unwrap_or(committed);
    let decision = decide(lines.percent, committed, previous, exception);
    let report = summary(&decision, &lines, exception);
    print!("{report}");
    append_summary(summary_path.as_deref(), &report)?;

    if !decision.errors.is_empty() {
        return Err(decision.errors.join("; "));
    }
    update_baseline(&baseline_path, committed, decision.next_baseline)?;
    Ok(())
}

fn main() {
    if let Err(error) = run() {
        eprintln!("Error: {error}");
        exit(1);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn absolute_floor_rejects_coverage_below_eighty_after_ramp() {
        let result = decide(79.0, 82.0, 82.0, false);
        assert_eq!(result.enforced_floor, 80.0);
        assert!(result
            .errors
            .iter()
            .any(|error| error.contains("enforced floor 80.00%")));
    }

    #[test]
    fn ratchet_rejects_a_drop_that_remains_above_floor() {
        let result = decide(81.0, 82.0, 82.0, false);
        assert!(!result
            .errors
            .iter()
            .any(|error| error.contains("enforced floor")));
        assert!(result
            .errors
            .iter()
            .any(|error| error.contains("committed baseline 82.00%")));
    }

    #[test]
    fn below_target_baseline_is_an_immediate_ratcheting_ramp() {
        let result = decide(76.8, 76.9, 76.9, false);
        assert_eq!(result.enforced_floor, 76.9);
        assert!(!result.errors.is_empty());
    }

    #[test]
    fn increased_coverage_advances_the_baseline() {
        let result = decide(78.25, 76.9, 76.9, false);
        assert!(result.errors.is_empty());
        assert_eq!(result.next_baseline, 78.25);
    }

    #[test]
    fn sub_basis_point_variance_does_not_move_or_fail_the_ratchet() {
        let lower = decide(77.449, 77.45, 76.82, false);
        assert!(lower.errors.is_empty());
        assert_eq!(lower.next_baseline, 77.45);

        let higher = decide(77.459, 77.45, 76.82, false);
        assert!(higher.errors.is_empty());
        assert_eq!(higher.next_baseline, 77.45);
    }

    #[test]
    fn increased_coverage_updates_the_reviewable_file() {
        let path = env::temp_dir().join(format!(
            "router-coverage-baseline-{}-{}",
            std::process::id(),
            std::thread::current().name().unwrap_or("test")
        ));
        fs::write(&path, "76.900000\n").expect("baseline fixture must be written");

        assert!(update_baseline(&path, 76.9, 78.25).expect("baseline update must succeed"));
        assert_eq!(
            fs::read_to_string(&path).expect("updated baseline must be readable"),
            "78.250000\n"
        );
        fs::remove_file(path).expect("baseline fixture must be removed");
    }

    #[test]
    fn pull_request_cannot_hide_a_regression_by_lowering_the_file() {
        let result = decide(76.0, 76.0, 76.9, false);
        assert!(result
            .errors
            .iter()
            .any(|error| error.contains("default-branch baseline")));
    }

    #[test]
    fn labelled_exception_makes_a_baseline_reduction_explicit() {
        let result = decide(76.0, 76.9, 76.9, true);
        assert!(result.errors.is_empty());
        assert_eq!(result.next_baseline, 76.0);
    }
}
