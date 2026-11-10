# Native runtime identity allocation draft

[PR #785](https://github.com/link-assistant/router/pull/785) remains draft.
The regeneration-only runtime comparator now walks independently parsed complete
source and erased TypeScript trees together and streams their canonical JSON
fingerprint into SHA-256. It avoids retaining a normalized array tree and its
whole JSON string. Public parser, emitter, runtime fingerprint and build APIs
keep their existing functions. No new production function becomes executable.

The source producer composes the separately pinned runtime-stream substitution
sequence after its original memory sequence. The complete proposal retains both
source equations, serialized/reparsed CST stages and exact inverses. The native
binding check uses installed TypeScript **5.9.3**. Generated source was installed
with the producer's `--write` command after reviewing the complete proposal.
Complete proposed modules also pass the current engines' native syntax checks:
[Node](evidence/runtime-stream-native-syntax-node.json.gz) and
[Bun](evidence/runtime-stream-native-syntax-bun.json.gz). Both receipts retain
the duplicate-binding rejection and inert unresolved-import controls.

The comparator preserves node order, literal/raw text, optional-chain flags and
parenthesized continuation boundaries. Only original relative module imports
receive the existing extension normalization. Malformed input and differing
nodes still refuse; a digest grants no type, owner or executable authority.

Complete receiving files pass eight cases under Node **20.20.2** and eight under
local Bun **1.4.4**, with all original assertions and deadlines retained. CI uses
Bun **1.4.3**, so these local results do not qualify that engine version. The
complete production comparison retains all 60 original JavaScript modules,
typed targets, independently erased targets and original canonical trees;
every streaming digest matches the original digest in both execution orders.
These same-process timings include shared warmup and evidence writing and do
not establish a speedup.

The complete original nine-case native TypeScript file still **fails** its
independent deadline audit. All nine TAP cases pass, but the four-build
regeneration case takes **100,583.599341 ms** against its unchanged **60,000 ms**
deadline. The complete invocation exits 1 after 299.104 seconds. Its sampled
cgroup peak is 2,480,619,520 bytes; the unchanged resource guard does not stop
it. Both original Node runtime children, the original Bun child and all 259
shared expectations complete. This is receiving behavior evidence, not a green
whole-file result or full parity.

A separate finite profile observes one complete cold regeneration at
33,916.288935 ms and one warm regeneration at 23,146.112608 ms. Both compare
11,586,409 output bytes with no differences. The warm profile includes about
5.5 seconds of garbage collection; printing/erasure and CST transport remain
substantial. Its one negative clock delta is retained unchanged in the complete
signed-sample analysis. The earlier analyzer refusal is also retained. Neither
profile is a replacement for the original four-build case.

A separate complete CST packing diagnostic compares the existing 64-row /
262,144-code-unit target with 32 rows / 131,072 code units. Every canonical CST
wire matches for all 60 modules, with fresh physical-source joins. These
uncontrolled observations do not qualify semantics, deadlines or a speedup.
Production packing remains unchanged.

The [complete observation packet](evidence/runtime-stream-20261110.tar.gz)
contains source proposals, full inputs and vectors, both complete receiving
cohorts, the failed whole-file attempt, closed independent audits and original
profiles. Its [custody receipt](evidence/runtime-stream-20261110.json.gz) records
every member's complete byte count and hash, with independent archive readback.
Strict parity, current canonical/profile/owned regeneration, all remaining CI
failures and universal tool/account privacy remain unfinished. No local Rust
tool ran and no complete gate pass is claimed.

After commit `7283f934747bb46ed61766cf944b1a6c41426191` retained the complete
packet, an exact inactive-duplicate retirement reclaimed **27,672,576 allocated
bytes** (27,563,217 logical bytes) from 44 task-owned temporary files. Every
complete tar member was read back, and each removed file matched its retained
member and had no identified open descriptor or mapping. The
[pre-unlink receipt](evidence/runtime-stream-duplicate-retirement.json.gz) and
[completion receipt](evidence/runtime-stream-duplicate-retirement-complete.json.gz)
retain all identities and hashes. Source files, build caches and other workers'
paths were not removed.
