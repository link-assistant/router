# Issue 697 implementation plan

## Research and requirements
- [x] Verify prepared branch and working tree; read repository contributing rules.
- [x] Read parent issue and all six subissues, including all comments; preserve research snapshots.
- [x] Read PR 698 discussions/reviews, recent related PRs (#690, #686) and release gate #687.
- [x] Trace operational module ownership, CLI subcommands/outputs, HTTP route tables, verification harness and release provenance end to end.
- [x] Research existing schema, OpenAPI, language binding, semver and provenance components using primary sources.
- [x] Write a complete requirement matrix and evaluate implementation alternatives for every requirement.

## Reproduce before fixing
- [x] Add regression tests for library completeness, JSON contracts and binding parity.
- [x] Add bounded host-client-version probes (installed, absent, CI/latest, overrides and drift summary).
- [x] Add tagged-source release/attestation regression checks.
- [x] Run the new tests against the current implementation and preserve failures.

## Implement atomic changes
- [x] #695: installed version default, explicit client-version policies, provenance in verification results, warning on host drift.
- [x] #696: release commit/tag before builds; tag-context build workflow; strict asset/image provenance gate; source commit in version output.
- [x] #692: move operational modules and command dispatch to library; injectable, structured public operations; thin binaries; operation examples and semver CI.
- [x] #693: all-command JSON output, versioned published schemas, complete OpenAPI, runtime/contract checks and compatibility CI.
- [x] #691: ESM Node/Bun typed package, version-safe binary resolution, secure env/stdin, deadlines, helper fixtures, real-binary tests and release integration.
- [x] #694: declare language support; Python package and helpers; generated-client coverage; operation catalog, type/export parity, operation-language matrix and shared release gating.
- [x] Check every occurrence across both binary aliases, all operational modules, HTTP routers and all release workflows.
- [x] Add changelog fragments/release trigger; commit useful atomic changes only after their local checks.

## Validation and publication
- [x] Run focused reproductions, bindings tests and schema/OpenAPI/parity tests.
- [ ] Run all Rust tests, rustfmt, clippy, rustdoc, file-size/terminology/workflow/release checks.
- [ ] Ensure main is included, push only issue-697-deffbafb3bb4, update PR 698 title/body with all seven full closing references.
- [ ] Inspect final PR diff for regressions and removed features; verify clean working tree.
- [x] List CI runs with timestamps and SHAs; preserve failed-run logs in ci-logs; identify exact failures and fix them.
- [ ] Wait for all current-head CI runs; verify all checks pass; mark PR 698 ready.
- [ ] Final response includes PR URL, delivered behavior and verification evidence/limits.

## Working constraints
Keep experiments finite, capture large logs to files, read files in chunks of at most 1500 lines, retain reusable probes here, avoid secret values in logs and command arguments, and await all background work. Do not merge or push other branches. No delegated agent work is authorized.
