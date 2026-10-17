Draft generic origin analysis for copied shared scalar/str local rebindings,
with finite loop/fold joins, exact constructor and iterator field projections,
written lifetime constraints and explicit lazy mutable-capture refusals.

The initial 24-file cohort passed 215 of 220 checks in both Node and Bun,
with five preserved failures in four source-span, product-binding, explicit
return and discarded-match families. The first expanded repair passed 250
of 256 checks in both engines, preserving all six failures. The next source
repair carries only exact statement matches into unit joins and specializes
actual immutable constructor locals at emission. Two former valid refusals
now have separate JavaScript and strict TypeScript behavior assertions.
The second repair passed 257 of 258 checks in both engines; its preserved
failure showed a missing unit coercion for semicolonless match statements.
That source coercion is repaired without changing the negative assertion.
The third repair passed all 258 focused cases on both engines. Its broader
36-file pair completed 317 of 318 on both engines; the sole failure was an
outdated slice-membership diagnostic span fixture. A fixture-only successor
passed all 263 cases across 29 files in both engines without changing compiler
implementation bytes. Complete logs for all twelve attempts, including both
full failures, are retained; no same-head full 318-case pass is claimed.

New behavior cases cover zero iterations,
short circuits, false conditions, exits under lexical shadows, nested tuple
leaves, copied/cloned items, explicit returns and the untouched inline-zero
caller, constructor/guarded statement exits and nested copied product input
guards. Mutable borrowed parameters, pointee mutation, owned aggregate moves
and complete corpus/runtime parity remain unsupported or unproved.
