# Contextual borrowed text Into source draft

All implementation and independent case/oracle SOURCE remains UNRUN. No local
tests, compilation, compiler/preparer/translator execution or CI feedback review
occurred. Full translation and synchronization remain unfinished.

The original text engine reuses its existing to_owned abstraction for a borrowed
str into() only when an owning text destination is explicit: a typed String local,
a direct return in a String-returning function or the final whole function tail.
Receiver and original source order remain unchanged; ordinary method chains such
as trim().into() compose with the existing text engine. Written destinations are
source candidates only. Whole original binding/trait/type/source/ownership checks
remain mandatory, and no Std Into owner is inferred from its spelling.

Unannotated local conversions, ambiguous block targets, nontext receivers,
owning String transfers and callback target inference retain their existing
refusal/preservation. No library/runtime ABI is added, no old API is removed,
and native receiver allocation remains the existing checked text core operation.

Two compiler equations retain complete immutable originals, actual native owners,
language followed by repository rules, serialized/reparsed full CST and exact
inverses. Independent unrun source covers both source APIs, six actual callers,
explicit contexts/refusals, JS/strict TS, native Unicode/empty/null/trim oracle and
export closure. Every wider namespace/production/reverse/sync/parity/freshness/
receiving/delivery requirement remains OPEN; no current coverage or speed claim
and no cross-operation source/hash/owner/verdict/result cache is introduced.
