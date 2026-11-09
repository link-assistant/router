# Matrix worker diagnostics

- [x] Inspect the complete prior matrix failures: both original 60-minute jobs
  were cancelled and retained no complete output draft.
- [x] Locate the loss of diagnostics at the synchronous worker's stderr pipe.
- [x] Add a default-off, inherited descriptor for bounded scalar progress,
  preserving original callbacks, buffered errors, output bytes and all checks.
- [x] Explicitly enable that descriptor in the two existing matrix CI jobs,
  preserving their exact commands, workloads, budgets and fatal results.
- [ ] Verify live delivery before worker exit, unchanged complete output bytes,
  default-off behavior and the complete original workflow and matrix tests.
  New worker tests: 2/2 in Node and Bun. Original workflow tests: 39/39
  in both engines. Both original producer freshness checks pass. The complete
  matrix files remain unqualified: Node stops at the original memory guard
  after two completed cases; Bun stops during its first case.
  The entire new regression file also fails against the genuine predecessor
  worker, with only module-path relocation and complete source inverses.
- [x] Run the complete local gate and record every failed or unrun stage.
  Attempted at clean `2d62cc2877273f9235d1bf5373bc648cfd1d3e29`:
  lint, both 259-case native suites, nine deadline controls, both package
  typechecks and 121 acceptance cases pass. Native regeneration exhausts its
  selected heap; strict parity fails. The forward audit is incomplete before
  the original cgroup guard stops the tree. Remaining stages are unrun.
- [ ] Pass the complete local JavaScript gate for the final source SHA.
- [x] Keep the published head unchanged until its complete CI cycle finishes;
  collect every failure before publishing the next coordinated batch.
  All seven 37147a workflows are terminal. All 24 failed/cancelled job logs
  and final deadline receipts were collected and read. CI remains red.
- [ ] Review and publish the complete next source batch with explicit failed
  and unrun evidence; keep the PR draft and Rust gated.

The finite guard-routing experiment on 37147a matched twelve paired diagnostic
observations but its four timing samples did not demonstrate a consistent
improvement. Its alternative remains uninstalled and performance unqualified.
The separate signed SHA-256 probe matches 258 vectors and seven actual parser
sources in Node and Bun. Its timing difference is inconsistent across engines;
that candidate also remains uninstalled.

All local raw attempts, including the initial failed regression and workflow
checks, are retained with full readback in the case-study matrix test packet.
Retiring only those inactive originals reduces evidence from 505,670,690 to
493,261,784 bytes. The temporary cap overrun remains explicitly recorded.
