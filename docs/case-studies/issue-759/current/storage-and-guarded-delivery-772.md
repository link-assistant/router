# Continue generation and repair guarded source comparisons

This checkpoint follows the [scalar/JSON implementation](scalar-json-delivery-772.md)
on `4b22bd09b921a8eb0905a5451cc37ba017dab198`. It keeps every requirement in
[#772](https://github.com/link-assistant/router/issues/772) and #759 open until
actual synchronization and all mandatory checks pass.

The full canonical field-storage attempt used Node 20.19.4, TypeScript 5.9.3,
a 2 GiB V8 heap, a 3 GiB aggregate RSS cap and the original disk reserves. It
loaded 862 tracked Rust sources and the 396-module library. The complete project
returned at 1,059.482 seconds and its field storage completed at 1,069.891 seconds.
Standalone processing then exhausted the heap at 1,287.208 seconds; sampled peak
aggregate RSS was 2,375,385,088 bytes. Last progress was 544/862 standalone sources.
No plan was applied and no new global coverage percentage was obtained.

The existing native retained-output route subsequently passed all 13 cases in
two complete files under both Node and Bun: 72.043 and 41.487 seconds respectively.
Original case deadlines, every planned byte/hash, complete storage roundtrips,
refusals, input bounds and changed-host controls remain checked. This qualifies
the focused path for a full retry; it does not prove the complete corpus fits or
establish an end-to-end speed gain. No memory or deadline limit was increased.

The guarded source repair calls the actual `prepareGuardedProofLexing` producer,
joins its complete physical consumer, retains both CST phases and the full
inverse, and rechecks all original inputs. Frozen composer/scanner history is
compared only after that known import equation is restored. The composer retains
its original `6da6243d…` pin. The original codec and native scanner bodies stay
unchanged. The actual operation and whole-owner producers regenerate the two
affected scope modules; all 19 whole-owner rows and the five batched-source rows
remain fresh. Historical DATA grants no runtime or executable authority.

The complete codec, operation and physical-history files pass 18 cases in both
engines. The final portable-path correction also passes its complete two-case
file in both engines. The broader four-case batched-source family remains red:
Node reports 94,564.730 and 62,270.533 milliseconds against unchanged 60,000 ms
limits. Its earlier physical-dependency refusal remains retained separately.
Passing synchronous TAP events after a deadline still fail the independent audit.

The task dependency symlink was replaced with a bounded copy of nine already
installed locked packages: 799 files, 27,390,497 bytes, with every SHA-256 read
back. The source installation was untouched, no dependency was downloaded and
TypeScript remains 5.9.3. This repairs the physical-path setup; it does not certify
the previously refused broad trial or fix its remaining performance failures.

At collection time the new CI cycle still had a running translation job.
Its basic lint, Node and Bun jobs passed; TypeScript and parity failed, the
neutral matrix exhausted its heap, and reverse translation reached its enclosing
deadline. The reverse stream reaches a test that checks two real functions by
compiling the complete Router project under 60 seconds. Parallel CI partitions
alone cannot repair that case. Preserve complete original sources, CST/global
binding evidence, callee closure, assertions and deadlines when optimizing it.

The [bounded raw packet](../raw/ci/link-assistant--router/continuation-772/20261023-guarded-storage-delivery.tar.gz)
retains the failed complete generation,
passed focused checks, broader failed audit, physical-dependency receipt and
complete source equations. The current CI collection is partial until its final
job terminates. Full canonical/profile generation, fresh coverage, strict parity,
complete reverse checks and export qualification remain required. No Rust tool
ran locally; Rust remains gated on every same-SHA JavaScript stage.

The [receipt](../raw/ci/link-assistant--router/continuation-772/20261023-guarded-storage-receipt.json)
and [complete member vector](../raw/ci/link-assistant--router/continuation-772/20261023-guarded-storage-members.json.gz)
record all 143 independently read-back members. The packet occupies 12,553,386
bytes; SHA-256 is
`24828f7374bd1c4d30e3a1821d94d621cb03b62ef8c19761be52f16e3a8d0896`.
Complete Node/TypeScript native syntax, whole CST inverses and all three changed
producer freshness checks passed in the final source review. Open captured code
as data; execution is unnecessary for reviewing the retained results.
