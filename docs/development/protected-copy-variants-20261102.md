# Independent native-copy writer variants — source draft

L04 remains OPEN; the complete production-function denominator remains UNKNOWN.
All parser/native/compiler/CST/receiving/test execution and verification are UNRUN.
These are three concrete additional sinks, not a complete writer census.

Source review found that the failure-aware native/mixed modules are full copied
implementations, not forwarding wrappers around the protected base preparer.
Their private `writeNativeSubstitutionCopyValidation` and
`writeMixedNativeSubstitutionCopyValidation` still invoked actual `writeFileSync`
directly. The typed preparer has another independent public
`writeNativeSubstitutionCopy`. Their actual callers therefore did not inherit
the earlier base preparer policy checks merely by sharing exported names.

All three now capture the same actual common policy before original stale/row
inspection, preflight every bounded sequential batch before any write, and
recheck direct logical/physical/inode aliases at each actual write. They reuse
`protected-preparer-writers-20261102.mjs`; this batch adds no alternative policy,
permission flag, semantic issuer or persistent verdict cache. Original public
iterable row/count domain, duplicate-path/hard-link row order, currentAfter
selection, Buffer/TypedArray writer APIs and modes remain intact. The original
all-row stale pass stays before writes. Its initial-byte expectations are not
repeated after our own earlier writes.

The failure-aware public exports retain their original complete
`withSourceFailureOperation` / `withSourceInputValidation` nesting. Consequently
policy failures propagate through the original invalidation mechanism, including
caught nested failures; the new guard does not replace or weaken that mechanism.
The typed preparer keeps its original fixed JavaScript source-equation phase.
All original native compiler versions, owner/source selections, full-CST meta
transports, copied-source binding checks, source fences, original dependency
joins, archive/later-layer bounds and final source checks remain in place.

[Three complete before/after pairs](../../tools/translation/source-profiles/protected-copy-variants-20261102/manifest.json)
retain exact committed source revision/blob/physical-path origins. The
[finite source proposer/history](../../tools/translation/protected-copy-variants-20261102-history.mjs)
requires all original modules for the whole proposal, or one of exactly three
known paths and its complete original bytes for a named successor. Each step
retains language then repository substitutions, complete serialized/reparsed
CST/meta and full before/after/inverse. A successor also requires actual current
physical source to equal its complete named afterimage. Changed bytes and
unassigned paths cannot inherit a source history through hashes or public flags.

The existing `native-preparer-failure/complete-originals-and-rules.json.gz`
producer and its immutable `originals/` inputs remain unchanged. It still owns the
older native/mixed copy and original failure-invalidation substitutions; this
new exact successor joins only after its historically produced full source.
The three modified original preparers consume the finite successor when the
original physical-current comparison otherwise differs, then perform their
original fresh native binding checks against the actual currentAfter source.
No historical intermediate afterimage is rewritten to pretend it was current.
This source-history DATA does not substitute for private current native custody.

[Independent sink cases](../../tools/translation/test/protected-copy-variants-20261102.test.mjs)
cover all three actual writer exports, late protected rows, equal/empty writes,
real protected symlinks and hard links, more than4096 public iterable rows,
duplicate/inode-alias order, byte APIs, modes, stale checks, exact falsy/frozen
FS failures, and original caught-failure invalidation. [Whole source/receiving
cases](../../tools/translation/test/protected-copy-variants-20261102-history.test.mjs)
cover the all-three full-source proposal and inverses, foreign/altered source
refusal and each actual original preparer's fresh current-source join. UNRUN.

The existing direct-alias compatibility limits remain explicit: inspectable
UTF8 symlinks, bounded per-call metadata resources and conservative ambiguous
missing-name case/Unicode refusals. Those refusals narrow the original filesystem
domain; final metadata-to-OS-write races are not atomically locked. No all-domain
closure is claimed. The complete writer census still needs standalone staged
emitters, native descriptor/git-apply writers, packet/export writers, application
data writers, build outputs and generated/archived code classification. Lexical
sink search is only a worklist, never a production writer/function denominator.
