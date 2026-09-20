# Connection-preserving local deployment

`router deploy` manages a Docker deployment on the current machine. It keeps a
stable loopback relay in front of versioned Router backends, so an update can
send new connections to a verified candidate while established streams finish
on the previous backend.

```bash
TOKEN_SECRET='a-long-random-secret' router deploy

# An explicit release or digest may be selected. Moving tags are refused.
TOKEN_SECRET='a-long-random-secret' router deploy \
  --image ghcr.io/link-assistant/router:1.12.0

# Read-only report; TOKEN_SECRET is not required.
router deploy --status

# Remove serving containers and the private network, retaining durable data.
router deploy --down --yes
```

The default root is the configured Router data directory followed by `deploy/`.
Use `--root DIR` to select another root. Its `credentials/`, `data/`, and
`state/` subdirectories are durable; `--down` does not delete them.

## What happens during an update

Before changing serving state, the coordinator reports the old and candidate
identity, established relay connection count, credential ownership, and three
run-credential classes:

- `live-pinned`: a managed wrapper has an unexpired renewable lease and an
  exact-model policy.
- `stale-pinned`: the exact-model policy remains durable, but no current wrapper
  lease proves that the process is alive. This does not block an update.
- `legacy-unpinned`: the record predates exact-model policy. It is never treated
  as protected and blocks a normal update.

The candidate mounts the same durable Router data as the old backend. OAuth
refresh, login, and import use the shared per-credential transaction locks, so
only one process can advance a refresh-token chain at a time. The source
credential directory remains read-only; rotated-token recovery state is in the
shared writable data directory.

After direct candidate health succeeds, one atomic pointer update sends new
relay connections to it. The old backend is retained until its connection count
has reached zero. Candidate failure before acceptance rolls back to the old
backend. If the coordinator is killed around the pointer update, the next normal
deploy reads the durable transaction and either rolls back the unaccepted
candidate or finishes the accepted drain. `--status` never performs that
recovery; it reports the pending transaction and exits nonzero.

A second deploy with the same image, port, and launch specification is a true
no-op: it does not replace containers or rewrite the pointer, tokens,
credentials, logs, or configuration.

## Refusals and explicit force

The first upgrade from the older direct-container topology cannot prove whether
that container has established connections. A normal deploy therefore refuses
the migration without stopping it. A legacy-unpinned run or a requested change
to the stable listener port is refused for the same reason: interruption cannot
be ruled out.

Review `router deploy --status`, then use the deliberately named local-only flag
when interruption is acceptable:

```bash
TOKEN_SECRET='a-long-random-secret' router deploy --force-update
```

Before mutation, the force report names every affected legacy run by id, label,
and state, and reports the listener/connection impact. There is no anonymous or
implicit force mode.
