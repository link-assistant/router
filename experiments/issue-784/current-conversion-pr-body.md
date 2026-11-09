Fixes #784

Router removes supported geolocation headers and structured search/retrieval
location fields by default from routed HTTP and JSON WebSocket requests.
Exactly one `x-router-share-geolocation: true` header opts in for the request or
connection; Router consumes it. Account overrides cannot restore stripped data.
Prompts, user tool schemas, search availability and telemetry choices are preserved.

Reproduce by routing a supported location header or structured search location
without consent. Automated privacy regressions cover default removal, opt-in,
overrides, WebSocket forwarding and all eight independently mixed Gemini field
spellings. Both complete native suites pass 259 cases per engine at local source
`e15197054`. Matching Rust source oracles are included but remain unrun: every
required JavaScript stage must first pass for the same SHA.

This is an authorized **draft CI feedback checkpoint**, with incomplete acceptance
and failed/unrun checks explicit. Latest fetched main
`eb2dad1c0a18394dc1aad46413e11401e74eb502` is included. The complete issue,
issue comments, all three PR comment types and child-issue list were refreshed
and read. No required sub-issue or new human feedback was found.

The coordinated source batch repairs complete static-consumer comparisons while
preserving frozen historical sources and all original checks. Both complete
10-case files pass under Node and Bun; the independent Node deadline audit passes.
The actual original root facade context is now supplied explicitly to four Option
receiving cases. Their first three changed cases pass, but both whole Node files
and Bun remain failed; subscription normalization and later cases are unqualified.

A final source layer composes the complete static `Result` residual checker from
its full original. Both fixed CST phases are serialized/reparsed, detached native
ASTs and bindings are checked with lockfile TypeScript 5.9.3, and the complete
inverse is verified. The new whole residual file passes in Node and Bun. Fresh
three-source batch equivalence passes in Node and reaches the memory guard in
Bun. Larger whole lifetime attempts remain failed; repaired core-vector execution
is unrun. These changes measure **zero newly executable production functions**.

The actual existing compiler producer captures committed source
`5050cb0091ebde984cf79b9914090646ffde57c8`: 1,826 complete inputs / 57,954,229
bytes, two changes and two additions, with no input removed. Independent review
and fresh regeneration reproduce all seven outputs, complete CST equations and
469 genuine Git objects. Original registries, bootstrap sources and the concrete
profile are preserved. Both complete receiving attempts hit the unchanged memory
guard and remain unqualified. See the [source composition](https://github.com/link-assistant/router/blob/issue-784-1f6838f56841/docs/case-studies/issue-784/current-static-result-residual-source.md)
and [registration evidence](https://github.com/link-assistant/router/blob/issue-784-1f6838f56841/docs/case-studies/issue-784/current-composed-registration.md).

The mandatory complete local gate at `e15197054` uses a 128 MiB parent heap and
corrected 512 MiB child heaps. It fingerprints all 49,423 paths / 1,861,774,251
bytes and passes lint, both 259-case native suites, nine TypeScript deadline
controls and the ordinary package TypeScript command. The unchanged cgroup guard
stops the subsequent native TypeScript check after 365.488 seconds, at a sampled
peak of 2,884,665,344 bytes. Later TypeScript, parity, forward and reverse stages
are unrun. No green stamp exists. The [complete report and packet](https://github.com/link-assistant/router/blob/issue-784-1f6838f56841/docs/case-studies/issue-784/current-final-composed-gate.md)
retain every complete stream, receipt and completed deadline output. Previous
attempts with the incorrect inherited child heap remain separately recorded.
No local Rust tool ran; no deadline, bound, test body or strictness was relaxed.

The entire published `910e8dadfbf3f92490f2db19ed47c39d98af7077` CI cycle is
terminal. [Run 42543805504](https://github.com/link-assistant/router/actions/runs/42543805504)
has 59 jobs: 12 passed, 15 failed, seven cancelled and 25 skipped. All six
supplemental workflows are terminal; the tested merge tree equals the published
head. The [complete failure inventory](https://github.com/link-assistant/router/blob/issue-784-1f6838f56841/docs/case-studies/issue-784/current-910e8-ci-review.md)
maps all 22 nonpassing responses to 21 available complete logs, all 24 artifact
ZIPs and the fully verified 186-member whole-run ZIP. Forward shard 4 has no
available log: both endpoint attempts return `BlobNotFound`, and the exact forward
job is absent from the whole-run archive. That diagnostic gap stays explicit.
No running workflow was cancelled by this task.

Still unfinished: the missing TypeScript owned-matrix sidecar, complete canonical,
profile and owned generation, actual geolocation source inventory, remaining
source equations and semantic refusals, original forward/reverse/application
deadlines, receiving qualification and strict parity. The last strict check
reports 441 gaps: 151 partial, 290 unsupported, two of 443 implemented features
and 12,345 carried Rust functions. Main's failures remain mandatory here. No
missing-secret or human-only setup cause explains them; no manual action replaces
these code failures. Rust CI remains gated on all exact-head JavaScript stages.

The [case study](https://github.com/link-assistant/router/blob/issue-784-1f6838f56841/docs/case-studies/issue-784/README.md)
contains every requirement, primary vendor research, existing component analysis,
client coverage and plans. The [configuration guide](https://github.com/link-assistant/router/blob/issue-784-1f6838f56841/docs/privacy/geolocation.md)
documents supported defaults and opt-in. Task evidence stays below 500,000,000
bytes; inactive duplicates are retired only after complete verified retention or
immutable published-blob comparison, with exact reclaimed-byte receipts.

**Unfinished acceptance:** providers still see transport IPs and may retain
security information. Direct client, telemetry, OAuth and MCP traffic can bypass
Router. Cursor's private protocol and Gemini subscription modes remain unsupported.
Authenticated vendor account settings were not changed. Node is 20.20.2, local
Bun 1.4.4 and TypeScript 5.9.3; CI Bun 1.4.3 needs independent qualification.
The PR stays draft and unmerged while any acceptance criterion or check is unmet.
