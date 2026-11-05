# Complete conditional value source draft

Actual JS/TS ternaries now work in returns, local initializers and operation
arguments. The condition must have its original Boolean domain. Each complete
arm is checked from the same incoming environment; native types and resulting
ownership/resource states must agree. Every possible borrowed root is retained.
Selecting different moved owners still refuses until a separate partial-move
join exists. No source spelling or public meta supplies a semantic permit.

Native emission uses ordinary conditional expressions and evaluates only the
selected arm. The canonical reader already retains original conditional blocks;
projection now handles complete expression-only value arms. The entire proposed
JavaScript re-enters the actual checker and reproduces all native tokens before
acceptance. Body statements inside native value arms keep their explicit refusal.

Full original checker/projection sources, both ordered substitution sequences
and complete CST inverses are retained. Independent unrun JS/strict TS/native
source covers local/argument/return selection, nested conditions, lazy failures,
temporary owned JSON loans, multi-input returned roots, moves and forged meta.
The twelfth independent native oracle joins existing gated CI discovery. No
translator, preparer, test, diagnostic, runtime or Rust tool executed. Partial
moves, wider language domains, namespace/bootstrap, production parity and all
other unfinished bulk requirements remain open.
