# Operation source history receiving repair

Draft repair for [PR #785](https://github.com/link-assistant/router/pull/785).
The completed current translation shard fails an assertion that identifies the
pre-measurement operation composer by SHA-256. The existing source producer now
correctly applies three additional ordered measurement rules. The complete
original test reproduces the mismatch locally: one case passes and one fails,
while the independent original-deadline audit passes.

The receiving test preserves the original input and output hashes. It checks
the historical output before the three successor rules, compares every rule
against independently authored complete expected substitutions, applies them
in order and undoes them in reverse. Both the new complete output hash and its
serialized/reparsed CST equation remain checked. Original unrelated-source and
foreign-import refusals, guarded-import inverse, source-current check, unchanged
logical budgets and the absence of semantic/runtime authority remain explicit.
The production composer, rules and producer are unchanged.

The complete file passes both cases in Node 20.20.2 and Bun 1.4.4 using installed
TypeScript 5.9.3. Original 60-second deadlines remain unchanged; Node's full
independent audit passes. Whole observed runs take 44.643707 and 33.092661
seconds, with sampled total cgroup peaks of 1,682,194,432 and 1,795,710,976
bytes. All children have exited and been reaped.

The [30-member archive](evidence/current-operation-source-evolution.tar.gz)
and [complete receipt](evidence/current-operation-source-evolution.json.gz)
retain all three complete runs, both full Node audits, the original and repaired
tests, whole producer, source rules and current source files. Every member was
independently read back and hashed. The archive is 78,882 bytes, SHA-256
`675696bafb1a69ff58afa84062fa0ce352b13017a8037effcccd15f4f4adf380`.
Raw evidence is retained.

This test-only repair adds no production executable functions and does not
change compiler registration. The current published CI cycle is still running.
The full gate, other original deadlines, production and matrix generation,
strict parity and universal tool/account privacy remain unfinished. No local
Rust tool was invoked.
