# Bound temporary semantic JSON storage

The full 863-source run at `6ab58c83e` exhausted its unchanged 1792 MiB V8 heap
during JSON serialization after semantic-check attempt 10. The complete failed
run took 949.276 seconds with 2,034,778,112 bytes sampled aggregate peak RSS.
All 4,332 captured Rust/Cargo/compiler/script/TypeScript files (241,692,948 bytes)
remained unchanged. Retain this failure; it establishes no fresh generation or
executable coverage.

The explicit flat bulk path now uses complete generated siblings of the
original semantic-meta and project modules. `prepare-flat-semantic-meta.mjs`
selects two native serializer/comparison expressions and the project's one
semantic import. Ordered language and repository CST sequences preserve full
sources, serialized/reparsed concrete documents, complete inverses and native
bindings. Original modules and their public observer contracts stay unchanged.
The existing flat-output producer routes only its own project import to the
new complete sibling. Its eight whole source proposals remain required.

The new inert-data serializer emits the original JSON property order and
`{$map:[...entries]}` encoding. Native JSON still encodes every primitive and
key. Fresh per-call UTF16LE chunks retain all code units outside the V8 string
heap until the single final string is needed. Canonical validation compares
complete emitted pieces against the entire parsed input without constructing
a second complete canonical string. It does not retain source, hashes, proofs
or encoded results across calls.

This lane requires stock native operations and ordinary acyclic data; proxies,
accessors, callbacks, foreign prototypes and modified Maps refuse. Existing
semantic APIs retain their ordinary behavior. The original root, declaration,
Map-link, proof-freezing and canonical checks remain in the copied parser.
The existing 64 MiB field, two-million-object and depth-512 bounds remain.
Every source/type/owner check still precedes serialization; these DATA APIs
grant no executable or semantic authority.

All 15 cases across the complete new and original metadata files pass both
Node 20.19.4 and Bun 1.4.3, with their original deadline audits. Node took 7.341
seconds / 1,106,788,352 bytes sampled aggregate peak RSS; Bun took 5.979 seconds /
1,732,444,160 bytes. They include every byte and declaration in the retained
44 MiB semantic document, original malformed metadata refusals, full CST
inverses, unchanged complete project output and actual JavaScript plus strict
TypeScript 5.9.3 execution. These receiving results are not a controlled
whole-corpus memory comparison. Qualify the complete flat-retention file and
retry full canonical/platform generation under the original limits before
claiming that the original heap failure is repaired.

The complete unchanged nine-case flat-retention suite subsequently passes in
both engines: Node 75.042 seconds / 995,917,824 bytes sampled aggregate peak RSS;
Bun 48.456 seconds / 1,711,128,576 bytes, with original deadlines. It checks
every output byte, implementation fingerprint and refusal, actual canonical and
isolated-profile CLIs, native mutations and the original 96 MiB diagnostic heap.
An intermediate seven-of-nine result caught a fingerprint insertion-order
change. The repaired native rule selects only the genuine import declaration;
the original fingerprint literal/order and all complete compiler inputs remain.
The original failed full-corpus run and both intermediate failures stay retained.
Actual full-corpus retry remains necessary.

Buffer infrastructure follows the existing native output lane's explicit
trusted-module-birth contract. Its complete constructor/prototype chains and
global binding descriptor are pinned thereafter; a stock lazy binding retains
its exact accessor descriptor without invocation. Live method, accessor and
binding replacement controls reject without calling replacements. All 16 whole
metadata cases pass Node (7.031 seconds) and Bun (5.989 seconds), preserving the
44 MiB byte checks, original nine metadata cases and strict TypeScript execution.
