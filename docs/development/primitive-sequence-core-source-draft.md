# Primitive sequence compatibility core source draft

All implementation, cases, declarations and native oracle sources are UNRUN.
Full translation and the entire requirement draft remain unfinished.

One shared domain/operation family source writer drafts 33 matching core
operations: length, emptiness and copied indexed lookup for bool and all ten
fixed integer domains. The Rust implementation delegates to native shared slice
operations; those library internals can remain untranslated. JavaScript uses the
explicit dense frozen primitive slice envelope, preserving scalar values without
coercion, getters, proxy traps, hidden mutation or cross-invocation caches.
TypeScript declarations retain each primitive alias and exact None/Some tags.

Length is a checked u64 conversion in Rust and BigInt in JavaScript. Indexed
lookup accepts an actual u64, converts to native usize with checked conversion
and returns None for an unrepresentable or missing position. JavaScript converts
an index to Number only after proving it is inside the actual array length.
Neither implementation assumes a pointer width. Lookup copies the primitive
payload and returns a distinct option tag, preserving Some(false), Some(0), and
the signed/unsigned 128-bit extrema. There is no 4,096-element runtime cap.

The checked-in operation catalog has separate language and repository rule
sequences covering the whole family. They are DATA and candidate substitutions,
not permission to bind a caller or claim executable application coverage. The
native root is deliberately still unactivated in these records: exact public
root/module binding, private forward/reverse caller checks, receiver loan/order
integration, runtime asset registration, complete receiving and automatic
application adoption remain required source work. The new native file is
included directly by its CI-only integration oracle; no current app source or
native root-history input has changed in this component batch.

Six complete compiler source equations retain whole existing core/runtime/
declaration/catalog seeds, complete source replacements, exact inverses and
language then repository phases. The family source writer uses one domain list
to draft every implementation/declaration/rule row rather than hand editing
33 independent copies. Independent cases use separately written extrema and
observable results, including empty/last/missing/huge indices, adjacent range
refusals, falsy options, immutable payload copying and long input. Strict target
declaration source records the actual compiler version when it is eventually
run. Native oracles compile only in fatal Rust CI after all same-SHA JavaScript
stages succeed; no Rust is run locally.

No parser, preparer, generator, translator, compiler or test was executed while
authoring these files. CI feedback remains uninspected. Native root activation,
private source/type/ownership admission, all translator integration, freshness,
performance, platform/export receiving and complete parity remain OPEN. This
library draft alone establishes no translated production function or percentage.
