# Isolated local staging

Use a unique staging name and immutable candidate image. The root must be new
or empty and the port must have no active listener:

```sh
router deploy --staging candidate-642 --root /tmp/router-stage-642 --port 18081 --image ghcr.io/link-assistant/router:1.14.3 --json
router deploy --staging candidate-642 --root /tmp/router-stage-642 --verify --json
router deploy --staging candidate-642 --root /tmp/router-stage-642 --status --json
router deploy --staging candidate-642 --root /tmp/router-stage-642 --down --yes --json
```

Status and verification use the journaled port; they do not require repeating
the creation port. Removal checks exact UUID ownership and namespace names,
then removes only those containers/network. It retains staging data and the
private journal. It never prunes unrelated objects, starts stopped legacy
containers, restarts Desktop, changes the primary or selects a global server.
An occupied namespace or nonempty unowned root is refused.

The stage has its own signing secret, newly issued bound Claude token, data,
logs and temporary credential home. No existing OAuth home is mounted or
copied. An optional `ROUTER_STAGING_ZAI_API_KEY` supplies an explicitly chosen
static key; it is passed through process environment and never printed.
Token files under the private root are sensitive. Configure a disposable
client home with the explicit staging URL/token if you need interactive
testing; do not use the workstation's global client profile or selected
server. Keychain-only Anthropic access is not proven by this workflow.

The JSON distinguishes serving health, management health, topology ownership
and token-authorized catalog checks. A failed management probe returns in a
bounded interval even when serving HTTP remains healthy. Mutations refuse
when another staging lifecycle operation holds the namespace lock; status
does not wait for that operation. No implicit management recovery is run.

The candidate caps memory/swap at 768 MiB, CPU at one core, processes at 128,
Docker logs at three 1 MiB files and request logs at 8 MiB. At least 1 GiB free
disk is required. Caps do not reserve spare resources or prove a primary
stream survives shared-host load. The report retains `parity:false` until
the separate primary continuity, sessions/tokens/auth preservation, actual
Claude requests/picker and log isolation acceptance is established. For that
experiment use a disposable host and keep both deployments' before/after
evidence; never recover a workstation's stalled daemon merely to run a test.

The Router-owned acceptance command below creates a second disposable primary
and candidate, checks a real primary GLM stream remains open through candidate
creation, runs actual Claude flagship/Flash requests and `/model`, checks log
isolation and primary token/profile/session/catalog continuity, then removes
only its UUID-owned namespaces. It requires an explicitly disposable Linux
Docker host, a static key and an already installed Claude. Missing prerequisites
produce not-proven status; an aborted stream or failed cleanup fails the test.

```sh
export ROUTER_STAGING_LIVE_TESTS=1 ROUTER_STAGING_DISPOSABLE_HOST=1
export ROUTER_DEPLOY_TEST_IMAGE=ghcr.io/link-assistant/router:YOUR_CANDIDATE_VERSION
# Supply ROUTER_STAGING_ZAI_API_KEY through your protected environment.
rust-script scripts/verify-contracts.rs --area staging
```

This acceptance can spend provider quota. A failed cleanup retains the private
owned journal for targeted cleanup instead of losing ownership evidence.

For updates of an existing deployment, source and per-token provider-union
checks run before cutover. `--force` acknowledges connection interruption;
it does not authorize provider loss. `--accept-access-loss` is an explicit,
separate authorization that is reported in JSON. Remote upgrade preserves
original provider directories and durable state, refuses legacy OAuth
snapshots/source drift, and requires GNU `timeout` for bounded Docker calls.
Client restore remains additive by default with explicit replacement.
Catalog checks do not prove a historical data snapshot; consult each report's
restore and unproven fields before relying on recovery.

Updates checkpoint logical token records (including revocations/budgets),
encrypted static provider configuration and registered request/project/session
files before starting a candidate. Local checkpoints are under
`ROOT/.state-backups/UUID`; remote checkpoints are under the original mounted
`DATA/.state-backups/UUID`. Manifests contain file checksums and signing-secret
identity. Checkpoint failure refuses even with `--accept-access-loss`.
OAuth homes, OS credential stores and refresh recovery state are excluded.
Files/exports have individual consistency boundaries; concurrent writers mean
this is not a global database transaction.

To recover locally, explicitly stop the owned serving writers first, then:

```sh
router deploy --root /path/to/root --restore-state /path/to/checkpoint --yes
# Explicit replacement of checkpoint-covered state:
router deploy --root /path/to/root --restore-state /path/to/checkpoint --replace-state --yes
```

Restore checks schema, signing secret, checksums and paths before writes and
retains a new pre-restore checkpoint. Additive mode keeps current token records,
revocations and existing files; replacement uses checkpoint token records and
replaces covered files. Other paths and OAuth authority remain outside restore.
Serving writers and pending deployment work refuse without implicit recovery.
For a remote checkpoint, make the same stopped durable data and signing secret
available to the local restore coordinator; SSH restore is not automated.

See [the requirement and acceptance analysis](../plans/issue-642.md).
