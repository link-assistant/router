# Local Router discovery and configure lifecycle draft

SOURCE ONLY; all implementation, compiler, translator, preparer and test cases
remain UNRUN. No coverage, speed, platform or runtime parity is certified.

Actual configure now honors explicit inference/management, environment and saved
selection first. An existing native Node managed registry takes precedence over
other local listeners. Its process/boot/HMAC/public-health proof is checked fresh;
only a live unclaimed bootstrap credential with its matching verified fingerprint
can be reused automatically. A claimed daemon requires operator credentials.
--local never starts a daemon. --managed bypasses discovery and refuses conflicting
explicit targets. Undo remains offline and performs no target selection.

With no selection or managed registry, candidate order is ROUTER_PORT, 8080 and
the available managed port, then Docker-published loopback ports. Read-only Docker
listing is lazy, limited to 1 second/64KiB/64 candidates and kills only its own
spawned listing child on cancellation or exhaustion. TCP connect is limited to
150ms; every accepting candidate must independently identify a Router through
anonymous /api/health. Discovery has a 3-second total budget and at most 1 second
per health request. Candidate lists are DATA, not a credential or ownership proof.
Injected bounded candidate/listing DATA still requires actual TCP and HTTP health.
Strict loopback host parsing and excluding UDP deliberately refuse broader native
substring matches; the native parser is retained as a full original, not silently
rewritten. Native Docker discovery itself still needs bounded-process alignment.

If nothing is running, configure may acquire the existing native Node daemon.
Each operation holds its own PID/boot/lease reference. Success keeps the daemon;
failure before any client succeeds stops only a newly started, unretained daemon
with no other references. Partial --all success explicitly retains the server
needed by completed clients. Existing running daemons, changed boot identities,
foreign registries and other operation references are preserved. The existing
separate Node registry never adopts Rust Docker state or signing keys. Docker
container/volume/lease parity, systemd, TLS/CA platform behavior, crash recovery
and cancellation across every configuration callback remain OPEN.

Nine full source equations produce paired JS/TS and actual configure/health/
managed integration through ordered language and repository rules with complete
CST inverses. Two complete original native files retain their pinned metadata and
final rechecks. Independent unrun cases cover actual TCP/HTTP identity, privacy,
non-Router rejection, port shapes/bounds, stalled health, cancellation, absent/
foreign/pre-existing registries, new daemon success/failure and partial retention.
The existing strict paired TypeScript case now loads the actual discovery module;
no compiler or application process was run while drafting. Native Rust candidate
edge-case oracle source is CI only after all eight same-SHA JavaScript gates.
All broader translation, reverse, synchronization, production, platform, receiving
qualification and delivery requirements remain OPEN.
