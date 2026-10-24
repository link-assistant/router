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
