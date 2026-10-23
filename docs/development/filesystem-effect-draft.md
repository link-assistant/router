# Filesystem effect source draft

This unverified bulk draft extends the original standard filesystem effect
family with `read`, `rename`, `create_dir`, `remove_dir`, `remove_dir_all` and
`hard_link`, for both `std::fs` and `tokio::fs`. It retains the original eleven
contracts and the complete original adapter module. Binary reads produce
immutable checked `Vec<u8>` values represented by BigInt bytes. Path, error,
capability and asynchronous polling behavior remain explicit contracts.

`prepare-filesystem-effects.mjs` captures complete pinned originals, selects
native import/declaration spans and derives a separate complete runtime copy.
Its language sequence copies the original adapter and original lazy-future
implementation. Its repository sequence binds the additive contracts, runtime
and declarations. Both stages retain full serialized/reparsed CST and inverses.
The source producer has not been executed or qualified during drafting.

The separate reverse API accepts complete JavaScript/TypeScript modules of
typed direct filesystem wrappers. It resolves actual named imports against the
entire current runtime source, reconstructs the original CST, serializes and
reparses operation meta, then checks emitted Rust through the existing semantic
parser/checker and checked-meta round trip. Native string annotation edits
retain full source inverses. This lane does not widen the existing portable or
owned reverse APIs and does not implement arbitrary JavaScript modules.

Synchronous wrappers directly call qualified standard filesystem functions.
Asynchronous wrappers return `deferFilesystemEffect` with a literal operation
and actual bound operands. That helper copies the original lazy future. Eager
JavaScript async wrappers are refused because their invocation/polling behavior
differs from Rust futures. Borrowing, callbacks, arbitrary path expressions,
annotations outside the explicit string subset and indirect imports remain
separate requirements.

The independent JS/TS regression source and Rust oracle source are drafted and
unrun. Recursive removal of a regular file must refuse; a root symlink must be
removed without traversing its target. Adversarial concurrent path replacement,
platform-specific behavior and all generated target checks remain unverified.
Do not claim complete filesystem equivalence, coverage gains, full translation,
CI success or receiving qualification from this source draft.

All tests, producer qualification, generated freshness and experiments remain
deferred until the entire requirement set in the bulk draft ledger is drafted.
No Rust tools may run locally. New source-bank/compiler exports will need the
complete current Rust and translator inputs after this drafting phase.
