#!/usr/bin/env rust-script
//! Report version tags on the default branch that have no GitHub Release.
//!
//! Usage: rust-script scripts/check-github-releases.rs --repository <owner/repo>
//!   [--default-branch <branch>] [--release-version <version>] [--historical-orphans error|warn]
//!
//! `--release-version` scopes the hard failure to the version being released right now:
//! its tag *must* have a release. Orphan tags left behind by earlier runs are unrelated to
//! the current publication, so `--historical-orphans warn` reports them without failing the
//! run — the scheduled reconciliation workflow keeps enforcing them as an error.

use std::collections::HashSet;
use std::env;
use std::process::{exit, Command};

fn get_arg(name: &str) -> Option<String> {
    let args: Vec<String> = env::args().collect();
    let flag = format!("--{name}");
    args.iter()
        .position(|arg| arg == &flag)
        .and_then(|index| args.get(index + 1).cloned())
}

fn command_output(command: &str, args: &[&str]) -> Result<String, String> {
    let output = Command::new(command)
        .args(args)
        .output()
        .map_err(|error| format!("failed to execute {command}: {error}"))?;

    if !output.status.success() {
        return Err(format!(
            "{command} {} failed: {}",
            args.join(" "),
            String::from_utf8_lossy(&output.stderr).trim()
        ));
    }

    String::from_utf8(output.stdout)
        .map_err(|error| format!("{command} returned non-UTF-8 output: {error}"))
}

fn missing_releases(tags: &str, releases: &str) -> Vec<String> {
    let releases: HashSet<&str> = releases.lines().filter(|line| !line.is_empty()).collect();
    tags.lines()
        .filter(|tag| tag.starts_with('v') && !releases.contains(tag))
        .map(str::to_string)
        .collect()
}

/// Human-readable remediation, so a failing log alone explains how to unblock releases.
fn remediation(tags: &[String]) -> String {
    let first = tags
        .first()
        .map(String::as_str)
        .unwrap_or("<tag>")
        .to_string();
    format!(
        "Resolve each orphan tag by either creating the missing release\n  \
         gh release create {first} --title {first} --notes-from-tag\n\
         or deleting the tag if that version was never meant to ship\n  \
         git push origin :refs/tags/{first}"
    )
}

/// Split orphans into the tag being released right now and leftovers from earlier runs.
fn partition_orphans(missing: Vec<String>, release_tag: Option<&str>) -> (Vec<String>, Vec<String>) {
    match release_tag {
        Some(tag) => missing.into_iter().partition(|missing| missing == tag),
        None => (Vec::new(), missing),
    }
}

fn check(
    repository: &str,
    default_branch: &str,
    release_tag: Option<&str>,
    fail_on_historical: bool,
) -> Result<(), String> {
    let merged_ref = format!("origin/{default_branch}");
    let tags = command_output(
        "git",
        &[
            "tag",
            "--merged",
            &merged_ref,
            "--sort=v:refname",
            "--list",
            "v*",
        ],
    )?;
    if tags.trim().is_empty() {
        return Err(format!("no version tags found on {merged_ref}"));
    }

    let releases = command_output(
        "gh",
        &[
            "release",
            "list",
            "--repo",
            repository,
            "--limit",
            "1000",
            "--json",
            "tagName",
            "--jq",
            ".[].tagName",
        ],
    )?;
    let missing = missing_releases(&tags, &releases);
    let (current, historical) = partition_orphans(missing, release_tag);

    if !historical.is_empty() {
        let report = format!(
            "pre-existing tags without a GitHub Release:\n{}\n{}",
            historical.join("\n"),
            remediation(&historical)
        );
        if fail_on_historical {
            return Err(report);
        }
        println!("Warning: {report}");
    }

    if !current.is_empty() {
        return Err(format!(
            "the version being released has no GitHub Release:\n{}\n{}",
            current.join("\n"),
            remediation(&current)
        ));
    }

    if historical.is_empty() {
        println!(
            "Verified that all {} default-branch version tags have GitHub Releases",
            tags.lines().count()
        );
    }
    Ok(())
}

fn main() {
    let repository = get_arg("repository")
        .or_else(|| env::var("GITHUB_REPOSITORY").ok())
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| {
            eprintln!("Error: --repository or GITHUB_REPOSITORY is required");
            exit(2);
        });
    let default_branch = get_arg("default-branch").unwrap_or_else(|| "main".to_string());
    let release_tag = get_arg("release-version")
        .filter(|value| !value.is_empty())
        .map(|version| format!("v{}", version.trim_start_matches('v')));
    let fail_on_historical = match get_arg("historical-orphans").as_deref() {
        None | Some("error") => true,
        Some("warn") => false,
        Some(mode) => {
            eprintln!("Error: unknown --historical-orphans mode: {mode} (expected error or warn)");
            exit(2);
        }
    };

    if let Err(error) = check(
        &repository,
        &default_branch,
        release_tag.as_deref(),
        fail_on_historical,
    ) {
        eprintln!("Error: {error}");
        exit(1);
    }
}

#[cfg(test)]
mod tests {
    use super::{missing_releases, partition_orphans, remediation};

    #[test]
    fn scopes_the_current_release_apart_from_earlier_orphans() {
        let missing = vec!["v0.56.0".to_string(), "v0.58.0".to_string()];

        let (current, historical) = partition_orphans(missing, Some("v0.58.0"));

        assert_eq!(current, vec!["v0.58.0"]);
        assert_eq!(historical, vec!["v0.56.0"]);
    }

    #[test]
    fn treats_every_orphan_as_historical_without_a_release_version() {
        let missing = vec!["v0.56.0".to_string()];

        let (current, historical) = partition_orphans(missing, None);

        assert!(current.is_empty());
        assert_eq!(historical, vec!["v0.56.0"]);
    }

    #[test]
    fn remediation_names_both_ways_out_for_the_reported_tag() {
        let message = remediation(&["v0.56.0".to_string()]);

        assert!(message.contains("gh release create v0.56.0"));
        assert!(message.contains("git push origin :refs/tags/v0.56.0"));
    }

    #[test]
    fn reports_every_tag_without_a_release() {
        let tags = "v0.3.0\nv0.9.0\nv0.10.0\nv0.42.0\n";
        let releases = "v0.42.0\nv0.3.0\n";

        assert_eq!(missing_releases(tags, releases), vec!["v0.9.0", "v0.10.0"]);
    }

    #[test]
    fn accepts_complete_release_sets_regardless_of_order() {
        let tags = "v0.9.0\nv0.10.0\n";
        let releases = "v0.10.0\nv0.9.0\n";

        assert!(missing_releases(tags, releases).is_empty());
    }
}
