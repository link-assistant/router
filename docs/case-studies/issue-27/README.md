# Issue 27 CI/CD Failure Case Study

Issue: https://github.com/link-assistant/router/issues/27

Failing run: https://github.com/link-assistant/router/actions/runs/25605733144

Failing job: https://github.com/link-assistant/router/actions/runs/25605733144/job/75167379430

Prepared fix PR: https://github.com/link-assistant/router/pull/28

## Summary

The release pipeline failed in the `Auto Release` job while publishing Docker images. Lint, tests, package build, crate publishing, and crate availability checks had already passed. The failure happened inside the Dockerfile builder stage during the cached dependency build. The project depends on `reqwest` with native TLS defaults, which pulls `openssl-sys`; inside `rust:1-slim-bookworm`, the builder did not install `pkg-config` or OpenSSL development headers, so `openssl-sys` could not locate OpenSSL.

The fix installs `pkg-config` and `libssl-dev` in the builder stage before the first `cargo build --release`, using the same apt cleanup pattern already used by the runtime stage.

## Timeline

| Time (UTC) | Event |
|---|---|
| 2026-05-09T16:16:14Z | Push run `25605733144` started on `main` at `e60b7c89bcc83831c0b4ba59ef6c313f9c4b6f2b`. |
| 2026-05-09T16:17:14Z | `Detect Changes` completed successfully. |
| 2026-05-09T16:17:44Z | macOS test job completed successfully. |
| 2026-05-09T16:18:23Z | Ubuntu test job completed successfully. |
| 2026-05-09T16:18:34Z | Windows test job completed successfully. |
| 2026-05-09T16:18:40Z | `Lint and Format Check` completed successfully. |
| 2026-05-09T16:19:53Z | `Build Package` completed successfully. |
| 2026-05-09T16:20:01Z | `Auto Release` started. |
| 2026-05-09T16:23:36Z | Crate publication completed successfully. |
| 2026-05-09T16:23:37Z | The workflow waited for crates.io availability, then logged into GHCR and Docker Hub. |
| 2026-05-09T16:23:44Z | Docker Buildx started `Publish Docker images to registries`. |
| 2026-05-09T16:24:00Z | `openssl-sys v0.9.112` failed during Docker builder dependency compilation. |
| 2026-05-09T16:24:01Z | Buildx reported the Dockerfile step failure and exported a Docker build record. |
| 2026-05-09T16:24:04Z | `Auto Release` completed with failure. |
| 2026-05-09T20:30:48Z | Issue 27 was opened with the failing job link and CI/CD investigation requirements. |

## Root Cause

The host CI jobs compiled `openssl-sys` successfully because the GitHub-hosted runners include the native tooling needed by the crate. Docker image publishing compiles the project again inside the Dockerfile builder stage. That stage is a separate Debian slim environment and did not install the required native packages.

Evidence from the preserved log:

- `raw/ci-logs/ci-run-25605733144.log:7076` shows the Docker build compiling `openssl-sys v0.9.112`.
- `raw/ci-logs/ci-run-25605733144.log:7080` says OpenSSL could not be found.
- `raw/ci-logs/ci-run-25605733144.log:7188` says the `pkg-config` command could not be found.
- `raw/ci-logs/ci-run-25605733144.log:7245` points the failure at `Dockerfile:10`, the dummy dependency build.
- `raw/ci-logs/ci-run-25605733144.log:7262` shows Buildx failing the Docker image publish step.

## Solution Options

| Option | Result |
|---|---|
| Install `pkg-config` only | Addresses the first missing executable, but `openssl-sys` also needs OpenSSL headers/libraries. |
| Switch `reqwest` to Rustls | Avoids OpenSSL, but changes TLS backend behavior and may affect users relying on platform OpenSSL behavior. |
| Install `pkg-config` and `libssl-dev` in the Docker builder | Chosen. Fixes the immediate root cause while preserving current dependency behavior. |

## Implemented Changes

- Added a Dockerfile builder-stage install step for `pkg-config` and `libssl-dev`.
- Used a single `apt-get update && apt-get install -y --no-install-recommends` layer and removed `/var/lib/apt/lists/*`.
- Added `dockerfile_builder_installs_native_tls_build_dependencies` to prevent regressions.
- Synced the root package version in `Cargo.lock` with `Cargo.toml` after Cargo updated it during local test compilation.
- Added this case study and archived raw issue/run/template data under `docs/case-studies/issue-27`.
- Added a changelog fragment for the CI/CD Docker build fix.

## Verification

- Before the Dockerfile fix, `cargo test dockerfile_builder_installs_native_tls_build_dependencies` failed because the builder stage did not install apt packages.
- After the Dockerfile fix, `cargo test dockerfile_builder_installs_native_tls_build_dependencies` passed.
- Local checks passed: `cargo fmt --all -- --check`, `cargo clippy --all-targets --all-features`, `cargo test --all-features --verbose`, `cargo test --doc --verbose`, `cargo build --release --verbose`, `rust-script scripts/check-file-size.rs`, and `cargo package --list`.
- Local Docker reproduction was not possible in the prepared environment because the `docker` CLI is not installed.

## Archived Data

| Path | Purpose |
|---|---|
| `raw/issue-27.json` | Issue metadata and body. |
| `raw/issue-27-comments.json` | Issue comments. |
| `raw/pr-28-conversation-comments.json` | PR conversation comments. |
| `raw/pr-28-review-comments.json` | PR inline review comments. |
| `raw/pr-28-reviews.json` | PR review records. |
| `raw/recent-branch-runs.json` | Recent branch run metadata. |
| `raw/ci-run-25605733144.json` | Failing run metadata and job timeline. |
| `raw/ci-logs/ci-run-25605733144.log` | Full failing GitHub Actions log. |
| `raw/artifacts-25605733144.json` | Artifact metadata for the failing run. |
| `raw/artifacts/link-assistant-router-NI8URG.dockerbuild.gz` | Downloaded Docker build record payload from GitHub. |
| `raw/artifacts/link-assistant-router-NI8URG.dockerbuild` | Decompressed Docker build record. |
| `raw/*-template-tree.json` | Full Git tree data for router and the referenced templates. |
| `raw/*-template-file-tree.txt` | Plain file tree data for router and the referenced templates. |
| `raw/*-template-release.yml` | Referenced template release workflows. |
| `raw/template-ci-file-trees.txt` | Normalized CI/CD-related file listing across router and templates. |

## Related Notes

- Requirement tracking: `requirements.md`
- Online research: `online-research.md`
- Template comparison: `template-comparison.md`
