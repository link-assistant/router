# Independent native acceptance

Run after integrating the native core/server/operations and both translators:

```sh
node --test experiments/issue-759/acceptance/*.test.mjs
node scripts/check-router-parity.mjs --strict
```

The first command tests representative executable behavior. The second is the
full parity gate and must fail while any declared feature remains partial or
unsupported. Passing acceptance does **not** establish universal semantic parity
or authorize Rust compilation. The strict tests deliberately feed superficially
green fixture claims to the checker and require it to stay closed.

The tests use Node's built-in test runner, bounded temporary files, loopback HTTP
mock servers and the package's existing AJV dependency. They never execute a
Rust binary, compile Rust, fetch external services, or download dependencies.
Every temporary directory and server is cleaned up. Restricted local sandboxes
may need authorization to listen on loopback; CI must run all cases without
skipping them. `ROUTER_ACCEPTANCE_ROOT` can select an integrated checkout without
copying its sources or installing another dependency tree.

The expectations come from existing Rust specifications and published contracts:

| Acceptance cases | Specification |
| --- | --- |
| HMAC identity, aliases, budgets, reservation settlement, rate windows | `src/token.rs`, `src/token_tests.rs` |
| Managed bindings, revocation and rotation | `src/token_binding_tests.rs` |
| Exact model allow-list and missing durable authority | `src/token_model_policy_tests.rs` |
| Qualified model ownership, policies, pauses and cooldowns | `src/model_routing_native_catalog_tests.rs`, `tests/account_routing_policy_test.rs`, `tests/pool_failover_test.rs` |
| Upstream identity isolation and response observations | `src/native_service_tests_relay.rs`, `tests/router_e2e/token_budget.rs`, `tests/provider_stream_settlement_test.rs` |
| Operation envelopes, CLI status and wrapper compatibility | `packages/javascript/schemas`, `packages/javascript/catalog.json` |

Forward translator cases execute generated JavaScript and require checked
fixed-width overflow errors. Carried Rust and its dependants must remain absent
from the executable interface. Reverse cases compare authored results with the
checked serialized meta evaluator, including NaN, signed zero, UTF-16 length and
loops. They also reject executable source capabilities and unsupported syntax.
Generated Rust execution remains the separate fixture runner's responsibility
on gated CI; the reverse tests here do not claim that the Rust target ran.

Fixed-candidate HTTP tests isolate the transport while using the actual token
manager. A separate test combines the real core and server, so incompatible
exports, client identity or pinning cannot be hidden behind fixture selection.
Mock HTTP tests verify actual request counts and bytes, credential headers,
admission before dispatch, failover, usage, SSE completion and truncated errors.
