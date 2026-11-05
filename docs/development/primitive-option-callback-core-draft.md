# Primitive Option mapping and lazy callback core draft

Thirty-six explicit native/JavaScript interfaces now have source drafts: every
bool/u64/i64/str input/output pairing for map and and_then, plus lazy fallback for
each input domain. Callbacks run once for a successful input, or only on absence
for lazy fallback. False, zero and empty Some values retain their discriminants.
Borrowed input and callback-output lifetimes are independent. Text lazy fallback
returns owned text; text inputs and callback outputs keep the shared byte bound.

The JavaScript implementation is a complete copy of the preceding checked ABI
runtime, with its whole original, separately ordered substitutions and CST inverse
retained by `prepare-primitive-option-callback-runtime.mjs`. Native root/source
preparation composes the complete preceding root implementation and original
source images. Matching Option/FnOnce/text library internals remain native.

Independent JS and native Rust oracle source covers every mapping pair, flat
absence, lazy evaluation, callback counts, primitive extrema, independent captured
lifetimes, invalid callback/results, getter/Proxy traps and complete source
histories. All implementation, oracle and producer source remains unrun.

Actual forward/reverse callback qualification, ownership/capture and loan walks,
interpreters/emission, meta projection, native dependency joins, bulk packaging,
automatic adoption and production synchronization still need integration drafts.
Closed scalar/borrow captures are the intended translated caller boundary;
arbitrary effectful/owned captures are not qualified by a library declaration.
The broader requirement ledger remains open and no coverage or parity is claimed.
