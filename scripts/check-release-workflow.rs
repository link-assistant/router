#!/usr/bin/env rust-script
//! Validate release workflow publishing invariants.

use std::fs;
use std::process::exit;

fn main() {
    let workflow = fs::read_to_string(".github/workflows/release.yml")
        .expect("failed to read .github/workflows/release.yml");
    let reconciliation = fs::read_to_string(".github/workflows/verify-releases.yml")
        .expect("failed to read .github/workflows/verify-releases.yml");

    let required_snippets = [
        "auto-release:",
        "manual-release:",
        "publish-docker-images:",
        "publish-docker-manifests:",
        "packages: write",
        "CARGO_REGISTRY_TOKEN: ${{ secrets.CARGO_REGISTRY_TOKEN || secrets.CARGO_TOKEN }}",
        "DOCKERHUB_IMAGE: konard/link-assistant-router",
        "rust-script scripts/wait-for-crate.rs",
        "cargo install rust-script --version 0.36.0 --locked",
        "cargo install cargo-audit --version 0.22.2 --locked --force",
        "cargo install cargo-cyclonedx --version 0.5.9 --locked",
        "cargo cyclonedx --format json --all-features --all --spec-version 1.5",
        "--override-filename link-assistant-router.cdx",
        "artifact-metadata: write",
        "actions/download-artifact@3e5f45b2cfb9172054b4087a40e8e0b5a5461e7c",
        "cancel-in-progress: ${{ github.event_name == 'pull_request' }}",
        "npm run build 2>&1 | tee /tmp/admin-ui-build.log",
        "git diff --exit-code -- ui/dist",
        "toolchain: ",
        "docker/login-action@",
        "docker/setup-buildx-action@",
        "docker/metadata-action@",
        "docker/build-push-action@",
        "actions/attest-build-provenance@",
        "publish-release-artifacts:",
        "subject-path: dist/*",
        "provenance: mode=max",
        "sbom: true",
        "gh release upload",
        "gh attestation verify",
        "Verify tag and package version",
        "gh release view \"v${RELEASE_VERSION}\"",
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
        "labels: ${{ steps.image-labels.outputs.labels }}",
        "grep -v '^org.opencontainers.image.revision='",
        "needs: [create-github-release]",
        "ref: refs/tags/v${{ env.RELEASE_VERSION }}",
        "release-commit: ${{ steps.tag-commit.outputs.commit }}",
        "ref: ${{ needs.create-github-release.outputs.release-commit }}",
        "org.opencontainers.image.revision=${RELEASE_COMMIT}",
        "rust-script scripts/check-release-provenance.rs",
        "verify-release-provenance:",
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

    if count_occurrences(&workflow, "docker/login-action@") < 4 {
        failures.push(
            "Docker build and manifest jobs must both log in to GHCR and Docker Hub".to_string(),
        );
    }

    if count_occurrences(&workflow, "docker/build-push-action@") != 1 {
        failures.push("the variant-and-architecture matrix must use one shared build step".to_string());
    }

    if workflow.contains("docker/setup-qemu-action") {
        failures.push("release images must not use QEMU emulation".to_string());
    }

    for line in workflow
        .lines()
        .chain(reconciliation.lines())
        .filter(|line| line.trim_start().starts_with("uses:"))
    {
        let revision = line
            .split_once('@')
            .map(|(_, revision)| revision.split_whitespace().next().unwrap_or_default())
            .unwrap_or_default();
        if revision.len() != 40 || !revision.bytes().all(|byte| byte.is_ascii_hexdigit()) {
            failures.push(format!("workflow action is not pinned to an immutable commit: {line}"));
        }
    }

    let toolchain_actions = count_occurrences(&workflow, "dtolnay/rust-toolchain@")
        + count_occurrences(&reconciliation, "dtolnay/rust-toolchain@");
    // The version is not the invariant -- every SHA-pinned toolchain action
    // selecting an explicit numeric toolchain is. Read the one the workflow
    // pins rather than hard-coding it, so a routine upgrade does not fail a
    // check that is not about the upgrade.
    let selected = workflow
        .lines()
        .find_map(|line| line.trim().strip_prefix("toolchain: "))
        .unwrap_or_default()
        .to_string();
    if selected.is_empty()
        || !selected
            .split('.')
            .all(|part| !part.is_empty() && part.bytes().all(|byte| byte.is_ascii_digit()))
    {
        failures.push(format!(
            "the release workflow must pin an explicit numeric toolchain, found {selected:?}"
        ));
    }
    let needle = format!("toolchain: {selected}");
    let pinned_toolchains =
        count_occurrences(&workflow, &needle) + count_occurrences(&reconciliation, &needle);
    if toolchain_actions != pinned_toolchains {
        failures.push("every Rust action must select the reviewed numeric toolchain".to_string());
    }

    // Only the job that creates the release may resolve the mutable tag ref; every
    // packaging job must check out the commit that ref resolved to (issue #191).
    if count_occurrences(&workflow, "ref: refs/tags/v${{ env.RELEASE_VERSION }}") != 1 {
        failures.push(
            "packaging jobs must check out the resolved release commit, not the tag ref"
                .to_string(),
        );
    }

    if count_occurrences(&workflow, "ref: ${{ needs.create-github-release.outputs.release-commit }}") < 4 {
        failures.push(
            "every image, binary, and verification job must check out the release tag commit"
                .to_string(),
        );
    }

    // Checksum files must name the assets the way `gh release download` writes them.
    if workflow.contains("sha256sum dist/*") || workflow.contains("shasum -a 256 dist/*") {
        failures.push(
            "checksum files must be generated from inside dist/ so they list flat names"
                .to_string(),
        );
    }

    if count_occurrences(&workflow, "sha256sum -c") < 2 {
        failures.push(
            "packaging and the post-publication guard must both verify checksums the way a consumer does"
                .to_string(),
        );
    }

    if !reconciliation.contains("rust-script scripts/check-release-provenance.rs") {
        failures.push(
            "the scheduled reconciliation must re-verify published release provenance".to_string(),
        );
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
