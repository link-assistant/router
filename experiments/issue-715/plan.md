# Issue 715 work plan

- [x] Verify prepared branch and clean baseline; read parent and all four issues and comments, PR discussion/reviews, contributing guidelines.
- [x] Map every acceptance requirement and candidate solution in docs/case-studies/issue-715/README.md; consult primary online documentation and recent related PRs.
- [x] Preserve failed v1.18.2 release logs; check CI runs against current commit/timestamps; diagnose actual registry failures and available publisher access without exposing credentials.
- [x] #711: trace cached request-log accounting and suite contention; write a deterministic failing regression probe before fixing the test boundary; retain protection against directory rescans, stale accounting, and overflow.
- [x] #712: trace all presence-only credential callers; reproduce scoped file/Keychain behavior using injected dependencies; fix host planning/status and fixture isolation without reading OAuth bytes.
- [x] #714: reproduce overlong generated hostnames; bound every accepted instance name with uniqueness; add maximum-length real Docker coverage and pre-mutation validation where needed.
- [ ] #713: implement safe exact-asset retry and publisher diagnostics/bootstrap guidance, registry install/hash verification, Rust publication and fail-closed stable promotion; attempt authorized external delivery only when matching approved publisher access exists.
- [ ] Run relevant small tests first, then complete local CI checks/full test suite; preserve larger logs in ci-logs, experiments and target; keep finite bounds on experiments.
- [ ] Add changelog/release trigger according to repository policy; commit useful atomic steps after checks; push only issue-715-e43111bda874.
- [ ] Update PR 716 title/body with all requirements, reproduction/tests, limitations, and separate Fixes #715/#711/#712/#713/#714 lines.
- [ ] Merge current default branch if needed, review full PR diff for regressions, inspect fresh CI logs and fix failures; verify clean working tree; mark PR 716 ready when implementation is complete.

#713 implementation and offline regressions are complete. The actual failed
source run validates, and existing integration asset attestations/checksums
pass. Public registry probes still return absent; npm/PyPI account publisher
configuration is an external delivery blocker with no matching access in this
session. Do not mark the full delivery acceptance complete from code tests.
