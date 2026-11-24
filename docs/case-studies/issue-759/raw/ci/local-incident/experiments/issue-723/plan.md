# Issue 723 implementation plan

This records the implementation checkpoint before final CI. The latest CI,
full-suite validation and readiness results are recorded in PR 748.

- [x] Read issue, parent case study, all PR comments, contribution guidelines and recent related changes.
- [x] Trace credential persistence, CLI/management editing, selection/failover, model catalog, translations and subscription policy enforcement.
- [x] Add minimal failing tests for weighted routing, persisted prefixes and disable-cooling before implementation; extend coverage for the remaining policies.
- [x] Implement backward-compatible per-account policy storage and editing with validation.
- [x] Integrate weighted selection, cooling/retry overrides and model-aware eligibility.
- [x] Apply aliases/exclusions to discovery, requests and responses; enforce token policies against upstream names.
- [x] Apply allow-listed client header copies and pre-first-byte request-scoped error actions.
- [x] Document policy configuration, add examples/changelog and prepare the release trigger.
- [x] Run focused tests, formatting, strict Clippy, generated-contract compatibility, file-size/terminology checks and language binding tests; preserve large logs.
- [ ] Run the full Rust integration, library and documentation suites; use a bounded compiler experiment for the local 3 GB memory limit.
- [x] Review diff for compatibility/security; reproduce and correct the live-edit selector race and public enum discriminant changes.
- [x] Reproduce and correct alias catalog collisions and unconfigured single-primary cooldowns; verify remote first-policy activation and resetting defaults.
- [x] Commit atomic implementation/review corrections and push only the prepared branch.
- [ ] Update PR 748 description, integrate current main, verify latest-SHA CI and preserve/analyze failed logs.
- [ ] Confirm clean tree, review final PR diff and mark PR 748 ready.

CI verification follows each pushed commit: list recent runs with creation times
and SHAs, verify they cover the latest commit, download every failed run's logs
to `ci-logs/`, identify the exact errors and log line numbers, then fix and rerun
the affected checks before marking the pull request ready.
