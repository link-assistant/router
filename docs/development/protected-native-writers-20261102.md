# Specialized native writer ownership protection — source draft

This batch attaches the actual `translation/source-ownership.json` operational
veto to the specialized native leaf mover, durable apply/recovery and directly
exported durable I/O mutations. L04 remains OPEN pending the complete writer and
source-ownership review. All code, receiving, compiler/CST, recovery, history and
full verification obligations remain UNRUN. No existing proof, inode guard,
source scope, generated-source body or public flag is replaced by policy DATA.

## Actual writer paths

[`native-module-move-20261101-install.mjs`](../../tools/translation/native-module-move-20261101-install.mjs)
captures the original fixed policy before its real fresh native planner. Its
preflight includes both original leaf deletion and destination creation, plus
all original projection outputs. It retains the original complete fresh-plan
comparison, private scalar/project checks, source/cfg/import refusal domain,
HEAD and bytes/mode/inode guards, inode-preserving hard-link move, rollback and
cleanup behavior. Forward, reverse, staging, backup, quarantine and cleanup
filesystem mutations each receive the intended original/after source rows and
same captured policy checks. Internal transaction directory rows describe
creation/removal with an empty marker; they confer no source or compiler proof.

[`native-leaf-move-recovery-20261101.mjs`](../../tools/translation/native-leaf-move-recovery-20261101.mjs)
captures policy before fresh durable production and before independent recovery
proof derivation. Apply preflights the complete source/move changes before parent
anchor or journal creation. Recovery compares actual current source bytes with
the selected terminal direction before artifact mutations. Already-terminal
protected files can remain no-ops; finish/rollback changes to a protected source
refuse without starting new recovery mutations. Original interruption phases,
receipt/anchor/inode joins, unknown-data retention, durability/fsync and fresh
native proof checks remain mandatory. Directory creation/mode changes/removal
also pass through the operational guard.

[`native-leaf-move-recovery-20261101-io.mjs`](../../tools/translation/native-leaf-move-recovery-20261101-io.mjs)
protects direct calls to writeNew, writeReceipt, linkNew, unlinkOwned, renameOwned
and quarantinePublic, including quarantine restoration. Existing rename destinations are proposed as
actual removal plus creation, so identical bytes cannot hide replacement of a
protected destination inode. A genuine same-path or same-inode rename retains
its original native no-op behavior and matching protected-source rows. A direct call creates a
fresh scope; calls inside a larger same-root transaction share its original
scope and closing check. Each mutation retains its exact bytes/inode/mode guards.
Descriptor writes and fchmod check policy immediately around the actual change.
Post-open checking stays inside the original withClose, so a closing-policy
failure cannot strand an opened descriptor before its original owner receives it.
Matching existing receipts use the original fsync-only no-op lane. Read-only
open/stat/census and fsync APIs retain their existing signatures and do not
change logical source bytes or permissions.

The new [`protected-native-writers-20261102.mjs`](../../tools/translation/protected-native-writers-20261102.mjs)
reuses the actual common unit export `captureExplicitSourceMutationPolicy(root)`.
Its capture is an operational veto only. It checks the fixed policy around each
mutation, nests only synchronous writer work, retains the original aggregate
raw limits including policy retention, and closes on every exit. A detected policy/source-epoch
failure stays revoked even after its bytes are restored; ordinary writer errors
retain their original recovery behavior. The complete synchronous call chain is
bounded to 64 scopes across roots, in addition to the same-root bound; all operation references
retire when the outer call ends. There is no across-operation source, owner,
hash, verdict, failure or result cache. Closing failure preserves every exact
primary thrown value, including undefined/null/false/zero/empty string and frozen
errors; bounded secondary diagnostics cannot replace that primary.

This does not grant a callback, public policy flag or matching fingerprint any
native admission. Every real native producer and original private semantic check
still runs fresh. The source guard can only refuse a mutation. Paths and complete
source changes remain derived from each existing fixed writer; the policy cannot
manufacture a compiler result or permit an unsupported move/recovery protocol.

## Complete source ancestry

[Four immutable before/after source pairs](../../tools/translation/source-profiles/protected-native-writers-20261102/manifest.json)
retain the exact committed originals at the common API checkpoint and the full
new sources. The [history reader](../../tools/translation/protected-native-writers-20261102-history.mjs)
uses exactly language then repository substitutions, complete serialized/reparsed
CST/meta and full before/after/inverses. Hashes retain physical provenance only.
The assigned recovery-history API now joins the actual changed installer through
that exact frozen successor instead of discarding its old original source.
The older native move history keeps its frozen original transaction and consumes
the actual current installer as the complete authored after image; it is neither
reset nor silently rewritten. Source-history DATA never supplies native or
executable authority and is not saved generator freshness.

## Independent case source and limitations

[Direct I/O cases](../../tools/translation/test/protected-native-writers-20261102-io.test.mjs)
exercise authored/unmanaged creation, receipts, hard links, source deletion,
source/destination rename and quarantine protection, ordinary inode/mode behavior,
matching receipt no-ops, policy self-protection/malformed DATA, nested revocation,
fresh later scopes, exact falsy/frozen primary preservation and descriptor closing.
[Actual project cases](../../tools/translation/test/protected-native-writers-20261102-project.test.mjs)
exercise protected source/deletion/destination/root/review paths for both writers,
source-preserving native no-ops, capture before fresh production, independently
interrupted durable recovery, selected-direction veto before new artifacts, and
matching terminal protected no-ops. [History cases](../../tools/translation/test/protected-native-writers-20261102-history.test.mjs)
retain all complete source/CST inverses and the original native/durable caller
history joins. Every case is UNRUN; existing interruption, external-replacement,
consumer JS/strict-TS and native oracle obligations remain separate and unchanged.

Remaining gaps include the complete L04 writer census beyond these specialized
paths, all authored/generated/dependency classifications, full receiving source
binding/freshness qualification, actual original caller behavior and full same-SHA
verification. Quarantine restoration preserves the original regular-inode/no-overwrite domain.
It rechecks the same captured policy that already allowed removal/creation of
both names before quarantine; it does not invent source bytes or narrow the
unknown captured-data domain for a new policy proposal. No checklist source-draft receipt or coverage claim is
proposed. The complete production-function denominator remains UNKNOWN.
