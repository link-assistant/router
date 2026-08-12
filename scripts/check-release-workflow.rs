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
        "floating_tag: latest",
        "floating_tag: with-claude-cli",
        "type=raw,value=${{ matrix.floating_tag }}",
        "type=raw,value=${{ env.RELEASE_VERSION }}${{ matrix.version_suffix }}",
        "org.opencontainers.image.version=${{ env.RELEASE_VERSION }}",
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

    if count_occurrences(&workflow, "packages: write") < 1 {
        failures.push("Docker publishing must grant packages: write".to_string());
    }

    if count_occurrences(&workflow, "docker/login-action@v4") < 2 {
        failures.push("Docker publishing must log in to GHCR and Docker Hub".to_string());
    }

    if count_occurrences(&workflow, "docker/build-push-action@v7") < 1 {
        failures.push("Docker publishing must build and push each image variant".to_string());
    }

    if count_occurrences(&workflow, "docker/setup-qemu-action@v4") < 1 {
        failures.push("Docker publishing must enable cross-platform emulation".to_string());
    }

    if count_occurrences(&workflow, "platforms: linux/amd64,linux/arm64") < 1 {
        failures.push(
            "Docker publishing must publish every image variant for amd64 and arm64".to_string(),
        );
    }

    if count_occurrences(
        &workflow,
        "rust-script scripts/check-docker-platforms.rs",
    ) < 1
    {
        failures.push("Docker publishing must verify multi-platform manifests".to_string());
    }

    if !workflow.contains("cache-from: |") || !workflow.contains("cache-to: type=gha") {
        failures.push("Docker publishing must use a persistent BuildKit cache".to_string());
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
