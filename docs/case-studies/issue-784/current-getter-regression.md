# Historical and current production getter coverage

The complete original shared-receiver test file reproduces the CI failure:
seven cases pass and the Lefine source hash fails. Compatibility-core adoption
changed the whole module from the original 7,222 bytes to 7,497 bytes, including
the constructor parameter spelling. Updating its original pins alone would
discard the independently pinned historical case.

The fixture now retains every original source byte from commit
`62c47c18a52ce9af2768690a92d0ed3655bc6c8b:src/lefine.rs`. The original case
keeps its declaration spans, hashes, assertions and implicit deadline. A new
paired case independently reads the complete physical `rust/src/lefine.rs`,
checks the current complete source and declaration pins, and repeats every
checked getter, emitted JavaScript and forged Copy-certificate assertion.
The whole module remains explicitly without runtime parity.

| Complete original file | Result | Observed seconds | Peak sampled cgroup bytes |
| --- | --- | ---: | ---: |
| Node before repair | 7 pass, 1 hash failure | 10.161 | 2,411,696,128 |
| Node after repair | 9 pass; independent deadline audit passes | 12.881 | 2,405,511,168 |
| Bun after repair | 9 pass | 9.268 | 2,468,085,760 |

Node is 20.20.2, Bun is 1.4.4 and the whole file's existing separately compiled
TypeScript case uses the lockfile compiler 5.9.3. Original test bodies and
deadlines remain complete. The unchanged 2,866,933,760-byte guard is not hit.
CI's Bun 1.4.3 and the current full gate still need independent qualification.

The [complete regression packet](evidence/current-getter-regression.json.gz)
retains both complete test versions, whole historical/current Rust sources,
all streams, resource receipts and complete independent audit directories.
Every decoded member has full length/SHA256 readback verification. This fixes
the source-fixture regression; it adds zero measured executable production
functions and proves neither complete translation nor issue-wide privacy.
No local Rust tool ran.
