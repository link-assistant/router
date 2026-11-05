# Conservative native leaf module relocation source draft — 2026-11-01

This separately callable additive draft moves one unchanged external Rust leaf
file in the root source directory while preserving its logical module name and
all checked consumers/exports. Every new implementation, source history and
case is UNRUN. No parser, translator, preparer, compiler, test, benchmark, Rust
tool, CI query or review query executed. Earlier planners and their blanket
topology refusals are unchanged.

## Explicit operation and supported project

`tools/translation/native-module-move-20261101.mjs` provides
`planNativeLeafModuleMove({root, manifestPath})` and
`applyNativeLeafModuleMove(serialized, options)`. The closed request is:

```json
{
  "schema": "router-native-leaf-module-move-20261101-v1",
  "id": "leaf",
  "entry": "rust/src/lib.rs",
  "from": "rust/src/leaf.rs",
  "to": "rust/src/renamed.rs",
  "module": "leaf",
  "javascript": "js/src/leaf.mjs",
  "typescript": "ts/src/leaf.mts",
  "meta": "translation/leaf.json",
  "baselineRevision": null
}
```

The original physical library entry and Cargo layout stay fixed. The complete
native source directory must contain exactly the root entry and one external
leaf, with no other files/subdirectories. Source/destination are distinct
ordinary ASCII Rust filenames in that same directory. The leaf initially has
one hard link. All native/Cargo/paired source bytes and ordinary modes must
match one exact full current or ancestor Git baseline. Both physical targets,
review file and required registered runtime closure already exist. Existing
modified destination, source, owner, Cargo, peer or modes refuse.

The supported root contains only ordinary functions and one exact plain
`mod leaf;` or `pub mod leaf;`, optionally with one original `#[path]` attribute.
The leaf contains only ordinary functions. Function attributes, macros (including
unary-`!` expressions in this conservative token restriction), async, unsafe,
extern, includes, nested modules, inactive/unknown configuration and unknown
producers refuse. Checked signatures are scalar bool/fixed/string. Aggregate,
method, generated-method, constant and broader source scopes remain unsupported.

## Genuine source/namespace proof and complete projections

The original `resolveModuleGraph` constructs the actual full graph through Rust
CST transport. The operation requires exactly one genuine root-to-leaf edge,
the original privately sealed `isTrackedModulePathPlan` identity, exact original
module items from `originalSourceModuleItems`, the actual requested logical
module name, active scope and no graph diagnostics. Filenames, public path-plan
flags or source hashes never establish namespace/semantic permission.

The actual full original `translateProject` compiles the before universe with
fresh original macro/derive/Cargo proofs. Every declared ordinary function must
appear in the admitted executable set and its actual private checked-source and
target-binding facades. Refused/unlowered bodies, binding/module diagnostics,
methods or generated methods refuse; no unsupported source is silently carried.
Each checked owner, logical module, qualified name, complete function source
text, scalar signature and emitted binding is retained. Only source-coordinate
`span` fields are removed when comparing otherwise complete checked signatures.

The root CST edit selects the exact original module item/path-attribute span
from that genuine graph. It inserts `#[path = "renamed.rs"]` before the unchanged
mod declaration, or replaces only the original path attribute. The full original
owner passes serialized/reparsed Rust CST in fixed language then repository
order. A full equation/inverse restores every owner source byte.

The after universe has exactly the old leaf path removed, the new path added
with identical full bytes/mode, the checked root selection edit, and no other
source change. The original graph and full compiler run independently on that
entire after universe. Every admitted function/owner/export must match the
before set under exactly `to → from` source-path mapping. Complete emitted JS and
TS sources must be byte-identical before/after. This protects logical namespace,
actual root consumers and every admitted export rather than merely counting
module names. The private type/ownership/compiler checks still run in both
universes; graph/CST comparison alone never supplies them.

Original runtime mapping emits fresh physical JS/TS and registered runtime
proposals. Their current baseline must reproduce the complete original compiler
output exactly; changed/missing registered implementations/declarations/notices
refuse. All source outputs retain current complete inverses and JS/TS CST
equations; leaf history retains unchanged full bytes and an exact reverse move.
Review metadata retains the complete source mapping, admitted census, source
equations and both rule phases. It grants no semantic permission.

After an applied move is committed as a common baseline, the same request can
produce checked no-op: its old path must be absent, destination must be the sole
actual original explicitly selected leaf, full current/Git source universe must
match, and original graph/compiler/namespace/projection checks still run twice.
No-op emits no moves, source writes or metadata churn. Missing source plus a
similarly named destination alone never establishes no-op.

## Explicit guarded create/remove adapter

The generic existing installer accepts string outputs and therefore is not fed
null deletion rows. `native-module-move-20261101-install.mjs` supplies a complete
new fixed-producer adapter. It always reissues `planNativeLeafModuleMove` itself
and compares the complete serialized proposal. There is no caller-injected
checker/producer, force flag or saved receipt shortcut.

The adapter checks every captured source's full current bytes, modes, device,
inode, size, mtime/ctime, every ancestor's device/inode/mode, complete expected
native directory names and the same current HEAD before/between mutations. A
unique private mode-0700 transaction directory under the native root holds only
this operation's bounded stages and original backups; its identity is guarded.

Destination creation uses `linkSync(from, to)`, which atomically refuses an
already existing destination and retains the unchanged source inode. The
original leaf is then renamed into an absent path in that private directory;
the backup's full bytes/inode/mode are checked before the source is recorded as
absent. Root/review replacements retain exact original backups, use exclusive
complete stages, guard the original immediately before replacement and recheck
their installed inode/content. Unchanged projection rows are not writes.

On a mutation/readback failure, rollback restores only still-owned exact output
inodes/bytes. It recreates an absent original leaf via no-overwrite hard link,
removes only the still-owned exact destination after original restoration, and
cleans only unchanged own backups/stages whose original data is safely present.
An external replacement is retained. The primary thrown value is preserved;
where that value permits properties, `rollbackFailures` and `recoveryPaths`
describe retained recovery material. No recursive removal or unguarded unlink
of an authored path occurs.

After all mutation/readback guards pass, cleanup errors retain exact bounded
private backups and are returned as `cleanupFailures`/`recoveryPaths`; they do
not trigger rollback after some backups have already been discarded. This is
guarded in-process rollback, not durable crash recovery or batch atomic
visibility. POSIX checks and rename/link operations are not an atomic compare-
and-swap against arbitrary uncooperative external writers. Conflicts observed
at guards refuse/retain data; no complete interprocess isolation claim is made.

The original transaction source is fully preserved in the standard exported
`source-profiles/native-module-move-20261101/originals/unit-runtime-materialization.mjs.txt`.
`native-module-move-20261101-source-history.mjs` requires that original still be
exact, transports original/current authored adapter through both CST phases and
retains the complete inverse. This is full authored source history, not an
automatically derived adapter or generator freshness claim; its
`freshnessQualified` remains false. Existing transaction APIs are untouched.

## Bounds, independent cases and open scope

Original 8 MiB/file, 64 MiB complete raw source, 4,096 capture/census and 192 MiB
full serialized-wire bounds remain. Full baseline/current/projected/function-
source/review strings count; repeated serialized CST/meta occurrences count
without DAG discounts. Metadata fits 8 MiB before construction. Transaction
stages/backups are bounded by those complete proposals and never carry compiler
verdicts across operations. Private source/directory/HEAD/runtime/dependency
closing validators run on all planning exits and preserve primary failures.

`tools/translation/test/native-module-move-20261101.test.mjs` has complete tiny
real-project source cases for default/explicit path relocation, unchanged leaf
Unicode bytes, actual root consumers and qualified leaf exports, fixed bool/u64
behavior in JS/strict typed targets, committed checked no-op, existing destination,
source/Cargo/mode/name conflicts, nested/include/unresolved scope, forged/stale
proposals, cold copy, linked ancestors and full original/CST history. Deterministic
filesystem fault cases preserve an independently appearing destination and force
late metadata replacement failure to check exact source/owner/review rollback
and primary error identity. No production checker injection hook is introduced.
Whole translation cases retain 60,000 ms, typed children 20,000 ms, and the
existing test glob discovers the entire file. All are UNRUN.

General deletion, nested/multi-file/module-directory moves, includes/macros,
configuration/Cargo changes, complex consumers/aggregates/ownership scopes,
ordinary authored edits concurrent with relocation, cross-device moves,
automatic bulk adoption, facade/export integration, standalone receiving
qualification, durable crash recovery and broad production coverage remain
OPEN. The coordinator can integrate this explicit standalone operation and
complete source-profile closure later. No earlier/shared file is edited, no
broad synchronization receipt/count changes, and no full-parity claim is made.
Local Rust tools remain prohibited and all eight same-SHA JavaScript gates still
precede fatal Rust CI. All execution remains UNRUN.
