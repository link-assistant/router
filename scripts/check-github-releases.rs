#!/usr/bin/env rust-script
//! Fail when a version tag on the default branch has no GitHub Release.

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

fn check(repository: &str, default_branch: &str) -> Result<(), String> {
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

    if missing.is_empty() {
        println!(
            "Verified that all {} default-branch version tags have GitHub Releases",
            tags.lines().count()
        );
        Ok(())
    } else {
        Err(format!(
            "tags without a GitHub Release:\n{}",
            missing.join("\n")
        ))
    }
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

    if let Err(error) = check(&repository, &default_branch) {
        eprintln!("Error: {error}");
        exit(1);
    }
}

#[cfg(test)]
mod tests {
    use super::missing_releases;

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
