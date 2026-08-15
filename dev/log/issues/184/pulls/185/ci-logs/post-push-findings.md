# Post-push CI findings

- Verify Releases run `31889301970` at `12aee5c5f6a71f15123f282150c96fa2a7005ae2` passed and its log contains no warning, deprecation, error, or failure matches.
- CI/CD run `31889290575` tested that same SHA. Detection, audit, changelog, coverage, and the Linux/macOS/Windows suites passed.
- The lint job failed at `lint-95023148214.log:1045-1053`: `tests/release_workflow_test.rs` had grown to 1,008 lines, exceeding the 1,000-line limit.
- Root cause of the misleading local success report: the aggregate validation shell enabled `pipefail` but not `errexit`, so the final status banner hid the nonzero file-size command.
- Fix: move the seven new CI-specific regression cases into `tests/ci_regressions_test.rs`. The files are now 916 and 79 lines, respectively, and fail-fast local validation passes.
