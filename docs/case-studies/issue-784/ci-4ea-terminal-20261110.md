# Terminal 4ea CI review

[PR #785](https://github.com/link-assistant/router/pull/785) remains draft and
unfinished. [Run 42863382776](https://github.com/link-assistant/router/actions/runs/42863382776)
started at 2026-11-10 17:17:17 UTC for published head
`4ea091242db0a51a07415c8c04a23a6db0b8c04b` and completed at 18:39:47 UTC.
Its tested merge is `d584507d683d08b53d74f109d6f5f0ebeddb2b72`.
All 59 jobs and all three workflows for that published head are terminal.
All 24 nonpassing job logs and all 26 original artifacts are retained whole.
No CI run was cancelled by this task. Rust remains skipped behind failed
JavaScript checks.

The [custody manifest](evidence/ci-4ea/manifest.json.gz) maps all 176 original
paths to their stored names, with complete byte counts and SHA-256 hashes.
Moving 99528743 bytes into durable custody avoids duplicating the evidence.
Every moved file is read back; active descriptors and mappings are excluded.
The logs are `checkpoint4ea-job-JOBID.log.gz` and artifacts are
`checkpoint4ea-artifact-ARTIFACTID.zip` in that directory. The complete
`checkpoint4eaterminal-current-failure-review.json.gz` retains exact errors,
source positions, original deadlines and complete surrounding contexts.
Every log was read in chunks of at most 1500 lines, and every ZIP member was
reopened and verified against its original CRC and SHA-256. Expected nested
deadline controls and intentional tampered-source negative controls remain
explicitly separate from genuine stage failures.

The 50 original ZIP and compressed-log payloads are permanently retained at
[published commit 93995ee40](https://github.com/link-assistant/router/tree/93995ee40be4b570becbe0b788dba58f5bd0ea6f/docs/case-studies/issue-784/evidence/ci-4ea).
After publication, every complete local stream was compared with its immutable
Git blob and fresh GitHub metadata. Only those inactive task-owned local
copies were retired, reclaiming 93713511 logical and 93806592 allocated bytes.
The [custody receipt](evidence/ci-4ea-published-local-retirement.json.gz)
maps all original payloads to permanent URLs and full hashes; its
[completion record](evidence/ci-4ea-published-local-retirement-complete.json.gz)
confirms all 50 removals. The retained local manifest and review records still
describe the complete original streams. No other cache or build was removed.

| Nonpassing job | Finding and remaining work |
| --- | --- |
| Parity, 129995160591 | All 121 acceptance cases pass. Log lines 887–892: canonical `--check` reaches 1200284 ms against its unchanged 1200000 ms bound; strict parity reports 441 draft gaps and one validation error. Stored inventory retains 865 sources, 12426 carried items and `runtimeParity=false`. |
| TypeScript, 129995160777 | Log line 468: missing genuine `profiles/owned-definitions-matrix-80dc0d37762835fbe925b47e6fad25fee5c1d3c093fafff0512fc2bd3f9ae4e0.json`. The complete neutral, Unix and Windows ordinary generated trees each pass strict TypeScript 5.9.3 immediately before this failure. Owned matrix generation is still required. |
| Reverse freshness, 129995161149 | Line 274 names exactly three stale original reverse artifacts. Actual local regeneration subsequently refreshes those artifacts; the original complete twelve-case Node translator file passes. See the receiving report below; owned regeneration and whole Bun qualification remain unfinished. |
| Translation freshness, 129995160912 | Canonical output custody completes and uploads its whole artifact; the subsequent owned-definition work reaches the original one-hour job limit. No complete owned result is inferred. |
| Profile matrix, 129995161112 | Original one-hour cancellation during Unix-family method work; the last recorded worker elapsed time is 1294637 ms. No complete matrix artifact exists. |
| Owned profile matrix, 129995160692 | Original one-hour cancellation during Unix-family semantic work; the last recorded worker elapsed time is 1434805 ms. No complete owned matrix artifact exists. |
| Translation 1, 129995161479 | Five unchanged 60000 ms deadline breaches: two complete proof-byte cases (93375 and 60225 ms), complete subscription/catalog parents (116777 ms), all three repository builds (83743 ms) and static source release (63753 ms). |
| Translation 2, 129995161460 | Complete catalog parent 193366 ms, original `json_string` parent 83165 ms and whole source/workspace census 87100 ms each exceed 60000 ms. |
| Translation 3, 129995161473 | Complete `parse_csv` takes 1872384 ms against 900000 ms. All-three-build proof, subscription parent, original recovery root, twelve full proof copies and complete client parent exceed their original limits. Actual CSV compilation still refuses unresolved standard namespace/shadowed names. The whole proof child also reaches its original child deadline. |
| Translation 4, 129995161574 | Log lines 1936, 2720 and 2769: complete repository builds take 126643 ms, all JSON callers 187357 ms and nine complete unit-match parent proofs 2321346 ms against 60000 ms each. The original one-hour job limit interrupts the final cohort; full TAP survives without a terminal deadline audit. Log lines 2569–2658 are intentional source-tampering controls, whose parent passes at line 2660. |
| Translation 5, 129995161287 | Actual `safe_number` parent takes 2615636 ms and ActivityPub parent 2131939 ms against 60000 ms. The original receiving child terminates, and two selected-Git-history assertions fail. The latter have a separately tested local source repair. Original one-hour cancellation leaves complete TAP but no final cohort audit. |
| Translation 6, 129995161467 | Four original 60000 ms breaches: literal whole module graph 93503 ms, actual Clap derive 60475 ms, grouped parent refusals 69660 ms and complete HostEmitter equation 94733 ms. The private Rust compiler closure exceeds its unchanged 4 MiB raw bound; the whole shared-freeze proof child times out. |
| Translation 7, 129995160765 | Schema generation 403650 ms exceeds 30000 ms. Grouped parents, method metadata, both complete private-parser source-history cases, matches source and static lifecycle exceed 60000 ms. The complete private-freeze proof child also times out. |
| Translation 8, 129995160689 | Complete executable-source proof 124547 ms and original client parent 2431388 ms exceed 60000 ms. |
| Reverse Node 1 and 7, 129995160924 and 129995161191 | Original 15-minute cancellations; uncompleted files are unqualified. |
| Reverse Node 2, 129995160958 | Complete shared base64 vectors take 84064 ms against 60000 ms. |
| Reverse Node 3, 129995161641 | Deterministic regeneration fails the same three stale artifacts named by reverse freshness. |
| Reverse Node 5, 129995160759 | Three complete scalar function proofs take 78672 ms against 60000 ms. |
| Reverse Node 6, 129995161031 | Complete conditional/string-return proofs take 66252 ms against 60000 ms. |
| Reverse Bun 1 and 7, 129995161092 and 129995160879 | Original 15-minute cancellations; unfinished original files remain unqualified. |
| Reverse Bun 3, 129995160806 | Original regeneration takes 67329 ms against its unchanged default 5000 ms and reports the same stale artifacts. |
| JavaScript aggregate, 130044330471 | Log lines 109–146 retain every failed/cancelled prerequisite. Aggregate failure correctly prevents all Rust execution. |

The whole canonical artifact, ID 13790353473, is 58770385 bytes, SHA-256
`68f4a682feb1939c733dd82c5242388043b65bc5a5acc930af15e86f01d0c20d`.
All 2874 original ZIP members pass whole CRC/SHA readback. Its nested output
manifest has **not** undergone a new complete physical/compiler input join,
nested output review or independent semantic review; no output from this
artifact is installed or counted as newly executable production code.
Subsequent local compiler changes also require fresh qualification.

The coordinated local batch includes the
[five-case selected Git census receiving repair](selected-census-source-history-20261110.md),
the [whole reverse regeneration refresh](current-reverse-freshness-20261110.md),
and complete evidence custody/collector fixes. The reverse refresh preserves
701 unsupported items and zero translated items in its changed module; it
adds no executable production functions. The retained full runtime-scope
comparison remains a negative performance experiment, with no optimization
installed or speed gain claimed.

The [corrected complete local gate](current-complete-gates-20261110.md) passes
both 259-case runtime suites, freshness and strict native TypeScript, but fails
the original native regeneration deadline and is then memory-interrupted in
parity acceptance. Later checks remain unrun. Exact-head fresh CI, every
remaining original deadline, complete owned/profile generation, strict parity
and universal client/account privacy remain required. No missing secret or
manual access requirement was identified; no check is skipped or weakened.
No local Rust tool runs.
