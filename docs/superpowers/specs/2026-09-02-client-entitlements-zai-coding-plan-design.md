# Client-bound subscription entitlements and z.ai Coding Plan design

Date: 2026-09-02  
Issues: #389, #390  
Status: approved by the issue specifications and the instruction to deliver every open issue

## Context

Router currently authenticates `la_sk_...` tokens but does not bind an ordinary token to the
client adapter that receives it. Automatic routing therefore treats protocol compatibility as
permission to spend any healthy consumer subscription. That is unsafe for consumer subscriptions,
whose product terms can be narrower than their wire protocols.

The same distinction is essential for z.ai GLM Coding Plan. A Coding Plan key is not a normal
pay-as-you-go API key: it is personal, limited to named end-user tools, and must use dedicated
endpoints. Router must not infer this credential class, expose it to generic callers, or let a
model-name collision select it accidentally.

## Goals

- Make consumer-subscription access deny-by-default and client-specific.
- Bind managed client tokens to an immutable signed client kind and subscriber principal.
- Enforce the same decision at model discovery and immediately before upstream I/O.
- Retain the existing cross-protocol adapters behind exact, audited client/provider overrides.
- Add z.ai Coding Plan as a distinct, redacted, policy-gated provider with exact model identities
  and protocol endpoints.
- Preserve legacy token validity for non-subscription features while failing closed for subscription
  access.

## Non-goals

- Claiming that a signed Router token attests which operating-system process is running. Supported
  clients do not provide cryptographic process attestation.
- Treating `User-Agent` as authorization.
- Enabling Gemini or Qwen consumer subscription use before their product terms are recorded and
  reviewed.
- Treating an ordinary z.ai API key as a Coding Plan key, or vice versa.
- Enabling Cursor until Router has a native, fixture-tested adapter.

## Authorization model

### Signed bindings

`TokenClaims` and the durable `TokenRecord` gain two optional fields:

- `client_kind`: Router's canonical client adapter name (`claude`, `codex`, `gemini`, `qwen`,
  `opencode`, `grok`, or `agent`).
- `principal_id`: an opaque Router subscriber identity, separate from JWT `sub` (the token id).

Both fields are signed into the JWT and copied into durable storage. Validation compares the signed
values with the stored record when a record exists. Rotation and reissue copy both fields and expose
no override that can add or widen them.

Managed `with` and `configure`/`clients setup` flows mint through a dedicated admin endpoint and
request the concrete client kind. The server assigns the trusted principal (`primary` for the
single-subscriber credential set, or the existing strict account pin). The general token-issuance
surface continues to mint unbound tokens. A supplied token is accepted by a managed client only if
its immutable binding already matches that client and principal; otherwise catalog validation fails
with `403` before the client launches.

Admin credentials remain valid for administration and ordinary API-key providers, but have no
implicit consumer-subscription entitlement.

### Request evidence

Authorization requires all of:

1. a valid signed token binding;
2. a protocol compatible with the claimed adapter;
3. stable request evidence captured from the real-client fixtures.

Evidence uses a conjunction of route, credential carrier, protocol headers, and stable client
headers. `User-Agent` may contribute to recognizing a request shape but never grants access by
itself. Managed catalog probes include a Router client-evidence header so pre-launch discovery can
be tied to the same signed adapter. This prevents accidental or unsupported use; it is not process
attestation.

### Consumer-subscription matrix

Every `SubscriptionProvider` has an explicit reviewed default:

| credential | Claude Code | Codex | Gemini CLI | Qwen Code | OpenCode/Grok/Agent |
| --- | --- | --- | --- | --- | --- |
| Claude OAuth | allow | deny | deny | deny | deny |
| ChatGPT OAuth | deny | allow | deny | deny | deny |
| Gemini OAuth | deny | deny | deny pending terms | deny | deny |
| Qwen OAuth | deny | deny | deny | deny pending terms | deny |

There is no wildcard or protocol-derived allow rule. A runtime option may enable one reviewed pair,
such as `codex:claude` or `claude:chatgpt`. It changes exactly one cell, prints a provider-policy
warning at startup, and records every use. Generic Agent remains ineligible. Pending-terms native
rows are not widened by an ordinary bridge override.

Claude identity synthesis is permitted for native Claude Code or an explicitly accepted route to a
Claude credential. It never runs merely because an OAuth token happened to be selected.

### Enforcement points

- `GET /v1/models` authenticates first, filters consumer catalogs using the signed binding and
  catalog evidence, then appends only permitted non-subscription models.
- Each Anthropic, Chat Completions, Responses, Gemini-native, and namespaced subscription dispatcher
  re-evaluates the exact client/provider/protocol decision before budgets are consumed or any
  upstream request is built.
- Account selection must yield the principal/account to which the client token is bound.
- Denial is a stable local `403`; no fallback provider is tried and no upstream connection occurs.

## Runtime bridge policy

The server accepts repeatable `--allow-subscription-bridge CLIENT:PROVIDER` values (environment:
`SUBSCRIPTION_BRIDGE_OVERRIDES`). Values are parsed into an exact set during configuration and
installed into the shared provider/policy store. Unknown clients, providers, malformed pairs, and
pending-terms native providers are rejected during startup. The option is deliberately not a broad
compatibility boolean.

## z.ai Coding Plan provider

### Credential representation

`ProviderKind::ZaiCodingPlan` is separate from `OpenAICompatible`. Its persisted record requires:

- the fixed provider name `z.ai-coding-plan` and official origin `https://api.z.ai`;
- an encrypted key or named key environment variable;
- an explicit `subscriber_id`;
- `acknowledge_intermediary_risk=true`;
- an explicit model list limited by Router's reviewed Coding Plan model policy;
- optional exact unsupported-client acknowledgements.

The CLI exposes these fields only as explicit provider flags. Enabling this provider emits the
intermediary/proxy and account-ban warning. A standard z.ai API key remains an ordinary,
independently configured provider and never selects Coding Plan endpoints.

The repository records that z.ai's published terms prohibit proxying/third-party access without a
written agreement. Until written clarification is committed, documentation calls this mode
experimental, risk-accepted, and disabled by default.

### Health and model policy

The official z.ai usage-query plugin uses the non-inference
`GET https://api.z.ai/api/monitor/usage/quota/limit` operation. Router uses the same operation with
the Coding Plan key to validate credential health without spending model tokens. A rejected or
removed key immediately removes all z.ai aliases; network/transient failures fail closed for new
dispatches and do not affect other providers.

z.ai publishes no free dynamic model-catalog endpoint. Router therefore intersects a record's
explicit model list with a reviewed static Coding Plan policy list. Expanding that list is a code
review, never an automatic consequence of a new upstream model or a compatible prefix.

### Client policy

Safe adapters are an explicit reviewed intersection with z.ai's named tools:

- Claude Code: Anthropic Messages
- Codex: OpenAI Responses
- OpenCode: OpenAI Chat Completions

Gemini CLI, Grok CLI, and Qwen Code require a second exact per-client acknowledgement in the z.ai
provider record, with warning and audit. Generic Agent, SDK/curl, Cursor without a native adapter,
and unidentified clients cannot be overridden.

The provider's `subscriber_id` must equal the token's signed `principal_id`.

### Model identity registry

Catalog identities are constructed from an explicit registry, never prefix stripping:

| client | exposed identity | canonical identity | endpoint |
| --- | --- | --- | --- |
| Claude Code | `claude-zai-<glm-id>` | configured `glm-*` | `https://api.z.ai/api/anthropic` |
| Codex | `z.ai/<glm-id>` | configured `glm-*` | `https://api.z.ai/api/v1` |
| OpenCode | `z.ai/<glm-id>` | configured `glm-*` | `https://api.z.ai/api/coding/paas/v4` |

Entries include `owned_by: "z.ai"` and a human `display_name`. The selected exposed identity maps
to one provider, canonical model, and protocol. Unknown, stale, cached, built-in, or ambiguous
unqualified names are rejected locally. No dispatch decision is based only on request dialect.

### Claude Code discovery

Managed Claude environments set:

- `CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY=1`;
- `ANTHROPIC_DEFAULT_OPUS_MODEL`, `ANTHROPIC_DEFAULT_SONNET_MODEL`, and
  `ANTHROPIC_DEFAULT_HAIKU_MODEL` to currently permitted discovered aliases when z.ai is the only
  available provider.

Router documents and diagnoses the Claude Code 2.1.129 minimum. `/v1/models` always returns a
successful current list, including an empty list, so a dead credential cannot be hidden by the
client's cache. A restart may be required because Claude Code caches gateway models at startup.

## Auditing and errors

Normal audit entries gain normalized `client_kind`; z.ai entries record the canonical upstream
model. Exact override use creates a policy-override audit entry naming the client/provider pair and
acknowledgement class. No Router token string, OAuth token, or z.ai key is logged.

Authorization errors use the caller surface's envelope and include the normalized denied pair.
They do not expose credential paths or secret material.

## Compatibility and migration

Existing JWTs deserialize with absent bindings. They remain usable for ordinary API-key providers,
GitHub mediation, and their existing budgets/scopes, but cannot list or spend consumer
subscriptions. Labels are never reinterpreted as client identity. Existing OAuth and bridge code is
retained and reached only after authorization.

Provider records deserialize new fields with safe defaults: generic kind, no acknowledgement, no
subscriber, and no unsupported-client overrides. No old generic provider is silently converted to
Coding Plan.

## Verification strategy

Tests cover the complete client/provider matrix, real request fixtures, catalog/dispatch parity,
zero-upstream denials, exact override isolation and revocation, rotation preservation, admin and
legacy failures, identity synthesis boundaries, z.ai provider validation, health failure isolation,
all three exact endpoints, alias/collision handling, mixed catalogs, SSE/tool cycles, `count_tokens`,
Claude discovery environment, and secret-free logs/errors. The full project test, formatting,
Clippy, documentation, coverage, file-size, terminology, UI, and release-automation gates run before
the PR leaves draft.

