# Issue 784 work plan

Objective: implement and verify all requirements in PR #785 on
`issue-784-1f6838f56841`. Keep unresolved criteria explicit and the PR unmerged.

- [x] Read the entire issue, comments, PR conversations, inline comments and reviews.
- [x] Preserve source data and inspect required sub-issues and recent related PRs.
- [x] Research primary vendor references and existing reusable components.
- [x] Record every requirement, alternatives, chosen scope and verification mapping.
- [x] Reproduce location metadata disclosure in existing native forwarding.
- [x] Implement JavaScript default-off location handling and explicit opt-in.
- [x] Apply matching behavior to Rust routes, native replay and WebSockets.
- [x] Add behavioral regressions, preserve other client features and document limits.
- [x] Generate covered native TypeScript through its existing producer; full corpus
      Rust-forward/profile outputs remain unqualified.
- [x] Run focused Node/Bun checks and record lockfile TypeScript version (5.9.3).
- [ ] Run the full local JavaScript gate and inspect every stage; no local Rust tools.
- [ ] Inspect the complete current-head CI cycle, preserve all failures with line numbers,
      repair the complete failure set, and rerun required checks.
- [ ] Review full PR diff, integrate current main, commit atomic changes, push only the
      prepared branch, update PR title/body with positive `Fixes #784` reference.
- [ ] Verify all same-SHA CI checks, clean tree, and mark ready only if complete.

Constraints: one resource-intensive process at a time, no additional agents or clones,
no Rust tool invocations, compressed evidence below 500 MB, preserve all strict gates.

The first full-gate attempt was stopped during forward translation as the aggregate
process memory reached the 2.92 GiB container limit. Reverse translation was unrun.
Its preceding lifecycle and process-group failures reflect unreaped orphan zombies
under this container's PID 1. A Linux child-reaper launcher preserves the unchanged
checks. The next full attempt will additionally use a 512 MiB Node heap per process.
These constraints never turn an incomplete check or an allocation failure into a pass.
