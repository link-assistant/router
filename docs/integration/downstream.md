# Importing Router operations

The supported operations languages are Rust, JavaScript/TypeScript on Node 20+ or Bun, and Python 3.10+. PHP, Go and Java HTTP clients are generated and tested from [OpenAPI](../../openapi/router.yaml). The [operation matrix](operations.md) and machine-readable [catalog](../../schemas/operation-catalog.v1.json) describe the complete operation set.

```sh
npm install @link-assistant/router
python -m pip install link-assistant-router
cargo add link-assistant-router
```

The packages use the same version as Router. JavaScript and Python locate `ROUTER_BIN`, then PATH, then a matching release download. Downloads require a checksum and GitHub attestation verification with the release tag as source ref; install `gh` and authenticate as required by GitHub. A version mismatch raises a typed error unless the caller explicitly opts in.

```js
import { Router } from '@link-assistant/router';
import { temporaryHome, mockUpstream, verifyContracts } from '@link-assistant/router/testing';
const home = await temporaryHome();
const upstream = await mockUpstream();
try {
  const router = new Router({ env: { ...home.env, TOKEN_SECRET: 'fixture-secret' } });
  const issued = await router.tokens.issue({ label: 'project' });
  await router.providers.add({ name: 'fixture', baseUrl: upstream.origin, apiKeyStdin: true }, { stdin: process.env.PROVIDER_KEY });
  const clients = await router.clients.list();
  console.log(clients.data.map(client => client.client));
} finally { await upstream.close(); await home.close(); }
```

```python
from link_assistant_router import Router
from link_assistant_router.testing import temporary_home, mock_upstream, verify_contracts
home = temporary_home()
try:
    router = Router(env={**home.env, 'TOKEN_SECRET': 'fixture-secret'})
    result = router.tokens.issue(label='project')
    rows = router.tokens.list()['data']
finally:
    home.close()
```

Options use camelCase in JavaScript and snake_case in Python. Python keywords have a trailing underscore (`with_`, `tokens.import_`). Deploy supports host/container/remote, config files, service installation, staging and restore through the same documented CLI options. `deployStatus` / `deploy_status` set the status option. JavaScript also accepts `router.with(client, args, options, invocation)` and `router.logs()`.

Secrets travel only through invocation `env` or `stdin`; secret-valued options are rejected before spawning. Do not put them in forwarded vendor arguments. Results carry `schema`, `operation`, `success`, `exit_code`, `data`, and `diagnostics`. `RouterError` retains the operation result, exit status and stderr. Deadlines and output limits bound child execution; cancellation is available through JavaScript `AbortSignal`.

Local deployment status uses `link-assistant-router/local-deployment/v1` with structured host process, backend, relay, listener, convergence, run inventory and blockers. An unknown fact is null. Host, container, interrupted-update and inconsistent-state reports share this contract; callers do not parse `host_process=` lines. Deployment mutations report their assessed plan; call status afterward to inspect the resulting state.

The [complete host maintenance wrapper](../../examples/maintain-host.mjs) contains only project configuration, policy and evidence storage. It calls the official deployment/status and verification APIs without parsing CLI text. Run it with a project config such as:

```json
{"root":"/tmp/project-router","port":8080,"installService":false,"repository":"/path/to/router","areas":["host-mode"]}
```

```sh
node examples/maintain-host.mjs project.json --apply --verify
```

`verifyContracts({areas})` and `verify_contracts(areas=...)` return the verification document from Router's native harness or the disposable Linux boundary. macOS vendor probes use the Linux option so the developer's login Keychain is unavailable. The default Linux policy proves installed host versions; `ci` and `latest` are explicit alternatives. A complete parity proof requires all areas and `requireParity` / `require_parity`; selecting an area proves only that area.

Rust callers use [`OperationContext`](https://docs.rs/link-assistant-router/latest/link_assistant_router/operation_context/struct.OperationContext.html) with typed `cli::Command` requests, or the documented `deploy::{local,host,remote,staging,checkpoint}`, `auth::import`, `logs::read`, `doctor::report`, `admin::recover`, and `verification::run` facades. Environment, clock, roots and dependency process runner are injectable. Operations capture their diagnostics and return typed results without printing or exiting. See [the executable Rust example](../../examples/library_operations.rs) and each facade's rustdoc example.

`operation_reports` provides typed Rust facades for doctor, authentication,
client probes, server/tunnel status, model explanations and decoded log records.
The same fields are generated into TypeScript and Python declarations. Human
rendering remains available in `data.output`; application decisions use the
domain fields. Unsuccessful probes retain these facts in the error result.

An embedding Rust program must set `context.daemon_executable` to an installed
Router CLI, or set `ROUTER_BIN` in the context's environment, before deploying
host mode. Router validates that executable's `--version` response and uses its
actual version in status, convergence and saved service state. Without explicit
selection, only a running Router CLI supplies its own executable. The
[independent consumer example](../../examples/host_library_consumer.rs) rejects
Router CLI arguments itself and exercises real plan/apply/status/stop:

```sh
cargo build --locked --bins
cargo test --locked --example host_library_consumer
```

Contracts and package exports are regenerated from Rust and checked in CI. See the [compatibility policy](compatibility.md), [requirement matrix and component research](issue-697-requirements.md), and [testing tiers](../testing-tiers.md). Registry publication and all downloadable integrations share the exact-tag provenance and complete-delivery release gate.
