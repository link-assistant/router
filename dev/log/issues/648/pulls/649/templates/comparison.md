# CI/CD comparison: link-assistant/router vs link-foundation pipeline templates

Inputs:

- Router: `/tmp/gh-issue-solver-1790887681520`. Line numbers are at commit `6364393` (the current branch HEAD), unless they are marked `v1.15.0`, which means commit `7804433`.
- Templates: shallow clones in `/tmp/templates/{rust,js,python}-ai-driven-development-pipeline-template`.
  - The Rust template is the primary reference.
  - The JS and Python templates are used only for language-agnostic practices.
- Best-practices doc: `CI-CD-BEST-PRACTICES.md` in this folder, a copy of hive-mind `docs/CI-CD-BEST-PRACTICES.md`.

Abbreviations:

| Short | Path |
| --- | --- |
| `R:` | router `.github/workflows/release.yml` |
| `T:` | rust template `.github/workflows/release.yml` |
| `JS:` | js template `.github/workflows/release.yml` |
| `PY:` | python template `.github/workflows/release.yml` |

## 1. The issue #648 bug: a tool is used in a job that never installs it

**Router (v1.15.0):**

- The `publish-release-artifacts` job (`R:1103`, v1.15.0) runs `rust-script scripts/upload-release-assets.rs` at `R:1220` (v1.15.0).
- No step in that job installs rust-script. Each job starts on a fresh runner, so all four matrix legs (linux amd64/arm64, darwin arm64/amd64) failed with exit code 127.
- The CI annotations show "Publish attested binaries ... Process completed with exit code 127".
- At HEAD, an `Install rust-script` step has been added at `R:1160-1161`.

**Why CI did not catch it: a false negative.**

- `scripts/check-release-workflow.rs` matches snippets anywhere in the file (`:79` `workflow.contains(snippet)`).
- It requires `cargo install rust-script --version 0.36.0 --locked` (`:22`) and `rust-script scripts/upload-release-assets.rs` (`:42`). Both strings existed, in different jobs, so the check passed.
- HEAD adds the job-scoped check `scripts/check-workflow-tools.rs`, wired in at `R:302-306`. This is the right shape.

**Templates:**

- None of the three templates has this bug. I ran a per-job scanner over every workflow job, following invoked `.sh`/`.rs` scripts and local composite actions. It checked for rust-script, cargo-audit, cargo-llvm-cov, cargo-cyclonedx, bun, deno, uv, pnpm, actionlint, lychee, rustfmt and clippy.
  - Rust template: 0 hits. Every rust-script job calls `./scripts/install-rust-script.sh` first (`T:94, 186, 217, 373, 417, 588, 701, 767, 931, 1161`). cargo-llvm-cov comes from `taiki-e/install-action` (`T:651`). cargo-audit is installed in its job (`security.yml`).
  - Python template: 0 hits.
  - JS template: 1 hit, and it is a false positive. `JS:498 job=release tool=bun` comes from a comment in `scripts/run-with-budget-warning.sh:128`. The JS scripts have `#!/usr/bin/env bun` shebangs, but the workflows always run them as `node scripts/...`.
- The templates have no per-job invariant either.
  - `tests/unit/ci-cd/workflow_release.rs:693-718` (rust template) only asserts that the workflow uses `./scripts/install-rust-script.sh` and that the installer short-circuits, uses `--locked` and retries.
  - A future job that forgets the installer would pass that test. This is the same class of false negative as the router's check. It is worth reporting upstream and pointing to `check-workflow-tools.rs`.

**Recommendations:**

1. Done at HEAD: install rust-script in `publish-release-artifacts` (`R:1160`) and keep the per-job checker.
2. Adopt the template's `scripts/install-rust-script.sh` pattern: short-circuit if the tool is present, `--locked`, and 3 retries with backoff.
   - Keep the router's `--version 0.36.0` pin. The template installer does not pin a version, which is a template weakness.
   - Today the router repeats a bare `cargo install rust-script --version 0.36.0 --locked` in about 12 jobs with no retry (for example `R:78, 107, 132, 200, 677, 751, 948, 1088, 1161, 1282, 1436`). A crates.io network flake can fail any one of them.
   - The coverage job alone uses the short-circuit form (`R:539`).
3. Extend `check-workflow-tools.rs` to `delivery.yml`, `verify-releases.yml`, `real-clients.yml` and `live-tier.yml` if it does not already cover every file in `.github/workflows/`.

## 2. Cargo bin targets sharing one source file (warning in CI)

- **Router:**
  - `Cargo.toml:23-29` declares `[[bin]] router` and `[[bin]] link-assistant-router`, both with `path = "src/main.rs"`.
  - Every build prints `warning: file '.../src/main.rs' found to be present in multiple build targets`. It appears in the "Lint and Format Check" logs of runs 36735571746 and 36764352534.
- **Templates:**
  - The Rust template has one bin, `example-sum-package-name` -> `src/main.rs` (`Cargo.toml:30-32`), plus a lib. It has no shared path.
  - The JS and Python templates have no Cargo bins.
  - None of the templates has this issue.
- **Recommendation:**
  - Give each bin its own file, for example `src/bin/link-assistant-router.rs` containing `fn main() { link_assistant_router::cli::main() }`, with the shared entrypoint moved into the library.
  - Alternatively, keep a single `[[bin]]` and create the second name as a copy or symlink when packaging (in the release archive, Docker image and `cargo install` docs).
  - Add a guard, for example in `check-release-workflow.rs` or a test, that fails if two `[[bin]]` entries share a `path`.

## 3. Other false-positive, false-negative, warning and error sources (ordered by impact)

| # | Template does | Router does | Recommended change |
| --- | --- | --- | --- |
| 3.1 | Passes `workflow_dispatch` inputs through `env:` and quotes them as shell variables: `--bump-type "$BUMP_TYPE" --description "$DESCRIPTION"` (`T:942-944`, `T:1165-1167`; also `JS:681-682`, `JS:942-943`). | Defines `BUMP_TYPE` and `DESCRIPTION` in `env:` but still interpolates `"${{ github.event.inputs.description }}"` directly in `run:` (`R:764`, `R:1442`). This is a template-injection sink: a description containing `"` or `$(...)` breaks or hijacks the step. | Use `"$BUMP_TYPE" "$DESCRIPTION"` at `R:764` and `R:1442`. The `with:` uses at `R:1448-1459` are not shell sinks, but zizmor flags the ones it can see; they can stay. |
| 3.2 | Keeps the crates.io token out of workflow `env:` and declares it only on the publish steps, with a comment explaining why (`T:47-53`; steps at `T:807`, `T:958`). | `CARGO_REGISTRY_TOKEN` is set at workflow level (`R:51`), so every PR job that compiles branch code (build.rs, proc macros, tests) inherits it. It is also set step-scoped at `R:713` and `R:774`. | Delete `R:50-51`. The step-level copies already cover publishing. |
| 3.3 | Uses `!cancelled()` (never `always()`) in job `if:`, for example `T:353, 393, 485, 566, 619`, and the template test `release_workflow_never_combines_always_with_not_cancelled` (`tests/unit/ci-cd/workflow_release.rs:731`) enforces it. | `test` (`R:385`) and `coverage` (`R:509`) use `if: always() && (...)` without `!cancelled()`, so they keep running (and billing 45-minute matrix jobs) after the run is cancelled. Other jobs use `always() && !cancelled()`, which is redundant. | Replace `always()` with `!cancelled()` everywhere (BP section 10). Add the same test to `check-release-workflow.rs`. |
| 3.4 | Sets concurrency per job, `${{ github.workflow }}-${{ github.ref }}-<job>` with `cancel-in-progress: ${{ github.ref != 'refs/heads/main' }}` (for example `T:71`). Every writer shares `${{ github.workflow }}-main-write` with `cancel-in-progress: false` (`T:733, 896, 1142, 1207`). The JS template uses a repository-wide `main-writer-${{ github.repository }}-main` (`JS:504-506`). | Uses one workflow-level group (`R:33-37`) that cancels only on PRs. Superseded `main` read-only checks are never cancelled. The schedule and dispatch workflows that also write or verify releases (`delivery.yml`, `verify-releases.yml`) have no concurrency group, so they can overlap a running release. | Move concurrency to job level (BP section 10). Put every release, tag and publish job (`auto-release`, `manual-release`, `create-github-release`, `publish-*`, `changelog-pr`) in one `main-writer-${{ github.repository }}-main` group with `cancel-in-progress: false`. Give `delivery.yml` and `verify-releases.yml` a group that does not cancel. |
| 3.5 | Has a terminal `pipeline-status` gate (`T:1281-1320`, running `scripts/check-pipeline-status.sh`) that turns a skipped, cancelled or timed-out required job into a red check. `workflows.yml` and `security.yml` have their own gates. PY has one at `PY:990-1008`. | Has no gate job. Because release jobs are guarded with `needs.X.result == 'success'`, a failed upstream job leaves downstream jobs "skipped", which shows as neutral. A partially failed release run therefore looks mostly grey rather than red. | Add a `pipeline-status` job with `needs:` on all jobs and `if: ${{ !cancelled() }}`, and make it the only required status check. |
| 3.6 | Writes the version commit through a push classifier: repository-rule rejections (GH006/GH013) fail loudly, a non-fast-forward is rebased and retried with a bound, and anything else fails as itself (`scripts/version-and-commit.rs:122-160`). | `scripts/version-and-commit.rs:435-441` runs a plain `git push`, then `git push --tags`. A lost race against another writer fails the release, and a ruleset rejection is reported as a generic push error. | Port the template's `classify_push_failure` and its bounded rebase-retry (BP section 10). Recompute the version after the rebase. |
| 3.7 | `workflows.yml` runs actionlint from the Docker image pinned by digest (`workflows.yml:42`, which bundles shellcheck) and zizmor (`--min-confidence medium`, configured in `.github/zizmor.yml`). | Has no workflow linting. The injection in 3.1, the token scope in 3.2, missing `persist-credentials: false` and shellcheck issues are not detected. | Copy `workflows.yml` and `.github/zizmor.yml`, triggered on `.github/**` changes (BP section 14). |
| 3.8 | Sets `persist-credentials: false` on every read-only checkout (for example `T:83, 120, 143`); PY keeps it true only for the push job (`PY:721-723`). | Sets it nowhere (0 occurrences in `R:`). The `GITHUB_TOKEN` stays in `.git/config` for every job, including those that upload artifacts (zizmor `artipacked`). | Add `persist-credentials: false` to every checkout except the jobs that push (`auto-release`, `manual-release`, `create-github-release`). |
| 3.9 | `security.yml` runs `cargo audit --file Cargo.lock --deny warnings` (`security.yml:37`) on a weekly cron (`:8`), CodeQL for rust and actions (`:39-64`), and dependency-review on PRs (`:66-82`). | The `audit` job (`R:314-376`) runs only on push and PR with code changes. It runs `cargo audit` with no `--deny warnings` (`R:366`), so unmaintained and yanked warnings pass, and `npm audit --audit-level=high` (`R:375`) without `--package-lock-only`. Nothing runs on a schedule, so advisories published against unchanged dependencies are never seen (BP section 15). | Add a scheduled `security.yml` with `cargo audit --deny warnings` (with documented `--ignore` entries if needed), `npm audit --package-lock-only --audit-level=high`, CodeQL and dependency-review. |
| 3.10 | `secrets-scan` job using secretlint (`T:228-241`). | Has no secrets scan (BP section 11). | Add a secretlint or gitleaks job, and optionally a pre-commit hook. |
| 3.11 | `fresh-merge` job (`T:246-286`) re-merges the base branch on PRs so checks validate the real merge result. | Uses no fresh-merge simulation (BP section 7). | Add the step from BP section 7 to `lint` and `test`, or as a separate job they depend on. |
| 3.12 | `release-preflight` (`T:134-159`) probes publish credentials before building, and publish jobs `needs:` it (BP section 16). | Missing credentials (crates.io, Docker Hub, GHCR) are found only after a full 45-minute test and build cycle. | Add a preflight job. In `release` mode it fails on push to main, and on PRs it reports instead. |
| 3.13 | `cargo-lock` guard job (`T:344-376`) and `validate-docs` (`T:108-130`); `links.yml` runs lychee. | Has a `docs-changed` output (`R:64`) but nothing consumes it for docs validation, and has no Cargo.lock drift guard beyond `--locked` and no link check. | Add `validate-docs` gated on `docs-changed`, and add a lychee link check. |
| 3.14 | `actions/*` are on major tags, allowed by the zizmor ref-pin policy. Third-party actions are hash-pinned. | Every action is SHA-pinned, which is better than the template. | Keep this. |
| 3.15 | The BP doc says to pin `ubuntu-24.04` (lines 34-37). The JS template does this (`JS:464, 516`); the Rust template still uses `ubuntu-latest` (`T:68` and others), which is a template gap. | Uses `ubuntu-latest` in 17 places in `R:`, plus `delivery.yml:12`, `verify-releases.yml` (2), `real-clients.yml:30, 91, 145` and `live-tier.yml:34`. Every run emits the annotation "ubuntu-latest label will migrate to Ubuntu 26 beginning October 19, 2026". | Replace them with `ubuntu-24.04`. This removes the recurring notice and the risk of a silent OS jump about 18 days from now. |
| 3.16 | Timeouts are set on every job. | Timeouts are set on every job. | Keep this. |
| 3.17 | Not applicable. | `delivery.yml` runs every hour (`delivery.yml:4`, `'23 * * * *'`) and fails until the missing assets exist, so it produces 24 red runs a day for one root cause. `delivery.yml:28-29` runs `if: always()` then `cat target/verification/delivery.json`, which fails with "No such file" when `check-delivery.rs` dies before writing it, hiding the real error behind a second one. The upload at `:30-34` has no `if-no-files-found`. | Reduce the cron to daily, or trigger with `workflow_run` on the release pipeline. Make the summary step `if: ${{ !cancelled() }}` and guard it with `[ -f ... ] && cat ...`. Set `if-no-files-found: warn`. Add a concurrency group. |
| 3.18 | Not applicable. | The "Latest Release Matches Its Tag Commit" job in `verify-releases.yml` fails as a consequence of the missing v1.15.0 assets. That is a true positive, but it will keep failing daily until v1.15.0 is repaired (re-run with `release_mode=recover`, or a v1.15.1). | After the fix lands, run the recover path once and confirm the job turns green. |
| 3.19 | `auto-release` checks `crate_published` before publishing, so re-runs are idempotent (`T:800-825`). | The `recover` mode (`R:658`, `R:690`) re-enters `auto-release`. `scripts/publish-crate.rs:170-172` already treats "already uploaded" or "already exists" as success. | Nothing needed; this is equivalent to the template. |
| 3.20 | `desktop-release.yml` sets `defaults: run: shell: bash` (`:68-70`), so every step runs as `bash -eo pipefail`. | Sets no `defaults.run.shell`. Linux and macOS steps without an explicit `shell:` run as `bash -e {0}`, which has no `pipefail`, so `cmd \| tee` or `cmd \| grep` pipelines can hide a failing `cmd` (a false-green). Windows steps default to `pwsh`. | Add `defaults: run: shell: bash` at workflow level and keep the per-step `shell: pwsh` overrides for Windows (`R:452`, `R:475`). |

## 4. Best-practices doc mapping (CI-CD-BEST-PRACTICES.md)

| BP section | Practice | Router | Evidence |
| --- | --- | --- | --- |
| Header (34-37) | Pin runner OS (`ubuntu-24.04`) | No | `R:58` and 16 more `ubuntu-latest`; see 3.15 |
| 1 | Run only on relevant changes (detect-changes) | Yes | `R:56-86` (`detect-code-changes.rs`); jobs gated at `R:183-188`, `R:321-325` |
| 2 | File size limit | Yes | `R:269` `check-file-size.rs` |
| 3 | Automated formatting and pre-commit formatting | Yes | `R:230` `cargo fmt --check`; `.pre-commit-config.yaml:18` |
| 4 | Static analysis (clippy) | Yes | `R:236` `cargo clippy --locked --all-targets --all-features`, with `RUSTFLAGS=-Dwarnings` (`R:49`) |
| 5 | Fast-fail ordering | Partial | `build` needs `lint, test, coverage` (`R:604`), but `test` and `coverage` do not wait for `lint` (`R:383`, `R:508`), so the slow jobs start before the fast lint fails |
| 6 | Changeset versioning, docs-only exempt | Yes | `changelog` job `R:90-112` gated on `any-code-changed` (`R:95`) |
| 7 | Validate the actual merge result | No | No fresh-merge step; see 3.11 |
| 8 | Pre-commit hooks (format, lint, file size, secrets) | Partial | fmt, clippy and test are present (`.pre-commit-config.yaml:18, 25, 32`); no file-size or secrets hook (the template also lacks secrets) |
| 9 | Release automation, version-check, push to main | Yes, with a gap | `version-check` `R:116-139`, auto and manual release `R:649-779`; push has no rule classification or retry (`scripts/version-and-commit.rs:435-441`) |
| 9 | Trusted publishing (OIDC) | Partial | Docker and attestations use `id-token: write` (`R:806`, `R:1141`); crates.io still uses a long-lived token (`R:51`, `R:713`) |
| 10 | Job-level concurrency, a shared writer group, writers not cancelled | Partial | Workflow-level group only (`R:33-37`); writers are not cancelled on main, but read checks on main are not cancelled either, and there is no cross-workflow writer group; see 3.4 |
| 10 | `!cancelled()` instead of `always()` | No | `R:385`, `R:509` use bare `always()`; see 3.3 |
| 10 | Push rejection classify, rebase and retry | No | See 3.6 |
| 11 | Secrets detection | No | See 3.10 |
| 12 | Docs validation and link check | No | `docs-changed` output unused; see 3.13 |
| 13 | Native per-arch runners, no QEMU, gha cache, assert the shipped platforms | Yes | `R:798` `ubuntu-24.04-arm`; cache `R:875-876`; QEMU forbidden by `check-release-workflow.rs:100`; manifest check `check-docker-platforms.rs`; tag-to-release check `verify-releases.yml` |
| 13 | Never gate the release on the image push | Yes | `create-github-release` runs before `publish-docker-images` (`R:785`) |
| 14 | actionlint (Docker) and zizmor | No | See 3.7 |
| 15 | Scheduled dependency audit with an explicit level | Partial | `npm audit --audit-level=high` (`R:375`), but `cargo audit` has no `--deny warnings` (`R:366`) and there is no schedule; see 3.9 |
| 16 | Preflight credentials before building | No | See 3.12 |
| 16 | Verify the published result anonymously and separately | Yes | `verify-release-provenance` `R:1256-1340`, `verify-releases.yml` |

## 5. Template defects and inconsistencies found (to report upstream)

1. **No per-job tool-install invariant.**
   - Rust template `tests/unit/ci-cd/workflow_release.rs:693-718` checks file-wide, so it would miss the same bug the router hit.
   - Suggest upstreaming the router's `scripts/check-workflow-tools.rs`.
2. **The rust-script install is not version-pinned.**
   - `scripts/install-rust-script.sh` runs `cargo install rust-script --locked` with no `--version`, so a new rust-script release can change behaviour without a diff.
3. **The Rust template uses `ubuntu-latest`,** for example `T:68`, contradicting BP lines 34-37. The JS template correctly uses `ubuntu-24.04`.
4. **JS template `bun-version: latest`** (`JS:343`) is unpinned.
5. **Mixed artifact action majors.**
   - Rust template `release.yml:1083` uses `upload-artifact@v6` and `:1105` uses `download-artifact@v7`.
   - `desktop-release.yml:117, 123` use `upload-artifact@v7` and `:141, 147` use `download-artifact@v8`.
   - Artifacts uploaded by one major and downloaded by a different one are a known source of "artifact not found" and deprecation warnings.
6. **The JS template's per-job scan has one false positive.** `bun` is mentioned in a comment in `scripts/run-with-budget-warning.sh:128`. This is harmless, but any comment-aware scanner must skip comment lines; the router's `check-workflow-tools.rs` already skips them.

## 6. Suggested order of work for the router

1. Done at HEAD: the bug fix in 1 and the per-job checker.
2. Fix the injection in 3.1 and move the token as in 3.2. These are small security fixes.
3. Replace `always()` with `!cancelled()` (3.3) and add the `pipeline-status` gate (3.5).
4. Fix `delivery.yml`: the noise and the masking `cat` (3.17).
5. Fix the shared bin path warning (2).
6. Add `workflows.yml` with actionlint and zizmor (3.7), then fix what it reports, including `persist-credentials` (3.8).
7. Pin `ubuntu-24.04` (3.15) before 2026-10-19.
8. Larger follow-ups:
   - job-level concurrency and writer group (3.4)
   - push classifier (3.6)
   - scheduled security workflow (3.9)
   - secrets scan, fresh-merge, preflight and docs/link validation (3.10-3.13)
