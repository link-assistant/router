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

The CI repair preserves every discovered original test file, assertion and
deadline. Forward tests use eight required complete-file bins. Reverse uses
eight complete-file bins per engine plus the three original regeneration
commands. Both canonical freshness commands and owned profile generation remain
required. All twelve logical JavaScript stages and every bin must pass before
Rust. The local gate retains its complete unpartitioned cohorts. Workflow
generation retains serialized/reparsed YAML CST phases and complete inverses.
The four complete reverse-coordinator receiving files pass 82 Node cases with
the independent deadline audit and 80 Bun cases; that is coordinator evidence,
not a successful full translator gate.

The current source batch also repairs exact compiler-index custody, refreshes the
genuine source registry, adds the separately pinned complete official Node
20.20.2 crypto profile, restores the parser fixture's missing physical equation
dependencies and preserves its original refusal boundary. Genuine Hash callback
exceptions retain their identity; copied errors and proxies cannot acquire the
producer's private mismatch identity. No source pin, complete original archive,
semantic admission check or performance limit is waived.

Recorded receiving results remain distinct:

- Exact-index controls: 17 Node and 17 Bun cases pass.
- Registry controls: 16 Node and 16 Bun cases pass. Source registration must be
  regenerated again for the final coherent compiler batch.
- Node 20.20.2 crypto profile: all three complete files, 17 cases and the original
  deadline audit pass under Node. Both Bun attempts hit the unchanged memory
  guard and leave receiving qualification unfinished. Its producer freshness
  check passes separately.
- Parser refusal controls: all four cases pass under both engines, including
  late ambient apply replacement. The unchanged two-case equation transaction
  suite passes separately under both engines; the Node producer freshness
  check also passes. All three complete parser/history receiving files report
  13 functional passes under
  Node, but the independent audit fails four unchanged 60000-ms deadlines at
  167719.120359, 148714.146195, 62934.191560 and 90153.668876 ms. Whole-file Bun
  receiving and current-batch producer/gate verification remain required.
- Guarded-runtime receiving imports: all four complete files pass 31 Node and
  31 Bun cases. The scan-cost fixture now copies its actual runtime dependency;
  all original instrumentation, assertions and deadlines remain unchanged.
  Both generator freshness entry points pass separately.
- Method owner and strict compiler selection: all ten complete receiving files
  pass 47 Node cases with the original deadline audit and 47 cases in fresh
  sequential Bun 1.4.4 processes. The actual private parser scope fixes the
  complete-owner digest mismatch without changing linker refusals. Both helpers
  use the lockfile-installed TypeScript 5.9.3, preserving explicit overrides.
  A combined Bun attempt hit the unchanged memory guard and remains a failure.
  Production matrix generation and the full gate remain unqualified.

The latest complete local gate attempt at source `308a3b861` ran for
1509.425560 seconds before the unchanged memory guard stopped and reaped all
owned descendants, peak sample 2873679872 bytes against the 3135369216-byte
container. Lint and both 259-case native suites pass. Native strict TypeScript
5.9.3 compiles 165 files with no freshness changes. All nine TypeScript behaviors
report functional passes, but regeneration exceeds its original deadline at
121353.172706 / 60000 ms. Strict parity fails, forward exhausts its bounded heap,
and reverse records an original deadline failure before interruption. Later
commands remain unrun. No green gate stamp exists; this earlier attempt does not
qualify subsequent source changes.

All seven workflows at published head
`b63dd5a337c4e17f9df51f9ce866cb73fdea7662` completed before publication of the
next batch. The [main run](https://github.com/link-assistant/router/actions/runs/42430143951)
fails; six supplemental workflows skip. Every available official log member and
every member of all nine artifact ZIPs has been read and checked for digest,
length and CRC. Forward bin 7's original log is unavailable: two authenticated
requests return 404 `BlobNotFound`. Its missing original log, artifact and
terminal cohort audit remain explicitly unavailable.

| Required stage | Complete published-head CI result |
| --- | --- |
| Lint, native Node/Bun | Pass, including 259 native cases per engine. |
| TypeScript | Fail: genuine owned-definition matrix index absent, main log lines 190403–190416. |
| Profile matrix | Cancelled at the original 60 minutes; no complete draft. The mandatory uploader fails on missing files, lines 18955–18969. |
| Owned profile matrix | Fail: original method-owner scope differs from independently captured evidence; no complete draft, lines 189561–189582. |
| Strict parity | Fail: stale account-policy source hash, 441 incomplete features, 12345 carried items, runtime parity false, lines 50910–50915. |
| Forward | Seven available bins retain 114 actual failures and 29 deadline breaches. Bin 7 is cancelled with unavailable original output. Stale original source equations, current generated artifacts, fixture imports and full-operation deadlines remain mandatory repairs. |
| Freshness | Fail: required current generated sources/inventory differ, lines 26954–27549. |
| Reverse | Cancelled at its original 15 minutes, lines 188490 and 189228. The separate complete-file coordinator repair awaits fresh CI. |
| Aggregate / Rust | Aggregate fails; Rust and release correctly skip. No Rust tool ran locally. |

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
process. Main ancestry and the complete local source diff must be checked before
publication; GitHub refuses the full PR diff with HTTP 406 (>300 files).
