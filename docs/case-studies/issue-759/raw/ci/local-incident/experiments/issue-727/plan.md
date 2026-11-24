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
- [x] Finish every integration target, binary/documentation tests, the Rust host
  consumer and generated Go/Java/PHP probes; retain their complete local logs.
- [x] Review the final diff, commit and push only the prepared branch.
- Require fresh passing workflows for its exact SHA before readiness.
- Recheck main ancestry, comments and clean status, update the PR's test evidence,
  and mark PR #752 ready.

## Observability merge

- [x] Detect main advancing to `9b0a991` while CI runs and inspect PR #753's
  observability implementation, generated contracts, and validation evidence.
- [x] Resolve registration/generator conflicts by retaining both endpoint sets,
  preserving the measured higher coverage baseline, and regenerating artifacts.
- [x] Expand the public route-ID regression, reproduce RequestLog's incorrect
  96 ordinal, and append ModelDefinitions at 102 to preserve main's IDs 95–101.
- [x] Verify 15 catalog and 21 CLI regressions, all 22 affected observability,
  management-security and compatibility integration tests, strict Clippy,
  formatting, repository checks and contract compatibility against main.
- [x] Review combined contracts/bindings and unchanged existing routes; verify
  all binding suites and compile/exercise Go, Java and PHP clients (366 HTTP
  operations). Recheck that main remains at the merged `9b0a991`.
- [x] Rerun the complete merged suite with bounded compilation: 2,195 distinct
  unit tests, all 119 integration targets (880 passing tests and the separately
  exercised timed soak), all binary targets and 15 documentation tests pass.
- [x] Commit the resolved merge and push only the prepared branch.
- Inspect final-head workflows and any failed logs/coverage artifacts, update
  the PR's validation evidence, and mark it ready only after passing CI.

## v1.22.0 release and instrumented callback-test failure

- [x] Inspect main's `bc8b453` release: only version/release metadata changes;
  merge it after completing the full suite so tests do not mix package versions.
- [x] Preserve the failed instrumented-test log on `621119d`; identify the
  callback test's shared ephemeral-port assertion (`113955481825`, lines
  6225–6236). No coverage report was generated, so do not change the baseline.
- [x] Reproduce immediate rebinding failing after listener-task completion when
  another listener owns the released port. Check the specific callback server's
  task completion in success, provider-error, timeout and drop regressions.
- [x] Rebuild v1.22.0, regenerate contracts/bindings and verify their matching
  versions; all 15 catalog, 21 CLI and seven OAuth tests pass, as do strict
  all-target/all-feature Clippy, formatting, repository checks, compatibility
  and all binding suites (nine tests each) and TypeScript checks.
- [x] Match all 2,195 unit names against ordinary Linux CI. Reproduce and fix
  the inventory parser's handling of interleaved subprocess output; require a
  passing summary and verify five evidence-parser regressions.
- [x] Verify all 49 API/provider/packaging/contract/observability/security
  regressions, binding suites, Rust documentation and the independent host
  consumer on v1.22.0. The finite 60-second soak passes with 543 requests,
  zero failures, no RSS/file-descriptor growth and no token reservations.
- [x] Commit the release merge and callback-test correction separately and push
  only the prepared branch.
- [x] Preserve `a4ad404`'s instrumented-test report: every test passes and the
  measured 78,332 / 90,108 lines require advancing the baseline to 86.931238%
  (`coverage-job-113974654490.log:7942`). Reproduce that mutation, verify the
  corrected value is unchanged and rerun all eight coverage-checker regressions.
- Require all workflows for the exact final SHA to pass before updating
  evidence/readiness.
- Recheck main ancestry, issue/PR comments, the complete PR diff and clean status.

## Thinking merge

- [x] Detect main advancing to `d9f541b` (PR #750), read its implementation and
  all comments/reviews, and merge it while preserving the higher measured
  coverage baseline.
- [x] Trace ingress normalization, policy ownership, source alias projection
  and provider forwarding; verify that recognized suffixes authorize the base
  selector and do not promote operator metadata to authenticated capability
  evidence.
- [x] Extend the existing full HTTP regression for effort/numeric suffixes,
  explicit-body precedence and protected subscription selectors; the combined
  implementation passes these cases without a production routing change.
- [x] Verify the streaming suffix case, generated artifacts, contract
  compatibility and all JavaScript/Bun/Python binding suites on the combined
  executable.
- [x] Run fresh strict checks and the complete combined suite: 2,197 distinct
  units, 924 integration tests across all 124 targets, binary targets and 15
  documentation tests. Rust documentation and the independent host consumer
  pass. The finite 60-second, 16-client soak completes 629 requests with zero
  failures, bounded RSS growth and zero outstanding token reservations.
- [x] Commit the resolved merge and push only the prepared branch (`f64cd3e`).
- Require every workflow for its exact head to pass; investigate actual
  failures using saved logs and measured coverage artifacts.
- Recheck latest main and user edits/comments, update complete validation
  evidence, confirm clean status and mark PR #752 ready.

## v1.23.0 release sync

- [x] Finish the complete thinking/source suite before changing package versions.
- [x] Fetch main again and inspect `0f2da83`: only release/version metadata
  changes. Merge it without conflicts, retaining the source feature's minor
  changelog fragment and the higher measured coverage baseline.
- [x] Rebuild v1.23.0 and verify matching generated contracts and bindings,
  strict checks, focused catalog/CLI/OAuth cases, all 159 release-sensitive API
  and thinking tests across 14 targets, documentation and host consumers.
  JavaScript/Bun/Python each pass nine tests; generated Go/Java/PHP clients
  compile and exercise the real Router. The finite 60-second soak completes
  730 requests with zero failures, bounded resources and zero reservations.
- [x] Compare all 2,197 local unit names with both the instrumented and ordinary
  Linux CI suites; the inventories match exactly.
- [x] Commit the tested release sync, retaining regular merge history.
- [x] Preserve `f64cd3e`'s failed coverage job and measured artifact: every
  instrumented test passes, but 79,754 / 91,676 lines require advancing the
  reviewable baseline to 86.995506% (`114014049846`, line 8626).
- [x] Reproduce that exact mutation using a baseline copy, verify an unchanged
  value after correction and pass all eight coverage-checker regressions.
- Push only the prepared branch and require passing workflows on its final SHA.
- Recheck latest main, all issue/PR comments and human description edits,
  review the final diff and clean status, then mark PR #752 ready.
