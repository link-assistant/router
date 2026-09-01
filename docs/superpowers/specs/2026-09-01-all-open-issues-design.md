# All Open Issues Delivery Design

**Date:** 2026-09-01

**Scope:** GitHub issues #376, #377, #378, #379, and #380, delivered in one
pull request and one patch release. If that release fails, repair it through a
separate follow-up pull request and repeat release verification.

## Context

The five reports touch different user-facing entry points, but each failure is
at a protocol boundary where the router infers intent from an incidental field
or applies a legacy normalization rule too broadly. The implementation will
make those boundaries explicit without restructuring unrelated code:

- remote authorization chooses device polling from the login status;
- native Gemini and Vertex handlers own JSON-extraction failures and render
  them in the Gemini error dialect;
- subscription request parameters are reconciled from a centralized provider
  capability matrix;
- `router with codex` overlays routing through Codex CLI configuration flags
  while retaining the user's real configuration and state;
- the Codex Responses Lite marker selects a distinct normalization mode and is
  the only additional client header forwarded upstream.

The changes share the existing `PresentedError`, `ProviderCapabilities`,
`TemporaryClient`, and subscription-normalization boundaries. No new
dependencies or compatibility layers are required.

## #376: Poll device login even when a verification URL is present

`authorize_remote` currently decides a response is a device flow only when it
has `user_code` and lacks `url`. Current Codex responses correctly contain both
the URL to open and the user code to enter, so the client falls through to the
paste-code prompt.

After an already-authorized response is handled, `status ==
"awaiting_device"` is the authoritative signal to call
`poll_until_authorized`. The URL and user code remain presentation fields and
are printed when present. Code-flow responses such as `awaiting_code` continue
through code submission. The regression fixture will include both `url` and
`user_code` and assert that the next request is `GET /api/login/{id}`, not a
code submission.

## #377: Keep malformed JSON in the Gemini dialect

Axum's `Json<Value>` extractor currently rejects malformed bodies before the
native Gemini and Vertex handlers run. Axum therefore supplies its own response
instead of the router's Gemini envelope.

Both handlers will accept `Result<Json<Value>, JsonRejection>`. A successful
extract continues unchanged. A rejection is converted by a dialect-aware
`malformed_json_response_for_dialect(ApiDialect, &str)` helper in
`api_error.rs`. The helper keeps the existing message prefix and uses
`PresentedError` with HTTP 400. Gemini and Vertex clients therefore receive:

```json
{
  "error": {
    "code": 400,
    "message": "Failed to parse request body as JSON: ...",
    "status": "INVALID_ARGUMENT"
  }
}
```

Regression tests cover native Gemini `generateContent`, native Gemini
`streamGenerateContent`, and the Vertex publisher-model route, including HTTP
status and `application/json` content type.

## #378: Model `top_p` support as a provider capability

Gemini translation correctly maps `generationConfig.topP` to OpenAI `top_p`,
but the ChatGPT subscription backend does not accept that field. The current
capability matrix models `temperature` but not `top_p`, so the shared request
reconciler cannot remove it.

Add `top_p: Capability` to `ProviderCapabilities`. Codex declares it
`Unsupported`; Claude, Qwen, and Gemini declare it `Native`; unknown compatible
providers declare it `Unknown`. The shared OpenAI subscription reconciler
removes a sampling field only when the selected provider explicitly marks it
unsupported. Unknown providers remain pass-through.

Unit tests prove the matrix and the direct Codex normalizer behavior. A Gemini
namespace integration test sends `topP` to an actual Codex-routed model and
asserts that the captured Codex request has no `top_p`. Existing Anthropic
translation coverage continues to prove that a lone `top_p` reaches Claude.

## #379: Preserve Codex user configuration by using CLI overlays

`router with codex` currently creates a router-owned Codex home and sets `HOME`
to it. That discards user settings such as reasoning effort, personality, MCP
servers, trust choices, and session history.

For a normal Codex run, keep the caller's `HOME` and `CODEX_HOME` untouched and
prepend repeatable `-c key=TOML_VALUE` arguments before the user's Codex
arguments:

```text
-c model_provider="link-assistant"
-c model_providers.link-assistant.name="Link.Assistant.Router"
-c model_providers.link-assistant.base_url="<router-base>/v1"
-c model_providers.link-assistant.env_key="LINK_ASSISTANT_TOKEN"
-c model_providers.link-assistant.wire_api="responses"
```

JSON string serialization supplies TOML-safe quoted string values, including
URLs containing characters that must not be interpolated into source text.
`LINK_ASSISTANT_TOKEN` remains an environment variable and is never embedded in
an argument or file. `--isolated-config` retains its explicit disposable-home
semantics and may use the existing generated Codex configuration.

Unit and process-level tests will seed a real Codex config with unrelated user
settings, capture environment and arguments in a fake Codex executable, and
prove that the file is byte-for-byte unchanged, real home variables remain in
effect, routing overrides precede user arguments, and isolated mode still does
not expose the real configuration.

Documentation will distinguish temporary CLI overlays from persistent client
setup and describe the retained user config precedence.

## #380: Treat Responses Lite as a separate Codex wire mode

Codex CLI 0.151 sends Responses Lite requests with
`x-openai-internal-codex-responses-lite: true`. In that mode it encodes tools
inside the first `input` item as `additional_tools`, keeps top-level
`instructions` empty, and omits top-level `tools`. The router's legacy Codex
normalizer currently removes every developer item and supplies default
instructions, silently deleting the tool declaration.

At the incoming HTTP boundary, recognize Responses Lite only when the header
value is exactly `true` (ASCII case-insensitive and trimmed by header parsing).
Thread a `CodexResponsesMode::{Standard, Lite}` value into subscription request
normalization. Standard mode retains all existing behavior: normalize input,
hoist system/developer text, and supply default instructions. Lite mode still
enforces shared Codex constraints (`stream: true`, `store: false`, unsupported
sampling fields, and removal of `max_output_tokens`) but preserves the entire
input array and the caller's empty instructions exactly.

For Codex only, forward the validated Lite marker upstream. Do not introduce
general client-header pass-through. Retry requests reuse the same mode and
header. A recorded 0.151-style fixture and unit/integration tests assert that
`additional_tools` reaches the captured upstream request and that unmarked
legacy requests retain their existing normalization.

## Security and compatibility

- No token is persisted in command arguments or configuration files.
- No arbitrary inbound headers are forwarded to subscription backends.
- Unknown provider capabilities are never treated as unsupported.
- Explicit isolation keeps its current privacy boundary.
- Existing non-Lite Codex requests and non-Codex subscription providers retain
  their current paths.
- Error bodies remain JSON and disclose only extractor diagnostics already
  returned on other router surfaces.

## Verification and delivery

Each issue starts with a failing regression test, followed by the smallest
implementation that makes it pass. Targeted suites run after each change. The
complete delivery gate includes formatting, compile/check, Clippy with warnings
denied, all unit and integration tests, changelog validation, and the repository
release checks.

Before opening and immediately before merging the pull request, refresh the
repository's open issue list to ensure all five required issues remain covered
by closing keywords. After merge, verify the release workflow for the merge
commit, the published GitHub release and assets, issue closure, and every
distribution check performed by the release workflow. A failed release is not
completion: diagnose the failed stage, land a focused repair pull request, and
repeat until the release is delivered.
