Fixes #784

Router now strips supported location and ingress-IP headers, search
`user_location` and Gemini retrieval coordinates from routed inference HTTP,
native replay and JSON WebSocket messages by default. Exactly one
`x-router-share-geolocation: true` header opts in per request or connection.
Router consumes consent and preserves prompts, tool schemas, search availability
and existing telemetry choices. Account overrides cannot restore unconsented
location headers.

Reproduce with `CF-IPCountry: GB`, `X-Vercel-IP-City: London`, search coordinates,
or mixed-spelling Gemini retrieval coordinates and inspect a synthetic upstream.
Complete `geolocation.test.mjs` and `geolocation-websocket.test.mjs` cover removal,
exact opt-in, repeated/invalid consent, preserved content and fragmented messages.
All eight independent Gemini ProtoJSON spelling combinations are covered; six
mixed combinations leaked before the fix. Node and Bun each pass **30 focused
cases** and **259 native cases**. JavaScript, generated native TypeScript and
matching Rust source share fixtures. Rust execution remains unverified.

Forward CI now partitions every discovered complete test file into eight
required jobs with unchanged test bodies, original deadlines and concurrency.
Each job joins every original test and runner source before and after execution,
and retains the independent deadline audit and complete raw output. Both
canonical freshness commands run once in an independent required job; owned
profile generation also has an independent required job. All ten logical stages,
including every shard, must pass before Rust. The local gate retains its original
seven stages and complete unpartitioned cohort. Both serialized/reparsed YAML
CST phases and the complete inverse qualify the workflow source extension.

The four whole receiving files pass **54 Node cases plus the independent
deadline audit** and **52 Bun cases**. These controls verify exhaustive selection,
source-change refusals, real failure propagation, original setup and aggregate
requirements; they do not establish full production translation. Node is
**20.20.2**, local Bun **1.4.4** (CI pins **1.4.3**), and lockfile TypeScript
**5.9.3**. Original failed attempts, assertions and deadlines remain preserved.

The mandatory full local gate at clean source
**645d5adf0419c588f4db93ce499163aa5c9c5557** passes lint, both 259-case native
suites, nine audited deadline controls and public TypeScript. The memory guard
interrupts native TypeScript after **330.51 seconds**, exit **143**, stop sample
**2870210560 bytes** against the **3135369216-byte** container. Remaining
TypeScript checks, parity, forward and reverse are **unrun** for this attempt.
All owned processes are reaped; no active test deadline is paused and **no green
gate stamp exists**. Earlier exact-head failures remain separate evidence.

All seven workflows at preceding published head
**a2539817c8608f7dc5c40ae93af18e47b0fb6dd0** finished before this publication.
The [main run](https://github.com/link-assistant/router/actions/runs/42423777151)
fails; six supplemental workflows skip. Every whole log and every member of all
three artifact ZIPs has been read and checked for digest, length and CRC.

| Required stage | Complete preceding-head CI result |
| --- | --- |
| Lint, native Node/Bun | **Pass**, including 259 native cases per engine. |
| TypeScript | **Fail:** genuine owned-definition matrix index absent; main log lines 1154, 1167. |
| Profile matrix | Cancelled at the original **60 minutes**, with no complete draft. Mandatory uploader correctly fails on missing files; lines 4625, 4639. |
| Strict parity | **Fail:** stale account-policy source hash, **441 gaps**, **12345 carried items**, runtime parity false; lines 7905–7910. |
| Forward | Cancelled at original **60 minutes**. Eleven actual failures remain: eight stale generation/compiler contexts; receiving SIGTERM at original 20 seconds; complete corpus graph **96788.733202 > 60000 ms**; three real native builds **118552.328916 > 60000 ms**. No terminal cohort audit. |
| Reverse | Cancelled at original **15 minutes**, main log line 6949; Bun and regeneration unrun. |
| Aggregate / Rust | Aggregate **fails**, line 8057; Rust and release correctly skip. No Rust tool ran locally. |

The read-only artifact reviewer joins the actual checked merge to the published
head using complete authenticated commit metadata, exact base/head parents and
equal trees. It refuses the absent genuine matrix draft; no index or output is
fabricated. Canonical and all profile generation, independent artifact review,
installation, freshness, strict parity and original deadlines remain required.
No missing secret or human-only CI access prerequisite justifies a skip.

The [case study](https://github.com/link-assistant/router/blob/issue-784-1f6838f56841/docs/case-studies/issue-784/README.md)
records requirements, primary vendor research, all eight client integrations,
existing reusable components, alternatives and remaining limits. The
[configuration guide](https://github.com/link-assistant/router/blob/issue-784-1f6838f56841/docs/privacy/geolocation.md)
shows actual Codex and Claude defaults and opt-in. The
[complete current verification](https://github.com/link-assistant/router/blob/issue-784-1f6838f56841/docs/case-studies/issue-784/whole-file-shard-verification.md)
and [packet](https://github.com/link-assistant/router/blob/issue-784-1f6838f56841/docs/case-studies/issue-784/evidence/whole-file-shard-complete.tar.xz)
preserve **359 complete originals / 24465760 logical bytes**, including original
failed attempts, full CI and gate reports, raw Node streams and source joins.
Every decoded member verifies. All earlier complete public packets remain.

**Draft and unmerged; issue completion remains unfinished.** Compiler, profile,
strict parity and same-SHA Rust qualification criteria remain open. The literal
all-tool privacy guarantee also remains unmet: vendors can infer connection IPs
and retain mandatory security data; account controls require authenticated
accounts; direct client, telemetry, OAuth and MCP traffic can bypass Router.
Cursor's private protocol and Gemini subscription modes remain unsupported.
Account settings were not changed. Changelog fragments use the existing release
process. Main ancestry and the complete local source diff are checked before
publication; GitHub refuses the full PR diff with HTTP 406 (>300 files).
