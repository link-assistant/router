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
- [x] Run the full local JavaScript gate and inspect every stage; no local Rust tools.
- [ ] Obtain a green full gate; the complete attempt failed five groups.
- [x] Collect the entire initial published-head CI cycle and preserve all failures.
- [x] Repair introduced evidence-budget and fixed historical-input failures.
- [x] Review post-filter header overrides and add the matching Rust consent guard
      and regression source; execution remains unrun.
- [x] Finish complete affected compiler-file checks under Node and Bun; preserve
      the failed deadline qualifications without changing assertions or deadlines.
- [x] Reproduce and fix network-header restoration through native JavaScript and
      configured overrides; regenerate TypeScript and add matching Rust source.
- [x] Complete runtime, type, freshness and strict parity diagnostics at 60b4f53bd;
      native and compiled runtime behavior passes, but deadlines and strict parity fail.
- [x] Mirror the existing JavaScript ingress-prefix refusal in final Rust source;
      preserve its explicit unrun status.
- [x] Verify current main is an ancestor, review the complete source diff, collect
      final feedback and remove only identified inactive task temporary paths.
- [x] Preserve complete original gate, CI and repair evidence in verified compressed
      packets, with exact tested heads and failed/unrun results recorded.
- [ ] Inspect the complete current-head CI cycle, preserve all failures with line numbers,
      repair the complete failure set, and rerun required checks.
- [x] Review the complete local source diff, preserve atomic commits and prepare an
      accurate PR title/body with a positive `Fixes #784` reference.
- [ ] Publish the reviewed batch only on the prepared branch under the repository's
      failed-gate draft-checkpoint exception, then update PR #785's title/body.
- [ ] Review the published PR diff against the committed local source.
- [ ] Verify all same-SHA CI checks, clean tree, and mark ready only if complete.

Constraints: one resource-intensive process at a time, no additional agents or clones,
no Rust tool invocations, compressed evidence below 500 MB, preserve all strict gates.

The full attempt at 6f36a43f completed at 23:30:46 UTC with five failed groups:
workflow budget, TypeScript deadline audit, strict parity, forward heap limit and
reverse deadline/heap/historical-input failures. Node and Bun each passed 250 tests;
the child reaper resolved container lifecycle failures. No green stamp exists.
Initial-head CI also failed TypeScript, parity and profiles; both compiler cohorts
reached their original CI limits. Full results and compressed raw evidence are in
docs/case-studies/issue-784/verification.md. Historical fixture repairs preserve
original inputs, counts and deadlines; they do not certify current-source parity.
Current focused compiler checks use one worker and bounded 768 MiB heaps.
Transport IPs, vendor security inference, account settings and direct traffic
remain explicitly unmet parts of the literal all-tool requirement.
