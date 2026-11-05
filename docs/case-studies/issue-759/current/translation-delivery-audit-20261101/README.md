# Router translation delivery audit

Historical four-role baseline. See the later
[November6 solo delivery-time update](../delivery-time-report-20261106/README.md)
for subsequent commits, exact step intervals and changed staffing assumptions.
The original observations and forecast below remain frozen at their stated head.

Audit date: **2026-11-01**. Frozen source and Git-history head:
`ba7b1d9f99f9be16628fe433a097b1b8ff036f43` (10:32:21 UTC).
The three implementation workers continue in parallel; uncommitted work is
identified separately. This is a repository case study, not a test report.

The project is producing source frequently, but it has not delivered full
verified Router translation or runtime parity. The source checklist has
**8/70 DRAFTED bundles and62 OPEN** at this baseline. Five closed bundles are
policy/documentation, two are CI-source accounting/audits, and one is native
join emission. That is11.43% of an unweighted local acceptance checklist,
**not11.43% of the implementation**. No current executable-function percentage
has been measured. The historical163/2,570 result is not today's denominator.

A defensible unconditional completion date is unavailable. The working forecast
is **6–16 active team weeks for the bounded full Router objective**, with low
confidence, assuming stable scope, three source workers plus a coordinator,
reusable native-library boundaries and later authorized verification. A
favorable composition case could be shorter; major semantic/runtime gaps can
push this beyond three to six months. These are planning scenarios, not a
statistical interval or a delivery promise. The [forecast](forecast.md) records
assumptions, work packages, dependencies and reasons to revise it.

## Findings that change the plan

1. **Commit frequency is not the principal current problem.** The continuation
   after the #771 merge contains813 commits through this snapshot, with a
   median positive inter-commit gap of8.27 minutes. November1 alone contains67
   commits between00:11:37 and10:32:21 UTC, averaging6.48 commits per elapsed
   hour between those endpoints. Its median gap is5m44.5s. This is delivery of
   commits, not delivery of features or proof of continuous active work.
2. **The scope is larger than a one-way transpiler.** It includes native Router
   behavior, JavaScript-first development, Rust↔JS↔TS synchronization,
   ownership/effect/async semantics, complete source/CST history, exact edited
   inverses, copied-repository qualification, eight gated JS stages, fatal Rust
   CI, and upstream template/adoption/audit obligations. Original issue #759's
   nine requirements still apply. [Full mapping](requirements.md).
3. **The application inventory is still incomplete.** L01/L02 have1,512 path
   records and lexical anchors, but not a completed current function/feature/
   cfg inventory with every entry assigned. Without that, neither a credible
   global completion percentage nor a bottom-up full-scope estimate exists.
4. **Many rules exist; composition is the current bottleneck.** JSON scalar
   readers, Option defaults/filtering and primitive `to_string` rules already
   exist. Generated block-local aliases, canonical if-let readers, callback
   cascade order and complete opaque-corpus ingress prevent those rules from
   reaching some actual callers. More API declarations alone do not solve it.
5. **The implementation has spent substantial work on custody and provenance.**
   The301-path forward batch modifies48 existing paths and adds253;207 of its
   paths are under source profiles. Those full histories protect real source
   and overwrite contracts, but artifact count substantially overstates the
   number of new application behaviors. Repeated copying and per-family
   integration are real architectural costs to reduce.
6. **Current feedback is deliberately absent.** Source-only drafting excludes
   tests, translator/preparer trials, compiler diagnostics and CI/review
   inspection. We comply. It also means recent composition and performance
   assumptions remain unverified, so a precise completion forecast would be
   fabricated. This constraint does not explain every earlier delay.

## Evidence and audit method

Primary inputs are the original issue bodies, committed repository sources,
existing dated reports, the70-row acceptance checklist, handoff documents,
and read-only Git metadata. The original [#759](https://github.com/link-assistant/router/issues/759)
and [#772](https://github.com/link-assistant/router/issues/772) bodies are
preserved in [issues.json](evidence/issues.json). No issue comments or new PR
review/CI results were fetched. The older
[comparative case study](https://github.com/link-assistant/router/blob/ba7b1d9f99f9be16628fe433a097b1b8ff036f43/docs/case-studies/issue-759/README.md)
already contains dated external audits, retained evidence and nine-requirement
acceptance rows. This audit does not replace or silently redate that work.

The only executed analysis was bounded source/SCM reading and small metadata
arithmetic/source authoring. No project test, Rust tool, compiler, verification
parser, translator, preparer, benchmark, install, generation or receiving
experiment was run. Raw CI artifacts were not reopened; current CI statuses,
logs, artifacts and review feedback remain uninspected. Historical results
quoted from an existing document remain historical claims, not new observations.

Git records include author and committer timestamps and parent identities.
Cadence uses committer times sorted chronologically, not author times or
source-file mtimes. Raw records are split into250-line JSONL files, indexed by
[commit-cadence.json](evidence/commit-cadence.json). The separate817-line
[first-parent history](evidence/first-parent-commits.jsonl) is retained.
No timestamp is interpreted as billable time, operator effort, task-session
start or exact push time. Merged ancestry can contain other work and parallel
commits; it is not all attributable to one agent.

## Observed commit cadence

| Population | Commits | Observed endpoint span | Positive gap median | Positive gap90th percentile | Meaning |
| --- | ---: | ---: | ---: | ---: | --- |
| Reachable post-issue history | 2,726 | 535.12h | 6.13min | 27.78min | Includes5 merges and556 equal-timestamp adjacent records; not a pure task-effort metric. |
| First-parent post-issue history | 817 | 535.12h | 8.28min | 30.53min | Historical merges hide branch work; the219.22h maximum is not219h of proven inactivity. |
| Current continuation after #771 merge | 813 | 232.18h | 8.27min | 30.28min | No merge commits in this range; useful current-branch cadence, still not feature throughput. |
| November1 UTC | 67 | 10.35h | 5.74min | 21.23min | First commit00:11:37; last10:32:21. No gap over6h. |
| Published-base checkpoint to audit head | 10 new | 1.59h | See individual intervals | See individual intervals | Base08:56:43→head10:32:21:6.27 new commits/hour. |

Across the full reachable population, seven chronological gaps exceed6h;
the largest is25.11h. The continuation has two gaps over6h. The records do not
identify which were paused/user-directed/nonworking periods, so this audit
cannot label them policy violations or wasted work. In contrast, the current
November1 sequence has no six-hour commit gap. Git commit timestamps alone
also cannot reconstruct exact pushes per PR, CI-run count or CI minutes.

### Exact recent intervals, UTC on November1

| Commit | Time | Since preceding row | Source checkpoint |
| --- | --- | --- | --- |
| `bcbf96dcc` | 08:56:43 | baseline | Checkpoint source-only handoff and next bulk drafting scopes |
| `1115846eb` | 09:29:24 | 32m 41s | Draft source-bound constant array formatter operand proofs |
| `e5aabb2ef` | 09:46:20 | 16m 56s | Schedule independent constant-index Rust baselines in existing target |
| `632519574` | 09:56:07 | 9m 47s | Draft qualified JSON scalar reader and owned field successor |
| `684845832` | 09:58:17 | 2m 10s | Draft complete portable scalar native source visitor |
| `474f35dcb` | 10:00:41 | 2m 24s | Draft qualified JSON scalar integration and gated native oracle history |
| `fc8e183a0` | 10:11:54 | 11m 13s | Draft independent original token row precision and Unicode cases |
| `1ffa47320` | 10:14:27 | 2m 33s | Draft exact forward output ownership and source successor closure |
| `327fa26b7` | 10:17:59 | 3m 32s | Draft whole-source local closure and lazy Option candidates |
| `300ac16ab` | 10:22:02 | 4m 03s | Integrate forward custody and closure draft entrypoints and guidance |
| `ba7b1d9f9` | 10:32:21 | 10m 19s | Draft captured block-receiver Option source migration candidates |

A2m10s gap between scalar and portable commits is not evidence that the portable
family took2m10s to implement. Workers draft concurrently before serialized
commits. Likewise, the301-path commit appearing2m33s after an edge-case commit
represents previously accumulated work. Commit gaps are checkpoint latency,
not per-feature development duration.

## What has actually been delivered

| Delivered source family | Concrete committed evidence | What is still not established |
| --- | --- | --- |
| Physical language layout and substitution architecture | `rust/src`, `js/src`, `ts/src`; source/CST transport, checked meta and separately declared language/repository sequences. | Complete layout/package/export closure and all production constructs. |
| Nominal/collection/owned-operation families | Existing nominal, copied-record, text/vector, JSON/Option/callback, policy and static-accessor profiles; receipts linked from the checklist. | Whole current production coverage, full native runtime and all edited inverse domains. |
| Real owned output and native baselines | Persistent/dynamic/generalized output profiles, real String destruction, independent native cases. | Full tracing/provider/platform behavior and equivalence of arbitrary standard-library operations. |
| Qualified scalar170 successor | `632519574`:20new paths, seven whole virtual rows and170 complete source versions. | Full actual token-row/table admission, captured closures and all caller composition. |
| Native-only scalar transport and CI scheduling | `684845832`:8new paths; `474f35dcb`:fixed third native workload, full parent archive traversal and seven operational source histories. | Any new native/runtime/Windows/receiving success. Scheduling is source, not execution. |
| Forward output custody | `1ffa47320`:301paths; actual eight producers,16collectors, four sessions, preparers, current source equations and native TS origin. | Runtime/fit/platform/freshness and end-to-end synchronization qualification. |
| Local closure/Option candidates | `327fa26b7`:6new paths; `ba7b1d9f9`:8new paths, captured/block-receiver successor. | Original closure/std-owner equivalence, actual full-row admission and semantic edited-definition inverse. |
| Actual caller edge-case source | `fc8e183a0`:four original Rust row tests covering nine inputs and matching target expectations. | Execution; the actual translated whole-row helper is not yet scheduled. |
| Written execution/publication controls | D01–D05 source receipts; current3worker/single-publisher/source-only policy. | Future compliance, passing gates or release readiness. |

Path counts above are independently obtained from Git tree metadata in
[source-batches.json](evidence/source-batches.json); categories overlap. The
301-path batch's207 source-profile paths are68.77% of that batch's changed
paths. This is an artifact-composition observation, not68.77% wasted effort,
a byte ratio or a share of elapsed engineering time. Full original evidence
was explicitly required, and some custody work fixes real data-loss risks.

## Why progress has not converted into completion

### The hard part is defining correct mappings, not rule expressiveness

Substitution rules can express the algorithms needed. Turing completeness does
not provide the rules, the correct source bindings, evaluation order, ownership,
drop/lifetime behavior, runtime/library counterparts or unique reverse edit
mapping. These have to be implemented and composed. Source reconstruction and
valid syntax do not establish equivalent execution. This is an implementation
and specification workload, not a theoretical inability to translate.

Some costs are specific architectural choices here. Source-authenticated
private issuers, immutable full histories, many opt-in profiles and unchanged
predecessor APIs require careful whole-source succession. They protect
contracts, but repeatedly copying large adapters and rejoining each new family
increases work. A reusable extension interface and invocation-local factoring
can reduce that work while retaining complete histories and checks. They must
not become blanket namespace acceptance or a saved verdict cache.

### A single actual row shows the dependency chain

`rust/src/token_report.rs` has three local closures; fields/defaults/filtering;
expanded let+if-let readers; borrowed and owning results; lazy two-arm Option
formatting; named captures; and u64 precision. `print_table` adds HEADERS const
indexing, a JSON-slice loop, a helper call and output transport. Each individual
rule may exist while their composition still refuses the complete body.

The November1 source audit identified concrete shared gaps without execution:

- Original global alias censuses reject repeated `key`/`used` names in separate
  generated blocks. Existing chronological frames are reusable but gated by
  those global censuses. Shadow initializers need their prior binding until
  the new binding is published.
- Closure expansion introduces parenthesized and block-tail operands that old
  alias/carrier readers do not recognize. A syntactic candidate must preserve
  the complete binding and argument order rather than guess a type.
- The existing JSON selector handles get-chain scalar function items, but the
  already-expanded canonical let+if-let reader shape is a different source
  equation; the new scalar wrappers do not adopt it merely by existing.
- Placing local Option lowering after the other adopters creates qualified
  callbacks too late for the existing integer/text callback body cascade.
- Borrowed scope fallback cannot be silently replaced with an owning String:
  that introduces an explicit allocation/ownership migration.
- Directly importing the first constant helper into Host creates an eager
  module-initialization cycle. The successor needs a no-Host kernel and an
  actual Host-born private issuer, with early and late sealing.

These are review-backed source findings and drafted fixes/plans, not observed
passing behavior. The current source helpers and exact limitations are recorded
in the [live handoff](../../../../development/issue-759-handoff-20261101-cycles.md).

### Process and planning contributed too

The project has not yet closed L01/L02, despite that inventory being the stated
first priority. Work has often expanded a prerequisite family before proving
that a complete representative production caller and both edit directions can
use it. Many source profiles, custody layers and evidence repairs were added;
their local value does not make them the shortest route to full Router parity.
This mismatch between source output and accepted product behavior is a planning
problem as well as a technical dependency problem.

Source-only drafting now prevents short empirical feedback loops. It reduces
repeated heavy retries and enables larger batches, but it defers discovery of
composition, export and performance defects. It is not honest to claim that
all current drafts will work together, and it would be equally wrong to blame
the entire elapsed task on the user's current constraint. Earlier prioritization,
architecture and unclosed scope are part of the explanation.

### Resource limits matter, with specific evidence

Old reports record canonical generation around361seconds, a three-profile write
around1,434seconds, and a complete seven-stage frozen gate around4,355seconds;
individual commands measured multi-GiB RSS/footprint. Those are dated,
older-workload observations in the retained case study. The current gate has
eight stages and more source; those values are not a benchmark for this head.

Current source review also shows distinct envelopes: opaque Rust input20k paths/
8MiB file/64MiB corpus; small fixture128files/4MiB; per-event DATA16MiB; whole
CST2Mi UTF16 units; source-version table256; and original case deadlines.
Passing one envelope does not make a different layer accept the same input.
For example, a full8MiB source cannot simply be placed with both CSTs in one
16MiB event. Split-index reads can themselves modify shared-index times. A
new loader-origin fence has to track the actual loaded TS package, not the
current environment variable. These are concrete integration/resource costs.

No local Rust compilation is occurring, so it is not the current drafting
bottleneck. Disk pressure and historical tool stalls caused interruptions, but
this audit does not have active-session telemetry sufficient to assign them a
percentage of the22-day elapsed history. It does not invent that attribution.

## Actions with the best expected return

| Action | Why it matters | Completion evidence |
| --- | --- | --- |
| Close the production inventory and requirement/caller map | Makes scope finite and prevents hidden or duplicated work. | Every actual item/feature/cfg path mapped, unknown producers explicit; L01/L02 receipts. |
| Finish one full common-family source slice | Exercises composition across the actual full owner, metadata, targets and inverse. | Whole row/table source plus all required rule/runtime/reverse/receiving case source; no extracted-success substitute. |
| Reuse existing rules before adding operations | Scalar/default/filter/to_string already have implementations. | Scope/block/folding/cascade adapters consume actual existing kernels. |
| Factor common adapters and source histories | Reduces repeated integration while retaining original bytes and private proofs. | One reviewed extension point/shared storage protocol, all legacy APIs/refusals preserved. |
| Maintain a finite fixed adopter pipeline | Makes automated bulk work repeatable and inspectable. | Complete original/adopted universes and each residual/whole source equation retained. |
| Keep evidence debt explicit | Avoids converting authored cases into completion claims. | Source DRAFTED, local UNRUN, CI uninspected; qualified gains only after authorized complete observations. |
| Reserve a separate verification/repair budget | A large unrun draft is unlikely to pass every layer on its first run. | After phase authorization, complete Node/Bun/strict TS/current export/full gate then fatal Rust CI. |

These actions do not authorize early tests or CI inspection. Source work
continues under the current policy; later verification remains separately
authorized and Rust remains CI-only.

## Report contents and limits

- [Requirements](requirements.md): all nine original umbrella requirements,
  all70 local source criteria, subsequent user constraints, and this audit's
  new deliverables. These overlapping lists are not summed into a fake total.
- [Forecast](forecast.md): work packages, optimistic/working/adverse scenarios,
  confidence limits and update triggers.
- [Cadence evidence](evidence/commit-cadence.json): exact metadata calculations,
  complete raw-record chunk index and recent intervals.
- [Technical requirement baseline](evidence/technical-requirements-baseline.json):
  every original criterion and its source status, not a runtime assessment.
- [Original issue bodies](evidence/issues.json) and
  [batch metadata](evidence/source-batches.json).

This is an audit of delivered source and the plan, not proof that every current
implementation is correct. It deliberately leaves unknown coverage, latest CI,
exact push counts, billed minutes, current full-workload RSS and full acceptance
completion unknown. A later source or verified checkpoint should append an
update rather than silently redate the frozen observations.
