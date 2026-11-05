# Ordered scalar helper statement substitution

This source draft addresses a limitation deliberately retained by the
[total primitive helper lane](scalar-helper-total-primitives-adoption-20261103.md):
checked arithmetic, division/remainder, shifts and clamp may fail, so substituting
or dropping their expressions can change behavior. The new reusable rule keeps
these operations in their original evaluation order rather than treating them
as total. All execution remains UNRUN, CI NOT_INSPECTED and acceptance counting
12/70 DRAFTED,58 OPEN. Native reader/profile adoption remains unfinished.

## Language substitution

`lowerOrderedScalarHelperStatements20261103` accepts original checked scalar
caller/helper IR DATA and constructs existing immutable let/if/return IR. Its
transient ordered helper-call descriptor is not a checked meta opcode and must
never be accepted from public meta as a compiler permit. A future native source
producer must derive it from the genuine original declaration/import/type/body
checks; the complete composed body still needs private requalification.

Arguments evaluate once, left to right, before entering a helper. Every argument
is retained even if its parameter is unused. Helper parameter reuse reads its
bound scalar, preserving a single evaluation. Every local initializer remains
an eager let, including unused initializers which can fail. Original carrier
metadata independently checks native widths, signs, arities and operations.
All checked arithmetic/method/shift/cast/complement/bitwise operations keep the
existing runtime/emitter IR instead of adding parallel implementations.

Helper returns feed a continuation at their exact call site. Helper/caller
branches and conditional or short-circuit expressions retain branch structure;
unselected runtime operations stay lazy. Continuations duplicate only into
mutually exclusive branches. This avoids mutable join slots and preserves the
existing statement IR. Complete return trees are required; assignment, loops,
partial returns, ownership carriers and recursive helper graphs need separate
rules and remain explicit gaps. Sequential calls to the same helper remain
allowed because a returned helper's caller continuation uses the caller's
active graph, not the returned helper's active graph.

Every helper has a separate lexical environment. Original names are reserved
before fresh allocation. Caller names are not looked up as helper parameters,
and branch initializer continuations never share a newly declared local with
another arm. Captures, unresolved/duplicate/shadowed bindings and domain changes
refuse. Source text, source digests and receipt metadata are never interpreted
as parser/type/owner or executable authority. The helper-use list is DATA for a
future original provenance join; it is not permission to synthesize runtime
receipts or skip any original closing check.

## Resource behavior

Lazy linked continuation plans and an explicit materialization stack avoid
recursive continuation execution for long flat statement/argument lists. Output
statements append directly rather than repeatedly concatenating growing arrays.
An immutable argument spine avoids copying a whole argument prefix or sharing
mutable argument arrays across branches. Flat local declarations retain one
invocation-local scope Map; branching initializers get distinct continuation
Maps. Invocation-local fork classification stores structural syntax metadata
only and expires with the call. There are no new cross-operation source, owner,
body-verdict, result or permission caches.

Reserve/planning/expansion/materialization share100000cells/depth160 and charge
the actual caller budget. Branch continuation growth is bounded rather than
silently truncated. Names, input objects and caller statements are not mutated.
These are source-level design properties; no timing, memory or speedup has been
measured during the no-execution phase.

## Repository sequence and independent cases

The second required sequence retains fresh binding conventions and existing
statement/expression IR. Actual reader, document/meta, emitter, inverse and
source-fence wiring must be bulk drafted together before qualification. Original
private declarations/imports/receipts and complete source closing must remain;
the pure normalizer cannot add that authority. The installed source graph stays
437 equations/273 paths because no guarded native parent changed here.

Independent unrun JavaScript cases assert unused division failure, left-to-right
argument failures, once-only argument evaluation despite parameter reuse, lazy
short-circuit/choice branches, cross-branch capture refusal, fresh-name collision
avoidance, sequential calls versus recursion,1000 complete flat locals, malformed
domains and exact primary budget propagation. Native Rust oracle source asserts
independent failure/order/once-only/lazy expectations and remains CI-only after
all same-SHA JavaScript stages. No tests or compilation ran.

Complete three-creation source packet
SHAa64ea56775faef671aa4a9118c1f6b11b3e71670fc222cf986034d9a49eff5ea,
6542compressed bytes, retains the rule, independent JS cases and native oracle.
The source profile drafts full mixed JS/Rust CST creation histories, both rule
sequences, source reparse and exact inverses. Those proposal cases are UNRUN.
The broader statement/effect/helper-network and all application requirements
remain open; this increment does not close an acceptance bundle.
