# Case Study: Issue #23 - Docker Hub Releases for Router

## Summary

Issue #23 requested Docker Hub publishing for `konard/link-assistant-router` using the organization `DOCKERHUB_TOKEN`, plus verification that Rust crate releases, Docker image releases, and GitHub releases stay synchronized.

The router already had a Rust release pipeline that published to crates.io, created GitHub releases, and pushed GHCR images. The gap was that Docker Hub was not part of that release contract, and the release detection logic treated crates.io publication as the only source of truth. If a crate publish succeeded but a later Docker or GitHub release step failed, a follow-up workflow run could incorrectly decide that the version was complete.

## Root Cause

The existing workflow had these release artifacts:

| Artifact | Existing state | Gap |
|---|---|---|
| crates.io | Published by `scripts/publish-crate.rs` | Used as the only release-complete check |
| GHCR image | Published by Docker actions | Not visible as the requested Docker Hub image |
| Docker Hub image | Not published | Missing `DOCKERHUB_TOKEN` login and `konard/link-assistant-router` tags |
| GitHub release | Created after Docker steps | Release notes only linked crates.io |

The core problem was release completeness, not just one missing action step. A version should only be considered complete when the crate, Docker image tag, and GitHub release all exist.

## Implemented Solution

The release workflow now:

1. Publishes the Rust crate to crates.io.
2. Waits until the exact crate version is visible through the crates.io API.
3. Logs in to GHCR and Docker Hub.
4. Pushes the same `latest` and version tags to both `ghcr.io/link-assistant/router` and `konard/link-assistant-router`.
5. Creates the GitHub release after Docker publishing succeeds.
6. Adds crates.io and Docker Hub badges/links to release notes.

The release detection script now checks all external artifacts when there are no changelog fragments:

| Check | Purpose |
|---|---|
| crates.io version | Confirms the Rust package is installable |
| Docker Hub tag | Confirms the image tag exists for the same version |
| GitHub release tag | Confirms the public release page exists |

If any artifact is missing, the workflow reruns the release path with `skip_bump=true` so it can finish the missing artifact without changing the version.

## Template Reports

The same optional Docker release-pattern gap was found in the referenced templates and reported upstream:

- Rust template: https://github.com/link-foundation/rust-ai-driven-development-pipeline-template/issues/46
- JS template: https://github.com/link-foundation/js-ai-driven-development-pipeline-template/issues/54

## Files

| File | Purpose |
|---|---|
| `requirements.md` | Requirements extracted from issue #23 |
| `template-comparison.md` | Router, Hive Mind, and template CI/CD comparison |
| `online-research.md` | External documentation findings used for the solution |
| `data/issue-23.json` | Raw issue metadata |
| `data/hive-mind-release.yml` | Referenced Hive Mind workflow |
| `data/rust-template-release.yml` | Referenced Rust template workflow |
| `data/js-template-release.yml` | Referenced JS template workflow |
| `data/*-ci-files.txt` | File-tree data for workflow/script comparison |

## References

- Router issue: https://github.com/link-assistant/router/issues/23
- Router PR: https://github.com/link-assistant/router/pull/24
- Hive Mind release workflow reference: https://github.com/link-assistant/hive-mind/blob/main/.github/workflows/release.yml
- Docker GitHub Actions guide: https://docs.docker.com/guides/gha/
- Docker multi-registry publishing guide: https://docs.docker.com/build/ci/github-actions/push-multi-registries/
- Cargo publish documentation: https://doc.rust-lang.org/cargo/commands/cargo-publish.html
