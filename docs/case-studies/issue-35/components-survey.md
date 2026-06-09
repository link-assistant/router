# Existing Components & Libraries Survey

The issue explicitly asks to "check known existing components/libraries that
solve a similar problem or can help in solutions." The two sub-problems are:

1. **Hiding an upstream credential behind a gateway-issued key** (token
   substitution).
2. **Limiting how much each issued key can consume** (per-key budget).

| Component | Credential hiding | Per-key usage limit | Fit for this repo |
| --- | --- | --- | --- |
| [LiteLLM proxy](https://docs.litellm.ai/docs/proxy/virtual_keys) | Virtual keys map to real provider keys held server-side. | `max_budget` (spend $), `budget_duration`, `rpm_limit`/`tpm_limit`, `max_parallel_requests`; rejects on exceed. | Closest prior art. Heavyweight (Python, DB, full provider matrix); pulling it in would replace, not complement, this Rust gateway. Used as the **design reference** for the budget feature. |
| [Portkey AI Gateway](https://portkey.ai/) | Virtual keys / configs hold provider secrets. | Budgets and rate limits per key/workspace. | SaaS-leaning; same conceptual model, not embeddable as a library here. |
| [Kong AI Gateway](https://konghq.com/products/kong-ai-gateway) | Plugin holds upstream auth. | Rate-limiting / cost plugins. | General API-gateway; far larger surface than a single-subscription Claude proxy needs. |
| Community Claude proxies (e.g. `claude-code-proxy`-style projects) | Substitute a static API key / OAuth token upstream. | Generally **none** — they proxy but do not meter per client key. | Confirms credential substitution is standard, but the per-task limit (the issue's core ask) is the gap this PR fills. |
| Rust crates: `jsonwebtoken`, `governor`, `tower_governor` | — | `governor`/`tower_governor` give time-windowed rate limiting (requests/second). | `governor` solves *rate over time*, not a *total lifetime budget per token* with persistence. Adopting it would not satisfy "limit how much each task can use" (a cumulative cap survived across restarts). |

## Decision

- **Credential hiding** was already implemented in the router (the `la_sk_` →
  OAuth bearer substitution). The only change needed was correctly *reading* the
  real nested credential — a bug fix, not a new component.
- **Per-task limit**: rather than add a dependency, we implemented a minimal,
  persisted **per-token request counter** (`max_requests` / `used_requests`)
  modeled on LiteLLM's per-key budget concept. Reasons:
  - The existing `TokenStore` already persists `TokenRecord`s, so the counter
    rides along for free and survives restarts (which `governor`'s in-memory
    limiter and LiteLLM's external DB would not, respectively, satisfy without
    extra moving parts).
  - "Number of requests" is the unit the issue names ("limit how much each task
    can use tokens"), and it is provider-agnostic across the Anthropic, OpenAI,
    and Gonka forwarding paths.
  - Zero new dependencies keeps the strict clippy/file-size CI gates and the
    single-container deployment story intact.

A spend- or token-based budget and a time-windowed `rpm`/`tpm` limit remain
natural future extensions on the same `TokenRecord`, but are out of scope for
this issue's explicit request.
