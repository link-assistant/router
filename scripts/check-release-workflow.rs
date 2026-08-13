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
        "publish-docker-images:",
        "publish-docker-manifests:",
        "packages: write",
        "CARGO_REGISTRY_TOKEN: ${{ secrets.CARGO_REGISTRY_TOKEN || secrets.CARGO_TOKEN }}",
        "DOCKERHUB_IMAGE: konard/link-assistant-router",
        "rust-script scripts/wait-for-crate.rs",
        "docker/login-action@v4",
        "docker/setup-buildx-action@v4",
        "docker/metadata-action@v6",
        "docker/build-push-action@v7",
        "platform: linux/amd64",
        "platform: linux/arm64",
        "runner: ubuntu-24.04-arm",
        "runs-on: ${{ matrix.runner }}",
        "platforms: ${{ matrix.platform }}",
        "push-by-digest=true",
        "cache-from: type=gha",
        "cache-to: type=gha,mode=max",
        "docker buildx imagetools create",
        "rust-script scripts/check-docker-platforms.rs",
        "bash scripts/verify-ghcr-visibility.sh",
        "GHCR_IMAGE: ghcr.io/link-assistant/router",
        "org.opencontainers.image.source=https://github.com/link-assistant/router",
        "username: konard",
        "password: ${{ secrets.DOCKERHUB_TOKEN }}",
        "ghcr.io/${{ github.repository }}",
        "${{ env.DOCKERHUB_IMAGE }}",
        "labels: ${{ steps.docker-meta.outputs.labels }}",
        "needs: [create-github-release]",
        "ref: refs/tags/v${{ env.RELEASE_VERSION }}",
        "--crates-io-url \"https://crates.io/crates/link-assistant-router\"",
        "--docker-hub-url \"https://hub.docker.com/r/konard/link-assistant-router\"",
        "rust-script scripts/check-github-releases.rs --repository \"${{ github.repository }}\" --default-branch main",
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
        failures.push("Docker build and manifest jobs must grant packages: write".to_string());
    }

    if count_occurrences(&workflow, "docker/login-action@v4") < 4 {
        failures.push(
            "Docker build and manifest jobs must both log in to GHCR and Docker Hub".to_string(),
        );
    }

    if count_occurrences(&workflow, "docker/build-push-action@v7") != 1 {
        failures.push("the variant-and-architecture matrix must use one shared build step".to_string());
    }

    if workflow.contains("docker/setup-qemu-action") {
        failures.push("release images must not use QEMU emulation".to_string());
    }

    if count_occurrences(&workflow, "push-by-digest=true") != 1 {
        failures.push(
            "every matrix leg must publish its native image by digest".to_string(),
        );
    }

    if count_occurrences(&workflow, "docker buildx imagetools create") != 2 {
        failures.push(
            "both registries must receive one merged runtime manifest".to_string(),
        );
    }

    if count_occurrences(
        &workflow,
        "rust-script scripts/check-docker-platforms.rs",
    ) != 1
    {
        failures.push(
            "the shared manifest job must verify every published multi-platform image".to_string(),
        );
    }

    if count_occurrences(&workflow, "bash scripts/verify-ghcr-visibility.sh") != 1 {
        failures.push(
            "the shared manifest job must verify anonymous GHCR visibility once".to_string(),
        );
    }

    if workflow.contains("docker-build:")
        || workflow.contains("needs: [lint, test, build, docker-build]")
    {
        failures.push("release publication must not wait for a disposable Docker build".to_string());
    }

    if !workflow.contains("create-github-release:\n    name: Create GitHub Release\n    needs: [auto-release, manual-release]") {
        failures.push("GitHub releases must be created immediately after crate publication".to_string());
    }

    if !workflow.contains("rust-script --test scripts/check-github-releases.rs") {
        failures.push("CI must test GitHub release reconciliation logic".to_string());
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
    ) != 1
    {
        failures.push(
            "the shared GitHub release must include the crates.io release badge/link".to_string(),
        );
    }

    if count_occurrences(
        &workflow,
        "--docker-hub-url \"https://hub.docker.com/r/konard/link-assistant-router\"",
    ) != 1
    {
        failures.push(
            "the shared GitHub release must include the Docker Hub release badge/link".to_string(),
        );
    }

    if failures.is_empty() {
        println!("release workflow builds native images and publishes public, verified multi-platform manifests");
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
