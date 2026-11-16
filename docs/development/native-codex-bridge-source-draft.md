# Native Codex loopback bridge source draft

SOURCE ONLY; all implementation, processes/daemons, tests, strict compilers,
translators/preparers and verification remain UNRUN. No local experiments or CI
feedback inspection performed. Full bulk drafting and translation are unfinished.

Paired JS/TS modules add the remote-origin Codex loopback transport and owned
Node daemon, wiring backend selection into actual client setup, configuration,
removal and undo. Localhost, IPv4 loopback and IPv6 loopback reuse the direct
origin; remote origins select an IPv4 loopback backend. The HTTP layer accepts
only the Codex backend namespace, preserves method/query/client auth/cookies,
strips transport/forwarding/nominated fields, streams safe upstream replies with
backpressure, bounds upload at8MiB and uses a15-second connection deadline. WS
reuses the existing full relay with exact upstream handshake and16MiB message
bounds, while the upstream Router retains actual token/model authority. Header,
body and connection limits remain explicit; unrelated management routes refuse.

The private JS engine state and filename are separate from Rust runtime state.
A child receives only its origin/state path/nonce/listen settings and necessary
Windows runtime variables, never administrator credentials. Startup, reuse and
shutdown freshly recheck actual state and nonce health. Shutdown uses the owned
nonce endpoint rather than signaling a recorded PID. Unhealthy live processes,
unknown engines and malformed/private-mode violations preserve state. Dead
records can be removed only after a liveness observation; newly spawned owned
children alone receive a direct termination on startup failure or failed
rollback after the state file changed. That fallback retains the actual spawned
child handle for this operation, preserves changed metadata and never signals
a PID selected from disk. Callback failure
rolls back only a newly started child. Existing healthy children are retained.
All loops, startup and stop probes have explicit deadlines. No daemon runs in
this source phase and no new dependency tree/native build is introduced.

Both clients.setup and configure require the actual configured backend to match
before idempotent reuse. Removal and undo stop only the owned JS bridge. Existing
global backups with a changed backend currently refuse until the remaining
managed repair contract reconciles their preserved hashes; no successful stale
backend is claimed. Process/disk/runtime authority remains independent of source
CST DATA or compiler namespace permission.

Nine complete implementation equations and actual full Rust bridge/client plus
existing JS WebSocket library inputs retain their native languages, actual byte
owners, both substitution phases and serialized/reparsed CST/full inverses.
Typed and generic source comment slots author the paired implementations.
Independent unrun source covers policy/header/body/HTTP/stream/WS frames, nonce,
owned startup/reuse/cleanup/failure, live-PID/foreign-state refusal, transitive
strict TypeScript, native policy/HTTP oracles and complete export/provenance.
The existing strict actual TypeScript entry follows these modules transitively.

Managed global repair, legacy catalog constraints, complete local discovery,
daemon/container/temporary launch/CA/platform lifecycle, all wider source
namespace/production/reverse/sync/freshness/parity/performance/receiving/CI-repair/
delivery obligations remain OPEN. There is no executable coverage, passing test,
process qualification or completed source/verified translation claim.
