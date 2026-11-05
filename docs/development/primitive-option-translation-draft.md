# Primitive Option translation draft

The finite Option interfaces now have actual source-binding drafts for JS/TS
callers, both independent interpreters, Rust/TS emission, canonical Rust inverse
projection and forward native caller checking. Exact native/runtime sources and
the real standard Option owner and payload layouts remain mandatory. Existing
optional-parameter refusals remain for other layouts; the
[closed primitive input draft](primitive-option-input-draft.md) now covers actual
bound bool/u64/i64/str Option inputs through the full native source boundary.
Internal readers, constructors and checked local values are supported too.

Presence predicates refine only the actual bound optional variable. All payload
projections still require a dominating Some fact. Eager fallback preserves
false, zero and empty Some values. Unsigned payload/literal return joins narrow
only fresh literal expressions, in either branch order; arbitrary usize or signed
variables do not acquire a u64 identity. Known absence propagates through fresh
immutable locals. The actual private str_none call receipt supplies its empty
borrow-origin theorem; a public descriptor, copied node or checksum cannot.

Both runtime providers include the new modules. Twelve complete original source
implementations retain separate language and repository substitutions and full
CST inverses. Independent actual JS, strict TS, native forward/inverse, body,
width/sign, lifetime, malformed-source, detached-program and history cases are
drafted and unrun. Native root/oracle source remains separate and unrun too.

General optional inputs, callbacks and mapping, Result/error counterparts,
automatic standard method adoption, production synchronization and the remaining
bulk draft ledger obligations still need implementation drafts. Nothing here
establishes coverage, complete translation, parity, timing or green CI.
