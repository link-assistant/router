# Scalar local-body synchronization source draft

`proposeForwardScalarBodySynchronization` adds a separate bulk inverse format
for ordinary scalar local initializers and the final return expression. The
existing final-return API and every original API in its complete copied module
remain unchanged. Project synchronization selects this explicit family with
`"inverse": "scalar-bodies"`; the shared facade/export supplies its actual source.

Language substitutions parse complete JS/TS through serialized/reparsed CST and
native syntax, and census every eligible initializer and final return in order.
Everything outside those actual expression spans remains exact, including
parameter/local names, declaration counts, annotations, guards and other
statements. Each changed function rejoins the original compiler's checked source
association and actual scalar let chain. Complete native initializer intervals
come from the original function's tokenized immutable `let` declarations, with
balanced groups and source-bound assignments/terminators. Native typed let
prefixes and surrounding comments remain intact.

An initializer may read parameters and earlier locals only. Final returns may
read the complete preceding scalar scope. Self/future locals, shadowed or
unmatched source bindings, incomplete native prefixes and changed declaration
structure refuse. Every original source range must match before one ordered
assembly of each changed native file. The original invocation's native scope
walk is shared for all its changes, with no persistent source or verdict cache.

The candidate grammar reuses the actual checked scalar call associations,
conditional expressions, original arithmetic-helper observations and existing
literal/predicate rules. This supports conditional local values and conditional
arguments when the original compiler reproduces the complete requested native
target shape. It does not admit arbitrary control statements, owned/mutable
aggregates, generic/recursive/async bodies or a changed top-level branch layout.

Independent whole-project recompilation still decides semantic admission and
must preserve the complete executable/refusal census. Every complete target
expression must match its requested native syntax and all other target bytes
must match exactly. Repository rules retain full native/paired CST histories,
source inverses, callee/helper review inputs and the original guarded fresh
project transaction. Original checked declaration closures are released before
the modified compilation. Existing file/node/depth/memory/proposal limits and
all eight JavaScript-first CI stages remain unchanged.

Independent authored source covers mixed local/return batches, actual lexical
order, typed native prefixes/comments, conditional truth tables, nested callee
composition, Unicode borrows, numeric min/max/overflow, inline modules, legacy
refusals, name/type/effect/source forgeries, exported receiving inventory and
actual project transactions. Rust oracle source is for CI only after all JS
stages pass. All are unrun; no new implementation, compiler, producer, preparer,
CLI, test, experiment, Rust tool or CI has executed. Whole production coverage,
namespace bootstrap, opaque effects and every other unfinished requirement
remain open.

The new scalar-body path and full Rust-authority project planning select the
existing original compiler's flat semantic DATA storage. All private language
issuers and complete checks stay in that compiler; no caller supplies a storage
or checker override. Candidate function membership is computed once per proposal
instead of repeatedly searching the entire executable census. This is an
unverified resource-conscious implementation choice, not a measured performance
claim. Earlier final-return APIs retain their original storage selection.
