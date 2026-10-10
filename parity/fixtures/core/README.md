# Native core behavioral fixture

`behavior.json` supplies a fixed Unix clock, a test-only deployment signing secret,
exact provider/model catalog, account policies, token budget boundaries, and a
fixed-subject JWT. `tokens.lino` is the corresponding Rust `lino-objects-codec`
0.7 readable `RouterState` / `TokenStore` projection. These files are data; no
production secrets or live network endpoints are present.

JavaScript adapter: `node --test packages/javascript/test/native-core.test.mjs`.
Rust adapter: `cargo test --test native_core_parity_test` in a Rust-enabled CI
worker. The Rust adapter validates the native JWT and text projection through
Rust's real TokenManager/TextTokenStore and exercises the same budget cases.
The Rust adapter was authored without compilation because this task explicitly
prohibits local Rust builds. A passing JavaScript adapter alone is not evidence
of a passing cross-runtime comparison.

The native implementation currently supports Node 20+ and Bun's Node builtins:
HS256 Router credentials and both carrier prefixes; revocation; admin,
repository, client/principal and exact model boundaries; sliding expiration;
atomic request/token reservations and fixed-minute rate budgets; text token
persistence; AES256GCM provider secrets; persisted providers.lenv; exact provider
and model selection; round-robin, priority, least-used and weighted strategies;
account/session pins, detours, model/account cooldowns and manual pauses.

Known uncovered constructs are explicit rather than approximated:

- Native token stores reject binary/both policies. Legacy hand-built token
  projections and compact base64 codec projections are not read; readable
  indented/current single-line projections are the supported text forms.
- Native process locks coordinate native writers, not Rust advisory flock
  writers. Running native and Rust writers against the same state directory
  concurrently is unsupported. Atomic replacement protects readers.
- Account-limit persistence follows Rust's single-provider account-limits.json
  format; multiple-provider cooldowns remain in memory. Account request use and
  session bindings are in-memory, as in Rust. Threshold/vendor window parsing
  and pause-at-percent are not implemented.
- Subscription credential discovery/refresh, vendor catalog authentication,
  entitlement/risk-gated z.ai and Lefine acceptance, account egress proxies,
  parent-session feature toggle, thinking suffixes and retry rounds are not
  part of this core. HTTP adapters decide pre-first-byte versus streaming
  failure handling. Models must be explicitly advertised in provider config.
- Automatic primary-account cooling exceptions and policy-force-prefix mode
  are not reproduced. Rotation currently uses two awaited durable mutations
  and rounds remaining lifetime up to an hour; it is not atomic across the
  replacement and original revocation. Tokens above JavaScript's safe integer
  range are rejected instead of silently losing precision.
