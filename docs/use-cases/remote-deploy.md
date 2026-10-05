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
target agent could not establish lease ownership safely. Exit status `12`
means the `--deadline` (or `[ssh] deadline_secs`) passed. Other deployment
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

## Declarative configuration

`router deploy --config FILE` reads the deployment's settings from TOML.
Command-line flags override its keys. The same file drives a local run
(`router deploy --config FILE`), a host-mode run (`mode = "host"` in
`[local]`) and a remote run (`router deploy --remote --config FILE`, which
takes `server` from `[remote]` or `[deploy]`). An unknown key, a malformed
value or a missing secret source exits with status `2` before anything runs.

```toml
[deploy]                 # shared by every target
instance = "blue"        # suffixes relay, network, backend names and the root

[local]                  # local only: port, image, build, root, mode, claude_credentials
mode = "container"

[remote]                 # remote only: server, port, public_port, image, build, root
server = "router@example.test"
public_port = 8443

[env]                    # runtime variables passed to the backend, by name
UPSTREAM_IDLE_TIMEOUT_SECS = "env"           # this environment, same name
ZAI_API_KEY = "env:DEPLOY_ZAI_KEY"           # another variable
EXTRA_CA = "file:/etc/router/extra-ca.pem"   # a file

[ssh]                    # remote only
port = 2222
identity_file = "/home/operator/.ssh/router_deploy"
known_hosts = ["example.test ssh-ed25519 AAAAC3Nza..."]
keepalive_secs = 15
deadline_secs = 1800

[tokens]                 # limits on the client token deploy issues
ttl_hours = 720
max_requests = 100000
max_tokens = 50000000
rate_limit_per_minute = 60
allowed_models = ["glm-4.6"]

[provider_keys.zai]      # remote only, see "Provider keys"
source = "env:DEPLOY_ZAI_KEY"
mode = "replace"
kind = "anthropic-compatible"
base_url = "https://api.z.ai/api/anthropic"
models = ["glm-4.6"]

[verification]           # remote only, see "Verification profile"
clients = ["claude", "codex"]
providers = ["zai"]
```

The equivalent flags are `--instance`, `--env NAME[=SOURCE]` (repeatable),
`--ssh-port`, `--ssh-identity`, `--ssh-known-hosts FILE`, `--ssh-keepalive`,
`--deadline SECONDS`, `--token-ttl-hours`, `--token-max-requests`,
`--token-max-tokens`, `--token-rate-limit`, `--token-allowed-model`
(repeatable), `--provider-key NAME=SOURCE` (repeatable),
`--provider-key-mode` and `--verification-profile FILE`. Without any of them a
deployment behaves exactly as before.

Secrets are named, never written. `[env]` and `[provider_keys]` accept only
`env`, `env:VAR` or `file:PATH`; a literal value is refused without being
echoed. Values never appear in argv or in output. On a remote target they
travel inside one base64 line on the SSH session's stdin, after the token
secret, and reach the backend through a short-lived owner-only `--env-file`
that is removed as soon as the candidate starts. Each deployment records an
HMAC-SHA256 fingerprint of the runtime names and values (keyed by
`TOKEN_SECRET`) as a backend label, so a changed value reconciles a local
deployment the way a changed image does, and a remote run reports it.

SSH settings add options to the strict session and never relax it:
`known_hosts` (or `--ssh-known-hosts`) pins the only keys trusted for the
target, replacing the user and global files; `accept-new` is never used.
`identity_file` sets `IdentitiesOnly=yes`. When `deadline_secs` passes, the
session is ended and `router deploy` exits with status `12`; the target's
lease and rollback records make the interrupted run recoverable by the next
one, exactly as for a dropped connection.

With a `[tokens]` policy the deployment issues one `deploy`-labelled client
token with those limits when no unrevoked one exists. Its value is withheld
from output; recover it with `router tokens` on the target.

## Provider keys

`--provider-key NAME=SOURCE` (or `[provider_keys.NAME]`) checks an API key in
the candidate before cutover. The key is first added to a private, empty Router
inside the candidate. That Router has its own data directory and no access to
the shared store, logins or clients. The check passes only if the provider's
model appears, undegraded, in a client catalog and a minimal request to that
model returns a 2xx status. The provider record is the target's existing record
when it has one. Otherwise it comes from the `[provider_keys.NAME]` template
(`kind`, `base_url`, `default_model`, `models`, `supported_clients`).

`--provider-key-mode` decides what happens next:

- `keep` (default) validates and reports, and never writes a key.
- `if-absent` installs the key only when the target has no such provider.
- `replace` installs it only after positive validation. A negative result
  stops the deployment before cutover, keeps the old backend serving, and
  leaves the stored key unchanged.

The candidate shares Router's data directory with the serving backend, so an
installed key is visible to the old backend as soon as it is written, including
when a later step rolls the deployment back. The output and `--json` report a
fingerprint, the action (`validated`, `created`, `replaced`, `kept-existing`,
`refused`) and the validation result for each key. They never report a value.

## Verification profile

`--verification-profile FILE` (or `[verification]` in `--config`) sets what the
candidate must prove before cutover, in addition to the built-in checks:

```toml
clients = ["claude", "codex", "opencode"]     # each needs a live 2xx
providers = ["zai", "anthropic"]              # each needs a live 2xx
require_client_launch = true                  # stub `router with <client>` launch
quota_requires_upstream_evidence = true       # 429 counts only with upstream evidence
check_thinking_display = true                 # Claude `--settings` shows thinking

[models.zai]                                  # exact model per client
claude = "glm-4.6"
opencode = "glm-4.6"
```

Every route in Router's removed-route contract must answer `404` on the
management listener, and on the public listener too when there is one. The
public listener must serve the anonymized `/api/usage` view (no pool, account
or e-mail fields) and must refuse the admin token for inference.
`check_thinking_display` is opt-in. It checks the `--settings` that
`router with claude` writes, and when a Claude model is pinned it also makes
one live thinking request. A profile failure is a verification failure, so the
old backend keeps serving.

## JSON report

`router deploy --server ... --json` prints one
`link-assistant-router/deploy/v1` document on stdout. It contains:

- the status and exit code
- the runtime variable names and their fingerprint
- each provider key's fingerprint, action and validation
- the verification-profile result
- the deploy-token action
- the steps (lease, build, candidate, health, verification, cutover,
  post-verify, retire, complete) with their start time and duration
- each SSH and target `docker` subprocess, with its duration and exit code
- the agent's human-readable output lines

The target writes these events to stderr only when `--json` is given.
Without `--json` the output is unchanged.
