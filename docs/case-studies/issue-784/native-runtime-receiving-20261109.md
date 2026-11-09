# Private runtime comparison receiving evidence

PR: https://github.com/link-assistant/router/pull/785

This independent draft follows published checkpoint
`1c82cbd9355724439a953ddaa7642193d03878ca`. Its CI cycle, run 42697950690,
is still in progress. The published head remains unchanged while all results
are collected. These observations do not establish complete parity or a green
JavaScript gate.

The private regeneration path now compares the fresh erased target parse
directly with the independently normalized source tree. It avoids allocating a
second normalized array tree and its JSON string. The public runtime serializer
is unchanged; the manifest still hashes exactly the same normalized source
JSON. Complete CST serialization/reparse, syntax meta serialization/reparse,
emission and fresh target parsing still occur for every regeneration. The
comparison grants no inference, ownership or executable authority.

Strict target compilation releases the private retained inference program
before starting its separate compiler phase. Consecutive regenerations can
still reuse inference after the existing complete observation checks. Release
does not alter public parser/build results or bypass fresh input checks.

## Whole-file observations

| Attempt | Result | Time | Peak sampled cgroup bytes |
| --- | --- | --- | --- |
| Node focused controls | 10/10 assertions and original deadlines pass | 47.807 s | 2,568,437,760 |
| Bun focused controls, first attempt | Nine assertions pass; dense case interrupted by unchanged memory guard | 19.576 s | 2,867,433,472 |
| Original Node receiving file | 9/9 assertions pass; four-regeneration deadline fails | 283.572 s | 2,398,777,344 |
| Bun focused controls, second attempt | 10/10 assertions pass, each below its original 60 s limit | 38.993 s | 2,496,692,224 |

Node is 20.20.2, Bun is 1.4.4, and the lockfile-installed TypeScript compiler is
5.9.3. CI uses Bun 1.4.3, so local Bun results do not replace current-head CI.
The Node focused audit is `complete-8cmtPh`; the original receiving audit is
`complete-0quOhz`. Both runners close their children and complete process-group
cleanup. No original test file, deadline, compiler bound or memory guard changed.

The original receiving file verifies strict compilation and 259 shared native
expectations against source JavaScript and compiled TypeScript under Node,
then runs the compiled fixture suite under Bun. Its four-regeneration case
takes **77,215.926321 ms**, exceeding its unchanged **60,000 ms** limit. The
independent deadline audit correctly returns failure despite all assertions
passing. The complete local gate after this draft remains unrun.

The first Bun attempt starts with substantial retained Git object pages. Before
the original receiving run, the established bounded page diagnostic advises
only closed, owned, single-link files in this worktree's Git object directory;
sampled total cgroup use changes from 1,995,444,224 to 1,393,225,728 bytes.
An earlier tracked-large-file hint changes sampled use only slightly. No file is
deleted or changed, and no active test clock is paused. These are observations,
not exact per-file accounting or a controlled performance comparison.

The focused regressions cover explicit cache release and fresh equivalent
rebuilding, public metadata equality, changed and missing inference inputs,
complete packing-boundary transport, dense aggregate refusal/retry, optional
chain boundaries, imports versus literal data, evaluation order, Unicode,
regular expressions, bigint literals and malformed runtime syntax. They verify
the changed allocation path without claiming any new executable Router function.

The complete actual regeneration diagnostic performs a fresh warmup and a
profiled warm pass: 35,116.228 ms and 16,219.327 ms respectively. Both find zero
changed or unexpected artifacts. The whole observation takes 52.292 seconds
and peaks at 2,002,784,256 sampled cgroup bytes. Its complete 7,851,423-byte CPU
profile is compressed and read back, not sampled down to selected functions.
The weighted profile includes about 2.635 seconds of garbage collection,
2.939 seconds in TypeScript emission, 2.487 seconds in TypeScript erasure and
2.518 seconds in complete CST transport. Inclusive costs overlap and are
diagnostic observations, not a performance qualification or an executable gain.

The complete closed logs, resource receipts, both Node audits, the full CPU
profile and selected source snapshots are in
`evidence/runtime-direct-receiving-20261109.tar.gz`: 54 members, 1,350,485 bytes,
SHA-256 `9c6c37490abd6a6e0eec309ba6241528fef00e031c1c110da65b773f4c51a7bb`.
Every member is read back and hashed before retiring its exact inactive raw
counterpart. Selected source snapshots do not establish historical transitive
custody. The packet records failed and interrupted attempts as such.

## Subsequent emitter allocation draft

The next draft follows local checkpoint `d00afeb47`. It shares empty hint/gap
fallbacks within each emitter call and maintains occurrence counters only for
kinds present in the gap plan. Every node of a planned kind still increments
its counter, including earlier nodes without gaps. Complete CST transport now
projects reconstructed sources and releases unused metadata before per-file
semantic work. No transport check, source reread or independent check is removed.

| Whole focused attempt | Result | Seconds | Peak sampled cgroup bytes |
| --- | --- | --- | --- |
| Node, before metadata projection | 10/10 assertions and deadlines pass | 36.011 | 1,827,811,328 |
| Node, complete draft | 10/10 assertions and deadlines pass | 34.185 | 1,726,205,952 |
| Bun, complete draft | 10/10 assertions pass below original limits | 46.957 | 2,430,672,896 |

The complete Node audits are `complete-MKYNF7` and `complete-oVTzno`; all children
close and original limits remain intact. The actual full freshness diagnostic
performs a 26,990.628 ms warmup and a 16,181.562 ms profiled pass. Both report zero
changed or unexpected artifacts. The 44.334-second observation peaks at
2,033,860,608 sampled cgroup bytes and retains its complete 7,719,288-byte CPU
profile. These observations do not demonstrate a steady-state speed improvement
or qualify the four-regeneration deadline. The unchanged original nine-case file
and full gate after this subsequent draft remain unrun. Its original receiving
deadline failure remains open, as do all remaining criteria below.

The subsequent closed evidence is retained in
`evidence/emitter-allocation-receiving-20261109.tar.gz`: 37 members, 838,709 bytes,
SHA-256 `7f13621122559af89d820aad30ec1de2af2ef6112ef54616c6a5760618179286`.
Every original member is read back and hashed before its inactive raw copy is
retired. This packet preserves the selected draft and `d00afeb47` preimages;
it makes no broader historical custody or verification claim.

## Remaining work

The receiving deadline, ClientKind's original deadline, private compiler source
admission, genuine owned/profile matrices, strict parity and complete same-head
gates remain open. Canonical production coverage remains 158/2,578 executable
functions; 2,420 are carried. Universal tool/account geolocation controls also
remain outside the implemented Router transport boundary. PR #785 stays draft
and unmerged.
