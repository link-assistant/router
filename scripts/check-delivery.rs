#!/usr/bin/env rust-script
//! Check delivery of an exact merged source, independently of PR checks.
//! Read-only: never dispatches a release or mutates a tag/artifact.
//! ```cargo
//! [dependencies]
//! serde_json = "1"
//! tempfile = "3"
//! tracing = "0.1"
//! [target.'cfg(windows)'.dependencies]
//! process-wrap = { version = "10.0.1", default-features = false, features = ["std", "job-object"] }
//! ```

#[path = "../src/bounded_process.rs"]
mod bounded_process;
#[path = "release-status.rs"]
mod release_status;

use serde_json::{Value, json};
use std::process::Command;
use std::time::Duration;

fn command(program: &str, args: &[&str]) -> Result<String, String> {
    let output = bounded_process::output(Command::new(program).args(args), Duration::from_secs(60))
        .map_err(|error| format!("{program} diagnostic failed: {error}"))?;
    if !output.status.success() {
        return Err(format!(
            "{program} diagnostic failed; inspect saved delivery logs"
        ));
    }
    Ok(String::from_utf8_lossy(&output.stdout).trim().into())
}

fn state(
    workflow_enabled: bool,
    runs: &[Value],
    tag: bool,
    release: bool,
    artifacts_verified: bool,
) -> (&'static str, &'static str) {
    if artifacts_verified && tag && release {
        return (
            "delivered",
            "source ancestry, version and artifacts verified",
        );
    }
    if tag || release {
        return (
            "partial-publication",
            "release identity exists but complete artifact provenance is not verified",
        );
    }
    if !workflow_enabled {
        return ("merged", "release workflow is disabled or unavailable");
    }
    if runs.is_empty() {
        return (
            "merged",
            "no main delivery run exists for this exact source revision",
        );
    }
    if runs.iter().any(|run| run["conclusion"] == "success") {
        return (
            "validated-candidate",
            "CI succeeded; no verified publication contains this source",
        );
    }
    (
        "merged",
        "delivery validation is pending or failed; PR success is not delivery",
    )
}

fn required_assets(version: &str) -> Vec<String> {
    ["linux-amd64", "linux-arm64", "darwin-amd64", "darwin-arm64"]
        .into_iter()
        .flat_map(|platform| {
            ["tar.gz", "cdx.json", "sha256"]
                .into_iter()
                .map(move |extension| {
                    format!("link-assistant-router-{version}-{platform}.{extension}")
                })
        })
        .chain([
            format!("link-assistant-router-{version}.tgz"),
            format!("link_assistant_router-{version}-py3-none-any.whl"),
            format!("link_assistant_router-{version}.tar.gz"),
            format!("router-contracts-{version}.tar.gz"),
            format!("router-integrations-{version}.sha256"),
        ])
        .collect()
}

fn complete_assets(assets: &[Value], version: &str) -> Result<(), String> {
    let names: std::collections::BTreeSet<_> = assets
        .iter()
        .filter_map(|asset| asset["name"].as_str())
        .collect();
    for name in required_assets(version) {
        if !names.contains(name.as_str()) {
            return Err(format!("required platform artifact missing: {name}"));
        }
    }
    Ok(())
}

fn validate_downloads(directory: &std::path::Path, version: &str) -> Result<Value, String> {
    let mut digests = serde_json::Map::new();
    for name in required_assets(version) {
        let path = directory.join(&name);
        let path = path.to_str().ok_or("non UTF-8 asset path")?;
        let digest = command("sha256sum", &[path])?
            .split_whitespace()
            .next()
            .ok_or("asset digest missing")?
            .to_owned();
        digests.insert(name.clone(), json!(digest));
        if name.ends_with(".sha256") {
            let mut check = Command::new("sha256sum");
            check.args(["-c", path]).current_dir(directory);
            let output = bounded_process::output(&mut check, Duration::from_secs(30))
                .map_err(|error| error.to_string())?;
            if !output.status.success() {
                return Err("published checksum verification failed".into());
            }
        }
        if name.starts_with("link-assistant-router-") && name.ends_with(".tar.gz") {
            let names = command("tar", &["-tzf", path])?;
            for binary in ["router", "link-assistant-router", "with-router"] {
                if !names
                    .lines()
                    .any(|name| name.trim_start_matches("./") == binary)
                {
                    return Err(format!("archive is missing {binary}"));
                }
            }
        }
    }
    Ok(json!(digests))
}

fn verify_native_versions(
    directory: &std::path::Path,
    version: &str,
    commit: &str,
) -> Result<(), String> {
    let platform = match (std::env::consts::OS, std::env::consts::ARCH) {
        ("linux", "x86_64") => "linux-amd64",
        ("linux", "aarch64") => "linux-arm64",
        ("macos", "x86_64") => "darwin-amd64",
        ("macos", "aarch64") => "darwin-arm64",
        _ => return Err("native binary version verification unavailable on this platform".into()),
    };
    let extracted = tempfile::tempdir().map_err(|error| error.to_string())?;
    let archive = directory.join(format!("link-assistant-router-{version}-{platform}.tar.gz"));
    command(
        "tar",
        &[
            "-xzf",
            archive.to_str().ok_or("archive path")?,
            "-C",
            extracted.path().to_str().ok_or("extract path")?,
            "./router",
            "./link-assistant-router",
            "./with-router",
        ],
    )?;
    for binary in ["router", "link-assistant-router", "with-router"] {
        let path = extracted.path().join(binary);
        if !std::fs::symlink_metadata(&path)
            .map_err(|error| error.to_string())?
            .file_type()
            .is_file()
        {
            return Err("published native binary is not a regular file".into());
        }
        let actual = command(path.to_str().ok_or("binary path")?, &["--version"])?;
        if !actual.split_whitespace().any(|part| part == version) {
            return Err("published native binary version differs from release identity".into());
        }
        if binary != "with-router" {
            let response: Value = serde_json::from_str(&command(
                path.to_str().ok_or("binary path")?,
                &["version", "--json"],
            )?)
            .map_err(|_| "published binary version contract invalid")?;
            if response["data"]["source_commit"] != commit {
                return Err(
                    "published binary source commit differs from immutable release tag".into(),
                );
            }
        }
    }
    Ok(())
}

fn validate_registry_metadata(
    npm: &Value,
    python: &Value,
    version: &str,
    npm_digest: &str,
    digests: &Value,
) -> Result<(), String> {
    if npm["version"] != version || npm["dist"]["shasum"] != npm_digest {
        return Err(
            "npm distribution version or checksum differs from verified release asset".into(),
        );
    }
    if python["info"]["version"] != version {
        return Err("PyPI version differs from verified release identity".into());
    }
    for name in [
        format!("link_assistant_router-{version}-py3-none-any.whl"),
        format!("link_assistant_router-{version}.tar.gz"),
    ] {
        let file = python["urls"]
            .as_array()
            .and_then(|files| files.iter().find(|file| file["filename"] == name))
            .ok_or_else(|| format!("PyPI distribution missing: {name}"))?;
        if file["digests"]["sha256"] != digests[&name] {
            return Err(format!(
                "PyPI checksum differs from verified release asset: {name}"
            ));
        }
    }
    Ok(())
}

fn verify_registries(
    directory: &std::path::Path,
    version: &str,
    digests: &Value,
) -> Result<(), String> {
    let npm: Value = serde_json::from_str(&command(
        "curl",
        &[
            "-fsSL",
            &format!("https://registry.npmjs.org/@link-assistant%2Frouter/{version}"),
        ],
    )?)
    .map_err(|_| "npm registry response invalid")?;
    let python: Value = serde_json::from_str(&command(
        "curl",
        &[
            "-fsSL",
            &format!("https://pypi.org/pypi/link-assistant-router/{version}/json"),
        ],
    )?)
    .map_err(|_| "PyPI registry response invalid")?;
    let package = directory.join(format!("link-assistant-router-{version}.tgz"));
    let digest = command("sha1sum", &[package.to_str().ok_or("npm asset path")?])?;
    validate_registry_metadata(
        &npm,
        &python,
        version,
        digest.split_whitespace().next().ok_or("npm digest")?,
        digests,
    )?;
    let crate_metadata: Value = serde_json::from_str(&command(
        "curl",
        &[
            "-fsSL",
            &format!("https://crates.io/api/v1/crates/link-assistant-router/{version}"),
        ],
    )?)
    .map_err(|_| "crate registry response invalid")?;
    if crate_metadata["version"]["num"] != version {
        return Err("crate publication missing or wrong version".into());
    }
    Ok(())
}

fn inspect(repository: &str, source: &str, verify: bool) -> Result<Value, String> {
    command(
        "git",
        &["merge-base", "--is-ancestor", source, "origin/main"],
    )?;
    let workflow: Value = serde_json::from_str(&command(
        "gh",
        &[
            "api",
            &format!("repos/{repository}/actions/workflows/release.yml"),
        ],
    )?)
    .map_err(|error| error.to_string())?;
    let pages = command(
        "gh",
        &[
            "api",
            "--paginate",
            "--slurp",
            &format!(
                "repos/{repository}/actions/workflows/release.yml/runs?head_sha={source}&branch=main&per_page=100"
            ),
        ],
    )?;
    let pages: Vec<Value> = serde_json::from_str(&pages).map_err(|error| error.to_string())?;
    let runs: Vec<Value> = pages.iter().flat_map(|page|page["workflow_runs"].as_array().into_iter().flatten())
        .filter(|run|run["head_sha"] == source && run["event"] != "pull_request")
        .map(|run|json!({"id":run["id"],"head_sha":run["head_sha"],"created_at":run["created_at"],"event":run["event"],"conclusion":run["conclusion"],"url":run["html_url"]})).collect();
    let manifest = command("git", &["show", "origin/main:Cargo.toml"])?;
    let version = manifest
        .lines()
        .find_map(|line| {
            line.strip_prefix("version = \"")
                .and_then(|rest| rest.strip_suffix('"'))
        })
        .ok_or("version missing")?;
    let tag = format!("v{version}");
    let revision = command("git", &["rev-parse", &format!("refs/tags/{tag}^{{}}")]).ok();
    let contains_source = revision.as_ref().is_some_and(|revision| {
        command("git", &["merge-base", "--is-ancestor", source, revision]).is_ok()
    });
    let release = command(
        "gh",
        &["api", &format!("repos/{repository}/releases/tags/{tag}")],
    )
    .ok()
    .and_then(|text| serde_json::from_str::<Value>(&text).ok());
    let release_stable = release
        .as_ref()
        .is_some_and(release_status::is_stable_release);
    let mut artifacts_verified = false;
    let mut artifact_error = None;
    let mut asset_digests = None;
    let mut image_digest = None;
    if verify && contains_source && release.is_some() {
        let directory = tempfile::tempdir().map_err(|error| error.to_string())?;
        let dir = directory.path().to_str().ok_or("asset path is not UTF-8")?;
        let assets = release
            .as_ref()
            .and_then(|release| release["assets"].as_array())
            .ok_or("release asset inventory absent")?;
        let outcome = complete_assets(assets, version).and_then(|()| {
            command("gh", &["release", "download", &tag, "--repo", repository, "--dir", dir])?;
            let image = format!("ghcr.io/{repository}:{version}");
            let raw = command("docker", &["buildx", "imagetools", "inspect", &image, "--format", "{{json .Manifest}}"])?;
            let manifest: Value = serde_json::from_str(&raw).map_err(|_| "immutable image manifest invalid")?;
            let digest = manifest["digest"].as_str().ok_or("immutable image digest missing")?;
            if !digest.starts_with("sha256:") || digest.len() != 71 { return Err("immutable image digest invalid".into()); }
            // All provenance checks resolve this immutable digest, avoiding a
            // tag movement between the report and its verification.
            let immutable = format!("ghcr.io/{repository}@{digest}");
            let mut guard = Command::new("rust-script");
            guard.args(["scripts/check-release-provenance.rs", "--release-version", version,
                "--expected-commit", revision.as_deref().expect("tag"), "--repository", repository,
                "--image", &immutable, "--asset-dir", dir]);
            let output = bounded_process::output(&mut guard, Duration::from_secs(900)).map_err(|error| error.to_string())?;
            if !output.status.success() { return Err("binary/checksum/attestation or image revision/version/platform verification failed".into()); }
            let digests = validate_downloads(directory.path(), version)?;
            verify_native_versions(directory.path(), version, revision.as_deref().expect("tag"))?;
            verify_registries(directory.path(), version, &digests)?;
            asset_digests = Some(digests);
            image_digest = Some(digest.to_owned());
            Ok(())
        });
        artifacts_verified = outcome.is_ok();
        artifact_error = outcome.err();
    }
    let (delivery, reason) = state(
        workflow["state"] == "active",
        &runs,
        contains_source,
        release_stable && contains_source,
        artifacts_verified,
    );
    Ok(
        json!({"schema":"link-assistant-router/delivery/v1","source_revision":source,"version":version,"release_revision":revision,"release_contains_source":contains_source,"release_stable":release_stable,"workflow_state":workflow["state"],"runs":runs,"state":delivery,"reason":reason,"artifacts_verified":artifacts_verified,"artifact_error":artifact_error,"asset_digests":asset_digests,"image_digest":image_digest,"recovery":format!("gh workflow run release.yml --repo {repository} --ref main -f release_mode=recover"),"mutation_performed":false}),
    )
}

fn main() {
    let mut repository =
        std::env::var("GITHUB_REPOSITORY").unwrap_or_else(|_| "link-assistant/router".into());
    let mut source = None;
    let mut verify = false;
    let mut output = "target/verification/delivery.json".to_string();
    let mut args = std::env::args().skip(1);
    while let Some(arg) = args.next() {
        match arg.as_str() {
            "--repository" => repository = args.next().expect("repository"),
            "--source-sha" => source = args.next(),
            "--output" => output = args.next().expect("output"),
            "--verify-artifacts" => verify = true,
            _ => {
                eprintln!(
                    "usage: check-delivery.rs [--repository owner/name] [--source-sha SHA] [--verify-artifacts] [--output PATH]"
                );
                std::process::exit(2);
            }
        }
    }
    let result = source
        .map_or_else(|| command("git", &["rev-parse", "origin/main"]), Ok)
        .and_then(|source| inspect(&repository, &source, verify));
    let report=result.unwrap_or_else(|reason|json!({"schema":"link-assistant-router/delivery/v1","state":"failed","reason":reason,"artifacts_verified":false,"mutation_performed":false}));
    let path = std::path::Path::new(&output);
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).expect("output directory");
    }
    let rendered = serde_json::to_string_pretty(&report).unwrap();
    std::fs::write(path, format!("{rendered}\n")).expect("delivery report");
    println!("{rendered}");
    if report["state"] != "delivered" {
        std::process::exit(1);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn every_platform_binary_and_checksum_is_required() {
        assert!(complete_assets(&[], "1.2.3").is_err());
        let mut assets: Vec<_> = required_assets("1.2.3")
            .into_iter()
            .map(|name| json!({"name":name}))
            .collect();
        assert!(complete_assets(&assets, "1.2.3").is_ok());
        assets.pop();
        assert!(complete_assets(&assets, "1.2.3").is_err());
    }
    #[test]
    fn registries_must_contain_the_exact_verified_distributions() {
        let npm = json!({"version":"1.2.3", "dist":{"shasum":"npm-sha1"}});
        let python = json!({"info":{"version":"1.2.3"}, "urls":[
            {"filename":"link_assistant_router-1.2.3-py3-none-any.whl", "digests":{"sha256":"wheel-sha"}},
            {"filename":"link_assistant_router-1.2.3.tar.gz", "digests":{"sha256":"sdist-sha"}}]});
        let digests = json!({"link_assistant_router-1.2.3-py3-none-any.whl":"wheel-sha", "link_assistant_router-1.2.3.tar.gz":"sdist-sha"});
        assert!(validate_registry_metadata(&npm, &python, "1.2.3", "npm-sha1", &digests).is_ok());
        assert!(validate_registry_metadata(&npm, &python, "1.2.3", "other-sha", &digests).is_err());
        let mut missing = python.clone();
        missing["urls"].as_array_mut().unwrap().pop();
        assert!(validate_registry_metadata(&npm, &missing, "1.2.3", "npm-sha1", &digests).is_err());
        let mut wrong = python;
        wrong["urls"][0]["digests"]["sha256"] = json!("other-wheel");
        assert!(validate_registry_metadata(&npm, &wrong, "1.2.3", "npm-sha1", &digests).is_err());
    }
    #[test]
    fn a_green_pr_or_old_release_cannot_prove_delivery() {
        assert_eq!(state(true, &[], false, false, false).0, "merged");
        assert_eq!(state(false, &[], false, false, false).0, "merged");
        assert_eq!(
            state(
                true,
                &[json!({"conclusion":"failure"})],
                false,
                false,
                false
            )
            .0,
            "merged"
        );
        assert_eq!(
            state(
                true,
                &[json!({"conclusion":"success"})],
                false,
                false,
                false
            )
            .0,
            "validated-candidate"
        );
        assert_eq!(
            state(true, &[], true, false, false).0,
            "partial-publication"
        );
        assert_eq!(state(true, &[], true, true, false).0, "partial-publication");
        assert_eq!(state(true, &[], true, true, true).0, "delivered");
    }
}
