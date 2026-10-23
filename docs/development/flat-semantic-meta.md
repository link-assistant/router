# Bound temporary semantic JSON storage

The full 863-source run at `6ab58c83e` exhausted its unchanged 1792 MiB V8 heap
during JSON serialization after semantic-check attempt 10. Its 949.276 seconds
and 2,034,778,112 bytes sampled aggregate peak RSS remain a failed result.
All 4,332 captured Rust/Cargo/compiler/script/TypeScript files stayed unchanged.
The next complete run at `2905818c6` correctly rejected a copied private method
issuer after 742.739 seconds. All 4,337 inputs stayed unchanged. Neither run
establishes fresh generation, a memory improvement or executable coverage.

The complete run at `23472ac18` passed semantic checking and target emission,
then exhausted the same heap during owned-field storage. It ran 928.612 seconds
with 2,523,332,608 bytes sampled aggregate peak RSS; all 4,343 captured inputs
stayed unchanged. This later failure remains red and produced no qualified
current output or coverage result.

The run at `0ba447645` also exhausted the same heap during owned storage:
931.737 seconds and 2,521,858,048 bytes sampled aggregate peak RSS. Its complete
4,347 inputs (241,906,517 bytes) stayed unchanged. Individual field tests had
passed; they did not reproduce the retained live compiler's pressure. Preserve
this failed result and require a complete decoded-CST pressure diagnostic
before another full attempt. A stored compression envelope is not its decoded
logical CST; verify the complete reconstructed logical bytes and digest too.

The explicit flat bulk path now selects a closed data serializer in the
**original project module**. Its existing private method issuers, admission
module and checker share their original context. Callers cannot supply a codec.
Every original public entry defaults to the original serializer; a separate
entry selects flat storage. The small `project-flat-semantic.mjs` adapter
delegates to that entry and re-exports the actual original issuers.

`prepare-flat-semantic-meta.mjs` copies the complete data-only semantic module,
selecting two native serializer/canonical-comparison expressions. Its original
root, declaration, Map-link, proof-freezing and canonical checks remain.
`prepare-project-flat-semantic-entry.mjs` selects three private storage defaults,
five serializer calls and two forwarding calls in the complete pinned project.
It copies the actual pipeline/public entry and preserves every unselected
original function byte, including all private issuers and existing public
entries. The original project, failed complete copy and license remain pinned
in `source-profiles/flat-semantic-meta`.

Both producers retain ordered language/repository sequences, whole serialized
and reparsed CST, complete source inverses and native binding checks. Review
actual proposals before installing them and require both `--check` commands.
The flat-output producer routes only genuine project and storage imports.
Its original fingerprint literal/order and all compiler inputs remain intact.

The field-storage sibling preserves the original Map-to-object and BigInt
encodings, including primitive Map key coercion, numeric key ordering, duplicate
keys, omissions and Unicode. It emits complete UTF-8 chunks directly, avoiding a
second full UTF-16 document. The ordinary field serializer remains unchanged.
BigInt text uses primitive concatenation after the actual `typeof` check, so
replaced BigInt prototype conversion methods cannot execute. This explicit
storage format preserves stock bytes and does not promise arbitrary callbacks.
The source producer selects its actual native function body, then retains both
ordered CST phases, the complete inverse and independent native binding checks.

`prepare-consumed-project-meta-storage.mjs` derives a complete storage sibling
from the original compressed planner. Its explicitly consuming entry accepts
owned mutable metadata and releases only the encoded checked semantic program,
target semantic program and concrete syntax fields. Other fields remain usable
by the bulk producer. Selected fields must be configurable. An error after an
earlier field was encoded may leave that field consumed; this API does not
promise rollback. Keep the original non-consuming APIs, all original storage
validation, logical byte/hash checks and 64 MiB/512 MiB budgets unchanged.
Consumption grants no source or executable authority and introduces no cache.

Encode the three selected components first, clear their detached descriptor
values, then restore the original key order before hashing or emitting output.
Other root fields retain owned UTF-8 bytes instead of complete duplicate strings.
The root is assembled in bytes, receives the original full canonical validation,
and becomes a string only for the final stored wrapper. Keep every original
logical and physical budget check. Earlier selected fields can all be consumed
before a later ordinary field fails; callers must not assume rollback or the
ordinary API's validation order.

The concrete component stays in UTF-8 through validation and compression.
`prepare-utf8-canonical-json.mjs` copies the complete existing JSON validator,
preserving all three original function bodies. Its added byte entry verifies
each codepoint-aligned 16 KiB chunk's complete UTF-8 inverse, then presents a
fresh bounded UTF-16 cursor to the unchanged canonical grammar. Invalid or deep
JSON retains the original native fallback. Original text APIs remain untouched.
Cursor ranges and one decoded chunk live only within that invocation; they do
not cache source, eligibility, logical bytes or semantic results across calls.

The complete 25-case validator/storage group passes with original deadlines in
Node (13.012 seconds, 1,118,830,592 bytes sampled aggregate peak RSS) and Bun
(10.047 seconds, 1,596,293,120 bytes). A separate corrected pressure diagnostic
decodes all 58,743,663 CST bytes, rejoins the original logical metadata digest,
and compares all 132,913,433 output bytes against the original planner in a
fresh process. It passes with 1,738,682,120 bytes of retained live heap before
storage, using the unchanged 1792 MiB old-space flag: 23.367 seconds overall,
2,354,413,568 bytes sampled aggregate peak RSS. Earlier diagnostics that used
the stored compression envelope do not qualify the decoded CST. This pressure
pass still does not qualify the live full compiler, its freshness or parity.

The durable complete pressure regression also passes independently through both
whole-file harnesses: Node 23.556 seconds / 2,765,340,672 bytes sampled aggregate
peak RSS and Bun 23.054 seconds / 2,658,877,440 bytes, preserving its 60-second
source deadline. The complete input/output byte checks run in the child before
any summary is emitted. Temporary reference outputs are removed after readback.

The inert-data serializer preserves original JSON property order and
`{$map:[...entries]}` encoding. Native JSON encodes every primitive and key.
Fresh per-call UTF16LE chunks retain all code units outside the V8 string heap
until one final string is needed. Canonical validation compares complete pieces
against the entire input without a second complete canonical string. There is
no source, hash, proof or encoded-result cache across calls. The original
64 MiB field, two-million-object and depth-512 bounds remain.

The new lane requires stock native operations and ordinary acyclic data.
Buffer infrastructure follows the existing native output lane's explicit
trusted-module-birth contract. Complete constructor/prototype chains and the
global binding descriptor are pinned thereafter, including an unchanged lazy
accessor without invocation. Live replacements, proxies, accessors, callbacks,
foreign prototypes and modified Maps refuse. Existing semantic APIs retain
their ordinary observer contract. These DATA operations grant no source,
private-issuer, semantic or executable authority.

The earlier 16-case metadata and nine-case integration qualifications remain
their own results. Complete retained 44 MiB byte equality, original metadata
refusals, CST inverses, actual receiving export/synchronization and strict
TypeScript passed both engines. An intermediate seven-of-nine result caught a
fingerprint-order change; its original controls and complete failure remain.

The corrected shared-issuer entry additionally requires the complete method
regression and original pre-import controls. It compares full original/flat
outputs, executes getter/static methods in JavaScript and strict TypeScript,
accepts genuine method evidence and refuses copied facades or a caller codec.
Complete canonical/platform regeneration under unchanged limits, reverse
freshness, strict parity and the same-SHA JavaScript gate remain required.

The complete corrected 42-case group passes in both engines, including all
original metadata and pre-import controls: Node 12.735 seconds / 907,018,240
bytes sampled aggregate peak RSS; Bun 10.358 seconds / 1,767,292,928 bytes.
These receiving passes preserve original deadlines and qualify the method
regression; they do not qualify full-corpus regeneration.

The complete 21-case field-storage group passes in Node (12.215 seconds,
1,046,609,920 bytes sampled aggregate peak RSS) and Bun (9.555 seconds,
1,454,407,680 bytes), with zero original deadline breaches. It compares every
retained checked, target and concrete field byte, including the complete 44 MiB
and 45 MiB semantic documents. The complete eight-case consuming-storage file
also passes a separate tighter 512 MiB V8 heap diagnostic in 3.260 seconds,
with 588,464,128 bytes sampled aggregate peak RSS. These storage results do not
establish that the live full compiler fits its unchanged 1792 MiB heap.
