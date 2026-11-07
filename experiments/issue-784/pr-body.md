Fixes #784

Router forwarded location headers such as `CF-IPCountry: GB` and optional
search-location fields to providers. This draft removes supported explicit
location metadata by default across inference HTTP, native replay and JSON
WebSockets. Supplying exactly one `x-router-share-geolocation: true` header
permits the caller's metadata for that request or WebSocket connection; Router
consumes the control header. Prompts, tool schemas, search functionality and
existing explicit telemetry choices are preserved.

JavaScript implements the policy first, with matching Rust source, shared
fixtures, bounded fragmented-WebSocket inspection and generated native
TypeScript. Source review also guards static account header overrides against
restoring unconsented location or ingress IP headers. Two additional reproducing
assertions cover `x-original-forwarded-for` and configured Cloudflare IP fields.
Historical compiler regressions now use authenticated original source inputs,
retaining their fixed censuses, assertions, strict targets and deadlines while
current-source generation and parity checks remain mandatory.

Reproduction: send a native inference request through Router with
`CF-IPCountry: GB`, `X-Vercel-IP-City: London` or a supported web-search tool's
`user_location`, then inspect a synthetic upstream. Before the change these
fields were forwarded. Complete geolocation cases in
`parity/fixtures/server/geolocation.test.mjs` and
`geolocation-websocket.test.mjs` verify default removal, explicit sharing,
invalid/duplicate consent, body wrappers, byte replay, and actual fragmented
localhost WebSockets through the native-server suite.

Validation so far:

- Complete native suites: **250/250 Node** and **250/250 Bun**. Workflow-policy
  controls: **31/31**. Both strict API checks pass with lockfile TypeScript 5.9.3.
- Final-source native TypeScript is fresh and all 165 files compile strictly.
  All 9 receiving cases report TAP passes, with 250 matching JavaScript/compiled
  TypeScript Node expectations and the compiled Bun suite passing. Its independent
  deadline audit still **fails**: regeneration took 168908.191799 ms against the
  unchanged 60000 ms limit. These checks belong to source head `60b4f53bd`.
- Strict parity at that source head **fails** with 441 draft gaps, a stale
  account-policy source hash and 12345 carried Rust items (`runtimeParity: false`).
  Final Rust-only commit `df1420d2a` additionally mirrors JavaScript's existing
  `x-forwarded-` prefix refusal; its regression source remains unrun.
- Existing producer generated native TypeScript. The complete local gate at
  `6f36a43f7eacf73a519c9ca2437cee9d3dc10f77` was attempted and **failed**:
  workflow evidence budget (subsequently repaired), TypeScript deadline audit,
  strict parity (441 draft gaps and stale inventory), forward heap limit and
  reverse deadlines/heap/historical inputs (input regressions repaired).
- Complete affected Node compiler files: 51 pass, 2 original-deadline
  cancellations, 4 independent deadline breaches; **failed qualification**.
  The complete affected Bun files have 52 passes and one original 5000 ms
  oracle-loading timeout. Both engines' overall qualifications **failed**.
- The entire initial-head CI cycle
  [42303967922](https://github.com/link-assistant/router/actions/runs/42303967922)
  failed TypeScript (missing neutral outputs), parity, profile heap limit and
  both compiler cohort deadlines. These are **initial-head** results, not
  qualification of this implementation. All failures and full logs were collected.
- **No Rust tool ran locally. Rust tests are unrun. No green final-source gate
  or final-source CI qualification is claimed.** Same-SHA JavaScript-before-Rust
  requirements remain intact.

The [case study](https://github.com/link-assistant/router/blob/issue-784-1f6838f56841/docs/case-studies/issue-784/README.md)
contains the complete requirements inventory, original GitHub data, client
matrix, primary-source research, alternatives and unresolved scope. The
[verification record](https://github.com/link-assistant/router/blob/issue-784-1f6838f56841/docs/case-studies/issue-784/verification.md)
preserves full compressed evidence, exact SHAs, timestamps and failure lines.

This remains **draft and unmerged**. The literal all-tool guarantee is unmet:
transport IPs remain visible, vendors retain mandatory security location
inference, account privacy controls need the respective authenticated accounts,
and direct client/telemetry/OAuth/MCP traffic can bypass Router. Cursor's private
protocol and Gemini subscription modes remain unsupported. Removing optional
metadata does not disable IP inference or establish full translation/parity.
