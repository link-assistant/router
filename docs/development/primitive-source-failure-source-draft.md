# Failure-aware primitive source operation draft

Twenty-five complete source equations add a reusable synchronous source-failure
relay, copies of the three complete fresh-input readers and three current
source/ABI operations, plus sixteen actual compiler/caller/document/interpreter
consumer routes. Legacy public source and fresh-reader APIs remain unchanged;
new explicitly named source-synchronization exports select the stronger contract.
All implementation, independent cases, receiving and performance are UNRUN.

Only private source-input validation reports a source failure. Every selected
active source operation then remains invalid until it closes. Catching the
nested error, repairing a receiving map or restoring physical bytes cannot
revive its cached source facts or qualify a result. New nested operations fail
before using cached data. Ordinary application callback exceptions remain
separate and preserve exact thrown values, including null/undefined/symbols.
The relay can only revoke operations; no public signal can authorize one.

Fresh readers retain every original pin, byte/FD/type/no-follow/stat/UTF8/CST
check and whole input closing sequence. Their source loading/host/read checks
are separate from the application callback. Closing validators continue after
an earlier failure, even though the enclosing operation is already invalid,
and the complete closing protocol retains the primary thrown value. Original
family bounds and deadlines stay unchanged; the new aggregate relay stack has
an additional 256-frame bound. Family depth remains 64. Every frame and retained
source/AST/input reference clears at the original finally boundary. No source,
owner, hash, verdict, result or failure cache survives an operation.

The source/ABI copies retain their native/JS/declaration census, actual module
root edges, caller-independent DATA flags and complete fresh closing fences.
Private source helpers classify their own source/ABI failures, rather than
misclassifying a caller's ordinary application exception. Runtime behavior,
namespace/owner/type permission and full caller reissue remain independent.

Independent case source covers valid old/new fact equality, separate receiving
roots, caught source failure with restored maps, cross-family invalidation,
full closing callback execution, exact primary error identity, physical pin
failure with restored bytes, subsequent fresh operations, synchronous/depth
bounds, legacy API behavior and complete source-history inverses. These cases
have not run. Full owner/producer/namespace closure, original production caller
translation, synchronization, export/freshness/platform/parity/performance and
all delivery qualifications remain OPEN.
