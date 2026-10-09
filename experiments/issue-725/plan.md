# Issue #725 implementation plan

- [x] Read issue #725 and every comment on issue and PR #750; verify prepared branch.
- [x] Read model-truth contract, adapter paths, contribution rules and upstream suffix/applier/test matrices.
- [x] Record upstream revision and reproduce missing suffix/cross-protocol behavior with minimum automated tests.
- [x] Implement canonical parser, extraction, capability validation and seven target appliers.
- [x] Integrate adapter and routing paths while preserving body-control precedence and signature replay.
- [x] Port all five upstream matrix families and add bounded parser property tests and routing regressions.
- [x] Document suffix grammar and model-truth interaction; add release changelog fragment.
- [ ] Run focused tests, all local tests, formatting, Clippy, file-size and terminology checks; preserve logs.
- [x] Review implementation diff, confirm current main is an ancestor, commit atomic changes, push only issue-725-052105988e50.
- [ ] Update PR #750 title/body with reproduction, tests, compatibility and any supported limits.
- [ ] Verify latest CI timestamps/SHA, download failed logs into ci-logs, fix failures and recheck.
- [ ] Verify clean tree, mark PR #750 ready, report PR URL and validation.

Baseline CI investigation: run 37864678384, created 2026-10-09T00:25:13Z
for prepared commit b714587b18246f405e6cd9e143d92d2d794a3aea, failed only
the changelog-fragment job. Preserved log: `ci-logs/baseline-37864678384.log`.
Line 5507 reports "No changelog fragment found in this PR"; line 5521 records
exit 1. The implementation adds a minor-release fragment. Final CI validation
must use the implementation commit's SHA rather than this baseline run.

The complete integration investigation found one compatibility regression:
Chat-to-Responses inferred an unrequested summary from flat effort. A minimal
standalone reproduction failed before the adapter fix; the new regression
covers an omitted summary and all four explicit choices. The other 116 targets
passed. The corrected code passes Clippy; the complete current-source rerun
is in progress.

Local validation uses all 117 integration targets and four exhaustive unit
shards because both ordinary and debug-free monolithic library builds exceed
the workspace's 3 GB memory limit. The retry was stopped at a finite memory
bound. The shard helper preserves production code and fixture helpers and
assigns every parsed test entry point exactly once.
