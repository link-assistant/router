# Shared nested nonbinding pattern shape source draft

All implementation and independent cases remain SOURCE only and UNRUN. No local
parser/translator/preparer, tests, compilation, experiments or CI feedback were
executed or inspected. Full source drafting and complete translation are unfinished.

The shared closed match pattern grammar now recursively selects nonbinding tuple
constructors, tuples/unit, slices, explicitly ignored record fields, shared/mutable
reference patterns, closed literal/qualified-path ranges and nested or-patterns.
This includes Some(_), Err(_), ignored nested variants and record rest forms.
The actual arm reader retains complete pattern groups before selecting the whole
arm, and the same inventory/census/pipe rules automatically serve all seven local
readers and existing text/integer/builder adopters. No family-specific runtime or
ABI was added. Complete source/CST inverses and original target positions remain.

Every child must stay nonbinding. Bare unknown unit names, payload/reference
binding identifiers, record shorthand, at-patterns, guards, macros, duplicate rest
positions and malformed fields stay unsupported. Qualified paths and wildcard
constructors prove neither actual variant/field identity, type, arity,
exhaustiveness nor original ownership/drop/effects. Whole original source/type/
namespace/semantic and target reproduction checks remain mandatory. Opaque
callbacks retain their own scopes. Existing 128-token pattern, 64 recursion/group
depth, 512 match/arm records and 200000 combined source-work limits remain;
there is no cross-operation source/hash/owner/verdict/result cache.

Two complete immutable source equations extend the shared grammar and join the
entire earlier native source history, using language then repository rules,
original owners, full serialized/reparsed CST and physical inverses. Independent
unrun source covers both adopters/two complete Option/Result callers/four edits,
actual native factories and JS/strict TS Unicode/NUL/none/error/drop behavior,
recursive constructor/container/reference/range/or-pattern source bounds,
no-binding census, shadow/guard/macro/malformed/depth refusals, original Rust
container/variant semantics and export closure. Earlier source-family inverses
and receiving cases remain retained through their successors.

Bindings/guards and broader pattern/source constructs, namespace/producer proof,
production coverage, complete forward/reverse/sync/freshness/parity,
receiving/performance qualification and delivery remain OPEN. No executable
coverage increase or verified completion is claimed. Existing eight same-SHA JS
stages still gate fatal CI-only Rust checks.
