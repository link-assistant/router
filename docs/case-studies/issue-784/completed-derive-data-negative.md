# Completed derive DATA reuse diagnostic

This unsuccessful experiment toward [PR #785](https://github.com/link-assistant/router/pull/785)
retains no production change. Reusing the existing bounded completed-DATA freezer
in source-module views and derive snapshots slows the full production workload.
Both original production files have been restored byte for byte.

Each fresh Node 20.20.2 process resolves the complete actual production graph
from `src/lib.rs`, the complete tracked Rust path list and original Cargo inputs,
then issues its complete derive context. Each produces 397 modules and 419
certificates. The measured interval includes the entire graph and context work.
There is no selected-function or reduced-input timing.

| Process order | Graph milliseconds | Graph and context milliseconds | Sampled cgroup peak bytes |
| --- | ---: | ---: | ---: |
| Before 1 | 20,923.968368 | 34,897.745011 | 2,245,427,200 |
| Candidate 1 | 26,839.491892 | 43,415.125192 | 2,320,465,920 |
| Candidate 2 | 26,825.812038 | 42,302.487136 | 2,287,505,408 |
| Before 2 | 21,102.390159 | 34,851.344502 | 2,233,806,848 |

The candidate's mean is 22.894238% slower. All four complete issued contexts are
10,137,192 bytes and have SHA-256
`2d37a69b9373a78fb1f40bfba3051e84699daf381f3efa584a8589aa612ad6a3`.

The initial evidence writer exhausted its 512 MiB Node heap while serializing
the graph's duplicated CSTs alongside the context. That failure, its original
harness and resource observations remain complete in the archive. The corrected
writer runs the same complete computation, retains the whole context and all
physical sources, graph identities and Cargo inputs, and excludes evidence
serialization from the measured interval. It uses the unchanged 512 MiB heap.

The source proposal retains complete predecessor and candidate files, ordered
substitutions, both serialized and reparsed CST phases and full inverses.
Independent TypeScript 5.9.3 copied-module binding checks and complete Node/Bun
grammar checks pass before candidate installation. These are authoring checks;
the discarded candidate has no receiving or original-deadline qualification.
No source, owner or semantic verdict cache was introduced.

The [complete archive](https://github.com/link-assistant/router/blob/241d34420d46ac833709b80f68fffc5e937f02c7/docs/case-studies/issue-784/evidence/completed-derive-data-negative.tar.gz) and
[member receipt](evidence/completed-derive-data-negative.json.gz) retain all four
whole outputs, complete input receipts, source review, streams, failed first
harness and resource observations. Every member was reopened and hashed.
The archive is 6,559,739 bytes with SHA-256
`8f6a18d61435d1bf9774c10afa29dbcc3172a4a5d4a156c7c69c593d0fc8f964`.

New executable production functions: zero. This diagnostic repairs no CI check
and does not establish runtime parity, full-gate completion or universal
tool/account privacy. No Rust tool was invoked.
