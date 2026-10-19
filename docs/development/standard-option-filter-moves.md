# Original Option filter frames and whole-value fallback moves

`Option::filter` now parses and checks the complete retained Rust 1.89 body,
including its original `if let`, `predicate(&x)` and early `return Some(x)`.
A privately issued source frame confines that return to the selected standard
method. Actual callback inputs bind once; the shared predicate loan cannot
escape its Boolean result. Predicate-local scalar writes are checked normally;
mutable captured reads/writes and overlapping loans remain refused. Iterator
`filter` keeps its existing route.

The frame's limited reference-pattern permission exists only during checking
of this original source body and only for its exact canonical shared-reference
payload. It cannot authorize a caller's `if let`, getters, pointer equality,
pointee moves or Drop. Nested/failed frames restore the previous context.
Owned String, unknown owned nominal/Drop and privately Copy nominal aggregate
filter bindings remain refused where existing pattern ownership is unproved.

Canonical shared Option field reads now use the original Option Copy derive
and the original primitive Copy macro output or shared-reference Copy rule.
Their proofs retain actual source/opaque-output fingerprints without granting
arbitrary caller trait or namespace authority. This closes shared integer
Option reads such as the unchanged `SubscriptionToken.is_expired` method.

The retained `or_else` body has no `T: Copy` bound. Its actual `x @ Some(_) => x`
arm moves the original whole Option and executes no payload copy or Drop.
This permits independently checked standard owned String and structural tuple
domains, plus actual shared references. Tuple identity begins at a privately
associated unchanged Rust function's written tuple type and exact generated
layout. This is a whole-value movement proof, not a tuple Copy assertion.
Unknown nominal/Drop and owned captures remain refused. Borrowed nominal/array
receivers and captures retain immutable target guards; String retains UTF scalar
validation. Cloned source callers, changed layouts/bodies/frame/loan envelopes
and fresh serialized metadata cannot recreate private source authority.

Bounded before/after comparisons use complete unchanged original entry files,
actual tracked path inventories and unchanged Cargo/module reads. Four new
functions are admitted: `bridge_request.nonempty`,
`bridge_request.validate_default_detail`, `responses_chat_input.nonempty_string`
and `admin.clamp_ttl`. Target tests exercise their actual JSON policy, Unicode,
absence and TTL boundaries.

The actual full-corpus failure vector at `7dfe543a4167840040064be15c86c84db10898a6`
identified six lost functions and two lost methods. This batch independently
executes all eight original behaviors in JavaScript and strict TypeScript:
assistant-content classification, token tuple/count recursion, reset-credit
priority, VK String/numeric timestamps, expiry, in-band error classification and
recovery policy. Seven owners use actual unchanged entry/module graphs.
`refresh_recovery.is_usable` uses an explicitly labeled root projection containing
only the byte-identical original `pub mod refresh;` and `pub mod subscription;`
declarations, with every discovered child/Cargo file unchanged. The complete
original root, selected spans/hashes and excluded declaration classifications
are preserved. This projection proves bounded behavior; the coordinator's next
whole-library run must establish actual full-root admission.

Complete original/failed/pass logs, source snapshots, compiler vectors and
resource receipts are retained under
`/tmp/router-759-option-next-cycle-20261013-v1/`. No Rust build or runtime-parity
claim is part of this evidence.
