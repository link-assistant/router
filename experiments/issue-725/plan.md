# Issue #725 implementation plan

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
all 21 focused request cases pass locally; a fresh CI measurement is pending.
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
changelog fragment only. It will be merged after the current checks finish,
then the version-sensitive tests and generated contracts will be verified.
