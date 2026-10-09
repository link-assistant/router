# Issue #727 implementation plan

- [x] Read issue #727 and all comments, PR #752 conversation/review comments, contributing guidelines, and source proposal.
- [x] Trace compiled definitions, live catalogs, model routing, token authorization, configuration, startup tasks, management authentication, schema generation, and SSRF transport.
- [x] Reproduce the absent CLI flags with a failing script and unit test; add coverage for source validation, precedence, refresh, last-good retention, private-network rejection, size limits, local entries, management access, and inference identity.
- [x] Implement bounded, validated external catalog sources and deterministic merging without expanding subscription authorization.
- [x] Wire periodic refresh, configuration/environment, local model flags, and management definitions endpoint into existing mechanisms.
- [x] Document format, precedence, error behavior, policy limits, and runnable local example; add minor-release changelog fragment.
- [x] Run focused tests, full tests, formatting, Clippy, repository contract checks, and review diff; preserve verbose logs locally.
- [x] Merge latest main, commit atomic completed changes, and push only issue-727-61ea612f008e.
- Finalize by updating PR title/body with implementation and test evidence, then inspecting fresh CI runs by timestamp and SHA and resolving failures.
- Finalize by verifying a clean worktree, consistent final diff and documentation, and passing CI, then marking PR #752 ready.
- [x] Recheck main before readiness; merge the newly landed account-policy feature,
  preserve its route discriminant, and regenerate combined contracts/bindings.
- [x] Reproduce policy/source interactions: missing alias metadata and automatic
  compatible-provider requests incorrectly intercepted by subscription policy.
- [x] Annotate before policy projection and retain ordinary automatic routing for
  selectors the subscription policy does not own; verify reserved alias, prefix,
  exclusion and exact-grant boundaries in regression coverage.
- Complete the local suite and strict checks against the combined merge, then
  verify main ancestry and push final changes only to the prepared branch.
- Preserve and inspect any new failed CI logs, advance the coverage baseline
  from measured artifacts when required, and require passing CI for the final SHA.

- [x] Merge the v1.21.0 release without conflicts; verify all 18 API, provider
  and packaging regressions and regenerate matching bindings/contracts.

Baseline CLI reproduction and unit regression both fail because the new flags are absent. Full unsharded libtest compilation exceeded the 3 GiB cgroup limit; use the existing AST sharder and rustc memory wrapper for local testing. The repository removed compiled inventories in issue #192, so definitions overlay authenticated live catalogs instead of restoring static routing authority.

## CI investigation

1. List recent runs with timestamps and verify their SHA matches the pushed commit.
2. Preserve failed run and job logs under `ci-logs/issue-727`; read relevant sections in chunks smaller than 1,500 lines.
3. Reproduce each failure locally before correcting it:
   - Generated Go clients: `generated-http-job-113666795114.log:2886` reports `nil is not a type`. Keep the strict source schema published separately from HTTP payload components; compile and exercise Go, Java and PHP clients afterward.
   - Rust API compatibility: `semver-job-113666795218.log:1355` reports removed unwind traits; line 1366 reports changed route discriminants. Add failing trait and ordinal assertions, preserve both interfaces, and rerun the assertions and Clippy.
   - Coverage baseline: `coverage-job-113673701659.log:7843` requires committing the increased baseline. Download the actual report and advance the baseline to its measured 86.839130%, preserving the ratchet.
4. Merge the v1.19.0 release from main, verify generated contracts against the rebuilt binary and binding versions, and rerun the unit groups with the matching package version.
5. Require all workflows for the final pushed SHA to pass before marking the PR ready; retain investigation evidence if another failure appears.

## Resume verification (2026-10-09)

- [x] Read the updated issue and all three PR comment/review endpoints; no new
  feature or review requirements were added.
- [x] Match fresh runs to commit `247aa01` and preserve failed pipeline and
  coverage-job logs. All other checks passed; the coverage gate measured
  77,623 / 89,329 lines (86.895633%) and required a reviewable baseline update
  (`coverage-job-113817763609.log:7914`).
- [x] Reproduce the baseline mutation with the downloaded report, commit its
  measured increase, and verify checker unit tests and baseline idempotence.
- [x] Merge latest main's Rust, UI and Docker dependency updates, preserving
  jsonschema 0.58.5, the link-cli upgrade and both lockfiles.
- [x] Verify strict all-target/all-feature Clippy, the unchanged built UI,
  15 catalog regressions, 21 CLI regressions, all 2,192 distinct unit tests,
  Python/Node/Bun binding tests, and generated contract compatibility.
- Finish every integration target, binary/documentation tests, the Rust host
  consumer and generated Go/Java/PHP probes; retain their complete local logs.
- Review the final diff, commit and push only the prepared branch, and require
  fresh passing workflows for its exact SHA before readiness.
- Recheck main ancestry, comments and clean status, update the PR's test evidence,
  and mark PR #752 ready.
