# Resource loop exits: source draft

The later [scoped continuation draft](http-resource-scoped-branches-draft.md)
extends this family's original restricted continuing-branch boundary.

All implementation and regression source in this family is unrun. This draft
adds unlabelled nearest-loop `break` and `continue`, actual function returns
inside nested while loops, and complete original Result/Option return guards.
It retains the same fresh original imports, checked semantic meta round trip,
lossless CST transport and complete source inverse requirements.

Loop boundaries and function exits have separate resource-state summaries.
Every break, continue and fallthrough checks incoming ownership and type state
against the actual nearest-loop entry and requires iteration-local resource
cleanup. A function return checks all live local resources and contributes its
actual return type, backing roots and exclusive-input state to the enclosing
function. Nested loop boundaries never become function release evidence.
All explicit function outcomes, including loop and Option fallback returns,
must agree with the complete return domain. Propagated Result error families
remain distinct and join the actual enclosing function's Result domain.

Early terminating branches can use the actual following outer statements as
the other branch's continuation. Those statements are never appended into a
continuing inner lexical scope. Continuing branches with local declarations
or mutation still require a separate scoped continuation rule. Conditional
right-hand Boolean evaluation must preserve ownership state; an input released
only by a short-circuited operand cannot be treated as unconditionally released.
Source-cell and recursive branch bounds remain fatal refusals.

Native emission uses real `return` statements inside loops and distinct break
and continue statements. The complete original native reader and projection
copies retain those forms and the existing whole-source reproduction check.
Labelled exits, break values, outcome-sensitive changed loop-entry resources,
general continuing lexical branches and exceptional/unwind behavior remain
open. These explicit boundaries do not certify whole Router synchronization.

Independent JS/strict TS source covers skipped iterations, early termination,
nested loops, Result and Option propagation, all-exit helper cleanup, forged
exit summaries and original-source inverses. Previous simple abrupt-loop
refusals move to positive source cases; wrong domains and labelled controls
remain explicit negative cases. The infinite continue example is translated
only, never invoked. Independent Rust oracle source supplies the same finite
value and error cases for later JavaScript-gated CI. No test, compiler,
translator, preparer, generator or Rust tool ran during this drafting phase.
