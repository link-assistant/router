# Static source record copying

The source-item cache reconstructed every record with recursive key discovery
and `defineProperty`. Its inputs are private frozen results of the unchanged
lexer: item records have six fixed fields, and token records have four. Copy
these records with ordinary literals in their original field order. The cache's
input checks, complete source parsing, reflection qualification, LF RegExp state,
storage limits and fallback behavior remain unchanged. This issues no semantic
authority and adds zero executable production functions.

The finite diagnostic compares the complete published predecessor at
`3b19785353c0a004efc62ab675a97b99c8a2e5a1` with the draft. It alternates four
rounds of 24 complete cached reads for each of three complete Router files.
Every input digest, exact predecessor source, relocation, draft source and
observation is retained. Complete syntax equality is checked before and after
each cohort. Across those sampled reads, predecessor times are 253–630 ms per
round and draft times are 44–123 ms. This is approximately a fivefold cache-hit
improvement on this diagnostic, not a whole receiving-test deadline result.

The new complete two-case receiving file passes under Node 20.20.2, including
the independent original-deadline audit, and Bun 1.4.4. It checks actual complete
Router sources, property descriptors, field order, independent mutable tokens,
and named inherited setters on cache misses and hits. Existing test files and
deadlines remain byte-exact.

The original complete `static-source-items.test.mjs` file remains unqualified
locally. Node reaches the unchanged memory guard after 8.971 seconds, before a
case completes; its auditor reports the consequently missing unfinished receipt.
Bun completes six cases and reaches the same guard after 12.495 seconds. Sampled
total-cgroup peaks are 2,869,956,608 and 2,886,795,264 bytes respectively. All
owned subprocesses are reaped. No repeated unchanged attempt, raised memory
threshold, test filtering or deadline change qualifies either execution.

The [complete evidence packet](evidence/current-static-record-copy.json.gz)
retains all command streams, resource receipts, source bytes and Node audit
files, including failures. The full local gate and current-head CI remain
unfinished. No Rust tool ran. [PR #785](https://github.com/link-assistant/router/pull/785)
remains draft.
