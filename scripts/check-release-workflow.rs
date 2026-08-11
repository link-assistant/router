#!/usr/bin/env rust-script
//! Validate release workflow publishing invariants.

use std::fs;
use std::process::exit;

fn main() {
    let workflow = fs::read_to_string(".github/workflows/release.yml")
        .expect("failed to read .github/workflows/release.yml");

    let required_snippets = [
        "auto-release:",
        "manual-release:",
        "packages: write",
        "CARGO_REGISTRY_TOKEN: ${{ secrets.CARGO_REGISTRY_TOKEN || secrets.CARGO_TOKEN }}",
        "DOCKERHUB_IMAGE: konard/link-assistant-router",
        "rust-script scripts/wait-for-crate.rs",
        "docker/login-action@v4",
        "docker/setup-qemu-action@v4",
        "docker/setup-buildx-action@v4",
        "docker/metadata-action@v6",
        "docker/build-push-action@v7",
        "platforms: linux/amd64,linux/arm64",
        "rust-script scripts/check-docker-platforms.rs",
        "username: konard",
        "password: ${{ secrets.DOCKERHUB_TOKEN }}",
        "ghcr.io/${{ github.repository }}",
        "${{ env.DOCKERHUB_IMAGE }}",
        "type=raw,value=latest",
        "type=raw,value=${{ steps.current_version.outputs.version }}",
        "type=raw,value=${{ steps.version.outputs.new_version }}",
        "org.opencontainers.image.version=${{ steps.current_version.outputs.version }}",
        "org.opencontainers.image.version=${{ steps.version.outputs.new_version }}",
        "--crates-io-url \"https://crates.io/crates/link-assistant-router\"",
        "--docker-hub-url \"https://hub.docker.com/r/konard/link-assistant-router\"",
    ];

    let mut failures = Vec::new();
    for snippet in required_snippets {
        if !workflow.contains(snippet) {
            failures.push(format!(
                "missing required release workflow snippet: {snippet}"
            ));
        }
    }

    if count_occurrences(&workflow, "packages: write") < 2 {
        failures.push("auto and manual release jobs must both grant packages: write".to_string());
    }

    if count_occurrences(&workflow, "docker/login-action@v4") < 4 {
        failures.push(
            "auto and manual release jobs must both log in to GHCR and Docker Hub".to_string(),
        );
    }

    if count_occurrences(&workflow, "docker/build-push-action@v7") < 2 {
        failures.push("auto and manual release jobs must both publish Docker images".to_string());
    }

    if count_occurrences(&workflow, "docker/setup-qemu-action@v4") < 2 {
        failures.push(
            "auto and manual release jobs must both enable cross-platform emulation".to_string(),
        );
    }

    if count_occurrences(&workflow, "platforms: linux/amd64,linux/arm64") < 4 {
        failures.push(
            "auto and manual release jobs must publish both image variants for amd64 and arm64"
                .to_string(),
        );
    }

    if count_occurrences(
        &workflow,
        "rust-script scripts/check-docker-platforms.rs",
    ) < 2
    {
        failures.push(
            "auto and manual release jobs must verify published multi-platform manifests"
                .to_string(),
        );
    }

    if count_occurrences(
        &workflow,
        "CARGO_REGISTRY_TOKEN: ${{ secrets.CARGO_REGISTRY_TOKEN || secrets.CARGO_TOKEN }}",
    ) < 3
    {
        failures.push(
            "workflow must map both CARGO_REGISTRY_TOKEN and CARGO_TOKEN secrets to Cargo's native CARGO_REGISTRY_TOKEN env var"
                .to_string(),
        );
    }

    if count_occurrences(
        &workflow,
        "--crates-io-url \"https://crates.io/crates/link-assistant-router\"",
    ) < 2
    {
        failures.push(
            "auto and manual GitHub releases must include the crates.io release badge/link"
                .to_string(),
        );
    }

    if count_occurrences(
        &workflow,
        "--docker-hub-url \"https://hub.docker.com/r/konard/link-assistant-router\"",
    ) < 2
    {
        failures.push(
            "auto and manual GitHub releases must include the Docker Hub release badge/link"
                .to_string(),
        );
    }

    if failures.is_empty() {
        println!(
            "release workflow publishes crates and verified multi-platform GHCR/Docker Hub images"
        );
    } else {
        for failure in failures {
            eprintln!("Error: {failure}");
        }
        exit(1);
    }
}

fn count_occurrences(haystack: &str, needle: &str) -> usize {
    haystack.match_indices(needle).count()
}
