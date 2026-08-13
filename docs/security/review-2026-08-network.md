# Network and data-flow security review — August 2026

Issue [#149](https://github.com/link-assistant/router/issues/149) requested a
second, whole-router review after the admin-focused [issue #52
review](review-2026-08.md). This document records the threat model, every
network route, data egress, secret lifecycle, persistence and release checks,
including controls that were found to be sound.

Review target: `main` at `0498d39` plus the fixes in pull request
[#155](https://github.com/link-assistant/router/pull/155).

## Threat model and deployment modes

The router can spend paid upstream accounts and sees prompts and responses.
The review distinguishes these actors:

| Actor | Capability | Security objective |
| --- | --- | --- |
| Unauthenticated remote caller | Reach the proxy port, and possibly a mistakenly exposed admin port | Cannot consume inference, inspect provider/account state, mutate configuration, or make the router parse privileged requests |
| Valid task-token holder, including an autonomous agent | Use the documented client APIs until its expiry/request cap | Cannot reach undocumented upstream paths, obtain upstream credentials, administer the router, or escape its token budget |
| Administrator | Present an admin-scoped JWT, configured admin key, or claimed UI credential | May manage tokens/providers/login state; secret values are returned only when initially minted |
| Local user/log reader | Read files allowed by OS permissions | Must not receive plaintext credentials from router-managed logs; metadata logs should be owner-only |
| Compromised dependency or build service | Influence source, CI, or published artifacts | Releases should be reproducible and attributable to the reviewed tag |

An attacker who can read `TOKEN_SECRET`, vendor credential homes, or arbitrary
files as the router's OS user remains out of scope: that access already permits
credential theft. Multi-user hosts are still relevant, which is why log modes
are reviewed.

Deployment modes change reachability, not authorization:

- The proxy listener defaults to `0.0.0.0:8080`; it is public when the host,
  container platform, or ingress exposes it. The process provides HTTP, not
  TLS, so public deployments require a TLS reverse proxy.
- The optional admin UI is a separate listener, disabled by default and bound
  to loopback by default. Exposing it creates a first-visitor claim window
  unless `TOKEN_ADMIN_KEY` pre-provisions the administrator.
- Telegram and VK administration poll outward and open no listener. Their
  security properties are covered by the earlier review.
- Disabling an API flag removes its routes; it does not turn them into proxy
  fallbacks. Unknown paths now return a local 404.

## Complete route and authorization map

Authorization is applied as route middleware before JSON/path extractors and
before automatic provider health/routing work. Handler checks remain as defense
in depth. Method mismatches and unknown paths are never forwarded.

### Network-facing proxy listener

| Route group | Methods | Gate and exposure |
| --- | --- | --- |
| `/health` | GET | Public; fixed `ok`, no state |
| `/actor/code`, `/outbox/code`, `/actors/code/followers`, `/activities/follow-problemsets-code-001` | GET | Public ActivityPub documents, required for federation |
| `/inbox/code` | POST | Public ActivityPub ingress; parses bounded JSON and acknowledges it, but does not mutate router/provider state |
| `/metrics` | GET | Public when metrics are enabled; aggregate counters only, no token/account identities |
| `/api/tokens`, `/api/tokens/list`, `/api/tokens/revoke`, `/api/tokens/rotate` | documented GET/POST methods | Admin middleware before parsing; handlers recheck scope and rotation rules |
| `/api/providers`, `/api/providers/{name}` | GET/POST/DELETE as registered | Admin middleware; responses use redacted provider records |
| `/api/login`, `/api/login/{id}`, `/api/login/{id}/code` | POST/GET/DELETE as registered | Admin middleware; absent when login is disabled |
| `/v1/messages`, `/v1/messages/count_tokens`, `/api/anthropic/v1/messages`, `/api/anthropic/v1/messages/count_tokens` | POST | Valid task token before parsing/routing; absent when Anthropic API is disabled |
| `/invoke`, `/invoke-with-response-stream` | POST | Valid task token; explicit Bedrock compatibility routes |
| `/api/latest/anthropic/v1/messages` and `/api/latest/anthropic/v1/messages/count_tokens` | POST | Valid task token; these are the only retained legacy-prefix routes |
| Three documented Vertex Anthropic `rawPredict`, `streamRawPredict`, and count-token shapes | POST | Valid task token plus fixed publisher/action validation; other actions return 404 |
| `/v1/chat/completions`, `/v1/responses`, and their `/api/openai`, `/api/codex`, `/api/qwen` aliases | POST | Valid task token before parsing/routing; an explicitly configured MPP payment challenge is the intentional pre-token exception |
| `/v1/models` and `/api/{openai,anthropic,codex,qwen}/v1/models` | GET | Valid task token before provider-health/catalog lookup |
| `/api/gemini/v1beta/models[/{model}]` | GET | Valid task token before Gemini health/catalog lookup |
| `/api/gemini/v1beta/models/{model}:{generateContent,streamGenerateContent}` | POST | Valid task token before parsing/routing; native action parser limits upstream operation |
| `/api/vertex/v1/{provider-specific-path}` | POST | Valid task token before parsing/routing; native target parser accepts only Gemini generation actions and uses a fixed Code Assist upstream operation |
| `/v1/usage`, `/v1/accounts` | GET | Admin middleware plus handler-level authorization; ordinary task tokens cannot read them |
| Everything else | any | Local JSON 404; no OAuth lookup or upstream request |

When MPP is configured for OpenAI-compatible generation, missing payment
credentials intentionally receive 402 before router-token validation so an
agent can discover the charge. Submitted payment credentials currently receive
501 because payment verification is not implemented; they never reach an
upstream.

### Dedicated admin listener

`/api/admin/status`, `/api/admin/bootstrap`, and
`/api/admin/bootstrap/confirm` implement the public two-phase first claim and
carry their own checks. Every other `/api/*` route is protected by router-wide
admin middleware, including rotate, summary, usage, accounts, token management,
and provider listing. The embedded UI assets are public so a browser can load
the claim screen; CSP, frame denial, MIME sniffing, and referrer protections
cover assets and API errors.

## Confirmed findings

### F1 — High — valid tokens could forward arbitrary upstream paths

The production router used `fallback(proxy_handler)`. Any unmatched path or
method presented with a valid task token was sent to `UPSTREAM_BASE_URL` after
OAuth substitution. A task agent could therefore exercise upstream operations
outside the documented LLM gateway contract.

Reproduction before the fix: authenticated `POST
/not-a-supported-provider-path` attempted a connection and returned 502 rather
than 404. Fixed by explicit legacy/Vertex routes, action validation, and a local
404 fallback. Regressions:
`unknown_paths_never_reach_the_oauth_upstream` and
`only_documented_legacy_and_vertex_shapes_are_routable`.

Tracking: [#158](https://github.com/link-assistant/router/issues/158).

### F2 — Medium — parsing and provider discovery preceded client auth

OpenAI handlers parsed JSON and selected an automatic provider before their
downstream authorization check. Native Gemini generation did the same, while
native model discovery had no client check. Unauthenticated callers could
observe parsing/catalog differences and trigger credential-health reads.

Reproduction before the fix: malformed unauthenticated `/v1/chat/completions`
returned 400, and Gemini model endpoints returned catalog-shaped results,
instead of 401. Fixed by client-route middleware, retaining MPP as an explicit
exception. Regressions:
`client_authentication_precedes_body_parsing_and_provider_discovery` and
`configured_mpp_challenge_precedes_client_authentication_and_parsing`.

Tracking: [#159](https://github.com/link-assistant/router/issues/159).

### F3 — Low — proxy admin handlers authenticated after extraction

Token, provider, and login mutation handlers checked admin authority inside
the handler, after Axum JSON extraction. An unauthenticated caller could make
the service parse privileged request shapes and distinguish malformed input.

Fixed by default-protecting the complete proxy-admin route group before
extractors; handler checks remain. The admin cases are included in
`client_authentication_precedes_body_parsing_and_provider_discovery`.

Tracking: [#160](https://github.com/link-assistant/router/issues/160).

### F4 — Low — audit log inherited permissive filesystem modes

The optional audit JSONL contains token IDs and labels, provider, route, and
model metadata. It was created according to the process umask and did not
repair an existing permissive file; a common 022 umask yielded mode 0644.

Fixed by opening new files as 0600 on Unix and reapplying 0600 on every reopen,
matching the request log. Regression: `audit::tests::enabled_log_is_owner_only`.

Tracking: [#161](https://github.com/link-assistant/router/issues/161).

## Data egress and observability

- Client request headers are copied upstream except hop-by-hop fields,
  `authorization`, `x-api-key`, and `content-length`; the router then injects
  the selected upstream credential and required vendor protocol headers.
- Upstream responses may return safe end-to-end headers, including request IDs
  and quota/rate-limit metadata. Hop-by-hop headers, connection-nominated
  headers, `content-length`, credentials, cookies, and private `x-codex-*`
  metadata are removed.
- Transparent/native routes intentionally relay vendor response bodies,
  including vendor error text. Translated dialects parse and reshape responses;
  malformed/non-JSON upstream errors are replaced with router errors. A task
  token therefore authorizes access to the content and normal vendor metadata
  of its own calls, not to upstream credentials.
- The bounded request log intentionally records complete client and upstream
  exchanges for diagnostics. It redacts credential headers, credential-shaped
  query/body fields, JWTs, known token prefixes, and oversized bodies; it is
  mode 0600 on Unix. Prompt/response content is not generally secret-redacted,
  so operators must treat this log as sensitive and control retention/access.
- The audit log records identifiers and request metadata, never bearer tokens,
  upstream credentials, prompts, or responses. It is optional and now 0600.
- Normal logs and `doctor` print credential state/path/expiry information, not
  credential values. Login transcript errors are redacted before truncation.

Per-token request caps are enforced immediately after authentication and before
upstream work. They limit request count, not monetary spend or tokens generated;
an operator who gives an autonomous agent a token must choose expiry and request
cap accordingly.

## Secret lifecycle

| Secret | Source and memory | Persistent form / output |
| --- | --- | --- |
| `TOKEN_SECRET` | Environment/CLI configuration; derives JWT HMAC and provider-encryption key | Not persisted or logged by the router |
| Task/admin JWT | Minted from CSPRNG/JWT signing and validated per request | Returned once; token store persists ID, label, scope, expiry, account, revocation and usage metadata, not the bearer JWT |
| UI claim credential | Minted in memory; candidate expires; active value compared by digest | Only SHA-256 digest and claim time persist; candidate/rotated token returned once |
| Claude/Codex/Gemini/Qwen OAuth | Read from vendor-owned credential homes; refreshed values cached in memory | Router does not copy plaintext tokens into its token/provider stores or audit log |
| Generic provider API key | CLI/env or admin import; decrypted only for forwarding | AES-256-GCM ciphertext with random nonce under a key derived from `TOKEN_SECRET`; APIs expose only `has_encrypted_api_key` |
| Telegram/VK credentials and pasted admin values | Environment and short-lived chat session memory | Values are not logged; platform message history remains an accepted channel risk |

Token and request logs are owner-only on Unix. Provider records are encrypted,
but the broader unification of owner-only atomic storage is tracked with the
durability work below.

## Persistence and corruption review

Token mutations hold a shared in-process write lock across load/change/save.
File-backed stores write a unique `create_new` temporary file, flush it with
`sync_all`, and rename it atomically; write errors remove the temporary file.
The text and binary formats have migration/round-trip/concurrency regressions,
and malformed data fails closed instead of silently becoming an empty store.

Remaining limitations are explicit: locks do not coordinate multiple router
processes sharing one data directory; the parent directory is not fsynced after
rename; the two formats in `StoragePolicy::Both` are not one transaction; and
provider/admin persistence uses separate atomic-write implementations. A crash
or secondary-write failure can therefore lose the last acknowledged mutation
or leave redundant stores divergent. Follow-up:
[#162](https://github.com/link-assistant/router/issues/162).

## Dependency and release pipeline

- CI runs `cargo audit` and `npm audit --audit-level=high`; the local npm audit
  for this review reported zero vulnerabilities. The justified
  `RUSTSEC-2023-0071` RSA ignore remains unreachable because router JWTs use
  HS256 and perform no RSA private-key operation.
- Locked dependencies, formatting, Clippy, docs, tests, a line-coverage ratchet,
  changelog checks, and version-change policy run on pull requests. Releases
  are created from versioned tags; Docker builds check out that tag and combine
  architecture images by immutable digest. GHCR anonymous pullability and
  manifest platforms are verified after publication.
- Residual supply-chain risk: workflows use mutable major-version action tags
  and stable toolchain selectors. Published artifacts are not explicitly
  signed, and the workflow does not publish and verify an SBOM/provenance
  attestation. Follow-up: [#163](https://github.com/link-assistant/router/issues/163).

## Checked and found sound

- Unknown routes cannot touch upstream OAuth credentials after F1.
- All inference/model routes require a valid task token before parsing or
  provider selection after F2; revoked/expired tokens fail before upstream work.
- Administrative routes are default-protected on both listeners; ordinary task
  tokens cannot list accounts, token labels, credential paths, or providers.
- Model/provider APIs return redacted records and do not serialize stored keys.
- Required upstream headers are added after client credential headers are
  removed; response relaying strips credential, cookie, private Codex, and
  hop-by-hop headers.
- ActivityPub public endpoints expose only configured actor metadata and static
  collections; inbox payloads do not mutate account, token, or provider state.
- Public metrics are aggregate and do not contain task-token identities.
- Request and login logging use bounded storage/redaction; audit records contain
  metadata only; secret environment values are hidden from CLI help.
- Token storage uses unique temporary files and serialized in-process writes;
  existing concurrency tests cover lost-update and corruption regressions.
- Release version changes are automated and container architecture digests are
  verified before manifest publication.

## Residual and accepted risks

1. Public HTTP requires an external TLS terminator and network controls.
2. The admin first-visitor claim window, UI `localStorage`, inline-style CSP
   exception, and chat-platform history risks remain as documented in the prior
   review.
3. Public ActivityPub ingress and aggregate metrics remain intentionally public.
4. A valid task token can spend the account within its request count/expiry;
   there is no token-cost or currency budget.
5. Transparent/native vendor bodies and safe quota/request-ID headers are
   visible to the caller by design.
6. Diagnostic request logs contain prompt and response content after credential
   redaction; access and retention are operator responsibilities. Per-token log
   attribution remains tracked in [#145](https://github.com/link-assistant/router/issues/145).
7. Multi-process/power-loss persistence limitations remain tracked in #162.
8. Immutable build inputs and signed artifact provenance remain tracked in #163.
9. MPP payment verification is not implemented; payment credentials fail closed
   with 501.
