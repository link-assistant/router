Fixes #784

Router previously forwarded location headers and optional search coordinates to
providers. This draft removes supported explicit geolocation metadata by default
from routed inference HTTP, native replay and JSON WebSocket messages. Exactly
one `x-router-share-geolocation: true` header opts in for a request or WebSocket
connection. Router consumes that control header and preserves prompts, tool
schemas, search availability and existing telemetry choices.

The JavaScript policy has matching Rust source, shared fixtures and generated
native TypeScript. Account header overrides cannot restore unconsented location
or ingress IP headers. Gemini retrieval coordinates cover all eight independent
ProtoJSON field-spelling combinations; six mixed combinations leaked before the
restart fix. Existing bounded decoders and WebSocket inspection are reused, with
no new dependency. Historical compiler fixtures retain authenticated original
inputs, assertions, strictness and deadlines. The current-source fixture was
regenerated through its unchanged producer for the PR's two new Rust files;
both historical source universes remain byte-identical.

The refreshed fixture exposed the exporter's unchanged 4 MiB per-file limit.
The repair factors repeated Git blob identifiers through the existing source
dictionary, retains old archive support and refusal checks, and regenerates
the complete fixture with maximum gzip compression. The 4,134,635-byte archive
retains its exact logical content hash and all historical/current source bytes.
No test deadline, resource bound or parity status was relaxed.

Reproduce by sending a native inference request with `CF-IPCountry: GB`,
`X-Vercel-IP-City: London`, supported search `user_location`, or a mixed-spelling
Gemini retrieval coordinate and inspecting a synthetic upstream. The complete
`geolocation.test.mjs` and `geolocation-websocket.test.mjs` files verify removal,
opt-in, repeated/invalid consent, preserved application content and fragmented
WebSocket forwarding. Node and Bun each pass all **30 focused cases**; the full
native suites each pass **259 cases**.

Validation remains incomplete:

- The complete local gate at `08e09f884546ecf373dfa2997f7d0dd906a0cb1c`
  attempted all seven groups and **failed four**. Lint and both native suites
  passed. Strict API checks, generation freshness, strict compilation of 165
  native TypeScript files and all nine receiving TAP cases passed, but the
  independent audit failed: regeneration took 152128.545269 ms against the
  original 60000 ms limit. Lockfile TypeScript is 5.9.3.
- All 121 parity acceptance cases passed. Strict parity failed with **441 draft
  gaps**, a stale account-policy hash and **12345 carried Rust items**.
  Forward translation was stopped before its coordinator and two workers
  exhausted the 2.92 GiB container. Reverse translation reached its unchanged
  900000 ms deadline after case 76, with three explicit case timeouts and two
  further independent deadline breaches. Later commands in these groups were
  unrun. No deadline, assertion or parity status was relaxed.
- Both complete source-fixture receiving files at `b852b955c68d419ee2a7e2fc9f87a1d47deacd13`
  reported **16 TAP passes** under Node, but their independent audit **failed**
  three original 60000 ms deadlines (87606.702682, 191174.753546 and
  85549.779081 ms). The complete associated-original-text file passed **8/8**
  under Bun. A complete Bun lifecycle attempt failed its original first-case
  deadline and was then stopped at 2888380416 sampled total cgroup bytes before
  exhausting the container; later cases remain unqualified. These receiving
  checks do not replace the failed full gate or establish executable parity.
- The complete published-head [CI cycle](https://github.com/link-assistant/router/actions/runs/42330245583)
  at `7586d14b1331823be35a1289ad01c49e6018ffa9` finished failure at
  2026-11-07 03:38:58 UTC. Lint and both native suites (259 cases each) passed.
  Strict API/native/translator TypeScript checks and all receiving deadline
  checks passed, then the missing neutral profile failed the TypeScript stage.
  Strict parity and profile generation failed; both compiler cohorts reached
  their original CI limits. Complete logs and all artifacts are preserved.
  This cycle exposed the fixture export failure repaired above.
- At `b913882ab538e0ffda77ff1b6a1171a53228ca59`, all five complete export and
  receiving files reported **33/34 Node TAP passes**. The real producer child
  hit its unchanged 20000 ms deadline; the independent audit also failed a
  65319.319072 ms case against its original 60000 ms deadline. The archive-budget
  regression, full export/layout files and five new transport cases passed.
  Bun passed 23 cases in the four-file attempt, including complete export,
  layout and transport files, before the owned guard stopped it at 2869792768
  sampled total cgroup bytes. Later codec cases remain unqualified. A new
  complete local gate is unrun; unchanged resource-stopped workloads were not
  repeated. New published-head CI remains unqualified at this source snapshot.
  **No Rust tool ran locally;
  Rust remains unrun and gated by JavaScript failures.** No green full gate or
  Rust qualification is claimed.

The [case study](https://github.com/link-assistant/router/blob/issue-784-1f6838f56841/docs/case-studies/issue-784/README.md)
contains all requirements, GitHub source data, the client matrix, primary-source
research, alternatives and remaining obligations. The
[verification record](https://github.com/link-assistant/router/blob/issue-784-1f6838f56841/docs/case-studies/issue-784/verification.md)
preserves complete compressed logs and exact tested SHAs. The
[configuration guide](https://github.com/link-assistant/router/blob/issue-784-1f6838f56841/docs/privacy/geolocation.md)
shows actual Codex and Claude Code defaults and opt-in settings. Changelog
fragments use the repository's automated version/release process.

This PR stays **draft and unmerged**. The literal all-tool guarantee remains
unmet: connection IPs are visible, vendors retain mandatory security location
inference, account privacy controls require the respective authenticated
accounts, and direct client, telemetry, OAuth or MCP traffic can bypass Router.
Cursor's private protocol and Gemini subscription modes remain unsupported.
Removing optional metadata does not establish full translation or parity.
