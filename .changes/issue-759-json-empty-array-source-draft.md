Prepared a source-only empty JSON array lowering using the pinned serde_json
1.0.151 macro/private reexport and the actual Rust 1.89 alloc vec/RawVec branches.
The generic declarative matcher consumes the original standard macro definition;
only the empty constructor is eligible. Nonempty array spans retain the explicit
linked allocator/abort obligation and remain refused. Canonical source owners,
features and sealed invocation evidence are required.

Checked metadata separates bounded value projection from application effect
completeness, which remains false. Existing bounded String adapters are unchanged;
successful-memory assumptions and unresolved allocation/OOM/drop behavior are
recorded instead of being promoted to full application authority. Added five
authored cases (twenty-four total in this future queue), including strict-TS/JS
expectations, private evidence negatives and unchanged full activitypub/codex
source refusals. Every case in this future queue is UNRUN. No emitted body, corpus
gain, original production execution or native parity is claimed.
