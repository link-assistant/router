# Original declaration lists and loop-header sequences

The existing actual-node declaration checker now consumes a bounded list of
original declarations, checking each initializer in source order before binding
its name. Ordinary scalar/owned annotations, moves, loans, duplicate names,
channel patterns and cleanup retain their previous obligations. Only the final
declaration can use the immediately following same-container guard. No synthetic
AST declarations or guessed source bodies enter the checker.

Scalar for headers accept the corresponding bounded initializer list and comma
sequences of actual scalar assignments/effects. Every update still preserves the
whole loop state and executes in its original order on every nearest continue
and fallthrough. Range-proven raw unit updates retain their original single
update/strict-bound rule. Header declarations stay in their actual emitted Rust
scope. Their mutability is collected from that loop alone; same-spelled bindings
in sibling scopes cannot alter it or the surrounding function's declarations.

Complete prior implementations and the superseded single-declaration refusal
are retained with exact language/repository substitutions and CST inverses. The
old broad multi-initializer refusal now checks a genuinely invalid duplicate
binding; the former valid case is an explicit independent positive source case.
All original whole-body, ownership, type, source and meta checks remain required.

JS, strict TS, full native inverse, left-to-right effects, scoped mutability,
TDZ/move, source bounds and forged-meta cases are drafted and unrun. No compiler,
preparer, translator, verification, test, experiment, Rust tool or CI was run.
General expression sequences, destructuring types, raw arithmetic and every
unfinished bulk requirement remain open.
