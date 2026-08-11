#!/usr/bin/env rust-script
//! Verify that published Docker image indexes contain every supported runtime platform.
//!
//! Usage: rust-script scripts/check-docker-platforms.rs <image> [<image> ...]
//!
//! ```cargo
//! [dependencies]
//! serde_json = "1"
//! ```

use serde_json::Value;
use std::collections::BTreeSet;
use std::env;
use std::process::{self, Command};

const REQUIRED_PLATFORMS: [&str; 2] = ["linux/amd64", "linux/arm64"];
const ATTESTATION_PLATFORM: &str = "unknown/unknown";

fn platforms_from_index(raw_manifest: &str) -> Result<BTreeSet<String>, String> {
    let index: Value = serde_json::from_str(raw_manifest)
        .map_err(|error| format!("invalid image manifest JSON: {error}"))?;
    let manifests = index
        .get("manifests")
        .and_then(Value::as_array)
        .ok_or_else(|| "image is not a multi-platform manifest list".to_string())?;

    let platforms = manifests
        .iter()
        .filter_map(|manifest| {
            let platform = manifest.get("platform")?;
            let os = platform.get("os")?.as_str()?;
            let architecture = platform.get("architecture")?.as_str()?;
            Some(format!("{os}/{architecture}"))
        })
        // BuildKit publishes provenance attestations as unknown/unknown entries.
        // They are expected metadata, not runnable architectures.
        .filter(|platform| platform != ATTESTATION_PLATFORM)
        .collect();

    Ok(platforms)
}

fn verify_index(image: &str, raw_manifest: &str) -> Result<(), String> {
    let platforms = platforms_from_index(raw_manifest)?;
    let missing: Vec<_> = REQUIRED_PLATFORMS
        .iter()
        .filter(|required| !platforms.contains(**required))
        .copied()
        .collect();

    if missing.is_empty() {
        println!(
            "Verified {image}: {}",
            REQUIRED_PLATFORMS.join(", ")
        );
        Ok(())
    } else {
        Err(format!(
            "{image} is missing runnable platform(s): {}; found: {}",
            missing.join(", "),
            platforms.into_iter().collect::<Vec<_>>().join(", ")
        ))
    }
}

fn inspect_image(image: &str) -> Result<String, String> {
    let output = Command::new("docker")
        .args(["buildx", "imagetools", "inspect", image, "--raw"])
        .output()
        .map_err(|error| format!("failed to run docker for {image}: {error}"))?;

    if !output.status.success() {
        return Err(format!(
            "failed to inspect {image}: {}",
            String::from_utf8_lossy(&output.stderr).trim()
        ));
    }

    String::from_utf8(output.stdout)
        .map_err(|error| format!("docker returned non-UTF-8 manifest data for {image}: {error}"))
}

fn main() {
    let images: Vec<_> = env::args().skip(1).collect();
    if images.is_empty() {
        eprintln!("Usage: check-docker-platforms.rs <image> [<image> ...]");
        process::exit(2);
    }

    let mut failed = false;
    for image in images {
        let result = inspect_image(&image).and_then(|manifest| verify_index(&image, &manifest));
        if let Err(error) = result {
            eprintln!("Error: {error}");
            failed = true;
        }
    }

    if failed {
        process::exit(1);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const MULTI_ARCH_INDEX: &str = r#"{
      "manifests": [
        {"platform": {"os": "linux", "architecture": "amd64"}},
        {"platform": {"os": "linux", "architecture": "arm64", "variant": "v8"}},
        {"platform": {"os": "unknown", "architecture": "unknown"}}
      ]
    }"#;

    #[test]
    fn accepts_required_platforms_and_ignores_attestations() {
        assert!(verify_index("example/image:tag", MULTI_ARCH_INDEX).is_ok());
    }

    #[test]
    fn rejects_an_index_without_arm64() {
        let manifest = r#"{
          "manifests": [
            {"platform": {"os": "linux", "architecture": "amd64"}},
            {"platform": {"os": "unknown", "architecture": "unknown"}}
          ]
        }"#;

        let error = verify_index("example/image:tag", manifest).unwrap_err();
        assert!(error.contains("linux/arm64"));
        assert!(!error.contains("missing runnable platform(s): unknown/unknown"));
    }

    #[test]
    fn rejects_a_single_platform_manifest() {
        let manifest = r#"{"config": {"digest": "sha256:abc"}}"#;
        let error = verify_index("example/image:tag", manifest).unwrap_err();
        assert!(error.contains("not a multi-platform manifest list"));
    }
}
