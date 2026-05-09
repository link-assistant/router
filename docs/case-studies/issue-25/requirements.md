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

## Reproduction Evidence

The failure is reproducible from the saved GitHub Actions log:

- `ci-logs/ci-run-25604352544.log:6704` shows the Docker builder image as `rust:1.82-slim`.
- `ci-logs/ci-run-25604352544.log:6872` shows Cargo failing to parse `time-0.3.47`.
- `ci-logs/ci-run-25604352544.log:6875` says the `edition2024` feature is required.
- `ci-logs/ci-run-25604352544.log:6877` identifies Cargo `1.82.0` as too old.
- `ci-logs/ci-run-25604352544.log:6894` points to `Dockerfile:10`.
- `ci-logs/ci-run-25604352544.log:6911` is the final buildx failure.

Local Docker reproduction was attempted but the prepared runner does not have the `docker` CLI installed. The regression test added in this PR covers the Dockerfile/toolchain contract statically.
