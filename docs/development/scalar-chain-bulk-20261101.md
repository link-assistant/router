# Eager scalar map/filter chains — source draft

`tools/translation/scalar-chain-bulk-20261101.mjs` adds actual lowering for
2..8-stage scalar `map`/`filter` collection initializer chains. Each stage
finishes and materializes its entire vector before the next starts. This
preserves the eager JavaScript stage order even when a later element's primitive
arithmetic fails. There is no callback fusion or lazy iterator override.

`proposeScalarChainBulk(data, {family, modules})` takes complete existing
`outcome`/`cancellation` receiving sources with `primitiveOperators: true`. Each
module has `sourcePath`, fresh `rustPath`, and `chains`; each chain selection has
`function`, `local`, and `domains` (one candidate output domain per stage).
At most 16 modules, 16 chains/module and eight stages/chain are admitted.
Candidates cover bool and the existing signed/unsigned primitive widths.
The shared `scalar-chain-bulk-20261101-expression.mjs` source planner derives
input candidates from written primitive slice syntax separately from each
selected output domain. Arithmetic/complement/shift/bitwise expressions lower
to hygienic imports of genuine existing checked primitive operations, rather
than leaving unsupported raw arithmetic in the owned source path. A u64 map
may produce bool, and a bool conditional may produce u64. Candidate syntax and
domains remain DATA; every emitted operand/import/result is checked again.
The actual complete checker independently proves every input/item/output
domain, callback predicate, namespace binding, runtime dependency and ownership
transition. Candidate domains never provide authority. Wider primitive input
widths still need their original written input guards; this API creates none.

The first stage uses the original checked shared-slice `for..of`. Owned
intermediate vectors are deliberately traversed through actual qualified
primitive-vector `len`/`get` APIs: an immutable checked u64 length, a counted
loop, and a dominating checked `Some` tag before scalar payload access. Each
stage has a separate empty vector and checked move/rebind pushes. Intermediate
inputs remain unchanged during reads; no aggregate loan escapes. This also
retains per-stage 4,096-value bounds. Generated intermediate, length, index,
option and import names avoid every identifier in the complete original module.

The native syntax selector accepts ordinary single const collection locals on
an unused original input parameter, direct nonoptional method chains, and one
synchronous inferred identifier expression arrow per stage. Only capture-free
scalar literal/identifier/operator/conditional expressions are selected.
Captures, index/array callback parameters, thisArg, writes, property/index
accesses, calls, references, suspension and reductions remain refused. Initial
stage callback input shadowing is refused. No original Array method owner is
proven; this remains an explicit primitive input/resource-contract migration.
Sparse/proxy/accessor arrays, species and dynamic coercion are outside its target
domain. Original method-owner, input-contract and body-equivalence flags stay
false.

The language sequence retains complete original statement/callback spans and
serializes/reparses the lossless CST before the real existing vector-loop
compiler checks all stages. Repository rules import only the original qualified
vector operations. Complete original-to-loop, loop-to-core and original-to-core
equations retain exact source/trivia inverses. Original JS and written TS both
pass through actual semantic-meta reissue; independently emitted TS and the
canonical Rust→JS→meta→Rust inverse must reproduce the entire Rust syntax.
Arbitrary authored Rust iterator chains remain outside that canonical inverse.

The final complete DATA occurrence walk accounts for every duplicated
module/bulk/program/meta/source/equation/inverse field and trace, using separate
16,777,216 UTF16-unit/UTF8-byte caps, two-million cells and depth 160. Existing
native source, syntax, ownership and meta limits remain unchanged. Original
contexts close on all paths; failures preserve the primary error. No file is
installed, and no source/owner/verdict/result cache survives an invocation.

Independent JS/TS source cases cover numeric and bool stage transitions,
map/filter/map order, full capacity, hygienic-name collision, canonical inverses,
illegal captures/types/domains and, critically, first-stage overflow on a later
element preceding second-stage division by zero. The independent
`rust/tests/scalar_chain_bulk_20261101.rs` standard-library oracle is discovered
by Cargo CI behind the existing complete same-SHA JavaScript gate.

The standalone API requires no shared dispatch/preparer changes. Automatic
production discovery/adoption, export closure, richer callback ownership,
reductions, lazy/infinite iterators, general authored Rust chain inverse,
filesystem synchronization and full parity remain open. Every new parser,
translator, compiler, preparer, interpreter, test and native execution is
**UNRUN**; CI/review feedback was not inspected. No coverage or checklist closure
is claimed.

`scalar-chain-bulk-20261101-source-equations.mjs` retains complete immutable
before/after copies of the earlier callback module, its original complete cases
and contract, plus the new shared expression helper. Its source proposal checks
the physical current copy and transports every JavaScript equation through both
CST substitution phases with exact full inverses. Markdown snapshots remain
documentation DATA. This additive repair profile is unrun and supplies no type,
ownership or executable authority; it does not rewrite the preparer chain.
