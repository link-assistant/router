# Scalar mutation and while-fragment source draft

All new implementation and independent case source remains unrun.

The actual source checker now accepts `let` only for checked Boolean/u64 values,
and assignment only to those same real mutable locals. Constants, parameters,
owned/resource mutations and domain-changing writes refuse. Existing public
guards and fixed-width operation contracts retain all numeric range obligations.

While loops check the complete actual Boolean condition and a separate body
fragment. Every loopback preserves the entire incoming ownership/resource/loan
and scalar type state. New iteration-local resources must be released before
fallthrough. Nested fragments retain their correct original lexical boundary;
branch-local cleanup cannot hide earlier iteration-local resources. Conditions
cannot consume or dispose an input that a later iteration would need.

Loop fallthrough is distinct from a function return and contributes no invented
function exit to resource release summaries. Whole functions still need complete
returns. Abrupt return/break/continue and Result/Option return guards inside loop
fragments remain refused pending their full exit/join rules. This draft does not
claim general exception/unwind/Drop or future-cancellation equivalence.

Native emission derives actual mutability per declaring scope, including writes
through nested branches and loops; same-spelled locals in separate scopes do not
inherit each other's mutability. The complete original reader copy observes
while blocks and assignments. Its projection proposes actual scalar `let`
source and fresh complete fragment checking must reproduce every native token.
Original source/CST histories and ordered native substitutions retain full
flow, reader and projection originals. Source/depth/workload bounds are intact.

Independent source cases cover empty/zero/nested loops, wrapping sums, Boolean
state, final conditional branches, same-spelled lexical locals, const/parameter/
owned/domain mutation, abrupt exits, resource state changes, strict range guards,
canonical whole native reproduction and actual JS plus independent strict TS.
A handwritten native oracle is reserved for JavaScript-gated CI.

General abrupt/exception exits, resource loops, collection/owned mutation,
iterators/callbacks, broader language/async domains, source namespace/bootstrap,
production adoption/parity and every unfinished requirement remain open. No
translator, preparer, installer or test was run.
