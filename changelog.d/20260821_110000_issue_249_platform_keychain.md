---
bump: minor
---

### Fixed
- On macOS the router reads the Claude subscription the vendor CLI actually uses. Claude Code keeps its live credential in the login Keychain and leaves `~/.claude/.credentials.json` behind as a snapshot nothing rotates, so the router saw a token that had been dead for hours while `claude -p` — on the same account — kept working: `accounts list` reported `rejected`, `doctor` answered `OAuth access token has been revoked.`, and the Claude catalog served zero models (issue #249). Re-authorizing only appeared to help, because it wrote a fresh file that then expired on its own schedule. Both stores are now read and the newer credential wins, so the recovery ladder from #239 is finally reading the store the vendor client writes to.
- The machine-wide store speaks only for the vendor's default home. A reader pointed at a pooled account, a per-account directory, or a mounted credential keeps reading exactly the file it was given — one keychain entry answering for every account would collapse a pool onto a single subscription.

### Added
- `doctor` names the store each credential was read from (`store: keychain` or `store: file`) and prints the keychain entry rather than a file path when that is what it used. A valid-looking file next to a router reporting `rejected` was previously indistinguishable from a bug; the store is now visible in the output.
- A credential that exists only in the platform store is reported normally instead of as `MISSING`, which is what a machine that logged in with a recent client actually looks like.
