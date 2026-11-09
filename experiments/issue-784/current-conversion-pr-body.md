Fixes #784

Router removes supported geolocation headers and structured search/retrieval
location fields by default from routed HTTP and native JSON WebSocket requests.
Exactly one `x-router-share-geolocation: true` header opts in for the request or
connection; Router consumes it. Account overrides cannot restore stripped data.
Prompt content, user tool schemas, search availability and existing telemetry
choices remain intact.

Reproduce by routing a supported location header or search location field without
consent. Privacy regressions cover removal, opt-in, overrides, WebSocket forwarding
and all eight independently mixed Gemini field spellings. At published `1c235248`,
lint and the complete native Node/Bun suites pass, 259 native cases per engine.
Earlier separate Gemini cohorts pass 30 cases per engine. Matching Rust source
oracles are included; execution requires every same-head JavaScript stage green.
Those results do not qualify this changed compiler snapshot.

This is an authorized **draft CI feedback checkpoint**, with failed and unrun
checks explicit. Fetched main `eb2dad1c0a18394dc1aad46413e11401e74eb502` is
included. The complete issue, all three PR comment types and child-issue list
were refreshed and read. Every criterion and required check remains mandatory.

The coordinated batch repairs demonstrated record-binding aliasing in original
numeric, standard callback/frame and unwrap bodies. Finite regressions fail
strict TypeScript before repair and pass afterward. Complete focused files retain
their original cases, compiler strictness and deadlines. Static `Result` residual
checking now proves the actual static error leaf independently of dynamic success
origins, and still refuses dynamic-to-static escapes. Its two new cases pass under
Node and Bun; the original nine-case lifetime file passes under Node.

Historical whole getter and capabilities sources now have explicit pinned fixtures
and separate current-source regressions. The complete getter file passes nine
cases under each engine. Both complete capabilities attempts hit the unchanged
memory guard and remain unqualified. The Core candidate assertion checks the
actual unchanged Schemars dispatcher and all three native bindings in both whole
sources. Syntax passes; repaired whole producer execution remains unrun after the
unchanged producer previously hit the memory guard. These changes establish
**zero measured newly executable production functions**.

Actual compiler registration captures committed source
`6de907547b18993b252aa91542f5c75bc7a420dd`: 1,824 inputs / 57,923,560 bytes,
two changed inputs and no additions/removals from the preceding snapshot.
Independent review checks every physical input; the installer independently
reproduces all seven outputs, both complete CST equations and 468 genuine Git
objects. Complete previous registries/bootstrap/fixture history remains retained.
The original concrete profile is unchanged. Current complete receiving execution
remains unqualified. See the [registration report](https://github.com/link-assistant/router/blob/issue-784-1f6838f56841/docs/case-studies/issue-784/current-residual-registration.md).

At committed source `b28c5bfe52f8cd2c1a834bf80798e062433e2f3d`, both mandatory
full local gate attempts stop during fingerprinting at the fixed
2,866,933,760-byte resource guard. They take 14.929 / 15.179 seconds and peak at
2,871,148,544 / 2,877,116,416 sampled cgroup bytes. All seven stages are unrun;
no green stamp exists. Completed-prefix advisers exit zero but fingerprint coverage
is incomplete. The second attempt first advises inactive tracked pages. No original
clock, deadline, strictness or bound is altered. Previous four complete canonical
producer families also stopped at that guard without output changes. No local Rust
tool ran. The [checkpoint report](https://github.com/link-assistant/router/blob/issue-784-1f6838f56841/docs/case-studies/issue-784/current-residual-checkpoint.md)
links full before/after evidence, failed streams, whole local review and remaining
limits. GitHub refuses the PR diff endpoint because this PR exceeds 300 files;
complete published/coordinated Git diffs and blob identities remain retained.

The entire published `1c235248e1b584875c3ec2b9c1bd2d94a859943c` CI cycle is
terminal. [Run 42536508655](https://github.com/link-assistant/router/actions/runs/42536508655)
has 59 jobs: 10 passed, 17 failed, seven cancelled and 25 skipped. All six
supplemental workflows are terminal/skipped under existing draft policy. The
tested merge tree exactly equals the published head. The
[complete failure inventory](https://github.com/link-assistant/router/blob/issue-784-1f6838f56841/docs/case-studies/issue-784/current-terminal-ci-1c235.md)
maps every nonpassing job to available original evidence. All 24 responses,
23 available complete logs, all 24 artifact ZIPs and the whole-run ZIP are retained
with full readback/hash/CRC verification. Forward shard 2 has no available log:
`BlobNotFound`, a failed exact-job retry and no whole-run member. This gap remains
explicit. No run was cancelled by this task.

Still unfinished: the TypeScript owned-matrix sidecar, complete canonical/profile/
owned generation, source equations, semantic refusals, original forward/reverse/
application deadlines, receiving qualification and strict parity. The last strict
inventory reports 441 gaps: 151 partial, 290 unsupported; only two of 443 features
are implemented and 12,345 functions are carried. No check is skipped or weakened.
No missing secret or human-only CI setup cause was established; no manual action
replaces these code failures. Rust CI remains gated until every required
JavaScript stage passes for that exact SHA. Node is 20.20.2, local Bun 1.4.4 and
lockfile TypeScript 5.9.3; CI Bun 1.4.3 requires independent qualification.

The [case study](https://github.com/link-assistant/router/blob/issue-784-1f6838f56841/docs/case-studies/issue-784/README.md)
contains the requirement inventory, primary vendor research, existing component
analysis, client coverage and remaining plans. The
[configuration guide](https://github.com/link-assistant/router/blob/issue-784-1f6838f56841/docs/privacy/geolocation.md)
documents supported defaults and explicit opt-in. Task evidence remains below
500,000,000 bytes. Verified retirement receipts preserve immutable complete
published originals; no original source/test is removed to meet that cap.

**Unfinished acceptance criteria:** providers still see transport IPs and may
retain security information; direct client, telemetry, OAuth and MCP traffic
can bypass Router. Cursor's private protocol and Gemini subscription modes
remain unsupported. Authenticated vendor account settings were not changed.
The PR stays draft and unmerged while any criterion or required check is unmet.
