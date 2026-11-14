# Corrected complete gate for the composed source batch

The complete local gate ran at committed source
`e15197054` with Node 20.20.2, local Bun 1.4.4 and the lockfile-installed
TypeScript 5.9.3. Its parent retained the 128 MiB heap cap, while child commands
inherited a corrected 512 MiB cap and the existing PATH including npm.
The original commands, whole files, strictness and deadlines were unchanged.

The fingerprint read all 49,423 paths and 1,861,774,251 bytes. Lint passed.
All 259 native Node cases passed in 35.077 seconds; all 259 native Bun cases
passed in 72.62 seconds. All nine TypeScript deadline controls passed in
6.326 seconds. The actual package `typecheck` command completed successfully.
The subsequent `native:typecheck` command started but did not finish.

The unchanged 2,866,933,760-byte cgroup guard stopped the owned process tree
after 365.488 seconds, with a sampled peak of 2,884,665,344 bytes. The observer
waited for its children and returned 143 after 365.707 seconds. Later TypeScript
commands, parity, forward translation and reverse translation were unrun.
No green stamp was written, and no local Rust tool ran. The earlier independent
strict result remains fatal: 441 draft gaps, including 151 partial and 290
unsupported features. This attempt does not supersede that failure with a pass.

Before the gate, the task-only page adviser changed observed cgroup use from
2,437,332,992 to 2,344,775,680 bytes. It skipped observed active paths and deleted
no files; these observations do not claim exact reclaimed cache or disk space.
The completed-fingerprint adviser exited zero without changing test clocks.

The [complete packet](evidence/current-final-composed-gate.json.gz) retains
the full gate stream, observer and page-advice receipts, exact observation
scripts and all newly completed original deadline evidence. Every retained
member is read back and checked against its complete byte length and SHA-256.
Previous whole gate attempts remain separately recorded in
[their report](current-composed-gate-attempts.md). The complete published
`910e8dadf` failure set is mapped in the [terminal review](current-910e8-ci-review.md).

The coordinated batch adds checked original-source composition and focused
regressions, but measures zero newly executable production functions. Application
parents, complete generation, current receiving qualification, strict parity,
all required same-head CI and the issue-wide privacy limits remain unfinished.
[PR #785](https://github.com/link-assistant/router/pull/785) stays draft and unmerged.
