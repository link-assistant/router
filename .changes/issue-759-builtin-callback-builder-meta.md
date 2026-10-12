Draft reusable original compiler AST-builder lifting for Clone/Debug/PartialEq/Hash.
Read actual pinned build.rs parameters, local initializers and terminal expressions;
resolve constructor names through its original rustc_ast imports and positive AST
enum/record schemas. Preserve each original source span, argument binding, schema
field/arity and syntax roundtrip. The callback inventory records actual ExtCtxt
source parameter/import, every matching construction call and receiver-shadow
sites, with bounded source/function/node/depth/metadata limits.

Do not infer output constructors from function return types or builder names.
Do not evaluate source-stage macros, substitute handwritten trait bodies, or
close external/unknown slots. Both actual Clone callback routes are retained;
Debug option/field-count branches, PartialEq's separate StructuralPartialEq impl,
Hash method bounds/discriminant flow and all generic dispatch still require exact
caller/transitive closure. Contracts and inventories explicitly retain false
selectedOwnerBangComplete/generatedImplBehavior; no namespace consumer changes.
The eight authored foundation cases are UNRUN. One authentic complete-original
graph namespace case retains exact SubscriptionProvider and CatalogRecord
source/declaration pins and both Clone callbacks without a Copy spelling inference;
it does not request semantic project checking. The verified prior batch and all
callbacks/Schemars residuals remain independent. No compiler, parser probe,
producer or Rust execution in this draft.
