# Complete local gate attempt after Clone/CST and native repairs

[PR #785](https://github.com/link-assistant/router/pull/785) remains a draft.
At clean source `baa608114df8fbad9ed085b18919f043eed8be10`, the complete local
JavaScript gate was attempted without stage selection. It is **not green**.
No local Rust tool ran. This receiving observation does not establish parity.

## Attempts and exact limits

The first attempt stopped during fingerprinting after 52.414 s at the unchanged
2,866,933,760 B cgroup guard (2,869,686,272 sampled B). Its completed prefix was
42,780 of 50,443 inputs. Every verification stage remained unrun. A subsequent
closed-file page-advice pass preserved file identities and bytes; it deleted no
files and changed neither test clocks nor resource limits.

The second invocation was rejected by the observation wrapper because its
command shape did not match the existing cache-advice policy. It exited 2
before launching the gate or any checks. This is a harness rejection, not a
test failure or a verification result.

The corrected third attempt ran the standard complete gate with Node 20.20.2,
an explicitly bounded 128 MiB coordinator, inherited 1,280 MiB child heaps,
Bun 1.4.4 and lockfile TypeScript 5.9.3. CI uses Bun 1.4.3. The existing adviser
followed actual completed fingerprint prefixes once; it advised only eligible
closed, single-link, task-owned regular files after identity and active-use
checks. Original case clocks, source inputs and the cgroup guard stayed intact.

## Completed and unfinished verification

| Verification | Third-attempt result |
| --- | --- |
| Complete input fingerprint | Complete, 50,443 inputs |
| All ten lint commands | Pass |
| Native Node runtime suite | 259/259 pass, 45.316 s |
| Native Bun runtime suite | 259/259 pass, 84.309 s |
| Complete deadline-auditor controls | 10/10 and original deadlines pass; `complete-IB8TgE` |
| JavaScript package type checks | Both pass |
| Native TypeScript freshness | Pass, 11,586,409 B; zero changed/unexpected outputs, 35.982 s |
| Strict native TypeScript compilation | Pass, all 167 files, TypeScript 5.9.3, 12.001 s |
| Complete native TypeScript receiving file | Interrupted by the cgroup guard; incomplete, not qualified |
| Remaining TypeScript commands | Unrun |
| Acceptance, strict parity, forward and reverse stages | Unrun |
| Final input fingerprint and green stamp | Not reached |

The third attempt stopped after 780.952 s, at 2,877,132,800 sampled cgroup B.
The observer reaped its complete owned process set. The interrupted receiving
runner retained only four case reports and could not finish `case-deadlines.json`;
the missing-report error is a consequence of interruption. Buffered TAP cannot
identify the active case or qualify the unreported cases. All selected source
and command observations and both complete terminal receipts are retained.

A broad Git diff ran concurrently near the interruption, contrary to the
intended workload separation. This added avoidable load. The cgroup sample
does not isolate its contribution or establish which allocation caused the
threshold crossing. This attempt is retained as failed/incomplete and is not a
controlled performance comparison. Further Git review runs separately.

The separately completed unchanged native TypeScript file still fails its
original four-build deadline at 75.809 s against 60 s, despite all nine assertions
passing. The unchanged ClientKind deadline also remains failed at 279.719 s.
See [native receiving evidence](native-regeneration-receiving-20261109.md) and
[Clone/CST receiving evidence](clone-cst-receiving-20261109.md). No bound or
deadline was raised, no case was filtered and no failed stage became optional.

## Evidence

The [complete gate packet](evidence/packed-gate-receiving-20261109.tar.gz) and
[member-hash receipt](evidence/packed-gate-receiving-20261109.json.gz) retain all
attempts, the wrapper rejection, closed-file advice and nested Node receipts.
All 30 members were read back before retiring 1,550,911 B of inactive raw task
copies. The archive is 1,307,016 B with SHA-256
`ca5907f99508b6cc7ca45c905b50f61933875b686e8d89a9eb56451aa4c64304`.
Source snapshots describe this evidence draft and its predecessor; they do not
establish historical transitive custody for unrelated observations.

## Subsequent iterator regression repair

Review found that the new second traversal consumed root-only iterable `paths`
again. A generator then lost the entrypoint. Both traversals now share the
initial tracked set. The independent external-module planner still requires
its original bounded array; unsupported carriers are not newly admitted.

The initial test incorrectly expected external-module iterable support. That
failed fixture is retained separately. The corrected whole six-case file fails
before the fix with `crate entrypoint is not tracked: src/lib.rs`, and all six
assertions and unchanged deadlines pass after it in Node 20.20.2 (11.755 s,
2,222,571,520 sampled cgroup B; `complete-sO5BOQ`). Bun 1.4.4 also passes all six
cases (10.917 s, 2,452,066,304 sampled cgroup B). The complete before/after packet
is [the 45-member iterable packet](evidence/iterable-receiving-20261109.tar.gz)
with its [member receipt](evidence/iterable-receiving-20261109.json.gz): 155,676 B,
SHA-256 `aba55f9f549cae4f6581cc6ac00e2310fb88618b23376e5ca779fa2e50fc1a4d`.
All members were read back before retiring 192,323 B of inactive raw copies;
evidence allocation was then 478,601,963 B. All owned commands finished without
a guard stop. These observations qualify the small regression, not the still-failed
original compiler deadlines. The complete gate has not been repeated after
this source repair; it remains required before any completion claim.

GitHub again refuses `gh pr diff 785` with HTTP 406 because the PR exceeds its
300-file diff limit. Review therefore uses the local complete base/head diff,
current source changes and the producer/member hashes for generated outputs.
Freshly fetched `main` remains `eb2dad1c0a18394dc1aad46413e11401e74eb502` and is
an ancestor of the source checkpoint; no merge conflict was found.
