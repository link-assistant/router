#!/usr/bin/env rust-script
//! Create GitHub Release from CHANGELOG.md
//!
//! Usage: rust-script scripts/create-github-release.rs --release-version <version> --repository <repository>
//!   [--crates-io-url <url>] [--docker-hub-url <url>]
//!
//! ```cargo
//! [dependencies]
//! regex = "1"
//! serde = { version = "1", features = ["derive"] }
//! serde_json = "1"
//! ```

use regex::Regex;
use serde::Serialize;
use std::env;
use std::fs;
use std::io::Write;
use std::path::Path;
use std::process::{exit, Command, Stdio};

fn get_arg(name: &str) -> Option<String> {
    let args: Vec<String> = env::args().collect();
    let flag = format!("--{}", name);

    if let Some(idx) = args.iter().position(|a| a == &flag) {
        return args.get(idx + 1).cloned();
    }

    let env_name = name.to_uppercase().replace('-', "_");
    env::var(&env_name).ok().filter(|s| !s.is_empty())
}

/// The largest release body the GitHub API accepts.
///
/// Undocumented in the REST reference and enforced as a plain HTTP 422 with no
/// explanatory message, which is how a release for a large changelog failed
/// with nothing on the line to say why.
const MAX_RELEASE_BODY: usize = 125_000;

/// Keep a release body inside what the API will accept, saying what was cut.
///
/// A truncated body that names the full changelog is a release page; a 422 is
/// no release page at all. The marker matters as much as the cut: without it a
/// reader cannot tell a short changelog from a shortened one.
fn fit_release_body(body: String, tag: &str, repository: &str) -> String {
    if body.len() <= MAX_RELEASE_BODY {
        return body;
    }
    let notice = format!(
        "\n\n---\n\n*This release note was truncated to fit GitHub's {MAX_RELEASE_BODY}-character \
         limit. The complete entry is in [CHANGELOG.md](https://github.com/{repository}/blob/{tag}/CHANGELOG.md).*\n"
    );
    // Cut on a line boundary so the body never ends mid-sentence, and never
    // inside a multi-byte character.
    let budget = MAX_RELEASE_BODY.saturating_sub(notice.len());
    let mut end = 0;
    for (index, byte) in body.bytes().enumerate() {
        if index >= budget {
            break;
        }
        if byte == b'\n' {
            end = index + 1;
        }
    }
    if end == 0 {
        end = body
            .char_indices()
            .map(|(index, _)| index)
            .take_while(|index| *index <= budget)
            .last()
            .unwrap_or(0);
    }
    format!("{}{}", &body[..end], notice)
}

fn get_changelog_for_version(version: &str) -> String {
    let changelog_path = "CHANGELOG.md";

    if !Path::new(changelog_path).exists() {
        return format!("Release v{}", version);
    }

    let content = match fs::read_to_string(changelog_path) {
        Ok(c) => c,
        Err(_) => return format!("Release v{}", version),
    };

    let escaped_version = regex::escape(version);
    let header_pattern = format!(r"(?m)^## \[{escaped_version}\]");
    let header_re = Regex::new(&header_pattern).unwrap();

    if let Some(version_header) = header_re.find(&content) {
        let after_header = &content[version_header.end()..];
        let body_start = after_header
            .find('\n')
            .map_or(after_header.len(), |i| i + 1);
        let body = &after_header[body_start..];

        let next_section_re = Regex::new(r"(?m)^## \[").unwrap();
        let section_body = if let Some(next) = next_section_re.find(body) {
            &body[..next.start()]
        } else {
            body
        };

        let trimmed = section_body.trim();
        if trimmed.is_empty() {
            format!("Release v{}", version)
        } else {
            trimmed.to_string()
        }
    } else {
        format!("Release v{}", version)
    }
}

fn badge_escape(value: &str) -> String {
    value
        .replace('-', "--")
        .replace('_', "__")
        .replace(' ', "%20")
        .replace('/', "%2F")
        .replace(':', "%3A")
}

fn crates_io_badge(url: &str, version: &str) -> String {
    let version_url = format!("{}/{}", url.trim_end_matches('/'), version);
    format!(
        "[![crates.io](https://img.shields.io/crates/v/link-assistant-router.svg?label=crates.io)]({}) [![crates.io v{}](https://img.shields.io/badge/crates.io-v{}-orange)]({})",
        url,
        version,
        badge_escape(version),
        version_url
    )
}

fn docker_hub_badge(url: &str, version: &str) -> String {
    let image = url
        .trim_end_matches('/')
        .strip_prefix("https://hub.docker.com/r/")
        .unwrap_or("konard/link-assistant-router");
    let tag_url = format!("{}/tags?name={}", url.trim_end_matches('/'), version);
    let image_tag = format!("{}:{}", image, version);

    format!(
        "[![Docker Hub {}](https://img.shields.io/badge/docker-{}-2496ED?logo=docker)]({})",
        version,
        badge_escape(&image_tag),
        tag_url
    )
}

#[derive(Serialize)]
struct ReleasePayload {
    tag_name: String,
    name: String,
    body: String,
}


/// Versions with a tag on the default branch but no release page.
///
/// The pipeline creates the release page last, so anything that refuses it
/// leaves a version whose tag, crate and images all published with nothing to
/// point a user at — and no later run revisited it, because each run only ever
/// published its own version. That is how v0.116.0 shipped without a release.
fn orphaned_versions(repository: &str, tag_prefix: &str) -> Vec<String> {
    // The release job checks out the tag, not a branch, so `origin/main` may
    // not be a ref here. Fall back to every release tag rather than to nothing:
    // a tag that is not on the default branch simply has no changelog section,
    // and `publish_release` reports that rather than inventing a release.
    let tags = ["origin/main", "HEAD"]
        .into_iter()
        .find_map(|reference| {
            let output = Command::new("git")
                .args([
                    "tag",
                    "--merged",
                    reference,
                    "--sort=v:refname",
                    "--list",
                    &format!("{tag_prefix}*"),
                ])
                .output()
                .ok()?;
            output
                .status
                .success()
                .then(|| String::from_utf8_lossy(&output.stdout).into_owned())
        })
        .unwrap_or_default();
    if tags.trim().is_empty() {
        return Vec::new();
    }
    let releases = match Command::new("gh")
        .args([
            "release", "list", "--repo", repository, "--limit", "1000", "--json", "tagName",
            "--jq", ".[].tagName",
        ])
        .output()
    {
        Ok(output) if output.status.success() => {
            String::from_utf8_lossy(&output.stdout).into_owned()
        }
        _ => return Vec::new(),
    };
    missing_release_versions(&tags, &releases, tag_prefix)
}

/// The versions in `tags` that no entry in `releases` covers.
fn missing_release_versions(tags: &str, releases: &str, tag_prefix: &str) -> Vec<String> {
    let published: Vec<&str> = releases
        .lines()
        .map(str::trim)
        .filter(|line| !line.is_empty())
        .collect();
    tags.lines()
        .map(str::trim)
        .filter(|tag| !tag.is_empty() && tag.starts_with(tag_prefix))
        .filter(|tag| !published.contains(tag))
        .filter_map(|tag| tag.strip_prefix(tag_prefix))
        .map(str::to_string)
        .collect()
}

/// Publish one version's release page, or report why it could not be.
fn publish_release(
    version: &str,
    repository: &str,
    tag_prefix: &str,
    crates_io_url: Option<&str>,
    docker_hub_url: Option<&str>,
) -> Result<(), String> {
    let tag = format!("{}{}", tag_prefix, version);
    println!("Creating GitHub release for {}...", tag);

    let mut release_notes = get_changelog_for_version(version);

    // Add package/image badges so release pages visibly show registry status.
    let mut badges = Vec::new();
    if let Some(url) = crates_io_url {
        badges.push(crates_io_badge(url, version));
    }
    if let Some(url) = docker_hub_url {
        badges.push(docker_hub_badge(url, version));
    }
    if !badges.is_empty() {
        release_notes = format!("{}\n\n{}", badges.join("\n"), release_notes);
    }

    // Create release using GitHub API with JSON input
    let payload = ReleasePayload {
        tag_name: tag.clone(),
        name: format!("{}{}", tag_prefix, version),
        body: fit_release_body(release_notes, &tag, repository),
    };

    let payload_json = serde_json::to_string(&payload).expect("Failed to serialize payload");

    let mut child = Command::new("gh")
        .args([
            "api",
            &format!("repos/{repository}/releases"),
            "-X",
            "POST",
            "--input",
            "-",
        ])
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .expect("Failed to execute gh command");

    if let Some(ref mut stdin) = child.stdin {
        stdin
            .write_all(payload_json.as_bytes())
            .expect("Failed to write to stdin");
    }

    let output = child
        .wait_with_output()
        .expect("Failed to wait on gh command");

    if output.status.success() {
        println!("Created GitHub release: {tag}");
        return Ok(());
    }
    let stderr = String::from_utf8_lossy(&output.stderr);
    if stderr.contains("already exists") {
        println!("Release {tag} already exists, skipping");
        return Ok(());
    }
    Err(format!("Error creating release {tag}: {stderr}"))
}

fn main() {
    let version = match get_arg("release-version") {
        Some(v) => v,
        None => {
            eprintln!("Error: Missing required argument --release-version");
            eprintln!("Usage: rust-script scripts/create-github-release.rs --release-version <version> --repository <repository>");
            exit(1);
        }
    };

    let repository = match get_arg("repository") {
        Some(r) => r,
        None => {
            eprintln!("Error: Missing required argument --repository");
            eprintln!("Usage: rust-script scripts/create-github-release.rs --release-version <version> --repository <repository>");
            exit(1);
        }
    };

    let tag_prefix = get_arg("tag-prefix").unwrap_or_else(|| "v".to_string());
    let crates_io_url = get_arg("crates-io-url");
    let docker_hub_url = get_arg("docker-hub-url");

    if let Err(error) = publish_release(
        &version,
        &repository,
        &tag_prefix,
        crates_io_url.as_deref(),
        docker_hub_url.as_deref(),
    ) {
        eprintln!("{error}");
        exit(1);
    }

    // Then any version that shipped without a release page. Reporting an
    // orphan was not enough: the report had nowhere to go but a human, and the
    // scheduled audit that fails on it cannot create what is missing.
    let orphans = orphaned_versions(&repository, &tag_prefix);
    if orphans.is_empty() {
        return;
    }
    println!(
        "Backfilling {} release page(s) that shipped without one: {}",
        orphans.len(),
        orphans.join(", ")
    );
    let failed: Vec<String> = orphans
        .into_iter()
        .filter(|orphan| {
            publish_release(
                orphan,
                &repository,
                &tag_prefix,
                crates_io_url.as_deref(),
                docker_hub_url.as_deref(),
            )
            .map_err(|error| eprintln!("{error}"))
            .is_err()
        })
        .collect();
    if !failed.is_empty() {
        eprintln!(
            "::error::could not backfill {}; the scheduled release audit will keep reporting them",
            failed.join(", ")
        );
        exit(1);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// A body inside the limit is published exactly as written.
    #[test]
    fn an_ordinary_release_note_is_left_alone() {
        let body = "## [1.2.3]\n\n- one fix\n".to_string();
        assert_eq!(
            fit_release_body(body.clone(), "v1.2.3", "owner/repo"),
            body
        );
    }

    /// A changelog larger than the limit produced an HTTP 422 with no message,
    /// so a release that was built, tested and tagged had no release page.
    /// Truncating publishes it and says where the rest is.
    #[test]
    fn an_oversized_release_note_is_published_truncated_and_says_so() {
        let body = "- a changelog entry that repeats\n".repeat(8_000);
        assert!(body.len() > MAX_RELEASE_BODY, "the fixture must overflow");

        let fitted = fit_release_body(body, "v0.116.0", "owner/repo");

        assert!(
            fitted.len() <= MAX_RELEASE_BODY,
            "the API rejects anything larger: {} bytes",
            fitted.len()
        );
        assert!(
            fitted.contains("truncated"),
            "a shortened body must not read as a complete one"
        );
        assert!(
            fitted.contains("owner/repo/blob/v0.116.0/CHANGELOG.md"),
            "and must name where the rest is: {}",
            &fitted[fitted.len() - 300..]
        );
        // Cut on a line boundary, so the body never ends mid-entry.
        let kept = fitted.split("\n\n---\n\n").next().expect("body");
        assert!(kept.ends_with('\n'), "the cut lands between entries");
    }

    /// The cut must never land inside a multi-byte character, which would
    /// panic on the slice and lose the release entirely.
    #[test]
    fn a_body_of_multibyte_characters_is_cut_safely() {
        // No newlines at all, so the line-boundary search finds nothing and
        // the character-boundary fallback has to carry it.
        let body = "é".repeat(MAX_RELEASE_BODY);
        let fitted = fit_release_body(body, "v1.0.0", "owner/repo");
        assert!(fitted.len() <= MAX_RELEASE_BODY);
        assert!(fitted.contains("truncated"));
    }

    /// A tag with no release page is a version that shipped with nothing to
    /// point a user at. The pipeline creates the page last, so anything that
    /// refuses it strands the version — and nothing revisited it, because each
    /// run only published its own.
    #[test]
    fn a_tag_without_a_release_is_reported_for_backfill() {
        let tags = "v0.115.0\nv0.116.0\nv0.117.0\n";
        let releases = "v0.117.0\nv0.115.0\n";

        assert_eq!(
            missing_release_versions(tags, releases, "v"),
            vec!["0.116.0"],
            "the version that shipped without a release page"
        );
    }

    /// Nothing to do when every tag already has one, so an ordinary release
    /// run does no extra work and says nothing extra.
    #[test]
    fn a_complete_release_set_needs_no_backfill() {
        let tags = "v0.115.0\nv0.116.0\n";
        let releases = "v0.116.0\nv0.115.0\n";

        assert!(missing_release_versions(tags, releases, "v").is_empty());
    }

    /// Whitespace and blank lines from `git tag` / `gh release list` must not
    /// invent an orphan: backfilling a version that does not exist would fail
    /// the pipeline for nothing.
    #[test]
    fn ragged_command_output_does_not_invent_an_orphan() {
        let tags = "\n v0.116.0 \n\n";
        let releases = "\nv0.116.0\n \n";

        assert!(missing_release_versions(tags, releases, "v").is_empty());
    }

    /// A tag that is not a release tag at all is left alone.
    #[test]
    fn only_release_tags_are_considered() {
        let tags = "nightly-2026-08-26\nv0.116.0\n";
        let releases = "v0.116.0\n";

        assert!(missing_release_versions(tags, releases, "v").is_empty());
    }
}
