# Issue 642 execution plan

1. Read parent, all eight sub-issues and paginated comments; inspect PR 643's discussion/reviews and recent related PRs.
2. Research official provider, OS credential-store, container isolation and GitHub Actions delivery contracts; preserve sources and evidence in the requirements analysis.
3. Map every requirement to production paths, test helpers, CI, docs and acceptance coverage. Record unavailable live/macOS/Docker evidence explicitly.
4. Reproduce regressions with minimal automated tests before fixes: fresh GLM defaults, copied Apple fixture, false Anthropic proof, missing safety/version preparation, update preservation and delivery state.
5. Implement isolated safe real-client execution and common compile-time version preparation, including all version/doctor/TUI calls and process cleanup. Distinguish preparation from compatibility.
6. Replace the active-profile process fixture with a portable compiled executable; inspect early exits and environment visibility.
7. Implement catalog-authorized fresh z.ai GLM-5.3 preference with saved/explicit precedence and documented absent/unhealthy behavior; verify exact outbound requests and responses.
8. Split mocked/live entitlement claims and add live mixed-provider assertions, exact selection and responses without secret output. Keep parity false for missing live evidence.
9. Add namespaced local staging identity, bounded diagnostics, separate root/port/secret/tokens/logs/profile selection, resource ownership and limits; preserve OAuth single ownership and primary resources; JSON verification and cleanup coverage.
10. Add old/candidate auth-source, signed-token, provider-union and persisted-state preservation gates across local/host/remote update paths; refuse unverifiable/lossy transitions before cutover. Retain additive restore.
11. Investigate missing SHA-specific main run; add observable delivery states, idempotent explicit recovery and partial-publication verification with merged source/artifact provenance checks.
12. Add changelog/release trigger and full requirement/solution matrix. Commit useful atomic steps on issue-642-caa846709c6f only.
13. Run relevant focused checks, full cargo test --all-features, fmt, clippy, file-size/terminology/script/workflow checks; preserve large logs.
14. Fetch/merge current main without rewriting history; push only prepared branch; update PR 643 with reproduction, tests, limitations and one Fixes keyword for each of 634-642.
15. List recent CI timestamps/SHAs, download non-passing logs to ci-logs, diagnose actual errors, fix and revalidate. Read logs in chunks <=1500 lines.
16. Review gh pr diff and requirements consistency; ensure no requested features removed and clean tree; wait for all background work and required CI; mark PR 643 ready.

Implementation and evidence: steps 1–12 cover production code, reusable
verification, CI and documentation. Useful atomic commits preserve the model,
process-safety, deployment-checkpoint and staging-acceptance changes. Local checks
include all 80 integration targets (614 tests), router binary tests, strict Clippy,
docs and script checks, plus all 13 pinned actual-client offline tests. Full
library testing runs in CI because local compilation exceeded the 3 GiB memory
cap. macOS CI completed the full library suite and ten active-profile repetitions.

Investigated CI failures have preserved logs under ci-logs: Windows free-space
inspection, pinned Claude auxiliary requests, coverage changes, and macOS restore
through the system temporary-directory alias. The latter now has a finite
reproduction in restore-temp-alias.py. Black-box CLI tests additionally caught the
documented staging --json flag missing from the parser. Coverage improvements use
ownership, preservation and CLI refusal tests; the existing coverage gate remains.

The fb7eb6b CI run passed Ubuntu/macOS, all real-client jobs and the unchanged
coverage gate (85.427764%, within its existing tolerance of 85.433542%). Windows
passed both bounded process tests and all 1,787 library tests, then reproduced
native backslashes in a checkpoint manifest at windows-36730039100.log:5554.
Checkpoint keys now use slash-separated components; a native nested-path
capture/restore regression verifies the schema on each platform. The full
65-requirement alternatives/implementation/evidence matrix is committed with it.

Completion conditions for steps 14–16: merge any new default-branch commits,
review the final PR diff and requirements, preserve the coverage ratchet,
verify every available check against the final pushed SHA and timestamp, update
the PR's validation and evidence limits, and mark PR 643 ready with a clean tree.
Live acceptance prerequisites remain documented in docs/plans/issue-642.md; an
offline or skipped test must never upgrade those claims to proven.
