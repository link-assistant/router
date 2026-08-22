---
bump: patch
---

### Fixed
- The admin-endpoint tests no longer fail when another test claims their port first. `free_port` closes its listener before returning the number, so any test in the same parallel run can take that port before the router child binds it; `serve` propagates the bind error and exits without retrying, so the loser polled `/health` for the full 30-second timeout and then panicked. This surfaced as a green PR run turning red once merged to `main`, which held the v0.108.0 release back a commit. The harness now re-rolls the port up to five times and gives up on an attempt as soon as the child exits, so the race is recoverable rather than fatal.
