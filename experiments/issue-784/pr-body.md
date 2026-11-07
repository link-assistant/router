Fixes #784

Router forwarded location headers and optional search coordinates to providers.
This draft removes supported explicit geolocation metadata by default from
routed inference HTTP, native replay and JSON WebSocket messages. Exactly one
`x-router-share-geolocation: true` header opts in for a request or WebSocket
connection. Router consumes that header and preserves prompts, tool schemas,
search availability and existing telemetry choices.

JavaScript, generated native TypeScript and matching Rust source share fixtures.
Account overrides cannot restore unconsented location or ingress IP headers.
Gemini coordinates cover all eight independent ProtoJSON spelling combinations;
six mixed combinations leaked before the fix. Existing bounded decoders and
WebSocket inspection are reused. Rust execution remains unverified.

Reproduce with a native request containing `CF-IPCountry: GB`,
`X-Vercel-IP-City: London`, supported search `user_location`, or mixed-spelling
Gemini retrieval coordinates, and inspect a synthetic upstream. The complete
`geolocation.test.mjs` and `geolocation-websocket.test.mjs` files test removal,
opt-in, invalid/repeated consent, preserved content and fragmented forwarding.
Node and Bun each pass all **30 focused cases** and **259 native cases**.

The coordinated compiler repairs retain original assertions, deadlines, source
pins, resource limits and strict parity. Earlier batches preserve complete
fixture universes, real profile inventories, guarded lexer/token source history,
proof-byte proposals and bounded gate hashing. The new batch:

- Moves project callback creation into private factories to release unused
  compiler environments. Complete callback bodies, per-engine names, live
  module arrays and native syntax/inverses remain checked. All three new cases
  pass in Node and Bun, including the Node independent deadline audit.
- Composes the freezer producer's complete scanner successor with its original
  receiving copy. New regressions pass in both engines; the complete twelve-case
  cohorts still fail two original 60000 ms deadlines per engine.
- Composes the facade test's complete module-token successor without restoring
  its older body. Both complete receiving files pass **9/9** in each engine;
  Node's independent deadline audit also passes.

A finite four-process Config comparison preserves complete checked/emitted
output and callback observations. Retained heap decreases in that diagnostic;
**zero newly executable production functions** and no matrix peak improvement
are claimed. The separate complete core-vector Node file has 6/7 TAP passes,
an independent 365160.48 ms versus 60000 ms deadline failure, and a Rust-header
source-pin failure. Original source pins and deadlines remain unchanged.

All seven workflows for the preceding published head
`77e82f2bbd75455fc29f5f4716b081644ed8e87c` finished before this publication.
The [main run](https://github.com/link-assistant/router/actions/runs/42382913262)
finished failure at 2026-11-07 15:43:44 UTC; six supplemental workflows skipped.
Complete logs and all three artifact ZIPs were downloaded and read.

| Required stage | Complete preceding-head CI result |
| --- | --- |
| Lint, native Node, native Bun | **Pass**; 259 native cases per engine. |
| TypeScript | Three existing profiles compile strictly with installed TypeScript **5.9.3**; the required genuine owned-definition matrix index is missing (full log lines 4758, 4771). |
| Strict parity | **Fail**: stale account-policy hash, **441 feature gaps**, **12345 carried items**, runtime parity false (lines 2337–2341). |
| Profile matrix | **Fail** at the original **2048 MiB** worker heap; owned generation unrun (line 2649). |
| Forward | Original **60-minute** limit cancels the cohort. Complete artifact retains 1975 emitted case records and 25 full failure blocks. These include stale generation, original child/case deadlines, CSV ownership evidence and receiving source history. No terminal cohort audit. |
| Reverse | Original **15-minute** limit cancels the cohort; complete partial streams retained without terminal qualification. |
| Aggregate / Rust | Aggregate **fails**; Rust remains correctly skipped. No Rust tool ran locally. |

The mandatory complete local gate ran at clean **`dfcc6b93d`** with unchanged
source bytes. Lint (1766 syntax checks and all 61 controls), both 259-case native
suites, nine deadline controls, public type checks, native AST freshness and
strict compilation of 165 native TypeScript files pass. The broader TypeScript
receiving file emits four passing cases before the owned observer stops the
process group at **2869354496 sampled total-cgroup bytes**, below the container's
3135369216-byte limit. Its independent case audit is incomplete. Elapsed time
including reaping its identified adopted daemon is **608.69 s**, exit **143**.
Remaining TypeScript commands, parity, forward and reverse are **unrun in this
attempt**. Earlier complete strict-parity failures remain open. **No green gate
stamp exists.** The initial cache advice changes no file, deadline or command.
The separate strict generated TypeScript project passes with TypeScript 5.9.3.

The new head is an explicitly incomplete feedback checkpoint; its fresh CI
remains unqualified until the entire cycle completes. Genuine ordinary/owned
matrix generation, source provenance, original deadlines and strict parity all
remain required. No empty index, repinned history, relaxed check or PR-only
error skip substitutes for a repair. No human-only CI prerequisite was found.
Fresh main `eb2dad1c0` is an ancestor; no integration conflict remains.

The [case study](https://github.com/link-assistant/router/blob/issue-784-1f6838f56841/docs/case-studies/issue-784/README.md)
contains requirements, vendor research, client matrix, alternatives and existing
components. The [verification record](https://github.com/link-assistant/router/blob/issue-784-1f6838f56841/docs/case-studies/issue-784/verification.md),
[callback investigation](https://github.com/link-assistant/router/blob/issue-784-1f6838f56841/docs/case-studies/issue-784/project-retention-investigation.md)
and [receiving history](https://github.com/link-assistant/router/blob/issue-784-1f6838f56841/docs/case-studies/issue-784/receiving-history-investigation.md)
preserve exact passed, failed and unrun boundaries. The new
[complete evidence packet](https://github.com/link-assistant/router/blob/issue-784-1f6838f56841/docs/case-studies/issue-784/evidence/project-retention-complete.tar.xz)
retains **429 complete originals / 37725438 logical bytes** at `300261919`,
including the preceding entire CI cycle, every artifact, failed experiments,
source variants and complete local logs. Every member and unchanged selected
input verifies by full bytes and SHA256; earlier packets remain intact. The
[configuration guide](https://github.com/link-assistant/router/blob/issue-784-1f6838f56841/docs/privacy/geolocation.md)
shows actual Codex/Claude defaults and opt-in. Changelog fragments use the
repository's automatic version/release process.

**Draft and unmerged; completion remains unfinished.** Remaining criteria include
all compiler/profile/parity failures and Rust qualification after a green
same-SHA JavaScript gate. The literal all-tool guarantee also remains unmet:
vendors see connection IPs and retain mandatory security inference, account
controls need authenticated accounts, and direct client, telemetry, OAuth and
MCP traffic can bypass Router. Cursor's private protocol and Gemini subscription
modes remain unsupported. Account settings were not changed.
