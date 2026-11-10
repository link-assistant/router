# Preserve ordinary progress callbacks and complete receiving histories

Published CI at `679bcd027` exposed additional namespace events on ordinary
`translateProject` callbacks and stale receiving histories. Source commit
`7dadfb75623a0ae7e047a682ec7abdcab08a8bdd` adds private explicit registration
through `namespaceProgressObserver`. Ordinary callbacks keep their previous
sequence; the canonical CLI opts into namespace diagnostics. Registration is
local to the module instance and does not transfer to isolated matrix workers.
The single progress getter read and callback error identity remain covered.

Both fixed source-rule phases retain complete project/CLI predecessors,
serialized and reparsed CSTs, full inverses and independent TypeScript 5.9.3
syntax/binding checks. The facade, bulk companion and receiving-history
producers compose those complete equations. The runtime-import fixture now
admits its complete known predecessor before checking the current source.
No historical fixture body, assertion or deadline was removed.

All **69 cases pass under Node 20.20.2 and Bun 1.4.4**. The complete project,
receiving and registered cohorts contain 25, 17 and 27 cases respectively.
All three independent Node deadline audits pass. Every Bun duration also
satisfies its original explicit source deadline. Node cohort durations are
114.13, 160.12 and 298.39 seconds; Bun durations are 84.63, 157.50 and 247.01
seconds. Sampled cgroup peaks remain below the unchanged 2,866,933,760-byte
stop threshold. These are observed whole-cohort results, not measured speed gains.

The first bulk cohort had four passing assertions and two frozen-input
refusals because the new source profiles were untracked. Its complete failure
and passing deadline audit remain retained. Committing the source and staging
the genuine registration resolved those refusals; the complete original bulk
file passes in both registered reruns. The archive tool's first readback also
failed on absolute audit path names; source bytes were untouched. The corrected
archive uses repository-relative names and verifies every complete member.

The isolated producer independently reproduced the complete proposal for source
commit `7dadfb756`: **1,856 inputs**, **58,343,402 bytes**, within the unchanged
64 MiB limit. Proposal SHA-256 is
`fe61faefd74dcda1a9dd6a30eec518e3e52ec144ef138c36134921e1b8e44429`.
Installation retains complete prior registration/bootstrap histories and checks
all current physical inputs, both CST phases/inverses, native Node/Bun syntax,
and negative controls. The genuine portable Git producer emits **482 objects**
while preserving its complete original concrete profile. The original isolated
and portable whole-file cases pass in both engines in the registered cohort.

The [complete packet](evidence/namespace-receiving-20261110.tar.gz) contains
**119 members**, **5,134,701 compressed bytes**, SHA-256
`4903c2e37e2d96644f0fe7132006dd2716c2c291942d770c6b9bc0a189ea9beb`.
Its [receipt](evidence/namespace-receiving-20261110.tar.receipt.json.gz) retains
complete member identities, all three passing cohorts, the earlier failing
cohort, source deadlines, Bun durations and source provenance. Every member was
reopened and verified before inactive raw copies were retired. Evidence
allocation after retirement was **438,540,346 bytes**.

This repair adds **zero executable production functions**. Canonical generation
still exhausts its bounded heap, matrix and reverse artifacts remain stale or
missing, and original deadline/private-compiler failures remain unresolved.
Strict parity and the complete JavaScript gate have not passed. No Rust tool
was invoked. PR #785 stays draft and unmerged.
