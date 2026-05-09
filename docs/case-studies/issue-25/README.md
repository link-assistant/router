# Issue 25 CI/CD Failure Case Study

Issue: https://github.com/link-assistant/router/issues/25

Failing run: https://github.com/link-assistant/router/actions/runs/25604352544

Prepared fix PR: https://github.com/link-assistant/router/pull/26

## Summary

The release pipeline failed during the Docker image publish step, after lint, tests, and the Rust package build had already passed. The Dockerfile pinned the builder image to `rust:1.82-slim`; that image includes Cargo 1.82.0, which cannot parse Rust 2024 edition metadata in `time-0.3.47`. The fix updates the Docker builder to `rust:1-slim-bookworm`, which tracks the current Rust 1.x line while keeping the builder on Debian bookworm to match the runtime image family.

## Timeline

| Time (UTC) | Event |
|---|---|
| 2026-05-09T15:09:40Z | Push run `25604352544` started on `59d17a5c92f843c7428b78458d51e960347f3f2f`. |
| 2026-05-09T15:10:42Z | `Lint and Format Check` started. |
| 2026-05-09T15:10:43Z | Linux, macOS, and Windows test jobs started. |
| 2026-05-09T15:12:05Z | `Build Package` started after checks passed. |
| 2026-05-09T15:13:15Z | `Auto Release` started. |
| 2026-05-09T15:16:57Z | Docker Buildx began the builder stage from `rust:1.82-slim`. |
| 2026-05-09T15:17:05Z | Cargo failed to parse `time-0.3.47` because `edition2024` is not stabilized in Cargo 1.82.0. |
| 2026-05-09T15:17:09Z | `Auto Release` completed with failure. |
| 2026-05-09T15:21:01Z | Issue #25 was opened with the failing job link and investigation requirements. |
| 2026-05-09T15:41:27Z | Follow-up PR run `25605006038` started after `main` advanced to release `v0.13.0`. |
| 2026-05-09T15:45:36Z | `cargo package --list` failed because Cargo updated `Cargo.lock` from `0.12.0` to `0.13.0`, leaving the checkout dirty. |
| 2026-05-09T15:55:16Z | Follow-up PR run `25605290968` started with the synced `Cargo.lock`. |
| 2026-05-09T15:59:03Z | Windows tests exposed an LF-only parser assumption in the new lockfile regression test. |

## Root Cause

The release workflow itself used the same stable Rust setup as the normal CI jobs, but Docker image publishing compiles the project inside the Dockerfile builder stage. That stage used an independent pinned Rust image:

```dockerfile
FROM rust:1.82-slim AS builder
```

The failing log shows:

- `ci-logs/ci-run-25604352544.log:6704`: Buildx selected `docker.io/library/rust:1.82-slim`.
- `ci-logs/ci-run-25604352544.log:6872`: Cargo failed while reading `time-0.3.47/Cargo.toml`.
- `ci-logs/ci-run-25604352544.log:6875`: Cargo reported that `edition2024` is required.
- `ci-logs/ci-run-25604352544.log:6877`: Cargo identified itself as version `1.82.0`.
- `ci-logs/ci-run-25604352544.log:6894`: The failure came from `Dockerfile:10`.

Rust 2024 edition support is stable starting with Rust and Cargo 1.85, so the Docker builder had fallen behind the dependency graph even though host CI used a modern stable toolchain.

## Solution Options

| Option | Result |
|---|---|
| Pin `rust:1.85-slim` | Fixes the immediate failure, but creates another dated pin that can fall behind future dependency metadata. |
| Use `rust:1-slim` | Tracks the current Rust 1.x line, but follows the default Debian suite for the official image, which is currently not bookworm. |
| Use `rust:1-slim-bookworm` | Chosen. Tracks current Rust 1.x, uses the slim variant, and stays on bookworm to match `debian:bookworm-slim` runtime. |

## Implemented Changes

- Updated `Dockerfile` builder image from `rust:1.82-slim` to `rust:1-slim-bookworm`.
- Added `dockerfile_builder_uses_supported_rust_toolchain` to `tests/release_workflow_test.rs`.
- Added `cargo_lock_package_version_matches_manifest` to guard the package version contract used by `cargo package --list`.
- Merged the updated `main` branch and synced the package version in `Cargo.lock` with the current `Cargo.toml` version.
- Added a changelog fragment for the Docker builder toolchain fix.
- Preserved CI logs, run metadata, artifact metadata, template trees, template workflows, and online source data under this case-study folder.

## Verification

The new regression test was run before and after the Dockerfile change:

- Before fix: `cargo test dockerfile_builder_uses_supported_rust_toolchain` failed against `rust:1.82-slim`.
- After fix: `cargo test dockerfile_builder_uses_supported_rust_toolchain` passed against `rust:1-slim-bookworm`.
- Follow-up failure: `ci-logs/follow-up/ci-run-25605006038.log:5793` shows `cargo package --list` failed because `Cargo.lock` was dirty after the `v0.13.0` base release. The lockfile is now committed at `0.13.0`.
- Follow-up failure: `ci-logs/follow-up/ci-run-25605290968.log:4342` shows the new lockfile regression test failed on Windows due CRLF line endings. The parser is now line-based and covered by `lockfile_package_version_handles_windows_line_endings`.

Local Docker reproduction was attempted, but the prepared environment does not have the `docker` CLI installed. The release workflow's failing Buildx log remains the runtime reproduction evidence.

## Template Comparison

The JS, Rust, Python, and C# pipeline templates were checked for workflows, CI scripts, release scripts, package metadata, Dockerfiles, and Docker publishing configuration. The same issue was not present in those templates because they do not include a Rust Dockerfile builder pinned to an old Cargo version or router-style Docker image publishing. No upstream template issue was opened.

See `template-comparison.md` for the detailed comparison.

## Archived Data

| Path | Purpose |
|---|---|
| `ci-logs/ci-run-25604352544.log` | Full failing GitHub Actions log. |
| `ci-logs/follow-up/ci-run-25605006038.log` | Follow-up PR run showing the stale `Cargo.lock` packaging failure after `main` advanced. |
| `ci-logs/follow-up/ci-run-25605290968.log` | Follow-up PR run showing the Windows CRLF parser issue in the new regression test. |
| `raw/ci-run-25604352544.json` | Failing run metadata and job timeline. |
| `raw/ci-run-25605006038.json` | Follow-up run metadata and job timeline. |
| `raw/ci-run-25605290968.json` | Follow-up run metadata and job timeline. |
| `raw/recent-runs.json` | Recent runs with timestamps, conclusions, and head SHAs. |
| `raw/*-template-tree.json` | Full repository trees for the referenced templates. |
| `raw/*-template-release.yml` | Template release workflows. |
| `raw/template-ci-file-trees.txt` | Normalized CI/CD-related file listing across router and templates. |
| `raw/docker-official-rust-image-tags.txt` | Downloaded official Rust image tag data used to validate `1-slim-bookworm`. |
| `raw/artifacts/link-assistant-router-XJESUT.dockerbuild*` | Docker build artifact data from the failing run. |

## Related Notes

- Requirement tracking: `requirements.md`
- Online research: `online-research.md`
- Template comparison: `template-comparison.md`
