# Scalar return literal alias source draft

SOURCE ONLY. Source, cases and both complete equations remain UNRUN. CI feedback
is uninspected. Full drafting, actual coverage, freshness and parity remain OPEN.

The private source scope retains only the canonical integer text of an actual
immutable literal binding or its original-symbol alias. When a bool/u64/i64-family
function returns a u64/i64 alias, the existing checked literal narrowing rule
substitutes that value at the return, including pure conditional arms.
The condition remains in its original evaluation position; mixed signed arms
use only the existing bounded literal narrowing rule. Original declarations and all earlier
statements remain in order. Intermediate unsigned uses retain their original
type; no back-propagated signed type can change an earlier builder or operation.
No arbitrary input, conditional/effectful value or saved metadata becomes a
constant. These local facts leave scope on exit and never cross operations.

Two full source equations retain originals, CST inverses, and language then
repository phases. Six direct and four conditional alias forms draft both authorities, extrema, branch scopes,
prior JSON builder effects, repeat synchronization, signed overflow, unsigned
negative and arbitrary-input refusal. All remain unrun. General constant folding,
checked dynamic conversions and all broader operator/namespace/ownership/effect/
synchronization/receiving/race/platform/performance/CI obligations remain OPEN.
Eight same-SHA JavaScript stages still precede fatal CI-only Rust. No local test,
compilation or translator/preparer execution ran.
