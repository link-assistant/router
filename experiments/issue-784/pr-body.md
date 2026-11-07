Fixes #784

Router forwarded supported location headers and optional search coordinates to
providers. This draft removes explicit geolocation metadata by default from
routed inference HTTP, native replay and JSON WebSocket messages. Exactly one
`x-router-share-geolocation: true` header opts in per request or connection.
Router consumes consent and preserves prompts, tool schemas, search availability
and existing telemetry choices. Account overrides cannot restore unconsented
location or ingress IP headers.

Reproduce with `CF-IPCountry: GB`, `X-Vercel-IP-City: London`, supported search
`user_location`, or mixed-spelling Gemini retrieval coordinates and inspect a
synthetic upstream. Complete `geolocation.test.mjs` and
`geolocation-websocket.test.mjs` files cover removal, opt-in, repeated/invalid
consent, preserved content and fragmented forwarding. All eight independent
Gemini ProtoJSON spelling combinations are covered; six mixed combinations
leaked before the fix. Node and Bun each pass **30 focused cases** and **259
native cases**. JavaScript, generated native TypeScript and matching Rust source
share fixtures. Rust execution remains unverified.

The coordinated compiler repair refreshes the documented complete isolated
compiler registration and genuine portable Git fixture. It independently
reproduces all proposal bytes, checks all **1779 compiler/TypeScript files**,
retains six complete historical preimages, and checks both serialized/reparsed
bootstrap CST phases and full inverses. Historical receiving fixtures and pins
remain exact. Both whole receiving files now pass **17 original cases per
engine** in Node 20.20.2 and Bun 1.4.4, including the real exported compiler round
trip and both CST directions. Independent source/deadline audits pass. Largest
sampled receiving cgroup use is **2275155968 bytes**, with no observer stop.
Installed TypeScript is **5.9.3**. **Zero newly executable production functions**
are claimed. Earlier completed-freezer and Bun source-data repairs remain intact.

All seven workflows at preceding published head
`f3ba507ddc3f48391239c21423cc84ec1a2a275e` finished before this publication.
The [main run](https://github.com/link-assistant/router/actions/runs/42406506626)
failed at **2026-11-07 20:30:35 UTC**; six supplemental callers skipped. Every
complete log and all members of all three artifact ZIPs were downloaded and
CRC/length/hash checked.

| Required stage | Complete preceding-head CI result |
| --- | --- |
| Lint, native Node, native Bun | **Pass**; 259 native cases per engine. |
| TypeScript | Genuine owned-definition matrix index absent, full workflow log line **1157**. |
| Strict parity | **Fail**: stale account-policy hash, **441 feature gaps**, **12345 carried items**, runtime parity false, lines **7172–7176**. |
| Profile matrix | Cancelled at the original **60-minute** job limit, line **3112**. |
| Forward | Cancelled at the original **60-minute** limit. Full partial TAP preserves **21 failure blocks**, including seven stale isolated registration failures addressed by this batch. No terminal cohort audit. |
| Reverse | Cancelled at the original **15-minute** limit, line **6213**; no terminal cohort audit. |
| Aggregate / Rust | Aggregate **fails**; Rust correctly remains skipped. No Rust tool ran locally. |

The mandatory complete local gate was attempted at clean source
**`17aea691976747ef8d8318ab1aa7994789b023ee`**. Lint and all 61 controls, both
259-case native suites, nine audited deadline controls, public/native type
checking, native TypeScript freshness and strict compilation of all 165 files
pass. All nine native behavior TAP cases finish, but the independent audit
**fails** regeneration at **133321.867865 > 60000 ms**. Passing TAP does not waive
the unchanged deadline. All 121 parity acceptance cases pass; strict parity then
fails on the source hash, feature gaps and carried items above. The memory
observer interrupts forward startup before TAP or a complete case audit.
Remaining TypeScript and forward commands, and reverse translation, are **unrun**.
The attempt takes **971.06 seconds**, exit **143**; every owned process is reaped.
Peak sampled cgroup use is **2876076032 bytes**, with a distinct final stop sample
of **2873933824**, against the **3135369216-byte** container. **No green stamp
exists.** Tests, resource limits, private issuers and strict checks are unchanged.

This remains an incomplete feedback checkpoint. Actual ordinary/owned matrix
generation, compiler provenance, original deadlines and strict parity remain
required. No empty index, repinned historical fixture or PR-only failure skip
substitutes for implementation. No human-only CI prerequisite was identified.
Fresh main `eb2dad1c0` is an ancestor; no integration conflict remains.

The [case study](https://github.com/link-assistant/router/blob/issue-784-1f6838f56841/docs/case-studies/issue-784/README.md)
contains requirements, vendor research, client matrix and existing components.
The [registration verification](https://github.com/link-assistant/router/blob/issue-784-1f6838f56841/docs/case-studies/issue-784/current-isolated-registration.md)
and [complete preceding CI review](https://github.com/link-assistant/router/blob/issue-784-1f6838f56841/docs/case-studies/issue-784/resolver-profile-checkpoint-verification.md)
record passed, failed and unrun checks. The
[complete evidence packet](https://github.com/link-assistant/router/blob/issue-784-1f6838f56841/docs/case-studies/issue-784/evidence/resolver-complete.tar.xz)
preserves full logs, artifacts, failed probes, source variants and terminal
receipts; every selected original and archive member verifies. Earlier packets
remain intact. The [configuration guide](https://github.com/link-assistant/router/blob/issue-784-1f6838f56841/docs/privacy/geolocation.md)
shows actual Codex/Claude defaults and opt-in. Changelog fragments use the
repository's automatic release process.

**Draft and unmerged; completion remains unfinished.** Remaining criteria include
all compiler/profile/parity failures and Rust qualification after a green
same-SHA JavaScript gate. The literal all-tool guarantee also remains unmet:
vendors see connection IPs and retain mandatory security inference; account
controls need authenticated accounts; direct client, telemetry, OAuth and MCP
traffic can bypass Router. Cursor's private protocol and Gemini subscription
modes remain unsupported. Account settings were not changed.
