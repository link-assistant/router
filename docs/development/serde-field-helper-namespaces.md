# Original Serde field-helper output closure

The selected Serialize and Deserialize issuers now accept bare field
`#[serde(default)]` and bounded literal `skip_serializing_if` paths. The pure
input reader retains complete original declarations, exact field/attribute
spans and parsed helper syntax. Its candidates grant no authority. Each issuer
reconstructs candidates from its private original caller, checks field/type
identity and joins every new attribute to its active registered Serde owner.
Public `namespaceInput` flags cannot supply this join.

The retained serde_derive sources declare predicate storage as `syn::ExprPath`,
parse it from the actual literal and distinguish bare Default from a custom
default path. The existing private quote compiler admits only its bounded
Expr::Path subset for predicates. Calls, closures, macros, generic/QSelf paths,
literal expressions and inserted statement/item syntax remain refused. This
does not resolve or execute the referenced function. Arbitrary bounded path
names receive the same syntax treatment as original library predicate names.

Serialize follows the original source-ordered field-length fold. Predicated
fields use the actual zero/one length expression. Their visitor statements
retain the original `if !predicate` serialization branch and SerializeStruct
`skip_field` branch. Bare field defaults have no Serialize body effect. The
three unchanged ModelAccessPolicy paths remain `Vec::is_empty`, `is_false` and
`Option::is_none`; these names are source data, not a whitelist.

Deserialize follows the original bare-default missing-value call in normal
map and sequence visitors. The enabled in-place feature branch preserves
missing-field assignment to `self.place.member` in map and sequence visitors.
Fields without defaults retain the original missing-field/invalid-length
errors. Both unresolved Cargo feature outcomes remain represented. Predicates
affect Serialize output only. No generated Serde implementation executes.

All resulting fragments retain original quote templates, typed source leaves,
source ordering, the anonymous const wrapper and actual helper registration.
The fixed Serde requirement macro has its independent original empty expansion
proof. The complete output scan retains no unproved bang definitions, exports
or calls. Container/custom-path defaults, flatten/with/custom serializers,
borrowed-field lifetime routes, generics, cfg and unknown/shadowed/inactive
helper owners remain independent refusals. Existing opaque rename/alias syntax
keeps its prior route; the new reader does not reinterpret those values.

On this worker branch, the unchanged complete `src/model_contract.rs` keeps
46 actual derive owners. Its two remaining Serde output obligations close:
28 selected/18 residual outputs become 30/16. Independent Clone and Default
successors are excluded from these counts. Existing functions, methods and
runtime refusals remain separate; bang scope remains unresolved. Ordinary
matches fixtures execute emitted JavaScript and strict-compiled TypeScript.
There is no Serde runtime, Copy, no-Drop, ownership, pointer or const authority.

Copied/refrozen proofs, foreign contexts/profiles, source/field/span mutations,
getters and unowned helpers cannot recreate private output proof. Fresh
processes reject serialized authority and reconstruct only from actual sources.
