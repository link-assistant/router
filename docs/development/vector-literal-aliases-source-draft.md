# Immutable primitive literal alias source draft

All implementation and cases UNRUN. Full drafting, complete translation and
all verification obligations remain OPEN. No local tests, compilers or translator
execution ran, and CI feedback remains uninspected.

The private receiving traversal records a small literal value only after the
actual original immutable binding, symbol, initializer and absence of a paired
written or JSDoc type have been checked. This is function-local bookkeeping, not
public IR metadata or a permission flag. Actual aliases use the same original
lexical-symbol checks. Typed constants keep their exact written domains.

Each use of an unqualified literal alias is substituted with that actual literal.
A genuine fixed-domain operation supplies its existing range/type constraint;
vector inference otherwise keeps the literal unanchored until a real typed item
or written return resolves it. This permits zero/default aliases, comparisons,
conditional choices, helper arguments and primitive return joins without adding
casts to typed variables. Literal-only vectors still cannot guess a width.

Only pure immutable literal definitions whose every use is substituted are
omitted from the semantic body. Their complete original spelling, local type
absence evidence and exact whole-source CST inverse remain retained. This avoids
introducing unused native variables. Checked calls, operations, conditions,
borrowed values and other evaluated initializers are never treated as such
literals or removed; their eager effects and failures stay in source order.
The complete source binding census keeps the existing native 64-local bound,
including substituted literals, before lexical binding scans and emission.
The old JSON constant observation remains unchanged outside the new vector
inference profile. Inside it, typed constants cannot use that older observation
to retype a helper argument merely because its value would fit.

Two complete source equations retain whole originals, lossless serialized and
reparsed CST/meta, exact inverses and language then repository phases. Draft
cases cover all ten widths, signed JS JSDoc input, alias chains, comparisons,
checked operations, scalar helper calls/return joins, separately qualified use
domains, typed-width/range/JSDoc refusals, literal-only/mutable/forward refusals,
eager unused-operation failure and independent CI-only Rust alias oracles.
All remain unrun; no coverage or runtime parity claim is made.

Unannotated constants beyond existing default scalar bounds, dynamic conditional
initializers, general constant evaluation, mutable/state aliases, returned text
loans, Vec input/mutation/iteration, cross-module calls and native owner producer
closure remain OPEN. So do strict parity, freshness, performance, platform,
receiving export and CI qualification.
