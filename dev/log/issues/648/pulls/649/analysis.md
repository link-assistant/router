# Issue 648 analysis: false positives, false negatives, warnings and errors in CI/CD

## Requirements

| # | Requirement (issue text) | Disposition |
| --- | --- | --- |
| R1 | Fix the failing **CI/CD Pipeline** run [36764352534](https://github.com/link-assistant/router/actions/runs/36764352534) | Root cause 1 fixed; guarded by `scripts/check-workflow-tools.rs`. |
| R2 | Fix the failing **Verify GitHub Releases** run [36868283492](https://github.com/link-assistant/router/actions/runs/36868283492) | A true positive caused by R1. It clears once v1.15.0 gets its assets (see "Recovering v1.15.0"). |
| R3 | Fix the failing **Merged Source Delivery** run [36915711942](https://github.com/link-assistant/router/actions/runs/36915711942) | A true positive caused by R1, plus a masking `cat` and overlapping runs; both fixed. |
| R4 | Find and fix *all* false positives, false negatives, warnings and errors | All 48 annotations of the main run and every distinct warning were classified (table below). The ones under our control are fixed and guarded. |
| R5 | Use the best practices of the Rust, JS and Python templates, comparing the full file trees | `templates/comparison.md` (20 numbered differences, plus a best-practice section map). Applied items are listed below; the rest are documented follow-ups. |
| R6 | When the same problem exists in a template, report it there too | Six issues filed (links below), each with a reproduction, a workaround and a suggested fix. |
| R7 | Follow hive-mind `docs/CI-CD-BEST-PRACTICES.md` | Snapshot in `templates/CI-CD-BEST-PRACTICES.md`; mapping in `templates/comparison.md` §4. |
| R8 | Do everything in one PR | PR #649. |

## Timeline (UTC)

| When | Event | Evidence |
| --- | --- | --- |
| 2026-08-19 | #223 adds a second `[[bin]]` (`router`) pointing at `src/main.rs`. From then on every build prints "found to be present in multiple build targets", and CI stays green. | `ci-logs/local-cargo-check-manifest-warning-before-fix.log` |
| 2026-09-30 11:40 | `911ef6f` adds the `publish-release-artifacts` job. Its upload step runs `rust-script scripts/upload-release-assets.rs`, but the job never installs rust-script. `check-release-workflow.rs` passes, because both the install string and the use string exist somewhere in the file. | `ci-logs/local-check-workflow-tools-before-fix.log` |
| 2026-09-30 15:17 | CI run 36735571746 (`ac82c1d`) fails on a flaky Windows test, which PR #647 fixed. | `ci-logs/ci-cd-pipeline-36735571746.log` |
| 2026-09-30 19:15 | PR #647 is merged (`906d9ff`). CI/CD run 36764352534 starts. | `ci-run-36764352534.json` |
| 2026-09-30 19:35 | The run commits `7804433` "chore: release v1.15.0" and creates the tag, crate and GitHub release. | git log |
| 2026-09-30 19:51–19:58 | All four `Publish attested binaries` legs print `rust-script: command not found` and exit 127, so v1.15.0 has **no assets**. | `ci-logs/ci-cd-pipeline-36764352534.log:71081,73093,75116,77135` |
| 2026-10-01 13:24 | Verify GitHub Releases: "Latest Release Matches Its Tag Commit" prints `no assets to download` and exits 1. | `ci-logs/verify-releases-36868283492.log:1138` |
| 2026-10-01 13:33 onward, hourly | Merged Source Delivery reports `state: partial-publication`, `required platform artifact missing: link-assistant-router-1.15.0-linux-amd64.tar.gz`, and prints its own recovery command. | `ci-logs/delivery-36915711942.log:1060-1078` |
| 2026-10-01 | Issue #648 opened. | `issue.json` |

## Root causes and fixes

| # | Problem | Kind | Root cause | Fix (this PR) | Guard against regression |
| --- | --- | --- | --- | --- | --- |
| 1 | No release binaries for v1.15.0 | error + **false negative** in the guard | Each job runs on a fresh runner. `publish-release-artifacts` used rust-script without installing it, and the guard matched snippets across the whole file. | `Install rust-script` step in that job. `upload-release-assets.rs` now includes `gh`'s stderr in its error. | New `scripts/check-workflow-tools.rs` checks **per job** that rust-script, cargo-audit, cargo-cyclonedx, cargo-llvm-cov and sccache are installed before use. 8 unit tests, verbose mode via `--verbose` or `CHECK_WORKFLOW_TOOLS_VERBOSE=1` (off by default), run in lint. |
| 2 | Verify GitHub Releases red | true positive | Consequence of 1 | Recover v1.15.0 after merge | Existing check |
| 3 | Merged Source Delivery red, hourly | true positive + masking | Consequence of 1. In addition, the summary step `cat`-ed a file the failed script may never have written, and hourly runs could overlap. | Guarded summary with a `::warning::`. `concurrency` group, not cancelled. | — |
| 4 | Cargo "multiple build targets" warning on every build | **false negative** (warning never fails) | `RUSTFLAGS=-Dwarnings` and `build.warnings` cover rustc lints only, not Cargo's own warnings (rust-lang/cargo#8424). | `link-assistant-router` builds from `src/bin/link-assistant-router.rs`, which does `include!(concat!(env!("CARGO_MANIFEST_DIR"), "/src/main.rs"))` (Dockerfile updated). See row 10 for why the path is absolute. | Lint runs `cargo check --locked --all-targets --all-features`, `tee`s the output and fails on any `^warning` line (with `pipefail`). |
| 5 | Workflow-dispatch inputs expanded inside `run:` (zizmor high ×4) | security | `${{ github.event.inputs.* }}` in shell text | Values go through `env:` (`"$BUMP_TYPE"`, `"$DESCRIPTION"`) | `check-release-workflow.rs` rejects `${{ inputs.` / `${{ github.event.inputs.` on `run:` lines |
| 6 | `CARGO_REGISTRY_TOKEN` in workflow `env:` | security | Workflow-level env reaches every job, including PR test jobs (the log shows `CARGO_REGISTRY_TOKEN: ***` in Dependency Audit) | Only the two publish steps set it | `check-release-workflow.rs` and `tests/release_workflow_test.rs` assert step scope (count 2, none before `jobs:`) |
| 7 | `test` and `coverage` keep running after a cancel | waste / misleading | Job `if: always() && (...)` | `always() && !cancelled() && (...)` | `check-release-workflow.rs` rejects job-level `always()` without `!cancelled()` |
| 8 | 29 of 48 annotations: "ubuntu-latest label will migrate to Ubuntu 26" | warning + future silent OS change | Mutable runner alias | `ubuntu-24.04` everywhere (release, delivery, verify-releases, live-tier, real-clients); `macos-latest` → `macos-26` (what it already resolved to) | `check-release-workflow.rs` rejects `ubuntu-latest`/`macos-latest` in every workflow |
| 9 | Flaky Windows test (run 36735571746) | false positive | Test timing | Already fixed by PR #647 | — |
| 10 | PR run 36929710887: coverage 83.69% < baseline 85.46% (introduced by this PR, then fixed) | true positive against this PR's first fix for 4 | A relative `include!("../main.rs")` makes rustc record the included module tree as `src/bin/../*.rs`. llvm-cov keys coverage by recorded path, so 26 files were counted twice (lcov: 316 files vs 290 on main; 83,983 vs 76,863 lines) and the second copy was barely exercised. | Include through `concat!(env!("CARGO_MANIFEST_DIR"), "/src/main.rs")`, which records the same absolute paths as the `router` target, so llvm-cov merges them. | `experiments/include-coverage-paths/run.sh` reproduces both variants (`run.log`). The coverage gate itself caught it. |
| 11 | PR run 36929710887: Windows `release_workflow_maps_crates_io_token_fallback_to_cargo_native_env` panicked "release workflow should define jobs" (introduced by this PR, then fixed) | true positive against this PR's new assertion | The new assertion split on `"\njobs:\n"`, but Windows checks `.yml` files out with CRLF (`.gitattributes` has no rule for them). | Read the file through the test file's existing `read_lf` helper. `check-release-workflow.rs` scans lines up to `jobs:` instead of splitting on `\n`. | The Windows test leg |

### Classified as informational, so no change

- **sccache hit-rate notices**, e.g. "72% - 474 hits, 184 misses, 0 errors". These are statistics, not problems.
- **"You've hit a rate limit, your rate limit will reset in 14 seconds"** from actions/cache in Dependency Audit (main run 36735571746). This is a transient cache-reservation throttle that only affects cache saving; the job passed.
- **"Due to capacity constraints, jobs targeting macOS arm64 runners may experience longer queue times."** This is a GitHub platform notice.
- **Intentional stderr from tests** (deployment-state and Codex warnings printed by negative-path tests). This is expected output.
- **zizmor `artipacked` (25 medium findings).** No checkout passes `.git` into an uploaded artifact, but `persist-credentials: false` is a worthwhile follow-up (see below).
- **cargo-audit strictness.** It is already strict: `.cargo/audit.toml` sets `[output] deny = ["warnings"]`, and `tests/release_workflow_test.rs::dependency_audit_fails_on_warnings` asserts it. `cargo audit` 0.22.2 is clean (`ci-logs/local-cargo-audit-0.22.2-deny-warnings.log`).

## Tool results, main vs branch

| Tool | main (`7804433`) | branch | Log |
| --- | --- | --- | --- |
| `check-workflow-tools.rs` | 1 failure (`publish-release-artifacts`, rust-script) | "every one of 25 jobs in 5 workflows installs the tools it runs" | `ci-logs/local-check-workflow-tools-*.log` |
| `cargo check` warnings | 1 manifest warning | 0 | `ci-logs/local-cargo-check-manifest-warning-*.log` |
| zizmor 1.30.1 | 4 high (template-injection), 25 medium | 0 high, 25 medium (artipacked) | `ci-logs/local-zizmor-1.30.1-*.log` |
| actionlint 1.7.12 | clean | clean | `ci-logs/local-actionlint-1.7.12-*.log` |

## Template comparison and upstream reports

The full comparison is in `templates/comparison.md`. All three templates were checked with the same per-job scanner. None of them currently has the missing-install bug, but none has a test that would catch it. The Rust template's own test still passes after its changelog job's install step is removed (`ci-logs/template-rust-per-job-install-repro.log`).

| Upstream issue | Problem | Reproduction log |
| --- | --- | --- |
| [rust-template#178](https://github.com/link-foundation/rust-ai-driven-development-pipeline-template/issues/178) | No per-job tool-install check | `ci-logs/template-rust-per-job-install-repro.log` |
| [rust-template#179](https://github.com/link-foundation/rust-ai-driven-development-pipeline-template/issues/179) | `install-rust-script.sh` does not pin the rust-script version | grep in the issue |
| [rust-template#180](https://github.com/link-foundation/rust-ai-driven-development-pipeline-template/issues/180) | 34 uses of `ubuntu-latest` | grep in the issue |
| [rust-template#181](https://github.com/link-foundation/rust-ai-driven-development-pipeline-template/issues/181) | Cargo's own warnings never fail CI | `ci-logs/template-rust-cargo-warning-repro.log` |
| [python-template#89](https://github.com/link-foundation/python-ai-driven-development-pipeline-template/issues/89) | 26 uses of `ubuntu-latest` | grep in the issue |
| [js-template#201](https://github.com/link-foundation/js-ai-driven-development-pipeline-template/issues/201) | `bun-version: latest` | grep in the issue |

The issue bodies are archived in `templates/upstream/`. Not reported:

- Mixed `upload-artifact`/`download-artifact` majors (v6/v7, v7/v8). Every major from v4 on uses the same artifact backend, and no failure was observed.
- The JS template scanner hit. It is a false positive from a comment.
- Cargo's warning gap is not reported to rust-lang/cargo, because [rust-lang/cargo#8424](https://github.com/rust-lang/cargo/issues/8424) already tracks it.

## Follow-ups (documented, not in this PR)

These template practices go beyond fixing the reported false positives, negatives, warnings and errors. Each one changes release semantics or adds new jobs, so it needs its own review:

1. `persist-credentials: false` on non-pushing checkouts (zizmor artipacked ×25) (comparison 3.8).
2. A terminal `pipeline-status` gate job (3.5).
3. Job-level concurrency with one cross-workflow main-writer group (3.4).
4. A push classifier and bounded rebase-retry in `version-and-commit.rs` (3.6).
5. A `workflows.yml` running actionlint and zizmor in CI (3.7).
6. A scheduled `security.yml` (cargo audit, npm audit, CodeQL, dependency review) (3.9).
7. Secrets scanning, fresh-merge simulation, release preflight, docs and link checks (3.10–3.13).
8. Pinning `windows-latest` (it currently resolves to `windows-2025-vs2026`).
9. `defaults.run.shell: bash` (3.20). The one pipeline added here sets `pipefail` explicitly.

## Recovering v1.15.0

A branch cannot repair the published v1.15.0. After this PR merges, either:

- the changelog fragment (`bump: patch`) releases v1.15.1 with all four platform archives, or
- a maintainer runs the command the delivery check already prints:
  `gh workflow run release.yml --repo link-assistant/router --ref main -f release_mode=recover`

Merged Source Delivery and Verify GitHub Releases turn green once the latest release has its assets.
