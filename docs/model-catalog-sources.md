# Operator model catalog sources

Router discovers model inventory from authenticated provider catalogs. It no
longer bundles the static model list described in issue #727. Configurable
sources overlay that live inventory; leaving them unset preserves the existing
catalog and routing behavior exactly.

Set `MODEL_CATALOG_SOURCES` to comma-separated HTTP(S) URLs, file paths, or local
`file://` URLs. The equivalent repeatable flag is `--model-catalog-sources`.
Router loads sources before readiness and refreshes them every 10,800 seconds
(three hours). Set `MODEL_CATALOG_REFRESH_SECS` or
`--model-catalog-refresh-secs` to a positive interval between 1 and 31,536,000
seconds. Relative file paths resolve from the server's working directory.

Documents use [the model catalog JSON Schema](../schemas/model-catalog.v1.json)
and the canonical [model-truth descriptor](model-truth-contract.md). For example,
[examples/model-catalog.json](../examples/model-catalog.json) defines a friendly
name for an exact model from a stored OpenAI-compatible provider named `local`:

```sh
router serve --model-catalog-sources examples/model-catalog.json \
  --model-catalog-refresh-secs 60
```

The compact equivalent, without a source file, is:

```sh
router serve --local-model friendly=local:vendor-model
```

Repeat `--local-model` for more entries. The provider must already be configured
and enabled, support the token's signed client, and advertise the exact upstream
ID through its authenticated live catalog. A local entry creates no provider,
secret, credential, endpoint, protocol permission, or subscription grant.
Colons inside upstream IDs are retained. Subscription channel names are
`anthropic` (also `claude`), `codex`, `gemini`, and `qwen`; other names refer to
stored OpenAI-compatible providers. Subscription definitions must preserve the
exact ID (`id=anthropic:id`); subscription renaming is rejected.

## Precedence and model truth

Definitions are keyed by canonical provider and exact, case-sensitive selector.
Later sources replace earlier definitions for the same key; local flags apply
after every source, with the last repeated definition winning. Different
providers stay independent. Live models absent from a source remain present.
An accepted empty document removes that source's definitions. A source cannot
remove inventory, shadow a separately advertised live ID with an alias, or
invent a provider-advertised dynamic alias. Aliases appear only while the exact
upstream target is present in that provider's eligible live inventory.

Source capability values remain explicit operator overrides under the row's
`router_model_definition`, labelled with `source_kind: operator_override`.
They do not replace authenticated capability evidence or borrow target
capabilities for an alias. JSON null remains unknown. Source documents must
leave `upstream_served_model`, account, endpoint, and provenance null, protocol
lists empty, and substitution disabled: these are request-time observations or
credential authority. A whole document is rejected if any entry violates its
schema, has a duplicate provider/selector, or contradicts those rules.

Token model allow-lists are checked against the requested selector before
routing or provider I/O. Upstream requests use the configured exact target, and
responses retain the provider's served ID. A token pinned to an alias does not
gain permission to request its target ID or any other model. Existing signed
client, subscription entitlement, account eligibility, and provider model
restrictions apply unchanged.

## Refresh and bounds

Every source has its own last-good snapshot. Invalid JSON, schema failures,
missing files, refused URLs, oversized documents, HTTP failures, and fetch
timeouts retain the previous snapshot. Before its first success a source
contributes nothing. The warning is emitted once per source during consecutive
failures and becomes eligible again after recovery; debug tracing reports
successful refreshes. Logs identify sources by index, avoiding URL secrets.
A failed source does not stop other sources refreshing.

Each source is limited to 1 MiB, 4,096 definitions, and a 15-second fetch.
There are at most 32 sources. Both declared HTTP lengths and streamed body
sizes are checked; file reads are bounded too. HTTP redirects are refused.
Catalog HTTP transport uses `UPSTREAM_ALLOW_PRIVATE_NETWORKS`, including DNS
checks at connection time, and disables environment proxies so remote proxy
resolution cannot bypass the guard. URL credentials are rejected. To read a
catalog from a loopback mock server, explicitly set
`UPSTREAM_ALLOW_PRIVATE_NETWORKS=loopback`.

Last-good external definitions are held in memory. After restart, sources load
again; the live catalog continues to use its existing credential-aware cache.

## Management inspection

With the deployment's admin credential, read:

```sh
curl -H "Authorization: Bearer $ROUTER_ADMIN_TOKEN" \
  http://127.0.0.1:8080/api/management/routing/model-definitions/local
```

The response is `{ "channel": "local", "models": [...] }`, with effective
model-truth descriptors for the channel. Subscription results contain only
currently routable live account records; compatible-provider results use the
same live inventory and overlay as inference discovery. Unknown channels return
404, and an unavailable compatible-provider live catalog returns 503. The route
uses existing management authentication, listener policy, and lockout and is
absent from inference-only listeners.
