# Conditional pattern source draft

All new implementation and independent cases are UNRUN. The positive source
parser now retains `if let`, `while let` and their direct conjunction chains as
explicit `LetCondition` nodes, with original pattern/value spans. A private
condition context permits let only at the condition head or a direct `&&`
operand; ordinary expressions, nested grouping, calls, closures and match guards
receive no permission. Outer lazy-or, assignments and ranges cannot combine with
let. Nested ordinary boolean expressions retain their old parser path.

The scrutinee uses a separate precedence boundary, following the pinned native
`parse_expr_let` structure, without speculative reparsing or a second token scan.
Existing source/token/node/depth/TT budgets and private AST identities remain.
Edition, feature availability, binding resolution, native AST/visitor dispatch,
namespace ownership and effect qualification remain unresolved. This source
grammar grants no checked semantic program or executable translation authority.
The recursive block model retains nested local-item and opaque macro obligations.

Two whole-module source equations preserve original class/function owners,
separate language/repository sequences, serialized/reparsed CST and complete
inverses. Independent unrun JavaScript cases cover clause order, source spans,
scope traversal, unchanged boolean expressions, opaque tokens and refusals.
CI-only Rust oracle source covers short-circuit effects and loop rebinding.
No parser, translator, model, preparer, test, experiment, generation or Rust tool
was executed, and no CI-triggering push occurred. Complete source drafting,
native closure, target lowering, actual production callers, reverse/sync,
freshness, parity and the mandatory gates remain unfinished.
