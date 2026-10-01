# Issue 648 / PR 649 evidence index

The evidence used to investigate [issue #648](https://github.com/link-assistant/router/issues/648). The raw logs are kept so that the findings can be reproduced rather than taken on trust. `*.log` files are gitignored and were force-added.

## Start here

- `analysis.md`: requirements, timeline, root causes, fixes, guards, upstream reports, follow-ups and v1.15.0 recovery.
- `online-research.md`: primary sources and existing tools that were considered.
- `templates/comparison.md`: router compared with the Rust, JS and Python pipeline templates, plus the best-practice mapping.

## Primary evidence

- `issue.json`, `issue-comments.json`, `pr.json`, `pr-issues-649-comments.json`, `pr-pulls-649-comments.json`, `pr-pulls-649-reviews.json`: issue and PR data from all three comment APIs.
- `ci-runs.json`, `ci-run-*.json`: run identity, timestamps, conclusions and SHAs.
- `ci-logs/ci-cd-pipeline-36764352534.log`: the failing release pipeline (the exit-127 lines are at 71081, 73093, 75116 and 77135).
- `ci-logs/ci-cd-pipeline-36735571746.log`: the earlier flaky Windows failure (fixed by PR #647).
- `ci-logs/verify-releases-36868283492.log`, `ci-logs/delivery-36869539282.log`, `ci-logs/delivery-36915711942.log`, `ci-logs/real-clients-36853576142.log`: scheduled workflow logs.
- `annotations.tsv`, `jobs.tsv`: every annotation and job of the failing runs.

## Local reproductions and verification

- `ci-logs/local-check-workflow-tools-{before,after}-fix.log`: the per-job tool check on main (fails) and on the branch (passes).
- `ci-logs/local-cargo-check-manifest-warning-{before,after}-fix.log`: the Cargo manifest warning, then its absence.
- `ci-logs/local-zizmor-1.30.1-{main,branch}.log`, `ci-logs/local-actionlint-1.7.12-{main,branch}.log`: workflow linters on main and on the branch.
- `ci-logs/local-cargo-audit-0.22.2-deny-warnings.log`: the dependency audit is clean with warnings denied.
- `ci-logs/local-cargo-test-release-and-bins.log`: `tests/release_workflow_test.rs`, `tests/release_docker_test.rs` and both bin targets pass on the branch (146 tests in each bin, 3 and 27 in the release test files).
- `ci-logs/local-cargo-test-all-features-oom.log`: the full `cargo test --all-features` cannot compile the library's unit-test crate on the 11 GB sandbox (rustc was SIGKILLed even with `-j 2`). The full suite is verified by the PR's CI matrix instead.

## Templates

- `templates/*-inventory.txt`: CI/CD file inventories of the router and the three templates.
- `templates/CI-CD-BEST-PRACTICES.md`: a snapshot of the hive-mind guidance.
- `templates/upstream/*.md`, `templates/upstream-issue-urls.txt`: bodies and URLs of the six upstream issues.
- `ci-logs/template-rust-per-job-install-repro.log`, `ci-logs/template-rust-cargo-warning-repro.log`: reproductions on Rust template `e7d4a5b`.
