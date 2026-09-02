# The admin UI

[Issue #50](https://github.com/link-assistant/router/issues/50) states the
problem this solves:

> Today the only way to mint or revoke a token is the CLI or a raw HTTP call
> with an admin key. A minimal browser UI would make the common operations —
> see which tokens exist, issue one, revoke one — obvious.

This document covers running that UI: how to turn it on, how the first visitor
becomes the administrator, and what the design costs you.

## It is off unless you ask for it

The UI is served by the router itself, but on a **separate listener** that only
exists when you give it a port:

```bash
router --admin-port 8081
```

| Flag / env | Default | Does |
| --- | --- | --- |
| `--admin-port` / `ADMIN_PORT` | — (disabled) | Port for the admin listener. No port, no admin surface at all. |
| `--admin-host` / `ADMIN_HOST` | `127.0.0.1` | Address the admin listener binds. |
| `--admin-claim-ttl-secs` / `ADMIN_CLAIM_TTL_SECS` | `120` | How long an unconfirmed bootstrap candidate stays valid. |

The two listeners are independent, which is the point: the proxy can face the
network while the console stays on loopback.

```bash
router --host 0.0.0.0 --port 8080 --admin-host 127.0.0.1 --admin-port 8081
```

Under Docker, publish the admin port to loopback only — and reach it through an
SSH tunnel rather than exposing it:

```bash
docker run -d -p 8080:8080 -p 127.0.0.1:8081:8081 \
    -e ADMIN_HOST=0.0.0.0 -e ADMIN_PORT=8081 \
    -v router-data:/data \
    ghcr.io/link-assistant/router

ssh -N -L 8081:127.0.0.1:8081 you@host   # then open http://127.0.0.1:8081
```

`ADMIN_HOST=0.0.0.0` inside the container is what makes the published port
reachable; `-p 127.0.0.1:8081:8081` is what keeps it off the network.

`doctor` reports both the listener and the credential state:

```console
$ router doctor | grep admin
admin_ui: enabled on 127.0.0.1:8081
admin_credential: UNCLAIMED (bootstrap open)
```

## Who is the administrator

Either you decide at deploy time, or the first browser to arrive decides.

**Provisioned.** Set `TOKEN_ADMIN_KEY` and that key *is* the admin credential.
Bootstrap is closed from the start, and the UI shows a sign-in prompt.

**Claimed.** With no `TOKEN_ADMIN_KEY`, the first visit claims the router. This
is a two-phase handshake, because the obvious one-phase version has a failure
mode that bricks the deployment: if the server mints a token, marks itself
claimed, and the response is then lost — a closed laptop, a dropped connection,
a browser that refuses `localStorage` — nobody holds the credential and nobody
can ever mint another.

So minting and claiming are separate steps:

| Step | Request | Effect on the server |
| --- | --- | --- |
| 1 | `POST /api/management/admin/bootstrap` | Mints a candidate token and a `claim_id`. **Nothing is persisted. The candidate authorises nothing. The system is still unclaimed.** |
| 2 | *(browser)* | Writes the token to `localStorage` and **reads it back** |
| 3 | `POST /api/management/admin/bootstrap/confirm` with `{claim_id}`, authenticated with the freshly stored token | Activates the token and closes bootstrap |

Only step 3 changes anything durable. The rules that follow from it:

- An unconfirmed candidate expires after `--admin-claim-ttl-secs` (default two
  minutes) and leaves the system unclaimed, so a lost mint is always
  recoverable — reload the page and try again.
- Only one candidate is outstanding at a time; a second mint replaces the first.
  Two simultaneous visitors cannot both confirm, and the loser's candidate is
  discarded.
- If the read-back in step 2 fails — private mode, storage disabled, a full
  quota — the client **does not confirm**. It shows the token for you to copy
  by hand and leaves bootstrap open, because confirming a token the browser
  could not store is exactly the brick above.

Once claimed, the credential's SHA-256 digest is written to
`<data-dir>/admin-claim.json`; the token itself is never stored server-side and
is never shown again. **Rotate credential** in the UI mints a replacement and
retires the old one in one step. It is disabled when `TOKEN_ADMIN_KEY` is set —
rotate that at the deployment instead.

![The claim screen a first visitor sees](https://github.com/link-assistant/router/blob/issue-50-e84c64dc1eb6/docs/screenshots/admin-ui-claim.png?raw=true)

## What the UI does

- **Tokens** — the issued tokens with id, label, issued/expires, requests used
  against the cap, and revoked state; a form to issue one (label, TTL, optional
  request cap, optional account pin); revoke behind a confirmation dialog.
- **Status** — read-only: version, upstream provider and base URL, credential
  state, accounts (`/api/management/accounts`) and usage counters
  (`/api/management/usage`).

![Issuing a token; the value is shown exactly once](https://github.com/link-assistant/router/blob/issue-50-e84c64dc1eb6/docs/screenshots/admin-ui-tokens.png?raw=true)

![Revoking a token behind a confirmation dialog](https://github.com/link-assistant/router/blob/issue-50-e84c64dc1eb6/docs/screenshots/admin-ui-revoke.png?raw=true)

![The read-only status tab](https://github.com/link-assistant/router/blob/issue-50-e84c64dc1eb6/docs/screenshots/admin-ui-status.png?raw=true)

A token value is shown **once**, at the moment it is issued. The server keeps
only the record, so there is nothing to re-display later — copy it then.

## What this costs you

The admin token lives in the browser's `localStorage`. That is a deliberate
trade — it is what lets the client *prove* it stored the credential before the
server commits to it — but it means:

- Any script running on the admin origin can read the token. The UI ships no
  third-party scripts and the page is served with `no-cache`, but an XSS bug in
  the console would hand over full admin rights.
- The token survives tab closes and browser restarts until you sign out or
  rotate. **Sign out** clears it from storage.
- A shared or unattended machine is a shared admin credential. Do not claim the
  router from one.

Keep the admin port on loopback or behind a tunnel, and treat a browser that
holds the token as a machine that holds the token.
