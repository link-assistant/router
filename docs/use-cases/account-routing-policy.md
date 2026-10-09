# Per-account routing policies

Each configured subscription account can have a `routing-policy.json` file in its
credential directory. This sidecar survives vendor CLI logins and token refreshes;
it never changes the vendor's credential format. A missing file means the default
policy. Invalid JSON or unsafe policy fields exclude that account until repaired.
Policies apply to subscription inference across native and translated surfaces.

Show or replace a complete policy:

```sh
router accounts policy primary
router accounts policy account-1 --file examples/account-routing-policy/routing-policy.json
router accounts policy account-1 --server http://localhost:8080
router accounts policy account-1 --file policy.json --server http://localhost:8080
```

The local command writes the file; a running server reads local edits on its next
start. The remote command uses the admin-only management API and applies the change
immediately. `accounts list --json` and `GET /api/management/accounts` include
`routing_policy`, or `routing_policy_error` when a file is invalid. The management
API also offers `GET` and `POST /api/management/accounts/{name}/policy`; POST replaces
the entire object, with omitted fields reset to defaults. These endpoints follow
`--disable-metrics`, like the existing accounts endpoints.

| Field | Default | Behavior |
| --- | --- | --- |
| `weight` | `1` | Signed integer, at most 1,000,000. Non-positive excludes the account only under the weighted strategy. |
| `prefix` | absent | `team/model` selects the account carrying `team` and sends `model` upstream. Use distinct prefixes for distinct accounts. |
| `disable_cooling` | `false` | Ignore automatic account and model cooldowns; manual pauses, utilization threshold pauses and request caps still apply. |
| `request_retry` | absent | Number of retries after the first attempt, at most 100. Zero disables retries; positive values opt into retryable status/transport failover. |
| `request_scoped_errors` | `[]` | Ordered rules with numeric `status`, literal body `match` and `action`. |
| `headers` | `{}` | Static upstream values or copies from allow-listed client headers using `$Header-Name`. |
| `model_aliases` | `[]` | Entries with exact upstream `model`, client-facing `alias`, and optional `fork`. |
| `excluded_models` | `[]` | Case-sensitive glob patterns, with `*` matching any sequence and `?` matching one character. |

Set `ACCOUNT_ROUTING_STRATEGY=weighted-round-robin` (or use
`--account-routing-strategy weighted-round-robin`) for smooth weighted selection.
Weights 1 and 3 send roughly one quarter and three quarters of new selections to
those accounts. Session affinity and signed strict account pins retain precedence;
unavailable, paused, cooling, excluded or non-positive accounts cannot be selected.

`ACCOUNT_FORCE_MODEL_PREFIX=true` excludes accounts with a prefix from unprefixed
requests. Its default is false: those accounts also serve their unprefixed names.
A recognized prefix restricts both initial selection and retries to matching
accounts. A signed account pin never falls back to another account.

Aliases project only models discovered in that account's live catalog. By default
an alias replaces the native spelling; `fork: true` retains both. Requests send the
upstream identity, and JSON/SSE response model metadata uses the client's alias or
prefix. Prompt text and tool content are not rewritten. Token model grants are
checked against the upstream identity, including in discovery; granting an alias
alone cannot authorize its underlying model. Native names shadowed by an alias
on the same account are hidden; other accounts retain their own live native names.
Exclusions apply to upstream,
alias and prefixed names: they hide discovery entries and return 404 for an
excluded request on its selected account.

Error rules examine the status and at most the first 16 KiB of response body,
before any response byte is returned. The first match wins; an empty `match`
matches any body. `cooldown` cools the account and relays the vendor response;
`retry-next` tries another eligible account; `relay` preserves the response and
suppresses automatic cooldown/retry for that response. Retry attempts honor
`request_retry` (including zero), pool time limits, eligibility and strict pins.
No attempt is retried after streaming begins. A replay retains the same exact
upstream model selector, and uses the next account's credential, policy and
isolated HTTP client. If no next account is eligible, the last vendor reply is
relayed. Body inspection and alias SSE buffering are bounded; oversized SSE
events terminate with a stream error.

Header policies apply after provider authentication. Copy sources are limited to
`X-Request-Id`, `X-Correlation-Id`, `Traceparent`, `Tracestate`,
`X-Claude-Code-Session-Id`, `X-Codex-Session-Id`, `X-Session-Id` and `Session-Id`.
Missing source fields are omitted. Credentials (`Authorization`, `Cookie`,
`X-Api-Key`, `X-Goog-Api-Key`, `Proxy-Authorization`) cannot be copied or overwritten.
Hop-by-hop, body framing and Router control headers are protected too. The
[example policy](../../examples/account-routing-policy/routing-policy.json) needs
its sample model replaced with an exact model from your account's live catalog.
