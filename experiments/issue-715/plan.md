# Issue 715 work plan

- [x] Verify prepared branch and clean baseline; read parent and all four issues and comments, PR discussion/reviews, contributing guidelines.
- [x] Map every acceptance requirement and candidate solution in docs/case-studies/issue-715/README.md; consult primary online documentation and recent related PRs.
- [x] Preserve failed v1.18.2 release logs; check CI runs against current commit/timestamps; diagnose actual registry failures and available publisher access without exposing credentials.
- [x] #711: trace cached request-log accounting and suite contention; write a deterministic failing regression probe before fixing the test boundary; retain protection against directory rescans, stale accounting, and overflow.
- [x] #712: trace all presence-only credential callers; reproduce scoped file/Keychain behavior using injected dependencies; fix host planning/status and fixture isolation without reading OAuth bytes.
- [x] #714: reproduce overlong generated hostnames; bound every accepted instance name with uniqueness; add maximum-length real Docker coverage and pre-mutation validation where needed.
- [x] #713 code: implement safe exact-asset retry and publisher diagnostics/bootstrap guidance, registry install/hash verification, Rust publication and fail-closed stable promotion.
- [ ] #713 external delivery: repair the approved npm/PyPI account publisher configuration and complete 1.18.2 delivery. Matching approved access is unavailable; this acceptance remains unfulfilled.
- [x] Run relevant small tests first, then the complete local Rust suite (2,149 distinct unit tests plus ordinary targets), Clippy and package/workflow/policy checks; preserve large logs and bound experiments.
- [x] Validate all 15 enabled Docker cases, including long names, host transition, relay upgrades, secret rotation and shared credentials; correct and retest the DNS cleanup assertion.
- [x] Add the repository's patch changelog trigger and preserve useful implementation steps as regular commits on issue-715-e43111bda874.
- [x] Prepare PR 716 title/body with all requirements, reproduction/tests, limitations, and separate Fixes #715/#711/#712/#713/#714 lines.
- [x] Verify current main is already an ancestor, review the implementation diff and all comment types, preserve actual CI failure logs, reproduce and fix the Ubuntu readiness port race.
- [x] Preserve the latest Windows CI log, reproduce its staging disk probe shell timeout before the fix, and replace the shell dependency with the existing native filesystem query while retaining capacity refusal and tracing.
- [x] Use PR 716 for final pushed-commit CI results, clean-tree verification and readiness status; recording those results there avoids creating another commit that itself needs CI validation.

#713 implementation and offline regressions are complete. The actual failed
source run validates; all 17 assets' attestations, all 12 checksums and both
images' platform/source identity pass. Public registry probes still return
absent; npm/PyPI account publisher
configuration is an external delivery blocker with no matching access in this
session. Do not mark the full delivery acceptance complete from code tests.
