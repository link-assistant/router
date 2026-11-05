# Scalar imperative-body synchronization source draft

`proposeForwardImperativeBodySynchronization` adds scalar mutation, early returns
and while control through the existing complete checked Rust control frontend
and emitter. Every original inverse API remains in its complete original copy.
Project mode `"inverse": "imperative-bodies"` and the exported facade select the
new actual implementation. This source draft is unverified.

Language rules keep complete serialized/reparsed CST, actual checked function
source/target/signature associations, safe nongeneric headers and all original
parameter-guard fences. The lexical statement grammar now includes initialized
`const`/`let`, assignment to actual mutable locals, nested if/else, value returns,
while/loop bodies and unlabelled break/continue within the current loop. Function
parameters remain immutable in this inverse format. Locals cannot shadow, read
future bindings or escape their branch. All admitted function paths must return
values; unsupported/unreachable statements are refused instead of discarded.

Numeric local annotations use small observations from the original checked
function's actual scalar let nodes. Conflicting same-name domains are not
selected. These invocation-local hints propose syntax only; the complete fresh
native type/ownership checks and exact target reproduction still decide every
use. No caller can inject a local-type map, domain flag, source permit or checker.
Bare JavaScript bigint alone does not prove a native integer width.

Native construction reuses the original control frontend's scalar mutation,
return, branch and loop contracts. The checked source programs and declaration
closures are released before the complete modified compilation through existing
flat semantic DATA storage. Every original executable/refusal census stays exact.
Complete native TypeScript type syntax, operators, literals, mutable declaration
kinds, guards and all code outside bodies remain part of target reproduction.
Only absent versus empty else blocks are additionally normalized in this
restricted scalar grammar; their branch has no statement, binding or effect.
Unchanged bodies still require exact bytes.

Repository rules retain complete native/paired source equations and inverses,
full callee/helper inputs, original source limits and the guarded all-or-nothing
project installation. Source copies, archives and both substitution sequences
remain available. No persistent source/result/owner cache, relaxed deadline or
JavaScript-first CI bypass is introduced.

Independent JS/strict TS and native oracle source covers all Boolean early-return
paths, zero iterations, continue/break/return combinations, large input bounds,
mutable integer identity, full body batches, optional empty else, const/parameter/
future/uninitialized/label/fallthrough/guard/type/source refusals and source
history/export/project integration. All are unrun. No new compiler, source
planner, preparer, target, interpreter, test, experiment, Rust tool or CI has
executed. For/iterator forms, arbitrary owned/aggregate/generic/recursive/async
bodies, namespace bootstrap, production adoption/parity and every other open
requirement remain unfinished.
