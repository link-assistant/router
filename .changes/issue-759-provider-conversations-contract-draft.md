# Provider-owned Conversations contracts (source-only draft)

Draft follows `c31483c40` on the original validated Responses base. It does not
modify the gate's frozen canonical/profile receipts or route-precedence rules.

`src/conversations.rs` supplies distinct create, conversation, item collection,
and item contracts. The native draft now keeps exact conversation/item missing
envelopes, owner lookup before body consumption, parent and destination checks,
provider-native PATCH/DELETE bodies, single-segment ID encoding, and unchanged
queries. Known resource selection uses the existing recorded-destination core
hook even after the current default changes. Opaque conversation body fields do
not become model-routing or batch authorization selectors.

All provider bodies are read before capturing or retiring affinity. The original
conversation read limit is `max_proxy_request_bytes`; native uses `maxBodyBytes`,
including response reads. Missing/gone parent or item-collection responses retire
children scoped to namespace, parent, owner and original destination, followed by
full original parent-record equality. Missing/gone item responses retire only
that original child. Cleanup failure is best-effort for 404/410; successful DELETE
reports the original 503 resource-affinity error. Successful item lists retain
opaque bodies when their JSON is malformed or contains no data array. Valid child
IDs are recorded in separate original transactions; earlier writes remain if a
later child fails. No new atomic tree transaction is claimed.

Qwen Conversations returns the original unsupported 400. Explicit original method
checks reject HEAD after owner/parent/item lookup; these checks are implemented
without inferring Axum route precedence. Public dispatch still strips HEAD bodies.

The shared subscription selection hook uses logical `principalAccount`, rather
than physical `pinnedAccount`, for recorded account bindings. The real core maps an
implicit Codex provider to logical `primary`; treating it as a physical key would
reject a valid known continuation or conversation. The existing signed binding
check and final exact destination comparison remain in place.

Sixteen new authored cases cover opaque bytes and original golden encoded IDs,
PATCH, item create/list/retrieve/delete, owner/parent/destination and namespace
isolation, ambiguous child IDs, malformed item lists, sequential partial capture,
scoped missing/gone retirement, successful deletion, failing stores, body limits,
explicit HEAD method policy, real-core persisted default changes, durable
destination replacement, and implicit Codex logical-primary routing. Existing
sixteen Responses cases reuse the extracted provider-resource fixture helpers.
Combined authored case count: 32. All cases remain **UNRUN**.

Shared original-source receipt:
`experiments/issue-759/acceptance/provider-responses-source-receipt.json`.
Prior ten source identities remain unchanged. Added source identities:
`src/conversations.rs` and `src/resource_lifecycle_tests.rs`, including
`conversations_are_native_owner_scoped_and_parent_bound` and
`native_subscription_response_lifecycle_reuses_the_exact_account`.

Validation here consists only of source inspection, Python SHA-256 identity audit
and fixture declaration count, and `git diff --check`. No engines, helpers,
parsers, probes, producer, Rust build, or push were run. No source-proof or parity
promotion flags changed. Original Rust runtime equivalence is not established.

Proposed bounded gate window: execute the two provider resource acceptance modules
in isolation, then the existing native-service/core suites, followed by the gate's
shared meta/TypeScript generation and broader checks. Existing route outcome
fixtures that expect invented Qwen 501 or conversation missing envelopes require
review against the original source's explicit 400/404 contracts; they must not be
silently promoted into parity evidence.
