# Complete source equations through CST

`tools/translation/concrete-source-equations.mjs` is a reusable development DATA
adapter for complete source edits. Its input is a dense array of ordinary own
data records, with fields in this order: `before`, `after`, `language`. Supported
language labels are Rust, JavaScript and TypeScript.

```javascript
const [equation] = transportConcreteSourceEquations([
  {before: originalSource, after: editedSource, language: 'Rust'},
]);
```

Every call independently transports both complete source strings through the
existing inspected/dense/two-build canonical boundary. The original CST
substitution operation runs the language sequence and then the repository
sequence. Its complete canonical result must equal the independently reparsed
afterimage. The full inverse is substituted and compared against all original
canonical bytes. Each result retains `before`, `after`, `beforeMeta`, `afterMeta`,
`trace` and `inverse`. These fields grant no syntax, namespace, ownership or
executable admission; the semantic compiler must independently check edited
source.

The array limit is 128 equations, with the unchanged original batch aggregate
source, UTF-8, node and canonical limits applied to both members of every pair.
Sparse arrays, proxies, accessors, extra fields and invalid primitive values
refuse. There is no persistent source/hash/result cache or private frame passed
to the caller.

The native-selected copy producer is
`tools/translation/prepare-concrete-equation-transaction.mjs`. It retains complete
pinned originals, copies the existing transaction and public wrapper, and adds a
separate operation. The full original module prefixes stay byte exact. Existing
source authentication, native checks, canonical validation, aggregate bounds,
final identities and input-descriptor joins remain in the copied transaction.
The original CST operations execute inside the same authenticated call. Both
substitution phases, complete source before/after and full inverses are retained.

Review `--emit` before installation and require `--check` afterward. All generated
source belongs in the same change as its producer. The complete transaction and
source-equation test files are discovered by the existing mandatory forward
test stage. Complete original receiving tests and their deadlines still apply.

The current receiving user is the
[complete Core source-history adapter](complete-current-core-receiving.md).
This scoped performance repair does not qualify full-source generation, native
runtime parity, reverse synchronization or whole-project translation coverage.

The private DATA source-history composer retains a separate exact later-source
layer for this added transaction. It derives the complete current executor from
the actual producer, joins its full beforeimage to the original DATA adoption,
retains both CST phases and inverse, and freshly checks all producer inputs and
physical identities. Existing adoption proposals preserve the already installed
later API. Unknown source suffixes still refuse. This source history adds no
parser, namespace or executable authority.

## Explicit language and repository phases

`concrete-phased-equations.mjs` provides the separate
`transportConcreteSourcePhases([{before, middle, after, language}])` DATA API.
It applies the actual complete `before` → `middle` edit in the `language`
sequence and `middle` → `after` in the `repository` sequence. Each stage
serializes and reparses the full canonical document before the next stage.
Each inverse runs in that same phase and also serializes/reparses. Complete
canonical bytes must equal independently built original/middle/final rows.
Returned traces use new `source-phases:complete-*-edit` IDs; they do not claim
to execute any previous producer's rule IDs or partial native-span edits.

The separate generated private sibling copies the complete pinned existing
executor prefix and its original transaction. Original APIs and source pins
remain unchanged. It authenticates the original physical parser closure before
and after each complete call, preserving final source identities, original
intrinsic checks, complete input-descriptor joins and captured-function joins.
It shares that authentication only inside the new explicit transaction, with
no new result/source/verdict cache or caller callback/private frame.

An input has at most 85 triples (255 original rows), with unchanged aggregate
source/UTF-8/node/canonical bounds across all three members of every triple.
Ordered ordinary data, primitive strings and supported languages are required;
proxies, getters, sparse arrays, extra fields, changed input and mixed languages
refuse. Edited source remains DATA and needs independent semantic checking.
`prepare-concrete-phased-equations.mjs --emit|--write|--check` retains the full
original snapshot, actual native selections, both CST stages and all inverses.
A finite complete-project diagnostic compares every canonical stage and inverse;
it does not qualify the original whole receiving deadlines, matrix or parity.
# Explicit names for source phase rules

`transportConcreteNamedSourcePhases` is a separate DATA entry point for whole
source equations whose existing rule identifiers must survive batching. Each
ordered own-data row supplies `before`, `middle`, `after`, `language`, and four
`rules`: language edit, repository edit, language inverse, repository inverse.
The actual substitution runner executes those identifiers; traces are never
renamed after execution. Both phase names remain `language` and `repository`.

`prepare-concrete-named-phases.mjs --check` derives its complete native
transaction from the pinned original phased transaction, with full CST
serialization, reparse and inverses. Original public transactions stay exact.
Each call freshly authenticates the complete parser graph, reparses every stage
and inverse, and rejoins both original caller and private rule descriptors after
native callbacks. There is no retained source verdict or semantic authority.
Four complete receiving cases pass in both Node and Bun with their original
60000-ms deadlines. Producer integration and whole-file performance remain
separate qualifications.

