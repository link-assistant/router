# Issue #725 implementation plan

This file records the local validation checkpoint. Final CI results and
readiness are recorded in [PR #750](https://github.com/link-assistant/router/pull/750).

- [x] Read issue #725 and every comment on issue and PR #750; verify prepared branch.
- [x] Read model-truth contract, adapter paths, contribution rules and upstream suffix/applier/test matrices.
- [x] Record upstream revision and reproduce missing suffix/cross-protocol behavior with minimum automated tests.
- [x] Implement canonical parser, extraction, capability validation and seven target appliers.
- [x] Integrate adapter and routing paths while preserving body-control precedence and signature replay.
- [x] Port all five upstream matrix families and add bounded parser property tests and routing regressions.
- [x] Document suffix grammar and model-truth interaction; add release changelog fragment.
- [x] Verify aggregate catalogs publish their optional thinking metadata through the strict generated contract.
- [x] Run focused tests, all local tests, formatting, Clippy, file-size and terminology checks; preserve logs.
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

All 117 integration targets passed: 847 tests passed, with the existing soak
test left for its dedicated CI workflow. The corrected Codex feature matrix
and all five upstream matrices pass. A final upstream grammar comparison also
reproduced and fixed signed-zero parsing before the next final validation run.

Local unit validation uses four exhaustive file partitions because ordinary,
debug-free monolithic and scattered-function library builds exceed the
workspace's 3 GB memory limit. Retries stop at a finite memory bound. The
helper preserves production code, exported/shared fixtures and all external
test parents, omits inactive private test modules, and enables every parsed
test entry point exactly once across the four shards.

Before merging PR #747, the four partitions passed 533, 598, 456 and 579 Linux
unit tests (2166 total).
The second partition initially exposed the agent's `CODEX_HOME` override in an
existing home-fallback test. Removing that variable from child processes made
the isolated test and complete partition pass; production behavior is unchanged.
All 15 documentation tests and the independent library consumer pass, as do
the Node, Bun and Python bindings, contract generators and compatibility checks.

The final WebSocket review reproduced a capability bypass: the same exact
Codex catalog dropped unsupported HTTP thinking, while WebSocket turns still
forwarded it. The connection now retains its selected account and endpoint for
validation on every turn. The regression passes together with all 70 Router
end-to-end tests and all four focused thinking test targets. All six existing
WebSocket unit tests also pass. Strict Clippy, formatting, Rust documentation,
file-size and terminology checks pass before committing this fix.

Main advanced to aa05022968413f00822085b8463415351c5d2fb0 while validation ran.
PR #747's management access changes merge without conflicts; README's thinking
documentation and both module sets remain. The combined tree passes strict
Clippy, formatting, file-size and terminology checks. Complete local suites
will be rerun against the merged tree, including its new management tests.

Final contract review reproduced the aggregate catalog rejecting its documented
thinking metadata: `contracts::validation::http` returned `Additional properties
are not allowed ('thinking' was unexpected)`. The new contract-inventory test
failed before changing the generator. OpenAPI and JavaScript/Python types now
declare the optional property; regeneration, backward compatibility and strict
TypeScript checks pass. All five Cargo contract-inventory tests pass, including
the new regression.
The complete merged integration run passes 858 tests across 118 targets; this
additional contract case brings the verified integration total to 859.

The first merged unit partition passes all 472 Linux tests, and all three binary
targets pass with no test cases. Its queued continuation was stopped before
compilation; the other three partitions now use `--library-only` with binaries
verified separately. This avoids recompiling production solely to link empty
binary test targets, while preserving the same exhaustive library partitions.

CI run 37878525988 was created at 2026-10-09T03:16:36Z for commit a951557,
after its push. Linux, macOS, Windows, lint and all six companion workflows
pass. The coverage job is the sole failure: 76610 / 88360 lines, 86.702128%,
below the 86.756772% baseline. The full preserved workflow log reports that at
`ci-logs/pipeline-37878525988.log:25236`; the job log reports it at
`ci-logs/coverage-37878525988-113661394773.log:8439`.
The downloaded LCOV report identifies missed native-control removal, legacy
reasoning-level facts, snake-case Gemini controls, native URL selectors and
Anthropic output-limit paths. Ten request-based tests now cover these behaviors;
all 21 focused request cases pass locally. The next CI measurement is recorded
below.
The coverage floor, tolerance and exception policy remain unchanged.

The second and third merged unit partitions pass all 560 and 521 tests.
All 15 documentation tests and the independent library consumer pass.
The last 624-test partition reached the finite compiler memory bound before
running tests. Its two exhaustive eight-way subsets pass 220 and 404 tests;
all 2177 Linux unit cases are now verified. The contract regression and ten
additional thinking cases bring the integration total to 869 across 118 targets.
Strict Clippy and Rust documentation, formatting, vendor fixtures, file-size,
terminology, release-workflow and workflow-tool checks pass. All fourteen
automation script suites pass, including the release fixture in its temporary
repository. Logs remain in the ignored `ci-logs/` directory.

Main subsequently published release 6656dc142fde87acf35e67072df5bae49144f33b
(v1.19.0). Its diff contains version metadata and the consumed management
changelog fragment only. It merges cleanly. After rebuilding the versioned
binary, all 167 cases in the version-sensitive, CLI, catalog, Router end-to-end
and four thinking targets pass. Generated contracts, binding parity and
backward compatibility against the release commit also pass. Node, Bun and
Python each pass their nine real-binary binding cases, and strict
TypeScript passes. The initial contract and JavaScript rechecks used the
cached 1.18.6 binary; rerunning against the rebuilt 1.19.0 binary passes.
Python uses the existing isolated binding environment.

CI run 37890500554, created at 2026-10-09T05:50:31Z for `f815e27`, measures
76692 / 88360 lines (86.794930%). Its coverage gate passes; the sole coverage
failure requires committing that reviewable baseline increase. The preserved
job log records the measurement at
`ci-logs/coverage-f815e27-113696010429.log:8456` and the reviewability error at
line 8489. The downloaded report advances the committed baseline through the
existing checker; all eight coverage-policy tests pass. No floor, tolerance,
exception or test-discovery rule changes.

Main advanced to ccc9d8d0500df6d3bf942173befc9bd5cb6393af (provider
onboarding). Its reviewed connector, credential-acceptance and refresh changes
are merged. The sole conflict is the coverage baseline: retain the higher
measured 86.794930% increase rather than main's 86.776613% increase.
All 115 focused catalog, connector, Router end-to-end and thinking integration
cases pass, together with all six credential-acceptance unit cases. This brings
the verified integration total to 878 across 119 targets. Formatting, file-size,
terminology and strict all-target/all-feature Clippy pass on the combined tree.
The initial Clippy run stopped at its finite 2350 MiB memory bound, without a
lint error. A finite 2450 MiB retry passes, observing a 2390160 KiB peak.
Both logs are preserved; final CI verifies the unpartitioned combined source.

CI run 37897142179, created at 2026-10-09T07:06:23Z for `a849b0d`, passes
Linux, macOS, Windows, lint and all six companion workflows. Coverage measures
76827 / 88498 lines (86.812131%); its gate passes, and the only failure again
requires committing the measured increase. The preserved full workflow log
records the measurement at `ci-logs/pipeline-37897142179.log:14667` and the
reviewability error at line 14700. The existing checker advances the baseline
to 86.812131%, and all eight coverage-policy tests pass. The floor, tolerance
and exception policy remain unchanged.

Main's v1.20.0 release, dc9a6e3417b055f117b0706dd0551043d447a32a, merges
cleanly and changes only version metadata and its consumed changelog fragment.
The rebuilt v1.20.0 binary passes all 167 version-sensitive, CLI, catalog,
Router end-to-end and thinking cases. Generated contracts, binding parity,
backward compatibility, strict TypeScript and all nine binding cases each in
Node, Bun and Python pass. Formatting and strict all-target/all-feature Clippy
also pass; the finite Clippy run observes a 2389420 KiB peak. Final CI must
verify the committed measured baseline and run the dependent package build.

Commit 62b92c7 passes all seven workflows, including the dependent package
build in CI run 37901940334. While packaging ran, main merged PR #748's
account routing policies. Review of the combined handlers found suffixes
lost during alias resolution and retries cloning the first account's
constrained payload. Four minimal HTTP regressions fail before the fix:
alias suffix requests return 403, a dropped budget is missing on retry,
suffix budgets are not independently clamped, and a budget invalid for
the second account returns 200 instead of 400. The preserved log is
`ci-logs/account-policy-thinking-red.log`; bridge coverage is added in
`tests/thinking_account_policy_test.rs`.
The merge retains the higher measured coverage baseline. Main's v1.21.0
release metadata is also fetched for inclusion before the next push.

The Codex policy fixture uses the real serialized `ClientProtocol` value,
exposing a second scope mismatch: live discovery emits `open_a_i_chat` and
`open_a_i_responses`, while the validator understood only manually written
public protocol aliases. The minimal evidence regression fails before fixing
the validator (`ci-logs/catalog-protocol-spelling-red.log`). Matching the
typed discovery serialization retains existing public aliases and keeps
different protocol scopes unknown.

The native Gemini-to-Codex regression then fails with `thinking level high
is not supported by the exact model`: the intermediate Chat representation
had erased the caller's Gemini source and suffix intent. The native bridge
now retains both in an internal task scope for selected-account validation.
The preserved failing log is `ci-logs/native-policy-thinking-origin-red.log`.

The combined account-policy source passes all 47 focused cases: fourteen
existing policy HTTP tests, eleven policy tests, seven new policy-thinking
regressions and fifteen thinking-evidence tests. The compressed Codex retry
retains explicit effort and summary while removing encrypted history from
the previous account. Formatting, the 1000-line file limit, terminology,
generated contracts, binding parity and strict TypeScript pass. Strict
all-target/all-feature Clippy passes under the finite 2450 MiB bound,
observing a 2447080 KiB peak.

Main's release at a8232ff8e745a465b339d8afadf410fdef075976 is v1.21.0.
Its metadata-only merge is reviewed and rebuilds the actual Router 1.21.0
binary. All 201 affected CLI, contract, catalog, routing and thinking cases
pass, including the new policy regressions. All nine binding cases each in
Node, Bun and Python, strict TypeScript, generated contract/binding parity,
backward compatibility, formatting, file-size, terminology and vendor
fixtures pass against that rebuilt binary.
Strict all-target/all-feature Clippy also passes on the v1.21.0 merge,
observing a 2408952 KiB peak under the same finite bound. The complete
combined-source local rerun is complete: all 2,178 Linux unit tests, 912
integration cases across 122 targets, fifteen documentation tests, the
independent Rust library consumer and the three binary targets pass. All
fourteen automation script suites, release preparation/retry experiments,
remote checkpoint contracts and workflow invariants pass. Strict Rust
documentation also passes, with a 1525612 KiB peak.

Seven of eight temporary unit partitions pass directly. Partition 4 reaches
the finite 2350 MiB compiler bound at 2407476 KiB before executing tests.
Repartitioning that same file group as partitions 4 and 12 of sixteen runs
all 112 and 108 remaining tests successfully, with respective peaks of
2285496 and 2191288 KiB. No Linux unit entry point is omitted or repeated.
Logs remain in `ci-logs/all-units-policy-merge.log` and
`ci-logs/unit-policy-partition4{a,b}.log`.

Main subsequently advances to 645931fcf0b260ebac5d13318f72d86af17230e4
through PR #754, updating only the pinned Node/Python setup actions in two
workflow files. Both diffs and the merged PR are reviewed. The merge changes
no application, test, dependency, package or contract source, so the complete
local results above remain applicable. Release workflow invariants, the tool
installation check across all 42 jobs, its eight unit cases and formatting
pass after merging those action updates. Latest-commit CI and readiness are
recorded in PR #750 when all remote jobs finish.
