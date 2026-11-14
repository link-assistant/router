# Live diagnostics for synchronous matrix workers

The complete preceding CI cycle cancelled both matrix jobs at their original
60-minute deadlines. A synchronous child process buffered its stderr until
exit, so existing progress could not identify the unfinished source operation.

The worker now supports default-off `ROUTER_TRANSLATION_MATRIX_TRACE=1`.
The original synchronous session supplies a separate inherited descriptor;
validated, bounded scalar progress reaches the parent stderr while the worker
is alive. The two existing matrix jobs explicitly enable it. Their original
commands, complete source corpus, checks, storage bounds, 2 GiB worker heap and
60-minute deadline remain unchanged. Original stderr and progress callbacks
keep their original delivery route. Trace records grant no semantic authority.

The new complete worker regression file passes both cases in Node 20.20.2 and
Bun 1.4.4. It observes diagnostics before actual process exit, compares stdout,
stderr and every generated file byte/hash with tracing disabled, and checks
that a mismatched complete source corpus still refuses without output changes.
The complete regression file was also run against the genuine worker from
`37147a95ce5fb1efeced23b2ba49dcd036a53a8a`. It fails the live-delivery
assertion (`false !== true`), while the current worker passes. The reproduction
relocates only module paths, checks whole-source inverses, and preserves all
assertions and deadlines. Its second case also fails because that old worker
emits no trace. Initial implementation/test errors and their full failed output
remain in the retained packets.

All 39 original workflow cases pass in both engines. The Node audit reports
no original deadline or whole-source errors. Both complete source producers
(`prepare-matrix-draft-workflow.mjs --check` and
`prepare-isolated-matrix.mjs --check`) pass without output changes.

The original complete matrix test files remain unqualified locally. Node
completes two original cases in 36,924.77 and 43,201.00 ms, then reaches the
unchanged total-cgroup guard after 134.74 seconds. Bun, with live diagnostics
enabled, emits the neutral profile trace before reaching that guard during the
Unix-family profile of its first original case after 10.71 seconds. Sampled
peaks are 2,868,232,192 and 2,890,694,656 bytes. All owned children are reaped;
remaining cases are unrun, and no deadline or workload is relaxed.

The [complete test packet](evidence/current-matrix-live-tests.tar.gz) and
[member receipt](evidence/current-matrix-live-tests.json.gz) retain every
original local attempt and deadline file, including interrupted attempts and
the initial failed checks. Every decoded member was independently read back
and compared by length and SHA-256 before retiring its inactive raw duplicate.
The packet is 1,329,453 bytes; its SHA-256 is
`29945c6fb4919dc5abf414cedbcd0b5f323edf24f85dc72ceb4d2c4545e07bcb`.

The new CI audit inspection temporarily exceeded the evidence cap: observed
task evidence reached 505,670,690 bytes. Retiring 13,768,148 bytes of these
verified inactive originals restores it to 493,261,784 bytes. The complete
receipts preserve the overrun; no foreign process, cache or build was removed.

This change adds zero executable production functions and does not fix or
qualify the outstanding matrix, parity, generation and deadline failures.
The complete current-SHA local gate and CI remain required. No Rust tool ran.
[PR #785](https://github.com/link-assistant/router/pull/785) remains draft.

The [supplemental packet](evidence/current-matrix-supplement.tar.gz) and
[receipt](evidence/current-matrix-supplement.json.gz) retain the complete
predecessor reproduction, its original deadline audit, and a separate finite
SHA-256 experiment. Both algorithms match 258 vectors and seven complete parser
sources, including the live optional-array fallback. Node's four before/after
samples suggest a small difference; Bun's samples do not consistently improve.
The candidate stays uninstalled and performance remains unqualified. No original
workload or source bound changes. The packet is 99,851 bytes, SHA-256
`24f713c8a33305d78976c9298ad5968dc202fa4fa3c46bc23aa863e9926959b5`.

The [subsequent complete-gate attempt](current-matrix-live-gate.md) records the
exact source SHA, every completed stage, both interruptions and all unrun work.
