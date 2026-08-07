---
bump: minor
---

### Added

- **Optional Telegram and VK admin bots** (issue #51): administer the router
  from a private chat — `/status`, `/tokens`, `/issue`, `/revoke`, `/rotate`.
  Both channels are off unless a bot token is configured
  (`TELEGRAM_BOT_TOKEN`, `VK_BOT_TOKEN` + `VK_GROUP_ID`), each is independent,
  and both poll outward (Telegram `getUpdates`, VK Bots Long Poll), so no
  inbound port or webhook is required.

- **One system-wide admin claim across every channel**: the bots share
  `AdminClaim` with the web UI, keeping its two-phase shape — `/start` mints a
  candidate that authorises nothing, `/confirm <token>` activates it. A claim
  made in a browser closes `/start` in chat and vice versa, a `TOKEN_ADMIN_KEY`
  deployment starts already claimed, and a mint that never arrives leaves the
  router claimable.

- **New settings**: `--telegram-bot-token`, `--vk-bot-token`, `--vk-group-id`,
  `--chat-admin-secret-ttl-secs` (default `120`),
  `--chat-admin-rate-limit-per-minute` (default `5`), each with the matching
  environment variable. `doctor` now reports `telegram_admin_bot` and
  `vk_admin_bot`.

- **Documentation**: [docs/use-cases/chat-admin-bots.md](../docs/use-cases/chat-admin-bots.md)
  covers enabling a channel, the shared claim, the command set and the
  secret-handling rules.

### Security

- Chat commands are parsed **only** in 1:1 conversations: Telegram requires
  `chat.type == "private"` (bots and senderless messages are dropped too), and
  VK requires `peer_id == from_id` below the multi-user chat offset. Group
  traffic never reaches the command parser.
- A message carrying a credential is sent on its own and deleted after
  `--chat-admin-secret-ttl-secs`; token **values** are never echoed by listings.
- A platform user id is only a cache for a presented credential — every command
  re-validates it, so revoking or rotating signs the chat user out at once — and
  `/start`, `/auth`, `/confirm`, `/issue` and `/rotate` are rate limited per
  user. `--allow-anonymous-admin` does not open a chat channel.
