Draft generic origin analysis for copied shared scalar/str local rebindings,
with finite loop/fold joins, exact constructor and iterator field projections,
written lifetime constraints and explicit lazy mutable-capture refusals.

This separate source draft is UNRUN. New behavior cases cover zero iterations,
short circuits, false conditions, exits under lexical shadows, nested tuple
leaves, copied/cloned items, explicit returns and the untouched inline-zero
caller. Mutable borrowed parameters, pointee mutation, owned aggregate moves
and complete corpus/runtime parity remain unsupported or unproved.
