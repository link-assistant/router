# Explicit authenticated concrete substitution batches

The current pinned private concrete module already exports its complete original
`applyConcreteSyntaxSubstitutions`, serializer, parser and reconstructor. Its
existing executor also exposes private source/identity workflows to its compiled
module. This candidate invokes those actual private functions; it does not
implement a substitute editing algorithm or repin the original registry/history.

`prepare-private-concrete-substitution-batch-candidate.mjs` uses installed
TypeScript 5.9.3 native declarations/spans to copy the complete actual
`transportPrivateConcreteSources` transaction into a separate executor. It
retains the entire original executor and every original API. The new operation
changes request capture, row processing and detached results, and adds final
private function identity joins and caller-data cleanup. Original complete
before/after authentication, compiled-source comparisons, file/ancestor
identities, native guards, error handling, input descriptor revalidation and
active-transaction fences remain. Native span inverses independently restore
the complete original function. Language then repository CST substitutions
retain whole serialized/reparsed output and inverse source. Physical source
hashes/identities and the actual original manifest pin are checked fresh.

The explicit API is:

```js
import {substitutePrivateConcreteSourceBatches}
  from './private-concrete-substitution-batch-candidate.mjs';
const result = substitutePrivateConcreteSourceBatches([
  {source: before, language: 'JavaScript', stages: [
    {phase: 'language', expected: languageSource,
     sequence: {languageRules, repositoryRules: []},
     inverseSequence: {languageRules: languageInverse, repositoryRules: []}},
    {phase: 'repository', expected: after,
     sequence: {languageRules: [], repositoryRules},
     inverseSequence: {languageRules: [], repositoryRules: repositoryInverse}}
  ]}
]);
const completeOriginalRowFragment = JSON.parse(result.rows[0]);
```

The return schema is `private-concrete-source-substitution-batches-v1`. It
contains only detached DATA: primitive JSON strings per complete source row,
scalar totals and `sourceAuthority: false`, `runtimeAuthority: false`. It never
returns a function, private parser frame, live document or source/owner permit.
Each decoded row has the exact original fields/order:
`{beforeMeta,afterMeta,inverse,stages,trace}`. Each stage retains
`{phase,before,after,beforeMeta,afterMeta,trace,completeInverse:true}`. The caller
can merge those fields into its complete native/source row without losing any
original metadata. There is no monolithic whole-result stringify.

Before any source Hash/read callback, the invocation snapshots complete own-data
rows, both phase sequences, every rule, exact span/node selector and all expected
and replacement strings. Unknown keys are rejected before field descriptors,
including potential lazy stack keys. Proxies, accessors, executable selectors,
foreign prototypes and sparse arrays refuse without calling them. The original
private rule/edit validators independently validate the resulting pure DATA.
After all original source callbacks, every original descriptor, value, key
order and prototype is rechecked before return. A changed request fails the
whole transaction. No partial row list can escape a later refusal.

Each rule still executes the actual original private
`parse(serialize(build(...)))` boundary. Both phases also receive complete
serialized/reparsed transports, exact expected-source checks and their original
full inverse applications. Canonical equality of each inverse and the checked
phase joins establish the complete original inverse. The candidate does not
repeat both inverse applications again; the original producer's two complete
inverse operations remain. Source/identity authentication occurs once before
and once after the complete bounded batch. Original standalone APIs keep their
old callback behavior; this explicitly selected operation has a distinct whole
batch callback contract. No current source/hash/owner/verdict/encoded result is
retained between calls. The executor's original private compiled-function cache
keeps its existing contract and is freshly joined to the entire current source
packet in every call.

Bounds remain explicit: at most 256 rows, 2,097,152 input/final source code units,
8,388,608 input/final UTF8 bytes, 200,000 final document nodes, 33,554,432 aggregate
primitive result code units/UTF8 bytes, and each original per-document/sequence
bound. This new operation additionally bounds aggregate primitive request text
to 33,554,432 code units, rules to 256 and edits to 16,384. Each document still
retains original source/node/serialized/depth budgets. Exceeding any count fails
atomically; it never trims or silently skips a source row, stage or inverse.

Root measured the actual 34 byte-consumer CST fragments at 63,488,129 JSON bytes,
maximum 7,817,903 per row, with 739,144 input code units and 176,348 final nodes.
All 34 fragments do not fit one 32 MiB transaction. The additive consumer worker
therefore drafts deterministic groups of three rows, with actual limits checked
again in each call. Historical sizes confer no admission. It retains all 34
native assemblies and complete resulting rows until the original global fresh
input/source joins finish. This aims to replace hundreds of repeated public
authentications with bounded complete operations; it is not a measured gain.
Original full byte-source cases remain red at 74.28 and 65.03 seconds against
their unchanged 60-second deadlines.

Root can materialize the single explicit copy with:

```sh
node --max-old-space-size=2048 tools/translation/prepare-private-concrete-substitution-batch-candidate.mjs --write
node --max-old-space-size=2048 tools/translation/prepare-private-concrete-substitution-batch-candidate.mjs --check
```

The new complete seven-case file compares all fields with independent public
standalone operations, node selectors and empty phases; retains proxy/getter/
unknown-key refusals and original bounds; rejects a real Hash callback's input
mutation before returning any rows; and compares complete fresh original source
Hash argument tapes across distinct invocations. The source producer and all
seven cases are **unrun**. Full original parser/CST controls, both engines, the
new complete byte-consumer files, strict checks and original deadlines remain
mandatory. Default imports, registry bytes and executable coverage are unchanged.
