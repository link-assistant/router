# Tracked external textual macro inheritance draft

All implementation, regression and native oracle source is drafted and unrun.
No tests, experiments, compiler diagnostics, preparer/translator execution,
regeneration, Rust tools, push or CI ran. Every unfinished [ledger row](bulk-draft-requirements.md)
remains open. This batch supplies no measured coverage or parity result.

A complete copy of the attributed scoped source adapter now traverses the actual
tracked module graph. Ordinary external child files inherit precisely the macro
definitions visible at their original declaration, using one private macro
engine and one synchronous source-attribute frame for the whole operation.
Actual child-local shadows stay inside that child and its descendants. Unknown
child producers invalidate later parent candidates until a fresh original
textual definition supplies a supported binding. Original single-file APIs stay.

The graph is recomputed from complete original physical snapshots, serialized
and reparsed CST and actual private tracked-path plans. Module paths, file/view
associations, source positions and inherited configuration remain exact.
Missing, cyclic, ambiguous or unresolved graph inputs prevent expansion. Passive
builtin source proofs, existing literal/follow/hygiene/forwarding checks and
unknown attribute/macro refusals remain. No complete architecture namespace or
macro_use/export rule is inferred from lexical expansion.

Each physical file retains its whole original, selected invocation spans,
complete expanded source and CST inverse. Unreferenced files remain in the
captured universe unchanged. The new project API compiles that complete expanded
universe through the existing enclosing frontend and checked meta/target path.
It reports expanded-source checking separately from original-source equivalence
and application coverage. Neither is qualified by this source adapter. Source
changes invalidate the operation; all transient engines and maps are discarded.

Four complete source equations retain native owners and language/repository
sequences. Public synchronization routing includes both new APIs so static
export closure sees their real dependencies. Independent unrun source covers
external/inline inheritance, definition timing, lexical shadows, unknown child
producers, original graph/path/refusal cases, fresh snapshots, complete physical
inverses, JS/strict TS targets and unchanged old project behavior. A separate
multi-file Rust oracle drafts ordinary native scope behavior for gated CI.

Macro_use/export, external definition-site name resolution, function-local
textual rules, generated architecture type exports and producer bootstrap remain
separate prerequisites. Wider types/effects, production adoption/parity, full
receiving, freshness/performance repairs and every unfinished gate remain open.
