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
