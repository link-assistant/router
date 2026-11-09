# Cold lexer storage accounting

The private syntax cache built descriptors for every field of each freshly
lexed record. Its unchanged native-operation guard already qualifies the
complete lexer; those private item and token layouts are fixed. Count the
same storage directly, then freeze only after every existing budget passes.
The complete source is still lexed on a miss. This changes no source or
semantic authority, and every caller still receives fresh mutable records.

A new whole receiving test measures actual lexer calls through independent
Node coverage. Inputs at 199,988 and exactly 200,000 storage cells use one
parse for two reads. At 200,012 cells, both reads parse anew. All complete
results equal the original lexer; refusal results remain mutable. This test
and the unchanged two-case record-copy file pass under Node 20.20.2 and
Bun 1.4.4. The independent Node audit reports zero deadline breaches.

A finite diagnostic alternates four rounds of sixteen cold reads on each of
three complete Router sources against the exact published predecessor
`815527efb3db40ca7e650ba9aaae47bfa1529dab`. Every round checks complete syntax
equality and token counts. Predecessor rounds take 209–710 ms; draft rounds
take 98–301 ms. Cold reads are roughly twice as fast on
this diagnostic, without qualifying an original receiving deadline.

The original complete static-source test remains unqualified locally. Node
reaches the unchanged memory guard after 17.351 seconds before completing a
case; its audit cannot read the unfinished receipt. Bun passes six cases,
including all official package sources, storage bounds, observer tapes and
independent lexical coverage, then reaches the same guard after 15.169
seconds. Sampled total-cgroup peaks are 2,877,464,576 and 2,894,086,144 bytes.
Every owned process is reaped. Both original test files and their assertions
and deadlines remain byte-exact.

The [complete packet](evidence/current-static-cold-budget.json.gz) retains all
sources, full diagnostics, original failed attempts, focused audits and owned
inactive-page advice receipts with complete readback. This change adds zero
executable production functions. Compiler registration, strict parity and the
whole local and same-head CI gates remain unfinished. No Rust tool ran.
[PR #785](https://github.com/link-assistant/router/pull/785) remains draft.
