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
Every acceptance criterion and required CI check remains mandatory. Fetched main
`eb2dad1c0a18394dc1aad46413e11401e74eb502` is an ancestor.

The coordinated CI repair batch preserves complete source history through
actual upstream generators and regenerated outputs. It authenticates literal
privacy and binder histories, keeps genuine logical/physical serde child inputs,
uses one complete selected-Git census, and tests the actual standalone tuple-core
facade. Current ASCII composition refuses stale predecessors immediately after
authenticating the whole archive. Separate sequential source transactions retain
the original checked CST phases, documents, inverses and final input checks.
Original public transactions remain unchanged. Failure-only diagnostics retain
complete strict TypeScript child output rather than truncated TAP exceptions.
These repairs add **zero measured executable production functions**.

Focused complete-file results, retaining original deadlines and failures:

- Selected Git: five Node and five Bun cases pass; actual write/check pass.
- Binder history: eight cases per engine pass. Literal privacy: 12 per engine.
- Serde child inputs: six per engine pass. Actual tuple-core fixture: eight per
  engine pass, retaining all 27 original library refusals and missing-facade refusal.
- Complete compiler-failure diagnostics: three per engine pass; all 14 workflow
  structural checks pass. The original large Qwen/ActivityPub cases are unrun in
  this batch and their underlying failures remain unresolved.
- Sequential source adapters: nine cases per engine pass. Actual ASCII producer
  receiving: three per engine pass. Actual runtime generator receiving: one per
  engine passes. The separate preflight regression passes in Node and with Bun
  supervising its actual Node builtin observer. The original four-case ASCII
  file remains byte-identical. Its complete accepted-source deadline is still
  unfinished; earlier complete attempts exceed 60 seconds and final generated
  attempts stop at the unchanged memory guard.

Current compiler registration is regenerated from committed source `fa86a6d0d`
using the actual producer, independently reviewed complete proposals and the
actual installer: 1,818 inputs / 57,810,256 bytes and 468 genuine portable Git
objects. The complete prior registry/bootstrap/fixture history is preserved;
the original concrete profile is unchanged. Both complete receiving attempts
stop at the unchanged memory guard: Node after four cases in 74.289 seconds and
Bun after one in 12.803 seconds. Their remaining cases stay unqualified. The
[registration record](https://github.com/link-assistant/router/blob/issue-784-1f6838f56841/docs/case-studies/issue-784/current-ascii-registration.md)
retains the actual install and every failed attempt.

The current mandatory complete gate at source `283143a7c` stops during its
initial fingerprint after 22.965 seconds, peak sampled cgroup memory
2,871,259,136 bytes against the unchanged 2,866,933,760-byte guard. It uses Node
20 on PATH and an inherited 512 MiB heap. No stage starts: all seven stages are
unrun and no green stamp exists. No test clock is paused, command filtered,
deadline raised or strictness reduced. The
[complete gate record](https://github.com/link-assistant/router/blob/issue-784-1f6838f56841/docs/case-studies/issue-784/current-ascii-checkpoint-gate.md)
retains the complete stream, guard and bounded closed-page advice. A preceding
snapshot's lint/native successes do not qualify this changed source snapshot.

The entire published `567e1dd0b072a2bfd736a9025ba245a630aaff7d` CI cycle is
terminal. [Run 42518964289](https://github.com/link-assistant/router/actions/runs/42518964289)
has 59 terminal jobs: nine successful, 18 failed, seven cancelled and 25 skipped.
All six supplemental workflows are terminal/skipped under the existing draft
policy. Its tested merge tree equals that published head. The
[complete custody record](https://github.com/link-assistant/router/blob/issue-784-1f6838f56841/docs/case-studies/issue-784/current-terminal-ci-567.md)
retains all 24 available nonpassing whole job logs, all 25 original responses,
24 complete artifact ZIPs with 431 members and the whole-run ZIP with 216 members.
Shard 5's individual log is unavailable (`BlobNotFound` and `log not found`);
the whole-run ZIP has no corresponding member. Its exact leaf failure remains
unobserved. No run was cancelled by this task.

Still unfinished: the TypeScript owned-matrix sidecar, complete canonical/profile
and owned generation, semantic refusals, original forward/reverse deadlines and
strict parity. The last strict inventory has 441 gaps: 151 partial and 290
unsupported features, with only two of 443 features implemented and 12,345 carried
items. No required check is skipped or weakened. No missing secret or human-only
CI setup cause is established; no manual CI action replaces these code failures.
No local Rust tool runs. Rust CI remains gated on every required JavaScript
stage passing for the same SHA. Node is 20.20.2, local Bun 1.4.4 and lockfile
TypeScript 5.9.3; CI's Bun 1.4.3 requires its own qualification.

The [ASCII repair record](https://github.com/link-assistant/router/blob/issue-784-1f6838f56841/docs/case-studies/issue-784/current-ascii-sequential.md)
links complete focused sources, failed/passed streams, resource receipts and
independent deadline audits. The
[case study](https://github.com/link-assistant/router/blob/issue-784-1f6838f56841/docs/case-studies/issue-784/README.md)
contains the full requirement inventory, primary vendor research, component
choices, client coverage, evidence and remaining plans. The
[configuration guide](https://github.com/link-assistant/router/blob/issue-784-1f6838f56841/docs/privacy/geolocation.md)
documents supported defaults and opt-in. Prior storage overruns and verified
recovery of inactive published evidence remain explicitly recorded.

**Unfinished acceptance criteria:** providers still see transport IPs and may
retain security information; direct client, telemetry, OAuth and MCP traffic can
bypass Router. Cursor's private protocol and Gemini subscription modes remain
unsupported. Authenticated vendor account settings were not changed. The PR
stays draft and unmerged while any criterion or required CI check remains unmet.
