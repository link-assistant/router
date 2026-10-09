# Issue #727 implementation plan

- [x] Read issue #727 and all comments, PR #752 conversation/review comments, contributing guidelines, and source proposal.
- [x] Trace compiled definitions, live catalogs, model routing, token authorization, configuration, startup tasks, management authentication, schema generation, and SSRF transport.
- [x] Reproduce the absent CLI flags with a failing script and unit test; add coverage for source validation, precedence, refresh, last-good retention, private-network rejection, size limits, local entries, management access, and inference identity.
- [x] Implement bounded, validated external catalog sources and deterministic merging without expanding subscription authorization.
- [x] Wire periodic refresh, configuration/environment, local model flags, and management definitions endpoint into existing mechanisms.
- [x] Document format, precedence, error behavior, policy limits, and runnable local example; add minor-release changelog fragment.
- [ ] Run focused tests, full tests, formatting, Clippy, repository contract checks, and review diff; preserve verbose logs locally.
- [ ] Merge latest main, commit atomic completed changes, and push only issue-727-61ea612f008e.
- [ ] Update PR title/body with implementation and test evidence; inspect fresh CI runs by timestamp and SHA, download failed logs to ci-logs and resolve failures.
- [ ] Verify clean worktree, consistent final diff and documentation, passing CI; mark PR #752 ready.

Baseline CLI reproduction and unit regression both fail because the new flags are absent. Full unsharded libtest compilation exceeded the 3 GiB cgroup limit; use the existing AST sharder and rustc memory wrapper for local testing. The repository removed compiled inventories in issue #192, so definitions overlay authenticated live catalogs instead of restoring static routing authority.
