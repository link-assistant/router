# Provider onboarding

Every provider sub-issue must fill in this checklist before it enables a new
credential class. A working protocol adapter or successful login does not grant
permission to route a consumer subscription.

## Contract

`provider_connector::ProviderConnector` is the shared, object-safe lifecycle
contract. `SubscriptionConnector` adapts the existing subscription components;
it does not replace their CLI entry points or change serving policy.
Its associated provider, credential, catalog-entry and quota-state types let
API-key adapters use their existing encrypted store and registry. Bind these
types when using a connector through a trait object.

| Operation | Required behavior |
| --- | --- |
| `login_flows` | Name the supported device-code, loopback, authorization-code, API-key, or vendor-CLI flows; refuse unsupported flows rather than silently substituting one. |
| `complete_login` | Validate completed login/key input before replacing working credentials. OAuth adapters privately stage a fresh native document, prove its refresh chain and authenticated catalog, then promote under the durable lock; API-key adapters use their reviewed encrypted store. |
| `fresh_token` | Load the authoritative store. OAuth adapters use the registered recovery-aware store, existing five-minute skew, vendor-field preservation and durable successor commit; API-key adapters explicitly document that no refresh is needed. |
| `catalog` | Parse the provider's authenticated source, retain exact IDs and vendor metadata, follow bounded pagination, and expose no invented model capability. |
| `observe_upstream` | Apply rate-limit and quota signals to Router's account/model cooldowns and threshold pauses. Never apply an observation to another provider's pool. |
| `classify_error` | Return Router's existing retry classification; retries remain subject to the configured budget and pre-first-byte rule. |
| `ConnectorTransport` | Validate credential-bearing destinations, use guarded DNS resolution, refuse redirects, and honor a configured HTTP/HTTPS/SOCKS egress proxy without a direct fallback. |

Login initiation stays in the existing native authorization implementations:
Claude uses `ClaudeLogin` (PKCE code), Codex uses `CodexDeviceLogin` or
`CodexLogin` (PKCE loopback). The common completion boundary consumes the vendor
document produced by those flows. **Do not pass a copied vendor credential to
`complete_login`**: external credentials belong to their original rotating
chain and must use `credential_acceptance::accept_external_candidate` and the
existing import ownership rules.

The initial adapters share `SubscriptionToken` and `SubscriptionReader` with
Claude, Codex, Gemini and Qwen. Declaring Gemini/Qwen vendor-CLI login capability
does not enable their consumer inference rows. A future API-key adapter must
provide the same operations with its reviewed provider store and explicitly
document that refresh is unnecessary; it must not masquerade as an OAuth
subscription. Connector registration and dynamic loading are separate work.

## Checklist to copy into a provider sub-issue

- [ ] **Credential class and terms decision:** name the API product or
  subscription, owner, official terms URLs, review date, permitted clients,
  intermediary restrictions and decision in `docs/use-cases/<provider>.md`.
  Record uncertain or prohibited use as denied. Use
  [z.ai Coding Plan](../use-cases/zai-coding-plan.md) as a decision example.
- [ ] **Subscription bridge default: deny.** Define exact native
  `ClientKind`/protocol rows and any separately reviewed, exact opt-in bridge.
  Wildcards, generic SDK clients, admin tokens, or User-Agent claims never
  authorize subscription spend. Keep catalog admission and final dispatch
  consistent with `SubscriptionEntitlementPolicy`.
- [ ] **Login:** list supported flows, public OAuth client, scopes, callback
  rules, PKCE/state checks, polling/expiry bounds, cancellation and secret-free
  errors. For API keys, specify secure input and encrypted persistence.
- [ ] **Refresh and storage:** document expiry units/skew, refresh rotation,
  durable lock, vendor-field preservation, external ownership, keychain or
  read-only-store recovery, and terminal versus transient refresh refusals.
- [ ] **Quota and errors:** list headers/business codes, reset-time units,
  account versus model scope, `Retry-After`, terminal billing refusal, and
  retryable/relayed statuses. Use bounded delays and avoid credential/body
  material in diagnostics.
- [ ] **Catalog source:** name the authenticated endpoint and pagination,
  exact ID field, authoritative empty result, stale-on-error rules, credential
  invalidation, size/page limits, and metadata/protocol provenance.
- [ ] **Model truth:** add exact entries/evidence to the
  [model-truth contract](../../src/model_contract.rs); unknown capabilities
  remain unknown. No aliases or capabilities inferred solely from an owner.
- [ ] **Network:** all login/token/catalog/inference destinations participate
  in Router's egress and SSRF controls. Test private literals, guarded DNS,
  credential-bearing redirects, and failed-proxy behavior. Proxies resolve
  upstream names themselves; local DNS filtering cannot police a remote proxy,
  so the proxy operator must enforce the same destination policy.
- [ ] **Test tiers:** add tier 1 parsing/classification and tier 2 conformance
  against a mock upstream before enabling routing. Add tier 3 real-client
  capture for each supported client. Record the protected opt-in and explicit
  skip reason for tier 4 live checks; hermetic conformance proves no live terms
  permission or vendor availability. See [testing tiers](../testing-tiers.md).
- [ ] **Release/review:** add a changelog fragment, link reproduction and
  conformance evidence in the PR, and confirm existing provider behavior.

## Existing subscription baseline

| Provider | Login initiation | Store/catalog | Native inference decision |
| --- | --- | --- | --- |
| Claude | PKCE authorization code | Claude Code document / `/v1/models` | Signed `ClientKind::ClaudeCode` under the existing reviewed policy |
| Codex | Device code or PKCE loopback | `auth.json` / `/models` | Signed `ClientKind::Codex`; exact bridge opt-ins remain separate |
| Gemini | Vendor CLI | `oauth_creds.json` / public Gemini registry | Consumer inference denied pending terms review |
| Qwen | Vendor CLI | `oauth_creds.json` / trusted resource catalog | Consumer inference denied pending terms review |

The existing decisions and bridge defaults are recorded in
[use cases](../use-cases/README.md),
[Claude inside Codex](../use-cases/claude-max-in-codex.md), and
[ChatGPT inside Claude](../use-cases/chatgpt-in-claude-code.md).

Run the shared Claude/Codex conformance fixture without real credentials:

```sh
cargo test --locked --test provider_connector_conformance_test
```

Extend its shared fixture body and provider-specific wire documents when adding
an adapter. Each adapter must pass login completion, refresh before expiry,
durable reopen, exact catalog parsing, 429 cooldown, proxy use and private
network refusal. Keep the native-flow acceptance tests as well: they prove the
authorization-code/device/loopback protocol that precedes this lifecycle
boundary.
