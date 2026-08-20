---
bump: minor
---

### Fixed
- A rotated refresh token is no longer treated as revoked. Vendors issue single-use refresh tokens, so when the Claude CLI or a second router redeemed the shared credential first, the router's own exchange answered `invalid_grant` — and the router concluded the subscription was dead, emptied the catalog and asked for a manual re-login. It now re-reads the credential, adopts a newer chain link and retries once, which turns the common case back into a retry.
- Rotated refresh tokens are persisted on every refresh path. Only the catalog poll wrote the rotation back; the proxy and subscription paths refreshed in memory, so the spent token stayed on disk and the next process start replayed it. The failure was self-perpetuating across restarts.
- A rejected subscription is named as the cause of an empty catalog. A request for a model whose only subscription was rejected reported that the model was `not advertised by any subscription`, which described the symptom and hid the cause; it now reports the credential state and what to do about it.
- The terminal message distinguishes a revoked credential from a lost rotation race, and names the credential file that was checked. "Waiting will not help" was misleading for a credential another holder had merely rotated past.

### Added
- The read → refresh → write cycle is serialised across processes by an advisory lock on a sidecar lock file, and the credential is rewritten atomically, so two holders no longer race and an interrupted write leaves the previous credential intact.
- Access tokens are refreshed five minutes before expiry rather than after a rejection.
- Optional last-resort recovery through the vendor's own client: with `--claude-cli-bin` configured, a credential no direct exchange can redeem is handed to the vendor CLI once, and the rotated credential it leaves behind is adopted. The invocation, the client's own debug log and the exchange the router sent are journalled by header and field *name* — never by value — so the undocumented token protocol can be reproduced from the log.
