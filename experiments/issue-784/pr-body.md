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
- The complete published-head [CI cycle](https://github.com/link-assistant/router/actions/runs/42318632426)
  at `1e6e0b36a9acb13cc7b829d7b6e3455e9a4b7c70` finished failure at
  2026-11-07 02:31:19 UTC. Lint and both native suites passed; TypeScript,
  strict parity and profiles failed, and both compiler cohorts reached their
  original CI limits. Complete logs and all artifacts are preserved. This
  cycle predates the two restart source commits. **No Rust tool ran locally;
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
