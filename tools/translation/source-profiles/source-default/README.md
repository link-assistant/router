# Original Default output confinement

`builtin-default-ast-route.mjs` consumes the complete original Rust 1.89 Default
entry, struct/enum callbacks, attribute guards and generic AST construction
pipeline. It also joins the actual compiler visitor invocations through the
private inventory: all 1281 and 234 expanded roots remain retained, with 139
callback records and complete original helper definition/input lineage.
Expanded callbacks retain mixed original token provenance rather than invented
contiguous Rust function spans.

The bounded input is a nongeneric named/unit struct with macro-free TypePath
fields or a nonempty unit enum with one real word `#[default]`. Named(empty) is
the actual original summary for both zero-field forms. Each absent field default
selects the original zero-argument default call, field_imm and Struct expression.
The unit enum follows the original single-variant selection, word, duplicate and
non_exhaustive guards and emits the original Self::variant path. Both produce an
expression statement, block and one static Fn with no parameters or method
bounds. Original span and trait hygiene recipes remain retained.

Source-owned helper/import/declaration and caller joins are private; macro names
or serialized hashes alone cannot issue the final namespace certificate. The
positive recursive output checker rejects copied issuers and altered wrappers,
fields, arguments, parameters, attributes, macros, items or branch selections.
All original conditional/error/default-field-expression routes remain retained
and refused outside this input domain.

Only bang namespace confinement is added. Runtime Default values, field trait
validity, Copy, no-Drop and const execution remain unproved. The existing Default
execution checker and all original/generated method denominators are unchanged.
Sibling derive owners and ancestor effects still require independent proofs.

`originalBuiltinDefaultAstOutput(route)` exposes only a genuine private route’s frozen output. `originalBuiltinDefaultBangOutput({context, certificate, invocation})` additionally proves the exact original caller and returns `{proof, route, output, plan}`. The plan contains the actual original MethodDef and callbacks, complete private visitor lineage, and AST schemas. These accessors do not grant runtime or trait validity authority.
