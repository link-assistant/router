# Template Comparison

## Data Collected

| Repository | Data files |
|---|---|
| `link-assistant/router` | `data/router-ci-files-after.txt` |
| `link-assistant/hive-mind` | `data/hive-mind-release.yml`, `data/hive-mind-ci-files.txt` |
| `link-foundation/rust-ai-driven-development-pipeline-template` | `data/rust-template-release.yml`, `data/rust-template-ci-files.txt` |
| `link-foundation/js-ai-driven-development-pipeline-template` | `data/js-template-release.yml`, `data/js-template-ci-files.txt` |

## Findings

| Capability | Router before fix | Hive Mind | Rust template | JS template | Router after fix |
|---|---|---|---|---|---|
| Package release | crates.io | npm | crates.io | npm | crates.io |
| Docker Hub login | Missing | `docker/login-action` with Docker Hub token | Missing | Missing | `docker/login-action@v4` with `DOCKERHUB_TOKEN` |
| Docker Hub image | Missing | `konard/hive-mind` | Missing | Missing | `konard/link-assistant-router` |
| GHCR image | Present | Not the primary target | Missing | Missing | Preserved |
| Package-before-Docker ordering | Partially present for GHCR | Explicit Docker jobs depend on package release output | Not applicable | Not present | Crate publish and visibility wait precede Docker push |
| Version-specific Docker tag | Present for GHCR | Present for Docker Hub | Missing | Missing | Present for Docker Hub and GHCR |
| Release self-healing | crates.io only | Package publish output drives downstream Docker jobs | crates.io only | npm only | crates.io + Docker Hub + GitHub release |
| Release-note registry badges | crates.io only | GitHub release formatting exists | crates.io support | npm support | crates.io + Docker Hub |

## Applied Hive Mind Practices

Hive Mind's workflow showed three relevant practices:

1. Docker publishing is downstream of the language package release.
2. Docker tags use the exact published package version.
3. Docker Hub authentication uses official Docker GitHub Actions and token-based credentials.

The router adopts those practices without copying Hive Mind's larger multi-image/multi-platform structure. Router currently has one Dockerfile and one image target, so a single build-push step with two registries is enough.

## Template Gaps Reported

The referenced templates do not currently include an optional Docker Hub publishing path tied to their package release workflows:

- Rust template issue: https://github.com/link-foundation/rust-ai-driven-development-pipeline-template/issues/46
- JS template issue: https://github.com/link-foundation/js-ai-driven-development-pipeline-template/issues/54

These reports keep the template work separate from the router PR while preserving the investigation result requested in issue #23.
