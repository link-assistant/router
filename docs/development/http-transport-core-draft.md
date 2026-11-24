# Guarded HTTP transport core source draft

Eight matching native/JavaScript interfaces now draft explicit clients, cloning,
disposal, request opening, response heads, bounded pull reads, stream closing
and buffered sends. Opaque resource caller qualification remains open; this
foundation alone does not translate network application functions.

The Rust implementation reuses the complete existing `NetworkPolicy` and
`GuardedResolver`. JavaScript matches its IPv4, IPv6, mapped/compatible/NAT64,
localhost and metadata-name classification. The explicit policy applies to
literal URLs and every actual DNS result at connection time. Unknown allowance
words do not widen access. This interface performs direct HTTP/1 connections
with redirects, automatic proxy lookup and automatic decompression disabled.
Proxy/SOCKS, TLS trust configuration, HTTP/2 and upgrade callers still require
their own matching native interfaces and qualification. Production calls have
not been adopted or redirected through this core.

Connect, first-response and idle-read timeouts are independent milliseconds.
Zero disables each bound. There is no total response deadline. Native cancellation
and the scoped JS AbortSignal bridge abort an actual opening or pull operation
and clean subscriptions. A cancelled pull closes its stream. Heads sort header
names while retaining values in each name's order; that explicit contract avoids
depending on native HeaderMap's ordering between distinct names. Status redirects
remain responses and never forward credentials to their Location destination.

Requests use the checked pure HTTP request shape. The transport supplies framing;
CONNECT, upgrade and explicitly listed connection/framing headers refuse.
The JS raw header array explicitly includes the normalized URL authority as Host,
including a nondefault port and bracketed IPv6 authority. Reading the official
[Node 20 client source](https://github.com/nodejs/node/blob/v20.19.0/lib/_http_client.js#L266)
identified that raw arrays bypass Node's automatic Host insertion. Complete
runtime/source-provider originals and ordered correction rules are retained;
the independent host-header case remains unrun.
The request body is bounded by the existing encoded HTTP body contract. Each
read returns at most 64 KiB, with at most one MiB of pending bytes. Chunk boundaries
depend on network delivery; concatenated bytes retain their order. Clients share
a 32-active-request bound, and explicit stream completion/close releases it.
Buffered sends retain at most 786,432 decoded bytes. Streams support one actual
exclusive pending read. Head/close during that read refuse in JS, corresponding
to the native borrow restriction. Abandoned future/resource Drop behavior still
needs caller qualification; runtime declarations do not establish it.

Complete source observations retain native/runtime/policy/declaration inputs,
actual module edges, complete CST inverses and the public operation census.
They explicitly grant no semantic/type/owner authority. Native root preparation
is a complete copied producer with ordered language/repository substitutions and
all predecessor inverses. Receiving runtime closure includes cancellation, policy
and HTTP support; copying it cannot qualify an opaque client application.

Receiving closure preserves nested support paths and an explicit list of Node
builtins without permitting application imports to bypass operation checks.
The typed source preparer and lexical binding checker are complete copies of the
existing JS implementations. They select the real TypeScript parser/CST language
for declaration files, keep the original helpers unchanged, and retain ordered
source substitutions and whole inverses. Lexical scope checking remains separate
from strict receiving compilation and native semantic qualification.

Independent local-server JS and native Rust oracle source covers binary data,
empty bodies, duplicates, credential retention, redirects, literal policy refusal,
clones/disposal, timeouts, continued long streams, cancellation, exclusive access
and buffering bounds. None has run. Source drafting used the existing Router
implementation plus the official [Node HTTP reference](https://nodejs.org/api/http.html)
and [reqwest ClientBuilder reference](https://docs.rs/reqwest/0.13.3/reqwest/struct.ClientBuilder.html).
The latter describes 0.13.3; this repository locks 0.13.5, whose new source still
requires gated CI compilation. No compiler or runtime qualification is claimed.

Both caller translation directions, opaque/future/Drop rules, production adoption,
remaining protocol modes, receiving qualification and the other requirement ledger
rows remain unfinished. No test, translator, preparer, experiment, Rust tool or CI
has executed during this source draft.
