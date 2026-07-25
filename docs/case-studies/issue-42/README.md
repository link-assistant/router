# Issue 42: Multi-subscription routing

## Scope

Issue [#42](https://github.com/link-assistant/router/issues/42) asks the router
to adopt Claudexor's multi-subscription practices, support both single- and
multi-account deployments for every existing vendor subscription, minimize
spent capacity when selecting new work, preserve sessions, and expose the
provider-native API namespaces used by Formal AI.

The implementation extends the existing `SubscriptionProvider` abstraction;
it does not create a second vendor registry. Claude, Codex, Gemini, and Qwen
therefore share one account-selection policy while retaining their existing
credential readers, refresh flows, request translations, and upstreams.

## Root cause

PR #38 added four subscription readers, but the account pool was still built
from Claude-only `OAuthProvider` instances. Codex, Gemini, and Qwen bypassed the
pool, refreshed tokens shared a cache slot per provider instead of per account,
and routing happened before the proxy copied stable session metadata. The
result was four usable single subscriptions but only one usable multi-account
provider, with no identity-stability contract.

The public HTTP surface also exposed generic Anthropic/OpenAI paths only. A
Gemini client could reach Code Assist only after translating through the OpenAI
shape, even though Formal AI demonstrates that native protocol namespaces are
useful integration boundaries.

## Adopted design

### One provider-neutral pool

`AccountRouter::new_for_provider` builds an ordered pool of
`SubscriptionReader`s for the active provider. A pool is optional: the existing
single-account path remains the default when no extra directories or account
caps are configured.

New work supports three policies:

- `round-robin` distributes requests across available accounts;
- `priority` / `fill-first` keeps using the first available account;
- `least-used` / `quota-first` compares normalized configured consumption
  (`used / limit`) and chooses the lowest spent account. Unknown limits remain
  eligible fallback capacity instead of being presented as zero usage.

`ACCOUNT_REQUEST_LIMITS` supplies the router's internal per-account limits,
ordered primary then additional accounts. A value of zero explicitly means
unknown/unlimited. Counters are atomic, and the cap check plus increment is a
compare-and-swap operation so concurrent requests cannot oversubscribe a cap.

### Stable and strict identity

The router copies routing signals before request translation:

1. a router-issued token's `account` claim is an explicit strict pin;
2. session headers (`x-claude-code-session-id`, `x-codex-session-id`,
   `x-session-id`, `session-id`) win over body metadata;
3. JSON session/conversation metadata and OpenAI `prompt_cache_key` are
   accepted as fallback session keys;
4. requests without either signal enter the configured automatic policy.

Session bindings expire after `SESSION_AFFINITY_TTL_SECS` of inactivity. A
pinned or bound account that becomes spent/unavailable fails selection; the
router does not move an in-flight conversation to a different identity.

### Quota failure behavior

Only an upstream HTTP 429 starts account cooldown. `Retry-After` is parsed in
both delta-seconds and HTTP-date forms, and the longer of that value and
`ACCOUNT_COOLDOWN_SECS` wins. Concurrent failures can extend but never shorten
an existing cooldown. Network, parsing, model, and request-shape errors do not
rotate an account.

The account-scoped refresh cache key is `(provider, account name)`. This avoids
returning account A's refreshed credential after account B has been selected.
Per-token request budgets are now enforced on subscription paths as well as the
Anthropic proxy path.

### Native protocol namespaces

The unprefixed compatibility routes remain stable. The following additive
namespaces mirror Formal AI's protocol organization:

| Namespace | Routes | Native role |
| --- | --- | --- |
| `/api/anthropic/v1` | Messages, count tokens | Anthropic subscription protocol |
| `/api/openai/v1` | models, Chat Completions, Responses | Generic OpenAI compatibility |
| `/api/codex/v1` | models, Chat Completions, Responses | Codex's native Responses upstream plus compatibility projection |
| `/api/qwen/v1` | models, Chat Completions, Responses | Qwen/DashScope's native OpenAI-compatible upstream |
| `/api/gemini/v1beta` | models, model metadata, `generateContent`, `streamGenerateContent` | Native Gemini request/response bodies |
| `/api/vertex/v1` | publisher-model generation paths | Native Vertex-style request paths over Gemini Code Assist |

Each provider-specific namespace uses the matching configured
`UPSTREAM_PROVIDER`; namespaces do not introduce cross-provider fallback.

Native Gemini streaming currently returns the complete Code Assist response as
one valid SSE data event. This preserves the native response shape and stream
transport without claiming token-by-token upstream streaming.

## Verification

The regression suite covers:

- same-session account affinity and strict no-fallback behavior;
- strict explicit account claims and unknown pins;
- all three automatic policies and normalized least-used selection;
- atomic configured limits, spent-account exclusion, cooldown extension, and
  `Retry-After` parsing;
- Codex pool selection and per-account refresh-cache isolation;
- token account lookup, request metadata extraction, and subscription budget
  enforcement;
- Gemini/Vertex native path parsing and response-envelope handling;
- configuration validation, including exact cap-to-pool cardinality.

Before implementation, compiling the new regression tests produced 26 missing
API/type errors. After implementation, the complete `cargo test --all-features`
suite passes, and a real `cargo run -- serve` startup confirms that the Axum
route table has no conflicting paths.

## Files in this case study

- [requirements.md](requirements.md) maps every issue requirement to code and
  verification.
- [online-research.md](online-research.md) records repositories, immutable
  snapshots, inspected files, findings, and design decisions.
