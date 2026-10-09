# Issue 724 implementation plan

- [x] Read the issue, all issue/PR comment types, contribution guidance, recent related work, and upstream reference tests.
- [x] Trace account cooldowns, quota classification, failover, session affinity, configuration, management authentication, audit logging, and API contracts.
- [x] Add minimal failing regression coverage for sibling models and terminal quota errors before changing cooldown logic.
- [x] Implement model cooldowns with account-wide terminal/auth failures, preserving vendor windows and configured usage pauses.
- [x] Implement bounded retry rounds, credential caps and retry intervals while preserving pre-first-byte failover and upstream timeouts.
- [x] Add authenticated, audit-logged runtime strategy changes and scoped cooldown reset endpoints.
- [x] Add configurable subagent parent-session affinity with default enabled.
- [x] Port the upstream quota and disconnect scenarios into the fixture harness, use a controllable clock, and property-test cooldown bounds.
- [x] Document configuration, assumptions, API behavior, reproduction and validation; add a changelog and required release trigger.
- [ ] Run targeted regressions, all local tests and repository CI checks; preserve large output in experiment logs.
- [ ] Commit atomic changes on issue-724-878028a21e67, sync main, review the PR diff and push only this branch.
- [ ] Update PR 749 title/body, inspect fresh CI timestamps and SHAs, save failed logs to ci-logs and fix actionable failures.
- [ ] Verify clean status, scope and CI; mark PR 749 ready and report its URL.
