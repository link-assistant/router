# Borrowed standard-map caller fragments in both directions

SOURCE DRAFT, UNRUN. The shared operation description selects one native
shared-map/key/literal-slice predicate returning bool. Parser/checker/emitter,
interpreter, reverse source and complete runtime/declaration packaging helpers
are implemented as source. They retain a distinct unbounded standard-map input
instead of copying into the bounded opaque carrier. No entry/value byte limit
or returned map/text loan is introduced.

The forward fragment requires the actual private native parser and separate
whole native source ABI before recording a qualified helper call. Its checker
requires that exact private parsed call and the original whole checker/caller
closing callback, a genuine shared standard-map type, original borrowed key,
and an actual written shared array of at most64 pure scalar string literals.
It preserves empty lists and checks every literal through the original source
checker. Pure literal checks share one complete closing boundary instead of
reparsing the full standard-library source graph once per literal. Map/key
and final source closers remain separate; original limits are unchanged.

Checked operand candidates flatten the pure choices after map/key. Target
emission reconstructs a fresh array from those literals. Both interpreter
adapters can share the same helper: evaluate each operand once left to right,
check current complete source/type/caller evidence, invoke the matching runtime,
and close on every outcome. This helper emits ordinary IR candidates and cannot
grant the whole private program's executable receipt.

Reverse source construction takes only two hygienic once-evaluated native
temporaries and bounded scalar literal DATA. It emits a borrowed helper call
without copying the standard map, and encodes Rust control-byte/string escapes
directly rather than substituting JSON-only escapes. Source-derived private
JS/TS symbol/type/literal ownership and complete canonical Rust reconstruction
must still select those values; a proposed string or public type witness grants
no body/type authority. Exactly language then repository rule descriptions
remain separate. Runtime packaging carries full JavaScript and strict TS
declaration source through the actual lossless CST transport.

Original production parent hooks are still missing: Host parse/check dispatch,
source-link type/call origin capture, checked semantic meta reissue, ownership,
type layout, both interpreters and emission/import/package tables, native inverse
and canonical/outcome/state/project reverse contexts. Full actual production
positive/shadowing/ownership/lifecycle/roundtrip/receiving cases and scheduling
must be drafted with those successors. These independent proposal/refusal cases
and the earlier matching runtime/native oracle cases do not qualify those lanes.
The real stream-query caller is native-adopted but not yet fully translated.
Verification UNRUN, CI NOT_INSPECTED; no coverage or source-row closure claim.
