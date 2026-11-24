Draft actual original parser FieldDef/Ty constructor values after614b91ae3,
with source-qualified expected schemas and lexical initializer substitution.
Retain every original named field constructor initializer in original order;
verify its field set against the actual pinned AST schema rather than hand-write
a FieldDef/Ty object. Unknown record owners now keep their actual initializer
meta instead of discarding it; a schema match does not grant wildcard/import
ownership. Parse actual &mut self receiver syntax as mutable and retain source
Try nodes with owner/control unresolved. Non-simple closure reference patterns
stay explicit obligations rather than silently becoming plain identifier slots.

Bind exact original declaration name/type token leaves to the constructor source
plans, preserving full-file/source/declaration/profile/scope identities and both
UTF16 source ranges and UTF8 byte ranges. These leaves are not rustc Symbol,
Ident, Span or resolved Ty values. Preserve original default/recovery/attribute/
visibility/safety/collect_tokens/type path/macro/bounds branches and source P,
NodeId, Option and attribute storage requirements. No empty field/default values
or generated Rust body templates are supplied; no namespace/runtime/phase/
feature authority is enabled. Existing standard Vec bounds, mutation, hygiene,
Clone/Drop and allocation obligations remain independent.

New official Rust1.89 compressed licensed source inputs (42,875bytes total):
compiler/rustc_parse/src/parser/item.rs138843B SHA
072e9ef9c2554296643fdb16102462b5d15b8255e39142a9d697e03d6a9240c2,
archive29991B SHA
7a825544f645089aa9c3f872e89f40fced2e8c32bb1429b24b8fd046bf6ad659;
compiler/rustc_parse/src/parser/ty.rs54238B SHA
6d24d479fa505e77182e784acdade0ec736b980aca5c3193a7638f99f5d624a3,
archive12884B SHA
15511c019e85fbf0a5b48964fdd4ba269191e36292eeb7adc14c5ef419d91b52.
Reuse existing declarative parser/mod.rs64389B SHA
88e79af509064c441a88eb1b60facbfb50f8024dc0bcbf139a01a1902d111d59
and existing Rust MIT/Apache licenses. Source retrieval only with verified TLS;
no original Router.rs bytes changed. Existing metadata524288/node16000/depth64/
source256000/token32000 limits remain; no budget or private identity waiver.

Eight new cases authored UNRUN,45 callback/field cases total after
2597→0f308→9deda→5b462→614b. Covers all actual FieldDef initializers, Try/error
preservation, default/attribute/recovery obligations, actual Ty schema source,
Unicode coordinates, cloned/stale/private identities, unresolved generic field
types and complete unchanged SubscriptionProvider/CatalogRecord source pins.
No engine/helper/parser/probe/test/TS/producer or Rust execution. Source parser
branch/Ident/Span/Type conversion, wildcard owners and field/receiver runtime
semantics remain explicitly incomplete and cannot close bang namespaces.
