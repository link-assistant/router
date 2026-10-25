# Owned JSON resource caller state: source draft

Every implementation and independent case remains unrun. This source family
composes the existing matching native/JS JSON storage library into the complete
resource caller checker: owned field/index updates, append, field removal,
merge, object keys, array length and key presence. The original parser facade
also supplies optional owned JSON parsing; invalid JSON remains None while
successful JSON null remains Some(Null).

Actual library and runtime sources, their root/facade edges, the complete
native function census and locked JSON dependency inputs remain mandatory.
The operation table is DATA. Imports must select the real current module and
the whole caller must still pass source analysis, checked semantic meta
serialization/reparsing, fresh reanalysis and complete CST/source inverses.
Existing native implementations and runtime representations are reused rather
than copied into each caller. Existing physical unit mappings and runtime
budgets remain unchanged.

Mutable locals require an actual owned JSON value from a checked constructor,
copy or successful carrier. A public shared JSON input cannot become owned
merely through `let`. Replacements consume their original owned operands,
preserve the full domain and backing-root checks, and restore moved slots only
after a complete successful typed assignment. Branch and loop joins preserve
the same ownership, guard and root invariants as other resource state. Aliasing
one owned JSON operand into two moves is refused. Standard allocation, serde
and Drop internals remain intentionally native under the existing bounded
successful-resource contract; exceptional/unwind equivalence remains open.

List-bearing and callback-bearing storage operations keep their original
independent domain checks and are not admitted through the scalar/JSON table.
General borrowed JSON view returns, list iteration/callback composition,
outcome-sensitive state, namespace/bootstrap, production adoption/parity and
every other incomplete requirement remain open.

Full original contract, source-capture, flow and native-projection copies retain
ordered language then repository substitutions and complete source inverses.
Independent unrun JS/strict TS source covers real storage callers, owned loop
updates, Optional JSON, malformed source/runtime inputs and duplicate moves.
Separate Rust oracle source covers input preservation, Unicode, optional null
and out-of-bounds native failure. No receiving execution or coverage gain has
been measured.
