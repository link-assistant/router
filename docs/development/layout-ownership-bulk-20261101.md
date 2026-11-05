# Physical layout and producer ownership source batch

This batch is SOURCE DRAFT ONLY. Every new and retained case is UNRUN. No parser,
translator, preparer, replay, compiler, package command, install, test or CI query
was executed while drafting. It does not close L03/L04/L05, source freshness,
receiving qualification, runtime parity, the platform matrix or S03 recovery.

## Active findings and retained layout APIs

`repositoryRustLayout`, `rustPackageSourcePath`, `crateEntrySourcePath` and
`crateRelativeRustSourcePath` already distinguish physical nested/standalone Rust
roots from logical crate-relative source names. Cargo manifest `src/lib.rs`,
Docker's manifest-relative targets, frozen archive strings and standalone fixture
`src` names remain unchanged. No blanket textual root replacement is appropriate.
JavaScript publication already runs from `js`; public package imports are
package-relative. Complete-peer bulk synchronization already checks native/Cargo
watch closure and changed-author/dependency agreement; this batch does not wrap it.

The concrete gaps repaired in source are the broad TypeScript managed-file
deletion and unchecked replacement loops, generated-prefix/schema-based reverse
cleanup, native TypeScript CLIs bound to the compiler installation, the missing
exported checker referenced by package scripts, and runtime assets absent from
JavaScript packaging and TypeScript discovery/compilation. A further copied-pack
gap was TypeScript's ignored `dist`: the generated private package now explicitly
includes `dist`, its actual compiled CLI bin, and receiving-root build arguments.

Both CLIs accept `--root` (or `--output-root`) and `--source-root`; the checker
retains `--out-dir`. Default commands still select the implementation repository.
Arguments are parsed before dynamic compiler import, binding the actual receiving
dependency root before private compiler initialization. Duplicate/missing/unknown
options refuse. `TRANSLATOR_ENTRYPOINTS` retains all old entries and adds the
referenced checker and the exact pure JS-first replay source dependency.

| Surface | Default source role and output rule |
| --- | --- |
| `js/src`, `js/portable` | Authored JavaScript producer inputs; no global Rust parity claim |
| `rust/src` | Authored native source, except exact declared `generated_js_first/policy.rs` and `mod.rs` output destinations |
| `ts/src`, `ts/portable` | Only actual fresh producer destinations may enroll; unknown neighbors remain authored/unmanaged |
| `ts/src/portable-draft`, `ts/src/js-first-policy.ts` | Declared JS-first outputs, governed by that producer's exact receipt, never broad native-TypeScript cleanup |
| `js/runtime` | Actual independently checked project runtime output/input closure; included in published JS package |
| `ts/runtime`, compiled `dist/runtime` | Real JS-to-TS runtime projections and emitted files; no fixture-created extension aliases |
| `tools/translation/**/generated`, `parity/*.json` | Exact producer-owned output rows only; report schema and generated comments are not overwrite/deletion permits |
| `translation/source-ownership.json` | Optional explicit authored/unmanaged project policy; takes precedence over prior generated bookkeeping |

The policy is closed data of the form
`{"schema":"router-explicit-source-ownership-v1","authored":["ts/src/manual.ts"],"unmanaged":[]}`.
Paths are exact, ordinary repository-relative names; no public force/adopt flag
exists. An explicitly protected destination must already equal the fresh output
for a no-op; it is never enrolled, replaced or removed. Removing ownership from
a stale row preserves the file and drops that row from future bookkeeping.

## Exact producer plans and ordinary regeneration

`layout-ownership-bulk-20261101.mjs` constructs bounded source proposals and uses
the existing `installFreshSourceProposal`. It introduces no parallel application
writer. The actual original producers still perform their complete source, CST,
inverse, runtime and semantic checks. Output bookkeeping supplies no compiler,
namespace, type, ownership-semantics or executable authority.

Each producer has a separate closed receipt containing every prior output's full
source and exact mode. Paths must remain in that producer's declared output
domain. Identical declared outputs may enroll after the actual fresh producer
reproduces every byte and mode. That enrollment is bookkeeping with no source
mutation. Absent outputs may be created. A differing current output requires an
exact prior producer row and current byte/mode match, or a genuine freshly issued
fixed-old-producer replay token. An edited generated peer refuses the entire
proposal. Unknown generated-looking neighbors are untouched. Stale removal
requires an exact prior row, exact current bytes/mode and a complete before inverse.
Check mode constructs the same proposal without installing it.

Receipts and the project ownership policy use the same COOPERATING/EXCLUSIVE
WRITER metadata boundary as installation. They are editable project DATA, not
cryptographically authenticated durable attestations. Arbitrary same-user hostile
rewriting of receipt, policy and compiler together is outside that boundary.
Normal uncommitted JS-first cycles are supported; no commit-after-each-generation
workflow is imposed. Hashes, generated headers and report flags never supply the
actual producer's semantic permission.

Application input trees are captured before production, including actual physical
JS/TS/native paired sources, Cargo/configuration, owned-definition inputs and
selected matrix profiles. Complete ordinary file bytes/modes and directory
device/inode/mode/mtime/ctime identities and child names close independently.
Missing source trees are recorded as absence and must stay absent during that
production operation. Explicit receiving source roots remain independent inputs
through guarded installation. Unknown symlinks, special files and bounds refuse.

`compileNativeTypeScript` collects actual compiler emission through the original
compiler callback; it no longer writes through `program.emit`, blindly copies
assets, or creates a `ts/node_modules` link. Strict source compilation reissues
before guarded installation. Bare dependencies resolve from the explicit receiving
JS dependency root; relative typed imports resolve against their real TS files.
The original synchronous return shape and strict diagnostics remain.

## Shared guarded replacement and deletion

The unchanged synchronous and asynchronous installer signatures now share one
internal adapter in `unit-runtime-materialization.mjs`. Both compare the received
proposal with the complete fresh producer result before writing. Async HEAD
checks remain. Existing positive mode-preservation behavior, including nonstandard
ordinary permission modes, remains supported by the common installer.

Before public changes, the adapter captures complete bytes, modes and inode
identities, stages all non-null after images exclusively, and makes known hard-link
backups in one fresh private directory. Public removal goes through a unique
quarantine name and captured identity/body/mode inspection. New targets install
through no-overwrite links. Failure restores originals through no-overwrite links,
quarantining only known installed outputs. Unexpected replacements are restored
when safely possible and retained for investigation; they are never blindly
unlinked or overwritten. Unknown private artifacts keep the recovery directory.

Every original input, external receiving input and output gets a closing attempt.
Cleanup revalidates ownership and contents before removing each known private
artifact. Any rollback/closing uncertainty preserves recovery bytes. Primary
thrown values survive secondary errors, including `false`, `null`, `undefined`
and nonextensible objects. Attached diagnostics are best effort only.
Unexpected quarantines are tracked separately and always retained, even if the
original public inode is independently restored before rollback. Primitive/frozen
primaries keep their exact value; retained recovery paths are also reported as a
bounded JSON record on stderr when properties cannot be attached.

This requires same-filesystem hard-link support and an exclusive/cooperating
writer. Node path operations provide no atomic compare-and-swap on inode identity;
check/rename or private check/unlink cannot exclude arbitrary hostile races.
Installation is a guarded multi-file operation, not globally atomic visibility
or durable crash recovery. Source readers must respect its transaction boundary.
The separately drafted durable leaf recovery API remains separately qualified.

## Fixed legacy migration and offline source replay

Legacy enrollment uses only fixed committed baseline
`cb759aab09305942d96802d5b2ec7cc72c9d2406`. The replay module reconstructs the
complete selected original compiler/application/configuration cohort from exact
Git blobs into a fresh isolated source universe. Current changed compiler files
do not enter that universe. Complete pure renderer copies preserve original build
functions while excluding old write/delete and CLI entrypoints. Whole original
sources and exact renderer extraction equations remain in the standard exported
source profile.

Canonical JS-first source controls include only the actually read native library
core files, Cargo/lock and the three exact reverse-owned/base64/ascii oracle files.
Unrelated later `rust/tests` oracles are not canonical migration inputs. Definition
lanes actually consume `sourceState`'s complete tracked `*.rs` set: all those real
source rows, including tracked tests/fixtures, remain in their fixed cohort and
changed membership refuses. Unrelated untracked Rust files are not enrolled by
that tracked-source API. Fresh actual producers retain their own complete checks.

Fixed Git object availability is an explicit legacy migration dependency. Copied
receiving repositories without that exact old object preserve their existing
targets and refuse legacy migration. Fresh/identical enrollment and normal cycles
do not depend on that object; copied migration is not claimed universal.

The original TypeScript 5.9.3 registry tarball must be available offline, either
at `ROUTER_ORIGINAL_TYPESCRIPT_ARCHIVE` or its npm content-addressed cache path.
Its full compressed bytes must match the original committed lockfile's SHA-512
integrity. Extraction accepts only bounded ordinary package files/directories,
verifies checksums, and rejects links, devices, unknown/PAX members and escapes.
No download, install or current TypeScript-code substitution is attempted.
The complete original lockfile dependency cohort is reconstructed as well,
including actual Node/application declaration dependencies used by inference.
Every package archive must already exist at its locked npm cache address, match
its own integrity and package name/version, and pass the same extraction bounds.
Missing archives refuse rather than borrowing current installed dependencies.

The fixed bootstrap invokes only the original pure artifact function. It retains
the original 120,000 ms child deadline, 1,792 MiB Node heap and bounded raw stdout/
stderr. Original source/dependency bytes and complete output JSON are bounded and
checked before admission. Every original child source and directory census closes;
unexpected changes retain the isolated universe. Successful cleanup checks all
known bytes, modes, inode identities and names before removing only that tree.
Failed universes are retained and reported, within the per-operation fixed bound;
the caller must resolve retained recovery paths before repeated migration attempts.

The current JOIN requires unchanged original authored source controls and exact
actual target bytes/modes. The sole approved configuration successor is the
complete `js/package.json` equation adding `runtime` to `files`; every other field
must remain exactly original. No partial old file is mixed with current compiler
scope. A single-use private weak token, reissued for every installation plan,
conveys the independently produced old outputs. Copied maps/tokens, missing old
Git objects, absent/corrupt offline archives, unknown current sources, changed
authored cohorts, nonreproduced targets or resource overages refuse. This is a
limited fixed-epoch migration domain, not general historical replay or a claim
that old checked-in generated artifacts were fresh. Exact actual output mismatch
always refuses.

## Chronology, resource and case boundaries

The old unit-runtime snapshot and every other frozen source remain byte-exact.
`layout-ownership-bulk-20261101-successor.mjs` joins only that complete predecessor
to the reviewed full authored installer source. The native leaf source history
retains its original predecessor-to-leaf-adapter equation and appends this known
successor. The native substitution-copy preparer composes that same exact named
equation inside nested histories; every other current-byte refusal stays intact.
No recursive invocation of the old preparer is used to resolve its successor.

Application proposals retain 8 MiB/file, 64 MiB complete retained source and
192 MiB wire limits with 4,096 source/census entries. Replay retains the original
32 MiB/source, 256 MiB total source/dependency data and 32,768-entry outer bounds;
all repeated retained source/output/base64/JSON occurrences charge conservatively.
Its admitted output set still fits the stricter common installer limits. No new
persistent source/type/verdict cache is introduced. Large complete cohorts may
refuse; these are source bounds, not measured peak-memory/throughput qualification.

All original case files and deadlines remain. Unsafe deletion assertions now
assert edited-peer refusal and unknown-neighbor preservation. Additional complete
independent case source covers ordinary cycles, identical enrollment, explicit
authored policy, stale quarantine deletion, mode conflicts, added/replaced source
directories, unexpected captured public replacements, rollback with falsy/frozen
primary failures, real fixed-original migration, corrupt archives, private-token
forgery, full source equations and copied package exports/bin/runtime execution.
The copied package case uses real `npm pack` and offline local installation only
when later authorized to run; it copies the receiving compiler/dependency source
and never creates `.mjs` aliases or depends on the original checkout at runtime.

No test, replay, pack, install or compiler command has run. Platform durability,
arbitrary history migration, binary source assets outside the UTF8 installer,
large over-bound cohorts, adversarial writers and actual packed receiving behavior
remain unqualified. Root publication and the eight same-SHA JavaScript gates
before fatal Rust CI remain unchanged.
