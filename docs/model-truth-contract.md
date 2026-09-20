# Model truth contract

Router treats an explicit model selector as an authorization boundary. The
selected spelling is sent unchanged or the request fails locally. Fallback,
model switching, and response substitution are disabled unless a user opts in
to a named setting.

This inventory is the checked repository audit for issues #592–#596. It also
records which facts Router can prove and which remain unknown.

## Canonical descriptor

`ModelTruthDescriptor` keeps these facts separate:

- the requested selector and whether it is concrete, a provider-advertised
  dynamic alias, an operator alias, or unknown;
- provider, account, endpoint, and protocol routing scope;
- the exact model placed in the upstream request;
- the concrete model reported by the upstream response, or `null` when it is
  unknown;
- capabilities and each capability field's provenance;
- whether substitution is enabled and which user setting enabled it.

JSON `null` means unknown. It is never permission to copy a request selector,
guess from an owner or name, or borrow another model's capability.

Use the authenticated diagnostic to inspect the current descriptor:

```console
router models explain <exact-id> --client <client> --local
```

The command exits unsuccessfully for an unknown or conflicting ID. Its JSON
includes the token's exact allow-list, current provider health, all exact
catalog matches, field provenance, and routing state. A completed request's
audit records are the source for the final served identity; a catalog cannot
predict that fact.

## Selection and authorization inventory

| Boundary | Enforcement | Unknown/conflict behavior |
| --- | --- | --- |
| `router with --model` | The exact, case-sensitive ID is stored in the short-lived token. | Fails before launch if absent from the authenticated catalog. |
| Forwarded client `--model`/`-m` | Parsed before launch and stored in the same token policy. | Conflicting wrapper and client selectors fail before minting or launch. |
| `--pick-model` | Uses an unpinned credential only to read the live catalog, then revokes it and mints an exact credential for the reported choice. | A supplied ordinary token that cannot be replaced cannot turn a picker choice into an unenforced hint. |
| `--allow-model <id>` | Adds only that exact catalog ID to the token allow-list. | No prefix, family, or owner matching. |
| `--allow-model-substitution` | Enables served-ID mismatch only for the same token and is shown in launch JSON. | Off by default; missing served identity still fails. |
| No explicit model | Token policy is explicitly unpinned and no model argument is injected. | A client that cannot run without Router-written model configuration asks for `--model` or explicit `--pick-model`. |
| HTTP inference routes | Token policy is checked before route/provider selection, budgets, or upstream I/O. | `model_not_allowed` names the rejected and allowed exact IDs. Policy storage failure is `model_policy_unavailable`. |
| Anthropic Messages | Body `model` checked at ingress, including translated bridges. | A pinned request with no model is `model_required`. |
| OpenAI Chat and Responses | Body `model` checked for native, stored-provider, and subscription routes. | Same typed local failures. |
| Gemini native and translated APIs | Native URL model and translated body model are normalized only between the provider's two exact advertised spellings, then checked. | A spelling not present in the grant is rejected. |
| Responses WebSocket | Every `response.create` is checked, not only the upgrade request. | A later model switch is rejected on that message. |
| Anthropic batches and generic native relays | Each inference model in the submitted body is checked. | Mixed authorized/unauthorized batches fail before dispatch. |
| Resume, subagent, background, scheduled, and direct-token reuse | These reuse the same durable token record and therefore the same server-side policy. | A new process or request cannot widen the grant. Rotation preserves it. |
| Catalog/list/get routes | Results are filtered to IDs in the caller's policy. | A pinned token cannot discover a second selectable ID through Router. |

Dynamic aliases are aliases only when the authenticated provider catalog marks
that exact entry as one. Substrings such as `auto`, `latest`, or `review` have
no special meaning. The Anthropic `[1m]` client representation is exposed only
when the live catalog contains its exact Anthropic-owned base, and the token
grant contains the exposed exact selector.

## Response identity inventory

Native vendor responses are relayed without rewriting vendor model fields.
Translated paths use `validate_translated_response` and preserve the upstream
identity in the destination protocol:

| Path | Buffered | SSE | WebSocket |
| --- | --- | --- | --- |
| OpenAI-compatible provider to Chat/Responses/Anthropic | Strict validation before translation | Identity must precede assistant content; later identity must agree | Native Responses events remain transparent and every create request is pinned |
| Codex subscription to Chat/Responses | Strict validation before translation | Same shared identity rewriter | Native Responses events remain transparent |
| Anthropic subscription to Chat/Responses | Strict validation before translation | The Anthropic stream translator emits the upstream identity | Not a translated WebSocket surface |
| Gemini subscription to Chat/Responses | Strict validation before translation | Shared validation runs before Chat/Responses stream translation | Not a translated WebSocket surface |

A strict translated request fails with `served_model_unknown` if upstream
identity is missing, `model_substitution_not_allowed` if it differs, and
`served_model_changed` if a stream changes identity. The first identity-bearing
event is validated before assistant content is released. Opting in to
substitution permits a mismatch but never relabels it.

Audit JSONL records have a `phase`. `request_authorized` records contain the
requested model, routed model, effective token policy, and `served_model: null`.
For buffered translated success, `response_completed` records append the
concrete served model. Streaming translations add `response_model_verified` as
soon as the first identity-bearing event passes validation. Both records carry
the exact provider account when applicable, selector kind, resolution reason,
and opt-in policy source. Raw native response bytes remain in the request log,
preserving their provider-issued identity without fabrication.

## Capability evidence policy

Inventory and capability are independent. A live catalog row proves that an ID
was advertised for one credential; it does not by itself prove context length,
output length, modalities, reasoning levels, pricing, tools, or a foreign
client identity.

For every advertised capability, `capability_provenance.fields.<name>` carries:

- the normalized field and value;
- source kind and exact source URL/raw field;
- retrieval time and Router version;
- provider, account, endpoint, protocols, and exact model scope;
- effective restriction and explicit conflict/unknown state.

Evidence precedence is authenticated live exact-scope metadata, then a
reviewed versioned direct-provider source for the same model/product, then an
explicit operator override, then unknown. This release does not bundle static
capability fallbacks or capability overrides, so absent live fields remain
absent. It specifically does not synthesize z.ai Claude `behavesAs` identities
or Codex reasoning profiles by owner.

One reviewed static protocol evidence manifest remains outside catalog
capability claims:
the exact Anthropic model IDs whose Messages wire format accepts adaptive
thinking. It is used only while translating a caller-requested reasoning
setting, never projected as provider metadata, and exact equality prevents a
compatible-provider ID or unknown snapshot from inheriting the behavior. The
manifest at `docs/provider-evidence/anthropic-adaptive-thinking.json` records
the product, protocol, direct source URL, and 2026-09-19 review date from
Anthropic's
[thinking migration documentation](https://platform.claude.com/docs/en/docs/build-with-claude/extended-thinking).

The official Z.ai GLM-5.3 and GLM-5.3-Flash model configurations each describe
`max_position_embeddings` as 1,048,576, and ZCode documents a stable 1M
context. Those direct sources establish base-model facts, but do not prove an
account/endpoint/client's effective limit; Router therefore does not project
them over missing live endpoint evidence:

- <https://huggingface.co/zai-org/GLM-5.3/blob/main/config.json>
- <https://huggingface.co/zai-org/GLM-5.3-Flash/blob/main/config.json>
- <https://zcode.z.ai/en/docs/welcome>
- <https://zcode.z.ai/en/docs/configuration>

OpenAI's Responses type describes `model` as the model used to generate the
response, and OpenTelemetry separately defines request and response model
attributes. Router follows that distinction rather than placing the requested
selector over the served identity:

- <https://github.com/openai/openai-python/blob/main/src/openai/types/responses/response.py>
- <https://opentelemetry.io/docs/specs/semconv/registry/attributes/gen-ai/>

## Verification and drift

Offline tests prove exact equality, durable storage and rotation, denial before
upstream I/O, conflict detection, catalog filtering, unknown capability
behavior, buffered identity preservation, strict SSE ordering, substitution
opt-in, and native/translated route behavior. Tests use two different models
from one owner so an owner-wide fallback cannot pass accidentally.

The manual credentialed tier is the provider-drift gate. It fetches the current
authenticated catalog, pins a real request, verifies served identity, and
reports every skipped credential explicitly. Run it with:

```console
ROUTER_LIVE_ZAI_API_KEY=... \
  cargo test --locked --test subscription_usage_live_test \
  real_zai_exact_model_is_pinned_and_served_identity_is_truthful \
  -- --nocapture --test-threads=1
```

The stricter issue #594 check requires the currently supported `claude` binary
and a second billing opt-in. It attempts each named GLM model separately. Exact
consumable metadata must produce the same context/compaction limit in Claude;
missing evidence must stop locally before inference:

```console
ROUTER_LIVE_ZAI_API_KEY=... ROUTER_LIVE_ZAI_CLAUDE_CONTEXT_TEST=1 \
  cargo test --locked --test subscription_usage_live_test \
  current_claude_reports_each_live_glm_context_or_router_blocks_the_launch \
  -- --nocapture --test-threads=1
```

Provider snapshots are evidence only when they retain source URL, endpoint,
account, retrieval time, raw field, and exact ID. Router-authored fixtures test
software behavior; they are never accepted as proof of a provider fact.
