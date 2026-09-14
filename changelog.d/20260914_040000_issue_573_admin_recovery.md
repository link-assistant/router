---
bump: minor
---

### Added
- `router tokens recover-admin` mints a replacement administrative token from a token store this machine owns, so a deployment is never administratively unreachable to its own owner. Losing the once-printed admin token used to be unrecoverable — every verb in the `tokens` family authenticates with the admin credential, so the recovery path for that credential required it — and the standing advice was to destroy the deployment, discarding every issued client token and the whole request log to recover from having misplaced one string (issue #573).

  The lost value itself is genuinely unrecoverable: the token is a JWT and the store keeps only its metadata. What recovery does instead is sign a new one, the same operation the server performs at first boot, against the same store and secret — so a deployment that is *already running* accepts the result with no restart. Verified end to end against a live server: the management surface answers `401` before recovery and `200` after, with nothing restarted in between.

  Issued client tokens, provider configuration and the request log are untouched; a client token minted before recovery still authenticates afterwards. The recovery is visible in `tokens list` as `recovered-admin` for as long as the token exists, so it can be noticed after the fact without enabling any optional log. `--revoke-others` additionally retires every administrator that existed beforehand, for a credential believed to be in someone else's hands — and reports, when it is not passed, that the lost token is still live.

  Gated on local ownership rather than on a credential: reading the store already implies the signing secret and therefore full control, so this grants no authority its caller lacks and only makes existing authority usable. For that reason it has no remote form at all — with another router selected it refuses and names the deployment it would have acted on, the same boundary `auth import` and `auth clear` draw. A token recovered against a different secret stays refused, so recovery is not a way into somebody else's router. A fresh deployment still prints its admin token exactly once on first start.
