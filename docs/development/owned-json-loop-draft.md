# Canonical JSON loop source draft

The owned-outcome source checker now drafts ordinary `for (const value of
values)` blocks over actual shared/owned canonical JSON lists. Original native
bindings determine iteration variables and the collection type. Lexical scope,
outer owned assignments, nested loops, early returns and zero-iteration
continuation have implementation in both independent interpreters and target
emitters. Assignment invalidates earlier guard facts at continuing loop joins.
Iteration roots have private source-selected identities and cannot masquerade
as same-named input roots or escape as borrowed outputs.

Rust emission evaluates a copied list snapshot once, checks the complete
canonical array resource envelope and iterates its native slice. Reassigning an
outer vector leaves the active snapshot intact. The new complete Rust syntax
reader copy distinguishes these loops from the original runtime guard loops.
Projection strips only the canonical iterator adapter, freshly checks the JS
proposal and requires complete Rust reproduction, including every guard.

JavaScript/TypeScript retain their ordinary immutable-array iteration contract.
The existing source node/depth and JSON size/depth/length limits remain. General
iterators, iterator side effects, mutable iteration bindings, escaping item
loans, break/continue and async iteration stay refused. Nested finite workloads
still require later performance qualification; no benchmark has run.

Seven complete original source modules/producers, ordered language/repository
substitutions and full CST inverses retain prior implementations. Independent
JS/TS/interpreter/inverse/refusal and native oracle source is drafted and unrun.
Forward standard loop lowering, automatic loop adoption, broader control and
all other ledger requirements remain unfinished.
