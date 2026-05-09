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
        "docker/login-action@v3",
        "docker/setup-buildx-action@v3",
        "docker/metadata-action@v5",
        "docker/build-push-action@v6",
        "ghcr.io/${{ github.repository }}",
        "type=raw,value=latest",
        "type=raw,value=${{ steps.current_version.outputs.version }}",
        "type=raw,value=${{ steps.version.outputs.new_version }}",
        "--crates-io-url \"https://crates.io/crates/link-assistant-router\"",
    ];

    let mut failures = Vec::new();
    for snippet in required_snippets {
        if !workflow.contains(snippet) {
            failures.push(format!("missing required release workflow snippet: {snippet}"));
        }
    }

    if count_occurrences(&workflow, "packages: write") < 2 {
        failures.push("auto and manual release jobs must both grant packages: write".to_string());
    }

    if count_occurrences(&workflow, "docker/build-push-action@v6") < 2 {
        failures.push("auto and manual release jobs must both publish a Docker image".to_string());
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

    if failures.is_empty() {
        println!("release workflow publishes crates and GHCR images");
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
