Fixes #784

Router forwarded explicit location metadata to providers. This draft removes
supported location and ingress-IP headers, search `user_location` and Gemini
retrieval coordinates from routed inference HTTP, native replay and JSON
WebSocket messages by default. Exactly one `x-router-share-geolocation: true`
header opts in per request or connection. Router consumes consent and preserves
prompts, tool schemas, search availability and existing telemetry choices.
Account overrides cannot restore unconsented location headers.

Reproduce with `CF-IPCountry: GB`, `X-Vercel-IP-City: London`, search coordinates,
or mixed-spelling Gemini retrieval coordinates and inspect a synthetic upstream.
Complete `geolocation.test.mjs` and `geolocation-websocket.test.mjs` files cover
removal, exact opt-in, repeated/invalid consent, preserved content and fragmented
forwarding. All eight independent Gemini ProtoJSON spelling combinations are
covered; six mixed combinations leaked before the fix. Node and Bun each pass
**30 focused cases** and **259 native cases**. JavaScript, generated native
TypeScript and matching Rust source share fixtures. Rust remains unverified.

The coordinated compiler repair preserves complete source/CST equations,
independent semantic checks and historical pins. A regeneration-only native
source batch authenticates whole inputs together while retaining the original
standalone APIs, fresh private issuers, native checks and physical rereads.
All **199 complete outputs (11586409 bytes)** match the original build. The
complete new three-case file passes Node and Bun. The original nine-case Node
attempt passes behavior but its independent audit **fails** regeneration at
**116643.104607 > 60000 ms**. The original Bun attempt breaches its existing
compiler deadline and is then stopped by the memory guard; remaining cases are
unqualified. No original deadline or assertion is relaxed.

CI now retains complete matrix draft bytes after original validation and
freshness comparison. The original freshness commands still fail on stale,
missing or unexpected outputs. An exact final artifact uploader preserves the
unqualified drafts; no generation-before-check, checked-in output replacement,
PR-only skip or semantic permission is added. Complete source equations and
both serialized/reparsed YAML CST phases qualify the workflow extension.

The custody/workflow controls pass **36 whole Node cases** and their independent
deadline audit. The complete matrix file passes **11 Node cases** and its audit;
all **3** low-level custody cases pass Bun. The whole matrix Bun file is unrun.
The full isolated compiler registration is independently refreshed from
`ae10349b69f2303b9c799f07a40757fbd8d315cc`: **1783 compiler/TypeScript files,
57221413 source bytes, 463 genuine portable Git objects**. Six complete prior
registration files remain archived; historical source profiles remain exact.
Both whole receiving files pass **17 original cases per engine**, including the
real exported round trip and strict TypeScript. Independent Node source/deadline
audit passes. Local Node is **20.20.2**, Bun **1.4.4** (CI pins **1.4.3**), and
lockfile TypeScript **5.9.3**. **Zero new executable production functions** are
claimed by registration, batching, draft retention or diagnostic counts.

All seven workflows at preceding published head
`bea75c2c1676c78a381228a3a15557ae3a290276` finished before this publication.
The [main run](https://github.com/link-assistant/router/actions/runs/42415256131)
finished **2026-11-07 22:19:19 UTC** with failure; six supplemental callers
skipped. Every complete log and every member of all three artifact ZIPs was
read and checked for CRC, length and SHA256.

| Required stage | Complete preceding-head CI result |
| --- | --- |
| Lint, native Node, native Bun | **Pass**, including 259 native cases per engine. |
| Profile matrix | All three ordinary plans complete within the original 60 minutes, then **fail** freshness: each has 2803 missing, 67 stale and 742 unexpected files; stale matrix index also fails. Full log lines 12709–12710. |
| TypeScript | **Fail**: genuine owned-definition matrix index absent, lines 13920 and 13933. |
| Strict parity | **Fail**: stale account-policy source hash, **441 feature gaps**, **12345 carried items**, runtime parity false, lines 14875–14880. |
| Forward | Cancelled at the original **60-minute** limit. Complete partial TAP preserves eleven failures: eight stale generation/compiler hashes, core-adoption receiving SIGTERM at its original 20 seconds, literal corpus graph 107920.885818 > 60000 ms, and all-three native corpus builds 127007.485961 > 60000 ms. No terminal cohort audit. |
| Reverse | Cancelled at the original **15-minute** limit, full log line 13414; no terminal cohort audit. |
| Aggregate / Rust | Aggregate **fails** at line 18884; Rust correctly remains skipped. No Rust tool ran locally. |

The mandatory complete local JavaScript gate is attempted at clean source
**`a6f2cdf17b3244b5ee25856a051c01799b951c6b`**. Lint/workflow controls, both
259-case native suites, and nine deadline controls with independent audit pass.
The memory guard interrupts public TypeScript checking before completion:
**358.85 seconds**, exit **143**, sampled peak/final stop **2867654656 bytes**
against the **3135369216-byte** container. Remaining TypeScript commands, strict
parity, forward and reverse are **unrun** for this attempt. Initial inactive-page
cache advice occurs before any stage; no active case deadline is paused. Every
owned process is reaped. **No green gate stamp exists.** Earlier gate attempts
and complete failed probes remain distinct evidence at their original heads.

Actual ordinary/owned output installation, canonical generation freshness,
compiler provenance, all original deadlines and strict parity remain required.
There is no missing secret or human-only CI access prerequisite to bypass.
Fresh main `eb2dad1c0a18394dc1aad46413e11401e74eb502` is an ancestor.
GitHub refuses the complete PR diff with HTTP 406 (>300 files); the full local
base/head text diff is retained and new production changes reviewed directly.
Changelog fragments use the repository's automatic release process.

The [case study](https://github.com/link-assistant/router/blob/issue-784-1f6838f56841/docs/case-studies/issue-784/README.md)
contains requirements, vendor research, client coverage, existing components and
solution limits. The [configuration guide](https://github.com/link-assistant/router/blob/issue-784-1f6838f56841/docs/privacy/geolocation.md)
shows actual Codex/Claude defaults and opt-in. The
[native batch verification](https://github.com/link-assistant/router/blob/issue-784-1f6838f56841/docs/case-studies/issue-784/native-regeneration-batch.md),
[complete preceding CI review](https://github.com/link-assistant/router/blob/issue-784-1f6838f56841/docs/case-studies/issue-784/native-regeneration-ci-review.md)
and [custody verification](https://github.com/link-assistant/router/blob/issue-784-1f6838f56841/docs/case-studies/issue-784/matrix-draft-custody-verification.md)
distinguish passed, failed and unrun checks. Complete evidence packets preserve
original logs, artifacts, source variants, failed probes and terminal receipts;
all earlier public packets remain intact. The
[complete current packet](https://github.com/link-assistant/router/blob/issue-784-1f6838f56841/docs/case-studies/issue-784/evidence/matrix-draft-complete.tar.xz)
verifies 155 complete originals and 29412541 logical bytes; the separate native
batch packet preserves its complete original CPU profiles and failed attempts.

**Draft and unmerged; issue completion remains unfinished.** The compiler,
profile, parity and same-SHA Rust qualification criteria remain open. The literal
all-tool privacy guarantee also remains unmet: vendors can infer connection IPs
and retain mandatory security data; account controls require authenticated
accounts; direct client, telemetry, OAuth and MCP traffic can bypass Router.
Cursor's private protocol and Gemini subscription modes remain unsupported.
Account settings were not changed.
