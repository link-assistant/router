# Descriptor-kind receiving import

All eight cases in CI job 128754637443 fail before their behavior assertions:
`sourceStage` expects an obsolete lexing-intrinsics import. The complete current
proof producer imports `guarded-proof-lexing-intrinsics.mjs`. The receiving
fixture now substitutes that exact import. No production admission rule changes.

The complete eight-case file passes under Node 20.20.2 in 146569.239178 ms.
Its terminal audit reports zero deadline breaches and complete process-group
cleanup. Bun 1.4.4 passes the same eight cases in 121.38 seconds. Sampled total
cgroup peaks are 2192605184 and 2404524032 bytes respectively; neither observer
stops its child. These samples are not complete process memory peaks. The CI
Bun 1.4.3 pin is not locally qualified.

Every original input, behavioral assertion, counter, source comparison, CST
serialization/reparse, inverse, strict target check and 60-second case deadline
remains. `evidence/current-descriptor-kind-receiving.json.gz` retains the complete
before/current test, producer source, streams, receipts, tool versions and Node
audit. This is focused verification: strict whole-project TypeScript, generated
owned sidecars, the full local gate, the 441 strict parity gaps and Rust remain
unqualified. It establishes no new executable application function. PR #785
remains a draft and issue #784 remains unfinished.
