# Authorizing a deployment over HTTP

[Issue #47](https://github.com/link-assistant/router/issues/47) states the
problem this solves:

> Today a Docker deployment can only be authorized by mounting a credential file
> that was produced somewhere else. There is no way to log in *to the
> deployment*.

This document covers Claude's copied-code flow and Codex's device-code flow.
In both cases the human opens the returned URL and approves access.

## The flow

| Request | Does |
| --- | --- |
| `POST /api/login` | Starts Claude by default; `{"provider":"codex"}` requests a Codex device code without binding a port |
| *(human)* | Opens that URL and approves; Claude displays a code to copy, while Codex asks for the returned `user_code` |
| `POST /api/login/{id}/code` | Claude only: types the copied code into the **same, still-running** process |
| `GET /api/login/{id}` | Reports `awaiting_code`, `awaiting_device`, `authorized`, `failed` or `expired` |
| `DELETE /api/login/{id}` | Cancels a pending login and kills its process |

The middle step can take minutes, so the process started by the first request
must outlive it. It does: the router keeps a registry of live sessions keyed by
`login_id`, and the code-submitting request writes into the PTY of the session
the first request created. This is the whole reason the API has three calls
rather than one.

## Walkthrough

```console
$ docker run -d -p 8080:8080 \
    -e TOKEN_ADMIN_KEY="$ADMIN" \
    -v router-data:/data \
    ghcr.io/link-assistant/router
```

Nothing is authorized yet — `/data/claude` is empty. Start a login:

```console
$ curl -s -X POST http://localhost:8080/api/login \
    -H "Authorization: Bearer $ADMIN"
{
  "login_id": "3f2b…",
  "status": "awaiting_code",
  "url": "https://claude.com/cai/oauth/authorize?code=true&state=…",
  "session_expires_at": "2026-08-07T12:15:00Z"
}
```

Open that URL, approve, and hand the code back to the same session:

```console
$ curl -s -X POST http://localhost:8080/api/login/3f2b…/code \
    -H "Authorization: Bearer $ADMIN" \
    -H 'content-type: application/json' \
    -d '{"code":"abc123#xyz"}'
{"login_id":"3f2b…","status":"authorized","expires_at":1786500000000, …}
```

The deployment is now authorized: the credential is written into
`CLAUDE_CODE_HOME` in the layout the proxy reads, and the proxy's cached token
is refreshed, so the very next `/v1/messages` request works without a restart.

### Codex / ChatGPT

Start a provider-aware Codex device session:

```console
$ curl -s -X POST http://localhost:8080/api/login \
    -H "Authorization: Bearer $ADMIN" \
    -H 'content-type: application/json' \
    -d '{"provider":"codex"}'
{
  "login_id": "7ab1…",
  "provider": "codex",
  "status": "awaiting_device",
  "url": "https://auth.openai.com/codex/device",
  "user_code": "ABCD-EFGH"
}
```

Open the URL, enter `user_code`, and approve the device. The router polls at
the server-provided interval, handles pending, slowdown, denial and expiry,
then exchanges the returned authorization code with its PKCE verifier and
atomically writes `$CODEX_HOME/auth.json`. No inbound port is opened, so this
works unchanged in Docker, over SSH and on headless hosts.

Polling is available for clients that would rather not block:

```console
$ curl -s http://localhost:8080/api/login/3f2b… -H "Authorization: Bearer $ADMIN"
{"login_id":"3f2b…","status":"awaiting_code","url":"https://claude.com/…", …}
```

## Statuses

| `status` | Meaning |
| --- | --- |
| `awaiting_code` | The URL is live and the process is parked, waiting for a code |
| `awaiting_device` | Codex is polling while the operator enters `user_code` at the URL |
| `awaiting_callback` | A forced Codex CLI loopback flow is waiting for the browser |
| `authorized` | A credential exists and is readable by the proxy |
| `failed` | The CLI rejected the code, or no credential was produced; `error` says which |
| `expired` | The session's TTL elapsed before a code arrived; its process was killed |

`expired` is deliberately distinct from `failed`: an expired session means
"start over", a failed one means "the code was wrong".

## Lifetimes and limits

| Setting | Default | Why it exists |
| --- | --- | --- |
| `--login-session-ttl-secs` / `LOGIN_SESSION_TTL_SECS` | `900` | A human opening a browser is slow; a process parked forever is a leak. Generous, but bounded. |
| `--login-max-sessions` / `LOGIN_MAX_SESSIONS` | `4` | Each pending login is a real process. Beyond the cap, `POST /api/login` is `429`. |

A session's process is killed and its slot freed on **every** terminal path:
success, failure, `DELETE`, and TTL expiry. Cancelling is the polite way to
free a slot early.

## Who may call this

These endpoints start a process inside your deployment, so they are **admin**
endpoints: they require an admin credential as a Bearer token, exactly like
`/api/tokens/list` — either an admin-scoped `la_sk_…` token or the flat
`TOKEN_ADMIN_KEY`. They are closed when neither is presented; see
[self-hosting.md](self-hosting.md) for how to obtain one.

If you authorize by mounting a credential file and never want this surface,
remove it entirely:

```bash
link-assistant-router --disable-login-api    # or DISABLE_LOGIN_API=1
```

With it disabled the routes are not registered at all, and requests to them are
`404`.

## Choosing the login mode

The default is Claude Code's own TUI `/login` flow. The router starts bare
`claude`, recognizes and accepts the first-run theme and workspace-trust
screens, waits for the real prompt before typing `/login`, and selects the
Claude subscription login method. It does not type into unknown wizard screens:
if Claude Code changes onboarding, the request fails with the last recognized
output instead of guessing.

`setup-token` remains available by setting `LOGIN_CLI_ARGS=setup-token` or
passing `--login-cli-args setup-token`.

| Mode | How to select it | OAuth scopes requested |
| --- | --- | --- |
| TUI `/login` (default) | Leave `LOGIN_CLI_ARGS` unset or empty | `org:create_api_key`, `user:profile`, `user:inference`, `user:sessions:claude_code`, `user:mcp_servers`, `user:file_upload` |
| `setup-token` | `LOGIN_CLI_ARGS=setup-token` | `user:inference` |

Use the default when the deployment should receive the same credential Claude
Code produces interactively. Choose `setup-token` explicitly when the narrower,
long-lived credential intended for non-interactive consumers is preferable.

For local or scripted authorization, use the foreground commands:

```bash
link-assistant-router auth claude
link-assistant-router auth claude --code "$CODE"
link-assistant-router auth codex
link-assistant-router auth status
```

Claude supports `--flow code`. Codex defaults to `--flow device`; use
`--flow loopback` as an explicit fallback when device authorization is disabled
for the account. Loopback binds port 1455 (or 1457 via `--port`) and validates
OAuth state; the listener closes on success, denial, timeout and cancellation.

## Requirements

* **The CLI must exist in the image.** The default flow drives the Claude Code
  TUI and its `/login` command, so in Docker use the `with-claude-cli` image
  variant — it ships the Claude Code CLI and Node for exactly this reason,
  while the default image stays minimal for mounted-credential deployments.
  Point it elsewhere with `--login-cli-command` / `--login-cli-args` if you
  drive something else.
* **`CLAUDE_CODE_HOME` must be writable.** This is checked *before* the URL is
  returned, so a read-only mount fails immediately rather than after the human
  has already finished the browser step.
* **`CODEX_HOME` must be writable for Codex.** The router performs Codex OAuth
  directly, so no Codex CLI image variant is required.

## What is tested

`tests/login_flow_test.rs` drives the whole flow against
`examples/fake-login-cli.sh`, a stand-in for both the TUI `/login` flow and
`claude setup-token`. It reproduces the first-run screens, prompt readiness,
login-method selection and repainting URL, then waits on stdin. The tests assert
that the full-scope default URL is recovered, that a *separate* later call
reaches the same live process, that the resulting credential is readable by
`OAuthProvider` (the component that actually serves upstream requests), that
`setup-token` remains selectable with its narrower scope, and that rejection,
double submission, cancellation, expiry and the concurrency cap each behave as
described above.
