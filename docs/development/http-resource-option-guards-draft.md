# Complete Option guards in resource caller source

All new implementation and independent case source remains unrun.

The complete caller flow now recognizes the same original Option binding's
`=== "None"` or `!== "Some"` guard. Every absent branch must terminate, retain
the original ownership state and release every locally owned resource that
cannot be returned. The absent return domain must equal the complete successful
return domain. A borrowed result additionally joins all actual returned roots.
Unknown tags, unrelated bindings and unguarded payload extraction refuse.

After the guard, a Some payload is available through its actual original
`field0`. Owned payloads move once. Returning the guarded whole Option restores
Some; returning the unchanged None in the absent branch permits native `?`
only when the complete return domain is that same Option. Other complete
fallbacks use an explicit native match whose None branch returns the checked
fallback block. No implicit Option-to-Result conversion is introduced.

The canonical Rust inverse recognizes the exact full emitted Some/None arms,
original error cleanup and complete fallback block. It proposes actual JS tag
guards, reruns the independent whole caller checker and reproduces every native
token. Arbitrary renamed/cropped match arms cannot issue an ownership permit.
The existing CST/checked-meta separation and language then repository phases
remain unchanged. Full original flow/projection sources and their complete
native-selected substitution/inverse histories are retained.

Independent source cases cover found/missing Unicode byte offsets, borrowed
prefixes, same-Option propagation, explicit None-to-Result fallbacks, success
payload moves, cleanup across both Some/None exits, repeated client cleanup,
wrong tags, missing cleanup, mixed return domains, repeated moves, canonical
native reproduction and actual JS plus independently compiled strict TS. A
handwritten native oracle is reserved for JavaScript-gated CI.

General loops, callbacks, mutation/generic/async syntax, namespace/producer
closure, production adoption/parity and all other unfinished requirements
remain open. No translator, preparer, installer or test was run.
