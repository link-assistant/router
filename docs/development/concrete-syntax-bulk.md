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
