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
The current compiler batch:

- Reuses the completed-data freezer for materialized Clone evidence while
  preserving the original callback order, error identity and private issuers.
  Both complete receiving files pass **4/4** cases per engine; Node's
  independent case-deadline audit passes. The broader Node parent remains late
  at **76791.194776 > 60000 ms**; Bun's broader cohort needs a memory stop.
- Allows Bun's source composer to receive complete source DATA from a fresh
  invocation of the original producer in Node. The receiving engine rechecks
  whole compiler/archive/current inputs, both serialized CST phases and native
  grammar. Original direct preparation and runtime-loader refusals stay exact;
  all four output files are byte exact. Both new whole cases pass in each
  engine; Node's deadline audit passes. The unchanged final parent case remains
  late: Node **163909.893825 ms**, Bun **120916.88 ms**, against **60000 ms**.
- Preserves complete native-selected source inverses and historical originals.
  **Zero newly executable production functions** are claimed for this batch.

All seven workflows at published head
`be8560a8d446f039c602672ad5d0f6f1a218acc6` finished before this publication.
The [main run](https://github.com/link-assistant/router/actions/runs/42400974916)
failed at **2026-11-07 19:23:03 UTC**; six supplemental callers skipped. Every
complete log and all members of all three artifact ZIPs were downloaded,
CRC-checked and inspected.

| Required stage | Complete preceding-head CI result |
| --- | --- |
| Lint, native Node, native Bun | **Pass**; 259 native cases per engine. |
| TypeScript | Prior native/profile checks pass with installed TypeScript **5.9.3**. Genuine owned-definition matrix index absent (full log lines **453–474**). |
| Strict parity | **Fail**: stale account-policy hash, **441 feature gaps**, **12345 carried items**, runtime parity false (lines **4561–4566**). |
| Profile matrix | Cancelled at the original **60-minute** job limit (lines **7915–7919**). No heap-fatal cause is established in this cycle. |
| Forward | Cancelled at the original **60-minute** limit. Complete partial TAP retains eleven failures: eight stale compiler-pin hooks, one original child deadline and two original case deadlines. No terminal cohort audit. |
| Reverse | Cancelled at the original **15-minute** limit (line **7591**); partial streams retained without terminal qualification. |
| Aggregate / Rust | Aggregate **fails**; Rust correctly remains skipped. No Rust tool ran locally. |

The complete local gate was attempted at clean **`21caf33cf`**. Lint (1776
syntax checks and all 61 controls), both 259-case native suites, nine audited
deadline controls, public/native type checking, native TypeScript freshness and
strict compilation of all 165 native TypeScript files pass. The owned memory
observer interrupts the native behavior file after four passes, without its
complete audit. Remaining TypeScript commands, parity, forward and reverse are
**unrun**. **No green stamp exists.** The attempt takes **669.87 seconds**,
including reaping its detached test daemon; exit **143**. Peak sampled cgroup
use is **2887798784 bytes**, including initial fingerprinting, against a
3135369216-byte container limit. The separate final-stop sample is unavailable.
The task observer now reaps its owned detached descendants and records stop
samples; a finite cleanup control passes. Tests and deadlines stay unchanged.

This is an explicitly incomplete feedback checkpoint. Actual ordinary/owned
matrix generation, compiler provenance, original deadlines and strict parity
remain required. No empty index, repinned history, relaxed check or PR-only
error skip substitutes for a repair. No human-only CI prerequisite was found.
Fresh main `eb2dad1c0` is an ancestor; no integration conflict remains.

The [case study](https://github.com/link-assistant/router/blob/issue-784-1f6838f56841/docs/case-studies/issue-784/README.md)
contains requirements, vendor research, client matrix and existing components.
The [checkpoint verification](https://github.com/link-assistant/router/blob/issue-784-1f6838f56841/docs/case-studies/issue-784/runtime-freeze-checkpoint-verification.md),
[Clone receiving evidence](https://github.com/link-assistant/router/blob/issue-784-1f6838f56841/docs/case-studies/issue-784/clone-completed-freeze.md)
and [Bun source composition](https://github.com/link-assistant/router/blob/issue-784-1f6838f56841/docs/case-studies/issue-784/runtime-import-source-data.md)
record exact passed, failed and unrun boundaries. The
[complete evidence packet](https://github.com/link-assistant/router/blob/issue-784-1f6838f56841/docs/case-studies/issue-784/evidence/runtime-freeze-complete.tar.xz)
preserves complete new logs, artifacts, failed probes, full source variants and
terminal receipts. Every selected input and decoded archive member verifies.
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
