# Synchronous opaque cancellation caller source draft

The separate owned cancellation profile now drafts actual JS/TS callers of the
existing new, clone, set and is-set interfaces. All source, source preparation,
regressions and native Rust oracle cases remain unrun. Async futures, channels,
HTTP resources and their Drop/borrow obligations remain unfinished.

`createOwnedCancellationContext` requires the complete original native module,
its actual unique root module edge, full public operation/handle census and the
matching runtime/declarations. The existing original import-symbol and complete
runtime namespace walk select the actual callee, including transparent aliases.
A method spelling, similarly-shaped object, public record or source hash alone
cannot issue a handle type or executable body. Both source entry paths retain
CST serialization/reparse before native syntax and body checking.

`translateOwnedCancellationJavaScript` and
`translateOwnedCancellationTypeScript` reissue each complete function through a
separate copied private source traversal and semantic document codec. Every meta
read reconstructs the actual original source, types, lexical symbols, operands
and move state. Detached or changed programs cannot acquire the source issuer.
Complete previous modules are retained as immutable physical source snapshots,
so later changes to the general profile cannot erase these predecessors.
Ordered language and repository substitutions retain full source inverses.

Owned local cancellation handles move exactly once. Native lexical aliases move
ownership; later use of the old name refuses. An explicit clone creates another
owned handle with shared cancellation state. The four synchronous calls borrow
only an actual live original identifier of the appropriate type, without moving
it. Branch environments copy and join move state. Mutable handles, shared aliases
stored as ordinary values, owned resources captured in callbacks/loops, arbitrary
object properties and temporary borrow operands remain conservative refusals.
Public shared operands must use the actual imported operation's indexed
`Parameters` type. Owned public inputs and returned shared aliases require their
own later ownership/loan rules. Owned local returns use the actual new-operation
`ReturnType` and matching native Cancellation type.

The Rust emitter uses fully qualified native calls and real shared references.
Strict TypeScript preserves operation-derived opaque types and actual runtime
imports. Both independent checked interpreters use the same source-qualified
resource interfaces and execute the actual handle operations in source order.
Runtime private maps hold live resources; they are separate from compiler
source/type/owner/verdict storage. No new cross-invocation compiler cache exists.

Independent unrun JS, strict TS and both interpreter source covers initial and
idempotent cancellation, shared clone visibility, local ownership moves, owned
returns and borrowed public operands. Refusals cover moved aliases, divergent
branch moves, mutable handles, forged/temporary operands, stored shared aliases,
owned public inputs, arity, original native/runtime/declaration edits and mixed
private contexts. Native Rust oracle source covers moves, clone sharing and
surviving clone state after another clone drops. These cases do not qualify
abandoned async futures or general Drop behavior.

Complete forward Rust caller qualification, canonical Rust source inversion,
project unit integration, async/future/cancellation scopes, sender/receiver/HTTP
resources, receiving/export verification, production adoption/parity and the
other open bulk ledger requirements still need their remaining source draft.
No test, experiment, Rust tool, generator or CI has run during this draft.
