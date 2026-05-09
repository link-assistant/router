# Online Research

## Docker GitHub Actions

Docker's GitHub Actions guide recommends the same building blocks used in this fix:

| Action | Purpose |
|---|---|
| `docker/metadata-action@v6` | Generate image tags, labels, and annotations from workflow metadata |
| `docker/login-action@v4` | Authenticate to Docker Hub before pushing |
| `docker/setup-buildx-action@v4` | Configure Buildx for build-push workflows |
| `docker/build-push-action@v7` | Build and push registry images |

The Docker guide also shows Docker Hub authentication with a username and token stored in GitHub Actions settings. For this router, the username is fixed to `konard` and the token is read from the requested `DOCKERHUB_TOKEN` secret.

Source: https://docs.docker.com/guides/gha/

## Multiple Registries

Docker's multi-registry guide shows logging in to Docker Hub and GHCR in one workflow, then pushing tags for both registries from the same build step. That maps directly to this repository's goal: keep the existing GHCR publish while adding `konard/link-assistant-router` on Docker Hub.

Source: https://docs.docker.com/build/ci/github-actions/push-multi-registries/

## Docker Hub Tokens

Docker documents personal access tokens as the password substitute for Docker CLI authentication and notes that tokens can be scoped with read/write permissions. The release workflow therefore uses `DOCKERHUB_TOKEN` as the credential and does not store any Docker password in the repository.

Source: https://docs.docker.com/security/access-tokens/

## Cargo Publish Visibility

Cargo's `publish` documentation says the client uploads the crate and polls for the package to appear in the index; that polling can time out even after upload. The router workflow adds `scripts/wait-for-crate.rs` after `cargo publish` so Docker publishing happens only after the exact version is visible through crates.io.

Source: https://doc.rust-lang.org/cargo/commands/cargo-publish.html

## GitHub Actions Job Ordering

GitHub Actions runs jobs in parallel by default, and `needs` controls job-level sequencing. This router fix keeps the crate, Docker, and GitHub release steps in one release job, preserving strict step order for the combined release.

Source: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
