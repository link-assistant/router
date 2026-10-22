# Deliver flat retained output and actual witness synchronization

The complete canonical native-retention attempt on `156d8351` failed after
1,137.474 seconds, at the start of retained-output storage. Sampled peak
aggregate RSS was 2,589,573,120 bytes under the unchanged 2 GiB heap and 3 GiB
RSS caps. No plan was applied. The abort produced no CPU profile.

A bounded deterministic reproduction isolates the per-character string detacher:
the original native implementation aborts on 16 MiB UTF16 under a 96 MiB heap,
while the actual existing byte implementation restores every code unit. The
new producer copies that detacher through native AST substitutions and separate
language/repository CST phases into the complete native closure. Other storage
function bodies, host fences, budgets and original APIs remain exact.

All nine cases in the complete new file pass under Node 20.19.4 and Bun 1.4.3,
with independently audited original deadlines: 108.975 and 48.287 seconds.
Their sampled peak aggregate RSS values are 669,237,248 and 1,493,368,832 bytes.
These observations qualify the focused storage path, not the whole corpus.

The synchronizer now excludes exactly its generated ASCII/scalar Rust witness
from original-input capture. The complete 14-case file passes both engines:
139.241 seconds under Node and 115.612 under Bun, with unchanged deadlines.
Actual producer output, seven application functions, three generated helpers,
manifest hashes, drift refusal and authored-oracle/neighbor protection are
checked. Earlier failed test assertions are retained with their full streams.

Final source review checks all eleven changed JavaScript modules with Node and
TypeScript 5.9.3, complete CST inverses, and freshness of all eight generated
flat-closure outputs. It passes in 24.191 seconds.

The published `4b22bd09b` cycle is now fully collected: six terminal runs,
50 terminal jobs, all nine ran job logs and all three CRC/hash-verified artifacts.
Basic lint, Node and Bun passed; forward translation, matrix, reverse, strict
TypeScript and parity remain red or interrupted. Rust stayed gated. The full
forward stream records 58 failed completions, including stale shared source
fixtures. The next bulk repair must regenerate those fixtures from actual
committed Rust/Cargo bytes before final compiler fingerprints are generated.

The [complete packet](../raw/ci/link-assistant--router/continuation-772/20261023-flat-sync-delivery.tar.gz)
retains all failed attempts, passed focused checks, source equations, diagnostic
input and complete CI collection. Its [receipt](../raw/ci/link-assistant--router/continuation-772/20261023-flat-sync-receipt.json)
and [member vector](../raw/ci/link-assistant--router/continuation-772/20261023-flat-sync-members.json.gz)
record readback of all 144 members: 7,288,316 bytes, SHA-256
`6c6ee08b150f6f2bc1064eb19640505dd5713052a76627d85f76d00b89efeb24`.

No Rust tool ran locally. Current global executable coverage, complete
canonical/profile generation, reverse/export qualification, strict parity and
all same-SHA JavaScript stages remain required before fatal Rust CI.
