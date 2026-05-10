# Issue 31 LiteLLM Compatibility Research

Issue: <https://github.com/link-assistant/router/issues/31>

ADR: [docs/adr/0001-litellm-compatible-gateway.md](../../adr/0001-litellm-compatible-gateway.md)

Sources reviewed on 2026-05-10.

## Summary

The issue asks for research and an architecture decision record for completing
compatibility with [LiteLLM](https://github.com/BerriAI/litellm). The practical
interpretation is API-level compatibility, not a source-level dependency:
Link.Assistant.Router should be able to sit behind LiteLLM as an
OpenAI-compatible upstream, and later should be able to route to LiteLLM as a
generic OpenAI-compatible provider.

The current router already has the main building blocks:

- OpenAI-compatible `POST /v1/chat/completions`
- OpenAI-compatible `POST /v1/responses`
- OpenAI-compatible `GET /v1/models`
- Anthropic-compatible `POST /v1/messages`
- router-issued `la_sk_...` bearer tokens
- upstream credential substitution so clients never see the protected Claude
  MAX OAuth token

The missing work is conformance and breadth: streaming OpenAI SSE translation,
model alias metadata, generic OpenAI-compatible provider configuration, and
tests that prove the router works with LiteLLM's expected `api_base` plus
`api_key` flow.

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
| OpenAI streaming SSE chunks | Required for strong LiteLLM-like gateway parity. | Gap: OpenAI stream requests currently fall back to buffered non-streaming behavior. |
| Generic OpenAI-compatible upstream provider | Needed for router-in-front-of-LiteLLM topology. | Gap: only Anthropic and Gonka upstream providers exist. |
| Model alias/capability metadata | Needed to keep LiteLLM `model_name` and router upstream IDs decoupled. | Partial: basic model mapping exists, but not a provider registry. |

## Recommended Compatibility Contract

The ADR defines three levels:

- L0: LiteLLM in front of Link.Assistant.Router.
- L1: Link.Assistant.Router as a LiteLLM-like direct gateway.
- L2: Link.Assistant.Router in front of LiteLLM.

L0 should be the first implementation target because the router already speaks
the necessary OpenAI-compatible routes. A LiteLLM config can point at the router
with:

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

## Implementation Backlog

1. Add a LiteLLM compatibility conformance test that exercises the L0 config
   shape against the router's `/v1/chat/completions`, `/v1/responses`, and
   `/v1/models` routes.
2. Replace OpenAI streaming fallback with real OpenAI SSE chunk translation.
3. Add model alias and capability metadata so LiteLLM model names and upstream
   provider IDs are not forced to match.
4. Introduce a generic OpenAI-compatible provider type for L2 routing to
   LiteLLM or any other OpenAI-compatible gateway.
5. Decide separately whether to add non-chat LiteLLM surfaces such as
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
