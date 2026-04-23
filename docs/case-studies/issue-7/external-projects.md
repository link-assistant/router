# External Project Comparison

All snapshots in this document are based on repository metadata and README content fetched on 2026-04-23. This is a README-level comparison, not a full source audit of every code path.

Primary source files are stored in [raw/](./raw/).

## Snapshot Table

| Repo | Stars | Updated | Core design | Main surfaces | Standout idea |
| --- | ---: | --- | --- | --- | --- |
| [dtzp555-max/ocp](./raw/dtzp555-max__ocp.README.md) | 48 | 2026-04-22 | CLI-backed proxy with remote client bootstrap | OpenAI-compatible | Strongest LAN/team UX, per-key auth, quotas, dashboard |
| [wende/claude-max-api-proxy](./raw/wende__claude-max-api-proxy.README.md) | 41 | 2026-04-21 | CLI-backed proxy | OpenAI-compatible | OpenClaw-focused tool name mapping and better streaming |
| [AntonioAEMartins/claude-code-proxy](./raw/AntonioAEMartins__claude-code-proxy.README.md) | 22 | 2026-04-22 | CLI-backed proxy | Anthropic + OpenAI | Dual protocol support plus MCP registry exposure |
| [GodYeh/claude-max-api-proxy](./raw/GodYeh__claude-max-api-proxy.README.md) | 13 | 2026-04-18 | CLI-backed proxy | OpenAI-compatible | Session persistence and long tool-call loops |
| [meaning-systems/claude-code-proxy](./raw/meaning-systems__claude-code-proxy.README.md) | 11 | 2026-04-01 | CLI-backed proxy | OpenAI-compatible | Minimal local API-key-protected bridge |
| [sethschnrt/claude-max-api-proxy](./raw/sethschnrt__claude-max-api-proxy.README.md) | 9 | 2026-04-23 | CLI-backed proxy | OpenAI-compatible | Usage tracking, cost-savings reporting, API-key auth |
| [Arasple/pluribus](./raw/Arasple__pluribus.README.md) | 8 | 2026-03-18 | Direct OAuth/API gateway | Anthropic Messages | Multi-account rotation, rate-window tracking, spoofing |
| [mattschwen/claude-max-api-proxy](./raw/mattschwen__claude-max-api-proxy.README.md) | 7 | 2026-04-20 | CLI-backed proxy with optional external providers | OpenAI chat + Responses | Richest ops/metrics/admin surface and model routing story |
| [NYTEMODEONLY/claude-max-proxy](./raw/NYTEMODEONLY__claude-max-proxy.README.md) | 5 | 2026-04-22 | Direct OAuth/API proxy | OpenAI-compatible | XML history reconstruction for tool support |
| [thhuang/claude-max-api-proxy-rs](./raw/thhuang__claude-max-api-proxy-rs.README.md) | 4 | 2026-04-18 | Rust CLI-backed proxy | Anthropic + OpenAI | Best Rust-side proof that dual-surface CLI bridging is practical |

## Capability Matrix

Legend:

- `Y` = clearly advertised in fetched docs
- `P` = partial / limited / indirect evidence
- `N` = not advertised in fetched docs

| Repo | Direct OAuth/API | CLI backend | Anthropic API | OpenAI API | Team auth / key mgmt | Usage / quotas | Ops / metrics / UI |
| --- | --- | --- | --- | --- | --- | --- | --- |
| link-assistant/router (current) | Y | N | Y | N | P | N | N |
| dtzp555-max/ocp | N | Y | N | Y | Y | Y | Y |
| AntonioAEMartins/claude-code-proxy | N | Y | Y | Y | Y | P | N |
| GodYeh/claude-max-api-proxy | N | Y | N | Y | N | N | N |
| meaning-systems/claude-code-proxy | N | Y | N | Y | Y | N | N |
| wende/claude-max-api-proxy | N | Y | N | Y | N | N | N |
| sethschnrt/claude-max-api-proxy | N | Y | N | Y | Y | Y | P |
| Arasple/pluribus | Y | N | Y | N | Y | Y | P |
| mattschwen/claude-max-api-proxy | N | Y | N | Y | P | P | Y |
| NYTEMODEONLY/claude-max-proxy | Y | N | N | Y | N | N | N |
| thhuang/claude-max-api-proxy-rs | N | Y | Y | Y | N | N | N |

## Patterns That Matter

### Pattern A: CLI bridge proxies dominate OpenAI compatibility

Projects:

- OCP
- AntonioAEMartins
- GodYeh
- meaning-systems
- wende
- sethschnrt
- mattschwen
- thhuang

Shared strengths:

- easy OpenAI client integration
- reuse of existing local `claude auth login`
- tool loops and session reuse through the CLI
- lower need for undocumented direct OAuth tricks

Shared weaknesses:

- extra process-management complexity
- worse fit for a pure upstream HTTP pass-through gateway
- usually weaker multi-tenant auth and persistence stories unless the repo adds them explicitly

### Pattern B: Direct OAuth/API gateways are better at "router" behavior

Projects:

- current router
- pluribus
- NYTEMODEONLY

Shared strengths:

- lower translation overhead
- more natural fit for Anthropic-style gateway deployment
- better path toward token substitution and multi-tenant access control

Shared weaknesses:

- OpenAI compatibility is much harder
- tool support often depends on undocumented behaviors
- compatibility hacks get riskier over time

### Pattern C: Product polish is concentrated in only a few repos

Projects that add strong operator or deployment UX:

- OCP: LAN bootstrap script, per-key quotas, dashboard, remote client onboarding
- mattschwen: metrics, ops pages, responses API, capabilities, external provider routing
- AntonioAEMartins: dual Anthropic + OpenAI surfaces, MCP registry
- sethschnrt: usage accounting and cost-savings reporting

## What This Means For Link.Assistant.Router

The comparison suggests a clear split of responsibilities:

- Use the current direct proxy design for official Claude Code gateway traffic.
- Add a CLI-backed compatibility path for OpenAI-style traffic.
- Borrow product features from the stronger operator-oriented projects:
  - per-key auth and quotas from OCP
  - dual-surface support and MCP registry ideas from AntonioAEMartins
  - usage accounting from sethschnrt
  - metrics, capabilities, and responses API ideas from mattschwen
  - multi-account and quota-window ideas from pluribus

The one feature that should stay explicitly experimental is direct OAuth tool emulation via injected prompts and XML history rewriting. That approach is useful to study, but it should not become the default transport for the router.
