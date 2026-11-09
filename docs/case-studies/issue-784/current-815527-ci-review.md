# Complete 815527 CI review

[PR #785](https://github.com/link-assistant/router/pull/785) remains draft.
The entire published cycle for
`815527efb3db40ca7e650ba9aaae47bfa1529dab` is terminal. The primary
[run 42576266498](https://github.com/link-assistant/router/actions/runs/42576266498)
started at 2026-11-09 06:57:41 UTC and ended at 08:02:22 UTC. Its 59 jobs
contain **19 failures, nine successes, six cancellations and 25 skips**.
All six supplemental workflows are terminal and skipped. The 25 Rust jobs
remain skipped because the same-SHA JavaScript gate failed.

The tested merge is `075ea9e4cb603a5c58de93b1bf732ce70e0f06e4`.
Its tree equals the published head, and its base parent is main
`eb2dad1c0a18394dc1aad46413e11401e74eb502`. A fresh fetch confirms that
main remains included in the local repair branch. Fresh complete issue,
sub-issue and all three PR comment-type responses contain no new human
requirement or required child issue.

## Complete log findings

All 25 nonpassing jobs have complete downloadable logs this cycle. Every
available byte was retained, decompressed and hashed. The failure index reads
each complete log and all available case-audit/Bun receipt members. The line
numbers below refer to the retained timestamped job logs, rather than an
excerpt or a previous head's result.

| Job ID / stage | Actual failure and retained log lines |
| --- | --- |
| 129024571267 / TypeScript | Line 464: missing `profiles/owned-definitions-matrix-80dc0d37762835fbe925b47e6fad25fee5c1d3c093fafff0512fc2bd3f9ae4e0.json`. Native compilation and ordinary profile checking do not supply this owned-matrix file. |
| 129024571509 / parity | Line 883: stale `account_routing_policy.rs` source hash. Current strict checking stops at this freshness failure. The separately retained earlier strict result has 441 fatal gaps; this cycle does not replace it with a new passing result. |
| 129024571652 / forward freshness | Lines 305–629: 271 stale and 54 missing outputs, including the source inventory and new Rust regression/fixture outputs. Exit 1 at line 630. |
| 129024571672 / reverse freshness | Reverse regeneration passes first (11,949,324 bytes, zero changes); line 296 then refuses the differing current forward owned-definition inventory. |
| 129024571498 / profile matrix | Original 60-minute job cancellation at line 283; no matrix draft files at line 297. No complete receiving matrix exists to install. |
| 129024571667 / owned profile matrix | Original 60-minute job cancellation at line 281; no output artifacts at line 295. |
| 129024571628 / forward 1 | Original derive-parent, three-build, Router-caller and nine-body cases fail their original 60-second deadlines (1397, 1741, 2485, 2534). Independent audit also rejects late synchronous passes. Line 2613: unchanged reference-proof child `spawnSync node ETIMEDOUT`. |
| 129024571927 / forward 2 | Original three-build and complete ActivityPub cases exceed 60 seconds (1831, 1900). Line 2274: complete private Rust compiler source graph exceeds its unchanged byte bound. Independent audit rejects further late cases. |
| 129024571669 / forward 3 | Line 995: complete corpus graph case exceeds 60 seconds. Independent audit identifies six late cases across the original files. |
| 129024571658 / forward 4 | The TAP suite reports 600 passes, but the independent audit rejects the original Router core match case at 74,189.384 ms against 60,000 ms. A synchronous TAP pass is insufficient. |
| 129024572059 / forward 5 | Lines 2005–2011: complete original `qwen_model_is_managed` parent takes 1,298,169.428 ms against 60,000 ms. Independent audit also rejects the complete source census case. |
| 129024571821 / forward 6 | Lines 1089–1095: original three-build deadline. Lines 1688–1706: actual `safe_number` remains refused; its `&f64` receiver lacks independent implicit Copy autodereference/method resolution evidence. This case also exceeds its original deadline. |
| 129024571701 / forward 7 | Line 3643: tracked Rust inventory omits new geolocation sources. Line 5489: complete original JSON/Hash hook child exceeds its unchanged 25-second child deadline. Independent audit rejects three additional original case deadlines, including serialization's original 30 seconds. |
| 129024571682 / forward 8 | Lines 297–500: eight genuine gain-family cases fail their common original compiler-input hash check. Lines 1130, 1151, 1181: complete original CSV parents retain unresolved standard primitive namespace evidence. Original-root recovery and derive-parent cases time out (2356, 3163); line 2779 is another unchanged complete Hash-hook child timeout. The full parse_csv case exceeds its original 900 seconds. |
| 129024571656 / reverse Node 1 | Original 15-minute job cancellation; complete cohort audit unavailable. |
| 129024571708 / reverse Node 2 | Independent audit rejects three original 60-second cases: JSON reader definitions, constructors and runtime-import parents. |
| 129024572065 / reverse Node 3 | Independent audit rejects original scalar fold case at 62,416.153 ms against 60,000 ms. |
| 129024571687 / reverse Node 4 | Lines 434–441: original string-loan case exceeds 60 seconds. |
| 129024571793 / reverse Node 5 | Original 15-minute job cancellation; complete cohort audit unavailable. |
| 129024571707 / reverse Node 7 | Independent audit rejects original ASCII case at 187,166.024 ms against 60,000 ms. |
| 129024571700 / reverse Node 8 | Independent audit rejects original Base64 case at 88,007.894 ms against 60,000 ms. |
| 129024571815 / reverse Bun 1 | Original 15-minute job cancellation; complete cohort receipt unavailable. |
| 129024571757 / reverse Bun 4 | Original nullable TypeScript case takes 5,127.48 ms against its unchanged 5,000 ms. Its four independent strict compiler programs remain required. The other five selected files complete. |
| 129024571867 / reverse Bun 5 | Original 15-minute job cancellation; complete cohort receipt unavailable. |
| 129046320123 / JavaScript fully green | Aggregate fails after collecting every mandatory result; Rust is not unlocked. |

The 22 Node audit members contain 44 observed duration breaches. Exactly one
is the intentional 10 ms `synchronous overdue` negative control in the
TypeScript artifact. **43 real case deadline breaches remain**. The full
records retain source hashes, original source spans, declared limits, observed
durations, failed completions and audit errors. This count excludes child
timeouts and incomplete cancelled cohorts; it is not a complete count of all
performance obligations.

Checksum exceptions in forward 1 and duplicate-declaration/overlap diagnostics
in other shards are expected hostile-input controls when their enclosing
cases pass. They are not additional parent failures. Some assertion messages
are already shortened by Node's original TAP reporter (for example forward 8
line 1156 ends with `6109 more characters`). Complete downloaded logs preserve
that original limitation; the retention process does not recover omitted
reporter text or claim that it did. No missing secret or human-only account
setup explains the current mandatory code/generation failures.

## Complete artifacts and input qualification

All **26 artifacts** from the terminal API inventory are retained, with full
archive digests, ZIP CRCs and member readback. The 25 normal artifacts join the
one canonical draft exactly. The normal collector's historical
`completeCycleCollected: false` field is preserved; the final custody manifest
independently checks that complete 26-artifact terminal join. No whole-run log
ZIP was downloaded this cycle: all 25 individual nonpassing logs are available,
and avoiding another duplicate preserves the fixed evidence allocation.

Canonical artifact 13656957918 is 58,475,523 bytes, with SHA256
`abcd179fcdbdfff6548f31fdc9fb749b72a69983e510ddb71f3b40f56cba3dd0`.
All 2,874 outer members and 2,873 nested outputs verify, including
318,859,673 decoded output bytes. Declared inputs verify against the exact
published Git blobs: 865 Rust, three Cargo, 962 compiler, 735 profile and
132 TypeScript rows, representing 2,441 unique blobs. Merge ancestry and the
complete source/compiler/profile/TypeScript joins are retained.

The actual draft measures 158 executable of 2,578 production top-level
functions, with 2,420 carried. Of the latter, 2,278 have module-binding
refusals. Across all projects it preserves 12,431 carried items. These are
application measurements, not API declaration or diagnostic counts.
Four declared inputs have changed locally since the tested head. Installing
this old draft as current would therefore be invalid; it remains evidence
for its actual published merge only. This repair batch establishes **zero
newly executable production functions**.

## Local batch and verification boundary

The pending source batch counts complete private lexer storage from its fixed
record layouts under the original 200,000-cell bound. Exact-boundary and
above-boundary regressions pass as complete focused files under Node and Bun.
It also refreshes the actual registered compiler producer and its complete
portable Git objects. Full receiving attempts remain memory-interrupted.
No original tests, deadlines, source limits, strictness or workloads are
relaxed. The private compiler graph coupling census is diagnostic only and
does not authorize deleting reachable code or increasing its bound.

The complete local gate was attempted on clean
`f08eee0927b9f3b7c2081bf6d3d4fcf975adf644`. Asset/runner freshness, the
complete lint implementation and runner controls finish; the original workflow
test starts but the unchanged cgroup memory guard interrupts the enclosing
lint stage. Every owned process is reaped. Native suites, TypeScript, parity,
forward/reverse cohorts and later gate stages are unrun at that SHA. See the
[exact gate receipt](current-f08eee-gate.md). Earlier gate successes remain
separate evidence for their actual earlier heads. There is no green stamp,
full-gate success, runtime parity or local Rust result.

The full GitHub PR diff endpoint refuses more than 300 files (HTTP 406).
Paginated file metadata, the exact published Git numstat and the complete
local source batch are retained for review instead; the empty failed CLI diff
file is not presented as a reviewed full PR diff. All 2,157 paginated API
filenames equal the exact published Git diff's complete filename set.
Prior complete source
reviews remain separate evidence. The original universal all-tool geolocation
criterion, complete source generation, receiving matrices, strict parity and
all original deadlines are still unfinished. PR #785 stays draft and unmerged.

## Custody

[`evidence/ci-815527/manifest.json.gz`](evidence/ci-815527/manifest.json.gz)
maps every moved original path to its stored basename, complete length and
SHA256. The retainer hashes each complete file before and after its move;
no artifact is truncated, substituted or duplicated. Full job snapshots,
download attempts, API responses, verification receipts, error index, input
reviews and archives remain available through those mappings. The complete
task evidence allocation remains below 500,000,000 logical bytes. The
retainer uses no Rust tools and makes no semantic admission decision.
