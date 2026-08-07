# Authorizing a deployment over HTTP

[Issue #47](https://github.com/link-assistant/router/issues/47) states the
problem this solves:

> Today a Docker deployment can only be authorized by mounting a credential file
> that was produced somewhere else. There is no way to log in *to the
> deployment*.

This document covers that scenario: a container that starts with an empty
`CLAUDE_CODE_HOME` and is authorized entirely through three HTTP calls, with a
human doing only the part a human must do — opening a URL in a browser.

## The flow

| Request | Does |
| --- | --- |
| `POST /api/login` | Starts the Claude Code CLI on a PTY **inside the container** and returns the authorization URL it printed |
| *(human)* | Opens that URL, approves, copies the code the browser shows |
| `POST /api/login/{id}/code` | Types that code into the **same, still-running** process |
| `GET /api/login/{id}` | Reports `awaiting_code`, `authorized`, `failed` or `expired` |
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
  "url": "https://claude.ai/oauth/authorize?code=true&state=…",
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

Polling is available for clients that would rather not block:

```console
$ curl -s http://localhost:8080/api/login/3f2b… -H "Authorization: Bearer $ADMIN"
{"login_id":"3f2b…","status":"awaiting_code","url":"https://claude.ai/…", …}
```

## Statuses

| `status` | Meaning |
| --- | --- |
| `awaiting_code` | The URL is live and the process is parked, waiting for a code |
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
endpoints: when `TOKEN_ADMIN_KEY` is set they require it as a Bearer credential,
exactly like `/api/tokens/list`. When it is unset they are open, like the rest
of the admin surface — see [self-hosting.md](self-hosting.md), which explains
why you should set it.

If you authorize by mounting a credential file and never want this surface,
remove it entirely:

```bash
link-assistant-router --disable-login-api    # or DISABLE_LOGIN_API=1
```

With it disabled the routes are not registered at all, and requests to them are
`404`.

## Requirements

* **The CLI must exist in the image.** The flow drives `claude setup-token` by
  default; the published image ships the Claude Code CLI and Node for exactly
  this reason. Point it elsewhere with `--login-cli-command` /
  `--login-cli-args` if you drive something else.
* **`CLAUDE_CODE_HOME` must be writable.** This is checked *before* the URL is
  returned, so a read-only mount fails immediately rather than after the human
  has already finished the browser step.

## What is tested

`tests/login_flow_test.rs` drives the whole flow against
`examples/fake-login-cli.sh`, a stand-in for `claude setup-token` that repaints
like the real TUI, waits on stdin, and prints an `sk-ant-oat…` token. It
asserts that the URL is recovered, that a *separate* later call reaches the same
live process, that the resulting credential is readable by
`OAuthProvider` (the component that actually serves upstream requests), and that
rejection, double submission, cancellation, expiry and the concurrency cap each
behave as described above.
