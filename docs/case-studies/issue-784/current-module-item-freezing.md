# Private module item freezing

This local source batch follows published checkpoint `10fd7f0da` in
[PR #785](https://github.com/link-assistant/router/pull/785). Its full CI cycle
completed with failures at 15:17:27 UTC on 2026-11-08. All 25 failed/cancelled
job logs have been collected. The focused results below do not qualify that
published head or the later complete-generation attempt.

The earlier stopped whole-production allocation diagnostic attributed about
139.9 MB of sampled live allocations to the source-module freeze closure. That
was an estimate, not a leak proof or qualified generation result. The complete
new 567-file production-input samples retain their original profiles and source
census in [the evidence containers](evidence/module-item-freeze/).

The actual module-token producer now composes a native-selected private item
freeze rule. Fresh tokens have four scalar fields; item fields outside their
token array are scalar. Under the existing qualified native operations, the
rule freezes those records directly without allocating an `Object.values`
array for each token. It preserves the original freeze position and rechecks
operations there. Changed hooks retain the complete original recursive route.
Source identity, token shape/order, bounds, configuration and public evidence
are unchanged. There is no cross-invocation cache or added runtime dependency.

The producer preserves the pinned complete original, language/repository CST
serialization and reparsing, complete inverses, and fresh installed TypeScript
5.9.3 native binding/grammar checks. Those checks do not constitute strict
TypeScript qualification or grant semantic, ownership or runtime authority.

Verification retains every attempt:

- The unmodified baseline passed both existing whole files: 17 Node cases,
  20.786 seconds, including all 567 tracked Router Rust files.
- The first draft passed the existing 17 cases, but a new late-hash observer
  regression failed: freezing earlier omitted original token-freeze events.
  Its complete source proposal and failing log remain preserved. The draft was
  withdrawn using its exact complete-source inverse before the producer changed.
- The corrected draft keeps the original freeze position. Its first 18-case
  run passed the original 17 and the freeze/values comparisons; the new test's
  self-restoring-hook assertion incorrectly required observing `pub` after the
  hook had already restored on `mod`. That assertion was corrected to require
  an actual token observation. Inputs, comparisons and deadlines remain whole.
- The final complete three-file run passed all 18 Node cases in 20.204 seconds.
  Its audited terminal record reports zero deadline breaches and a closed child
  process group. Bun 1.4.4 passed the same 18 cases in 16.31 seconds. The CI-pinned
  Bun 1.4.3 result remains unqualified for this local source batch.

One allocation observation per version used exactly the same 567 complete
production files and produced an identical full result census
`6d34d546442026e8675789ffe5e99d307bf712cfead63129dd90b460d139a784`.
Sampling includes collected allocations at a 16 KiB interval:

| Observation | Before | Corrected draft |
| --- | ---: | ---: |
| Recursive source-view freeze sampled allocation | 118,504,216 B | 9,641,832 B |
| All sampled allocation | 1,352,422,984 B | 1,263,626,040 B |
| Elapsed time | 5,421.790 ms | 4,440.300 ms |
| Peak sampled total cgroup use | 1,743,257,600 B | 1,777,729,536 B |

The sampled container peak increased slightly. These observations support
reduced transient allocation work; they do not establish lower retained memory,
a repeatable speedup or whole-production generation within the resource limit.
No observer stopped a final focused check. Newly executable application
functions: **zero**. The actual owned matrix/sidecars, original full-generation
deadlines, freshness, strict parity, complete local gate and current-head CI
remain unfinished. No Rust tool was invoked.

The subsequent complete owned planner stopped after 2,104.327 seconds when
sampled total cgroup use reached 2,870,996,992 bytes, above the observer's
2,866,933,760-byte guard. All six owned processes closed; no output was applied.
The original shell pipeline terminated Node and gzip together, leaving an empty
progress file. The [complete stop packet](evidence/current-owned-freeze-whole-plan-stop.json.gz)
retains every observed original byte, command and resource receipt and explicitly
records that no per-stage progress or generation result can be recovered.
The launcher has since been changed to the existing streaming Python capture
helper with signal forwarding. That correction is not runtime-qualified; the
unchanged whole planner was not retried. No speed or full-memory qualification
can be inferred from this stopped attempt.

Two explicit cleanup batches losslessly compressed 25 inactive task observations,
reclaiming 2,513,569 logical bytes and 2,519,040 allocated bytes. Every complete
compressed original and readback receipt is retained in the review packet. Four
closed profile/source containers moved to permanent evidence by rename, avoiding
duplicate storage. No source input, generated artifact, foreign or active path
was removed.
