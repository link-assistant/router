# Terminal CI cycle for 82bff66b3

[PR #785](https://github.com/link-assistant/router/pull/785) remains draft.
The complete [run 42895668515](https://github.com/link-assistant/router/actions/runs/42895668515)
started 2026-11-10 20:28:46 UTC and ended 21:51:29 UTC. Its published head is
`82bff66b3eaec603e296f1d888fe909dad4743c8`; Actions tested merge
`a3154a334b5fd6916b1f1c5c9d114bed665fefc4`. All 75 jobs are terminal:
20 failed, nine cancelled, 21 successful, 25 skipped. No run was cancelled by this task.

Every non-passing job is listed below. Complete available logs were downloaded,
decompressed, hashed and reviewed. Forward bin 9 is an external evidence gap:
two direct log API requests return HTTP 404 `BlobNotFound`, and the run/job
fallback returns `log not found`. Its terminal metadata is retained; its absent
log cannot establish which individual cases ran or failed. This is not a missing
CI credential and supplies no reason to skip any mandatory check.

| Job | Result | Failure and original bound | Retained complete log lines |
| --- | --- | --- | --- |
| [parity](https://github.com/link-assistant/router/actions/runs/42895668515/job/130108033635) | failure | Strict parity: 441 draft gaps, 12426 carried Rust items; complete canonical comparison exceeded its original 1200000 ms child limit (1200338 ms). | 896, 897, 898, 899, 901 |
| [profile-matrix](https://github.com/link-assistant/router/actions/runs/42895668515/job/130108034017) | cancelled | All-profile generation exhausted its original 60-minute job before completing Unix/Windows; no complete matrix draft was available for upload. | 4633 |
| [translation (3)](https://github.com/link-assistant/router/actions/runs/42895668515/job/130108034114) | failure | proof-byte-core-stream candidate and schemars full-source cases exceeded 60000 ms; the legacy hash-hook child returned ETIMEDOUT. | 1419, 1981, 1982 |
| [translation (1)](https://github.com/link-assistant/router/actions/runs/42895668515/job/130108034118) | failure | internal-metadata-digest-adoption.test.mjs:33 provider/affinity parent case: 70946.665 ms against 60000 ms. | 1083, 1306, 1307, 1849, 1850 |
| [reverse-freshness](https://github.com/link-assistant/router/actions/runs/42895668515/job/130108034126) | failure | Owned definition corpus: current forward inventory differs. Ordinary regeneration independently reported zero changes. | 297, 306 |
| [owned-profile-matrix](https://github.com/link-assistant/router/actions/runs/42895668515/job/130108034130) | cancelled | Owned-profile generation exhausted its original 60-minute job during Unix work; the complete matrix and its upload were unavailable. | 5889 |
| [translation (11)](https://github.com/link-assistant/router/actions/runs/42895668515/job/130108034196) | failure | parse_csv exceeded 900000 ms; split_repository_list reports shadowed borrowed str and lacks checked execution. Two other whole-source cases exceeded their 60000/90000 ms limits. | 530, 531, 604, 613, 618, 1087, 1088, 1117, 1118, 1128, 1202, 1840, 1841 |
| [translation (4)](https://github.com/link-assistant/router/actions/runs/42895668515/job/130108034210) | failure | router-core-json-parse.test.mjs:30 full parent case: 160635.679 ms against 60000 ms. | 983, 984, 1574, 1617, 1618, 1702, 1703, 1872, 1873 |
| [reverse-translation (10)](https://github.com/link-assistant/router/actions/runs/42895668515/job/130108034238) | failure | All assertions passed, but owned-core-base64.test.mjs:19 took 69618.764 ms against its original 60000 ms limit. | 403, 404 |
| [translation (10)](https://github.com/link-assistant/router/actions/runs/42895668515/job/130108034294) | failure | All assertions passed, but derive-bang-context.test.mjs:120 took 141215.622 ms against 60000 ms. | 1747, 1748 |
| [reverse-translation (1)](https://github.com/link-assistant/router/actions/runs/42895668515/job/130108034311) | cancelled | Reverse Node bin 1 exhausted its original 15-minute job limit; no complete successful cohort. | 305 |
| [translation (9)](https://github.com/link-assistant/router/actions/runs/42895668515/job/130108034312) | cancelled | Forward bin 9 exhausted its original 60-minute job limit. GitHub returns 404 BlobNotFound for its complete log; fallback also reports log not found. | 1 |
| [translation (7)](https://github.com/link-assistant/router/actions/runs/42895668515/job/130108034325) | failure | Assertions passed; original whole schema, private-data-freeze and router-core-matches cases exceeded 30000/60000/60000 ms. | 521, 522, 746, 747, 1700, 1701, 1875, 1876 |
| [translation (13)](https://github.com/link-assistant/router/actions/runs/42895668515/job/130108034362) | cancelled | json-source-f64-original-root.test.mjs:19 exceeded 60000 ms, then bin 13 exhausted its original 60-minute job limit. | 358, 359, 628, 629, 914, 1017 |
| [typescript](https://github.com/link-assistant/router/actions/runs/42895668515/job/130108034374) | failure | ENOENT: profiles/owned-definitions-matrix-80dc0d37762835fbe925b47e6fad25fee5c1d3c093fafff0512fc2bd3f9ae4e0.json. Native TypeScript cases and ordinary profile strict compilation passed. | 471, 484 |
| [translation (16)](https://github.com/link-assistant/router/actions/runs/42895668515/job/130108034386) | failure | Assertions passed; executable-checked-source.test.mjs:19 took 71215.055 ms against 60000 ms. | 1681, 1682 |
| [translation (5)](https://github.com/link-assistant/router/actions/runs/42895668515/job/130108034452) | failure | Assertions passed; reverse-independent-corpus.test.mjs:95 took 68527.987 ms against 60000 ms. | 372, 373, 412, 413, 452, 453, 767, 768, 772, 773, 882, 883, 962, 963, 1132, 1133, 1142, 1143, 1889, 1890 |
| [translation (8)](https://github.com/link-assistant/router/actions/runs/42895668515/job/130108034460) | failure | Eight actual-gain-families cases fail their before hook on the current isolated compiler manifest source pin; option-borrowed-str-equality full-parent case took 2187617.484 ms against 60000 ms. | 297, 326, 355, 384, 413, 442, 471, 500, 1163, 1164, 1434, 1447, 1448, 1913, 1914, 2133, 2134 |
| [reverse-bun (7)](https://github.com/link-assistant/router/actions/runs/42895668515/job/130108034479) | cancelled | Bun reverse bin 7 exhausted its original 15-minute job limit; no complete successful cohort. | 281 |
| [translation (6)](https://github.com/link-assistant/router/actions/runs/42895668515/job/130108034486) | failure | core-literal-text-adoption.test.mjs:53 exceeded 60000 ms; private-rust-compiler-execution.test.mjs:59 refused the original complete raw source byte bound. | 793, 906, 907, 1021, 1022, 1484, 1489, 1569, 1570, 1956, 1957 |
| [translation (12)](https://github.com/link-assistant/router/actions/runs/42895668515/job/130108034540) | cancelled | native-portable-corpus-concrete-syntax.test.mjs:149 took 121755.257 ms; router-core-unit-matches.test.mjs:109 took 2296986.198 ms. Both have 60000 ms limits; the job then exhausted 60 minutes. | 576, 577, 861, 862, 991, 992, 1107, 1476, 1484 |
| [reverse-bun (4)](https://github.com/link-assistant/router/actions/runs/42895668515/job/130108034544) | failure | runtime-import-parents.test.mjs whole original/current build equality case: 62969.28 ms against 60000 ms. All seven selected files executed. | 298, 299 |
| [reverse-bun (3)](https://github.com/link-assistant/router/actions/runs/42895668515/job/130108034572) | failure | translator.test.mjs deterministic regeneration case: 82682.81 ms against the original Bun 5000 ms default. All seven selected files executed. | 293, 294 |
| [reverse-translation (7)](https://github.com/link-assistant/router/actions/runs/42895668515/job/130108034599) | cancelled | Reverse Node bin 7 exhausted its original 15-minute job limit; no complete successful cohort. | 313 |
| [translation (15)](https://github.com/link-assistant/router/actions/runs/42895668515/job/130108034607) | failure | Assertions passed; static-source-lifecycle.test.mjs:37 took 61484.839 ms against 60000 ms. | 473, 474, 830, 831, 905, 906, 920, 921, 1846, 1847, 1936, 1937 |
| [translation-freshness](https://github.com/link-assistant/router/actions/runs/42895668515/job/130108034629) | failure | Canonical --check refused stale parity/rust-source-inventory.json. Its complete output packet is retained and reviewed without installing stale source inputs. | 304, 305 |
| [reverse-bun (1)](https://github.com/link-assistant/router/actions/runs/42895668515/job/130108034778) | cancelled | Bun reverse bin 1 exhausted its original 15-minute job limit; no complete successful cohort. | 287 |
| [reverse-translation (9)](https://github.com/link-assistant/router/actions/runs/42895668515/job/130108035101) | failure | owned-core-ascii.test.mjs:25 complete runtime import/type case: 102806.523 ms against 60000 ms. | 333, 334 |
| [JavaScript fully green](https://github.com/link-assistant/router/actions/runs/42895668515/job/130154524309) | failure | Aggregate correctly refuses green because required same-commit stages did not all succeed. All 25 Rust jobs remain skipped. | 146 |

All 41 published artifacts were collected: 40 complete ZIPs and the complete
canonical ZIP in lossless XZ storage. All ordinary members were reopened,
CRC checked, length/hash joined and reviewed, including the last bin 12 TAP.
The canonical packet contains 2873 complete nested gzip members, totalling
320408245 decoded bytes. Whole ZIP SHA256 is
`e5625dbfdd44ef27e0df0696fbe20cf96edf0e14719b6b05c7417fd0fabf54d4`.
All nested streams and complete source/output joins were reviewed. Only
`parity/rust-source-inventory.json` differs among its checked-in outputs, but
the current `tools/translation/project.mjs` also differs from the packet input.
These unqualified old-source outputs were not installed.

The CSV assertion at complete log line 618 includes the exact original
`storage::associative::split_repository_list` refusal: `shadowed borrowed str
type: requires actual standard primitive identity in the source type namespace`,
span 10676–10680. The assertion truncates its diagnostic after 10000 characters;
that retained prefix must not be treated as a complete parsed diagnostic array.
The source has struct ordering derives; the existing complete ordering route
only admits unit enums. This is an investigation lead, not a verified causal
trace or permission to relax namespace proofs.

Native Node/Bun tests passed. Those successes do not waive the original
case deadlines, missing owned-profile outputs, raw private compiler bound,
freshness failures or strict parity requirements. Strict parity still reports
441 draft gaps and 12426 carried Rust items. No Rust check or local Rust tool
was run. There is no green current complete JavaScript gate.

The full per-job findings and exact complete-log hashes are retained in
[the compressed review](https://github.com/link-assistant/router/blob/ae267c7f3a250f421c319adc20eba4ad466f49f5/ci-logs/issue-784-restart-2/next-82b-terminal-complete-failure-review.json.gz?raw=true).
The evidence is diagnostic, not a completion or executable-authority claim.
The complete original containers remain in that immutable source commit.
Their inactive working copies were retired only after whole Git blob readback
and inode/descriptor checks; the separate custody receipt records exact hashes.
