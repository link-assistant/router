# Management access

`/api/management/*` controls credentials, tokens and provider configuration.
Treat access to this surface as access to the Router instance. TLS protects
credentials in transit; network restrictions and authentication both apply.

## Listener policy

`MANAGEMENT_ALLOW_REMOTE=false` is the default. The combined listener accepts
management calls only from loopback. The dedicated admin UI listener (enabled
with `ADMIN_PORT`, or an explicit `admin` listener) accepts management calls
from its configured interfaces. Its default `ADMIN_HOST=127.0.0.1` keeps it
local. Binding an admin listener to a public interface is an explicit decision
to expose management and should be protected by TLS and a firewall.

The policy also covers the unauthenticated status and two-phase bootstrap
routes. Other management routes still require an administrator credential.
`--allow-anonymous-admin` does not change the listener policy. Inference-only
listeners have no management routes.

Set `MANAGEMENT_ALLOW_REMOTE=true` (or `--management-allow-remote`) to permit
remote management on the combined listener. Present a real `TOKEN_ADMIN_KEY`
or an admin-scoped token on every protected request.

## Authentication lockout

| Environment variable | CLI flag | Default | Meaning |
| --- | --- | --- | --- |
| `MANAGEMENT_ALLOW_REMOTE` | `--management-allow-remote` | `false` | Allow remote callers on the combined listener |
| `MANAGEMENT_LOCKOUT_FAILURES` | `--management-lockout-failures` | `5` | Consecutive authentication failures before a ban |
| `MANAGEMENT_LOCKOUT_SECS` | `--management-lockout-secs` | `1800` | Ban duration in seconds |
| `MANAGEMENT_LOCKOUT_EXEMPT_LOOPBACK` | `--management-lockout-exempt-loopback` | `true` | Keep local recovery available |

Zero for either the threshold or duration disables lockout. A successful
administrator authentication clears that address's unbanned failure counter,
including when the authenticated handler later rejects the operation. Open
status and bootstrap requests do not clear counters. Failed bootstrap
confirmation credentials count too.

The threshold request and subsequent requests from a banned address receive
`429` and a `Retry-After` header in whole seconds. A valid token does not bypass
an active ban. Another client IP keeps access. A ban expires automatically;
it does not extend when a banned caller retries. Both management listeners
share the counters and bans. Idle failure counters expire after the configured
ban duration. State is bounded to 4096 addresses; if the tracker fills, new
untracked addresses receive `429` until capacity becomes available, rather
than evicting existing bans.

### Address trust

Router uses the TCP socket peer address, normalizing IPv4-mapped IPv6.
`Forwarded`, `X-Forwarded-For` and `X-Real-IP` are ignored: this version has no
configured trusted-forwarding-hop resolver. Untrusted clients cannot evade
a ban or the remote gate by rotating headers. Requests without socket peer
metadata fail closed on management routes. Applications using the router
builders must serve them with `into_make_service_with_connect_info::<SocketAddr>()`;
in-process tests can inject `ConnectInfo<SocketAddr>`.

A reverse proxy or SSH tunnel presents its own address. A loopback proxy is
therefore local and exempt by default, even for its remote users. Restrict
management paths at that proxy, or use a dedicated admin listener that is
reachable only through an authenticated tunnel. To lock out a proxy's address,
set `MANAGEMENT_LOCKOUT_EXEMPT_LOOPBACK=false`; all its callers then share a
counter and ban. This tradeoff does not provide per-user rate limiting.

## Operator visibility and recovery

Ban transitions emit a warning with the address and expiry, and a
`management_auth_banned` audit event when `AUDIT_LOG` is configured. No submitted
credentials are included. The authenticated admin summary includes active bans.
`router doctor --local` reports them from the instance data directory, including
registered deployment data roots. The diagnostic snapshot contains addresses
and expiry timestamps, is written with owner-only permissions, and is not
loaded as authentication authority. Counters and bans reset on process restart;
expired snapshots are ignored by doctor.
After an abrupt process exit, a snapshot can describe the previous process's
bans until their recorded expiry or the next server startup.

Use loopback or a different administrator IP while a remote IP is banned.
If loopback exemption is disabled, wait for `Retry-After` or restart the instance.
Do not disable authentication to recover access.

## Deploy, tunnels and chat bots

`router deploy` keeps management separate from the public inference listener.
The admin UI port is an explicit management surface; retain its loopback
binding or protect the published port. Deployment verification over loopback
continues to work. For a backend that needs remote management on a combined
listener, pass the setting explicitly with
`MANAGEMENT_ALLOW_REMOTE=true router deploy --env MANAGEMENT_ALLOW_REMOTE`
(or the equivalent deploy TOML `[env]` setting). An installed host service does
not carry arbitrary `--env` settings; configure its supervised environment.

`router tunnel` forwards to a loopback listener. The SSH server sees the
forwarded management request as local; restrict tunnel access to trusted
administrators and use an admin credential. Do not expose a loopback forward
on a public interface.

Telegram and VK bots call the shared administration services in-process.
The HTTP remote switch and IP lockout do not govern platform messages. Bots
retain their own per-user rate limiting and administrator credential checks.
They must not be treated as an IP-lockout bypass for unauthenticated users.

## Example-secret safe mode

Before binding any listener or issuing a startup credential, `router serve`
refuses `TOKEN_SECRET` / `--token-secret` and `TOKEN_ADMIN_KEY` / `--admin-key`
when they equal a published example value. `TOKEN_SECRET_FILE` is checked
through its resolved value too. The error names the setting without printing
the supplied secret. There is no unsafe override.

Generate independent values, for example:

```sh
export TOKEN_SECRET="$(openssl rand -hex 32)"
export TOKEN_ADMIN_KEY="$(openssl rand -hex 32)"
router serve
```

The [published denylist](../../src/management_config.rs) includes the former
README placeholders, `test-secret`, `a-long-random-secret`, `change-me`,
`changeme`, `replace-me`, and the legacy internal stand-ins. It is an
accident-prevention measure, not an entropy test.
It does not make a different short or predictable secret safe. Keep signing
secrets, admin credentials, snapshots and audit logs accessible only to the
operator. The first visitor claim still assumes the administrator reaches a
private admin interface before anyone else; an internet-facing unclaimed UI
is not a secure bootstrap mechanism.
