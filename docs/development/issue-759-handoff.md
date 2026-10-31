# Issues #759 / #772: checkpoint handoff

Updated 2026-11-01 (Asia/Ho_Chi_Minh). The user explicitly resumed bulk drafting
after the 2026-10-31 paused checkpoint. Work continues source-only;
no tests, compilation, trial translation or CI-feedback inspection are authorized.

## Repository and publication

- Repository: https://github.com/link-assistant/router
- Draft PR: https://github.com/link-assistant/router/pull/775
- Branch: `issue-772-translator-throughput`
- Integration worktree: `.worktrees/issue-759-storage-repair-20261021`
- Latest previously published checkpoint: `19074cc30`.
- Subsequent checkpoints included in this handoff: `4895f51aa` (join kernel),
  `db901a224` (complete additive caller/interpreter/inverse profiles), and
  `dbbbc9b12` (automatic array/push/join kernel adoption).
- This handoff's commit also includes the native readonly-text helper input
  draft described below. The final checkpoint SHA is the commit containing
  this document; the final user reply and PR description identify that SHA.
- The paused implementation checkpoint `b9e239a5b` and documentation checkpoint
  `9d29e99dc` were committed/pushed to #775. The 2026-11-01 resume supersedes the
  earlier stop instruction. Keep #759 and #772 open; no new merge is requested.

## Objective and honest status

The [countable draft checklist](issue-759-draft-checklist.md) now splits the
14 broad ledger areas into 70 stable source-draft acceptance bundles. Initial
accounting was **0/70 closed with complete source-review receipts; 70/70 OPEN**.
This is a conservative tracking baseline, not 0% implementation: existing
partial source work is substantial and has not been audited against the new
closure criteria. No honest drafted-effort percentage is available yet.
On a future explicit resume, first close L01/L02 by mapping actual production
source and unresolved features to the numbered rows. Then record concrete
implementation, both-direction/CST/meta and independent case-source evidence
before closing each row; keep all execution evidence separate. The checklist
defines dependency order, count updates and scope-change handling. Its creation
did not itself resume implementation or lift the no-execution policy. The user's
2026-11-01 instruction now resumes source drafting; all execution stays deferred.

The [source scope inventory](draft-inventory/README.md) starts L01/L02 with
1,512 committed source/test/build/package path records at `9d29e99dc`. A bounded
reconciliation library/CLI and independent case source are drafted, all UNRUN.
Exact functions, producer/configuration scope and actual caller/feature mapping
remain OPEN. The lexical review anchors are not a new function denominator.
Source review closes D01/D02/D03/D05 policy source and the new Q03 native join
emission source: **5/70 DRAFTED, 65/70 OPEN**, an unweighted requirement count,
not code coverage or verification.
All new inventory tooling/case source remains UNRUN and L01/L02 stay OPEN.

The objective remains full automated Rust ↔ serialized/reparsed CST/meta ↔
JavaScript and TypeScript translation and synchronization for Router, with
physical `rust/src`, `js/src` and `ts/src` trees, reusable compatibility cores,
ordered extensible substitution rules and JavaScript-first CI. It is unfinished.
The complete bulk source draft is also unfinished. No current executable
coverage percentage or full parity claim is supported.

All implementation/case additions in these latest source batches are UNRUN.
No local tests, compiler/parser/translator/preparer diagnostics, trial generation,
benchmarks, Node/Bun/vendor execution or Rust tools were run during drafting.
Python literal/regex/JSON/gzip source authors and ordinary source/SCM operations
were used. CI/review feedback for these checkpoints remains uninspected.
Historical evidence in older ledgers does not qualify this head.

## Instructions that persist on a future explicit resume

1. The user's later 2026-11-01 instruction authorizes up to three new
   GPT-6.1-sol medium agents for disjoint source-draft batches. Historical
   workers remain finished. The coordinator serializes commits and remains
   the only publisher. No tests, experiments or CPU-intensive workloads.
2. Continue bulk drafting every requirement before testing or experiments.
   Do not inspect CI statuses/logs/artifacts/review feedback or make CI-driven
   repairs before the complete draft exists. Preserve all later verification
   obligations. Never compile or invoke Rust tools locally.
3. Keep all eight JavaScript gates for the same SHA before fatal Rust CI.
   Do not weaken checks, deadlines, matrices or skipped-work accounting.
4. Translation has exactly `language`, then `repository` phases; extend rules
   within them or compose complete pipelines. Preserve lossless CST, serialized
   and reparsed meta, original source spans/trivia and full inverses.
5. Public names, source hashes, candidate counts and ABI flags grant no type,
   namespace, ownership, caller or runtime authority. Keep complete private
   source reissue and all original refusals; prefer additive copies.
6. Avoid new across-operation source/owner/input/verdict/result/failure caches.
   Invocation-local sharing must retain full source/closing/failure checks.
7. Keep files below 1,000 lines. `extensions/host-contracts.mjs` is 999 lines;
   use external modules or changes within existing dispatch/import lines.
   CONTRIBUTING.md is near its limit. Do not append to the old main bulk ledger.
8. Be careful with disk. Last observation was about 26 GiB free (95% used).
   No installations/builds/clones are needed for drafting. Clean task temporaries.
   Only identified Router-owned inactive caches/build directories are authorized
   for cleanup; preserve other work.
9. Commits may disable hooks: the installed hook invokes Rust cache tooling,
   which conflicts with explicit instructions. Use `core.hooksPath=/dev/null`.
   The sole publisher has standing push/PR-update authorization; do not ask again.
   During active drafting, use coherent source checkpoints every few hours and
   commits at least every six hours, while leaving CI feedback uninspected.

## What is source drafted

The collection companion links the full earlier history, including primitive
and owned String vector/slice cores, native and reverse caller paths, ownership
and helper checks, literal lowering, canonical inverses, source discovery,
failure-aware source protocols and compiler export/receiving case sources.

The join kernel validates a frozen dense String carrier and scalar UTF8 budget
in one pass, then allocates the output, with unchanged 4,096-value / 1 MiB UTF8
bounds and no value cache. Complete runtime/declaration/helper source checks and
receiving mirrors are drafted. It adds no ninth native core ABI; Rust lowering
uses a complete checked same-module fold helper.

Additive outcome/cancellation profiles include actual kernel import/type/caller
checks, full private ownership replay, distinct meta/issuer identities, Rust/TS
emission, both interpreters, actual runtime preparation and complete canonical
Rust inverse/reproduction. Kernel adoption has direct, ordinary-array/push/join
composition, discovery and paired JS/TS paths with exact conflict handling.
Original fold APIs remain unchanged. Source cases cover strict targets,
interpreters, meta/inverses, full boundaries, forged/stale inputs and ownership.

## Current native readonly-text draft

The existing `currentOwnedTextVectorCallee` rejected borrowed `&str` parameters,
blocking a native join helper's separator. The current batch adds a separate
private qualifier retaining the complete original caller/callee/parser receipt,
item identity, current snapshots, same-module/nonasync, type/ownership/primitive,
result and leading vector guard checks. Descriptor-only str shape selection is
not admission. The old qualifier stays exact.

A complete native flow copy additionally holds copied str referent loans through
later helper arguments. Existing 128-call, depth-32 and pending-loan limits,
returned-loan refusals, branches/loops and callback restrictions remain. This
prevents moving and restoring the String behind an earlier readonly argument.

Key files:

- `tools/translation/router-core-json-updates.mjs`
- `tools/translation/owned-text-vector-readonly-text-candidate.mjs`
- `tools/translation/owned-text-vector-readonly-native-flow.mjs`
- `tools/translation/owned-text-vector-native-flow-selection.mjs`
- `tools/translation/test/forward-owned-text-vector-readonly-text-source.test.mjs`
- `tools/translation/test/owned-text-vector-readonly-typed-targets.mjs`
- `rust/tests/translation_owned_text_vector_readonly_helpers.rs`

The target harness is a complete copy retaining workloads/deadlines/cleanup,
using and reporting lockfile TypeScript 5.9.3. Independent source cases include
ordinary readonly helpers, nested/shared/owned vector helpers, a complete join
fold, guard/source/body refusal, a positive owning-String/as_str baseline and a
later-argument move/restore rejection. Every case remains UNRUN.

## Native join emission draft and next dependency work

The [native join emission contract](owned-text-vector-native-join-emission-source-draft.md)
records the new Q03 source implementation and limitations. A complete canonical
native helper can now select a kernel call in target emission after existing
whole-flow/source/type/helper/dependency checks and exact renamed-body matching.
Altered helpers retain their original emission. All of this remains UNRUN;
there is no measured receiving, performance, coverage or parity claim.

Key additions: private `originalParsedDeclarationSource` over existing parser
associations; a DATA-only exact source matcher; post-flow private function-context
selection; exact complete-body selection inside the existing emission frame;
HostEmitter statement/prelude routing; complete fresh runtime/declaration assets.
No new source/verdict cache, public permit or native ABI is added. The seven
source equations preserve language/repository phases, full CST/inverses and
physical originals, with the readonly profile composing the new leaf.

Independent forward project/JS/strict TS source covers full 4,096-value/1 MiB
boundaries, raw elapsed/original deadline, altered-source fallback and stale or
forged inputs. `rust/tests/translation_owned_text_vector_native_join_kernel.rs`
provides independent standard-library expectations in gated CI only.

Continue L01/L02 exact function/configuration/producer review from the inventory,
then shared B/R/C and O-family caller batches with both-direction/sync/case/export
source. Wider iterators/collections/captures/references/aggregates, async/network/
state, complete namespace/producer/owner closure, production adoption, receiving,
all platforms, forward/reverse freshness and runtime parity remain OPEN.
Do not execute the new inventory CLI, preparers or cases while bulk drafting.

## Source regeneration and recovery

Current leaf:
`tools/translation/prepare-owned-text-vector-native-join-emission-sources.mjs`.
Its predecessor `prepare-owned-text-vector-native-readonly-text-sources.mjs`
composes it; the kernel-adoption predecessor composes that readonly profile; earlier join-caller, kernel, composition, literal and native source profiles
retain their explicit chronology. Complete source-equation archives and physical
original snapshots are committed under `tools/translation/source-profiles/`.
The native root history remains 24 equations / 17 paths. Kernel source pins and
the original helper producer are unchanged by the readonly batch.

Do not run a preparer or freshness command during the drafting phase. On a later
authorized verification phase, use the original complete commands/deadlines and
receiving cases; never substitute an inventory or focused result for full parity.
Do not rerun old source-author scripts after descendant changes: they can rewind
newer code. Canonical committed source-equation profiles are the replay path.
Local ignored `.router-source-draft-resume.local` and `.router-source-authors.local`
are optional recovery notes; this committed handoff and ledgers are authoritative
and sufficient without those local files.

## Ledgers

- [Countable draft checklist: 70 acceptance bundles](issue-759-draft-checklist.md)
- [Full requirements](bulk-draft-requirements.md)
- [Collection continuation](primitive-collection-synchronization-bulk-draft.md)
- [Native join emission source contract](owned-text-vector-native-join-emission-source-draft.md)
- [Readonly helper contract](owned-text-vector-native-readonly-text-source-draft.md)
- [Kernel adoption](owned-text-vector-kernel-adoption-source-draft.md)
- [Caller profiles](owned-text-vector-join-callers-source-draft.md)
- [Publication policy](bulk-draft-publication.md)

Continue the numbered dependency batches under the explicit source-only resume.
The full objective and all unclosed source requirements remain incomplete.
