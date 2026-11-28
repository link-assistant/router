# Runtime configuration

Router serves its optional configuration document from
`/api/management/config`. On a serving invocation it reads
`<data-dir>/runtime.toml`, or the path in `ROUTER_RUNTIME_CONFIG`.
Command-line arguments and environment variables take precedence over TOML.
Clap's built-in defaults fill in settings absent from all three sources.

The document has `cli`, `cors`, and `payload` sections. CLI fields use the
long flag spelling, such as `port` and `upstream-provider`. The running
Router publishes its schema at `GET /api/management/config/schema`. It derives
the CLI fields from the installed Clap command, and validates values with the
same parser.

```toml
# runtime.toml
[cli]
port = 8080

[cors]
origins = ["https://console.example"]
methods = ["GET", "POST", "PATCH"]
headers = ["authorization", "content-type"]

[[payload.override]]
models = [{ name = "claude-*", protocol = "claude", token = "resume-app" }]
params = { temperature = 0.1, max_tokens = 200 }

[[payload.filter]]
models = [{ name = "claude-*", protocol = "claude", token = "resume-app" }]
params = ["top_p"]

[[payload.override]]
models = [{ name = "gpt-*", protocol = "codex", token = "resume-app" }]
params = { max_output_tokens = 200 }
```

Use a unique client token label or the token's exact ID for the `token`
selector. Parameter paths refer to the destination wire format. Claude uses
`max_tokens`, while OpenAI Responses uses `max_output_tokens`.

## HTTP management

Use a provisioned administrator credential to read the document or issue a
writer credential. For example, issue a one-hour writer by sending
`{"label":"runtime-operator","ttl_hours":1,"scope":"config:write"}` as JSON to
`POST /api/management/tokens` with the administrator Bearer credential.
Use the returned token for configuration writes. The writer can read the
configuration too. The existing management listener, peer and lockout rules
apply to both credentials.

| Method | Path | Result |
| --- | --- | --- |
| GET | `/api/management/config` | Redacted desired document |
| GET | `/api/management/config.yaml` | Redacted YAML 1.2 export |
| GET | `/api/management/config/schema` | JSON schema |
| GET | `/api/management/config/status` | Restart-required fields, overrides and last reload error |
| PUT | `/api/management/config` | Replace the full document |
| PATCH | `/api/management/config` | Apply an RFC 7396 JSON Merge Patch |
| GET, PUT, DELETE | `/api/management/config/{pointer}` | Read, set or remove one value |
| POST | `/api/management/config/reload` | Reload the file immediately |

Send JSON with `Content-Type: application/json` for PUT. PATCH accepts
`application/merge-patch+json` and `application/json`. A PATCH object
merges recursively, a null member removes its key, and an array replaces
the entire existing array. The resulting document must pass validation.

A pointer begins after `/api/management/config`. The path
`/api/management/config/cors/origins/0` addresses the first allowed origin.
Escape a slash in a key as `~1` and a tilde as `~0`. PUT may use `-` to
append an array item. Writes return the current restart and reload status.

The server preserves TOML comments where it edits existing values. JSON
values that TOML cannot represent, such as null inside a rule, use a
`payload-json` string at the top of the TOML file. This alternate section
stores the same JSON document.

Reads mask secrets with `[REDACTED]`. Sending a masked value back preserves
the stored value. Use local TOML to change the signing and administrator keys,
credential-bearing upstream destinations, the ForgeFed inbox, account egress
proxies, account credential directories, model catalog sources, external CLI
commands, audit and request log paths, and management listener, admission, and
lockout settings. Subscription bridge eligibility and proxy-client trust
require their explicit command-line or environment opt-ins.

The file watcher picks up valid changes automatically. Payload and CORS
settings take effect on the next relevant request or WebSocket turn.
Changes to effective CLI fields appear in `restart_required`. Settings
masked by the current arguments or environment appear in `overridden`.
An invalid edit keeps the last working settings, and a manual reload returns
an error. The redacted change audit is in `runtime-config-audit.jsonl` under
the data directory.

## Payload rules

The final stage sees the request after translation and provider-specific
changes. It applies `default`, `default-raw`, `override`, `override-raw`,
then `filter`. Defaults fill absent fields, overrides set fields, and filters
delete fields or array items. Raw variants parse JSON string values, which
lets a rule supply an array, object, number, Boolean or null. For example,
`params = { max_tokens = "200" }` in an `override-raw` rule sets a JSON number.

Each rule matches any of its `models` selectors. Selectors can use `*`
wildcards in model names, a destination `protocol`, a `from-protocol`,
and an exact `token` ID or label. Optional `match` and `not-match`
compare values. `exist` and `not-exist` test for present, non-null
values. Conditions see the current payload, including earlier rule changes.

Paths support dotted keys, numeric array indices, JSON Pointer, and array
equality queries such as `tools.#(type=="image_generation")#`. A query's
trailing `#` selects all matching items. An applicable override that cannot
be written, or whose final Claude request would have incompatible sampling
settings, fails before sending that inference request. Final token limits
set by rules must be positive integers.

For ChatGPT Codex subscriptions, Router enforces a rule-applied
`max_output_tokens` cap on visible output and records the applied cap under
the request ID. The local limiter estimates tokens from text length. It
cannot count hidden reasoning. The ChatGPT Codex backend rejects configured
`temperature` and `top_p`. Router returns an error before sending the
request when an applicable rule leaves one of these parameters set.

Use the response's `x-router-request-id` with
`GET /api/management/logs/requests/{id}` to see the `payload_rules_applied` record.
It includes the destination protocol and each changed path, stage, and
redacted value. Configure CORS with explicit HTTP(S) origins for a
credentialed browser console. An empty origin list leaves CORS disabled.
