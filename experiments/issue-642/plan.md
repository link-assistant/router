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
