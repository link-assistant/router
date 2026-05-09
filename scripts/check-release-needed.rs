#!/usr/bin/env rust-script
//! Check if a release is needed based on changelog fragments and version state
//!
//! This script checks:
//! 1. If there are changelog fragments to process
//! 2. If the current version has already been published to crates.io
//! 3. If the matching Docker Hub image tag and GitHub release exist
//!
//! IMPORTANT: This script checks external release artifacts, NOT git tags.
//! This is critical because:
//! - Git tags can exist without the package being published
//! - GitHub releases create tags but do not publish to crates.io or Docker Hub
//! - A crates.io publish can succeed while later Docker/GitHub release steps fail
//!
//! Supports both single-language and multi-language repository structures:
//! - Single-language: Cargo.toml in repository root
//! - Multi-language: Cargo.toml in rust/ subfolder
//!
//! Usage: rust-script scripts/check-release-needed.rs [--rust-root <path>]
//!
//! Environment variables:
//!   - HAS_FRAGMENTS: 'true' if changelog fragments exist (from get-bump-type.rs)
//!   - DOCKERHUB_IMAGE: Docker Hub image name to verify (default: konard/link-assistant-router)
//!   - GITHUB_REPOSITORY: GitHub repository to verify (for example: link-assistant/router)
//!
//! Outputs (written to GITHUB_OUTPUT):
//!   - should_release: 'true' if a release should be created
//!   - skip_bump: 'true' if version bump should be skipped (version not yet released)
//!
//! ```cargo
//! [dependencies]
//! regex = "1"
//! ureq = "2"
//! serde = { version = "1", features = ["derive"] }
//! serde_json = "1"
//! ```

use regex::Regex;
use serde::Deserialize;
use std::env;
use std::fs;
use std::path::Path;
use std::process::exit;

fn get_arg(name: &str) -> Option<String> {
    let args: Vec<String> = env::args().collect();
    let flag = format!("--{}", name);

    if let Some(idx) = args.iter().position(|a| a == &flag) {
        return args.get(idx + 1).cloned();
    }

    let env_name = name.to_uppercase().replace('-', "_");
    env::var(&env_name).ok().filter(|s| !s.is_empty())
}

fn get_rust_root() -> String {
    if let Some(root) = get_arg("rust-root") {
        eprintln!("Using explicitly configured Rust root: {}", root);
        return root;
    }

    if Path::new("./Cargo.toml").exists() {
        eprintln!("Detected single-language repository (Cargo.toml in root)");
        return ".".to_string();
    }

    if Path::new("./rust/Cargo.toml").exists() {
        eprintln!("Detected multi-language repository (Cargo.toml in rust/)");
        return "rust".to_string();
    }

    eprintln!("Error: Could not find Cargo.toml in expected locations");
    exit(1);
}

fn get_cargo_toml_path(rust_root: &str) -> String {
    if rust_root == "." {
        "./Cargo.toml".to_string()
    } else {
        format!("{}/Cargo.toml", rust_root)
    }
}

fn get_dockerhub_image() -> String {
    get_arg("dockerhub-image")
        .or_else(|| get_arg("docker-hub-image"))
        .unwrap_or_else(|| "konard/link-assistant-router".to_string())
}

fn get_github_repository() -> Option<String> {
    get_arg("repository").or_else(|| env::var("GITHUB_REPOSITORY").ok().filter(|s| !s.is_empty()))
}

fn set_output(key: &str, value: &str) {
    if let Ok(output_file) = env::var("GITHUB_OUTPUT") {
        if let Err(e) = fs::OpenOptions::new()
            .create(true)
            .append(true)
            .open(&output_file)
            .and_then(|mut f| {
                use std::io::Write;
                writeln!(f, "{}={}", key, value)
            })
        {
            eprintln!("Warning: Could not write to GITHUB_OUTPUT: {}", e);
        }
    }
    println!("Output: {}={}", key, value);
}

fn get_current_version(cargo_toml_path: &str) -> Result<String, String> {
    let content = fs::read_to_string(cargo_toml_path)
        .map_err(|e| format!("Failed to read {}: {}", cargo_toml_path, e))?;

    let re = Regex::new(r#"(?m)^version\s*=\s*"([^"]+)""#).unwrap();

    if let Some(caps) = re.captures(&content) {
        Ok(caps.get(1).unwrap().as_str().to_string())
    } else {
        Err(format!("Could not find version in {}", cargo_toml_path))
    }
}

fn get_crate_name(cargo_toml_path: &str) -> Result<String, String> {
    let content = fs::read_to_string(cargo_toml_path)
        .map_err(|e| format!("Failed to read {}: {}", cargo_toml_path, e))?;

    let re = Regex::new(r#"(?m)^name\s*=\s*"([^"]+)""#).unwrap();

    if let Some(caps) = re.captures(&content) {
        Ok(caps.get(1).unwrap().as_str().to_string())
    } else {
        Err(format!("Could not find name in {}", cargo_toml_path))
    }
}

#[derive(Deserialize)]
struct CratesIoVersion {
    version: Option<CratesIoVersionInfo>,
}

#[derive(Deserialize)]
struct CratesIoVersionInfo {
    #[allow(dead_code)]
    num: String,
}

fn check_version_on_crates_io(crate_name: &str, version: &str) -> bool {
    let url = format!("https://crates.io/api/v1/crates/{}/{}", crate_name, version);

    match ureq::get(&url)
        .set("User-Agent", "rust-script-check-release")
        .call()
    {
        Ok(response) => {
            if response.status() == 200 {
                // Version exists on crates.io
                if let Ok(body) = response.into_string() {
                    if let Ok(data) = serde_json::from_str::<CratesIoVersion>(&body) {
                        return data.version.is_some();
                    }
                }
            }
            false
        }
        Err(ureq::Error::Status(404, _)) => {
            // Version doesn't exist on crates.io
            false
        }
        Err(e) => {
            eprintln!("Warning: Could not check crates.io: {}", e);
            // On error, assume not published (safer than incorrectly skipping)
            false
        }
    }
}

fn split_docker_image(image: &str) -> Option<(&str, &str)> {
    let mut parts = image.split('/');
    let namespace = parts.next()?;
    let repository = parts.next()?;
    if parts.next().is_some() || namespace.is_empty() || repository.is_empty() {
        None
    } else {
        Some((namespace, repository))
    }
}

fn check_docker_hub_tag(image: &str, version: &str) -> bool {
    let Some((namespace, repository)) = split_docker_image(image) else {
        eprintln!(
            "Warning: Could not parse Docker Hub image '{}'; expected namespace/repository",
            image
        );
        return false;
    };

    let url = format!(
        "https://hub.docker.com/v2/repositories/{}/{}/tags/{}",
        namespace, repository, version
    );

    match ureq::get(&url)
        .set("User-Agent", "rust-script-check-release")
        .call()
    {
        Ok(response) => response.status() == 200,
        Err(ureq::Error::Status(404, _)) => false,
        Err(e) => {
            eprintln!("Warning: Could not check Docker Hub tag: {}", e);
            false
        }
    }
}

fn check_github_release(repository: &str, version: &str) -> bool {
    let url = format!(
        "https://api.github.com/repos/{}/releases/tags/v{}",
        repository, version
    );

    let mut request = ureq::get(&url)
        .set("User-Agent", "rust-script-check-release")
        .set("Accept", "application/vnd.github+json");

    if let Ok(token) = env::var("GITHUB_TOKEN") {
        if !token.is_empty() {
            let auth_header = format!("Bearer {}", token);
            request = request.set("Authorization", &auth_header);
        }
    }

    match request.call() {
        Ok(response) => response.status() == 200,
        Err(ureq::Error::Status(404, _)) => false,
        Err(e) => {
            eprintln!("Warning: Could not check GitHub release: {}", e);
            false
        }
    }
}

fn main() {
    let rust_root = get_rust_root();
    let cargo_toml = get_cargo_toml_path(&rust_root);

    let has_fragments = env::var("HAS_FRAGMENTS")
        .map(|v| v == "true")
        .unwrap_or(false);

    if !has_fragments {
        // No fragments - check if current version is published on crates.io
        let crate_name = match get_crate_name(&cargo_toml) {
            Ok(name) => name,
            Err(e) => {
                eprintln!("Error: {}", e);
                exit(1);
            }
        };

        let current_version = match get_current_version(&cargo_toml) {
            Ok(version) => version,
            Err(e) => {
                eprintln!("Error: {}", e);
                exit(1);
            }
        };

        let is_published = check_version_on_crates_io(&crate_name, &current_version);
        let dockerhub_image = get_dockerhub_image();
        let docker_published = check_docker_hub_tag(&dockerhub_image, &current_version);
        let github_release_published = get_github_repository()
            .map(|repository| check_github_release(&repository, &current_version))
            .unwrap_or_else(|| {
                eprintln!("Warning: GITHUB_REPOSITORY not set; assuming GitHub release is missing");
                false
            });

        println!(
            "Crate: {}, Version: {}, Published on crates.io: {}",
            crate_name, current_version, is_published
        );
        println!(
            "Docker image: {}, Tag published on Docker Hub: {}",
            dockerhub_image, docker_published
        );
        println!(
            "GitHub release v{} published: {}",
            current_version, github_release_published
        );

        if is_published && docker_published && github_release_published {
            println!(
                "No changelog fragments and v{} is fully published",
                current_version
            );
            set_output("should_release", "false");
        } else {
            println!(
                "No changelog fragments but v{} is missing at least one release artifact",
                current_version
            );
            set_output("should_release", "true");
            set_output("skip_bump", "true");
        }
    } else {
        println!("Found changelog fragments, proceeding with release");
        set_output("should_release", "true");
        set_output("skip_bump", "false");
    }
}
