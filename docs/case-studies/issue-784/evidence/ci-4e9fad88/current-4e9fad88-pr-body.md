Fixes #784

Router removes supported geolocation headers and structured search/retrieval
location fields by default from routed HTTP and native JSON WebSocket requests.
Exactly one `x-router-share-geolocation: true` header opts in for the request or
connection; Router consumes it. Account overrides cannot restore stripped data.
Prompt content, user tool schemas, search availability and existing telemetry
choices remain intact.

Reproduce by routing a supported location header or search location field without
consent. The privacy regressions check removal, explicit opt-in, account overrides,
WebSocket forwarding and all eight independently mixed Gemini field spellings.
Earlier complete Node/Bun native suites each passed 259 cases, with another 30
mixed-Gemini regression cases per engine. Matching Rust source and oracle cases
are included; their execution remains unqualified until the same-head JavaScript
gate passes.

This remains an authorized **draft CI feedback checkpoint**, not completion.
Published checkpoint: `4e9fad88f28552f9e78da53084e4dcc50fdbe3c3`.
The original all-tool/account guarantee and every required CI check remain
mandatory. Main `eb2dad1c0a18394dc1aad46413e11401e74eb502` is already an ancestor;
it was freshly fetched during this batch.

The mandatory complete local gate at source commit
`6ee1a798eba292b825cc4c61fee13c023fe65dfc` is resource-stopped during its initial
repository fingerprint after 25.415 seconds. Peak sampled total cgroup memory
is 2,867,912,704 bytes, above the unchanged 2,866,933,760-byte guard. Closed-page
advice completes but does not prevent the stop. **All seven stages are unrun;
no green stamp is written.** Later evidence/documentation commits inherit no
gate qualification. The complete receipt is retained in the case study.

The coordinated repair batch preserves complete historical and physical current
source equations for string equality, ASCII producers, production fixtures and
the owned-matches parent graph. At source commit `ce7e1df8d`, actual reverse
generation writes and independently checks all 11 then-stale outputs; later
source changes still require their own freshness checks. Existing producers refresh the compiler registration
and portable Git data together, preserving their complete predecessors. Shared
receiving uses the existing bounded metadata transport with every original
assertion, serialized/reparsed CST phase, native copy and inverse retained.
These repairs add zero measured executable application functions.

All eight original real-source fixture cases pass under Node and Bun, with
unchanged deadlines and full vectors retained. The final owned-matches graph
remains unqualified; two earlier whole-file attempts abort at the bounded Node
heap in JSON stringification. Their unsuccessful vector writer is withdrawn,
with complete failed streams and partial evidence preserved. Registration and
receiving performance observations are recorded separately from full-gate status.

A later whole owned-matches attempt also fails with optional vector logging off,
before completing a case, at the bounded heap and cgroup guard. That disproves
optional logging as a necessary cause; the exact JSON serialization call site
remains unidentified. The final production-parent case is still unreached.

After the production fixture refresh, both complete eight-case registration and
portable Git receiving files pass under both Node and Bun: 32 cases, unchanged
assertions and deadlines, with both Node deadline audits passing. Three earlier
resource-stopped attempts remain retained. A separate helper reuse draft is
withdrawn after its two complete Node files pass nine assertions but fail three
original ASCII deadlines (112.925, 346.855 and 76.933 seconds versus 60 seconds).
That withdrawn draft has no Bun qualification and establishes no speed gain.

The previous published head `4e7093eb98b2170bac2cd5fd24c0c777e6bcf4b2` has finished
its entire CI cycle. [Run 42498636979](https://github.com/link-assistant/router/actions/runs/42498636979)
has 59 terminal jobs and 25 nonpassing results; all six supplemental workflows
are terminal/skipped under the existing draft policy. The tested merge tree
equals that head. All 24 available whole failed-job logs and all 24 available
whole artifacts are retained and verified. Cancelled translation shard 3 has
no artifact, and GitHub returns HTTP 404 `BlobNotFound` for its log; complete log
collection is explicitly false. A subsequent complete workflow ZIP has 66
verified members and matches all 24 available whole failed-job logs byte for
byte, but also omits that exact shard. Its cancellation cause is unknown. The
[terminal inventory](https://github.com/link-assistant/router/blob/issue-784-1f6838f56841/docs/case-studies/issue-784/current-terminal-ci.md)
links every nonpassing job and preserves that evidence gap.

Still unfinished: the TypeScript owned-matrix sidecar, complete canonical/profile
and owned generation, semantic refusals, original forward/reverse deadlines and
strict parity. The last strict inventory has 441 gaps: 151 partial and 290
unsupported features, with only two of 443 features implemented and 12,345 carried
items. No required check is skipped or weakened. None of these code failures
requires a missing secret or human-only CI setup. No local Rust tool is invoked;
Rust CI remains gated on every required JavaScript stage for the same SHA.

The [case study](https://github.com/link-assistant/router/blob/issue-784-1f6838f56841/docs/case-studies/issue-784/README.md)
contains all requirements, primary vendor research, component choices, client
coverage, full evidence and remaining plans. The
[configuration guide](https://github.com/link-assistant/router/blob/issue-784-1f6838f56841/docs/privacy/geolocation.md)
documents supported defaults and opt-in. Evidence includes two explicitly
recorded allocation overruns and verified recovery of retired inactive archives
from immutable published Git blobs; neither incident is presented as a passing
storage check.

**Unfinished acceptance criteria:** providers still see transport IPs and may
retain security information; direct client, telemetry, OAuth and MCP traffic can
bypass Router. Cursor's private protocol and Gemini subscription modes remain
unsupported. Authenticated vendor account settings were not changed. The PR
stays draft and unmerged while these criteria or required CI checks remain unmet.
