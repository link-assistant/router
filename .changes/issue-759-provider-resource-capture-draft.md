# Provider-owned resource capture (source-only draft)

Follows the excluded Responses/Conversations queue through `9556960c8`. Original
architecture was inspected before choosing this batch: `proxy_openai.rs` forwards
native background creation, `responses_lifecycle.rs` forwards cancellation to the
exact provider, and `bridge_controls.rs::validate_responses` explicitly refuses
Anthropic-bridged background execution with a synchronous-request diagnostic.
This draft adds no local background worker or invented cancellation model.

The next concrete gaps come from `resource_capture.rs`. Capture now searches
complete byte-framed SSE blocks before rejecting an unidentified oversized prefix,
as the original per-chunk ordering requires. Each `data:` line is interpreted
independently. Malformed/unusable lines are skipped, root-ID presence takes
precedence over a nested ID, and Rust's whitespace domain is used for payload
trimming. CRLF/LF framing and split Unicode scalars retain the original bytes.
MIME matching is case-insensitive. The captured ownership record must commit
before a successful stream and its buffered prefix become visible.

JSON capture uses checked UTF-8 and scalar string values, with original root ID
fields followed by query-free/trailing-slash Location fallback. Provider bytes
are replayed unchanged even when only Location supplies identity. Missing IDs
and stream-prefix/EOF failures use the original 502 envelope; ownership failures
use the original 503 envelope, including `param:null` and `code:null`. Capture
bypasses failed upstream responses and `store:false`, matching the original.
Closing the captured client stream does not erase provider-owned resource
affinity; later owner retrieval/cancellation still uses the exact upstream.

Ten new cases use actual loopback HTTP for durable-before-return SSE replay and
Location fallback, and controlled Web streams for exact transport-chunk ordering,
prefix refusal/cancellation, EOF, error exposure, opt-out, byte validity, scalar
strings and post-disconnect owner control. Largest authored fixture allocates
slightly more than 1 MiB in memory, then cleans it up. No external endpoint is
contacted. These source fixtures add to the existing 16 Responses and 16
Conversations cases: 42 authored cases, all **UNRUN**.

Original source receipt remains
`experiments/issue-759/acceptance/provider-responses-source-receipt.json`; prior
twelve hashes stay unchanged. Added identities are `src/sse.rs` and
`src/bridge_controls.rs`, with contracts from `resource_capture.rs` and
`resource_lifecycle_tests.rs::sse_identity_is_durable_before_the_success_response_is_returned`.

Only source reads, Python identity/count auditing and `git diff --check` were
performed. No Node/Bun/TypeScript/parser/helper/probe/producer/Rust engine or push
ran. No promotion flags or canonical/profile receipts changed. Shared meta,
generation, runtime fixture outcomes and full parity remain the gate's work in
its next exclusive window. These cases are representative capture contracts,
not proof of every serde_json recursion or numeric-precision boundary, every
subscription refresh behavior, or universal Rust semantic equivalence.
