# Scalar and canonical JSON early-return source draft

SOURCE ONLY. All implementation, equations, cases and receiving obligations are
UNRUN. Whole drafting, coverage, parity, freshness, resources, platforms and CI
remain OPEN. No implementation, parser, translator, test or compiler ran locally.

The actual-AST terminating guard rule now drafts all existing closed scalar and
canonical JSON result profiles. The original then block must terminate, and the
remaining original statements must form a complete correctly typed continuation.
Only actual unit returns retain final implicit fallthrough. Original symbol,
loan, Some refinement, move and complete branch-result checks remain in place.
No fabricated syntax node or saved semantic result enters the original checker.

Canonical output reuses the existing if/else, concrete-syntax and meta paths.
A None guard with a genuine early return can establish Some in the continuation;
it cannot establish a loan when its then branch falls through. Both scalar helper
closure and native JSON loan checking remain independently required. Effects keep
their ordered branch prefix, and original native statement-control observations
remain separate work. Primitive-vector literal profiles keep their own source
reader and do not acquire this rule automatically.

Two complete source equations retain originals/inverses under exactly language
then repository phases. Independent drafts cover bool and u32 scalars, owned JSON,
owned JSON vectors, multiple guards, None/Some helper text loans, both authorities,
strict typed behavior, independent interpreter results and missing/mixed/partial
continuation refusals. Every case is UNRUN. Full native control/effects/ownership/
aggregate/module lifecycle and receiving/CI remain OPEN; fatal Rust stays CI-only
after eight same-SHA JavaScript gates.
