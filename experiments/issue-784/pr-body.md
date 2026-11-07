Fixes #784

Router forwarded location headers and optional search coordinates to providers.
This draft removes supported explicit geolocation metadata by default from
routed inference HTTP, native replay and JSON WebSocket messages. Exactly one
`x-router-share-geolocation: true` header opts in per request or connection.
Router consumes that header and preserves prompts, tool schemas, search
availability and existing telemetry choices. Account overrides cannot restore
unconsented location or ingress IP headers.

JavaScript, generated native TypeScript and matching Rust source share fixtures.
Gemini coordinates cover all eight independent ProtoJSON spelling combinations;
six mixed combinations leaked before the fix. Existing bounded decoders and
WebSocket inspection are reused. Rust execution remains unverified.

Reproduce with a native request containing `CF-IPCountry: GB`,
`X-Vercel-IP-City: London`, supported search `user_location`, or mixed-spelling
Gemini retrieval coordinates, and inspect a synthetic upstream. The complete
`geolocation.test.mjs` and `geolocation-websocket.test.mjs` files test removal,
opt-in, invalid/repeated consent, preserved content and fragmented forwarding.
Node and Bun each pass all **30 focused cases** and **259 native cases**.

Compiler repairs retain original assertions, deadlines, source pins, resource
limits, private issuers and strict parity. Earlier batches preserve complete
receiving fixture universes, historical source inverses and callback bodies.
The current batch:

- Adds one bounded complete CST phase transaction and connects the actual
  callback producer. Complete original/intermediate/final documents and both
  inverses serialize and reparse. Fresh physical source authentication remains.
  The actual project afterimage is byte exact. All four whole receiving files
  pass **11/11** cases in each engine; Node's independent deadline audit passes.
- Rejects oversized materialized Clone branches before evidence encoding, using
  the existing logical node/depth limits. Accepted evidence still receives full
  serialization, freezing, grammar checks and original callback checks. The
  finite 128-field regression fails before the fix and passes afterward. Both
  whole new two-case files and the independent Node audit pass. The broader Node
  cohort still breaches one original 60000 ms deadline at 78901.82 ms; Bun's
  broader cohort is stopped by the memory observer.
- Retains three bounded whole-planner diagnostics and complete source proposals.
  All 419 derives and 397 carrier modules finish in the narrowest trace before
  heap exhaustion. No root serialized operand or matrix completion is claimed.
  **Zero newly executable production functions** are claimed for this batch.

All seven workflows for published head
`545f2909d14817f33ba18721a2d0c28690578544` finished before this publication.
The [main run](https://github.com/link-assistant/router/actions/runs/42392951636)
failed; six supplemental callers skipped. Every complete log and all three
artifact ZIPs were downloaded and fully inspected.

| Required stage | Complete preceding-head CI result |
| --- | --- |
| Lint, native Node, native Bun | **Pass**; 259 native cases per engine. |
| TypeScript | Prior native checks and their full deadline audit pass with installed TypeScript **5.9.3**. The genuine owned-definition matrix index is absent (full log lines 7130–7143). |
| Strict parity | **Fail**: stale account-policy hash, **441 feature gaps**, **12345 carried items**, runtime parity false (lines 1184–1188). |
| Profile matrix | Cancelled at the original **60-minute** job limit (lines 269–273); no observed heap-fatal message in this cycle. |
| Forward | Cancelled at the original **60-minute** limit. The complete partial artifact retains eleven failures: eight stale compiler-pin hooks, one original child deadline and two original case deadlines. No terminal cohort audit. |
| Reverse | Cancelled at the original **15-minute** limit (line 7859); partial streams retained without terminal qualification. |
| Aggregate / Rust | Aggregate **fails**; Rust correctly remains skipped. No Rust tool ran locally. |

The complete local gate was attempted at clean **`3d645ee03`**. With the corrected
PATH, lint (1772 syntax checks and all 61 controls), both 259-case native suites,
nine independently audited deadline controls and public operation type checking
pass. During native type checking, the owned observer stops and reaps the group
at **2878582784 sampled total-cgroup bytes**, with a 3135369216-byte container
limit: **392.96 seconds**, exit **143**. Remaining TypeScript commands, parity,
forward and reverse are **unrun in this attempt**. **No green gate stamp exists.**
Initial fingerprint cache advice changes no file, limit or deadline. An earlier
omitted-npm setup attempt is retained separately and cannot qualify native or
TypeScript commands. Separate strict generated TypeScript checks pass with 5.9.3.

This is an explicitly incomplete feedback checkpoint. Fresh CI remains
unqualified until the entire cycle completes. Genuine ordinary/owned matrix
generation, source provenance, original deadlines and strict parity all remain
required. No empty index, repinned history, relaxed check or PR-only error skip
substitutes for a repair. No human-only CI prerequisite was found. Fresh main
`eb2dad1c0` is an ancestor; no integration conflict remains.

The [case study](https://github.com/link-assistant/router/blob/issue-784-1f6838f56841/docs/case-studies/issue-784/README.md)
contains requirements, vendor research, client matrix and existing components.
The [checkpoint verification](https://github.com/link-assistant/router/blob/issue-784-1f6838f56841/docs/case-studies/issue-784/clone-checkpoint-verification.md),
[phased CST investigation](https://github.com/link-assistant/router/blob/issue-784-1f6838f56841/docs/case-studies/issue-784/phased-cst-investigation.md)
and [Clone regression](https://github.com/link-assistant/router/blob/issue-784-1f6838f56841/docs/case-studies/issue-784/clone-validation-order.md)
record exact passed, failed and unrun boundaries. The
[complete evidence packet](https://github.com/link-assistant/router/blob/issue-784-1f6838f56841/docs/case-studies/issue-784/evidence/phased-clone-complete.tar.xz)
preserves all new original logs, artifacts, failed probes, complete source
variants and terminal receipts; every full member and selected input verifies.
Earlier packets remain intact. The [configuration guide](https://github.com/link-assistant/router/blob/issue-784-1f6838f56841/docs/privacy/geolocation.md)
shows actual Codex/Claude defaults and opt-in. Changelog fragments use the
repository's automatic version/release process.

**Draft and unmerged; completion remains unfinished.** Remaining criteria include
all compiler/profile/parity failures and Rust qualification after a green
same-SHA JavaScript gate. The literal all-tool guarantee also remains unmet:
vendors see connection IPs and retain mandatory security inference, account
controls need authenticated accounts, and direct client, telemetry, OAuth and
MCP traffic can bypass Router. Cursor's private protocol and Gemini subscription
modes remain unsupported. Account settings were not changed.
