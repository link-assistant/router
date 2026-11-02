# Fixed native diagnostic descriptor source draft

The additive protected diagnostic route now uses a captured native `fs.writeSync`
operation with the literal descriptor2. A mutable `process.stderr.write` member
cannot redirect the effect after FD2 admission. Every current/captured root veto
and closing check from the original diagnostic mechanism remains. The old
no-collector route still uses the original stream API and remains explicitly
unguarded; no legacy API domain or original payload is replaced.

The fixed writer encodes primitive message strings in at most16384 UTF16-unit
chunks, preserving surrogate pairs across boundaries and ordinary UTF8 lone
surrogate replacement. Each encoded chunk is at most49152 bytes. Actual partial
writes must make positive bounded progress; every byte is attempted before a
successful delivery receipt. There is no new total message-size limit. Real IO
failures, including nonblocking backpressure, retain the actual ordinary error
and diagnostic DATA; partial delivery is not reported as complete. No busy
retry, native FD flag mutation, borrowed FD close or source-veto bypass occurs.
This synchronous additive route can differ from the legacy stream's deferred
buffering; backpressure/resource/platform qualification remains unrun.

Caller-owned collector instances, their actual prototype and class are frozen
using the captured freeze operation. Reflected subclass constructors refuse.
The existing private run brand remains, and retention requires primitive text.
These DATA controls provide no source, native or semantic permission.

The immutable original twelve-parent packet and collector creation image stay
unchanged. A separate complete three-parent packet retains this implementation,
the original source proposer and its full original case. Its finite named join
keeps the historical collector AFTER and appends currentAfter plus complete
later source/CST/inverse evidence. Source histories grant no writer permission.

Actual child cases cover a redirected stderr member that would otherwise mutate
a protected file, regular-file output across Unicode chunk boundaries, a real
read-only descriptor, exact falsy/frozen veto primaries and healthy policy
continuation. All case files, strict checks and native/platform qualification
are **UNRUN**. Legacy diagnostics, temporary-directory precreation, built-in TAP
consumer effects, Python/Bun/transitive children and complete writer/function
denominators remain open. CI feedback remains uninspected until bulk drafting
is complete.
