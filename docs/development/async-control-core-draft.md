# Shared async control compatibility core source draft

Thirteen explicit matching native/JS interfaces now draft cancellation,
shared cancellation clones, lazy waiting and sleeping, child-signalled
deadlines, bounded base64 byte channels, sender clones, pull receives, close
and disposal. This foundation is source only: no translator, runtime, producer,
compiler, experiment or test has executed.

The JS implementation reuses the complete existing lazy-future adapter by
import. Opaque handles hold actual runtime resources; their private maps are
not compiler source/type/owner/verdict caches. Cancellation is idempotent,
notifies current and later waiters, and clears completed subscriptions. Timed
operations receive a child cancellation handle that is signalled at completion,
timeout or parent cancellation. A zero deadline never constructs the operation.
Arbitrary callback/promise effects and abandoned future Drop behavior still need
their actual checked integration; runtime declarations cannot supply that proof.

Channels retain at most 32 queued chunks, a combined one MiB decoded byte
budget and 32 waiting sends. They reject noncanonical base64, preserve empty
chunks, apply backpressure and distinguish drained closure from cancellation.
Close rejects blocked sends while retaining queued data; disposal drops queued
data. Native receivers keep a sender alive until explicit closure so JS garbage
collection does not define stream termination. Receive, close and disposal need
an exclusive receiver. A sender waiting on byte capacity also observes channel
closure. Maximum delay is one day; these API bounds do not change any existing
CI workload or case deadline.

The catalog produces strict opaque declarations. Complete native root/producer
copies preserve the preceding Result root and retain both ordered source rule
sequences, complete CST equations and inverses. Independent JS and Rust oracle
source covers cancellation, zero deadlines, laziness, faults, backpressure,
byte-limit shutdown, empty chunks, invalid handles and close/drain behavior.
Opaque native type/call qualification, future/exclusive-borrow checking, both
translation directions, runtime asset/export closure, HTTP use and production
integration remain open with the rest of the requirement ledger. No parity or
production coverage is claimed for this foundation.

A source-drafted native-library implementation bridge now scopes an AbortSignal
subscription to one actual lazy awaited operation. It detaches on success and
failure and preserves fault identity. This supports HTTP implementation code;
it grants no portable callback, opaque handle, Drop or application qualification.
Complete runtime/declaration originals and independent lazy, active/preexisting
cancellation and detached-listener cases are retained and unrun.
