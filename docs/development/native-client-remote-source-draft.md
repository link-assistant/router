# Persistent remote client source draft

SOURCE ONLY. Every implementation, case and source constructor remains UNRUN.
No local tests/compilation, translation/generation/preparer execution, experiments
or CI feedback inspection was performed. Full drafting and translation remain
unfinished; no new executable coverage or verified percentage is claimed.

The paired JS/TS implementation queries current management authority before any
persistent token write. Successful admin lookup mints an exact canonical
client-bound non-ephemeral credential; only 401/403/404 scope results can select
the supplied-token branch. An untrusted decoded payload grants no authority:
the live client-tagged inference catalog must authenticate its credential and
supply actual models. Other HTTP statuses, mint failures, malformed bindings,
redirects, unexpected origins, timeouts and cancellation remain fatal. Only the
bound client token is written to the private environment; administrator tokens
stay outside client files/metadata. Invalid minted bindings with a readable
subject are revoked; unusable responses without a readable subject cannot
establish a safe revocation ID and remain an explicit failure.

The existing bounded management HTTP transport supplies deadlines, byte limits,
redirect refusal, cancellation and optional separately selected inference and
management CA trust. This batch adds only the canonical client request header.
Existing intact credentials are authenticated freshly against both recorded
origins before reuse. Removal obtains current authority from environment or the
matching persisted selection and revokes at the recorded management origin;
it never falls back to a local token store. Supplied credentials remain
unrevoked by default. Setup rollback revokes freshly minted remote credentials,
and reports failed revocation without exposing credentials. Remote revocation
and local file changes remain separate failure domains, as in native ordering;
there is no claim of an atomic transaction across those authorities.

Seven complete source equations and four complete native Rust implementation
inputs retain both ordered phases, actual source owners, serialized/reparsed
CST and full inverse/provenance joins. One typed-slot source template authors
both languages; canonical generated TypeScript freshness remains deferred.
Independent source cases cover exact binding, all scope branches, unexpected
statuses, mint refusal, invalid binding cleanup, catalog/cleanup failure, live
reuse, remote revocation, actual private setup/removal/rollback, strict actual
TypeScript modules and a native binding oracle. Every case is unrun.

Remote health/discovery and broader native managed-server parity, global undo,
managed Codex loopback lifecycle, legacy catalog constraints, full production
translation/source namespace closure, reverse/full sync, freshness, performance,
receiving qualification, CI repair evidence and delivery all remain OPEN.
Stored native inputs are provenance, never a completed general native compiler.
