# Complete feedback cycle for 679bcd027

The [required CI run](https://github.com/link-assistant/router/actions/runs/42732676712)
tested published head `679bcd0278a7cb045349507d6bf1e8234de19cdc` and synthetic
merge `101ce6ada2fbb1a3cdbe4945809c71ecceab240e`. It ran from
2026-11-10 01:01:14 UTC to 02:23:38 UTC. All seven workflows are terminal.
The required workflow has 59 jobs: 12 successful, 13 failed, nine cancelled and
25 skipped. The other six workflows skipped. No Rust job executed.

All 22 nonpassing job results were collected. Twenty-one complete log streams
were downloaded and verified. GitHub returns `BlobNotFound` for forward
translation shard one, job `129554311867`; an explicit `gh run view --job --log`
retry also reports that log missing. The verified whole-run ZIP has 136 members
and also lacks that shard. This unavailable upstream log remains explicit.

Every one of the 25 published artifacts was downloaded, completely decoded and
CRC/SHA-256 checked. The 24 deadline archives retain complete selected JSON
reports and Bun stderr. Their other payload bytes were discarded after
inspection. The canonical artifact contains 2,873 nested outputs, all decoded
and checked against its complete original manifest: 319,730,165 bytes. This is
inspection evidence, not custody of discarded artifact source bytes or proof
that the current working tree is fresh.

## Failures to repair

TypeScript fails because the owned-definition matrix file
`profiles/owned-definitions-matrix-80dc0d37762835fbe925b47e6fad25fee5c1d3c093fafff0512fc2bd3f9ae4e0.json`
is absent. Its original native TypeScript case and independent deadline audit
pass in this CI run. Reverse freshness rejects the differing forward inventory.
Forward freshness computes all 865 sources but rejects six stale canonical
artifacts. Both matrix jobs reach their original 60-minute limits without
producing their matrix artifacts.

Strict parity runs all 121 acceptance cases, then its canonical child reaches
the unchanged 1,200,000 ms limit. It reports 441 draft gaps and one validation
error. The artifact inventory has 161 executable top-level functions overall,
including 158 production functions, and 2,420 carried production functions.
There are 12,431 carried items. Inventory validation establishes no full parity.

Forward shards additionally expose ordinary namespace callback changes, missing
complete receiving histories, stale candidate closures, the private compiler's
unchanged 4 MiB source bound, unsupported complete application parents, and
original case deadline failures. The complete failure contexts and deadline
errors are retained, including cases whose assertions passed after their limit.

Reverse Node shard two exceeds 60,000 ms for the complete reader-definition
roundtrip (73,809.891628 ms) and shared base64 vectors (118,482.735309 ms).
Shard four exceeds 60,000 ms for hostile primitive-constructor tapes
(73,375.880357 ms) and complete original/scoped runtime-import builds
(89,311.489878 ms). Bun shard three fails the original 5,000 ms regeneration
case after 81,575.69 ms. Cancelled cohorts remain unfinished.

## Retained evidence

The [complete cycle archive](evidence/current-679-ci-terminal-ci.tar.gz) has
100 members and 7,829,294 compressed bytes, SHA-256
`cc9ed055aea0850f8b59334662c94502d4d821452f50604293d798c5ec4cbe59`.
Its [receipt](evidence/current-679-ci-terminal-ci.tar.receipt.json.gz) records
every member and full readback verification. Exact inactive local copies were
retired after verification. Evidence allocation was then 434,016,748 bytes,
below the 500,000,000-byte limit.

All available failures are now collected before the next coordinated push.
This cycle is failed, not a green gate. No deadline, semantic boundary, compiler
admission limit or required CI stage was relaxed. The PR stays draft and
unmerged, and issue #784's broader privacy and compiler criteria remain open.
