# Geolocation when using Router

Router defaults to removing explicit location metadata from supported inference
requests. This applies to requests through Router from Codex, Claude Code,
OpenCode, Qwen Code, Grok CLI, Agent and isolated Gemini API-key sessions.
Cursor Agent's private protocol remains unsupported.

The policy removes visitor location headers from Cloudflare, Vercel, CloudFront
and App Engine, plus `x-geo-*`, `x-geolocation`, `x-geolocation-*`, `x-user-location`,
`x-client-country/city/region` and `x-latitude/longitude`. It removes
`user_location` from supported OpenAI and Anthropic web-search tools and Chat
`web_search_options`, and `latLng` from Gemini `toolConfig.retrievalConfig`
(including mixed camelCase and snake_case spellings at each level). The search
tool remains enabled.

It covers ordinary and streaming HTTP inference, supported native request replay,
Anthropic message batches and JSON text WebSocket events. WebSocket consent lasts
for that connection. Prompts, tool arguments, function schemas, file contents,
binary protocols and unknown vendor fields are outside this metadata policy.
Location deliberately written into a prompt is still sent upstream.
Rust preserves native Codex zstd encoding using its bounded decoder. The
JavaScript native relay refuses encoded inference it cannot inspect (HTTP 415)
under the default policy; it does not silently forward an opaque location payload.

## Opt in for a request

Supply exactly one `x-router-share-geolocation: true` request header to Router.
The value is case-sensitive. Missing, false, invalid or repeated values keep the
default protection. Remove the header to restore the default. Router consumes
the header; it never sends that control header to a provider. Existing ingress
IP and credential filtering remains in force even when sharing is enabled.
Cloudflare's original-IPv6 and pseudo-IPv4 headers are always removed too.

For example, a client that supports custom request headers can set this header
for its Router provider. A protocol-level example is:

```bash
curl "$ROUTER_URL/api/services/openai/v1/responses" \
  -H "Authorization: Bearer $ROUTER_TOKEN" \
  -H 'Content-Type: application/json' \
  -H 'x-router-share-geolocation: true' \
  -d '{"model":"your-alias","input":"Find nearby libraries", "tools":[{"type":"web_search","user_location":{"type":"approximate","city":"London","country":"GB"}}]}'
```

Sharing permits metadata already supplied by the caller. Router does not acquire
GPS coordinates, infer a city, or fabricate a location when the header is set.
Only enable it for requests whose metadata you intend to share. Middleware
between the client and Router must preserve the header only with user consent.

## Configure Codex and Claude Code

For the default policy, leave `x-router-share-geolocation` absent from the
client's custom headers. To explicitly keep it off in a shared header template,
set its value to `false`. Router enforces the same default even when a client
already has optional search coordinates configured.

Codex documents `tools.web_search.location` as optional approximate search
location. Remove that field from the applicable user/profile configuration to
avoid supplying those coordinates in the first place; retain any search context
or domain settings. Router also removes the resulting request metadata unless
sharing is explicitly enabled. To opt in with a custom Router provider, add the
header to that existing provider's user configuration:

```toml
[model_providers.router.http_headers]
x-router-share-geolocation = "true"
```

Use your actual Router provider identifier in place of `router`. Remove just
this header or change its value to `false` to restore protection. This requires
inference to use that provider. See the
[Codex configuration reference](https://developers.openai.com/codex/config-reference/).

Claude Code supports newline-separated `ANTHROPIC_CUSTOM_HEADERS`. For an
already configured Router session, include `x-router-share-geolocation: true`
in that value to opt in; remove that entry or change it to `false` to restore
protection. Preserve any other required custom headers. The variable can also
be set under `env` in Claude Code's user settings; restart the client after
changing launch configuration. See the
[Claude Code environment reference](https://code.claude.com/docs/en/env-vars).
The separate Claude account location setting is described below.

## Limits and vendor settings

A network connection exposes its source IP to its destination. A local Router
normally uses the same public IP as the client. Remote Router deployment can
change the visible egress IP, but it does not prevent all location inference.
This policy cannot guarantee that vendors never collect location. It also cannot
control client telemetry, OAuth login, browser features, subprocesses, MCP servers
or direct connections that bypass Router.
Removing explicit search location does not disable provider defaults or
IP-based inference.

Claude provides an optional location-use control in its account privacy dashboard;
turn it off there for the relevant account. Anthropic documents mandatory coarse
location inference for security that cannot be disabled. These are separate from
Router's request metadata policy. [Anthropic's explanation](https://privacy.claude.com/en/articles/11186740-does-claude-use-my-location).

Codex's documented analytics settings, Gemini/Qwen usage statistics settings and
Cursor Privacy Mode have different purposes. Disabling analytics or training is
not evidence that geolocation is disabled. Router does not install undocumented
client flags or change those settings as a proxy for location consent. The
[case study](../case-studies/issue-784/README.md) records the research, client
matrix, alternatives, verification and unresolved account-level scope.
