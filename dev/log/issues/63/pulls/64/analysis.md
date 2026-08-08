# Deep analysis: issue 63 / pull request 64

## Requirements inventory

| # | Requirement | Evidence / implementation |
|---|---|---|
| 1 | Investigate the failing default-branch run, including false positives, false negatives, warnings, and errors. | Complete run 31266649164 and focused extracts are in `ci-logs/`; findings are below. |
| 2 | Compare the full file trees and CI/CD implementation of the Rust, JavaScript, and Python templates. | Trees, workflows, template heads, Rust/router diff, and Rust release-script history are in `research/`. |
| 3 | Apply relevant Hive Mind CI/CD best practices across the repository. | Locked Cargo operations, warning-as-error policy, current action runtimes, least privilege, default-branch configuration, network retry settings, documentation checks, and job timeouts were applied to all relevant build paths. |
| 4 | Report the defect to an affected template. | Current templates were checked. Rust fixed it in commit `0f922c0`; JS/Python do not share the Rust path. No inaccurate duplicate issue was opened. |
| 5 | Reproduce before fixing and prevent recurrence. | `local-reproduction-cargo-check-locked.log` reproduces the stale lock failure. The first regression run is preserved in `local-failing-regression-tests.log`; automated tests cover release synchronization, locked CI commands, action runtimes, and audit warning policy. |
| 6 | Find root causes; add opt-in diagnostics only if evidence is insufficient. | All observed failures/warnings have concrete causal evidence, so speculative permanent debug output was not added. |
| 7 | Check every occurrence in the codebase. | Cargo build invocations in CI, Dockerfile, and manual test script were audited; release jobs, all OS test jobs, lint, package, and Docker builds now use the committed lock. |
| 8 | Preserve evidence under the requested directory. | This directory contains raw metadata, all available comment channels, full CI logs, related work, template material, research, and analysis. |

## Event timeline (UTC)

1. 2026-08-07 23:22:37 — release commit `fa90d37` bumped `Cargo.toml` to 0.28.0 without updating the root entry in `Cargo.lock`.
2. 2026-08-08 15:49:28 and 15:54:34 — issue 61 / PR 62 added commits `9df6e81` and `af7e87d` to manually synchronize the lockfile to 0.28.0. Its checks passed because Cargo commands silently refreshed stale lockfiles before the repository's version assertion ran.
3. 2026-08-08 16:09:13 — automated release commit `da0bc56` bumped only `Cargo.toml` to 0.29.0, recreating the mismatch.
4. 2026-08-08 16:19:00 — PR 62 merged as `3915452`; default-branch workflow run 31266649164 started at 16:19:03.
5. 16:20–16:23 — unlocked `cargo clippy`, `cargo test`, and `cargo build` repaired their private checkout lockfiles. They therefore reported green, masking the committed mismatch.
6. 16:23:44 — `cargo package --list` performed its dirty-tree guard, listed `Cargo.lock`, and failed with exit 101. The package job exposed the mutation but was not its cause.
7. Throughout the run — checkout/cache/setup-node v4 emitted Node 20 and deprecated Node API warnings; `cargo audit` remained green while reporting two allowed warnings (`anyhow` 1.0.102 unsound and `spin` 0.9.8 yanked).
8. 16:25:02 — issue 63 was opened from that failing run. PR 64 was created at 16:25:36.

## Root causes and fixes

### Stale Cargo.lock and false-negative tests

The release script edited and staged only `Cargo.toml` and `CHANGELOG.md`. It never synchronized or staged `Cargo.lock`. The existing `cargo_lock_package_version_matches_manifest` test appeared to guard this invariant, but `cargo test` itself updates an unlocked stale lockfile before the test binary starts. That ordering made the guard a false negative.

Fixes:

- Update the named root package version in `Cargo.lock` during release versioning and stage it in the same release commit.
- Fail immediately when the expected lock entry is missing or staging fails.
- Use `--locked` in check, clippy, test, documentation, build, package, release, Docker, and manual build paths. A stale lock can no longer be silently repaired before assertions inspect it.
- Keep `cargo package` strict. Adding `--allow-dirty`, as seen in one template workflow, would convert the useful final error into a false negative.

### Green dependency audit with warnings

`cargo-audit` distinguishes vulnerability errors from warning categories. Its default allowed `anyhow` unsoundness and a yanked `spin`, so the job conclusion contradicted issue 63's no-warning requirement.

Fixes:

- Update `anyhow` from 1.0.102 to the patched 1.0.103.
- Update the compatible transitive `spin` release from yanked 0.9.8 to 0.9.9.
- Configure audit output to deny warnings, making new informational/yanked findings fail closed. The separately justified RSA advisory remains the only explicit exception.

### Deprecated Actions runtime warnings

Core action v4 bundles target Node 20. GitHub's 2026 runner forced them onto Node 24, producing both platform warnings and bundled `punycode`/`url.parse` deprecations.

Fixes:

- Upgrade every checkout use to v6 and every cache use to v5.
- Upgrade setup-node to v6 and explicitly audit with Node 24.
- Add a regression assertion that rejects the obsolete versions anywhere in the workflow.

### Other reliability warnings and omissions

- Git's implicit initial-branch hint occurred during checkout. Global `GIT_CONFIG_*` config now sets `init.defaultBranch=main` for every job.
- Top-level permissions were implicit. They are now `contents: read`, with existing write permissions limited to publishing jobs.
- Cargo network operations had no shared retry/multiplexing policy. The current Rust template settings are applied globally.
- Jobs had no maximum duration. Each now has a workload-appropriate timeout.
- Rustdoc warnings were not checked independently. CI now builds documentation with warnings denied.
- Enabling that gate exposed stale links to removed or private symbols in four modules (`config`, `metrics`, `storage`, and `token_admin`). Those links were corrected, converting another previously invisible documentation failure into an enforced check.

## Template comparison and adoption decisions

The repository is predominantly Rust, so the Rust template is the primary behavioral reference; JS/Python trees were reviewed for cross-ecosystem workflow practices. Shared relevant practices adopted here are current action runtimes, least privilege, explicit timeouts, dependency audit gates, warning-free builds, and deterministic lockfile use.

Template features not copied wholesale include language-specific changeset tooling, coverage publication, secret-scanner installation, and template demonstration jobs. They do not address an observed router defect, would introduce new third-party/runtime dependencies, or duplicate existing router-specific checks. The router's change detector, changelog fragments, multi-OS tests, npm audit, Docker matrix, and release/publish behavior were retained.

## Verification plan

1. Rust formatting, YAML parsing, and actionlint: passed.
2. Release-script behavioral tests: 3 passed; focused workflow regression suite: 19 passed.
3. `cargo check --locked`, clippy with all targets/features, 380 crate/integration tests, doc tests, warning-denied docs, and the file-size checker: passed.
4. Warning-denied `cargo audit` and `npm audit --audit-level=high`: passed; npm reported zero vulnerabilities.
5. The default Docker runtime build exercises both locked Docker dependency steps; its result is preserved in `ci-logs/local-docker-build.log`.
6. Packaging is intentionally rerun only from a committed clean tree because its strict dirty-tree rejection is the regression signal under repair.
7. Finalization reviews the complete diff, merges current `main`, reruns clean-tree checks, pushes only the prepared branch, and verifies the resulting GitHub Actions run matches the pushed SHA.

## Final CI result

GitHub Actions run 31268242910 completed successfully for implementation SHA
`694f9039ccd8451ebf34778531859f6f557613f8`. Every executed gate passed,
including warning-denied lint/documentation, dependency audits, tests on Linux,
macOS, and Windows, strict package creation, and the Docker build. A scan of
the complete log found no actual warning/error annotations or deprecation
messages; apparent broad keyword matches were only compiler command-line flag
names. The complete log and structured run/job metadata are preserved here.
