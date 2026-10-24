# Forward-derived scalar literal synchronization source draft

`proposeForwardLiteralSynchronization` drafts a whole batch of edits to actual
string, Boolean and nonnegative fixed-integer literals in checked ordinary
functions. Either complete JS or complete TS may supply the requested edit.

The original project compiler now exposes a forwarding `targetBinding()` data
association from each genuine executable declaration to its actual emitted
function name. It closes over the existing final checked program and original
emitter mappings. It grants no source or semantic authority and does not change
which Rust functions translate. The inverse path obtains it from its own fresh
original compilation, together with the actual `checkedSource()` proof. Caller
metadata, callbacks or stored plans cannot replace those issuers.

Language rules parse the complete native target and serialize/reparse CST,
compare every gap outside changed literal tokens, and group each edit by its
actual emitted function and original kind/value. Checked body spans select the
original Rust tokens. When values repeat, the complete source/target multiplicity
must agree before an ordered source proposal is possible. Ambiguous counts
refuse. Each native integer retains its actual primitive name, signedness and
width; overflow and negative edits refuse in this initial scalar family.

The proposal applies nonoverlapping native spans and independently recompiles
the whole modified project once. Its complete target must reproduce every
requested edit and preserve the entire executable/refusal/method census. An
incorrect origin/order proposal therefore cannot silently install. Repository
rules retain every changed Rust file, both canonical targets, all full source
inverses, domain review and trace. No cross-invocation source or verdict cache is
added. The original single and bulk string APIs remain intact.

`planForwardLiteralUnitSynchronization` and its fresh apply API use manifest
schema `router-forward-literal-unit-v1` with the existing explicit entry, JS/TS
authority, paired target and metadata fields. The complete original transaction
retains source/Cargo/workspace/revision captures, paired conflicts, missing
paired initialization, fresh recomputation, guarded replacement, readback and
rollback. The CLI is `scripts/sync-router-forward-literals.mjs`; use its explicit
`--manifest` and exactly one `--plan` or `--apply` mode after bulk drafting ends.
It is part of the shared exported compiler closure and API facade.

Independent JS/strict TS mixed batches, repeated values across/inside functions,
actual u64/usize/u8 identities, upper bounds, negative/kind/code refusals,
source-bound target data and fresh transaction/forgery cases are drafted and
unrun. Compiler/preparer/target/planner/CLI/tests and Rust tools have not run.
Signed literals, floats, other expressions, methods/constants, new source syntax,
complete Router production qualification and the other open ledger rows remain
unfinished. No translation coverage or full parity result is claimed.
