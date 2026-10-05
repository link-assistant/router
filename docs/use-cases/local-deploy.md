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

## Configuration file, runtime variables and instances

`router deploy --config FILE` takes its settings from the same TOML file a
remote deployment uses; see the
[remote deployment guide](remote-deploy.md#declarative-configuration) for every
key. A local run reads `[deploy]`, `[local]`, `[env]` and `[tokens]`, and
command-line flags override the file. Provider keys and verification profiles
apply only to remote runs; SSH flags, `--provider-key` and
`--verification-profile` are refused locally with status `2`.

`--env NAME`, `--env NAME=env:VAR` or `--env NAME=file:PATH` passes a runtime
variable to the backend by name, in a container or in host mode. The value is
placed in the process environment and never in argv. An HMAC fingerprint of
the names and values is part of the launch specification, so changing a value
reconciles the deployment exactly as changing the image does. `--instance NAME`
suffixes the relay, network and backend names and the default root
(`deploy-NAME/`), so several deployments can share one host. `--token-*` flags
(or `[tokens]`) bound the `deploy` client token the deployment issues.

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
  neither read nor update the Keychain. Use host mode (below) instead;
- a file under `data/` belongs to another user, typically left by an earlier
  backend that ran as root. The message gives the `sudo chown -R` command.

Caveats: the host CLI does not take Router's per-credential locks, so a refresh
by both at the same instant can still race; Router then re-reads the file and
recovers from its rotated-token record. File locks are not reliable across
Docker Desktop's macOS file sharing.

## Host mode for a macOS Keychain login

On macOS, Claude Code keeps its live login in the Keychain, which no container
can read, so a container deployment cannot serve Anthropic models (issue #626).
`--mode host` moves the deployment to this same Router binary running on the
host, which reads the Keychain in place, while keeping exactly one endpoint:

```bash
# Read-only plan: what would stop, start, and be preserved, and every blocker.
TOKEN_SECRET='a-long-random-secret' router deploy --mode host --status

TOKEN_SECRET='a-long-random-secret' router deploy --mode host

# Back to the containers, which were stopped, not removed.
TOKEN_SECRET='a-long-random-secret' router deploy --mode container
```

The host Router uses the deployment's `data/` directory and `TOKEN_SECRET`, so
the token store, signing secret, request logs, and provider configuration (for
example z.ai) are the ones the containers used. It listens on the same
`127.0.0.1:<port>`, so client profiles, the selected server, and resumable
sessions need no change. It gets no `CLAUDE_CODE_HOME`, so it reads the host
Claude Code login the way `router serve` does. OAuth bytes are never printed or
copied (`claude_login=keychain read_in_place=true oauth_bytes_copied=0`).

The move is candidate-first:

1. A host Router is started on an ephemeral loopback port and must answer
   `/api/health` and accept a token signed with the deployment's secret.
   Otherwise it is stopped and nothing else changes.
2. The relay is stopped and the host Router is started on the stable port and
   validated the same way. If that fails, the relay is restarted and the
   container deployment keeps serving.
3. The backend is stopped and retained for rollback.

The move is refused before any change, with exit code 2, when a live run or an
established connection would be interrupted (`--force-update` accepts that
after review), when the run inventory is unknown, when the `TOKEN_SECRET` differs
from the deployment's, when a transaction is pending, when another process
holds the port, or when a file under `data/` belongs to another user. On Linux
an earlier backend ran as root, and the message names the `sudo chown -R`
command; Docker Desktop on macOS maps bind-mount files to the host user. The
plan also predicts the recoverable data checkpoint every move takes first
(`data_checkpoint estimate_bytes=… budget_bytes=…`) and names a covered file
that would not fit as `blocker=data-checkpoint`; request logs are not part of
that checkpoint.

Once in host mode, `router deploy` and `router deploy --status` keep the mode.
A rerun with the same Router and secret reports `converged=true` and changes
nothing. Without `TOKEN_SECRET`, `--status` cannot compare the serving host's
signing secret: when it serves this executable, version and port it reports
`converged=unknown` with the reason and prints no plan steps. Replacing a
serving host Router, for a newer binary or a changed secret, closes its
connections, so it is planned as a blocker and needs `--force-update`; the
replacement goes through the same validation. `router deploy --mode container`
restarts the retained backend, stops the host Router, and restarts the relay;
if the relay does not become healthy, the host Router is started again. `router
deploy --down --yes` stops the host Router as well as the containers.

The host process is recorded in `state/host` and logs to `state/host.log`. It
does not survive a reboot or logout by itself. Use `--install-service`, or
rerun `router deploy`.

### Supervising the host Router

```bash
TOKEN_SECRET='a-long-random-secret' router deploy --mode host --install-service
router deploy --uninstall-service
```

`--install-service` writes a systemd user unit
(`~/.config/systemd/user/link-assistant-router*.service`) or a launchd agent
(`~/Library/LaunchAgents`) (issue #684). It runs the same executable on the
same `data/` directory and port, starts it at login, and restarts it after a
failure. The signing secret is written to a `0600` file under `state/` and
reaches the Router through `TOKEN_SECRET_FILE`, so it is in neither the unit
nor any argv. `TOKEN_SECRET_FILE` works for `router serve` too; an explicit
`TOKEN_SECRET` wins.

The unit is enabled, not started: the Router the deploy just started keeps
serving, and the service manager takes over at the next login or boot. A
later deploy stops a service-started Router before it starts its own on the
stable port, then rewrites the unit for what it deployed. `--uninstall-service`
disables and removes the unit and the secret file. It stops the Router only
when the service started it. Limitations:

- The unit carries the data directory, port and secret file. It does not
  carry `CLAUDE_CODE_HOME` or `--env` values.
- A systemd user unit starts at boot only with `loginctl enable-linger $USER`.
- After a reboot, `deploy --status` sees the recorded pid as gone until the
  service, or a rerun, starts the Router again.

## Deployment registry and doctor

Every successful local or host deploy records its root, mode and port in
`~/.link-assistant-router/deployments.json` (never a secret). `router doctor
--local` inspects the data directory of every registered root, including
deployments started with `--root DIR`, so their recorded provider exhaustion
and account limits are not hidden. A registered root that no longer exists is
named, not silently skipped.

## What happens during an update

Before changing serving state, the coordinator reports the old and candidate
identity, established relay connection count, credential ownership, and five
run-credential classes:

- `live-pinned`: a managed wrapper has an unexpired renewable lease and an
  exact-model policy.
- `stale-pinned`: the exact-model policy remains durable, but no current wrapper
  lease proves that the process is alive. This does not block an update.
- `live-unpinned`: a wrapper started without `--model`, which keeps the
  client's own model selection, still renews its lease.
- `stale-unpinned`: the same run once its lease has expired, because the wrapper
  exited. Like `stale-pinned`, it does not block an update.
- `legacy-unpinned`: the record has neither an exact-model policy nor a run
  lease, so it predates both. It is never treated as protected and blocks a
  normal update.

A host-mode replacement closes the listener, so it also refuses while a run is
`live-pinned` or `live-unpinned`, as a `live-run` that would be interrupted. A
`legacy-unpinned` run is reported as an `unleased-run`: nothing proves it is
still running, and nothing proves it has exited.

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

The relay runs the same Router image as the backend, so it is updated too
(issue #627). After the old backend has drained, the coordinator waits until
the relay carries no established connection, observed twice in a row, then
replaces it with a relay on the new image and verifies the path through it.
Docker cannot hand a published port from one container to another, so the old
relay is removed before its replacement starts: at no point do two containers
publish the listener. Because rotation waits for idleness, no in-flight request
or stream is cut; a new connection attempted during the sub-second swap is
refused and must be retried by the client. If the relay stays busy for two
minutes, the backend update is kept, the relay stays on its old image, and the
deploy exits nonzero with `relay_rotation=deferred`. Rerun `router deploy` when
clients are idle, or pass `--force-update` to rotate immediately and accept the
interruption. A failed replacement restores a relay on the previous image.

Status names both images and never calls mixed images converged:

```text
backend_image=ghcr.io/link-assistant/router:1.14.3 image_id=sha256:…
relay_image=ghcr.io/link-assistant/router:1.14.2 image_id=sha256:…
version_skew=true
converged=false
```

Image ids decide skew, so a second tag of the same image is not skew. A
deployment left mixed by v1.14.3 converges on the next ordinary `router
deploy` of the same image; only the relay is replaced.

A second deploy with the same image, port, and launch specification is a true
no-op: it does not replace containers or rewrite the pointer, tokens,
credentials, logs, or configuration.

## Token signing secret

`TOKEN_SECRET` signs every issued client token and encrypts stored provider
keys, so it is part of the launch specification (issue #625). Each backend
carries a label with a keyed fingerprint of its secret
(`hmac-sha256:` followed by 128 bits of HMAC-SHA256 keyed by the secret over a
fixed context). The fingerprint identifies the secret without revealing it.
Backends started by v1.14.3 have no label; their secret is read from the
container environment in memory and fingerprinted, and it is never printed.
`--status` reports the comparison:

```text
token_secret=changed
blocker=token-secret-change reason="router-deploy-backend-… verifies tokens with a different TOKEN_SECRET; its issued client tokens would be rejected with HTTP 401"
force_update_interrupts=true
```

A deploy with another secret is therefore neither "already converged" nor
silently applied: it is refused before any mutation, on the same image or a
new one. Every ordinary update also proves token continuity before cutover.
The candidate is shown a short-lived token signed with the supplied secret
through `docker exec` environment (never argv), and it takes traffic only when
it accepts that signature (`token_probe=accepted status=403`, since the probe
token has no managed-client binding). A candidate that answers 401 is rolled
back and the old backend keeps serving.

To recover a backend that was started with a wrong secret, rerun with the
correct secret and accept the rotation explicitly. No image switch and no
manual container removal is needed:

```bash
TOKEN_SECRET="$SAVED_TOKEN_SECRET" router deploy --status
TOKEN_SECRET="$SAVED_TOKEN_SECRET" router deploy --force-update
```

The force report names the rotation and the number of issued client tokens it
affects (`force_update accepted token_secret_rotation token_secret=changed
issued_client_tokens=2`). The data directory and token store are kept, so
tokens signed with the restored secret are authorized again.

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
