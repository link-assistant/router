# Owned JSON value field source draft

All implementation and independent case SOURCE is UNRUN; no local parser,
translator, generator, test or compiler ran and CI feedback is uninspected.
Full production translation, parity, synchronization and delivery remain open.

Actual response code repeatedly gets a JSON child, clones it and defaults to
Null. Fifteen paired interfaces cover string paths at depths one through four
and native array indices: owned Option<Json>, owned Json defaulting to Null,
and borrowed Json defaulting to a static Null. They retain Some(Null) versus
None, every JSON kind, exact string keys and original index conversion bounds.

Complete original native getter functions receive language substitutions for
standard cloned/null expressions and owning versus shared return types;
repository substitutions rename their actual function tokens. JavaScript
reuses the original reader expression and the existing canonical deep copy/null
implementations. Selected non-Null owned storage is independent, while borrowed
storage retains identity. Existing 4096-node/depth32 copy limits remain intact.

Both original source adopters combine only exact cloned and qualified canonical
Null fallbacks; arbitrary fallback expressions remain in their original eager
position. The invocation-local chronological tracker can schedule a complete
selected Json initializer after its actual semicolon, constrained by any written
type, for later field reads in the same pass. Exact qualified field calls and
Option Try projections also expose source-only owned/shared roles. No source
fact grants actual ownership, borrowing, Drop or semantic permission.

All76 interfaces remain source-bound. Forward rules retain distinct shared Json,
owned Json and actual Option<Json> outputs. Both reverse lanes reuse existing
owning/borrowed contracts, and the complete resource checker still refuses local
view escapes, moves, replacements and temporary borrows. Ten complete compiler
equations plus15 native function copies retain language then repository phases,
complete immutable originals and serialized/reparsed CST inverses.

Independent unrun source covers all15 APIs, all JSON kinds, Some-null/missing,
copy versus pointer identity, Unicode/numeric/object/array values, index bounds,
noncoercion, two adopters and15 original callers, same-pass local composition,
bulk JavaScript/strict TypeScript, both reverse lanes/interpreters, native
standard-expression/lifetime oracles and exports. Every wider ledger obligation
and all receiving/freshness/parity verification remain OPEN. All eight same-SHA
JavaScript gates before fatal CI-only Rust remain unchanged.
