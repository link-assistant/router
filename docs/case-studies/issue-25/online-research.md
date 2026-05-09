# Online Research

Research date: 2026-05-09

## Sources Checked

| Source | Relevant fact | Impact on this fix |
|---|---|---|
| Rust 1.85 release announcement: https://blog.rust-lang.org/2025/02/20/Rust-1.85.0/ | Rust 1.85.0 stabilized the Rust 2024 edition. | Confirms Cargo 1.82.0 in the failing Docker builder is too old for dependencies with Rust 2024 metadata. |
| Cargo changelog: https://doc.rust-lang.org/cargo/CHANGELOG.html | Cargo 1.85 includes support for the 2024 edition. | Confirms the minimum Cargo line needed to parse the dependency manifest that failed in CI. |
| Docker Build with GitHub Actions: https://docs.docker.com/build/ci/github-actions/ | Docker documents official GitHub Actions for Buildx setup, login, metadata, and build/push workflows. | Confirms the router workflow is already using the expected Docker Actions pattern; the failure is in the Dockerfile builder image. |
| Docker multi-registry publishing guide: https://docs.docker.com/build/ci/github-actions/push-multi-registries/ | Docker documents publishing one build to Docker Hub and GHCR with `docker/login-action` and `docker/build-push-action`. | Confirms the multi-registry release flow is a supported pattern and does not need redesign for this issue. |
| Docker official Rust image tags: https://github.com/docker-library/official-images/blob/master/library/rust | The official Rust image metadata includes `1-slim-bookworm`. The downloaded copy is in `raw/docker-official-rust-image-tags.txt`. | Validates that `rust:1-slim-bookworm` is an official rolling Rust 1.x tag on Debian bookworm. |

## Findings

The CI log identifies Cargo 1.82.0 as the immediate tool that failed. Online Rust documentation explains why: Rust and Cargo 1.85 are the first stable line with Rust 2024 edition support. A dependency can therefore compile successfully in normal CI, where the workflow installs the stable Rust toolchain, while failing inside a Docker builder pinned to an older Rust image.

The Docker documentation did not point to a workflow-level defect. The existing workflow uses official Docker actions for login, metadata, and build/push. The fix should keep those components and update the compiler toolchain used inside the Dockerfile.

The official Rust Docker image metadata supports the chosen builder image. `rust:1-slim-bookworm` tracks the current Rust 1.x line and keeps the Debian suite aligned with the runtime image, `debian:bookworm-slim`.

## Components Considered

| Component | Decision |
|---|---|
| Official Rust Docker images | Keep using them; switch from the stale fixed version to the rolling Rust 1.x bookworm tag. |
| `docker/build-push-action` | Keep; the failing step uses a supported official action and reached the Dockerfile build stage correctly. |
| `docker/metadata-action` | Keep; tag generation is not implicated by the failure. |
| `dtolnay/rust-toolchain@stable` | Keep; normal CI passed with stable Rust, and the Rust template uses the same pattern. |
