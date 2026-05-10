# ADR 0001: LiteLLM-Compatible Gateway Contract

Status: Accepted

Date: 2026-05-10

Issue: <https://github.com/link-assistant/router/issues/31>

Research note: [docs/case-studies/issue-31/README.md](../case-studies/issue-31/README.md)

## Context

LiteLLM is a Python AI gateway and SDK that exposes a unified OpenAI-shaped
interface for many providers. Its proxy server supports OpenAI-compatible
routes, model lists, virtual keys, spend tracking, provider routing, and an
Anthropic interface for Claude Code style clients.

Link.Assistant.Router is a Rust gateway focused on protecting Claude MAX OAuth
credentials behind router-issued `la_sk_...` tokens. It already exposes:

- `POST /v1/chat/completions`
- `POST /v1/responses`
- `GET /v1/models`
- `POST /v1/messages`
- Claude Code gateway pass-through routes, metrics, and token management

The issue asks for an architecture decision record that completes the design
for compatibility with <https://github.com/BerriAI/litellm>. The important
ambiguity is whether "compatible" means embedding LiteLLM, cloning LiteLLM, or
being able to compose with LiteLLM through stable HTTP contracts.

## Decision

Link.Assistant.Router will target LiteLLM compatibility through HTTP and JSON
API contracts, not through a Python runtime dependency or a LiteLLM dashboard
clone.

The compatibility contract has three levels:

| Level | Goal | Status |
| --- | --- | --- |
| L0: LiteLLM in front | LiteLLM can call this router as an OpenAI-compatible upstream by setting `api_base` to the router `/v1` base URL and `api_key` to a router-issued `la_sk_...` token. | Supported for chat completions, responses, models, bearer tokens, and streaming SSE translation. |
| L1: Router as LiteLLM-like gateway | OpenAI SDK clients and Claude Code style Anthropic clients can point directly at this router with the same endpoint assumptions they use for LiteLLM proxy. | Supported for the implemented OpenAI and Anthropic surfaces; non-chat LiteLLM surfaces remain separate feature decisions. |
| L2: Router in front of LiteLLM | This router can route selected models to a LiteLLM proxy as another OpenAI-compatible provider while keeping router-issued tokens at the edge. | Supported for a configured OpenAI-compatible provider record such as LiteLLM. |

The router remains Rust-first and headless. It should adopt the proven LiteLLM
gateway contract where it improves interoperability:

- one stable OpenAI-compatible `/v1` surface for generic clients,
- an Anthropic `/v1/messages` surface for Claude Code compatible clients,
- model aliases that decouple caller model names from upstream provider IDs,
- provider records shaped around `model`, `api_base`, secret source, supported
  endpoints, and capability metadata,
- router-issued bearer tokens at the edge, with upstream credentials substituted
  only inside the router,
- `.lenv` and Links-style provider import so deployment config is file-first
  and still compatible with environment/CLI overrides,
- encrypted provider API keys stored under the router data directory,
- conformance tests that exercise LiteLLM-compatible request and response
  shapes.

The router should not import LiteLLM model cost maps, implement LiteLLM's admin
UI, depend on Python in the server process, or mirror every LiteLLM endpoint by
default. Extra surfaces such as embeddings, images, audio, rerank, batches, MCP,
and A2A should be separate feature decisions.

## Rationale

HTTP compatibility keeps deployment small and preserves the current single
binary/container story. It also lets operators choose the composition that fits
their environment:

- LiteLLM can sit in front when teams need LiteLLM virtual keys, budgets, UI,
  and enterprise policy features.
- Link.Assistant.Router can sit in front when teams need Claude MAX OAuth
  protection and router-issued `la_sk_...` tokens.
- Either gateway can be removed without changing the other one's runtime.

LiteLLM's own OpenAI-compatible provider configuration is intentionally small:
a provider can be represented by a base URL, an API-key source, optional
parameter mappings, and supported endpoint metadata. That matches this
repository's existing direction from the issue 9 case study: introduce a typed
provider abstraction instead of hard-coding each upstream into proxy handlers.

## Consequences

Positive:

- The router can be used by LiteLLM through normal OpenAI-compatible upstream
  configuration.
- The provider abstraction can route to LiteLLM without a special adapter by
  treating LiteLLM as an OpenAI-compatible provider.
- The current Rust build, Docker image, and operational model stay unchanged.

Tradeoffs:

- Full LiteLLM parity outside the OpenAI-compatible and Anthropic-compatible
  surfaces is explicitly out of scope for this ADR.
- Budgeting, virtual-key policy, model cost metadata, and UI workflows remain
  LiteLLM responsibilities unless later issues add router-native equivalents.

## Compatibility Requirements

The supported L0/L1 compatibility surface is:

- `Authorization: Bearer la_sk_...` is accepted.
- `x-api-key: la_sk_...` is accepted for SDKs that use API-key headers.
- `/v1/chat/completions` returns OpenAI-shaped `choices`, `usage`, and `model`.
- `/v1/responses` returns an OpenAI Responses-shaped object.
- `/v1/models` returns model IDs that can be used in subsequent requests.
- Streaming Chat Completions are emitted as OpenAI SSE chunks instead of a
  buffered fallback.
- Unknown or unsupported parameters are either ignored safely or rejected with
  OpenAI-shaped errors.

The supported L2 provider record shape is:

- provider name,
- provider kind (`openai-compatible`),
- base URL,
- default model,
- model list,
- API-key environment variable or encrypted API key,
- enabled flag.

Future compatibility tests should add an external LiteLLM proxy fixture to
exercise the complete L0 and L2 topology in CI. The in-repository tests cover
the local request translation, streaming translation, provider parsing,
encryption, redaction, and header handling.

## Example: LiteLLM In Front Of This Router

```yaml
model_list:
  - model_name: link-assistant-claude
    litellm_params:
      model: openai/claude-sonnet-4-20250514
      api_base: http://router:8080/v1
      api_key: os.environ/LINK_ASSISTANT_ROUTER_TOKEN
```

With that shape, LiteLLM owns virtual keys, budgets, routing policy, and UI.
This router owns the protected Claude MAX OAuth session and accepts only the
router-issued token configured in `LINK_ASSISTANT_ROUTER_TOKEN`.

## Example: This Router In Front Of LiteLLM

Configure LiteLLM as the router's selected OpenAI-compatible provider:

```text
TOKEN_SECRET: your-router-token-secret
UPSTREAM_PROVIDER: openai-compatible
OPENAI_COMPATIBLE_PROVIDER_NAME: litellm
OPENAI_COMPATIBLE_BASE_URL: http://litellm:4000/v1
OPENAI_COMPATIBLE_API_KEY_ENV: LITELLM_MASTER_KEY
OPENAI_COMPATIBLE_MODEL: claude-sonnet
```

In that topology, clients still authenticate to Link.Assistant.Router with
`la_sk_...`; the router forwards selected OpenAI-compatible requests to LiteLLM
using the configured LiteLLM key.

## References

- Issue 31: <https://github.com/link-assistant/router/issues/31>
- LiteLLM repository: <https://github.com/BerriAI/litellm>
- LiteLLM latest release reviewed: <https://github.com/BerriAI/litellm/releases/tag/v1.83.14-stable.patch.3>
- LiteLLM OpenAI-compatible provider configuration: <https://github.com/BerriAI/litellm/blob/litellm_internal_staging/litellm/llms/openai_like/README.md>
- LiteLLM proxy README: <https://github.com/BerriAI/litellm/blob/litellm_internal_staging/litellm/proxy/README.md>
- LiteLLM Anthropic interface notes: <https://github.com/BerriAI/litellm/blob/litellm_internal_staging/litellm/anthropic_interface/readme.md>
- Existing multi-provider research: [docs/case-studies/issue-9/README.md](../case-studies/issue-9/README.md)
