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
