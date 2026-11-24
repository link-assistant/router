# Shared JSON slice iteration: source draft

All implementation, receiving cases and native oracle source remain unrun.
The complete resource caller checker now substitutes actual synchronous
`for (const item of values) { ... }` statements over a live qualified JSON list
binding. The source input must establish either the owned native Vec domain or
the shared native slice domain. Arrays, annotations, spelling and public meta
fields cannot grant that domain or an iterable implementation.

Each element is an immutable JSON loan retaining every actual list root. Owned
lists receive an explicit native shared borrow for the entire loop. Element
loans prevent list moves and replacements within the body, even on a path that
breaks. Complete loopbacks and nearest-loop exits preserve incoming static
ownership/resource/type state. Actual function exits retain their separate
return domains and input roots. Local elements do not escape their lexical
iteration scope; returning an element requires a public immutable input root.

Nested loops, continuing branches, break, continue and actual function returns
reuse the complete flow rules. Native reader and projection copies retain the
actual loop binding and borrowed iterable, reconstruct the entire JavaScript
source and require fresh checking plus exact complete Rust token reproduction.
All original resource input domains now initialize native projection locals,
so signature spelling alone never supplies a missing function body proof.

Full originals retain language then repository substitutions, native-selected
owners, serialized/reparsed lossless CST and complete inverses. Independent
unrun cases cover empty input, Unicode values, original ordering, nearest-loop
exits, owned-list borrowing, borrowed element identity, forged meta and attempted
replacement while borrowed. Destructuring, async iteration, arbitrary iterable
expressions, mutable element bindings and general iterator protocols remain
open. Production adoption, namespace/bootstrap, full synchronization, native
parity and every other unfinished ledger requirement remain open.
