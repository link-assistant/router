# Requirements

## Extracted From Issue #23

| Requirement | Status | Implementation |
|---|---|---|
| Use `DOCKERHUB_TOKEN` from organization secrets | Done | Release jobs log in to Docker Hub with `username: konard` and `password: ${{ secrets.DOCKERHUB_TOKEN }}` |
| Publish the Docker image to the `konard` Docker Hub user | Done | `DOCKERHUB_IMAGE` is `konard/link-assistant-router` |
| Keep Rust crate and Docker image versions synchronized | Done | Docker metadata uses the same Cargo version emitted by the release workflow |
| Build/publish Docker after the Rust release is published | Done | Workflow publishes crates.io, waits for crates.io visibility, then builds and pushes Docker |
| Preserve GitHub releases as part of the combined release | Done | GitHub release creation remains after Docker publishing succeeds |
| Add badges for crate and Docker releases | Done | README has crates.io and Docker Hub badges; release notes include version-specific registry badges |
| Collect issue data into `docs/case-studies/issue-23` | Done | Raw issue, workflow, and file-tree data are saved under `data/` |
| Search online for supporting facts | Done | Official Docker, GitHub Actions, and Cargo documentation are summarized in `online-research.md` |
| Compare current CI/CD with `hive-mind` and templates | Done | See `template-comparison.md` |
| Report matching template issues | Done | Filed rust template issue #46 and JS template issue #54 |
| Add tests/checks for the release contract | Done | `tests/release_workflow_test.rs` and `scripts/check-release-workflow.rs` verify ordering, Docker Hub auth, tags, and release-note links |

## Release Contract

A router version is complete only when all of these are true:

| Artifact | Expected value |
|---|---|
| crates.io | `link-assistant-router` has version `X.Y.Z` |
| Docker Hub | `konard/link-assistant-router:X.Y.Z` exists |
| GHCR | `ghcr.io/link-assistant/router:X.Y.Z` exists |
| GitHub release | `vX.Y.Z` exists |
| README/release badges | crates.io and Docker Hub are visible to users |

The `latest` Docker tag is intentionally retained for convenience, but it is not the source of truth. The immutable version tag is the synchronization point.
