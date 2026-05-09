# Requirements

Issue: https://github.com/link-assistant/router/issues/25

| ID | Requirement | Evidence | Status |
|---|---|---|---|
| R1 | Investigate failing CI/CD run `25604352544`, job `75163759803`. | Issue body links directly to the failed job. | Done |
| R2 | Download logs and related run data into `docs/case-studies/issue-25`. | Issue asks to compile all logs and data related to the issue. | Done |
| R3 | Reconstruct the timeline and identify root causes. | Issue asks for timeline, root causes, and solution plans. | Done |
| R4 | Compare router CI/CD files with the JS, Rust, Python, and C# pipeline templates. | Issue asks to check full file trees for workflows and CI/CD scripts. | Done |
| R5 | Search online for relevant facts and existing guidance. | Issue asks for online facts and data. | Done |
| R6 | Report template issues only if the same issue is found in a template repository. | Issue asks to report if the same issue is found in templates. | Not needed; templates do not contain Dockerfiles or Docker publish steps with pinned old Rust builders. |
| R7 | Add debug output or verbose mode if root cause cannot be found. | Issue asks for debug output when data is insufficient. | Not needed; CI logs identify the failing Dockerfile line and Cargo error. |
| R8 | Implement and verify a fix in one pull request. | Issue asks to execute everything in a single PR. | Done |
| R9 | Re-check CI after pushing the draft fix and preserve any new non-passing run data. | Follow-up pull request runs `25605006038` and `25605290968` exposed a stale `Cargo.lock` and a Windows-only CRLF parser issue in the new test. | Done |

## Reproduction Evidence

The failure is reproducible from the saved GitHub Actions log:

- `ci-logs/ci-run-25604352544.log:6704` shows the Docker builder image as `rust:1.82-slim`.
- `ci-logs/ci-run-25604352544.log:6872` shows Cargo failing to parse `time-0.3.47`.
- `ci-logs/ci-run-25604352544.log:6875` says the `edition2024` feature is required.
- `ci-logs/ci-run-25604352544.log:6877` identifies Cargo `1.82.0` as too old.
- `ci-logs/ci-run-25604352544.log:6894` points to `Dockerfile:10`.
- `ci-logs/ci-run-25604352544.log:6911` is the final buildx failure.

Local Docker reproduction was attempted but the prepared runner does not have the `docker` CLI installed. The regression test added in this PR covers the Dockerfile/toolchain contract statically.

## Follow-up CI Evidence

The first PR run after the Dockerfile fix was `25605006038`. That run used the GitHub pull-request merge commit after `main` advanced to `v0.13.0`.

- `ci-logs/follow-up/ci-run-25605006038.log:5778` shows the package building as `link-assistant-router v0.13.0`.
- `ci-logs/follow-up/ci-run-25605006038.log:5782` shows the failing `cargo package --list` step.
- `ci-logs/follow-up/ci-run-25605006038.log:5793` says one file became dirty.
- `ci-logs/follow-up/ci-run-25605006038.log:5795` identifies `Cargo.lock` as the dirty file.

The fix branch now merges the updated `main` branch and commits the corresponding `Cargo.lock` package version. The regression test `cargo_lock_package_version_matches_manifest` keeps the manifest and lockfile package versions aligned before packaging.

The next PR run was `25605290968`. It passed version, changelog, lint, Linux tests, and macOS tests, then failed in the Windows test job before `Build Package`.

- `ci-logs/follow-up/ci-run-25605290968.log:4342` shows `cargo_lock_package_version_matches_manifest` failing.
- `ci-logs/follow-up/ci-run-25605290968.log:4348` points to `tests\release_workflow_test.rs:28`.
- `ci-logs/follow-up/ci-run-25605290968.log:4350` shows the parser returned dependency version `1.1.4`.
- `ci-logs/follow-up/ci-run-25605290968.log:4351` shows the expected package version was `0.13.0`.

That failure was caused by splitting `Cargo.lock` on LF-only section boundaries. The parser is now line-based, and `lockfile_package_version_handles_windows_line_endings` covers CRLF input directly.
