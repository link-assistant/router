# Explicit return owning-text context source draft

All implementation and independent cases remain SOURCE only and UNRUN. No local
parser/translator/preparer, tests, compilation, experiments or CI feedback were
executed or inspected. Full source drafting and complete translation are unfinished.

A shared language reader selects the complete operand of an actual return token
through balanced groups until its actual top-level semicolon, comma or enclosing
block boundary. It issues source bounds only, never a function boundary, expected
result type, original binding, ownership, Into dispatch or semantic proof.

The actual text adopter calls that reader only during its existing nonopaque
whole function scan and only when the original written function result is
explicitly owning String. It reuses the existing expression/if/block/closed-match
expected target reader and original borrowed conversion rules. This extends
return-if, return-match, parentheses, nested early returns and return expressions
in match arms together. Existing native source/CST, whole original name/type/
trait/ownership/effect and target checks remain mandatory. Callback bodies retain
their actual separately selected result contexts: an outer String result cannot
be used to infer an opaque callback's return type. Borrowed and unknown result
contexts keep their original Into source.

Balanced groups count against the existing combined 200000 source work limit;
malformed or escaping delimiters remain unsupported. Original producer/closure/
macro refusals and callback exclusions remain. No new cross-operation source,
hash, owner, verdict or result cache, ABI, phase or workflow change was introduced.
All eight same-SHA JS stages still gate fatal CI-only Rust checks.

Four complete immutable equations retain original native source owners,
language then repository sequences, full serialized/reparsed CST and exact source
inverses. Independent unrun source covers both adopters/five callers/ten edits,
complete JS/strict TS Unicode/NUL/empty/branch behavior, exact return bounds,
malformed delimiter and borrowed/unknown/opaque-callback refusals, original Rust
return semantics and export closure. Wider language and mutation/iterator/closure
constructs, namespace/producer closure, production coverage, complete forward/
reverse/sync/freshness/parity, receiving/performance and delivery remain OPEN.
No executable coverage or verified-completion claim is made.
