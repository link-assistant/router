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

# Let the backend use this machine's Claude Code login (issue #622).
TOKEN_SECRET='a-long-random-secret' router deploy --claude-credentials share

# Read-only report; TOKEN_SECRET is not required.
router deploy --status

# Remove serving containers and the private network, retaining durable data.
router deploy --down --yes
```

The default root is the configured Router data directory followed by `deploy/`.
Use `--root DIR` to select another root. Its `credentials/`, `data/`, and
`state/` subdirectories are durable; `--down` does not delete them.

## Anthropic credentials

By default the backend is isolated from the host's Claude Code login: it reads
only the deployment's own `credentials/` directory, mounted read-only. The
status output says so instead of leaving Anthropic silently absent:

```text
anthropic_credential=skipped source=/…/deploy/credentials reason=the directory is empty and the host Claude Code login was not requested; pass --claude-credentials share to use it
```

`--claude-credentials share` mounts the host's Claude Code home
(`$CLAUDE_CONFIG_DIR`, else `~/.claude`) at `/data/claude` in place, read-write,
and runs the backend as the owner of `.credentials.json`. Nothing is copied:
Claude.ai refresh tokens rotate, and two independent copies of one chain fork
it on the first refresh, logging one side out. Sharing the one file means a
refresh by either the host CLI or the backend is the other's next read, and
files Router rewrites stay readable by the host user. The status reports
`anthropic_credential=imported method=shared-mount source=… user=uid:gid
refresh_tokens_copied=0`; credential bytes are never printed.

The mode is part of the launch specification and is recorded on the backend.
An update without the flag keeps the active deployment's mode; passing the
other mode replaces the backend through the normal candidate-first update.

`share` is refused before any container is changed, with exit code 2 and the
reason, even on a host without a container runtime, when:

- there is no Claude Code home, or it holds no `.credentials.json` with a
  Claude.ai OAuth access and refresh token (run `claude` and log in first);
- the home or the file cannot be read, or the home is not writable (the file is
  replaced by rename beside it);
- the login lives in the macOS Keychain. Claude Code keeps its live credential
  there, and the file beside it is a snapshot nothing rotates; a container can
  neither read nor update the Keychain. Run `router serve` on the host instead;
- a file under `data/` belongs to another user, typically left by an earlier
  backend that ran as root. The message gives the `sudo chown -R` command.

Caveats: the host CLI does not take Router's per-credential locks, so a refresh
by both at the same instant can still race; Router then re-reads the file and
recovers from its rotated-token record. File locks are not reliable across
Docker Desktop's macOS file sharing.

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
only one process can advance a refresh-token chain at a time. An isolated
credential directory remains read-only; rotated-token recovery state is in the
shared writable data directory. A shared Claude Code home is mounted by the
old backend and the candidate alike.

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

## Inconsistent state

`--status` describes a deployment whose durable records disagree with the
containers instead of stopping at the first disagreement (issue #631). A relay
and backend that still serve while `state/active` is missing or unparseable are
reported with the record's condition, the relay pointer, the pending
transaction, and every container owned by the root (role, running state, image,
launch-specification version, relay port, and backend Claude credential
source), followed by the established connection count, the run inventory, and a
recovery plan:

```text
consistency=inconsistent reason="router-deploy-relay exists without a durable active deployment record"
active_record=absent
relay_pointer=router-deploy-backend-…
container=router-deploy-backend-… role=backend running=true image=ghcr.io/link-assistant/router:1.14.3 spec=local-v1 claude_credentials=isolated pointer=true
container=router-deploy-relay role=relay running=true image=ghcr.io/link-assistant/router:1.14.3 spec=local-v1 port=8080
connections=0
recovery_plan=adopt backend=router-deploy-backend-… image=… port=8080 mutation=active-record-only containers_unchanged=true
status_is_read_only=true
```

Status never changes a container or a state file, so it can be repeated; it
exits nonzero while the state is inconsistent. `recovery_plan=adopt` is offered
only when the pointer names a backend this root owns, with a known launch
specification, and the relay is owned by the same root. The next ordinary
`router deploy` then takes the update lock, keeps a corrupt record as
`state/active.corrupt-<time>`, and writes the record that the running topology
proves, without starting, stopping, or replacing any container. Established
streams and issued tokens are therefore untouched; the deploy then continues
as a no-op, repair, or rolling update. A record written by a newer Router, a
foreign relay, or a pointer to an unowned backend is never adopted:
`recovery_plan=manual` explains why and names `router deploy --down --yes`,
which retains credentials, data, and issued tokens.

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
