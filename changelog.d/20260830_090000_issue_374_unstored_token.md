---
bump: patch
---

### Fixed
- A token that could not be stored is no longer returned to the caller. `issue` logged a failed `put` at `warn` and returned the token anyway, so a router whose store had stopped accepting writes went on minting credentials it could not subsequently recognise — the holder found out only when they tried to use one. The storage failure now fails the issue path, and is logged at `error` rather than `warn`, so an automated upgrade sees a non-zero exit instead of a line nothing reads (issue #374).
