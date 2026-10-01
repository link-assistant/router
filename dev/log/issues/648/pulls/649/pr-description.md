Fixes #648

## Summary

v1.15.0 shipped with **no binaries**: `publish-release-artifacts` ran `rust-script` on a fresh runner that never installed it, and all four platform legs exited 127. The workflow guard did not catch it (a false negative) because it matched snippets anywhere in `release.yml`, and the install line existed in other jobs. Every main failure listed in the issue traces back to this:

| Run | What failed | Cause |
| --- | --- | --- |
| [CI/CD Pipeline 36764352534](https://github.com/link-assistant/router/actions/runs/36764352534) | `Publish attested binaries` ×4: `rust-script: command not found`, exit 127 | missing install in that job |
| [Verify GitHub Releases 36868283492](https://github.com/link-assistant/router/actions/runs/36868283492) | `no assets to download` | true positive: v1.15.0 has no assets |
| [Merged Source Delivery 36915711942](https://github.com/link-assistant/router/actions/runs/36915711942) | `state: partial-publication`, `required platform artifact missing` | true positive: same cause |

This PR fixes the cause, adds a per-job guard so it cannot recur, and fixes every other false positive, false negative, warning and security finding we control. The full evidence, timeline and analysis are in [`dev/log/issues/648/pulls/649/`](https://github.com/link-assistant/router/tree/issue-648-f0f8796b5ed2/dev/log/issues/648/pulls/649) (start with `analysis.md`).

### Fixes

| # | Problem | Fix | Guard |
| --- | --- | --- | --- |
| 1 | No release binaries (error) and the guard missing it (false negative) | `Install rust-script` in `publish-release-artifacts`. `upload-release-assets.rs` now includes `gh`'s stderr in its error. | New **`scripts/check-workflow-tools.rs`**, run in lint: every job must install rust-script, cargo-audit, cargo-cyclonedx, cargo-llvm-cov and sccache before it uses them. It recognises `cargo install`, `install-rust-script.sh` and `taiki-e/install-action` `tool:` lists. 8 unit tests. `--verbose` / `CHECK_WORKFLOW_TOOLS_VERBOSE=1` prints one line per job; off by default. |
| 2 | `found to be present in multiple build targets` printed on every build since #223, behind a green check (false negative) | `link-assistant-router` builds from its own `src/bin/link-assistant-router.rs` (`include!(concat!(env!("CARGO_MANIFEST_DIR"), "/src/main.rs"))`; an absolute path, so llvm-cov merges the coverage with the `router` target); Dockerfile updated | Lint fails on any `^warning` line from `cargo check --locked --all-targets --all-features`. Cargo's own warnings are not covered by `RUSTFLAGS=-Dwarnings` ([rust-lang/cargo#8424](https://github.com/rust-lang/cargo/issues/8424)). |
| 3 | `workflow_dispatch` inputs expanded inside `run:` (zizmor: 4 high) | Inputs are passed through `env:` and quoted | `check-release-workflow.rs` rejects `${{ inputs.` and `${{ github.event.inputs.` on `run:` lines |
| 4 | `CARGO_REGISTRY_TOKEN` in workflow `env:`, so every job saw it, including PR test jobs | Set only on the two publish steps | `check-release-workflow.rs` and `tests/release_workflow_test.rs` |
| 5 | `test` and `coverage` used `always()`, so they kept running after a cancel | `always() && !cancelled()` | `check-release-workflow.rs` (job-level conditions) |
| 6 | 29 of 48 annotations: `ubuntu-latest` will migrate to Ubuntu 26 on 2026-10-19 | `ubuntu-24.04` in all 5 workflows. `macos-latest` → `macos-26`, the image it already resolved to. | `check-release-workflow.rs` rejects `ubuntu-latest` and `macos-latest` in every workflow |
| 7 | Hourly delivery and daily reconciliation runs could overlap; delivery's summary `cat` hid the real error when the report was never written | `concurrency` groups (`cancel-in-progress: false`); the summary step is guarded and prints a `::warning::` instead | — |

Classified as **informational** and left as is (details in `analysis.md`): sccache hit-rate notices, a transient actions/cache rate-limit notice, the macOS arm64 capacity notice, and intentional stderr from negative-path tests. The Windows flake in run 36735571746 was already fixed by #647. `cargo audit` already denies warnings through `.cargo/audit.toml`, and 0.22.2 is clean.

### Tool results: main → this branch

| Check | main | branch |
| --- | --- | --- |
| `check-workflow-tools.rs` | `job publish-release-artifacts runs rust-script on line 1220 but never installs it` | every one of 25 jobs in 5 workflows installs the tools it runs |
| `cargo check` warnings | 1 | 0 |
| zizmor 1.30.1 | 4 high, 25 medium | 0 high, 25 medium (`artipacked`, follow-up) |
| actionlint 1.7.12 | clean | clean |

### Templates and upstream reports

All workflow and CI script files were compared with the Rust, JS and Python templates and with hive-mind's `CI-CD-BEST-PRACTICES.md`: [`templates/comparison.md`](https://github.com/link-assistant/router/blob/issue-648-f0f8796b5ed2/dev/log/issues/648/pulls/649/templates/comparison.md). No template currently has the missing-install bug, but none would catch it either. The Rust template's own test still passes after its changelog job's install step is deleted. Issues filed, each with a reproduction, a workaround and a suggested fix:

- link-foundation/rust-ai-driven-development-pipeline-template#178: no per-job tool-install check
- link-foundation/rust-ai-driven-development-pipeline-template#179: `install-rust-script.sh` does not pin the rust-script version
- link-foundation/rust-ai-driven-development-pipeline-template#180: 34 uses of `ubuntu-latest`
- link-foundation/rust-ai-driven-development-pipeline-template#181: Cargo's own warnings never fail CI
- link-foundation/python-ai-driven-development-pipeline-template#89: 26 uses of `ubuntu-latest`
- link-foundation/js-ai-driven-development-pipeline-template#201: `bun-version: latest`

Template practices that change release behaviour or add new jobs are documented as follow-ups in `analysis.md` rather than bundled here:

- `persist-credentials: false`
- a `pipeline-status` gate
- a cross-workflow writer concurrency group
- a push classifier
- scheduled `security.yml`, secrets scan, fresh-merge simulation, release preflight, docs and link checks

## Reproducing the bug

```bash
git checkout 7804433   # v1.15.0
rust-script scripts/check-workflow-tools.rs   # copy the script from this branch first
# Error: .github/workflows/release.yml: job `publish-release-artifacts` runs rust-script on line 1220 but never installs it
cargo check --all-targets 2>&1 | grep 'multiple build targets'
```

## Tests

- `rust-script --test scripts/check-workflow-tools.rs`: 8 passed
- `rust-script scripts/check-release-workflow.rs`, `rust-script scripts/check-workflow-tools.rs`, `cargo fmt --check`, actionlint: clean
- `cargo test --all-features --test release_workflow_test --test release_docker_test --bins`: all passed, with the token and runner-label assertions updated
- The full suite runs in this PR's CI matrix (`ubuntu-24.04`, `macos-26`, `windows-latest`). Locally, the 11 GB sandbox cannot compile the library's unit-test crate (rustc is SIGKILLed; log kept).

## After merge: recovering v1.15.0

A branch cannot repair a published release. The `bump: patch` changelog fragment releases v1.15.1 with all platform archives. Alternatively, run the recovery that the delivery check already prints:

```bash
gh workflow run release.yml --repo link-assistant/router --ref main -f release_mode=recover
```

Merged Source Delivery and Verify GitHub Releases turn green once the latest release has its assets.
