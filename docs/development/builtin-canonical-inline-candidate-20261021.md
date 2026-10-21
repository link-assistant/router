# Adjacent canonical guard candidate

The original complete twelve-case canonical trial at Root head `1a37` remains
red. Every semantic assertion passed, but the CatalogRecord case took
81,936.854292 ms against its unchanged 60,000 ms limit; the complete-graph case
took 17,244.927167 ms. Root reported 133.656 seconds overall and observed peak
RSS about 1.80 GB. The full retained join is
`/private/tmp/router-layout-check-complete-actual-original-derive-canonical-candidate-trial-Node-v3/temporary/complete-original-derive-canonical-trial/node-join.json`.
That failed performance receipt remains distinct from earlier candidate unit
controls and from the production codec. No speed gain is established.

`prepare-builtin-canonical-inline.mjs` proposes a separate candidate. It copies
the complete actual canonical candidate and the complete canonical table
checker through native TypeScript spans and separate language/repository CST
substitutions. Every original exported encode/decode/seal function remains
byte-identical to the old candidate. The table checker becomes module-private,
with exactly one call, dominated by the decoder's immediately preceding
`builtinCanonicalTableReady()` condition. Its four arguments are lexical reads;
no call, property lookup or callback intervenes. The private copy removes only
its immediately repeated leading readiness check. Entry, decoder-tail and
checker-final fences remain live. The old public helper, candidate and default
codec remain unchanged.

This proof is limited to the pinned complete actual support, intrinsic-guard
and Node provider sources. Native AST checks also require the original Node
provider getter to contain only `return _Buffer`; it cannot introduce a user
callback between the adjacent fences. Original guards inspect captured native
owners and descriptors. A changed guard/provider source refuses preparation
until its complete source equation is reviewed again. No public skip flag,
permit, retained readiness verdict or cross-invocation cache is introduced.

All original decoder parsing, validation, allocation and freeze operations stay
in their original order. The canonical checker keeps every remaining original
operation, including final JSON encoding, final guard, live Buffer byte-length
lookup/calls and complete error metadata. Full original fallback encoding and
all seal Hash payloads remain unchanged. Observed or unqualified intrinsics
must still use the old fallback. The optimization removes repeated native
inspection only; it supplies no source, owner or executable authority.

Under Root's shared lease, materialize and check the new output using:

```sh
node tools/translation/prepare-builtin-canonical-inline.mjs --write
node tools/translation/prepare-builtin-canonical-inline.mjs --check
```

The only generated output is
`tools/translation/builtin-source-meta-canonical-inline-candidate.mjs`.
Four new complete 60-second controls cover actual source/CST/native-binding
equations, canonical positive and fallback values, repeated fresh 256-node
tables, every observed intrinsic hook, mutation callbacks and complete fresh
Hash payloads. The existing canonical candidate's complete eight controls must
also remain green. None of these controls measures the original derive case.

The source producer and four controls have not run. The output is not yet
materialized. Actual original twelve-case performance still needs its own
isolated source-generated trial, with full inputs, independent receipts and
the unchanged original limits. A CPU profile of the preserved v3 mirror may
identify other costs; profiler timings do not qualify performance. Removing
one of four selected-path guards has no measured whole-case benefit yet and
may be insufficient to meet the deadline.
