# Typed scalar absence implementation draft

The original JavaScript semantic checker accepts nullable return contracts but
refuses nullable parameters. The TypeScript annotation draft therefore needs an
actual semantic implementation for those signatures. This family copies the
complete checker, guard refinement, translator, emitters and independent
interpreter into an additive `portable-router-scalar-absence-v1` profile. The
old JavaScript API keeps its original parameter refusal.

The copied checker accepts scalar/null and scalar/undefined parameter domains,
as well as standalone null/undefined parameters. It rechecks strict absence
comparisons, actual branch and short circuit edges, present-value projection,
`typeof` and truthiness. False truthy edges retain the entire original union.
Call arguments can lift a matching scalar or absence into the exact written
domain. Unguarded scalar operations and mismatched domains still refuse.
Projection/comparison metadata is reconstructed by checking; serialized public
fields do not supply a branch premise.

Rust nullable string inputs use owned `JsNullable<String>` or
`JsOptional<String>` envelopes. Repeated reads clone the immutable value instead
of introducing moves or returning a borrowed wrapper as an owned one. Explicit
checks distinguish Null and Undefined. Numeric truthiness preserves zero, signed
zero and NaN behavior. The complete serialized/reparsed semantic document still
precedes both target emitters. Existing source string and binary64 domains stay
in force; this grants no wider UTF16, object or aggregate ABI.

`prepare-typed-scalar-absence.mjs` retains all six complete original sources and
native-selected substitution recipes. Physical original implementations are
rejoined before and after construction. Separate language/repository source
sequences retain full CST inverses. The preceding generic alias producer
composes this fresh complete successor equation; its check/writer targets the
latest source instead of overwriting it with the earlier alias-only frontend.
Later history remains source DATA with no semantic authority or gate stamp.

Independent regression source covers repeated string reads, matching calls,
strict guards, null/undefined distinctions, short circuiting, `typeof`, truthy
edges, signed zero, NaN, infinities, invalid bodies and forged serialized guards.
All source and regressions remain unrun. Union-typed defaults, general object
unions, arbitrary coalescing/logic, broad TypeScript
generics, complete Router coverage and receiving qualification remain open.

The later optional-scalar source family separately handles written `?`
parameters, actual omitted local calls and the emitted TypeScript public
signature. It uses fresh native source binding and explicit undefined
substitutions; it does not broaden the legacy JavaScript checker or erase the
distinction between required unions and optional parameters. All these source
layers and regressions remain unrun.

The copied emitter's Rust library selection also follows checked parameter,
return and expression type roles. An identity body may contain no absent
literal while still requiring `JsNullable`, `JsOptional`, `JsNull` or
`JsUndefined`. The complete previous emitter, source substitutions and parent
source history are retained by `prepare-typed-absence-library-types.mjs`.
Identity-only boundary declaration and behavioral regressions are drafted and
unrun; native Rust compilation remains deferred to the gated CI phase.
