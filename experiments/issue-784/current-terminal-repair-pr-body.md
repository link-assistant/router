Fixes #784

Router removes supported geolocation headers and structured search/retrieval
location fields by default from routed HTTP and native JSON WebSocket requests.
Exactly one `x-router-share-geolocation: true` header opts in for the request or
connection; Router consumes it. Account overrides cannot restore stripped data.
Prompt content, user tool schemas, search availability and existing telemetry
choices remain intact.

Reproduce by routing a supported location header or search location field without
consent. Privacy regressions cover removal, opt-in, account overrides, WebSocket
forwarding and all eight independently mixed Gemini field spellings. Earlier
complete native Node/Bun suites each passed 259 cases, with another 30 mixed
Gemini cases per engine. Matching Rust source and oracle cases are included;
execution remains unqualified until the same-head JavaScript gate passes.

This remains an authorized **draft CI feedback checkpoint**, not completion.
Every original acceptance criterion and every required CI check remains mandatory.
Freshly fetched main `eb2dad1c0a18394dc1aad46413e11401e74eb502` is an ancestor.

The current repair batch preserves the actual named Unicode host producer,
native unit binding results, all six facade history layers, preflight import
positions and logical/physical Rust path joins. Actual producers regenerate the
receiving outputs and current compiler registration, preserving full original
archives, source equations, checked CST phases and inverses. A portable metadata
regression exercises genuine pinned Git objects in a checkout without HEAD.
No source hash was manually repinned. Newly executable production functions: zero.

Focused complete-file results, with original assertions and deadlines:

- Named unit/Unicode receiving: ten Node and ten Bun cases pass.
- Unicode facade/text receiving: 19 Node cases pass; seven facade Bun cases pass.
  The combined Bun attempt fails and stops at the memory guard; text qualification
  remains unfinished, with every failed and unrun case retained.
- Preflight/path receiving: 13 Node cases pass. Bun stops after eight passes;
  its remaining cases stay unqualified.
- Current compiler registration/portable Git receiving: 16 Node and 16 Bun cases
  pass. The independent Node deadline audit passes. Installed TypeScript is 5.9.3,
  Node is 20.20.2 and local Bun is 1.4.4; CI's Bun 1.4.3 remains independently tested.

The mandatory complete local JavaScript gate at source `af4b03fd1` stops during
its initial fingerprint after 16.521 seconds. Peak sampled total cgroup memory is
2,880,176,128 bytes versus the unchanged 2,866,933,760-byte guard. Bounded closed
file-cache advice does not prevent the stop. **All seven stages are unrun and no
green stamp is written.** No test clock is paused or deadline raised. Later
evidence/documentation commits inherit no gate qualification. The
[checkpoint record](https://github.com/link-assistant/router/blob/issue-784-1f6838f56841/docs/case-studies/issue-784/current-unicode-checkpoint.md)
links every focused result and the complete failed gate attempt.

The entire published `4e9fad88f28552f9e78da53084e4dcc50fdbe3c3` CI cycle is
terminal. [Run 42512128521](https://github.com/link-assistant/router/actions/runs/42512128521)
has 59 terminal jobs: 11 successful, 16 failed, seven cancelled and 25 skipped.
All six supplemental workflows are terminal/skipped under the existing draft
policy. The tested merge tree equals that head. Every one of the 23 nonpassing
whole job logs and all 25 complete artifacts, including 438 members, are retained
and independently verified. The
[complete inventory](https://github.com/link-assistant/router/blob/issue-784-1f6838f56841/docs/case-studies/issue-784/current-4e9fad88-ci.md)
links every failure and full original container. Matrix cancellations after
roughly 60 minutes do not establish their cause.

The whole owned-matches receiving file remains unqualified after bounded heap
and memory-guard failures. Its original test includes an always-on JSON writer
in `finally`; an earlier label suggesting optional logging was off was incorrect.
Complete original evidence and its correction are retained. The exact failing
JSON call site remains unidentified. A separate finite stage diagnostic passes
but does not execute or qualify the original whole-file workload.

Still unfinished: the TypeScript owned-matrix sidecar, complete canonical/profile
and owned generation, semantic refusals, original forward/reverse deadlines and
strict parity. The last strict inventory has 441 gaps: 151 partial and 290
unsupported features, with only two of 443 features implemented and 12,345 carried
items. No required check is skipped or weakened. No missing secret or human-only
CI setup cause is established; no manual CI action is substituted for these code
failures. No local Rust tool is invoked. Rust CI remains gated on every required
JavaScript stage passing for the same SHA.

The [case study](https://github.com/link-assistant/router/blob/issue-784-1f6838f56841/docs/case-studies/issue-784/README.md)
contains the full requirement inventory, primary vendor research, component
choices, client coverage, evidence and remaining plans. The
[configuration guide](https://github.com/link-assistant/router/blob/issue-784-1f6838f56841/docs/privacy/geolocation.md)
documents supported defaults and opt-in. All storage overruns and subsequent
verified recovery of inactive evidence archives remain explicitly recorded.

**Unfinished acceptance criteria:** providers still see transport IPs and may
retain security information; direct client, telemetry, OAuth and MCP traffic can
bypass Router. Cursor's private protocol and Gemini subscription modes remain
unsupported. Authenticated vendor account settings were not changed. The PR
stays draft and unmerged while any criterion or required CI check remains unmet.
