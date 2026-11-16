# Source scope review for the bulk draft

Source-writing baseline: `9d29e99dce4874a9c646e19db30f83fd04ee516c`.
This starts L01/L02 in [the 70-item checklist](../issue-759-draft-checklist.md).
It closes neither row. All new reporting/case implementation is UNRUN.

## What is recorded

`manifest.json` and seven `source-paths-NN.jsonl` chunks retain 1,512 committed
path records selected from the eight explicit source/test/example/benchmark
roots and the exact build/package inputs listed in the manifest. Each record
has its Git blob, mode, byte size, role hint, checklist assignments, explicit
unresolved reviews and optional lexical Rust function-name/line anchors.
The source-writing operation read actual committed bytes and refused a changed
worktree source rather than recording it under an older Git blob.

This is a path snapshot, not a function census. Function-name anchors were
authored from text occurrences, including possible comments/string/macro/trait
contents; they have no parsed item, owner, lifetime or configuration status.
Do not total them into an application-function denominator. Exact production
items, inline test distinctions and active cfg/feature/platform branches still
require source review and the genuine parser on a later authorized execution.
Every row starts OPEN with explicit unresolved items. Files without anchors
still require review; generated functions and include/macro bodies must not
disappear because no `fn` spelling was found in the containing file.

Roles and requirement assignments are authoring worklists, not exclusions:

| Role hint | Required next review |
| --- | --- |
| `native-application-review` | Actual production modules/functions, namespace/type/producer closure, complete forward callers and feature parity. |
| `target-application-review` | Authored/generated ownership, JS/TS editable subset, actual reverse caller mapping, parity and synchronization. |
| `compatibility-core-review` | Exact native implementation boundary, corresponding JS runtime/types, actual callers and both-direction contracts. |
| `test-example-or-benchmark-review` | Distinguish independent tests/oracles, shipping examples, benchmarks and any real application behavior. Never exclude by filename alone. |
| `build-or-package-input` | Actual entrypoints/dependency features/cfg/platform selection, layout, packaging, freshness and export closure. |

The manifest records explicit Rust library/binary/example/benchmark targets,
dependency features, target-specific dependency tables and canonical platform
profiles from source. No Cargo metadata/build tool ran. An absent local
`[features]` table does not prove absence of dependency feature effects. Complete
workspace/target/cfg producer semantics remain B02/B03 work.

## Reconciliation source draft

[`draft-inventory-reconciliation.mjs`](../../../../tools/translation/draft-inventory-reconciliation.mjs)
drafts bounded path validation, duplicate and assignment rejection, exact
added/removed/changed path reports, unresolved/unassigned lists and a
requirement-to-path index. It never treats a same-blob rename as equivalence.
File mode and size changes remain visible alongside blob changes.
The report deliberately returns null function/coverage/drafted-requirement
counts and false semantic authority. Even a fully reviewed path list does not
close any of the 70 source-draft acceptance bundles.

[`report-router-draft-inventory.mjs`](../../../../scripts/report-router-draft-inventory.mjs)
drafts a read-only report for an explicit immutable revision. It verifies
complete chunk bytes/counts, then uses the existing selected-Git-size reader:
select paths before requesting object sizes, with bounded paths/file/total
bytes. This is metadata bookkeeping, not a new translation lane; no compiler,
CST/meta or semantic issuer imports it. It cannot certify working-tree edits.
It writes no files, initializes no build/dependency tree and invokes no Rust
tools. A new file under a selected root cannot silently inherit an assignment.

Deferred use, only when execution is authorized:

```sh
node scripts/report-router-draft-inventory.mjs FULL_40_CHARACTER_COMMIT_SHA
```

The independent UNRUN source in
[`draft-inventory-reconciliation.test.mjs`](../../../../tools/translation/test/draft-inventory-reconciliation.test.mjs)
covers matching but unreviewed snapshots, explicit additions/deletions/changes,
mode changes, unresolved and unassigned paths, duplicate/invalid metadata,
selection boundaries and truncated/tampered chunk refusals. It makes no native
behavior comparison; a Rust oracle is inapplicable to this bookkeeping tool.
Translator/runtime cases and genuine whole-function checks remain T01–T05.

## Finish the scope without expanding it silently

1. Review each path and anchor against the actual module. Record production
   item identity and source ranges only after resolving comments, nesting,
   cfg/test/feature/platform and producer origins; do not promote lexical hints.
2. Map complete actual functions/features to their shared operation, namespace,
   forward/reverse, synchronization and case-source rows. Replace generic role
   assignments with precise caller/core implementation paths and missing clauses.
3. Review include/macro/attribute inputs outside selected roots, generated output
   closure, external dependencies and receiving compiler inputs. Explicitly add
   needed roots/paths to a versioned inventory; the current selection is not an
   assertion that those inputs are unnecessary.
4. Keep intentionally untranslated native dependency internals separate from
   application gaps. Do not narrow the original full-Router objective by marking
   a production module outside the inventory.
5. Update changed records and chunk descriptors together, retaining the original
   baseline/history. The deferred report must keep unmatched paths open; neither
   updated fingerprints nor matching data close L01/L02 without source receipts.

The inventory/reconciler source draft removes the lack of a concrete worklist.
It does not remove original namespace/type/ownership prerequisites or prove full
source scope. No tests, translation, regeneration, compiler diagnostics,
benchmarks, CI statuses/logs/artifacts or review feedback were executed/read.

## Additive current source scope (2026-11-02)

The [current source scope draft](../draft-scope-20261102.md) retains a separate
`2e56446e4256d97bc5ec21867d3f6dadbb99dde9` archive across the complete physical
Rust/JS/TS trees and package assets. It preserves this original 1,512-path
snapshot unchanged, current-byte-joined stored-meta observations and stale-meta
diagnostics, a small actual manual trait/impl/inline-test/nested-test/closure/
entrypoint/generated-producer review, and detailed adoption reconciliation.
The deferred CLI refuses acceptance while changes, unassigned entries or any
source/producer/adoption gap remain. The original production-function denominator
remains UNKNOWN; L01/L02 remain OPEN and all new verification is UNRUN.
