# Administering the router from Telegram or VK

[Issue #51](https://github.com/link-assistant/router/issues/51) states the
problem this solves:

> A self-hosted router is usually reachable from a phone long before a browser
> tab is. A bot that answers in a private chat makes "issue a token", "revoke
> that one", "how is it doing" a message rather than an SSH session.

The channels are **optional**. The [web UI](admin-ui.md) stays the default and
the only channel out of the box; nothing below runs unless you configure a bot
token.

## Turning a channel on

Each channel is independent — run one, both, or neither.

| Flag / env | Default | Does |
| --- | --- | --- |
| `--telegram-bot-token` / `TELEGRAM_BOT_TOKEN` | — (disabled) | Bot API token from [@BotFather](https://t.me/BotFather). Present ⇒ the Telegram channel runs. |
| `--vk-bot-token` / `VK_BOT_TOKEN` | — (disabled) | VK community access token with the *messages* scope. |
| `--vk-group-id` / `VK_GROUP_ID` | — | VK community id. Required with the token: VK long polling addresses a community. |
| `--chat-admin-secret-ttl-secs` / `CHAT_ADMIN_SECRET_TTL_SECS` | `120` | How long a message carrying a credential survives before the bot deletes it. `0` keeps it. |
| `--chat-admin-rate-limit-per-minute` / `CHAT_ADMIN_RATE_LIMIT_PER_MINUTE` | `5` | Budget per user per minute for `/start`, credential presentation, `/issue` and `/rotate`. `0` disables the limit. |

```bash
docker run -d -p 8080:8080 \
    -e TELEGRAM_BOT_TOKEN=123456:AA… \
    -v router-data:/data \
    ghcr.io/link-assistant/router
```

Both channels **poll outward** (Telegram `getUpdates`, VK Bots Long Poll). No
inbound port is opened and no webhook URL is needed, which is the whole point:
the deployment can stay behind NAT with no public surface.

`doctor` reports each channel:

```console
$ link-assistant-router doctor | grep bot
telegram_admin_bot: enabled (private chats only)
vk_admin_bot: disabled
```

## Private chats only

A message is parsed as a command **only** if it arrives in a 1:1 conversation:

- Telegram — `chat.type` must be exactly `private`. `group`, `supergroup`,
  `channel`, and an absent or unknown type are dropped untouched. Messages from
  other bots and messages with no sender are dropped too.
- VK — `peer_id` must equal `from_id`, be positive (a person, not a community)
  and be below `2000000000` (the multi-user chat offset).

Administering token issuance in a group would hand credentials to every member,
so group traffic never reaches the command parser at all.

## One administrator, one claim

The chat channels share the **system-wide** bootstrap claim with the web UI —
there is one first admin per deployment, not one per channel:

- if you set `TOKEN_ADMIN_KEY`, the router starts already claimed and `/start`
  refuses; send `/auth <key>` instead;
- otherwise the first `/start` — in a chat *or* in a browser — begins the claim,
  and confirming it anywhere closes it everywhere.

The handshake keeps the two phases of the web UI, for the same reason: a
delivery that failed must not brick administration.

| Step | Message | Effect on the router |
| --- | --- | --- |
| 1 | `/start` | Mints a candidate admin JWT, already revoked. **Nothing is persisted. The candidate authorises nothing. The router is still unclaimed.** |
| 2 | `/confirm <token>` (or just the token) | Proves the message arrived, activates the credential and closes bootstrap everywhere |

If the mint never reaches you, nothing is locked: the candidate expires
(`--admin-claim-ttl-secs`, two minutes by default) and `/start` works again.

After the claim, every other chat user must present a valid admin credential
with `/auth <token>` — the claimed credential (an admin-scoped `la_sk_…` JWT,
or a legacy `la_admin_…` value on a deployment claimed before the JWT model),
any other admin-scoped `la_sk_…` token, or `TOKEN_ADMIN_KEY`. The platform user id is only a **cache**
for that credential: every command re-validates it, so revoking or rotating
signs the chat user out on their next message. A Telegram or VK id is never an
authorisation factor on its own, and `--allow-anonymous-admin` deliberately does
not open a chat channel.

## Commands

| Command | Does |
| --- | --- |
| `/start` | Claim the router (only while unclaimed) |
| `/confirm <token>` | Phase two of the claim |
| `/auth <token>` | Sign in with an existing admin credential |
| `/logout` | Forget the credential bound to this conversation |
| `/status` | Read-only: credential state, upstream, account health, usage |
| `/tokens` | List issued tokens: id, label, expiry, usage, revoked state |
| `/issue <label> [ttl_hours] [max_requests]` | Issue a token |
| `/revoke <id>` | Revoke a token |
| `/rotate` | Replace the admin credential (also invalidates it in the web UI) |

## Secrets in a chat transport

Chat history lives on the platform *and* on every device signed into it, so:

- a credential is sent in **its own message**, and the bot deletes that message
  after `--chat-admin-secret-ttl-secs` — the message says so, so you know to
  copy it first. Deletion is best effort: Telegram and VK both bound how long a
  bot may delete its own messages, and a client may have cached it already;
- `/tokens` never echoes a token **value** — ids, labels, expiry, usage and
  revocation only, exactly like the web UI;
- `/start`, `/auth`, `/confirm`, `/issue` and `/rotate` are rate limited per
  user, so the credential prompt is not a free brute-force oracle.

Treat a phone that is signed into the bot's chat as a device that holds the
admin credential.
