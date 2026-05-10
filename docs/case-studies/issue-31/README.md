# Issue 31 LiteLLM Compatibility Research

Issue: <https://github.com/link-assistant/router/issues/31>

ADR: [docs/adr/0001-litellm-compatible-gateway.md](../../adr/0001-litellm-compatible-gateway.md)

Sources reviewed on 2026-05-10.

## Summary

The issue asks for research and an architecture decision record for completing
compatibility with [LiteLLM](https://github.com/BerriAI/litellm). The practical
interpretation is API-level compatibility, not a source-level dependency:
Link.Assistant.Router can sit behind LiteLLM as an OpenAI-compatible upstream,
and can route to LiteLLM as a generic OpenAI-compatible provider.

The current router already has the main building blocks:

- OpenAI-compatible `POST /v1/chat/completions`
- OpenAI-compatible `POST /v1/responses`
- OpenAI-compatible `GET /v1/models`
- Anthropic-compatible `POST /v1/messages`
- router-issued `la_sk_...` bearer tokens
- upstream credential substitution so clients never see the protected Claude
  MAX OAuth token

This PR implements the highest-value compatibility work directly in the router:
OpenAI SSE translation for Anthropic-backed streams, `x-api-key` support,
generic OpenAI-compatible provider records, encrypted provider keys, `.lenv`
configuration, Links-style provider imports, and API/CLI provider management.

## Upstream LiteLLM Findings

Current upstream metadata from GitHub on 2026-05-10:

| Field | Value |
| --- | --- |
| Repository | `BerriAI/litellm` |
| Default branch | `litellm_internal_staging` |
| Latest reviewed release | `v1.83.14-stable.patch.3` |
| Release date | 2026-05-07 |

Relevant LiteLLM design points:

- LiteLLM presents itself as an AI gateway for 100+ providers through a unified
  OpenAI format.
- The proxy server accepts OpenAI SDK clients by changing `base_url` and
  `api_key`.
- Provider routing is driven by `model_list` entries whose `litellm_params`
  include `model`, `api_base`, `api_key`, and provider-specific options.
- Simple OpenAI-compatible providers can be described by JSON/base URL/API key
  metadata rather than a large custom adapter.
- The Anthropic interface lets Claude Code style clients call `/v1/messages`
  through a gateway, with either a unified endpoint or provider-specific
  pass-through endpoint.

These points match the direction already recommended by the issue 9 case study:
use a provider abstraction and keep the front door token separate from upstream
provider credentials.

## Current Router Fit

The current code path maps to LiteLLM compatibility as follows:

| Router surface | LiteLLM compatibility relevance | Current status |
| --- | --- | --- |
| `/v1/chat/completions` | Primary OpenAI-compatible SDK and LiteLLM upstream surface. | Implemented in `src/proxy.rs` and `src/openai.rs`. |
| `/v1/responses` | OpenAI Responses-compatible surface; LiteLLM supports Responses for configured providers. | Implemented. |
| `/v1/models` | Model discovery for OpenAI-compatible clients. | Implemented. |
| `/v1/messages` | Anthropic interface for Claude Code style clients. | Implemented as pass-through. |
| `Authorization: Bearer la_sk_...` | Lets LiteLLM or direct clients use a router-issued virtual token. | Implemented. |
| OpenAI streaming SSE chunks | Required for strong LiteLLM-like gateway parity. | Implemented for Anthropic-backed chat/responses streams. |
| Generic OpenAI-compatible upstream provider | Needed for router-in-front-of-LiteLLM topology. | Implemented with encrypted provider storage and `UPSTREAM_PROVIDER=openai-compatible`. |
| Model alias/capability metadata | Needed to keep LiteLLM `model_name` and router upstream IDs decoupled. | Implemented for default model injection and `/v1/models` provider model lists. |

## Recommended Compatibility Contract

The ADR defines three levels:

- L0: LiteLLM in front of Link.Assistant.Router.
- L1: Link.Assistant.Router as a LiteLLM-like direct gateway.
- L2: Link.Assistant.Router in front of LiteLLM.

L0 is supported for the implemented OpenAI-compatible surface. A LiteLLM config
can point at the router with:

```yaml
model_list:
  - model_name: link-assistant-claude
    litellm_params:
      model: openai/claude-sonnet-4-20250514
      api_base: http://router:8080/v1
      api_key: os.environ/LINK_ASSISTANT_ROUTER_TOKEN
```

That lets LiteLLM keep its own virtual key, budget, UI, and team policy
features while the router protects Claude MAX OAuth credentials behind a single
router-issued token.

L2 is supported by configuring a stored OpenAI-compatible provider:

```text
TOKEN_SECRET: your-router-token-secret
UPSTREAM_PROVIDER: openai-compatible
OPENAI_COMPATIBLE_PROVIDER_NAME: litellm
OPENAI_COMPATIBLE_BASE_URL: http://litellm:4000/v1
OPENAI_COMPATIBLE_API_KEY_ENV: LITELLM_MASTER_KEY
OPENAI_COMPATIBLE_MODEL: claude-sonnet
OPENAI_COMPATIBLE_MODELS: claude-sonnet,gpt-4o
```

Provider secrets can be added without keeping them in process environment:

```bash
link-assistant-router providers add \
  --name litellm \
  --base-url http://litellm:4000/v1 \
  --model claude-sonnet \
  --models claude-sonnet,gpt-4o \
  --api-key "$LITELLM_MASTER_KEY"
```

## Implementation Backlog

1. Add an external LiteLLM proxy fixture in CI to exercise the full L0 and L2
   topologies end to end.
2. Expand provider capability metadata if later routing decisions need endpoint
   or parameter-level routing.
3. Decide separately whether to add non-chat LiteLLM surfaces such as
   embeddings, images, audio, rerank, batches, MCP, and A2A.

## Sources

- Issue 31: <https://github.com/link-assistant/router/issues/31>
- LiteLLM repository: <https://github.com/BerriAI/litellm>
- LiteLLM release reviewed: <https://github.com/BerriAI/litellm/releases/tag/v1.83.14-stable.patch.3>
- LiteLLM OpenAI-compatible provider configuration: <https://github.com/BerriAI/litellm/blob/litellm_internal_staging/litellm/llms/openai_like/README.md>
- LiteLLM proxy README: <https://github.com/BerriAI/litellm/blob/litellm_internal_staging/litellm/proxy/README.md>
- LiteLLM Anthropic interface notes: <https://github.com/BerriAI/litellm/blob/litellm_internal_staging/litellm/anthropic_interface/readme.md>
- LiteLLM Claude Code quickstart: <https://github.com/BerriAI/litellm/blob/litellm_internal_staging/cookbook/ai_coding_tool_guides/claude_code_quickstart/guide.md>
- Existing issue 9 multi-provider case study: [docs/case-studies/issue-9/README.md](../issue-9/README.md)
