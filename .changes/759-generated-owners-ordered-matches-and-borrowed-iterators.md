kind: Changed
body: >-
  Keep parser-created nested Option, Result, and tuple declarations at their
  actual crate-root owner. Lower resolved standard matches! and ordered scalar
  match guards through checked pattern plans, and add lazy borrowed iterator
  readers with canonical Option results and typed function-item callbacks.
  Original Rust declarations are retained without body substitutions.

The guarded-match profile evaluates one subject, tries source alternatives in
order, retries the next alternative after a false guard, and excludes guards
from exhaustiveness coverage. It bounds expansion to 256 attempts. Nonlocal
control in this expression profile, owned String bindings, reference patterns,
custom macro owners, unknown expansion scopes, and unproved binding identities
remain explicit refusals.

The iterator profile supplies find_map, filter_map, find, and flatten only for
checked scalar values or genuine shared aggregate views. Shared containers use
an immutable descriptor-only runtime guard that rejects proxies before traps,
accessors, cycles, mutable nested containers, and array holes. Standard Option
identity, reference depth, primitive identities, and source function resolution
are checked; owned aggregate moves and custom IntoIterator/Deref remain gaps.
The runtime view profile additionally bounds traversal to 1,024 depth and
65,536 value cells and requires ordinary array/record prototypes. The pinned
Rust 1.89 standard macro source is 65,222 bytes, SHA256
9a950cfa3735eef653b7f9a6a4701e7b218f9876141701dac72ccb8b8e8d3862;
the implementation is at library/core/src/macros/mod.rs:447.

The new production-chain fixtures structurally select complete unchanged
usage.rs, auth_remote.rs, and verification.rs declarations from pinned full
source files. Selected-declaration evidence is separate from corpus coverage;
no fresh producer, runtime parity, or full-file coverage is asserted here.

The focused five-file scope passes 22 Node and 22 Bun cases, including unchanged
emitted JavaScript and separately strict-compiled TypeScript. The initial
17-pass/5-failure and intermediate 21-pass/1-failure receipts were retained;
final logs are /tmp/router-759-cycle-7-owner-match-iterator-final-{node,bun}.log
(8.90s Node, 8.26s Bun). Original selected production proofs cover usage's
three-function dependency chain, home_in_accounts, and
needs_client_preparation, without claiming whole-file admission.

Its temporary checked-types.mjs and checked-coercions.mjs dependencies
are exact untracked copies from root OWN ede7d8451 and are excluded from this
OWN commit: SHA256 6d5b8448f787c5a36cda693c490cde2817cabef0a30f4925ab4e90049eadb611
and 9345bc74d4981913fc40ad24a204e69007f922fb29b0336fde8ebff15ce4a2c4.
The highest Host iteratorParameterGuards dispatch line is intentionally
identical to root's fixed-array cohort hook; both owners approved that overlap.
