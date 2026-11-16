# Immediate read-only callback captures: source draft

All implementation, receiving cases and native oracle source remain unrun.
The complete caller checker now supplies synchronous collection callbacks with
fresh lexical snapshots of actual enclosing bindings. Only checked Boolean,
u64, shared text, shared JSON and shared JSON slice bindings may be read. A
capture cannot move owning data, mutate a binding, release a resource, become
an escaping reference or be stored as a dynamic callback value.

Callback parameters replace same-named enclosing rows in their real lexical
scope. Each use independently checks the actual binding domain, moved/disposed
state and original borrowed roots. Owning root rows remain available only for
backing-root availability checks; their presence does not admit direct capture
uses. Captured rows never acquire local cleanup ownership. Complete nested
branch, loop and callback flows retain genuine free-use summaries, which grant
no independent semantic or source authority.

Nested callbacks retain the captured outer parameter names during native
unused-parameter naming. Native inverse projection preserves actual surrounding
locals, then freshly checks the entire JavaScript proposal and reproduces all
original Rust tokens. Public flow/capture records cannot grant a signature,
borrow, free binding, caller admission or executable coverage.

Full original flow, projection and original refusal-source copies retain native
spans, ordered language/repository substitutions, complete serialized/reparsed
CST and full inverses. The old captured-Boolean refusal workload moves into an
independent positive case; async, owned, type and constructor refusals remain.
Additional unrun cases cover lexical shadowing, nested callback free uses,
shared list emptiness, ordered results, JSON copying, captured mutation and
forged meta. General mutable/owned captures, async closures, generic signatures,
namespace/bootstrap, production parity and every unfinished ledger row remain
open.
