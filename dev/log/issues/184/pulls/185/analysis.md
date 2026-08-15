# Deep analysis: issue 184

## Requirements and disposition

1. **Inspect every cited run and all issue/PR discussion.** Complete raw logs,
   run metadata, issue data, PR data, and all three PR comment/review APIs are
   stored here. There were no issue or PR comments/reviews at investigation time.
2. **Compare the repository with the Rust, JavaScript, and Python templates and
   CI-CD-BEST-PRACTICES.** File inventories, template commit IDs, the guide
   snapshot, and the applicability analysis are preserved.
3. **Find every false positive, false negative, warning, and error.** The cited
   logs contained two identical hard failures, two repeated artifact-metadata
   warnings, one Node deprecation warning, and two orphan-release warnings/errors.
   Static comparison additionally found skipped build inputs, an unbuilt UI, an
   unsafe release cancellation policy, and a Vite chunk warning once the missing
   UI build was exercised. The evidence snapshot also reproduced a file-size
   false positive because archived upstream Rust source was scanned as product code.
4. **Fix every occurrence across the codebase.** Both architecture legs share the
   corrected SBOM step; both native image legs share the permission; the sole
   warning-producing artifact download is pinned to v7; all non-documentation
   file types now trigger CI/changelog checks; the UI is built and compared with
   its committed bundle; release-capable runs cannot be cancelled.
5. **Reproduce before fixing and retain tests.** Five workflow regression tests
   failed before implementation. Behavioral tests now cover non-Rust change
   surfaces and changelog policy. A bundle-size test prevents Vite's warning from
   returning.
6. **Repair live repository state.** Valid default-branch tags v0.56.0 and
   v0.73.0 were backfilled as GitHub Releases following PR 119's established
   policy. Live reconciliation now verifies all 74 tags.
7. **Research existing solutions and report related upstream defects.** Primary
   sources and component choices are in `online-research.md`. The exact
   download-artifact defect already has open upstream issue 484; the other two
   defects are caller errors, so no misleading duplicate reports were filed.
8. **Add optional diagnostics only if evidence is insufficient.** Every observed
   failure and warning has a deterministic reproduction and source-level cause.
   Additional production debug output would add noise and is unnecessary.

## Timeline (UTC)

- **2026-08-08 17:18** — PR 64 merged broad fail-closed release hardening.
- **2026-08-12 11:16** — PR 119 merged release reconciliation and backfilled 22
  earlier orphan tags.
- **2026-08-12 14:46** — release commit/tag `v0.56.0` was created after that
  backfill, but no GitHub Release or Docker Hub tag followed.
- **2026-08-13 06:00** — PR 129 moved historical orphan enforcement to the
  scheduled workflow so an old orphan would not block a current release midway.
- **2026-08-14 15:30 UTC (commit time)** — commit `ee92d74` added pinned SBOM
  generation and its incorrect extension-bearing override.
- **2026-08-15 05:29** — release commit/tag `v0.73.0` was created; crates.io
  published it at 05:33, but no GitHub Release or Docker Hub tag followed.
- **2026-08-15 06:59–07:00** — scheduled run 31870808848 failed and named both
  orphan tags.
- **2026-08-15 12:03** — PR 183 merged as `f947ce6`; pipeline run 31883615151
  started. The separate tunnel-image run 31883620590 passed at 12:03:58.
- **2026-08-15 12:19** — v0.76.0's GitHub Release was created while warning
  about the two historical orphans.
- **2026-08-15 12:24** — both amd64 and arm64 binary jobs failed moving the
  nonexistent SBOM filename.
- **2026-08-15 12:25–12:26** — both native image jobs warned that attestation
  storage records could not be persisted because permission was missing.
- **2026-08-15 12:27** — manifest publication succeeded but download-artifact v8
  emitted Node `DEP0005`; the overall run ended failed.
- **2026-08-15 13:42** — issue 184 was opened.
- **2026-08-15 13:59** — v0.56.0 and v0.73.0 GitHub Releases were backfilled;
  live reconciliation passed for all 74 default-branch tags.
- **2026-08-15 14:05–14:06** — fresh GitHub-hosted reconciliation run
  31888991759 passed; its checkout hint identified the last standalone-workflow
  warning and motivated the shared default-branch configuration in this PR.

## Root causes, effects, and fixes

### 1. Binary artifact jobs: hard failure

The pinned cargo-cyclonedx formatter always appends `.json` to a custom override.
The workflow supplied `link-assistant-router.cdx.json`, producing
`link-assistant-router.cdx.json.json`, then attempted to move
`link-assistant-router.cdx.json`. Both matrix legs failed identically, leaving the
v0.76.0 Release without the promised binaries, checksums, SBOMs, or attestations.

**Fix:** pass the basename `link-assistant-router.cdx`; keep the existing strict
move, JSON structure check, checksums, upload, and identity verification. A static
regression test ties the command to the expected generated path.

### 2. Native image attestation: repeated warning

`push-to-registry: true` asks the attestation action to persist an artifact
metadata storage record. The matrix job granted `contents`, `packages`,
`id-token`, and `attestations`, but not `artifact-metadata: write`. The action
created provenance but warned when persistence failed in both architectures.

**Fix:** grant `artifact-metadata: write` on the shared matrix job. The test scopes
the assertion to that job so a permission elsewhere cannot create a false pass.

### 3. Manifest artifact download: deprecation warning

download-artifact v8 bundles an extraction dependency that invokes deprecated
`Buffer()` under Node 24. This is upstream issue 484, not repository JavaScript.

**Fix:** pin the immutable v7.0.0 commit used by the reviewed template until the
upstream v8 issue is fixed. Upload-artifact remains on its current warning-free v7.

### 4. Release reconciliation: real repository drift

The scheduled job correctly reported v0.56.0 and v0.73.0. They were not false
positives: both are version tags reachable from main and release commits with
changelog content. PR 119 explicitly established that this repository backfills
such tags even if a historical crates.io version is absent (v0.56.0 is absent;
v0.73.0 exists). The prior code intentionally warned rather than blocking a new
release; only external state could clear the scheduled failure.

**Fix:** create both missing Releases from their immutable tags with generated
comparison notes. Do not weaken reconciliation or delete release history.

### 5. Change detection and changelog checks: false negatives

An extension allowlist recognized Rust/TOML/JS/YAML but missed extensionless
`Cargo.lock` and `Dockerfile`, shell scripts, JSON manifests, JSX, and future file
types. Even recognized JS changes did not enter the lint/audit conditions. The
changelog script independently limited source files to `src`, `tests`, `scripts`,
and Cargo.toml, so UI, Docker, workflow, and lockfile changes could bypass policy.

**Fix:** invert the policy. Every changed file is build-relevant unless it is in a
small documented non-build set (`changelog.d`, `dev/log`, docs, examples,
experiments, or Markdown). Cargo.lock is also reported through the existing TOML
gate. Lint and audit use `any-code-changed`. Behavioral tests cover each formerly
missed surface and every exclusion.

### 6. Admin UI: missing check and hidden warning

CI audited UI dependencies but never installed or built the source. Rust embeds
committed `ui/dist`, so malformed source or a stale bundle could pass. The first
local build reproduced a second defect: the 532.38 kB monolithic bundle emitted
Vite's 500 kB warning.

**Fix:** `npm ci`, build in CI, fail if Vite prints a warning, and reject any diff
from the committed bundle. Deterministic vendor splitting removes the warning and
produces chunks below 500 kB; a test enforces that threshold.

### 7. Workflow cancellation: partial-release risk

Workflow-level `cancel-in-progress: true` applied equally to PR checks and main or
manual release runs. A newer event could terminate an active writer between tag,
crate, Release, binary, and image stages—the same class of partial state that
created historical orphans.

**Fix:** use GitHub's expression support to cancel only pull-request runs. Main
pushes and manual releases finish once started, while superseded PR feedback stays
fast. This is safer for this multi-job release architecture than giving dependent
writer jobs one shared job-level group, where GitHub retains only one pending job.

### 8. Development evidence: file-size false positive

The repository intentionally archives upstream source and CI evidence under
`dev/log`, and change/changelog detection excludes it. The Rust line-count check
did not share that exclusion, so the preserved 1,118-line cargo-cyclonedx source
made local CI fail even though it is immutable research evidence.

**Fix:** exclude `dev/log` alongside generated `target`, `.git`, and
`node_modules` trees. Product Rust files remain subject to the 1,000-line limit.

### 9. Standalone reconciliation checkout: Git hint

The warning scan of the successful post-repair run found Git's default-branch
initialization hint in `actions/checkout`. The primary workflow already suppresses
it using repository-local `GIT_CONFIG_*` environment entries, but the standalone
scheduled workflow did not.

**Fix:** give the reconciliation workflow the same `init.defaultBranch=main`
configuration and retain a workflow regression assertion.

## Verification plan

Focused checks cover the exact failures first, followed by formatting, all script
unit tests, release invariants, the full Rust suite, Clippy, documentation,
package, npm audit/build, workflow lint, file-size checks, and a final clean-tree
review. After push, fresh PR CI must be matched to the latest commit SHA and every
non-passing log downloaded before the PR is marked ready.
