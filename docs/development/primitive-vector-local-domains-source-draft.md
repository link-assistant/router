# Independent primitive vector local domains source draft

All implementation and cases UNRUN. This draft removes the same-element-return
restriction for immutable primitive vector locals inside the existing vector
return family. It does not qualify the complete translator or finish drafting.

An additive complete native observer retains the original observer unchanged.
Each local constructor, branch, helper result and moved alias retains its own
exact native element domain. The complete function still returns its original
exact Vec type. Scope records retain actual types and a separate consumed state;
branch scopes copy both and merge consumed states conservatively. Scalar
expressions cannot hide vector borrows or uses. Fixed arrays, ambiguous/foreign
owners, different-width branches, mutation and repeated moves stay refused.
The original 64-leaf/local and complete work/depth bounds stay unchanged.

The actual receiving source checker now uses function-local element constraints
for a genuine native expression-vector origin as well as a new definition.
Actual source/native return ABI constrains only the return. Independently typed
locals and checked helper results keep their own domains; no implicit casts or
width guesses are introduced. Broad bigint array annotations constrain integer
membership without choosing a width. Every private variable resolves before
program/meta emission and full native comparison. Closing source fences remain.

Both complete native expression observers, private capture copies and discovery
paths select the additive local observer. Array and conditional projection still
require an independently checked owned primitive Vec domain and original source
closure. The observer returns the actual complete function body after checking
all container flow, so a first differently typed temporary cannot masquerade as
the return witness. Existing public same-result observer refusals are retained.

Ten complete source equations preserve serialized/reparsed lossless CST/meta,
exact inverses and language then repository phases. Source cases cover two local
annotation forms, eager overflow in an unused different-width vector, conditional
empty branches, aliases, actual native-to-paired/reverse freshness, different
width helper results, all ten local widths in one draft, conflicting widths,
borrowing/mutation/move refusals and CI-only independent Rust oracles. Nothing
was executed and no CI feedback was inspected.

Scalar functions containing local Vec values, Vec input parameters, mutation,
iteration, cross-module ownership/helper calls, full native owner/attribute
closure and broader Router families remain OPEN. Strict parity, freshness,
platform/performance qualification, receiving repository export and CI evidence
also remain OPEN. Drafted cases are not passed cases.
