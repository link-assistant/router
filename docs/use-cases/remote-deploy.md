# Remote zero-downtime deployment

`router deploy --server <target>` converges Router on a Linux Docker host over
one ordinary OpenSSH session. The target must already be in `known_hosts`;
deployment uses batch mode and strict host-key checking. The target also needs
Docker, `/proc`, core POSIX utilities, `base64`, and util-linux `flock`. `git`
is needed for the default pinned-release build.

```bash
# Build the exact Router release tag on the target and deploy it.
TOKEN_SECRET='a-long-random-secret' router deploy --server router@example.test

# Alternatively, build a target-local checkout or pull an immutable image.
TOKEN_SECRET='a-long-random-secret' router deploy --server router@example.test \
  --build /srv/router-source
TOKEN_SECRET='a-long-random-secret' router deploy --server router@example.test \
  --image ghcr.io/link-assistant/router:1.10.1

# Observation does not create a directory, image, network, or container.
router deploy --server router@example.test --status

# Removal is explicit and is limited to objects carrying this deployment's
# ownership label. Persistent state is retained for operator recovery.
router deploy --server router@example.test --down --yes
```

The default management listener is `127.0.0.1:8080` on the target. Override it
with `--port`. `--public-port PORT` additionally publishes an inference-only
TLS listener on all interfaces while management stays loopback-only. The
deployment verifies that listener with its generated CA; it never disables
certificate or hostname validation. Firewall and DNS policy remain the
operator's responsibility.

## What a deployment does

Each run builds or pulls its image on the target and starts a uniquely named
candidate beside the current backend. It verifies health, current client
catalog shapes, client-token isolation, removed routes, and live configured
providers on the candidate before changing traffic. A stable, deployment-owned
TCP relay chooses the current backend once per accepted connection. Replacing
its small state file is the atomic cutover: new connections use the candidate,
existing connections finish on the old backend, and the old container is
removed only after its connection count reaches zero. The same issued tokens
are checked again through the live relay. A failure before cutover removes the
candidate; a failure afterward atomically restores the recorded old backend.

The target serializes deployments with a kernel lease plus a durable record
containing the shell PID, `/proc` process start time, boot ID, and a random
inherited cookie. The lease file descriptor is inherited by child work, so
killing the leader does not release a build still in progress. Another run
waits for a live holder. Once the kernel lease is free, the cookie scan proves
that readable same-user work from a dead holder is also gone. A record from a
previous boot is stale by definition. Interrupted candidate/rollback identity
is written and signed before candidate health checking so the next run can
resume conservatively or restore the exact old container and release root.

Exit status `10` means OpenSSH transport failed. Exit status `11` means the
target agent could not establish lease ownership safely. Other deployment
failures use status `1`; invalid invocation or missing consent uses `2`.

## Credential provenance

Remote deployment reads credentials only from the target's Claude, Codex,
Gemini, and Qwen homes. Nothing from the invoking machine's vendor homes is
uploaded. Recognized credential files are copied into the candidate's isolated
credential tree and byte-compared; it remains writable only so Router can make
durable refreshes inside that release. Mutable Router data has a separate
mount. The release records a signed digest, target source path, and explicit
`present` or `withdrawn` state for each provider. A missing target credential is
therefore a valid withdrawal and does not block a deployment or trigger silent
re-provisioning.

State defaults to
`$XDG_DATA_HOME/link-assistant-router/deploy` (or
`~/.local/share/link-assistant-router/deploy`) on the target. Use `--root` for
an absolute alternative. Broad system roots are refused, and existing Docker
objects with the reserved relay/network names are never adopted unless their
ownership label names the exact deployment root.
