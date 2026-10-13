# Original Eq data namespace closure

Eq input syntax is now independent of Serde's selected input route. The pure
reader preserves the complete original nongeneric declaration, field type and
variant spans, attributes, documentation comments and source digests. It accepts
named structs, unit structs and nonempty unit enums. Its frozen public result is
a syntax candidate with no namespace, ownership, Copy or no-Drop authority.
Generics, conditional attributes, unions, field defaults, macro-bearing types,
payload variants and explicit discriminants remain outside this route.

Field candidates separately retain `nameSpan`, the existing identifier `span`,
and `fieldDefinitionSpan`. The latter starts after outer attributes, before any
visibility tokens, and ends after the complete type before the comma. The pinned
original `parse_field_def`, `parse_name_and_ty` and `parse_single_struct_field`
recipes establish this order; `create_fields` retains that complete field span
while applying the original trait hygiene. The added source offsets are syntax
candidates and do not supply a compiler session span or independent authority.

The private builtin output issuer rereads the unchanged declaration and joins
its genuine source/view/profile certificate and exact Eq invocation. Nested
Serde and Default attributes require the independent original registered helper
proof. Documentation synthesized by the macro lexer must match the exact
original line-comment token; explicit attributes must match the private input
certificate. Existing ancestor, shadow and active-source guards remain required.

The original Rust compiler callback clones each actual field type into
`AssertParamIsEq<T>`. Its existing checked constructor chain remains
`LocalKind::Decl` without an initializer, `StmtKind::Let`, Block, associated Fn
and Impl. Both deduplication outcomes and both constness outcomes retain this
same type-only statement category. Source type syntax still passes the existing
typed quote round trip; compiler source recipes and AST schemas retain private
original identities. This proves the selected output cannot introduce a bang
macro through these statements. It grants no Eq execution, Copy, no-Drop or
const eligibility.

The unchanged whole `src/model_contract.rs` observation has 46 actual derive
owners, 16 selected outputs and 30 residual owners, compared with 14 selected
and 32 residual before this stage. Only ModelSelectorKind and ModelAccessPolicy
gain Eq output closure. The module's bang scope remains unresolved. Original
`permits_resolution`, Deserialize and upstream `ok_or_else` refusals remain;
this is no original whole-module executable gain. Ordinary independently
checked matches fixtures execute in JavaScript and separately strict-compiled
TypeScript. Tests retain source mutation, private-identity forgery, helper
shadow, inactive-source and fresh-process reconstruction controls.
