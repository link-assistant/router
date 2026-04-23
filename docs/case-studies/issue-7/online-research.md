# Online Research Notes

Sources were reviewed on 2026-04-23.

## Anthropic Claude Code Docs

### 1. LLM gateway requirements

Source:

- <https://code.claude.com/docs/en/llm-gateway>

Relevant findings:

- Claude Code supports gateways that expose at least one of three route families:
  - Anthropic Messages
  - Bedrock InvokeModel
  - Vertex rawPredict
- For Anthropic and Vertex formats, gateways must preserve `anthropic-beta` and `anthropic-version`.
- Claude Code sends `X-Claude-Code-Session-Id` on every request, and proxies can use it for session aggregation.
- Anthropic recommends a unified gateway endpoint when possible because it improves load balancing, fallbacks, and usage tracking.
- Claude Code supports a dynamic `apiKeyHelper` script for rotating or per-user auth credentials and a TTL env var for refresh cadence.

Implication for this repo:

- the current direct gateway path is aligned with documented Claude Code behavior
- a future auth/admin layer should expose a clean way to mint rotating router credentials that can be consumed by `apiKeyHelper`

### 2. Third-party integration model

Source:

- <https://code.claude.com/docs/en/third-party-integrations>

Relevant findings:

- Anthropic distinguishes an HTTP corporate proxy from an LLM gateway.
- LLM gateways are the place for centralized authentication, routing, usage tracking, and budgets.
- Bedrock and Vertex gateway flows are configured by dedicated environment variables, not by overloading one generic path.

Implication for this repo:

- gateway responsibilities in issue #7 are consistent with Anthropic's documented deployment model
- the router should keep provider-specific route families explicit

## OpenRouter Docs

### 1. Provider routing

Source:

- <https://openrouter.ai/docs/guides/routing/provider-selection>

Relevant findings:

- OpenRouter exposes policy controls for provider order, fallback behavior, parameter compatibility, data collection restrictions, quantization, and price-based routing.
- Routing policy is treated as a first-class request and workspace concern.

Implication for this repo:

- issue #7's "closer to OpenRouter capabilities" should be translated into explicit routing policy objects, not hardcoded failover
- any future multi-account or external-provider routing should be operator-controlled and observable

### 2. Observability

Source:

- <https://openrouter.ai/docs/guides/features/broadcast/overview>

Relevant findings:

- OpenRouter treats observability as a first-class product feature.
- Trace sinks can be filtered by API key.
- Sampling can be session-aware.
- privacy mode can strip prompt and completion content while keeping usage data.

Implication for this repo:

- usage, metrics, and trace export should be part of the gateway roadmap
- per-token observability and privacy controls are more useful than a simple log file

### 3. Management API keys

Source:

- <https://openrouter.ai/docs/guides/overview/auth/management-api-keys>

Relevant findings:

- OpenRouter separates completion keys from management keys.
- management keys are intended for key creation, rotation, limits, and monitoring workflows

Implication for this repo:

- the router should not stop at "mint a token"
- it should eventually separate client tokens from operator/admin credentials

### 4. Workspaces

Source:

- <https://openrouter.ai/docs/guides/features/workspaces/>

Relevant findings:

- Workspaces combine API keys, routing defaults, guardrails, observability, and member access.
- account-level policies set upper bounds; workspace-level policies become more restrictive inside those bounds.

Implication for this repo:

- a future multi-tenant design should likely grow from token -> tenant -> workspace rather than from token-only records
- quotas, routing rules, and observability filters should be attached to tenants or workspaces, not only to raw bearer tokens

## Link-Foundation Building Blocks

Source snapshots are stored in:

- [lino-arguments README](./raw/link-foundation/link-foundation__lino-arguments.README.md)
- [lino-objects-codec README](./raw/link-foundation/link-foundation__lino-objects-codec.README.md)
- [link-cli README](./raw/link-foundation/link-foundation__link-cli.README.md)
- [box README](./raw/link-foundation/link-foundation__box.README.md)

Relevant findings:

- `lino-arguments` already defines the exact config precedence issue #7 wants: CLI args, env vars, config file, then defaults.
- `lino-objects-codec` is a human-readable multi-language serialization format that fits text snapshots, audit logs, and durable metadata interchange.
- `link-cli` is a CLI-oriented links store tool, which suggests the router should talk to it through an adapter boundary instead of spreading CLI calls through request handlers.
- `box` provides a reusable Rust-capable container base that matches the packaging direction named in the issue.

Implication for this repo:

- config migration should happen early
- storage needs a clear abstraction boundary
- Docker and runtime packaging should be revisited after the config and storage refactor
