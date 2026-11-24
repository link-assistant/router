# Attribute header physical CST source operation draft

This implementation and every new case is UNRUN. Source construction and review
only occurred. No parser, operation, translator, preparer, generation, compiler,
experiment, benchmark, test, local Rust tool or CI-triggering push executed.

Before applying header captures to every builtin attribute, source review found
that each receipt would separately rebuild and retain the whole physical CST.
The explicit bounded synchronous operation now reuses at most one already
checked immutable source/canonical-CST pair at a time. Default captures and
readers outside an operation retain their full original independent roundtrips.
This is a structural reuse draft, not a measured timing or memory result.

Initial source construction still serializes and independently reparses the
complete physical document. A new native/CST operation guard delegates the full
existing guard without granting source or namespace permission. Every reuse
checks both the namespace parser and concrete-source operations. Current actual
module/item/member/view/profile/span and positive private AST checks remain in
place before using a matching physical representation. String equality alone
cannot produce a header receipt or owner permission.

The wrapper also composes the existing complete namespace parser source
operation, retaining its original current-input guards and bounds while sharing
the same native source program during this synchronous invocation.

The operation keeps one pair only and retains no parsed-header, path, source
hash, owner or verdict cache. Nested operations clear the parent's reusable pair;
exit always clears the child pair and restores the parent. The original
64-level bound and synchronous/proxy/Promise/own-thenable/accessor refusals remain.
After exit, no reuse state survives across translation invocations. Captured
header receipts retain their original immutable source evidence as before.

All original source/token/node/tree/CST/serialized bounds remain unchanged. Four
complete compiler equations retain original implementations, native owner spans,
separate language/repository substitutions and full CST inverses. Independent
unrun cases cover distinct headers, nested/error restoration, changed source and
spans, late native-operation changes, asynchronous/refusal boundaries and source
histories. Builtin caller consumers and all actual owner/global/production/parity,
reverse/synchronization/freshness/CI and receiving requirements remain open.
