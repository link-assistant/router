# Shared JSON predicate source draft

All new implementation and independent cases are UNRUN. A finite shared DATA
catalogue now lists the nine existing JSON predicates. The reverse reader table
retains its original is_null record and derives the other eight scalar records,
so all seven original reverse checker/emitter paths can use their existing source,
runtime, Cargo and private ownership checks. Result roots are null; these boolean
operations neither expose a payload nor add opaque optional-reader operations.
The original forward runtime already implements these nine predicate contracts.

The shared source adopter also drafts is_some_and/is_none_or on bounded shared
optional JSON receivers, with a canonical function item or a closed zero-argument
predicate callback, optionally negated. The Some branch calls the selected
predicate once; the None branch calls none and retains the corresponding boolean
default. Custom/captured/control-flow callbacks, arguments, shadowed parameters,
removed comments and mismatched payload roles remain unselected. Existing source
and owner uncertainty still refuses. Integer and float predicate domains remain
distinct even when a float carries an integral value.

Five whole compiler equations preserve originals, native owner spans, explicit
language/repository sequences, generated-only path substitution, complete staged
CST/meta and inverses. Independent unrun sources include all nine predicates,
absent/wrong kinds, Unicode, integer extrema, Float(1.0), negative zero, strict
emitted TypeScript and each of the seven genuine reverse receiving contexts.
CI-only Rust oracle source retains native results independently.

No runtime, parser, translator, preparer, test, experiment, generation, Rust tool
or CI-triggering push ran. Complete production caller admission, original native
namespace/effect closure, wider optional payloads/callbacks, exports/source banks,
reverse/synchronization/freshness, parity and all complete gates remain open.
