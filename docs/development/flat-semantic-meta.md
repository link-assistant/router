# Bound temporary semantic JSON storage

The full 863-source run at `6ab58c83e` exhausted its unchanged 1792 MiB V8 heap
during JSON serialization after semantic-check attempt 10. Its 949.276 seconds
and 2,034,778,112 bytes sampled aggregate peak RSS remain a failed result.
All 4,332 captured Rust/Cargo/compiler/script/TypeScript files stayed unchanged.
The next complete run at `2905818c6` correctly rejected a copied private method
issuer after 742.739 seconds. All 4,337 inputs stayed unchanged. Neither run
establishes fresh generation, a memory improvement or executable coverage.

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
The existing flat-output producer changes only its genuine project import.
Its original fingerprint literal/order and all compiler inputs remain intact.

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
