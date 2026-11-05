# Primitive helpers in whole-project body synchronization

The existing standard numeric body synchronizer now drafts native casts,
shifts and eager boolean/fixed-integer bitwise calls from the actual original
forward compiler imports. Its source observer selects actual named imports
from the entry-relative primitive runtime module, retains complete current JS
and declaration sources with serialized/reparsed CST, and verifies those source
bytes again before returning observations. No cross-invocation cache or runtime
execution is involved. Captured runtime source is shared only within that one
synchronous proposal, with fixed call/history and existing source/depth bounds.

Candidate lowering requires the actual imported local name, a complete ordinary
call, literal registered widths/signedness and the fixed operation. It refuses
spread/generic/optional calls, dynamic metadata and lexical shadowing. It proposes
ordinary Rust `as`, shift and eager bitwise syntax. The existing compiler must
freshly check every complete modified Rust source file, preserve the full
executable/refusal census and reproduce every complete requested target body
and all surrounding target source. The independently checked source types and
full target reproduction enforce operand/metadata correspondence; observation
rows themselves grant no semantic, owner or executable permission.

This composes with existing fixed-factory and floating numeric calls and retains
the original language/repository sequences, complete Rust and paired JS/TS
inverses, original parameter guards, all original deadlines and unchanged default
observation shapes when no primitive imports are present. Both edited JavaScript
and edited TypeScript use the same source-bound proposal path. This remains a
bounded safe nongeneric scalar-body synchronizer; arbitrary generated modules,
other application behavior and full project parity remain unfinished.

Four whole compiler source equations, unrun JS/TS source matrices covering all
ten input/target/count widths, eager boolean truth tables, independent strict
TypeScript receiving sources and wrong-import/metadata/shadow/refusal controls
are drafted. A CI-only Rust oracle is also drafted. Every new check is **unrun**;
no runtime, performance, coverage, freshness or complete synchronization result
is claimed. All remaining ledger requirements remain open.
