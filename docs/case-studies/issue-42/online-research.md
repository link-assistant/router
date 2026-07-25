# Online research and source inventory

Research was performed on 2026-07-22. Repository analyses use immutable commit
links so later upstream changes do not rewrite the evidence.

## Primary requested references

### Claudexor

- Repository: [razzant/claudexor](https://github.com/razzant/claudexor)
- Snapshot: [`2b0a5e17c6bc1298c43f360da32630042170c28e`](https://github.com/razzant/claudexor/tree/2b0a5e17c6bc1298c43f360da32630042170c28e)
- Inspected sources:
  [architecture](https://github.com/razzant/claudexor/blob/2b0a5e17c6bc1298c43f360da32630042170c28e/docs/ARCHITECTURE.md),
  [credential profile policy](https://github.com/razzant/claudexor/blob/2b0a5e17c6bc1298c43f360da32630042170c28e/packages/orchestrator/src/credential-profiles.ts),
  [orchestrator integration](https://github.com/razzant/claudexor/blob/2b0a5e17c6bc1298c43f360da32630042170c28e/packages/orchestrator/src/orchestrator.ts),
  and their adjacent tests/schema.

Findings adopted:

- route precedence is explicit pin, then sticky conversation identity, then
  automatic pool selection;
- explicit/sticky identities are strict and do not silently fall back;
- rotation is driven by typed quota evidence rather than arbitrary failures;
- eligible targets are ordered, enabled, unspent, and the same credential kind;
- unknown quota stays unknown and eligible instead of appearing unused;
- the credential identity follows the request/session through observability.

Claudexor has richer live vendor quota snapshots and preflight policies than
this proxy currently has. The portable subset implemented here is explicit
caps plus normalized request consumption, 429 cooldowns, and strict identity.

### Formal AI

- Repository: [link-assistant/formal-ai](https://github.com/link-assistant/formal-ai)
- Snapshot: [`20ed7700656e32f7d6285b98c999ba7ad0c5342f`](https://github.com/link-assistant/formal-ai/tree/20ed7700656e32f7d6285b98c999ba7ad0c5342f)
- Inspected sources:
  [server protocol dispatcher](https://github.com/link-assistant/formal-ai/blob/20ed7700656e32f7d6285b98c999ba7ad0c5342f/src/server.rs),
  [multi-protocol HTTP test](https://github.com/link-assistant/formal-ai/blob/20ed7700656e32f7d6285b98c999ba7ad0c5342f/tests/integration/multi_protocol_api.rs),
  and [server API documentation](https://github.com/link-assistant/formal-ai/blob/20ed7700656e32f7d6285b98c999ba7ad0c5342f/docs/configuration/server-api.md).

Findings adopted:

- protocol-specific namespaces make client configuration explicit and avoid
  collisions: `/api/openai/v1`, `/api/anthropic/v1`, `/api/gemini/v1beta`, and
  `/api/vertex/v1`;
- native model discovery and native generation should be tested alongside
  compatibility APIs;
- Gemini `generateContent` and `streamGenerateContent` keep Gemini request and
  response shapes instead of forcing an OpenAI projection.

## Related implementations evaluated

| Project | Relevant behavior | Decision |
| --- | --- | --- |
| [hjanuschka/pi-multi-pass](https://github.com/hjanuschka/pi-multi-pass) | Quota-first identity selection for Codex/Gemini and runtime failover | Adopt the least-spent policy name/intent; retain provider-local pools |
| [Neurolink Claude proxy](https://github.com/juspay/neurolink/blob/release/docs/features/claude-proxy.md) | Fill-first identity stability, cooldowns using `Retry-After`, and no failover for request/model errors | Adopt fill-first alias, typed 429 cooldown, and strict non-quota behavior |
| [raine/claude-code-proxy](https://github.com/raine/claude-code-proxy) | Small transparent Claude OAuth proxy with compatibility headers | Preserve transparent token substitution and existing Anthropic behavior |
| [kittors/CliRelay](https://github.com/kittors/CliRelay) | Multi-provider CLI credential relay and OpenAI-compatible surface | Confirms shared provider abstraction; avoid importing its broader relay scope |

## Decision synthesis

The references converge on four rules that fit this repository:

1. select identity once from stable request/session data;
2. distinguish explicit identity from automatic selection;
3. use quota/rate-limit evidence for account availability, not generic errors;
4. keep each wire protocol accessible under an unambiguous namespace.

The implementation intentionally leaves live vendor quota polling for a future
change. That feature needs provider-specific freshness/provenance contracts;
guessing it from nonstandard headers would violate the research's central rule
that unknown quota must remain unknown.

