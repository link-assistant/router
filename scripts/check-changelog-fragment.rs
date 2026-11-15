#!/usr/bin/env rust-script
//! Check if a changelog fragment was added in the current PR
//!
//! This script validates that a changelog fragment is added in the PR diff,
//! not just checking if any fragments exist in the directory. This prevents
//! the check from incorrectly passing when there are leftover fragments
//! from previous PRs that haven't been released yet.
//!
//! Usage: rust-script scripts/check-changelog-fragment.rs
//!
//! Environment variables (set by GitHub Actions):
//!   - GITHUB_BASE_REF: Base branch name for PR (e.g., "main")
//!
//! Exit codes:
//!   - 0: Check passed (fragment added or no source changes)
//!   - 1: Check failed (source changes without changelog fragment)
//!
use std::env;
use std::process::{Command, exit};

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

fn get_changed_files() -> Vec<String> {
    let base_ref = env::var("GITHUB_BASE_REF").unwrap_or_else(|_| "main".to_string());
    eprintln!("Comparing against origin/{}...HEAD", base_ref);

    let output = exec(
        "git",
        &["diff", "--name-only", &format!("origin/{}...HEAD", base_ref)],
    );

    if output.is_empty() {
        return Vec::new();
    }

    output.lines().filter(|s| !s.is_empty()).map(String::from).collect()
}

fn is_source_file(file_path: &str) -> bool {
    !file_path.ends_with(".md")
        && ![
            "changelog.d/",
            "dev/log/",
            "docs/",
            "examples/",
            "experiments/",
        ]
        .iter()
        .any(|prefix| file_path.starts_with(prefix))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn every_build_relevant_surface_requires_a_fragment() {
        for path in [
            "Cargo.lock",
            "Dockerfile",
            ".github/workflows/release.yml",
            "scripts/check.sh",
            "src/main.rs",
            "tests/integration.rs",
            "ui/package-lock.json",
            "ui/src/App.jsx",
        ] {
            assert!(is_source_file(path), "{path} must require a changelog fragment");
        }
    }

    #[test]
    fn only_fragments_surviving_a_release_are_stale() {
        let released = vec!["old.md".to_string(), "kept.md".to_string()];
        let pending = vec!["kept.md".to_string(), "new.md".to_string()];
        assert_eq!(stale_fragments(&pending, &released), vec!["kept.md".to_string()]);
        assert!(stale_fragments(&pending, &[]).is_empty());
    }

    #[test]
    fn readme_is_not_a_pending_fragment() {
        assert!(is_pending_fragment_name("20261113_220000_fix.md"));
        assert!(!is_pending_fragment_name("README.md"));
        assert!(!is_pending_fragment_name("notes.txt"));
    }

    #[test]
    fn evidence_and_documentation_do_not_require_a_fragment() {
        for path in [
            "README.md",
            "changelog.d/fix.md",
            "dev/log/issues/184/run.json",
            "docs/design.txt",
            "examples/demo.rs",
            "experiments/repro.sh",
        ] {
            assert!(!is_source_file(path), "{path} should not require a fragment");
        }
    }
}

fn is_changelog_fragment(file_path: &str) -> bool {
    // Changelog fragments are .md files in changelog.d/ (excluding README.md)
    file_path.starts_with("changelog.d/")
        && file_path.ends_with(".md")
        && !file_path.ends_with("README.md")
}

/// How many fragments can be pending before something is wrong.
///
/// A release collects every pending fragment into one section, so a directory
/// that keeps growing is a release that never cleaned up after itself. That
/// went unnoticed for eight months and roughly 150 releases, because nothing
/// counted: `changelog.d/` reached 154 fragments and a single version's notes
/// reached 145 KB, every release republishing the whole archive (issue #337).
///
/// Generous on purpose. This catches a broken pipeline, not a busy week.
const MAX_PENDING_FRAGMENTS: usize = 40;

fn is_pending_fragment_name(name: &str) -> bool {
    name.ends_with(".md") && name != "README.md"
}

/// Fragments that were already pending at the latest release and are still
/// pending now. A working release removes everything it collected, so any
/// survivor is exactly the issue #337 defect.
fn stale_fragments(pending: &[String], released: &[String]) -> Vec<String> {
    pending
        .iter()
        .filter(|name| released.iter().any(|old| old == *name))
        .cloned()
        .collect()
}

/// The newest release tag reachable from HEAD, if the checkout has tags.
fn latest_release_tag() -> Option<String> {
    let tag = exec(
        "git",
        &["describe", "--tags", "--abbrev=0", "--match", "v[0-9]*", "HEAD"],
    );
    (!tag.is_empty()).then_some(tag)
}

/// Fragment file names committed at `tag`.
fn fragments_at(tag: &str) -> Vec<String> {
    exec(
        "git",
        &["ls-tree", "--name-only", &format!("{tag}:changelog.d")],
    )
    .lines()
    .filter(|name| is_pending_fragment_name(name))
    .map(String::from)
    .collect()
}

/// Fail when a release left fragments behind, or when fragments accumulated
/// past what one release should hold and that cannot be explained.
///
/// A growing count alone has two causes: a release that does not remove what
/// it collected (issue #337), or releases that have not run because the
/// default branch is red. Only the first is a pipeline defect this check can
/// fix; the second resolves itself on the next release. When the latest
/// release tag is available the check distinguishes them precisely; without
/// it (for example a shallow checkout) the plain count limit still applies so
/// the guard never passes vacuously.
fn check_pending_fragments() {
    let directory = std::path::Path::new("changelog.d");
    let Ok(entries) = std::fs::read_dir(directory) else {
        // A guard that quietly finds nothing is not a guard. The directory is
        // committed, so its absence means this ran from somewhere unexpected
        // and the count below would have been vacuously fine.
        eprintln!(
            "changelog.d/ is not readable from {}; the fragment count cannot be checked.",
            std::env::current_dir()
                .map(|path| path.display().to_string())
                .unwrap_or_else(|_| String::from("the working directory"))
        );
        exit(1);
    };
    let mut pending: Vec<String> = entries
        .filter_map(Result::ok)
        .filter_map(|entry| entry.file_name().to_str().map(String::from))
        .filter(|name| is_pending_fragment_name(name))
        .collect();
    pending.sort();
    let count = pending.len();
    println!("Pending changelog fragments: {count}");
    if count <= MAX_PENDING_FRAGMENTS {
        return;
    }
    let Some(tag) = latest_release_tag() else {
        eprintln!(
            "changelog.d/ holds {count} fragments, more than the {MAX_PENDING_FRAGMENTS} a \
             release should ever collect at once, and no release tag is reachable to tell a \
             blocked release from one that does not remove its fragments."
        );
        exit(1);
    };
    let stale = stale_fragments(&pending, &fragments_at(&tag));
    if !stale.is_empty() {
        eprintln!(
            "{} fragments were already pending at release {tag} and were not removed:",
            stale.len()
        );
        for name in &stale {
            eprintln!("  changelog.d/{name}");
        }
        eprintln!(
            "A release collects every pending fragment into one section, so this means a \
             release is not removing them and every version is republishing the archive."
        );
        exit(1);
    }
    println!(
        "::warning::changelog.d/ holds {count} fragments, more than the \
         {MAX_PENDING_FRAGMENTS} one release should collect. All were added after {tag}, so \
         releases are blocked rather than failing to remove fragments; the next release \
         collects them all."
    );
}

fn main() {
    println!("Checking for changelog fragment in PR diff...\n");
    check_pending_fragments();

    let changed_files = get_changed_files();

    if changed_files.is_empty() {
        println!("No changed files found");
        exit(0);
    }

    println!("Changed files:");
    for file in &changed_files {
        println!("  {}", file);
    }
    println!();

    // Count source files changed
    let source_changes: Vec<&String> = changed_files.iter().filter(|f| is_source_file(f)).collect();
    let source_changed_count = source_changes.len();

    println!("Source files changed: {}", source_changed_count);
    if source_changed_count > 0 {
        for file in &source_changes {
            println!("  {}", file);
        }
    }
    println!();

    // Count changelog fragments added in this PR
    let fragments_added: Vec<&String> = changed_files
        .iter()
        .filter(|f| is_changelog_fragment(f))
        .collect();
    let fragment_added_count = fragments_added.len();

    println!("Changelog fragments added: {}", fragment_added_count);
    if fragment_added_count > 0 {
        for file in &fragments_added {
            println!("  {}", file);
        }
    }
    println!();

    // Check if source files changed but no fragment was added
    if source_changed_count > 0 && fragment_added_count == 0 {
        eprintln!("::error::No changelog fragment found in this PR. Please add a changelog entry in changelog.d/");
        eprintln!();
        eprintln!("To create a changelog fragment:");
        eprintln!("  Create a new .md file in changelog.d/ with your changes");
        eprintln!();
        eprintln!("See changelog.d/README.md for more information.");
        exit(1);
    }

    println!(
        "Changelog check passed (source files changed: {}, fragments added: {})",
        source_changed_count, fragment_added_count
    );
}
