# Primitive Result compatibility core source draft

The shared catalog declares 88 matching native/JavaScript interfaces for
`Result<bool/u64/i64/&str, String>`: constructors, predicates, explicit unwrap
and expect boundaries, eager defaults, success/error Option conversions, all
sixteen mapping pairs and sixteen binding pairs, error mapping, lazy defaults
and lazy recovery. Native standard-library internals intentionally remain
native behind these explicit interfaces. Declarations are generated from the
same finite interface catalog; declarations supply no source admission.

The runtime is a complete source copy of the original primitive Option runtime.
Language substitutions add strict Result behavior; repository substitutions add
named exports. Carriers require exact own-data fields and scalar payloads,
preserve false/zero/empty, reject proxy/accessor inputs without calling their
traps, validate UTF8/range/resource boundaries and allocate fresh tagged values.
Error callbacks execute only on errors. Unwrap/expect failures use the explicit
error message as their boundary, with JavaScript RangeError and native panic.
Those are compatibility API semantics; adoption does not prove the old standard
method panic payload, trait dispatch, allocation timing or arbitrary Drop.

Borrowed mapping input and callback-output lifetimes remain separate. Error
mapping preserves the receiver success region. Lazy recovery retains both
possible success regions. Borrowed unwrap/fallback returns owned text. All text
and error values retain the existing one MiB UTF8 limit.

The native root producer is a complete copy of its prior producer, with complete
old root/source inverses and adjacent parent histories. Independent JS and native
Rust oracle source covers boundary values, distinct variants, all mapping/bind
pairs, laziness, captured output lifetimes, callback faults, malformed values,
resource refusals and source history. No runtime, preparer, translator, compiler,
test or CI was executed during drafting. Caller checking, ownership/error flow,
both directions/interpreters, packaging, adoption and production use remain open
along with the rest of the requirement ledger.
