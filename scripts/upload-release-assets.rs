#!/usr/bin/env rust-script
//! Upload only missing release assets; retries never overwrite published bytes.
//! ```cargo
//! [dependencies]
//! serde_json = "1"
//! [target.'cfg(windows)'.dependencies]
//! process-wrap = { version = "10.0.1", default-features = false, features = ["std", "job-object"] }
//! ```

#[path = "../src/bounded_process.rs"]
mod bounded_process;
use serde_json::Value;
use std::collections::BTreeSet;
use std::process::Command;
use std::time::Duration;

fn missing(local: &BTreeSet<String>, published: &BTreeSet<String>) -> Vec<String> {
    local.difference(published).cloned().collect()
}

fn run(command: &mut Command) -> Result<Vec<u8>, String> {
    let output = bounded_process::output(command, Duration::from_secs(120))
        .map_err(|error| error.to_string())?;
    if !output.status.success() {
        // gh's own stderr names the cause (auth, missing release, rate limit).
        return Err(format!(
            "release asset operation failed ({}); existing bytes were not overwritten: {}",
            output.status,
            String::from_utf8_lossy(&output.stderr).trim()
        ));
    }
    Ok(output.stdout)
}

fn main() {
    let version = std::env::var("RELEASE_VERSION").expect("RELEASE_VERSION");
    let repository = std::env::var("GITHUB_REPOSITORY").expect("GITHUB_REPOSITORY");
    let tag = format!("v{version}");
    let release =
        run(Command::new("gh").args(["api", &format!("repos/{repository}/releases/tags/{tag}")]))
            .expect("release identity");
    let release: Value = serde_json::from_slice(&release).expect("release JSON");
    let published = release["assets"]
        .as_array()
        .expect("assets")
        .iter()
        .map(|asset| asset["name"].as_str().expect("asset name").to_owned())
        .collect();
    let local = std::fs::read_dir("dist")
        .expect("dist")
        .map(|entry| {
            entry
                .expect("asset")
                .file_name()
                .to_string_lossy()
                .into_owned()
        })
        .collect();
    for name in missing(&local, &published) {
        run(Command::new("gh").args([
            "release",
            "upload",
            &tag,
            "--repo",
            &repository,
            &format!("dist/{name}"),
        ]))
        .expect("missing-only asset upload");
    }
    println!(
        "Existing release assets retained; checksum and provenance validation remains required."
    );
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn partial_retries_keep_existing_assets_and_fill_only_missing_names() {
        let local = ["binary".into(), "checksums".into()].into_iter().collect();
        let existing = ["binary".into()].into_iter().collect();
        assert_eq!(missing(&local, &existing), vec!["checksums"]);
        assert!(missing(&local, &local).is_empty());
    }
}
