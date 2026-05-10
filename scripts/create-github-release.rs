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

    let tag = format!("{}{}", tag_prefix, version);
    println!("Creating GitHub release for {}...", tag);

    let mut release_notes = get_changelog_for_version(&version);

    // Add package/image badges so release pages visibly show registry status.
    let mut badges = Vec::new();
    if let Some(url) = crates_io_url {
        badges.push(crates_io_badge(&url, &version));
    }
    if let Some(url) = docker_hub_url {
        badges.push(docker_hub_badge(&url, &version));
    }
    if !badges.is_empty() {
        release_notes = format!("{}\n\n{}", badges.join("\n"), release_notes);
    }

    // Create release using GitHub API with JSON input
    let payload = ReleasePayload {
        tag_name: tag.clone(),
        name: format!("{}{}", tag_prefix, version),
        body: release_notes,
    };

    let payload_json = serde_json::to_string(&payload).expect("Failed to serialize payload");

    let mut child = Command::new("gh")
        .args([
            "api",
            &format!("repos/{}/releases", repository),
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
        println!("Created GitHub release: {}", tag);
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        if stderr.contains("already exists") {
            println!("Release {} already exists, skipping", tag);
        } else {
            eprintln!("Error creating release: {}", stderr);
            exit(1);
        }
    }
}
