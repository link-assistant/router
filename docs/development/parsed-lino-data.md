# Copying an already parsed Lino network

The unchanged default build calls `buildNativePortableArtifactsCorpusBulk`,
which calls `analyzeJavaScriptCorpusBatched`. Each top-level/scoped artifact and
successful scoped helper eventually calls `parseMeta`. That function parses the
same primitive meta text once for top-level validation and immediately again
inside `fromLino`. Its later canonical comparison parses the regenerated text
again. This proposal replaces only the middle character scan with a detached
copy of the first network. No timing gain is qualified by this source draft.

`prepare-parsed-lino-data.mjs` archives complete current translator, IR, Lino
parser and intrinsic-guard sources. Actual TypeScript 5.9.3 lexical symbols join
the translator's decoder import and both original parse arguments, and the IR's
original `parseLinks` import and private `itemOf` callback. The new return is a
native-selected copy of the complete original `fromLino` return expression with
only its parsed-network receiver replaced. The original exported `fromLino`
function remains byte-identical. Two ordered source-rule phases retain complete
native copies, original sources, independently derived native edit inverses,
serialized/reparsed CSTs and both complete phase inverses. The producer verifies
the complete original JSON/Hash call-site lists and fresh final input joins.

The default parser resolves its original options first, then records native
readiness before the first actual syntax parse. This private local is produced
by the implementation; callers cannot set a readiness option or provide a
replacement parser. If readiness was absent, the original `fromLino(text)` runs
at its original place. Recording readiness before parsing also protects against
a transient parser/collection hook that restores its native method afterward.

The new DATA helper independently requires the existing original static,
ingress and data-freeze intrinsic qualifications before reflection. It copies
only dense ordinary arrays, primitive strings and exact ordinary `{quoted}`
records with original writable/enumerable/configurable fields. Proxies,
accessors, hidden/extra fields, lazy stack keys, foreign/null prototypes, sparse
arrays, cycles and bounded-qualification misses return `null`, selecting the
unchanged original decoder. Its 200,000-cell, depth-256 and 32-Mi-unit admission
limits are qualification limits, not new limits on the original parser domain.
There is no cache or retained source, digest, verdict or decoded item between
calls. The helper decodes DATA only; its public output has no source, grammar,
type, ownership or executable authority.

The copy is required even when the first syntax parser was callback-free. A
later original JSON decode can install a collection observer that mutates the
working network. The old middle parse gives that decoder a separate network.
The proposal preserves this separation: the first network remains untouched
for the canonical comparison, and all original decoder JSON/Buffer operations
run on the detached working copy at their original places. JSON parsing itself
is not asserted callback-free. A receiving control changes the working function
name through a JSON-installed `Array.find` observer and requires the same
canonical refusal as the original parser. Initial JSON stringify or regex/
collection hooks retain the entire original fallback and observer schedule.

The first syntax parse, canonical reparse, both semantic check passes, source
constructor/native owner joins, every Hash and JSON call site, original CST
roundtrips, fresh native grammar checks and all three independent repository
builds remain required. The qualified path still traverses the complete closed
network; it avoids a second per-character parser scan, not semantic checking.

Root receiving sequence:

1. Integrate the source draft without changing generated compiler files. With
   the receiving TypeScript 5.9.3 installation selected, run
   `tools/translation/prepare-parsed-lino-data.mjs --emit` and retain the entire
   compressed proposal. Review both complete outputs, their native lexical
   selections/copies and independently reconstruct every phase inverse.
2. Materialize the exact two-file proposal with `--write`, then run a fresh
   `--check`. Inputs must match the exact original or adopted equation, and
   the immutable original Lino/guard dependencies must still match in full.
   Default source changes are confined to `js-to-rust/translator.mjs` and
   `js-to-rust/vendor/ir.mjs`.
3. Run whole `js-to-rust/test/parsed-lino-data.test.mjs` (six 60-second cases),
   then the unchanged complete `translator.test.mjs`, `source-constructors.test.mjs`,
   `source-calls.test.mjs`, `callback-inputs.test.mjs`, `scoped-payloads.test.mjs`,
   `closures.test.mjs` and `captured-primitives.test.mjs` in that directory.
   Qualify both Node and Bun, original deadlines and complete evidence. Set
   `ROUTER_PARSED_LINO_DATA_VECTOR_DIR` to a fresh directory for each engine to
   retain full source/meta/results and unchanged raw observer arguments as gzip.
4. Run both complete `test/native-portable-bulk-concrete-syntax.test.mjs` and
   `test/native-portable-corpus-concrete-syntax.test.mjs`, including every real
   build attempt and strict TypeScript invocation. Neither case body nor its
   60-second deadline changes. Continue the complete gate/export freshness
   obligations for the final actual compiler source.

The worker ran no engine, TypeScript execution, source generation, profiler,
Rust tool or receiving test. Source inspection and archive-byte checks do not
qualify default adoption, behavioral parity or performance.
