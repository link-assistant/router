# Physical language layout and copied-repository adoption

Router keeps JavaScript in `js/src`, TypeScript in `ts/src`, and Rust in
`rust/src`. Repository-relative source identities retain these full paths in
CST documents, manifests, source captures, Git baselines, rules and inverse
plans. `src/lib.rs` is a logical crate-relative label only where an existing
crate API explicitly accepts it. It is not the Router repository source root.

This guide describes source-drafted behavior. Full translation, current output
freshness, package receiving and parity remain unfinished and unverified. During
the current bulk-draft phase, do not run the commands or receiving cases below.
The complete [70-bundle checklist](issue-759-draft-checklist.md) remains the
acceptance ledger; an exported compiler or a layout fixture cannot close it.

## Source trees and ownership

| Path | Role and actual producer boundary |
| --- | --- |
| `js/src`, `js/portable` | Authored JavaScript and explicit synchronization inputs. Actual reviewed source-unit plans may propose exact edits. |
| `ts/src`, `ts/portable` | Mixed authored/generated targets. Only an exact fresh producer transaction owns its named outputs. |
| `rust/src` | Authored Rust and exact reviewed synchronization targets; JS-first policy generation uses `rust/src/generated_js_first`. |
| `js/runtime`, `ts/runtime` | Runtime sources or actual materialized project dependencies. Preserve every authored neighbor. |
| `tools/translation` | Compiler implementation, concrete/semantic extensions and reviewed source evidence. |
| `tools/translation/source-profiles` | Complete original/current source equations, inverse images and fixtures; reviewed evidence, not executable permission. |
| `tools/translation/meta`, `tools/translation/projects`, `js/generated`, `ts/generated` | Candidate producer destinations governed by each actual producer's closed domain and exact receipt. |
| `ts/dist` | Native TypeScript compiler outputs guarded by the original emit ownership transaction. |

The [role contract](../../translation/source-role-contract.json) lists actual
candidate roots, exact paths, producer receipts and profile coordinates. It is
informational DATA. It grants no write permission and must not be installed as
`translation/source-ownership.json`. Explicit authored/unmanaged protection in
that separate policy outranks receipts. Matching generated headers, names,
source hashes or manifest roles never authorize replacing or deleting a file.

For JS-first output planning, an observed ordinary `rust/Cargo.toml` selects
`rust/src/generated_js_first`; a root-only crate retains standalone
`src/generated_js_first`. Unknown/empty receivers preserve the original producer
domain while capturing manifest absence. Other-root stale receipts refuse
silent deletion after relocation. See the [actual producer adoption draft](physical-language-output-layout-draft-20261104.md).

## Adopt into a separate repository

1. Select a complete committed compiler checkpoint. Keep upstream pins, licenses,
   notices and complete historical source profiles. Do not copy dependency trees,
   build outputs, a task worktree, `.git` controls or saved runtime permissions.
2. Export compiler implementation separately from contribution guidance. The
   existing `exportFullAncillaryCompilerSourceVault` includes tracked compiler
   sources and ancillary suffixes. Explicitly include the new role DATA with
   `extraPaths: ['translation/source-role-contract.json']`; its location is
   outside the default compiler roots. This does not copy application sources.
3. Copy [reusable guidance](reusable-translation-guidance/README.md) separately.
   Adapt contribution rules, exact tool versions and publication authorization
   to the receiving maintainer's instructions. Router's permissions do not carry
   over with implementation bytes.
4. Create actual ordinary physical `js/src`, `ts/src`, `rust/src` trees. Supply
   the receiving repository's actual Cargo/workspace manifests, lockfiles,
   modules, source-unit manifests, package exports, CLI bins and installed
   dependency closure. Do not fill these with Router source merely to satisfy a
   path test. Retain authored files already present in every language tree.
5. Bind the original native TypeScript CLI's `--root` and `--source-root` to the
   receiving source explicitly. Resolve the receiving lockfile-installed
   TypeScript dependency before compiler loading. Do not use links or
   `NODE_PATH` to borrow the originating checkout. Existing APIs preserve their
   standalone-crate domains as well as nested Rust layout support.
6. For each actual source unit, use its real entry/module paths, authority and
   target destinations. Apply language substitutions before repository format
   substitutions. Serialize/reparse full CST at both stages, then independently
   check the complete semantic program and inverse. Public source DATA is never
   a type, ownership, namespace or translation verdict.
7. After source drafting and execution authorization, run the complete receiving
   export/import/CLI/package/runtime cases, strict TypeScript, actual edited
   inverse synchronization and full freshness/parity gates. JavaScript gates
   for the immutable SHA must all pass before Rust CI; Rust failure stays fatal.
   Never compile Rust locally for this task.

The compact vault has separate logical, encoded, decoded, per-file and source
count bounds. `materializeCompactSourceSelection` retains its original64MiB raw
selection bound and does not qualify a full exported compiler. Do not materialize
a smaller compiler subset and report whole receiving success, omit original
profiles, increase an established failing limit, or reuse cached source verdicts.
The [resource closure draft](receiving-resource-closure-20261101.md) records the
known full-corpus receiving gap and additive storage work. Export success alone
cannot establish a usable complete receiving compiler.

## Entry points and package checks

The complete compiler CLI inventory is
[`TRANSLATOR_ENTRYPOINTS`](../../tools/translation/translator-entrypoints.mjs).
Native TypeScript generation uses `scripts/regenerate-native-typescript.mjs`;
its check/emission CLI is `scripts/check-native-typescript.mjs`. JS-first
regeneration uses `scripts/regenerate-js-first.mjs`. Synchronization commands
must retain their own manifests, complete original sources and source ownership
checks; invocation from a different current directory must use explicit roots.

Preserve native package root exports, subpath exports, CLI executable modes,
source/declaration/runtime imports and JSON/schema assets. A packed package must
execute from an independent consumer without the originating checkout,
TypeScript tree links, temporary `.mjs` aliases or inherited source-root variables.
The [packed receiving case source](../../tools/translation/test/layout-ownership-bulk-20261101-package.test.mjs)
drafts actual JS/TS pack/install/exports/bin/runtime coverage. It remains UNRUN.
The [physical role receiving cases](../../tools/translation/test/physical-language-role-receiving-20261104.test.mjs)
separately draft full export retention and relocated layout-helper behavior;
operational layout cases grant no application translation coverage.

Keep all malformed, missing, stale, wrong-root, source-edited and explicitly
protected destination cases. Record unknown coverage and each original
receiving/resource/performance/freshness obligation in the handoff. Neither the
three directories nor a complete role declaration means translation is finished.
