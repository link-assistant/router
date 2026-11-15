# Keep numeric source bodies inside the enclosing name scope

The small original-source record probe extends the reproduced conversion
binding defect to `TryFrom` and primitive `MIN`/`MAX`. All three numeric
expressions checked a nested standard body with a plain environment, resetting
the enclosing function's temporary-name counter. An earlier field containing
7 became 9; a nested record became an integer. The new complete regression
fails strict TypeScript before the repair (TS2322), independently of the
incorrect scalar runtime result visible in the probe's complete emitted body.

Both numeric checks now use the existing callback environment. This preserves
their independent control boundary and the enclosing temporary supply. Actual
source selections, original body checking, ownership and private proofs remain
mandatory. No generated checker or checked output was manually edited.

The regression covers both field orders, nested records, integer constants,
successful conversions, overflow fallback and boundary values in emitted
JavaScript and independently strict-compiled TypeScript. Both complete files
include every original numeric test and retain their original deadlines.

| Complete run | Result | Seconds | Peak sampled cgroup bytes |
| --- | --- | ---: | ---: |
| New regression before repair | TS2322 failure | 5.738 | 2,705,457,152 |
| Node 20.20.2, both files | 10 passed; deadline audit passed | 18.442 | 2,747,228,160 |
| Bun 1.4.4, both files | 10 passed | 11.907 | 2,763,718,656 |

The lockfile compiler is TypeScript 5.9.3. Node children inherit the 384 MiB
old-space bound. The original test's deliberately wrong fallback still fails
strict compilation and its rejection assertion passes under both engines.

Earlier resource attempts remain unsuccessful: the first launcher refused
insufficient cgroup headroom, and two subsequent probes hit the unchanged
2,866,933,760-byte guard before producing a result. Manual page advice for
closed owned files, including this worktree's complete-name Git objects,
reduced observed file-cache residency without deleting or modifying files.
The completed probe then took 3.842 seconds, peaking at 2,542,436,352 bytes.
The successful regression runs did not hit the guard.

The [complete evidence packet](evidence/current-numeric-record-regression.json.gz)
retains original/current source, all failed attempts, complete reports,
independent deadline audits, full probe results and page-advice receipts.
Every decoded member is read back and checked for full length and SHA256.
This focused result does not qualify current production generation, compiler
registration, application parents, the full gate, parity or issue-wide privacy.
No newly executable production function is claimed; no local Rust tool ran.
