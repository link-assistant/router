# Actual preparer and binary asset writer protection — source draft

L04 remains OPEN. This batch protects three concrete additional sinks found by
source review: `writeNativeSubstitutionCopy`, `writeMixedNativeSubstitutionCopy`
and the Rust shared-asset mirror script. All tests, parser/compiler/CST calls,
source-copy preparation, receiving checks and full verification remain UNRUN.
No complete writer census, source-draft receipt or executable coverage is claimed.

## Actual sink behavior

Both [native](../../tools/translation/prepare-native-substitution-copy.mjs) and
[mixed](../../tools/translation/prepare-mixed-native-substitution-copy.mjs) source
copy writers retain their original public signatures, caller fresh-production
obligation, all-file stale checks and actual `writeFileSync` byte APIs. Policy
capture precedes their stale/row inspection. Intended writes are captured once,
canonical relative target names are derived from the actual resolved destination,
and all target effects are preflighted before any row writes in sequential
1024-row batches (at most2048 truncation/fill intents). There is no new total
public-plan row cap: the original low-level writer did not require privately
produced64-row custody. Each actual write rechecks current policy and all physical
alias metadata. The original all-row source-byte stale check stays before writes;
it is not repeated against initial bytes after our own writes, preserving original
duplicate-path and unprotected hard-link sequence behavior. Set/iterable rows
retain the original second traversal through `Array.from`. CurrentAfter selection,
existing file modes and default new-file mode/umask behavior remain intact;
Buffer and TypedArray payloads reach the original writer without UTF-8 decoding.
The low-level development APIs still issue no native admission or gate stamp.
They do not invent a fixed producer callback from saved plan flags.

The common [preparer guard](../../tools/translation/protected-preparer-writers-20261102.mjs)
reuses the actual fixed source-policy operation from the common unit through the
specialized writer scope. It records the real default `w` truncation/fill effects:
identical final nonempty bytes cannot hide truncation of an authored/unmanaged
source. Paths with harmless internal `..` aliases canonicalize to the actual
protected target rather than bypassing its policy entry. There is no public
skip/force flag or hash admission. Newly observed mode/parent failures use
nullish-safe error inspection and preserve the exact original thrown value.
The original producer file/archive/count/native-input-fence bounds stay unchanged;
the new helper references the caller's existing source bytes and adds no invented
aggregate output cap or source/owner/verdict/result cache.

[`sync-rust-assets.mjs`](../../scripts/sync-rust-assets.mjs) retains the exact
original source list, binary Buffers, no-follow/size/readback/source identity
checks, 512-file/16-MiB bounds, mirror target names, unexpected-target refusal and
manifest content. Its `--write` path captures policy before source enumeration;
new parent directories, real binary mirror writes and shared-assets metadata all
use operational veto/closing checks. Current targets are rechecked before writes.
Identical mirrors and metadata retain their original skip behavior. `--check`
stays read-only and keeps the original stale behavior. An exported
`synchronizeRustAssets({root,check})` exposes that same complete operation for
receiving cases; the original CLI arguments, default repository root and JSON
result remain unchanged. This is still an iterative writer with its original
partial-failure behavior, not a newly claimed all-output transaction.

## Separate staged and in-place mutation policy

The common unit proposal adds `allowMutationPaths(paths)` for unconditional exact
logical names (including policy-self) and `allowDirectWrites({root,outputs})` for
actual create/truncate calls. Both retain verification, poison caught denials,
recheck on closing and preserve the exact primary thrown value. Existing staged
`.allow` keeps its equal-byte/mode no-op semantics while its admission failures
now also revoke the captured scope. No method grants native source permission.

The [invocation-local alias observer](../../tools/translation/protected-preparer-writers-20261102-alias.mjs)
walks actual symlinks, including dangling targets, and indexes authored/unmanaged
plus policy-self endpoints and existing device/inode identities. In-place writers
therefore veto unlisted symlink/hard-link aliases, protected symlink declarations,
and equal-byte/empty protected writes. Legitimate inspectable unprotected links
still reach the original writer. Caller output bytes never establish admission.
Dense arrays are copied from validated own descriptors before iteration; subclass
or inherited custom iterators cannot substitute unvalidated paths.

Each alias call bounds output paths4096, protected names8193, metadata nodes32768,
walk/lookups262144, retained raw metadata16MiB and symlink traversals256 per path.
All captured metadata closers are attempted independently of the exhausted main
budget: at most three per retained node. No persistent verdict/alias cache is
kept. Sequential sink preflight repeats the protected index per batch and again
per actual row: its cumulative cost grows with the original public row count;
this is not a claim of a new constant-cost or uncapped metadata operation.
The original native writer scope still accounts raw policy retention separately.

Compatibility-domain closure remains OPEN. Non-UTF8 link targets, uninspectable
protected endpoints, missing-path unresolved dot segments and any per-call
resource excess refuse. Ambiguous ASCII missing-name case equivalence and
non-ASCII missing-name equivalence in paired parent/tail-length groups also
refuse conservatively; those restrictions narrow the original public filesystem
domain. This is explicit unresolved compatibility work, not all-domain writer
completion. Metadata is observed and rechecked, not atomically locked with a
following pathname write: hostile concurrent link/ancestor substitution between
final admission and the OS write remains an unsupported race boundary. No inode
snapshot, digest or public policy flag proves private native custody.

## Exact source chronology

[Three complete frozen source pairs](../../tools/translation/source-profiles/protected-preparer-writers-20261102/manifest.json)
retain exact committed origins and every before/after byte. The native preparer's
immediate original is the immutable `e03938ec3` preparer-after image. It is not
silently rewritten or treated as an eternally current unit installer.

The [finite named history reader](../../tools/translation/protected-preparer-writers-20261102-history.mjs)
accepts exactly the two preparer paths and asset script. Each requires its full
frozen predecessor, full frozen successor and exact actual current source, with
language then repository substitutions, complete serialized/reparsed CST/meta,
whole inverses and explicit later chronology. For the older preparer-before
state, it freshly replays the original protected-source proposer on all three
complete frozen inputs, retaining its original preparer-after as the intermediate
state before the new sink protection. Unknown paths and altered original bytes
cannot inherit the successor through a matching flag or arbitrary digest.

Both source preparers consult this finite source DATA only when their original
physical-current comparison otherwise differs. The existing native unit path
continues through `knownLayoutOwnershipSourceSuccessor.currentAfter`, preserving
Root's subsequent exact installer chronology. Original source owner selections,
checked copied bindings, Rust CST separation, source fences, profiles, pin checks,
full before/after/inverses and both rule sequences remain in place. Source history
provides no namespace/type/owner/executable permission and cannot substitute for
fresh private compiler checks or establish saved generator freshness.

The [separate three-source direct-policy history](../../tools/translation/protected-preparer-writers-20261102-direct-history.mjs)
retains complete `c35bdcbaa` safe-error unit→direct-method unit, original344
scope-adapter→additive direct adapters and original safe-error successor→named
nested successor images under `direct-policy/`. The common files are integrated
by Root from those exact proposals. The original344 native writer source-history
catalogue contains four fixed installer/recovery modules; it never snapshots or
pins its separate helper. Those four frozen histories remain unchanged, while
the exact three-source packet supplies full helper ancestry. Historical safe-error
`after` remains historical; `currentAfter` carries the later direct-policy unit.
All proposals retain complete language then repository equations and inverses,
and require actual current physical joins when consumed as successor DATA.

## Independent source cases and remaining work

[Actual copy-sink cases](../../tools/translation/test/protected-preparer-writers-20261102.test.mjs)
cover preflight across multiple rows, authored/unmanaged targets, equal-byte
truncation, aliases, missing targets, default umask and existing mode behavior,
Buffer/TypedArray preservation, original stale checks, mixed Rust source-only
writes, malformed policy, policy changes during writes and exact falsy/frozen
mode errors. [Actual binary asset cases](../../tools/translation/test/protected-preparer-writers-20261102-assets.test.mjs)
cover non-UTF8 mirrors, original manifests/modes/no-ops, protected binary/metadata
paths, protected creation/parents, original link refusals, capture before producer
enumeration and exact falsy/frozen failures. [History cases](../../tools/translation/test/protected-preparer-writers-20261102-history.test.mjs)
retain exact source chronology and currentAfter joins. [Actual native/mixed
receiving cases](../../tools/translation/test/protected-preparer-writers-20261102-receiving.test.mjs)
exercise the two complete preparer epochs, unchanged native binding checks,
foreign paths and changed original bytes. [Alias and poisoning cases](../../tools/translation/test/protected-preparer-writers-20261102-alias.test.mjs)
cover real symlinks/hard links, dangling policy-self, empty/equal-byte sources,
protected declarations through links, legitimate unprotected aliases, custom
array iterators, explicit case/Unicode refusals, caught-denial revocation and all
metadata closers after exact falsy/frozen primary failures.
[Direct-history cases](../../tools/translation/test/protected-preparer-writers-20261102-direct-history.test.mjs)
retain all three common images and original344 helper ancestry. Actual sink
cases also cover more than4096 rows, denial in a later batch before first write,
iterable rows and duplicate/inode-alias ordering. Every case is UNRUN.

The complete actual writer/source-role census still requires review of other
standalone generators, emitters, source packets, evidence/proposal writers,
generated/copied modules, application runtime data writers and build outputs.
A lexical sink occurrence cannot classify an executable writer or a generated
string, and no absence of a spelling proves that a module cannot write. At the recorded source baseline there is no committed
`translation/source-ownership.json`; the policy remains explicit opt-in receiving DATA rather than inferred ownership.
No complete production-function denominator is recovered: it remains UNKNOWN.
