# Serialization producer writer and layout draft

Both actual serialization producers now enter the common protected-source
policy before producing output. Native production captures it before the first
dynamic import/await; bulk production captures it before original source
discovery. Read-only calls retain their original policy-independent behavior.
Every public destination is admitted before the first artifact write. Each
actual missing-directory creation, exclusive temporary write, and rename also
uses the same captured canonical root and primitive filesystem targets.

An invocation-local AsyncLocalStorage frame shares same-root nested admissions
across awaits. Caught nested failures poison later writes; closed frames expire.
Every owner attempts policy closure after producer failure, preserving an exact
falsy or frozen primary. These are operational vetoes, not compiler permissions
or serialization/type authority. There is no cross-invocation verdict cache.

The native import patch now names `js/src/affinity-schema.mjs`. Apply mode accepts
the exact old source or the exact already imported source from the unchanged
reviewed plan. The latter skips Git application. Unknown apply-mode sources
refuse before output creation. The actual patch is pinned, supplied through
stdin, checked before artifact writes, and applied only under admission for the
actual native module. Git repository redirection from inherited GIT variables
is removed; the actual top-level must equal the admitted root. Local hooks,
fsmonitor, automatic GC and maintenance are disabled for these fixed commands.

The producers retain their original individual output bounds, temporary names,
exclusive creation, rename order, creation umask and readback. Bulk's four
16MiB outputs are not routed through a narrower aggregate transaction. Old
output bytes are not eagerly retained. Returned output maps are detached copies
of frozen internal destinations. An already protected identical artifact still
refuses write mode: the original writer actually replaces its directory entry.
Read-only check mode continues to compare bytes.

The complete compressed source packet retains three original/successor files,
four newly authored helper/case sources and the complete native module before
and after import, with exact inverses. The old original native hash remains
`b5e3ebccdc622f61e68760ee35319a895a7a3b81fde7e2bb43d02585ee04dbdb`.
The packet is105841 decoded/13642 compressed bytes; SHA256
`b908eeec0260d86f3a64deb25d34e8aac7706bd08130a6c27309d16ec040bf63`.
The source proposer uses exactly `language`, then `repository` rule sequences.
JavaScript source equations use the actual lossless CST transport and complete
inverse; the raw patch retains a distinct byte equation and grants no CST proof.
All original seven-owner/interpreter/layout checks remain in the native producer.

Independent operational cases cover malformed policy before actual generation,
protected late destinations, wx/umask/temporary behavior, caught nested poison,
exact falsy/frozen failures, restored policies, expired writers and read-only
compatibility. The explicit receiving entry uses the complete original compiler
fixture and actual producers for two imported-source writes, detached output
maps, full artifact readback and a protected final bulk artifact. Its existing
full-source resource and dependency obligations are retained.

All cases and source proposals are **UNRUN**. No compiler, translator, Node/Bun,
Rust, test or CI-feedback execution occurred. This draft does not establish
complete serializer trait-body translation, cold compiler owner closure,
recursive/custom serde behavior, restored-source epoch detection, Node import
cache independence, globally atomic publication, crash recovery, or exhaustive
native filesystem compatibility. Stage failures retain the original producer's
temporary evidence; no new automatic cleanup or rollback promise is made.
Receiving qualification, complete writer census and complete synchronization
remain OPEN. The acceptance count remains11/70 DRAFTED,59 OPEN; this partial
source work is not new function coverage or a verified completion percentage.
