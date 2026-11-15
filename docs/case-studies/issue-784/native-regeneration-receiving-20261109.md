# Native TypeScript regeneration repair observations

This draft repair belongs to [PR #785](https://github.com/link-assistant/router/pull/785).
It preserves the original native TypeScript receiving file, generated artifact
contracts and deadlines. The original regeneration deadline still fails; the
complete JavaScript gate, strict parity and same-head CI remain unqualified.

## Implementation

Regeneration privately retains one TypeScript 5.9.3 inference program. A fresh
compiler host rechecks the complete positive/negative filesystem and resolution
observations and all loaded source/declaration texts before reuse, and checks
them again before accepting outputs. Changed inputs or observation-budget
overflow use the original fresh-program route. The root, input order, options,
working directory, default library and compiler function identities must match.
Public build/parser calls cannot obtain this private program or its syntax nodes.

Private serialization reduces empty-container allocations and unnecessary symbol
queries while preserving complete metadata. Regeneration packs fresh CST
transactions within unchanged native source/node/serialization limits. Only the
exact aggregate-node/canonical-limit refusal discards a transaction and retries
both complete halves. Other failures propagate. Every source still crosses
native serialization/reparsing, fresh metadata serialization/reparsing, emission
and independent erased runtime syntax comparison. Package files and assets stay
fresh. This is a stock synchronous compiler optimization, not an atomic filesystem
snapshot or protection against hostile compiler callbacks.

See [the implementation boundary](../../development/native-inference-reuse.md)
and the [Clone/CST repair record](clone-cst-receiving-20261109.md).

## Complete receiving evidence

| Whole selected workload | Result |
| --- | --- |
| Six inference/packing regressions, Node 20.20.2, 768 MiB heap | 6/6 assertions and unchanged 60 s case limits pass; 36.480 s; sampled cgroup peak 1,824,276,480 B; audit `complete-tAfA7B` |
| Same six regressions, Bun 1.4.4 | 6/6 cases pass; dense native aggregate retry takes 23.469 s, below 60 s |
| Unchanged native TypeScript file, Node, 1 GiB heap | 9/9 assertions pass, including strict compilation and complete shared Node/Bun runtime checks; original regeneration deadline fails |
| Original four-build regeneration case | 75.809485822 s against unchanged 60 s; independent audit `complete-wjqhwC` fails |
| Whole original native TypeScript file | 310.760 s; sampled cgroup peak 2,697,969,664 B; no resource guard stop; command exits 1 because of the deadline |

Regressions cover changed external declarations with unchanged JavaScript,
previously missing packages appearing, changed/added JavaScript, exact Unicode
and CRLF asset bytes, and complete metadata equality against the unchanged
public serializer. Packing controls cross the 64-row hint and a whole source
larger than the unit hint. Dense inputs first prove a real native aggregate
refusal; actual regeneration then succeeds by transporting complete halves and
independently comparing both emitted runtime ASTs. These bounded fixtures are
additional tests, not substitutes for the original file.

An initial gap test's full metadata comparison passed, but its expectation that
a synthetic global property necessarily has a declaration-backed gap failed.
The corrected fixture includes `Math.max` and retains every original gap check.
That failed attempt and its full source/deadline record are retained.

Two complete production warm diagnostics produce zero changed or unexpected
artifacts: allocation repair takes 34.127 s for warmup and 24.126 s for the
profiled repeat; the subsequent packing version takes 35.930 s for warmup and
19.299 s for the profiled repeat. Profiling/serialization overhead is included
in those diagnostic elapsed values. These are separate observations, not
qualification of the four-build case or a controlled speedup benchmark. The
previous original regeneration observation was 88.139 s and also failed.

No deadline was raised, test filtered, source removed, semantic proof skipped
or failed gate made optional. Bun 1.4.4 local controls do not certify CI's Bun
1.4.3 environment. Rust remains unrun locally and blocked by the mandatory
same-head JavaScript gate.

## Packet custody

The [complete native repair packet](https://github.com/link-assistant/router/blob/79f375ed1d9690ab8336e06a28331c2871092eb0/docs/case-studies/issue-784/evidence/native-reuse-receiving-20261109.tar.gz?raw=true)
contains 86 members, 1,805,852 compressed bytes, SHA-256
`321ce1a7cc39ad5394438b44c9c30fda049f923389633ca314bf23d977aa088b`.
Its [receipt](evidence/native-reuse-receiving-20261109.json.gz) records complete
member sizes and SHA-256 hashes. It includes all new failed/passing attempts,
both CPU profiles, complete production results, Node deadline audits, current
Bun ingress controls and selected source snapshots based on `dea446951`.
Selected input snapshots do not establish historical transitive source custody.

Every member was read back and checked before retiring 2,136,076 B of exact
inactive raw task copies. Evidence allocation after archiving is 474,359,398 B,
below the unchanged 500 MB cap. Original repository sources, deadlines and
previous complete packets were retained.
