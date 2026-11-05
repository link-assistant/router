# Ordinary helper shared Vec argument source draft

Six complete source equations add call-duration owned-to-shared primitive Vec
arguments to both reverse source lanes. The actual ordinary helper declaration
and complete checked body must already be in the original native-symbol local
call graph. Its shared parameters still require their genuine leading bounded
len guard. Owned variables remain available while the call arguments evaluate;
after all arguments, every earlier borrowed local must retain the same live
scope binding. A later move, duplicate consumption, callback capture or wrong
primitive domain refuses. Fresh owned temporary arguments may be borrowed only
for the synchronous call. Other original argument domains retain their rules.

An additive emission adapter copies the original local-call rules and adds the
actual Rust shared borrow for owned Vec operands. JS/TS and both interpreters
keep the frozen array reference for the synchronous call. The original local
call helper/emitter APIs are unchanged; complete original private caller
reissue, actual callee signature/body membership, acyclic graph and CST/meta
serialization/reparsing remain mandatory. No copied shape or signature grants
owner, namespace or execution permission. Shared Vec results remain unsupported.

Independent eleven-domain both-lane JS/strict TS/interpreter/meta/CST/canonical
Rust inverse case source covers repeated same-root reads, later legal moves,
borrowed temporaries, shared input forwarding, copied Option/length results,
invalid later-argument moves, moved roots and missing shared-entry guards.
All cases, freshness/performance/receiving qualification and Rust CI are UNRUN.

The canonical owned Rust inverse uses the existing ordinary-call borrow
adapter and must still reproduce the complete authoritative input after fresh
private JS checking. Native forward ordinary explicit &owned helper argument typing and its
call-interval lexical flow have a subsequent [source draft](primitive-vector-native-borrows-source-draft.md).
Both directions remain unverified; neither draft qualifies full synchronization.
