# Bounded primitive initializer expression source draft

All implementation, source equations and independent case source is drafted and
unrun. This is no executable coverage, full translation, arithmetic-equivalence,
current freshness, native/target parity or whole-project synchronization result.

The existing integer alias family now recognizes bounded complete initializers
built from known native fixed primitive aliases, suffixed/static-bound literals,
written-domain bounded decimal literals, parentheses, unary negation/complement
and matching-domain integer arithmetic/bitwise/shift expressions. A two-pass
source grammar finds one consistent native domain and then qualifies every
literal/operand under it. Mixed/unknown/cast/comparison/call/index/Boolean and
out-of-bound operands remain unproved. Unsuffixed expressions without a known
or written native domain remain unknown. Unsigned negation refuses even zero.
No expression is evaluated, rewritten, folded or assumed free of panic/effects.

A shared optional initializer-end selector counts actual tokens against the
original chronological engine cell bound, with a hard 256-token operand and
64-level/1024-cell local grammar. Other family selectors retain their old
finite-size lane. Direct separately selected method result facts retain their
original complete-initializer and semicolon checks. Native expressions remain
verbatim while later known integer methods use the existing real language then
repository core substitutions. Existing closure/pattern/namespace/producer and
whole-function ownership/type/arithmetic/emission checks remain; the actual
integer adopter still retains its original closure-pipe refusal.

Four complete source equations retain original implementations, native owners,
serialized/reparsed CST and all inverses. Independent unrun cases cover domain
agreement, precedence/sign/bounds, no-evaluation division-by-zero DATA, source
scope/timing/spans, charged bounds, both proposer APIs, the fixed bulk stage,
fresh JS/strict TS, export receiving and original-versus-core native behavior
for defined sample inputs. Wider arithmetic/effect parity and every remaining
source/native/production/sync/freshness/parity/delivery requirement stay open.
No cross-operation cache, test execution, compilation, generation or CI feedback
is introduced; every original same-SHA JavaScript gate before fatal CI-only Rust
remains mandatory.
