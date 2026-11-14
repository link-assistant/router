Fixes #784

Router removes supported geolocation metadata by default from routed HTTP and
native JSON WebSocket requests. The explicit
`x-router-share-geolocation: true` header opts in for that request or connection;
Router consumes the control header. Search location fields, all eight mixed
Gemini retrieval-coordinate spellings and ingress/IP headers are covered.
Account overrides cannot restore stripped metadata. Existing prompt, tool,
search and telemetry contracts are preserved.

Reproduce by forwarding a supported location header or search location field
without consent. Privacy regression cases verify removal, then preservation
with explicit consent, account overrides and WebSocket forwarding. Earlier
Node and Bun native checks each passed 259 cases; the mixed Gemini regression
adds 30 cases per engine. Matching Rust sources and oracle cases are included;
Rust execution requires the complete same-SHA JavaScript gate first.

This is an authorized **draft CI feedback checkpoint** at
`4e7093eb98b2170bac2cd5fd24c0c777e6bcf4b2`. Main
`eb2dad1c0a18394dc1aad46413e11401e74eb502` was freshly fetched and is already an
ancestor. The source tree was clean before publication. The PR remains draft
and unmerged; neither this checkpoint nor scoped passes establishes completion.

The coordinated compiler repair batch:

- Freezes private native scalar-token records without recursively walking them,
  retaining original recursive behavior for observed/customized operations.
- Relocates the actual guarded descriptor import; serializes complete historical
  ASCII selection DATA without leaking circular native ASTs.
- Preserves full SHA/byte-pinned historical fixtures in shallow checkouts,
  regenerates the full current static source fixture through its actual producer,
  and fixes receiving Git paths and private-parser imports.
- Restores registered whole proof-consumer source histories and relocates the
  complete current byte bridge for genuine native/fallback diagnostic calls.
- Preserves checked serialized/reparsed CST boundaries, full inverses, unknown
  source refusals, original assertions and unchanged deadlines. These repairs
  add zero newly executable application functions.

Recorded checks use Node 20.20.2, Bun 1.4.4 and lockfile TypeScript 5.9.3; CI's
pinned Bun 1.4.3 remains independently required.

| Complete scoped files | Result and practical limit |
| --- | --- |
| Module token layout/observers, 18 cases | Node and Bun pass. All 567 sampled production Rust sources remain unchanged. Cgroup peak increased in the paired census; no complete memory improvement is claimed. |
| Native descriptor kinds, eight cases | Node and Bun pass. |
| Current ASCII producers, three cases | Node and Bun pass, including complete source plans, historical bytes and serializable selection DATA. |
| Receiving paths/parser, 16 cases | Node passes all. Bun passes eight parser cases and four Display cases; four Display cases exceed their original five-second defaults. |
| Current proof-consumer module graph, eight cases | Node passes all, independent audit reports zero original-deadline breaches and a closed child group. Bun passes five before a memory-guard stop; whole-file Bun qualification remains unfinished. |
| Full static fixture proposal | Actual producer/review/install succeeds and preserves every historical occurrence. The whole lifecycle test is resource-stopped; no full-file qualification is claimed. |
| Whole owned-definition planner | Resource-stopped after 2,104 seconds; no generated outputs or successful matrix qualification. |
| Mandatory complete local gate | Attempted at `8255c55f78b245c8eea355ffca7e18bb765a6b2c`: resource-stopped during the initial fingerprint after 23.048 seconds at 2,867,511,296 sampled cgroup bytes. All seven stages are unrun in that attempt; no green stamp exists. This later evidence commit has no inherited gate result. |

Before this push, the **entire** previous published head `10fd7f0da` finished:
[run 42488211459](https://github.com/link-assistant/router/actions/runs/42488211459)
has 59 terminal jobs: nine successes, 19 failures, six cancellations and 25
skips. Six supplemental workflows are terminal/skipped under existing draft
policy. All 25 nonpassing job logs and full terminal metadata were collected,
read and retained before drafting this coordinated repair batch. The tested
merge tree equals the published head tree. This head requires fresh CI results.

| Required criterion | Unfinished work |
| --- | --- |
| TypeScript | Produce and independently verify the missing owned-definition matrix sidecar. |
| Strict parity | Last CI reports 441 gaps: 151 partial and 290 unsupported features; only two of 443 are implemented, with 12,345 carried items. Runtime parity remains false. |
| Canonical/profile generation | Complete actual outputs, independent review, installation and freshness within the original resource/deadline limits. |
| Forward/reverse translation | Remaining stale outputs, complete source-history compositions, genuine behavior failures and original deadlines. Focused receiving repairs do not qualify an earlier failed CI run. |
| Complete gate and Rust | Every required JavaScript stage must pass for the same published SHA before Rust starts. No local Rust tool was invoked. |

No missing secret or human-only setup action explains these code failures;
required checks remain intact. Changelog fragments use the existing release
process. GitHub's diff API returns HTTP 406 above its 300-file limit; the full
450-line local source patch for this batch and actual producer proposals were
reviewed and retained. `git diff --check` passes. Evidence custody includes full
streams, hashes, original deadlines, inactive-path checks, verified lossless
compression and explicitly recorded capacity refusals/incidents.

The [case study](https://github.com/link-assistant/router/blob/issue-784-1f6838f56841/docs/case-studies/issue-784/README.md)
contains the requirement inventory, primary vendor research, client coverage,
components, alternatives and plans. The
[configuration guide](https://github.com/link-assistant/router/blob/issue-784-1f6838f56841/docs/privacy/geolocation.md)
explains supported defaults and opt-in. The
[current checkpoint](https://github.com/link-assistant/router/blob/issue-784-1f6838f56841/docs/case-studies/issue-784/current-completed-repair-checkpoint.md)
and [completed CI inventory](https://github.com/link-assistant/router/blob/issue-784-1f6838f56841/docs/case-studies/issue-784/current-completed-ci-10fd.md)
link complete evidence and individual failing-job URLs.

**Unfinished acceptance criteria:** the literal universal tool/account guarantee
remains unmet. Providers see connection IPs and may retain security data; direct
client, telemetry, OAuth and MCP traffic can bypass Router. Cursor's private
protocol and Gemini subscription modes are unsupported. Authenticated vendor
account settings were not changed. These are unfinished requirements; the
implementation and checkpoint do not complete #784.
