---
bump: minor
---

### Fixed
- `serve` stops when it is asked to. Only `ctrl_c` was awaited, so `SIGTERM` — what `docker stop`, Kubernetes and systemd all send — reached no handler; as PID 1 in a container the kernel applies no default action either, so the signal was discarded and every stop waited out the full grace period before a `SIGKILL`. An idle deployment took 30 seconds to stop, and any in-flight stream was severed at the timeout rather than allowed to finish. Both signals now stop the listener, in-flight requests drain, and the process exits 0 (issue #334).
- The HTTPS listener and the unix socket can be stopped at all. The graceful path existed for plain HTTP and the admin UI but the TLS path had no shutdown hook, and the socket could only be aborted mid-request; one notice now reaches all four (issue #334).
- An absent managed container is recognised however Docker spells it. The sentinel matched `No such object` case-sensitively while Docker Desktop writes `no such object`, so a container that simply did not exist yet was read as a hard inspect failure — the container that should then have been created never was, and `with` failed naming an internal container the user has never heard of (issue #333).
- An unreachable selected server says which server, and what to do about it. A refusal is still the answer — silently using a router other than the one selected is its own surprise — but the message now names the deployment, how it came to be selected, and the three ways out: `--local`, `--managed`, or `router server use <URL>` (issue #333).

### Changed
- The pending Claude login, the token transaction journal and the `with` rollback state are stored in links notation, joining the state converted in #235. Each keeps its existing file name and reads either encoding, so an installation migrates on its next write rather than losing what it had (issue #336).
- The request log stays JSON Lines for now, deliberately. Links notation is a multi-line format, and the log is appended one record per line and compacted by scanning for a newline — so converting it needs either a single-line emitter or a new framing plus a rewritten compaction cut-point, and the codec's existing single-line form base64-encodes every string, which would undo the readability just delivered for #328. It is the bulk of the bytes and deserves its own change rather than riding along with three small stores (issue #336).
- `lino_json` states the boundary it enforces: router-owned state is links notation, and vendor-owned state — Anthropic's `.credentials.json`, Codex's `auth.json`, the client `settings.json` files — stays whatever the vendor writes. The rule was real but inferable only from which module a write lived in (issue #336).
