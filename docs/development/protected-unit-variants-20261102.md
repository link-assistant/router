# Independent unit transaction policy composition — source draft

L04 stays OPEN. Full production-function/writer denominator is UNKNOWN; no draft
receipt, verified gate or all-domain safety is claimed. All tests, CST/parser,
native checks, actual production/receiving and verification remain UNRUN.

Source review found three independent original unit implementations still
performing their own staging/rename/rollback transaction. Protecting the common
installer did not cover those copies. This batch retains the actual bodies in
`synchronize-units.mjs`, `synchronize-owned-project-units.mjs` and
`owned-project-runtime-materialization.mjs`, rather than delegating to a later
installer with different mutation and rollback behavior. The last also exports
its own runtime-only apply and generic `installFreshSourceProposal` operation.

The [shared composition helper](../../tools/translation/protected-unit-variants-20261102.mjs)
captures the actual common `captureExplicitSourceMutationPolicy` before fresh
production. Original complete submitted/fresh equality, real private planners,
Git baselines, original-source checks, output readback, byte APIs, modes, receipt
shapes and rollback order remain. Public source outputs get staged `.allow`
admission; missing directories, exact temporary write/chmod/unlink names and
actual rename source/destination names get `.allowMutationPaths`. Staged
replacement of an unlisted hard link may safely replace that directory entry
without truncating a protected inode; it does not get false in-place semantics.
Original byte-restoring rollback gets alias-aware `.allowDirectWrites`. This
blocks a later external hard-link substitution from redirecting rollback bytes
into an authored/unmanaged source or the policy file. Known no-op outputs still
skip all mutation and keep their original inode/mode.

Nested same-root unit operations reuse the active captured scope, so a caught
inner policy veto revokes the outer operation as well. No state survives the
outer close. Every actual forward, cleanup and rollback mutation verifies the captured policy
before/after. Each independent cleanup and policy closer is attempted after
failure; revocation can intentionally retain a temporary rather than delete
under a changed policy. Original rollback refusal of externally changed output
bytes stays in place. Rollback diagnostics now attach without masking exact
null/falsy/frozen primary values; opaque diagnostic fields are not invoked. This
is the original cooperative iterative transaction, not a new atomic conditional
OS write or durable crash-recovery mechanism. The common policy remains only an
operational veto and supplies no native source/type/owner permission.

The original private planners'64MiB source-retention checks now include active
same-root captured policy retention without altering serialized
`retainedSourceBytes`. This keeps original submitted/fresh equality meaningful.
The generic public installer had a separate192MiB serialized envelope and did
not enforce private planner custody or a64MiB total. That public successful
domain is retained: its final actual string/null input/output bytes plus policy
retention use the original192MiB envelope. Reported counts/flags do not establish
admission; actual bytes are recounted. Per-file, unit/archive/native-source and
original serialized limits remain. Native/direct alias metadata has its own
explicit bounded transient observation costs; this is no total heap guarantee.

[Four full source pairs](../../tools/translation/source-profiles/protected-unit-variants-20261102/manifest.json)
retain exact revision/blob/physical origins for the three units and the one
finite history bridge. The [named proposer/history](../../tools/translation/protected-unit-variants-20261102-history.mjs)
retains full before/after/inverses and exactly language then repository
substitutions with serialized/reparsed CST/meta. Actual current physical source
must equal each exact afterimage. The existing preparer-history helper delegates
only to those four fixed new paths; its three original sink histories retain
their historical afterimages and currentAfter semantics. Active native preparer
source is unchanged. Unknown paths or altered predecessor bytes remain refused;
source equation DATA and hashes never replace original native bindings.

The prior144 copy-variant case had three malformed regexp delimiters. Its entire
original and corrected source are preserved in this profile. The [named case
successor](../../tools/translation/protected-unit-variants-20261102-case-successor.mjs)
uses exactly two raw source rule phases and retains the complete inverse.
Corrected source receives a full CST; the malformed predecessor is explicitly
raw DATA rather than falsely claimed valid parsed JavaScript. Production source
was unaffected by that case authoring correction.

[Actual generic transaction cases](../../tools/translation/test/protected-unit-variants-20261102.test.mjs)
cover protected later outputs, staged no-ops, safe hard-link replacement, exact
private temporary names and new parent creation, original rollback after opaque
failure, direct rollback into a protected inode alias, policy capture before
callbacks, and the actual generic envelope above64MiB (first write intercepted,
no large disk output). [Original full producer cases](../../tools/translation/test/protected-unit-variants-20261102-producers.test.mjs)
use each original synchronizer/runtime planner and apply path, protected outputs,
forged-source refusal, actual modes and byte readback. [History/receiving cases](../../tools/translation/test/protected-unit-variants-20261102-history.test.mjs)
retain four whole source histories, original three-sink ancestry, actual native
preparer current-source joins and the raw malformed-case correction. All UNRUN.

Compatibility closure remains OPEN for the existing direct-alias profile's
missing-name case/Unicode ambiguity, nonUTF8 symlink targets, uninspectable
protected endpoints and per-call metadata bounds. Metadata checks are not an
OS-level lock against hostile concurrent substitution. A further staged-policy
boundary is OPEN: exact logical names alone do not prove physical directory-entry
identity across existing case/Unicode aliases on case-insensitive filesystems or
a protected symlink declaration whose target entry is replaced. Blanket inode
veto would wrongly reject legitimate distinct hard-link entries. Closing that
gap needs actual native parent/entry/physical-endpoint observation and explicit
ambiguity refusal; this batch does not claim to implement that additional API.
Other actual standalone
emitters, native descriptor/git-apply writers, packet exporters, application data
writers, build outputs and generated/archived sources still require census and
source-role mapping. Lexical search results are worklists, not a denominator.
