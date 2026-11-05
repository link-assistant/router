# Deferred scalar choice locals and return joins

Source draft only. Every implementation and independent case remains UNRUN;
full requirements, executable coverage, translation and qualification stay OPEN.

A separate complete inference-engine copy connects deferred scalar constraints
to the existing function-local finite domain solver. A wide literal conditional
stored in a local retains its original initializer and aliases as actual lets.
All uses share one monomorphic type variable, so the condition is evaluated once
and incompatible later width demands are refused. Pure integer literal bindings
retain the earlier substitution rule; their source constants are a separate
case from a conditional computation.

Actual typed helper operands, native/written domains and precise vector items
may anchor a deferred scalar variable. Literal values and literal-only choices
constrain possible widths without anchoring one. Unannotated scalar return paths
may join deferred wide/small literals with a real typed return value. A function
with only literal returns still needs an actual typed context. The whole-function
closing walk resolves each scalar definition, variable/reference and vector
constraint and rejects all remaining private types before emission.

Scalar roles use backing variables in the same bounded solver, retaining its
4096-variable and complete work/depth limits. Constraint synchronization groups
root representatives once per pass and clears its temporary index. No source,
owner, hash, verdict or result cache survives a function/invocation. Public
constraint DATA and role strings issue no checker, namespace or runtime
authority; actual receiving/native re-entry and complete body/callee checks
remain mandatory. Both earlier inference APIs stay unchanged.

Three complete source equations select the copied engine in actual local,
identifier, array and return paths, preserving whole frozen originals,
serialized/reparsed CST, full inverses and language then repository sequences.
Independent source cases cover signed/unsigned 128-bit choices, immutable aliases,
typed helper anchors, unannotated multi-path scalar returns, JavaScript/JSDoc,
single ordered condition-helper events, incompatible widths, missing anchors,
old APIs and unresolved/cross-engine constraint refusals. Independent native
oracle source remains CI-only after all eight same-SHA JavaScript stages pass.

Default-sized scalar choice-local expansion without a wide deferred leaf,
general arithmetic inference, aggregate inputs/borrows/mutation/iteration,
cross-module calls, actual native producer closure and the full draft remain
OPEN. Compiler/export receiving, profiles, performance, canonical/reverse
freshness, parity and CI qualification remain OPEN. No parser, compiler,
translator, preparer or test ran locally; CI feedback remains uninspected.
