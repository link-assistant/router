#!/usr/bin/env rust-script
//! Detect code changes for CI/CD pipeline
//!
//! This script detects what types of files have changed between two commits
//! and outputs the results for use in GitHub Actions workflow conditions.
//!
//! Key behavior:
//! - For PRs: compares PR head against base branch
//! - For pushes: compares HEAD against HEAD^
//! - Excludes certain folders and file types from "code changes" detection
//!
//! Excluded from code changes (don't require changelog fragments):
//! - Markdown files (*.md) in any folder
//! - changelog.d/ folder (changelog fragments)
//! - docs/ folder (documentation)
//! - experiments/ folder (experimental scripts)
//! - examples/ folder (example scripts)
//!
//! Usage: rust-script scripts/detect-code-changes.rs
//!
//! Environment variables (set by GitHub Actions):
//!   - GITHUB_EVENT_NAME: 'pull_request' or 'push'
//!   - GITHUB_BASE_SHA: Base commit SHA for PR
//!   - GITHUB_HEAD_SHA: Head commit SHA for PR
//!
//! Outputs (written to GITHUB_OUTPUT):
//!   - rs-changed: 'true' if any .rs files changed
//!   - toml-changed: 'true' if any .toml files changed
//!   - mjs-changed: 'true' if any .mjs files changed
//!   - docs-changed: 'true' if any .md files changed
//!   - workflow-changed: 'true' if any .github/workflows/ files changed
//!   - any-code-changed: 'true' if any build-relevant file changed

use std::env;
use std::fs;
use std::io::Write;
use std::process::Command;

fn exec(command: &str, args: &[&str]) -> String {
    match Command::new(command).args(args).output() {
        Ok(output) => {
            if output.status.success() {
                String::from_utf8_lossy(&output.stdout).trim().to_string()
            } else {
                eprintln!("Error executing {} {:?}", command, args);
                eprintln!("{}", String::from_utf8_lossy(&output.stderr));
                String::new()
            }
        }
        Err(e) => {
            eprintln!("Failed to execute {} {:?}: {}", command, args, e);
            String::new()
        }
    }
}

fn exec_silent(command: &str, args: &[&str]) {
    let _ = Command::new(command)
        .args(args)
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::null())
        .status();
}

fn set_output(name: &str, value: &str) {
    if let Ok(output_file) = env::var("GITHUB_OUTPUT") {
        if let Ok(mut file) = fs::OpenOptions::new().create(true).append(true).open(&output_file) {
            let _ = writeln!(file, "{}={}", name, value);
        }
    }
    println!("{}={}", name, value);
}

fn get_changed_files() -> Vec<String> {
    let event_name = env::var("GITHUB_EVENT_NAME").unwrap_or_else(|_| "local".to_string());

    if event_name == "pull_request" {
        let base_sha = env::var("GITHUB_BASE_SHA").ok();
        let head_sha = env::var("GITHUB_HEAD_SHA").ok();

        if let (Some(base), Some(head)) = (base_sha, head_sha) {
            println!("Comparing PR: {}...{}", base, head);

            // Ensure we have the base commit
            exec_silent("git", &["fetch", "origin", &base]);

            let output = exec("git", &["diff", "--name-only", &base, &head]);
            if !output.is_empty() {
                return output.lines().filter(|s| !s.is_empty()).map(String::from).collect();
            }
        }
    }

    // For push events or fallback
    println!("Comparing HEAD^ to HEAD");
    let output = exec("git", &["diff", "--name-only", "HEAD^", "HEAD"]);

    if output.is_empty() {
        // If HEAD^ doesn't exist (first commit), list all files in HEAD
        println!("HEAD^ not available, listing all files in HEAD");
        let output = exec("git", &["ls-tree", "--name-only", "-r", "HEAD"]);
        return output.lines().filter(|s| !s.is_empty()).map(String::from).collect();
    }

    output.lines().filter(|s| !s.is_empty()).map(String::from).collect()
}

fn is_excluded_from_code_changes(file_path: &str) -> bool {
    // Exclude markdown files in any folder
    if file_path.ends_with(".md") {
        return true;
    }

    // Exclude specific folders from code changes
    let excluded_folders = [
        "changelog.d/",
        "dev/log/",
        "docs/",
        "experiments/",
        "examples/",
    ];

    for folder in &excluded_folders {
        if file_path.starts_with(folder) {
            return true;
        }
    }

    false
}

fn is_manifest_or_lockfile_change(file_path: &str) -> bool {
    file_path.ends_with(".toml") || file_path.ends_with("Cargo.lock")
}

#[derive(Debug, PartialEq, Eq)]
struct ChangeKinds {
    rs: bool,
    toml: bool,
    mjs: bool,
    docs: bool,
    workflow: bool,
    any_code: bool,
}

fn classify_changes(changed_files: &[String]) -> ChangeKinds {
    let included: Vec<&String> = changed_files
        .iter()
        .filter(|file| !is_excluded_from_code_changes(file))
        .collect();

    ChangeKinds {
        rs: included.iter().any(|file| file.ends_with(".rs")),
        toml: included
            .iter()
            .any(|file| is_manifest_or_lockfile_change(file)),
        mjs: included.iter().any(|file| file.ends_with(".mjs")),
        docs: changed_files.iter().any(|file| file.ends_with(".md")),
        workflow: included
            .iter()
            .any(|file| file.starts_with(".github/workflows/")),
        // Use an allowlist only for files that are intentionally non-code. An
        // extension allowlist silently misses Dockerfiles, lockfiles, shell
        // scripts, JSON manifests, and future languages.
        any_code: !included.is_empty(),
    }
}

fn main() {
    println!("Detecting file changes for CI/CD...\n");

    let changed_files = get_changed_files();

    println!("Changed files:");
    if changed_files.is_empty() {
        println!("  (none)");
    } else {
        for file in &changed_files {
            println!("  {}", file);
        }
    }
    println!();

    let kinds = classify_changes(&changed_files);
    set_output("rs-changed", if kinds.rs { "true" } else { "false" });
    set_output("toml-changed", if kinds.toml { "true" } else { "false" });
    set_output("mjs-changed", if kinds.mjs { "true" } else { "false" });
    set_output("docs-changed", if kinds.docs { "true" } else { "false" });
    set_output(
        "workflow-changed",
        if kinds.workflow { "true" } else { "false" },
    );

    // Detect code changes (excluding docs, changelog.d, experiments, examples folders, and markdown files)
    let code_changed_files: Vec<&String> = changed_files
        .iter()
        .filter(|f| !is_excluded_from_code_changes(f))
        .collect();

    println!("\nFiles considered as code changes:");
    if code_changed_files.is_empty() {
        println!("  (none)");
    } else {
        for file in &code_changed_files {
            println!("  {}", file);
        }
    }
    println!();

    set_output(
        "any-code-changed",
        if kinds.any_code { "true" } else { "false" },
    );

    println!("\nChange detection completed.");
}

#[cfg(test)]
mod tests {
    use super::*;

    fn paths(values: &[&str]) -> Vec<String> {
        values.iter().map(|value| (*value).to_string()).collect()
    }

    #[test]
    fn detects_extensionless_and_non_rust_build_inputs() {
        for path in [
            "Cargo.lock",
            "Dockerfile",
            "scripts/check.sh",
            "ui/package-lock.json",
            "ui/src/App.jsx",
        ] {
            assert!(
                classify_changes(&paths(&[path])).any_code,
                "{path} must trigger code checks"
            );
        }
        assert!(classify_changes(&paths(&["Cargo.lock"])).toml);
    }

    #[test]
    fn excludes_only_deliberately_non_build_inputs() {
        let kinds = classify_changes(&paths(&[
            "README.md",
            "docs/design.md",
            "dev/log/issues/184/run.json",
            "changelog.d/fix.md",
            "examples/demo.rs",
            "experiments/repro.sh",
        ]));

        assert!(!kinds.any_code);
        assert!(kinds.docs);
        assert!(!kinds.rs);
    }
}
