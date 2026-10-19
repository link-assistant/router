# @link-assistant/router

Official ESM Router operations for Node 20+ and Bun, with generated TypeScript types, strict versioned JSON validation and reusable fixtures.

```js
import { Router } from '@link-assistant/router';
const router = new Router();
const result = await router.tokens.list();
console.log(result.data);
```

Supply secrets through invocation `env` or `stdin`. `ROUTER_BIN` or PATH selects an installed binary; the package verifies its version. Matching release downloads are verified by checksum and tag-bound GitHub attestation. `RouterError` carries the exit status, stderr and structured report. Configure `deadlineMs` and `AbortSignal` for automation.

See the [complete integration guide](https://github.com/link-assistant/router/blob/main/docs/integration/downstream.md), [operation matrix](https://github.com/link-assistant/router/blob/main/docs/integration/operations.md) and `@link-assistant/router/testing`.

Native JavaScript execution is available explicitly while the existing `Router` and `createRouter` retain their Rust CLI transport:

```js
import { NativeRouter } from '@link-assistant/router';
const native = new NativeRouter({
  config: { token_secret: process.env.TOKEN_SECRET, storage_policy: 'memory' },
});
const result = await native.tokens.issue({ ttlHours: 1, label: 'example' });
console.log(result.data.token);
// The same native runtime serves Web Request/Response and Node/Bun HTTP.
const response = await native.fetch(new Request('http://localhost/health'));
await native.close();
```

`@link-assistant/router/native` exports the native runtime, core and server helpers. `router-native version --json` and `router-native contracts --json` run without a Rust executable. Use `--config FILE` for native configuration. API keys enter through an environment reference (`providers add --api-key-env KEY_NAME`) or `--api-key-stdin`; secret command-line flags are rejected. `execute(name, options)` returns failed envelopes; operation namespaces and `invoke` throw `NativeRouterError` carrying that envelope.

This is a draft native implementation. Local provider and token CRUD, account pause/resume, policy editing, request-log analysis and TLS resources are available (TLS generation requires OpenSSL); Explicit Claude/Codex file adoption, Claude PKCE code authorization and credential refresh are available; destination homes must be configured explicitly. Managed server operations use a private native Node daemon with authenticated shutdown and ownership checks. Specialized provider validation, Codex interactive login, platform credential discovery, client installation/configuration, containers, SSH tunnels, host verification and live subscription usage remain incomplete. A saved or environment server selection blocks local operations unless `local: true` explicitly overrides it; native remote delegation remains unsupported. Unimplemented operations and unsupported options return `success: false`, a nonzero `exit_code` and an explicit diagnostic. Doctor and auth status identify their limited inspection scope. Native paths never fall back to the Rust executable.

Run `npm run native:test` (Node), `npm run native:test:bun` (Bun) and `npm run native:typecheck`. Repository `node scripts/check-router-parity.mjs` validates the complete operation inventory and executes behavioral evidence while reporting draft gaps. `node scripts/check-router-parity.mjs --strict` requires every listed feature to be fully implemented and covered; it deliberately fails while draft gaps remain.

The native HTTP runtime retains foreground Responses by owner and endpoint namespace, with TTL, record and byte limits. Creation, retrieval, deletion, input-item pagination and active cancellation are available at `/v1/responses` and the canonical OpenAI service path. Background, conversation and previous-response execution fail explicitly. Retained resources belong to the running process. Native HTTP serving currently rejects HTTPS configuration; generating a local certificate does not enable a TLS listener.
