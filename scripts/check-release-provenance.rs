#!/usr/bin/env rust-script
//! Verify that every published release artifact is built from the release tag commit.
//!
//! The release automation creates the `chore: release vX.Y.Z` commit *after* the run
//! started, so `github.sha` still points at the previous merge commit. Anything that
//! derives provenance from the workflow context therefore labels the image with the
//! wrong revision (issue #191). This guard re-resolves the annotated tag and compares
//! the commit against the published image configs, the release checksum files, and the
//! build provenance attestations of the downloadable archives.
//!
//! Usage:
//!   rust-script scripts/check-release-provenance.rs \
//!     --release-version 0.77.0 \
//!     [--expected-commit <sha>] \
//!     [--repository owner/name] \
//!     [--image ghcr.io/owner/name:0.77.0]... \
//!     [--asset-dir dist]
//!
//! ```cargo
//! [dependencies]
//! serde_json = "1"
//! ```

use serde_json::Value;
use std::collections::BTreeSet;
use std::env;
use std::fs;
use std::path::Path;
use std::process::{self, Command};

const REQUIRED_PLATFORMS: [&str; 2] = ["linux/amd64", "linux/arm64"];
const REVISION_LABEL: &str = "org.opencontainers.image.revision";
const VERSION_LABEL: &str = "org.opencontainers.image.version";

#[derive(Debug, Default)]
struct Options {
    release_version: String,
    expected_commit: Option<String>,
    repository: Option<String>,
    images: Vec<String>,
    asset_dirs: Vec<String>,
    /// Checksum-only mode for offline reproduction; publication guards never set it.
    skip_attestations: bool,
}

fn parse_arguments(arguments: &[String]) -> Result<Options, String> {
    let mut options = Options::default();
    let mut index = 0;
    while index < arguments.len() {
        let flag = arguments[index].as_str();
        let value = || {
            arguments
                .get(index + 1)
                .cloned()
                .ok_or_else(|| format!("{flag} requires a value"))
        };
        match flag {
            "--release-version" => options.release_version = value()?,
            "--expected-commit" => options.expected_commit = Some(value()?),
            "--repository" => options.repository = Some(value()?),
            "--image" => options.images.push(value()?),
            "--asset-dir" => options.asset_dirs.push(value()?),
            "--skip-attestations" => {
                options.skip_attestations = true;
                index += 1;
                continue;
            }
            other => return Err(format!("unknown argument: {other}")),
        }
        index += 2;
    }

    if options.release_version.is_empty() {
        return Err("--release-version is required".to_string());
    }
    if let Some(commit) = &options.expected_commit {
        if !is_commit_sha(commit) {
            return Err(format!("--expected-commit is not a full commit SHA: {commit}"));
        }
    }
    Ok(options)
}

fn is_commit_sha(candidate: &str) -> bool {
    candidate.len() == 40 && candidate.bytes().all(|byte| byte.is_ascii_hexdigit())
}

/// `docker buildx imagetools inspect --format '{{json .Image}}'` returns a single image
/// config for a one-platform reference and a platform-keyed map for a manifest list.
fn labels_by_platform(raw_image: &str) -> Result<Vec<(String, Value)>, String> {
    let parsed: Value = serde_json::from_str(raw_image)
        .map_err(|error| format!("invalid image config JSON: {error}"))?;

    let configs: Vec<(String, Value)> = match &parsed {
        Value::Object(fields) if fields.contains_key("config") || fields.contains_key("rootfs") => {
            vec![("single".to_string(), parsed.clone())]
        }
        Value::Object(fields) => fields
            .iter()
            .map(|(platform, config)| (platform.clone(), config.clone()))
            .collect(),
        _ => return Err("image config is not a JSON object".to_string()),
    };

    if configs.is_empty() {
        return Err("image config contains no platforms".to_string());
    }
    Ok(configs)
}

fn label_value(config: &Value, label: &str) -> Option<String> {
    config
        .get("config")
        .and_then(|inner| inner.get("Labels").or_else(|| inner.get("labels")))
        .and_then(|labels| labels.get(label))
        .and_then(Value::as_str)
        .map(str::to_string)
}

fn verify_image_labels(
    image: &str,
    raw_image: &str,
    expected_commit: &str,
    release_version: &str,
) -> Result<Vec<String>, String> {
    let configs = labels_by_platform(raw_image)?;
    let mut failures = Vec::new();
    let mut checked = Vec::new();

    for (platform, config) in &configs {
        match label_value(config, REVISION_LABEL) {
            Some(revision) if revision == expected_commit => {}
            Some(revision) => failures.push(format!(
                "{image} ({platform}) has {REVISION_LABEL}={revision}, expected {expected_commit}"
            )),
            None => failures.push(format!("{image} ({platform}) has no {REVISION_LABEL} label")),
        }
        match label_value(config, VERSION_LABEL) {
            Some(version) if version == release_version => {}
            Some(version) => failures.push(format!(
                "{image} ({platform}) has {VERSION_LABEL}={version}, expected {release_version}"
            )),
            None => failures.push(format!("{image} ({platform}) has no {VERSION_LABEL} label")),
        }
        checked.push(platform.clone());
    }

    // A manifest list must carry every runnable platform; a single-platform response
    // means the published tag lost its multi-arch index.
    if checked.iter().any(|platform| platform == "single") {
        failures.push(format!("{image} is not a multi-platform manifest list"));
    } else {
        let present: BTreeSet<&str> = checked.iter().map(String::as_str).collect();
        for required in REQUIRED_PLATFORMS {
            if !present.contains(required) {
                failures.push(format!("{image} is missing platform {required}"));
            }
        }
    }

    if failures.is_empty() {
        Ok(checked)
    } else {
        Err(failures.join("\n"))
    }
}

/// Checksum files must reference the assets by the name a consumer actually gets from
/// `gh release download`, which is flat. A `dist/` prefix makes `sha256sum -c` fail with
/// "No such file or directory" even though the digests are correct.
fn verify_checksum_paths(file_name: &str, contents: &str) -> Result<Vec<String>, String> {
    let mut names = Vec::new();
    let mut failures = Vec::new();
    for line in contents.lines().filter(|line| !line.trim().is_empty()) {
        let path = match line.split_once("  ") {
            Some((digest, path)) if digest.len() == 64 => path.trim(),
            _ => {
                failures.push(format!("{file_name}: unparsable checksum line: {line}"));
                continue;
            }
        };
        if path.contains('/') || path.contains('\\') {
            failures.push(format!(
                "{file_name}: checksum entry must use the published flat file name, found {path}"
            ));
            continue;
        }
        names.push(path.to_string());
    }

    if names.is_empty() && failures.is_empty() {
        failures.push(format!("{file_name}: contains no checksum entries"));
    }

    if failures.is_empty() {
        Ok(names)
    } else {
        Err(failures.join("\n"))
    }
}

/// `gh attestation verify --format json` nests the resolved source commit inside the
/// SLSA build definition. The exact path moved between predicate versions, so collect
/// every `gitCommit` digest the document carries instead of hard-coding one path.
fn git_commits_in_attestation(raw_json: &str) -> Result<BTreeSet<String>, String> {
    let parsed: Value = serde_json::from_str(raw_json)
        .map_err(|error| format!("invalid attestation JSON: {error}"))?;
    let mut commits = BTreeSet::new();
    collect_git_commits(&parsed, &mut commits);
    Ok(commits)
}

fn collect_git_commits(value: &Value, commits: &mut BTreeSet<String>) {
    match value {
        Value::Object(fields) => {
            for (key, child) in fields {
                if key == "gitCommit" {
                    if let Some(commit) = child.as_str() {
                        commits.insert(commit.to_string());
                    }
                }
                collect_git_commits(child, commits);
            }
        }
        Value::Array(items) => items
            .iter()
            .for_each(|item| collect_git_commits(item, commits)),
        _ => {}
    }
}

fn run(command: &mut Command, description: &str) -> Result<String, String> {
    let output = command
        .output()
        .map_err(|error| format!("failed to run {description}: {error}"))?;
    if !output.status.success() {
        return Err(format!(
            "{description} failed: {}",
            String::from_utf8_lossy(&output.stderr).trim()
        ));
    }
    String::from_utf8(output.stdout)
        .map_err(|error| format!("{description} returned non-UTF-8 output: {error}"))
}

fn resolve_tag_commit(release_version: &str) -> Result<String, String> {
    // `^{commit}` peels annotated tags, which point at a tag object rather than a commit.
    let reference = format!("refs/tags/v{release_version}^{{commit}}");
    let commit = run(
        Command::new("git").args(["rev-parse", &reference]),
        &format!("git rev-parse {reference}"),
    )?;
    let commit = commit.trim().to_string();
    if is_commit_sha(&commit) {
        Ok(commit)
    } else {
        Err(format!("{reference} did not resolve to a commit: {commit}"))
    }
}

fn inspect_image_config(image: &str) -> Result<String, String> {
    run(
        Command::new("docker").args([
            "buildx",
            "imagetools",
            "inspect",
            image,
            "--format",
            "{{json .Image}}",
        ]),
        &format!("docker buildx imagetools inspect {image}"),
    )
}

fn attestation_json(artifact: &Path, repository: &str) -> Result<String, String> {
    run(
        Command::new("gh").args([
            "attestation",
            "verify",
            &artifact.to_string_lossy(),
            "--repo",
            repository,
            "--format",
            "json",
        ]),
        &format!("gh attestation verify {}", artifact.display()),
    )
}

fn sorted_dir_entries(directory: &str) -> Result<Vec<std::path::PathBuf>, String> {
    let mut entries: Vec<_> = fs::read_dir(directory)
        .map_err(|error| format!("failed to read {directory}: {error}"))?
        .filter_map(Result::ok)
        .map(|entry| entry.path())
        .collect();
    entries.sort();
    Ok(entries)
}

fn main() {
    let arguments: Vec<String> = env::args().skip(1).collect();
    let options = match parse_arguments(&arguments) {
        Ok(options) => options,
        Err(error) => {
            eprintln!("Error: {error}");
            eprintln!(
                "Usage: check-release-provenance.rs --release-version <version> \
                 [--expected-commit <sha>] [--repository <owner/name>] \
                 [--image <reference>]... [--asset-dir <directory>]"
            );
            process::exit(2);
        }
    };

    let mut failures: Vec<String> = Vec::new();

    let expected_commit = match &options.expected_commit {
        Some(commit) => {
            // Even when the caller supplies the commit, re-resolve the annotated tag when a
            // checkout is available so the guard cannot be fooled by a stale workflow output.
            if let Ok(resolved) = resolve_tag_commit(&options.release_version) {
                if &resolved != commit {
                    failures.push(format!(
                        "v{} resolves to {resolved}, but the release run reported {commit}",
                        options.release_version
                    ));
                }
            }
            commit.clone()
        }
        None => match resolve_tag_commit(&options.release_version) {
            Ok(commit) => commit,
            Err(error) => {
                eprintln!("Error: {error}");
                process::exit(1);
            }
        },
    };

    println!(
        "Release v{} must be built from {expected_commit}",
        options.release_version
    );

    for image in &options.images {
        match inspect_image_config(image).and_then(|raw| {
            verify_image_labels(image, &raw, &expected_commit, &options.release_version)
        }) {
            Ok(platforms) => println!("Verified {image} ({})", platforms.join(", ")),
            Err(error) => failures.push(error),
        }
    }

    for directory in &options.asset_dirs {
        let entries = match sorted_dir_entries(directory) {
            Ok(entries) => entries,
            Err(error) => {
                failures.push(error);
                continue;
            }
        };

        for path in &entries {
            let file_name = path
                .file_name()
                .map(|name| name.to_string_lossy().to_string())
                .unwrap_or_default();

            if file_name.ends_with(".sha256") {
                match fs::read_to_string(path)
                    .map_err(|error| format!("failed to read {file_name}: {error}"))
                    .and_then(|contents| verify_checksum_paths(&file_name, &contents))
                {
                    Ok(names) => println!("Verified {file_name} lists {}", names.join(", ")),
                    Err(error) => failures.push(error),
                }
                continue;
            }

            if !(file_name.ends_with(".tar.gz") || file_name.ends_with(".cdx.json"))
                || options.skip_attestations
            {
                continue;
            }

            let Some(repository) = options.repository.as_deref() else {
                failures.push(format!(
                    "--repository is required to verify the attestation of {file_name}"
                ));
                continue;
            };

            match attestation_json(path, repository).and_then(|raw| git_commits_in_attestation(&raw))
            {
                Ok(commits) if commits.contains(&expected_commit) => {
                    println!("Verified {file_name} attests {expected_commit}")
                }
                Ok(commits) => failures.push(format!(
                    "{file_name} attests source commit(s) {}, expected {expected_commit}",
                    if commits.is_empty() {
                        "<none>".to_string()
                    } else {
                        commits.into_iter().collect::<Vec<_>>().join(", ")
                    }
                )),
                Err(error) => failures.push(error),
            }
        }
    }

    if failures.is_empty() {
        println!("All published artifacts point at the release tag commit");
    } else {
        for failure in &failures {
            eprintln!("Error: {failure}");
        }
        process::exit(1);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn image_config(revision: &str, version: &str) -> String {
        format!(
            r#"{{
              "linux/amd64": {{"config": {{"Labels": {{"org.opencontainers.image.revision": "{revision}", "org.opencontainers.image.version": "{version}"}}}}}},
              "linux/arm64": {{"config": {{"Labels": {{"org.opencontainers.image.revision": "{revision}", "org.opencontainers.image.version": "{version}"}}}}}}
            }}"#
        )
    }

    const TAG_COMMIT: &str = "c36818b5386486ab74b88740f683076e4015c750";
    const PREVIOUS_MERGE: &str = "5d12735630a9d5168e2472e54367ce59dfa86dcb";

    #[test]
    fn accepts_images_labeled_with_the_tag_commit() {
        let raw = image_config(TAG_COMMIT, "0.77.0");
        let platforms = verify_image_labels("example:0.77.0", &raw, TAG_COMMIT, "0.77.0").unwrap();
        assert_eq!(platforms, vec!["linux/amd64", "linux/arm64"]);
    }

    #[test]
    fn rejects_the_pre_release_merge_commit_recorded_for_v0_77_0() {
        let raw = image_config(PREVIOUS_MERGE, "0.77.0");
        let error =
            verify_image_labels("example:0.77.0", &raw, TAG_COMMIT, "0.77.0").unwrap_err();
        assert!(error.contains(PREVIOUS_MERGE), "{error}");
        assert!(error.contains(TAG_COMMIT), "{error}");
    }

    #[test]
    fn rejects_images_without_a_revision_label() {
        let raw = r#"{"linux/amd64": {"config": {"Labels": {}}}, "linux/arm64": {"config": {"Labels": {}}}}"#;
        let error = verify_image_labels("example:0.77.0", raw, TAG_COMMIT, "0.77.0").unwrap_err();
        assert!(error.contains("no org.opencontainers.image.revision label"), "{error}");
    }

    #[test]
    fn rejects_a_version_label_that_disagrees_with_the_release() {
        let raw = image_config(TAG_COMMIT, "0.76.0");
        let error = verify_image_labels("example:0.77.0", &raw, TAG_COMMIT, "0.77.0").unwrap_err();
        assert!(error.contains("expected 0.77.0"), "{error}");
    }

    #[test]
    fn rejects_a_single_platform_image() {
        let raw = format!(
            r#"{{"config": {{"Labels": {{"org.opencontainers.image.revision": "{TAG_COMMIT}", "org.opencontainers.image.version": "0.77.0"}}}}, "rootfs": {{}}}}"#
        );
        let error = verify_image_labels("example:0.77.0", &raw, TAG_COMMIT, "0.77.0").unwrap_err();
        assert!(error.contains("not a multi-platform manifest list"), "{error}");
    }

    #[test]
    fn rejects_a_manifest_list_missing_arm64() {
        let raw = format!(
            r#"{{"linux/amd64": {{"config": {{"Labels": {{"org.opencontainers.image.revision": "{TAG_COMMIT}", "org.opencontainers.image.version": "0.77.0"}}}}}}}}"#
        );
        let error = verify_image_labels("example:0.77.0", &raw, TAG_COMMIT, "0.77.0").unwrap_err();
        assert!(error.contains("missing platform linux/arm64"), "{error}");
    }

    #[test]
    fn accepts_checksum_files_that_use_flat_names() {
        let contents = format!(
            "{}  link-assistant-router-0.77.0-linux-arm64.tar.gz\n{}  link-assistant-router-0.77.0-linux-arm64.cdx.json\n",
            "a".repeat(64),
            "b".repeat(64)
        );
        let names = verify_checksum_paths("release.sha256", &contents).unwrap();
        assert_eq!(names.len(), 2);
    }

    #[test]
    fn rejects_checksum_files_that_keep_the_dist_prefix() {
        let contents = format!("{}  dist/link-assistant-router-0.77.0-arm64.tar.gz\n", "a".repeat(64));
        let error = verify_checksum_paths("release.sha256", &contents).unwrap_err();
        assert!(error.contains("flat file name"), "{error}");
        assert!(error.contains("dist/"), "{error}");
    }

    #[test]
    fn rejects_empty_checksum_files() {
        let error = verify_checksum_paths("release.sha256", "\n").unwrap_err();
        assert!(error.contains("no checksum entries"), "{error}");
    }

    #[test]
    fn finds_the_source_commit_in_a_slsa_attestation() {
        let raw = format!(
            r#"[{{"verificationResult": {{"statement": {{"predicate": {{"buildDefinition": {{
              "resolvedDependencies": [{{"uri": "git+https://github.com/link-assistant/router@refs/tags/v0.77.0", "digest": {{"gitCommit": "{TAG_COMMIT}"}}}}]
            }}}}}}}}}}]"#
        );
        let commits = git_commits_in_attestation(&raw).unwrap();
        assert!(commits.contains(TAG_COMMIT));
    }

    #[test]
    fn reports_attestations_without_any_source_commit() {
        let commits = git_commits_in_attestation(r#"[{"verificationResult": {}}]"#).unwrap();
        assert!(commits.is_empty());
    }

    #[test]
    fn parses_repeated_image_and_asset_arguments() {
        let arguments: Vec<String> = [
            "--release-version",
            "0.77.0",
            "--expected-commit",
            TAG_COMMIT,
            "--image",
            "ghcr.io/link-assistant/router:0.77.0",
            "--image",
            "konard/link-assistant-router:0.77.0",
            "--asset-dir",
            "dist",
        ]
        .iter()
        .map(|value| value.to_string())
        .collect();
        let options = parse_arguments(&arguments).unwrap();
        assert_eq!(options.images.len(), 2);
        assert_eq!(options.asset_dirs, vec!["dist".to_string()]);
        assert_eq!(options.expected_commit.as_deref(), Some(TAG_COMMIT));
    }

    #[test]
    fn rejects_a_short_expected_commit() {
        let arguments: Vec<String> = ["--release-version", "0.77.0", "--expected-commit", "c36818b"]
            .iter()
            .map(|value| value.to_string())
            .collect();
        let error = parse_arguments(&arguments).unwrap_err();
        assert!(error.contains("full commit SHA"), "{error}");
    }
}
