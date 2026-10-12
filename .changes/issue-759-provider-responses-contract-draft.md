# Provider-owned Responses contracts (source-only draft)

Base: `e0b405361ed24f9eedb035b1dec84a6047e845c1`.

Known Responses continuations and lifecycle operations use the recorded exact
provider even after the configured default changes. This internal routing hook
keeps normal client and account filtering, credential preparation, and final
destination equality checks. Unknown legacy create IDs retain Rust's original
upstream fallback; helper references still require an owned recorded resource.

Explicit malformed continuation selectors and invalid create objects fail before
upstream dispatch. Response and conversation references apply only to their
original Responses create/helper surfaces. Provider-owned background resources
keep the provider's status, body, input-item cursors, and cancellation result.
They do not create a native background worker. Local translated inference still
rejects unsupported background/previous-response execution.

Lifecycle bodies are read before retiring their bindings. Upstream 404/410 is
normalized to Rust's exact response-not-found envelope for all lifecycle methods;
successful deletion preserves its upstream body. Conditional removal protects a
replacement binding to a different destination from a late upstream result.

Sixteen new acceptance cases observe loopback HTTP bytes, provider identity,
queued/in-progress/cancelled resources, owner and namespace isolation, token
rotation, known and legacy continuation routing, malformed selectors, helper
reference conflicts, successful/error deletion, truncated body failure, and
destination replacement races. One combines the real core, token authority,
text affinity persistence, restart, changed default, and changed recorded URL.
Another holds a lifecycle request open while a persistent record is removed and
recreated on the same destination with a later lifetime. Its late 410 must leave
the replacement available after reopening the store.

Original source identities are recorded in
`experiments/issue-759/acceptance/provider-responses-source-receipt.json`.
Relevant original behaviors:

- `src/proxy_openai_resource.rs::state_for_previous_response`: malformed selector,
  legacy fallback, owner lookup and subscription account pin.
- `src/responses_lifecycle.rs::{forward,forward_stored_provider,relay}`: recorded
  provider identity, client availability, body-before-retirement and exact 404.
- `src/native_service_resources.rs::{response_references,referenced_response_affinity}`
  and `src/native_service_tests_resources.rs::responses_helpers_pin_native_compaction_to_existing_state`:
  helper-only references and exact provider conflict.
- `src/response_affinity.rs::remove_if_matches`: conditional retirement.
- `src/resource_capture.rs` and `src/proxy_openai.rs`: capture-before-exposure,
  default retention and provider-native execution.

Validation in this worktree: source reads, Python SHA-256 source receipt, and
`git diff --check` only. No Node/Bun/TypeScript/parser/probe/producer/Rust engine
was run. Runtime checks, shared meta/reverse generation, and strict parity proof
remain pending the gate's exclusive verification window. This draft changes no
unsupported-source proof or promotion flags and establishes no Rust parity claim.

Bounded proposed verification: run only
`node --test experiments/issue-759/acceptance/provider-responses.test.mjs`, then
the existing native service/core suites in the gate's scheduled window. Preserve
canonical/profile receipts and existing seven-stage evidence before regeneration.

The follow-up conditional retirement hook compares the complete original Rust
record identity: namespace, owner, ID, parent, destination, creation and expiry.
It preserves a replacement with a different lifetime even on the same destination.
It does not invent a generation nonce: two records identical in every original
field remain equal under Rust's actual `remove_if_matches` contract.

The next follow-up preserves `responses_lifecycle.rs::relay`'s storage-error
distinction: a 404/410 retirement error is ignored and the exact missing-response
envelope is returned; a successful DELETE retirement error returns the original
503 `api_error` envelope. Two injected failing-store cases cover those branches.

HEAD call path is explicitly traced in existing source: network `listen` and
public `fetch` both reach `server.mjs::handle`, which rewrites HEAD to GET before
dispatch and strips the resulting body after response/error construction. Thus
the internal service's lifecycle bytes cannot escape those public HEAD surfaces.
Two further cases cover successful, missing and foreign-owner public Web HEAD,
and real network HEAD with preserved status/request ID and an empty body.

This establishes only the authored HEAD body contract. The current native
dispatcher sends GET upstream for HEAD; original `responses_lifecycle.rs::forward`
passes the request's `parts.method` to the upstream builder unchanged, while
`server_router.rs` installs the lifecycle handler through `get(...)`. No HEAD
method-routing or route-precedence change is included without a coordinated
audit of the pinned Axum routing implementation. These new cases do not claim
that upstream-method equivalence has been verified.

Remaining source-level limitations outside this batch: reactive subscription 401
refresh and bridge execution controls need their own coordinated audits. Existing
unsupported translated background and continuation behavior remains explicit.
