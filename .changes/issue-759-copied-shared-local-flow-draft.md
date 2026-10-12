Draft generic origin analysis for copied shared scalar/str local rebindings,
with finite loop/fold joins, exact constructor and iterator field projections,
written lifetime constraints and explicit lazy mutable-capture refusals.

The initial 24-file cohort passed 215 of 220 checks in both Node and Bun,
with five preserved failures in four source-span, product-binding, explicit
return and discarded-match families. The generic repairs and three added
behavior cases are UNRUN; the expanded 28/36-file retry is pending.

New behavior cases cover zero iterations,
short circuits, false conditions, exits under lexical shadows, nested tuple
leaves, copied/cloned items, explicit returns and the untouched inline-zero
caller, constructor/guarded statement exits and nested copied product input
guards. Mutable borrowed parameters, pointee mutation, owned aggregate moves
and complete corpus/runtime parity remain unsupported or unproved.
