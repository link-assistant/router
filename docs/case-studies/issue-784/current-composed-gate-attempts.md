# Complete local gate attempts for the residual batch

Both attempts invoked the unmodified complete `scripts/check-js-first-local.mjs`
with Node 20.20.2 and a 128 MiB parent heap. They inherited a 128 MiB child heap
cap and used the unchanged cgroup guard of 2,866,933,760 bytes. Source commands,
whole files and original deadlines were preserved. Neither writes a green stamp.

The attempt at `a3d64c3cb` completed its fingerprint and lint stage. Its PATH
incorrectly excluded npm. The Node, Bun and actual package TypeScript commands
therefore failed without running. The independent nine-case deadline-control
file passed. Parity reached 104 acceptance cases before the resource guard at
250.225 seconds; translation and reverse translation were unrun. The PATH error
is an invocation mistake, not an application failure or a pass for those stages.

The corrected-PATH attempt at `038e24b94` fingerprints all 49,272 complete paths
and 1,844,699,159 bytes. Lint passes. All 259 actual native Node cases pass in
34.982 seconds, and all 259 native Bun cases pass in 65.51 seconds. The nine
deadline-control cases pass, then the actual package TypeScript compiler
exhausts the inherited 128 MiB heap. Later TypeScript commands are unrun.
All 121 parity acceptance cases pass in 122.404 seconds. The independent strict
parity check still fails with 441 draft gaps and one validation error.

The complete forward translation command then exhausts its inherited heap.
The unchanged cgroup guard terminates the owned process tree at 556.999 seconds,
with a sampled peak of 2,868,170,752 bytes; total elapsed time is 558.135 seconds.
Its complete receiving deadline audit is unavailable, and reverse translation
is unrun. The 128 MiB child cap must be corrected before using these resource
failures to assess the corresponding compiler checks.

The [complete packet](evidence/current-composed-gate-attempts.json.gz) retains
both complete output streams, all observer and page-advice receipts, the exact
gate and observation scripts, and this report. Completed original deadline
outputs are independently retained in the complete archive linked by the
[terminal feedback report](current-910e8-ci-review.md). These observations do
not qualify unfinished application parents or any newly executable production
function. Rust is unrun and [PR #785](https://github.com/link-assistant/router/pull/785)
stays draft.
