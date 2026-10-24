# Owned JSON loop flow source draft

The private whole-function JSON flow checker now drafts native `while`, ordinary
integer ranges and shared JSON slice/Vec iteration. Existing checked control and
iterator lowering still supplies actual source/type/owner associations, emits
JavaScript/TypeScript and independently checks source lifetimes. This new flow
analysis grants no permission from a public loop node or iterator summary.

Entry, condition, break and continue states retain their own move availability
and loan facts. A bounded fixed point checks every actual backedge; an owned
input moved on one repeating path cannot be reused on the next iteration.
An unconditional break can complete a single move. Iterator loans stay live
through the loop, so moving the borrowed Vec in its body refuses. Closing that
lexical iteration releases its loan and allows a subsequent actual owner move.
Callback/function boundaries keep loop exits local. Unreachable statements still
receive full checking, with detached return/exit sinks.

Matching native Copy scalar assignments retain actual width/type checks and
refuse mutable retained loans. Existing canonical JSON reinitialization still
requires no live loan. There is no runtime iteration limit or change to source
behavior; the 128-round fixed-point limit bounds compiler analysis inside its
existing whole-function budget. Source checks can conservatively refuse a loop
whose permitted flow domain does not converge. Reference patterns, general
iterator adapters, arbitrary effects/Drop and other aggregate mutation remain
separate unfinished rules.

Complete original flow/preparer sources, ordered language/repository substitutions
and full CST/source inverses are retained. Independent actual native callers,
JavaScript/strict TS behavior, zero/continue/break/nested loops, owned move/borrow
refusals, malformed dependencies and Rust oracle source are drafted and unrun.
Existing reverse loops/interpreters remain separately drafted. No translator,
checker, preparer, test, experiment, local Rust tool or CI has executed. Production
adoption, remaining loop forms and the rest of the requirement ledger remain open.

The shared iterator lane also drafts `Iterator::take` and nested take chains.
Actual native `usize` identity remains required. Receiver loans are live during
count evaluation and the loop body, and count expressions cannot conceal an owner
move. Original checker/emitter/iterator qualification remains separate from this
flow extension. Complete source inverses and independent zero, oversized, nested,
wrong-width and move/refusal cases plus native oracle source are drafted and unrun.

Fresh fixed native ranges can also retain the existing source-backed `rev`
qualifier and emitter inside owned JSON callers, including `rev().take(...)`.
This reuses the complete existing reversed-range source profile and its original
validation; it grants no arbitrary DoubleEndedIterator or specialized consumer.
Independent order, inclusive/extreme endpoint, empty range and native oracle
source plus complete source equations are drafted and unrun.

The callback adapter draft now handles scalar `map`, Copy-item `filter`, and
compositions with existing `take`/range loops. Callback bodies use the same
private whole-function checker, lexical captures and total traversal budget.
Returns stay inside their actual callback boundary. Mutable or owned captures
actually read by a callback refuse; borrowed capture roots remain retained.

Iterator analysis now keeps yielded-item facts separate from retained receiver
and capture loans. A map to a Boolean cannot erase the live borrow of an owned
JSON vector. Those roots remain anchored during count evaluation and the loop,
then leave scope before later ownership transfer. Conservative captured-root
retention can refuse cases that need more precise capture analysis.

The current callback output is Copy and must retain no JSON loan. Filters on
JSON reference items, owned/non-Copy mapped outputs, general iterator storage,
aggregate products, arbitrary Drop/effects and production adoption remain open.
Original lazy emitter behavior and all existing checker refusals remain required.
Complete source histories plus independent strict JS/TS ordering, zero-take,
overflow timing, local return, receiver lifetime, capture and invalid exit cases
and native Rust oracle source are drafted and unrun. No adapter, checker,
compiler, target, test or Rust tool has executed.
