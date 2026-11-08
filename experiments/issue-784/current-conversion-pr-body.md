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
complete native Node/Bun suites each passed 259 cases, with another 30 Gemini
cases per engine. Matching Rust source/oracle cases are included; execution
requires every same-head JavaScript stage to pass. Those earlier results do not
qualify the changed compiler snapshot.

This remains an authorized **draft CI feedback checkpoint**. Every acceptance
criterion and required check remains mandatory. Fetched main
`eb2dad1c0a18394dc1aad46413e11401e74eb502` is included. The complete issue,
all three PR comment types and child-issue list were refreshed and read.

The coordinated repair batch addresses three observed CI defects:

- Workflow generation now derives complete child-compiler diagnostic settings
  through its existing source equation. Node's complete 37-case control cohort
  passes. Bun reports 36 passes and an original implicit-deadline failure.
- Actual named ASCII/Unicode and runtime source producers retain complete
  named/sequential histories and regenerate their current source-origin adapters.
  Native compiler selection uses one fresh complete AST walk; a private scope
  releases that AST after producing source data. The new primitive-source CST
  domain preserves fresh serialized/reparsed checks, both fixed phases, complete
  inverses and existing public untrusted-document boundaries.
- Original `From` body checking reset the enclosing temporary-name supply and
  aliased record fields. The finite regression fails strict TypeScript before
  repair; repairing both string and primitive identity body environments makes
  the complete 46-case conversion cohort pass under Node and Bun. The Node
  independent original-deadline audit also passes. The two complete application
  parents and their original deadline failures remain unqualified.

Focused source-origin controls pass all seven cases under each engine. All 13
complete owning-producer receiving cases pass under Node. The original four-case
ASCII file remains byte-identical and passes its independent Node deadline audit:
the accepted-source case takes 49,748.538 ms under its original 60-second limit.
The corresponding whole Bun cohorts hit the unchanged resource guard and remain
unqualified. Earlier failures and complete streams remain retained. These changes
add **zero measured executable production functions**. See the
[source-origin report](https://github.com/link-assistant/router/blob/issue-784-1f6838f56841/docs/case-studies/issue-784/current-source-origin-adoption.md)
and [binding regression](https://github.com/link-assistant/router/blob/issue-784-1f6838f56841/docs/case-studies/issue-784/current-conversion-record-regression.md).

Actual compiler registration is regenerated from committed source `58c6c0b43`:
1,824 inputs / 57,920,058 bytes, six additions, 14 changed inputs and no removals.
The installer independently reproduces all seven proposal outputs and refreshes
468 genuine portable Git objects. Complete previous registry/bootstrap/fixture
history is retained; the original concrete profile is unchanged. Both complete
receiving cohorts hit the fixed memory guard: Node after one reported pass in
30.276 seconds and Bun after one in 11.277 seconds. Their remaining cases stay
unqualified. The [registration report](https://github.com/link-assistant/router/blob/issue-784-1f6838f56841/docs/case-studies/issue-784/current-conversion-registration.md)
retains the actual install and every failed attempt.

At committed source `358849070`, all four full canonical/profile production
commands hit the unchanged memory guard without changing generated outputs.
The mandatory complete local gate then stops during fingerprinting after 14.519
seconds, peak sampled cgroup memory 2,872,737,792 bytes against the fixed
2,866,933,760-byte guard. All seven stages are unrun; no green stamp exists.
The separate page adviser fails with a same-user `/proc` permission error; its
failure is retained. Node 20 is on PATH and the gate inherits 512 MiB old-space.
No command is filtered, test clock paused, deadline raised or strictness reduced.
The [checkpoint report](https://github.com/link-assistant/router/blob/issue-784-1f6838f56841/docs/case-studies/issue-784/current-conversion-checkpoint.md)
retains complete production/gate attempts and full local PR diff. GitHub's PR
diff endpoint returns HTTP 406 because the PR exceeds its 300-file limit.

The entire published `764222b6e6d4f0ce1efb0341396cfb6a87661e85` CI cycle is
terminal. [Run 42529550250](https://github.com/link-assistant/router/actions/runs/42529550250)
has 59 jobs: 10 passed, 17 failed, seven cancelled and 25 skipped. All six
supplemental workflows are terminal/skipped under the existing draft policy.
The tested merge tree exactly equals that published head. The
[full failure inventory](https://github.com/link-assistant/router/blob/issue-784-1f6838f56841/docs/case-studies/issue-784/current-terminal-ci-764.md)
maps every failure/cancellation to exact available evidence. All 24 nonpassing
responses, 23 available complete logs, all 24 artifact ZIPs (431 members) and
the whole-run ZIP (249 members) are retained and fully hash/CRC verified.
Forward shard 7's log is unavailable (`BlobNotFound`, CLI `log not found` and
no matching whole-run member). No run was cancelled by this task.

Still unfinished: missing TypeScript owned-matrix sidecar, complete canonical,
profile and owned outputs, source equations, semantic refusals, original
application/forward/reverse deadlines and strict parity. The last strict
inventory has 441 gaps: 151 partial, 290 unsupported; only two of 443 features
are implemented and 12,345 functions are carried. No required code check is
skipped or weakened. No missing secret or human-only CI setup cause has been
established. No manual action replaces these code failures. No local Rust tool
runs; Rust CI requires every JavaScript stage to pass for that same SHA.
Node is 20.20.2, local Bun 1.4.4 and lockfile TypeScript 5.9.3; CI's Bun 1.4.3
requires independent qualification.

The [case study](https://github.com/link-assistant/router/blob/issue-784-1f6838f56841/docs/case-studies/issue-784/README.md)
contains the requirement inventory, primary vendor research, existing component
analysis, client coverage, evidence and remaining plans. The
[configuration guide](https://github.com/link-assistant/router/blob/issue-784-1f6838f56841/docs/privacy/geolocation.md)
documents supported defaults and explicit opt-in. Task evidence stays below
500,000,000 bytes; prior overruns and verified retirement of inactive published
copies remain recorded with immutable recovery references.

**Unfinished acceptance criteria:** providers still see transport IPs and may
retain security information; direct client, telemetry, OAuth and MCP traffic
can bypass Router. Cursor's private protocol and Gemini subscription modes
remain unsupported. Authenticated vendor account settings were not changed.
The PR stays draft and unmerged while any criterion or required check is unmet.
