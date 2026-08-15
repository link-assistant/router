# Issue 184 / PR 185 evidence index

This directory preserves the inputs and outputs used to investigate issue 184. The
large raw logs are intentionally retained so later reviewers can reproduce the
findings instead of relying on a summary.

## Primary evidence

- `issue.json`, `issue-comments.json`: complete issue and comment data.
- `pr.json`, `pr.diff`, `pr-*-comments.json`, `pr-reviews.json`: complete PR data
  from all three GitHub comment/review APIs.
- `ci-runs.json`, `ci-run-*.json`: run identity, timestamps, conclusions, and SHAs.
- `ci-logs/ci-cd-pipeline-31883615151.log`: complete 26,053-line failing pipeline log.
- `ci-logs/verify-releases-31870808848.log`: complete scheduled reconciliation log.
- `ci-logs/findings.txt`: line-addressable failure/warning index for both logs.
- `analysis.md`: requirement inventory, timeline, root causes, and disposition.
- `online-research.md`: primary-source and existing-component research.

## Comparative and historical evidence

- `*-template-ci-file-inventory.txt`, `local-ci-file-inventory.txt`: repository
  and Rust/JavaScript/Python template inventories.
- `CI-CD-BEST-PRACTICES.md`: the reviewed hive-mind guidance snapshot.
- `related-pr-{64,119,129}.*`: prior CI correctness, release reconciliation,
  and orphan-release guard changes, including every comment/review endpoint.
- `pr-183*`: the dependency update whose main run exposed the failures.
- `cargo-cyclonedx-0.5.9-generator.rs`: pinned upstream implementation proving
  the custom filename behavior.
- `upstream-*.json`, `link-foundation-cyclonedx-search.json`: upstream issue and
  code searches used to avoid duplicate reports.

## Reproduction and verification

- `ci-logs/local-failing-regression-tests.log`: five tests failing before the fix.
- `ci-logs/local-*-tests.log`: focused passing tests after the fix.
- `ci-logs/local-ui-build.log`: reproduced Vite's 500 kB warning.
- `ci-logs/local-ui-build-split.log`: warning-free split bundle.
- `repaired-release-*.json`: the two historical release objects created to
  repair live repository state.
- `ci-logs/live-release-reconciliation-after-repair.log`: all 74 default-branch
  tags reconciled successfully.
- `ci-run-31888991759.json`, `ci-logs/verify-releases-31888991759.log`: fresh
  successful GitHub-hosted verification after the state repair.

Log files are ignored by the repository's normal `*.log` rule and therefore must
be force-added when committing this evidence package.
