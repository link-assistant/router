Draft the next source-only original builtin generator bridge: compile original
function bodies into bounded lexical meta, then execute slot substitution into
actual source-qualified AST builder results. Constructor identity and field
arity come from pinned original schema definitions/imports. The stage retains
actual function/closure/local binding identities, initializer ordering, simple
closure pattern obligations, mutable assignment versions and unselected branch
joins. Builder contracts remain privately paired across metadata roundtrip;
external functions, callable slots, clone/Option/None/ThinVec and unsupported
syntax stay explicit open expressions. No template Rust or handwritten generated
trait implementation is supplied.

Follow the original Rust 1.89 generic create_fields,
create_struct_field_access_fields and create_struct_pattern_fields recipes.
Retain the actual FieldInfo record schema and derive self_expr through its real
local remove(0) initializer. The field access route lifts ExprKind::Field,
expr/expr_addr_of builder results, the original unwrap_or_else closure and both
packed-field versions. Original input field name/type byte spans remain separate
from unproved compiler FieldDef/Ident/Span conversion and hygiene. Both access
and pattern programs remain present, without selecting a route from input shape
or Copy spelling. Scope is per actual sealed source invocation/profile; no
project/bulk namespace activation or trait/runtime/phase/feature authority.

Reuse existing original generic source61320B SHA
 a61c43391cbb0c1cf99bbe3e388d502d113c295fa38d818dfac9c374948e3af8,
AST schema128914B SHA
 115db8af9bbd5230088173343ee8321ca9af51fc14d921edf59d9a0b109e0217,
builder25136B SHA
 83dc2a7b9998b2a863efc98ec3067ca4355aecbfb0b95a448ed513e02ac55927,
and their existing licensed archives; no new source downloads. Limits remain
16,000 nodes/depth64,524,288 metadata bytes and128 original function programs.
Budget failures propagate rather than becoming successful partial proof.

Eight new cases authored UNRUN (29 queued source-only cases total after
2597c0327,0f3083300,9deda6cdc). They retain complete unchanged original
SubscriptionProvider and CatalogRecord source hashes/declaration spans and
exercise constructor provenance, packed branch versions, real empty fallback
capture, pattern naming requirements, private pairing and invocation negatives.
No engine/parser/helper/probe/test, producer or Rust execution. Original
mk_exprs closure application/remove order, FieldDef/Ident/Span hygiene, mutation
and control selection, pattern ownership, no-local-function captures and every
Option/ThinVec feature owner remain independent open obligations.
