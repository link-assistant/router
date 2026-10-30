# Continuing lexical branches: source draft

All implementation, regression and native oracle source remains unrun. This
family extends the abrupt-loop draft with ordinary continuing `if` scopes,
single portable statements and actual `else if` nodes. Branch locals remain
inside their complete original lexical scope; outer statements are neither
copied into those scopes nor allowed to resolve their private declarations.

Each scope retains an invocation-local snapshot of its actual incoming
bindings. Fallthrough requires cleanup of every new local resource and exposes
only those original incoming bindings to the continuation. Every continuing
path must agree on the complete ownership, disposal, carrier, guard, numeric,
mutability and backing-root state. Mutable scalar and owned String values can
change at runtime without changing those static domains. Partial input release,
conditional moves and incompatible live states remain explicit refusals.

Function returns, nearest-loop boundaries and scope fallthroughs have distinct
summaries. A return or loop exit inside a scope follows its real enclosing
function or nearest loop. The parent continues from fallthrough paths only;
two terminating branches cannot qualify following unreachable source. State
snapshots and joins consume the existing shared source-cell budget, and none
survive into a cross-invocation verdict cache.

Native emission retains real branch blocks before the following statements.
Exclusive-use and assignment discovery respects each child flow's declarations,
so an earlier branch-local mutation cannot mark a later same-named outer
constant as mutable. The complete original native projection accepts canonical
continuing blocks and still requires whole original Rust token reproduction.

The source histories retain full original functions, serialized/reparsed CST,
ordered language then repository substitutions and complete inverses. Source
review also corrected an earlier complete-function recipe that included trailing
trivia beyond its native owner; only the recipe boundary and dependent pins
changed. The owner check remains strict and implementation bytes were preserved.

Independent unrun JS/strict TS source covers mutations, nested scopes, lexical
name reuse, single-statement branches, else-if, all-path release joins, local
resource cleanup, escaped bindings and forged fallthrough summaries. Separate
native oracle source supplies the finite values. General shadowing, incompatible
outcome-sensitive state joins, labels, exceptional exits, namespace/bootstrap,
production parity and every unfinished requirement remain open.
