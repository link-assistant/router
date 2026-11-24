Bridge the pinned Rust 1.89
assert_ty_bounds type-only LocalKind::Decl through StmtKind::Let,
BlockOrExpr::new_stmts/into_block, MethodDef::create_method/AssocItemKind::Fn,
and the original ItemKind::Impl sink. Preserve complete original source recipes,
AST schema fragments, syntax round trips, hygienic identifiers, attributes,
constantness outcomes and simple-name deduplication branches. Original field
Types are bounded typed splices with exact source spans; macro types, nested
conditional/unknown field attributes, payload enums and unsupported type forms
remain obligations. Eq trait validity, runtime/dispatch, type/value namespaces,
other builtin generators and Schemars are not admitted.

Cases retain exact unchanged SubscriptionProvider and CatalogRecord pins. The helper is explicitly included in the bulk implementation fingerprint.

The final 103-case source-output and related scope passed in Node and Bun at clean `e1f10dd8d`, with all initial and retry failures retained in `dev/log/issues/759/translator-derive-bang-verification`. No automatic bulk/project activation, generated trait execution, complete runtime parity or Rust execution is claimed.
