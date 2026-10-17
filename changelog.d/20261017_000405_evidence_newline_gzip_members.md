### Changed

- Retain the complete original builtin-derive test evidence as two gzip members: the original once-only native JSON serialization and its final newline. Decoding preserves every original byte while avoiding concatenation of another large JSON string.
- Keep every whole-test body, source, owner proof, case deadline and retention operation in its original test case. The focused writer regressions cover Unicode, BigInt normalization, callback/coercion order, native failures, complete gzip members and large evidence. Execution and memory improvements remain unmeasured at this source checkpoint; the full derive and serialization diagnostics remain required.
