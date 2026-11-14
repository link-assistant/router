# Current named-core host history

The complete original five-case Node file reproduces the CI source failure:
`prepareNamedCoreProducers` rejects the current Unicode producer. Its archived
input predates the separate `prepareCoreUnicodeHostAssetHistory` function.
Four cases pass their assertions; the composition case also breaches its
unchanged 60000-ms deadline at 61933.402308 ms. The complete deadline audit fails.

The producer now derives the exact known host-only addition as a native-selected
source insertion before the Unicode composer. The original archive, language
and repository CST phases, serialization/reparsing, native grammar and full
inverse remain required. The actual generated Unicode source is unchanged.
Freshness passes with installed TypeScript 5.9.3. Tests independently replay all
native edits and reject a changed `propertyQualified` flag in the complete
physical source; no unknown source is added to an allowlist.

The complete repaired Node file passes all six behavioral cases, including all
five originals, but remains **unqualified**: the independent original-deadline
audit reports 60725.657430 ms against 60000 ms for the composition case. Total
observed command duration is 166.788698 seconds, peak sampled total cgroup
memory 2512531456 bytes, no resource interruption. Complete audit:
`complete-i4SRMa`. The baseline audit is `complete-2qguij`.

The complete Bun 1.4.4 attempt passes four cases before the unchanged cgroup
guard stops it at 122.632731 seconds, sampled peak 2867335168 bytes. Its final
two cases are unrun. This does not qualify CI's Bun 1.4.3 or the complete file.
All child processes from both attempts are reaped. A separate attempted
10-second profile refuses on the already exited baseline PID before sending a
signal; it captures no samples and establishes no allocation or CPU cause.

[The complete custody packet](evidence/current-named-core-host-repair.json.gz)
retains both entire source preimages, exact repaired sources, complete passed
and failed streams, both Node audits, producer freshness and the failed profile
script/error. This repair adds zero measured executable application functions.
The deadline failure, broader CI and issue acceptance criteria remain open.
