# Bulk concrete syntax transport

The CST extension is an actual source boundary in both translation directions:
source → serialized/reparsed concrete meta → reconstructed source → independent
semantic checks → serialized/reparsed checked semantic meta → JavaScript,
TypeScript or the supported Rust projection. Concrete transport preserves source;
it does not authorize execution or fill missing language support.

Use the exports in `tools/translation/concrete-syntax-meta.mjs` for stored or
edited CST documents. A chunk is a dense array of primitive canonical JSON
strings. The outer array contains one through three chunks, each with one through
256 rows. Results preserve chunk and row order, including repeated documents.

```javascript
import {
  createConcreteSyntaxMeta,
  serializeConcreteSyntaxMeta,
  transportConcreteSyntaxMetaChunks,
} from './tools/translation/concrete-syntax-meta.mjs';
import {translateSourceConcreteSyntaxMeta} from './tools/translation/translate.mjs';

const source = 'pub fn answer(value:u8)->u8{value+1u8}';
const meta = serializeConcreteSyntaxMeta(
  createConcreteSyntaxMeta(source, {language: 'Rust'}),
);
const concrete = transportConcreteSyntaxMetaChunks([[meta]]);
const translated = translateSourceConcreteSyntaxMeta(
  concrete.chunks[0].rows[0].meta,
);
```

For reverse translation, pass a JavaScript or TypeScript row's canonical `meta`
to `translateConcreteSyntaxMeta` in `js-to-rust/translator.mjs`. Both semantic
entries revalidate their input independently; the bulk result is not a reusable
checking permit. TypeScript annotations outside the existing common subset
remain refused. Configure the actual installed TypeScript dependency before
importing an exported compiler in a receiving repository.

`applyConcreteSyntaxSubstitutions` accepts separately declared `languageRules`
and `repositoryRules`. Each edit names its exact old text and UTF-16 span. The
result is rebuilt, serialized and reparsed before further use. An edited
document needs fresh semantic checks just like an ordinary source document.

All chunks share one aggregate budget: 2,097,152 source UTF-16 code units,
8,388,608 replacement-encoded UTF-8 bytes, 200,000 nodes and 33,554,432 canonical
JSON UTF-16 code units. The canonical input budget is checked before parsing;
decoded totals are checked before retaining each result. Delimiter depth remains
256. Split larger fidelity workloads into independent bounded calls; splitting
does not grant a shared semantic context or relax any per-source limit.

The three transport contracts have distinct purposes:

| Entry | Input | Validation |
| --- | --- | --- |
| `transportConcreteSyntaxChunks` | Chunks of `{source, language}` rows | Full ordinary source workflow per row |
| `transportConcreteSyntaxParsedChunks` | The same source rows | Private source-origin JSON path with two independent builds |
| `transportConcreteSyntaxMetaChunks` | Chunks of canonical CST strings | Full untrusted-document schema, reconstruction and two-build validation |

The source-origin specialization only parses JSON it has just created privately.
It cannot be selected by a document flag or used to trust caller-supplied nodes,
encoding counts or authority fields. Stored documents always use the full
untrusted-document workflow.

Batching authenticates the complete fixed parser source packet before and after
each chunk. This is an explicit grouped observer contract, rather than the
callback schedule of repeated standalone calls. Every row retains fresh guards
and two independent concrete builds. After the last callback, the operation
rechecks earlier file and ancestor identities, complete compiled source
associations and caller array descriptors. No source or validation verdict is
cached across calls. Existing standalone APIs retain their own contract.

## Independent reverse analysis

`analyzeJavaScriptIndependentCorpus` in `js-to-rust/translator.mjs` analyzes a
bounded list of JavaScript sources independently:

```javascript
import {analyzeJavaScriptIndependentCorpus} from
  './tools/translation/js-to-rust/translator.mjs';

const result = analyzeJavaScriptIndependentCorpus([
  {path: 'fixture-0', source: 'export class Router {}'},
  {path: 'fixture-1', source: 'export function untyped(value) { return value; }'},
]);
const diagnostics = result.analyses.map(row => row.analysis.diagnostics);
```

Input is a dense array of 1–256 own-data objects with exactly `path`, then
`source`, as primitive strings. Paths are ordered labels, including duplicates;
they supply no module or ownership context. Each row uses the original default
frontend with `includeScoped: true`, `sourcePath: null` and `lossless: false`.
Definitions and failures do not flow between rows. The only optional argument is
an exact own-data `{constructorGraph}` object; the existing constructor checks
still decide its validity.

The API uses one existing full CST batch transaction: complete parser-source
authentication before and after the batch, and actual serialization, reparsing,
reconstruction and independent builds for every row. Fresh native host checks
and complete caller-input descriptor joins surround each semantic analysis and
the final result. Scoped retries retain the original single-source analyzer.
The existing aggregate source, UTF-8, node and canonical JSON limits above apply;
labels have a separate 2,097,152 UTF-16 code-unit aggregate limit. Empty input is
refused. Results contain ordered `analyses` and observational
`concreteSyntaxCorpus` rows, totals and rule trace; CST metadata grants no type,
owner or executable authority.

JavaScript-first regeneration uses this explicit contract for all sixteen
unsupported fixtures inside every build. The old single-source APIs and their
callback schedules remain unchanged. No speed improvement is guaranteed;
complete Node/Bun receiving checks and the original regeneration deadlines
remain required.

Project CST component storage is separate. Its 64 MiB per-component and 512 MiB
aggregate storage limits do not increase these source transport limits or
establish that a stored project is semantically translatable.

For a complete compiler operation over an explicit source batch, see
[fresh-process bulk translation](isolated-project-bulk.md). Its source packet
registration is separate from these CST transport contracts.

Receiving checks must run the complete canonical-chunk, corpus, concrete syntax
and transaction test files under Node and Bun with their original deadlines.
Execute emitted JavaScript and strict TypeScript independently. Preserve opaque
and error source and explicit semantic refusals. Focused receiving checks do not
establish generated freshness, full runtime parity or permission to run Rust;
the complete same-SHA JavaScript gate remains required before Rust CI.

## Paired forward target input types

The explicit owned-core reverse profile can obtain missing JavaScript parameter
types from a matching complete TypeScript source. Pair paths are fixed by the
receiving runtime/declaration roots and the same relative module stem; competing
`.ts` and `.mts` sources refuse. Actual application TypeScript is now captured
alongside application JavaScript and both complete runtime inputs. Existing
written JavaScript/JSDoc contracts retain their original path.

Both complete paired sources pass through serialized/reparsed lossless CST and
native grammar checks. The adapter erases only native-AST-selected type
annotations and complete type-only imports, retains the full forward/inverse
recipe, and compares every remaining token, including comments. Functions and
parameters join by ordered native declaration spans and names; the erased native
JavaScript syntax must also agree, including ASI. Written local and return types
must match independently inferred JavaScript domains. Generics,
overloads, assertions, mixed type-only imports and unknown declaration forms
remain unsupported. Only the existing source-resolved canonical `JsonValue`,
string, boolean and fixed-operation input domains can supply written contracts;
similarly shaped nominal aliases and public proof flags cannot do so.

The original JavaScript still supplies every actual lexical symbol, imported
callee, expression, argument order and return/loan root. TypeScript declarations
do not issue ownership or body permission. Checked meta and both target
boundaries reconstruct the pair afresh; native compiler objects remain local to
that invocation. Underscore-containing ordinary names are supported, with
reserved/private names and collisions after Rust name conversion refused.

The existing module preflight, successful-resource/error boundaries, parser
budgets and regeneration workloads are unchanged. Unrelated imports, startup
evaluation, arbitrary aliases, callbacks and unimplemented operations continue
to refuse. The stored forward inventory may be historical; its flags and hashes
cannot recreate source authority. Fresh forward materialization and separate
canonical-type/packaging work are required before claiming application coverage.
This source draft has not yet received Node/Bun or strict TypeScript checks.


## Owned-context source documents

The explicit `router-owned-core-source-document-v1` storage profile keeps full
ordered receiving originals once in its context header. Each application
JavaScript/TypeScript source has a complete CST row whose source field is an
exact whole-file reference into that header. Function and imported-runtime
records retain source paths and spans; paired written-type evidence is freshly
reconstructed from both originals instead of repeated in every stored function.
String literals in checked bodies are never rewritten as storage references.

`translateOwnedCoreDocumentJavaScript`,
`translateOwnedCoreDocumentConcreteSyntaxMeta` and `parseOwnedCoreDocumentMeta`
are separate APIs. The original single/default translators, owned Links format,
`parseOwnedCoreMeta` and `buildOwnedCoreArtifacts` retain their old code and
observation schedules. The sibling `buildOwnedCoreDocumentArtifacts` discovers
the same complete actual forward corpus and records every item and refusal.
The repository bulk selector remains unchanged in this source draft; its
explicit switch requires receiving qualification followed by actual generation,
complete artifact review, installation and freshness checks.

A document reader reconstructs every complete source/CST and validates its
canonical partition through the existing CST reader. It then expands each
function's complete original metadata and invokes the unchanged original item
checker independently, including source symbols, body, ABI, imports, ownership
and loans. A source reference, digest, paired annotation or copied field grants
no executable authority. Missing, foreign, duplicate, reordered or changed
references refuse. No native Program/Checker or traversal frame escapes, and
there is no cross-call source, owner, hash or verdict cache.

This new operation has an explicit additional authentication/CST/read/hash
schedule; it does not claim public callback equivalence with repeated old API
calls. Expanding an item does not change any argument or order inside the old
item check. Language rules run original analysis, document serialization and
reparsing, and both checked targets; repository rules package their results.

The encoded document stays within 32 MiB, with exact encoded-size accounting
before allocating each JSON word or the final document. Existing context
16 MiB/4,096-file limits, 4,096-item limits, checked-data limits and CST source,
node and delimiter bounds remain. CST node arrays retain their existing
200,000-node limit; they do not acquire an unrelated 4,096-node truncation.
The corpus keeps its 256 MiB total output bound. The source draft is unrun;
there is no measured speed or application-coverage claim. Structural generated
type aliases, module startup effects and unsupported parse/callback profiles
remain separate obligations. Rust execution remains gated CI work.
