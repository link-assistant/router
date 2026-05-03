# Case Study: Issue #7 - Competitive Feature Audit and Roadmap

## Issue

[Issue #7](https://github.com/link-assistant/router/issues/7) asks for three things:

1. Audit the current router against a set of community Claude Max / Claude Code proxy projects.
2. Turn that audit into a concrete requirement list for this repository.
3. Propose implementation plans that keep this project Rust-first while making it more feature-rich and configurable.

The issue also names specific dependencies and packaging goals:

- Keep the project as a Rust library + CLI + server + Docker image.
- Use `lino-arguments` for configuration.
- Persist token data with both `lino-objects-codec` text storage and `link-cli`-backed binary storage.
- Support both direct Claude Code / Anthropic-style proxying and OpenAI-compatible API surfaces.

## Summary

The current router is already strong in one important area: it is closer to Anthropic's documented Claude Code LLM gateway model than most community projects because it proxies the official upstream HTTP formats directly and swaps router-issued tokens for Claude Code OAuth credentials. That is the right foundation for official Claude Code compatibility.

The main gaps are product surface and persistence:

- no persistent token store
- no OpenAI Chat Completions or Responses API
- no `/v1/models`, `/v1/capabilities`, usage, metrics, or dashboard surface
- no CLI-subprocess backend for tool-heavy OpenAI-compatible workflows
- no multi-account routing or quota-aware scheduling
- no `lino-arguments` config layer
- no `box`-based build/deployment story

The competitive scan shows that no single upstream project combines all of the desired traits. The ecosystem has split into two design families:

- CLI bridge proxies: wrap the local `claude` CLI, then expose OpenAI-compatible APIs. These projects are strong at OpenAI compatibility, tool loops, session reuse, and local UX.
- Direct OAuth / direct API proxies: talk to Anthropic or Claude-compatible upstreams directly. These projects are stronger at low-overhead proxying, multi-account routing, and gateway-style deployment, but they rely more often on undocumented behavior when they try to emulate full tool support for third-party clients.

The recommended direction for this repository is a hybrid architecture:

- Keep the current direct proxy path as the default path for official Claude Code gateway traffic.
- Add a second backend that uses Claude Code CLI subprocesses for OpenAI-compatible surfaces and other compatibility layers.
- Put both behind one Rust policy engine so operators can choose `direct`, `cli`, or `hybrid` mode per deployment and per route family.

## Key Findings

### 1. The current router already covers the documented Claude Code gateway baseline

The current codebase exposes:

- Anthropic Messages routes
- Bedrock InvokeModel routes
- Vertex rawPredict pass-through
- `X-Claude-Code-Session-Id` forwarding
- custom router-issued tokens that are swapped for real OAuth credentials

That maps directly to Anthropic's documented gateway requirements and should remain the default safe path.

### 2. Community projects optimize for different things

The strongest recurring patterns were:

- OpenAI edge compatibility for tools like Cursor, Continue, Aider, OpenClaw, and generic OpenAI SDKs.
- local UX and deployment helpers such as launchd/systemd installers, LAN client bootstrap scripts, and dashboard pages
- per-key auth, usage tracking, and quotas for team or family sharing
- tool compatibility layers such as tool name mapping, MCP registry exposure, or XML history reconstruction
- model discovery and model aliasing
- direct OAuth workarounds for tools, often using undocumented Claude Code behaviors

### 3. "Support all features" should not mean "force one risky transport for everything"

Several advanced community features rely on undocumented behavior:

- injected Claude Code system prompts
- private or beta headers
- tool XML reconstruction
- client spoofing

Those techniques may be useful, but they should be explicitly marked experimental and kept off by default. The stable core should stay anchored to documented Claude Code gateway behavior.

### 4. The named link-foundation dependencies imply infrastructure work before feature work

Issue #7 explicitly calls for:

- `lino-arguments` for layered config
- `lino-objects-codec` for human-readable storage
- `link-cli` for binary storage
- `box`-based containerization

That means the first implementation phase should harden configuration and persistence instead of jumping straight into more API surfaces.

## Recommended Architecture

| Layer | Recommendation | Why |
| --- | --- | --- |
| Config | Replace ad hoc env parsing with `lino-arguments` | Needed for CLI flags, env vars, config file support, and future policy toggles |
| Auth and token core | Keep router-issued client tokens, but move to persistent stores with rotation, revocation, expiry, and listing | Current in-memory revocation is not enough for long-running or multi-instance deployments |
| Storage | Define a `TokenStore` / `AccountStore` abstraction with dual-write text + binary backends | Matches the issue requirement while keeping storage replaceable |
| Direct backend | Keep the current HTTP pass-through path for Anthropic, Bedrock, Vertex, and legacy Claude Code gateway routes | This is the safest and most standards-aligned part of the current router |
| CLI backend | Add a second backend that wraps Claude Code CLI subprocesses | Needed for OpenAI Chat Completions, Responses API, and tool-heavy compatibility flows |
| Frontend protocols | Serve official Claude Code gateway routes plus OpenAI-compatible routes from the same Rust server | One deployment, multiple client types |
| Routing policy | Add explicit `direct`, `cli`, and `hybrid` modes | Operators need predictable behavior, not hidden heuristics |
| Observability | Add `/v1/models`, `/health`, `/metrics`, usage endpoints, structured logs, and later `/ops` | Most mature competitors expose these surfaces |
| Packaging | Keep library + CLI + server layout; rework Docker around `box` | Matches issue direction and keeps repo shape stable |

## Proposed Delivery Plan

### Phase 0 - Research and specification

Deliverables:

- this case study
- requirement inventory
- competitor comparison
- official-docs research notes

### Phase 1 - Config and persistent token infrastructure

Goals:

- migrate config parsing to `lino-arguments`
- add `router serve`, `router tokens issue`, `router tokens list`, `router tokens revoke`, `router tokens expire`, `router doctor`
- implement persistent token metadata with storage traits
- support text storage with `lino-objects-codec`
- support binary storage through a `link-cli` adapter
- turn on both stores by default with startup consistency checks

Notes:

- The safest initial model is "text store is authoritative, binary store is mirrored".
- If later performance testing justifies it, the project can promote the binary store to a first-class indexed backend.

### Phase 2 - Operational hardening for the existing direct gateway path

Goals:

- persist revocations and expiry
- add account and token usage accounting
- add `/v1/models` and a small capability surface for direct routes
- add Prometheus-style metrics and structured request logs
- add rate limits and per-token quotas
- switch Docker build to a `box`-based build image

### Phase 3 - OpenAI-compatible API via CLI backend

Goals:

- add `POST /v1/chat/completions`
- add `POST /v1/responses`
- add `/v1/models` model aliases and resolved model reporting
- add session continuity keyed by router token plus optional client session key
- support streaming and non-streaming responses

Why CLI first for OpenAI:

- it is the most common pattern across the ecosystem
- it avoids relying on undocumented direct OAuth tool behavior
- it provides a practical bridge for tools already built around OpenAI SDKs

### Phase 4 - Advanced compatibility features

Goals:

- optional MCP registry exposure
- optional tool name mapping for popular clients
- optional per-route backend selection
- optional external provider routing and fallbacks
- optional "experimental compatibility" mode for direct OAuth tool workarounds

Default posture:

- experimental features stay opt-in
- documented gateway behavior stays default

### Phase 5 - Multi-account router and admin plane

Goals:

- multiple Claude accounts with explicit account health
- quota-aware routing and cooldown windows
- per-workspace / per-tenant policy
- admin UI and richer operations endpoints
- import/export and consistency repair tools for both storage backends

## Scope Boundaries

Recommended as default supported behavior:

- documented Claude Code gateway surfaces
- persistent router-issued client tokens
- OpenAI Chat Completions and Responses via CLI backend
- metrics, usage, health, and model discovery
- explicit config and policy controls

Recommended as experimental only:

- client spoofing
- hardcoded Claude Code identity prompts
- private or beta-header tricks beyond documented gateway behavior
- XML history reconstruction for tool compatibility
- silent provider failover that changes semantics without operator intent

## Files In This Case Study

- [README.md](./README.md) - overview and recommended roadmap
- [requirements.md](./requirements.md) - extracted requirement inventory from issue #7
- [current-router-gap-analysis.md](./current-router-gap-analysis.md) - current repo capability assessment
- [external-projects.md](./external-projects.md) - competitor comparison
- [online-research.md](./online-research.md) - official Anthropic and OpenRouter research notes
- [raw/](./raw/) - fetched README snapshots, metadata snapshots, and keyword extraction notes

## References

Official docs viewed on 2026-04-23:

- [Claude Code LLM gateway configuration](https://code.claude.com/docs/en/llm-gateway)
- [Claude Code third-party integrations overview](https://code.claude.com/docs/en/third-party-integrations)
- [Claude Code settings](https://code.claude.com/docs/en/settings)
- [OpenRouter provider routing](https://openrouter.ai/docs/guides/routing/provider-selection)
- [OpenRouter broadcast observability](https://openrouter.ai/docs/guides/features/broadcast/overview)
- [OpenRouter management API keys](https://openrouter.ai/docs/guides/overview/auth/management-api-keys)
- [OpenRouter workspaces](https://openrouter.ai/docs/guides/features/workspaces/)

External project snapshots fetched on 2026-04-23 are stored in [raw/](./raw/).
