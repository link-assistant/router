The full original Rust 1.89.0 rustc_ast_lowering expression source is preserved
with its original Git blob and SHA256 identities. Source is MIT OR Apache-2.0;
full retained licenses are in ../copy-standard/LICENSE-MIT and LICENSE-APACHE.

Original ExprKind::While enters loop scope. lower_expr_while_in_loop_scope
lowers the original condition and body, then builds If/Break inside Loop.
lower_cond keeps a let subject alive beyond its condition; this draft binds the
subject inside each loop iteration around the original body. Only the existing
checked immutable scalar/shared-view/algebraic pattern domain is proposed.
Owned/mutable/Drop effects and let chains are not inferred from this source pin.

This source-only draft and its authored cases remain UNRUN. No producer, corpus
gain, const authority or complete namespace/trait/runtime parity is claimed.
