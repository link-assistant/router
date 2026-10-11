# Components and libraries survey

For each gap area in [feature-matrix.md](feature-matrix.md) this document
lists existing components that solve the problem or part of it, says whether
Router already depends on them (see `Cargo.toml`), and records the decision.

## Already in the dependency tree

| Crate | Version | Relevant to |
| --- | --- | --- |
| `axum` (with `ws`), `tower-http` (`cors`, `trace`) | 0.8 / 0.7 | CORS (F), WebSocket Responses (E) — the CORS layer is compiled in but not wired |
| `schemars`, `jsonschema` | 1.2 / 0.33 | Schema for the runtime configuration document (F); validation of config PUT/PATCH |
| `toml_edit` | 0.25 | Comment-preserving edits of TOML; candidate for the on-disk config format (F) |
| `serde`, `serde_json` | 1.0 | Path-level config CRUD (F) can be expressed as JSON Pointer operations over the serialized document |
| `jsonwebtoken`, `aes-gcm`, `sha2` | — | Encrypted credential storage (K), token scopes for config writes (N) |
| `reqwest` (`socks`) | 0.13 | Per-credential `proxy-url` already handled (`ACCOUNT_EGRESS_PROXY`) |
| `tokio-tungstenite` | 0.30 | Upstream WebSocket duplex for Responses (E) |
| `proptest`, `criterion` | dev | Property tests for the thinking parser (C), benchmarks for weighted selection (A) |

## Per gap area

### A. Per-credential routing policy

- **Weighted round-robin:** smooth weighted round-robin (the nginx algorithm)
  is ~30 lines; no crate needed. cliproxy-rs implements the same strategy,
  useful as a behavioural reference, not as a dependency.
- **Wildcard model matching** (`excluded-models`, `oauth-excluded-models`):
  `globset` (BurntSushi) handles prefix/suffix/substring/exact patterns with
  compiled matchers. Decision: add `globset` if the pattern language is
  adopted verbatim; otherwise a 20-line matcher.
- **Request-scoped error rules:** `status` + `match` substring → action. No
  library; data model only.

### B. Providers

- **Kimi (Moonshot) OAuth device flow:** standard RFC 8628; Router already has
  device-code handling for Codex/Claude in `auth_remote.rs`. Reuse.
- **xAI Grok:** OpenAI-compatible Chat Completions plus a speech endpoint;
  `ProviderKind::OpenAICompatible` is the starting point.
- **Google service accounts:** `yup-oauth2` or `gcp_auth` crates produce
  access tokens from service-account JSON; `gcp_auth` is lighter (no disk
  cache by default). Decision: `gcp_auth` for B3 if the Vertex
  service-account channel is built.
- **Antigravity:** Google OAuth with a different client ID and scope set;
  same device/loopback flow as Gemini CLI import.

### C. Thinking pipeline

- No crate; the parser is a small grammar (`model(16384)`, `model(high)`,
  `model(none)`, `model(-1)`). `proptest` for round-trip properties.
- Upstream `internal/thinking/{suffix,apply}.go` and
  `test/thinking_conversion_test.go` are the behavioural spec.

### D. Gemini Interactions and translator conformance

- No Rust crate implements the Gemini Interactions schema; derive from the
  public API reference and upstream translators under
  `internal/translator/{openai,gemini}/interactions`.
- For corpus-driven tests, Router's recorded-fixture harness (#671) already
  loads JSON pairs; D2 reuses it.

### E. Codex transport toggles

- `tokio-tungstenite` for upstream duplex; `axum::extract::ws` for the client
  side (both present).

### F. Declarative runtime configuration

- **Layered config:** `figment` (Rocket's) or `config` crate merge
  file/env/flags. Router's flags are `clap` with `env`; `figment` can wrap
  them but adds a second source of truth. Decision: generate the document
  from the existing `clap` struct with `schemars`, keep flags as the parser.
- **Path CRUD:** `json-patch` (RFC 6902 + RFC 7396 merge patch) or JSON
  Pointer (`jsonptr`). Decision: RFC 7396 merge-patch for `PATCH /config` and
  JSON Pointer for `/config/*path`.
- **YAML:** `serde_yaml` is unmaintained; `serde_yaml_ng` or `serde_yml` are
  the maintained forks. Only needed if `config.yaml` compatibility with
  CLIProxyAPI/CPAMC is a goal; otherwise TOML via `toml_edit`. Decision:
  TOML on disk, JSON over the API, optional YAML export behind a feature.
- **Hot reload:** `notify` (cross-platform fsnotify equivalent) with
  `notify-debouncer-mini`. Router's credential store already polls; reuse
  that pattern or adopt `notify`.

### G. Credential lifecycle

- Router's `credential_store.rs` and `auth_import*.rs` cover file formats;
  the HTTP surface is new but thin. No external component.

### H. Observability

- Error-log capture: `tracing-appender` (rolling files) is the standard
  companion to `tracing-subscriber` (present). Request-by-id lookup can be
  served from `requests.lino` through `links-notation` (present).
- Open issues #718 and #719 already define the file-logging baseline; H
  depends on them.

### I. Cooldowns and retry budgets

- `governor` (GCRA rate limiting) is not the right fit for cooldown state;
  the state machine is bespoke and already exists per account. Extend it to
  `(account, model)` keys.

### J. Multimedia

- Relay-only; no decoding. `bytes`/`http-body-util` present.

### K. Storage backends (low priority)

- `object_store` (Apache Arrow) abstracts S3/GCS/Azure/local;
  `sqlx`/`tokio-postgres` for Postgres; `gix` for git. Decision deferred;
  encryption with `aes-gcm` under a Router-held key is a precondition.

### L. Extension points (low priority)

- In-process `async-trait` interfaces (present). No dynamic loading
  (`libloading`) by policy.

### N. Management hardening

- Lockout counter: `moka` or `dashmap` for an in-memory keyed counter with
  TTL; `moka` has built-in expiry. `tower_governor` would rate-limit by IP but
  does not implement "N failures then ban". Decision: `moka` cache keyed by
  client IP with 30-minute TTL.
- Password hashing: `argon2` (RustCrypto) preferred over `bcrypt` for new
  code; upstream uses bcrypt. Router already hashes admin secrets with
  `sha2`-based constructions; N decides the hash in its own design note.

### O. Model catalog sources

- `reqwest` + `serde_json` fetch; `schemars` for the catalog schema; the
  model-truth contract (`docs/model-truth-contract.md`) defines validation.

## Sibling projects as references (not dependencies)

| Project | Language | What to borrow |
| --- | --- | --- |
| cliproxy-rs | Rust | Strategy implementations, config-document shapes, parity checklist methodology |
| CLIProxyAPI | Go | Tests (MIT), behaviour of thinking pipeline, payload barrier, cooldown semantics |
| Cli-Proxy-API-Management-Center | TypeScript | Exact v8 request/response shapes a UI expects from F/G/H |
| LiteLLM | Python | Router's ADR 0001 already adopts its gateway contract; nothing new |
| 9Router, OmniRoute | TypeScript | Dashboard UX for credential health; no code reuse |
