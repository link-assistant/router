The full original Rust 1.89.0 rustc_ast_lowering expression source is preserved
with its original Git blob and SHA256 identities. Source is MIT OR Apache-2.0;
full retained licenses are in ../copy-standard/LICENSE-MIT and LICENSE-APACHE.

Original ExprKind::While enters loop scope. lower_expr_while_in_loop_scope
lowers the original condition and body, then builds If/Break inside Loop.
lower_cond keeps a let subject alive beyond its condition; this draft binds the
subject inside each loop iteration around the original body. Only the existing
checked immutable scalar/shared-view/algebraic pattern domain is proposed.
Owned/mutable/Drop effects and let chains are not inferred from this source pin.

The initial frozen 3dca23c0 cohort passed 181/183 cases in each engine:
all 175 prior regressions and six of eight new while-let cases. Nested
Result/Option/tuple projection and a same-file constant identity control failed
in both. A coherent source repair now carries each actual selected constructor
through the generic pattern plan and includes actual constants in per-file
function closure selection. Its full paired retry remains UNRUN. No producer,
corpus gain, const authority or complete namespace/trait/runtime parity is claimed.
