---
bump: patch
---

### Fixed
- Listing tokens no longer rewrites the token store. Every accessor went through one helper that committed unconditionally, so `GET /api/tokens/list` — a pure read — took the exclusive lock, re-serialised and fsynced a 64 MB `tokens.bin` and a 171 KB `tokens.lino`, and answered in 8–13 seconds on a 290-token deployment. `router with` gives that call a 10-second budget, so an ordinary launch failed with a bare transport error that named neither the cause nor the timeout (issue #351).
- Reads take a shared lock and skip the commit, so concurrent listings no longer serialise against each other or against the request path. `try_consume_request` runs per proxied request and takes the same lock, so one slow listing used to queue live traffic behind it.
- A read consults `tokens.lino` rather than merging both projections. `tokens.bin` is preallocated — 64 MB for 290 records — so scanning it cost 1.63 s where the same records came out of the text file in 6 ms. `install` writes text before binary, so the text projection is never the staler of the two; a store whose text file is empty still falls back to the merge. Measured end to end, `list()` went from 1.65 s to 7 ms at 290 tokens.
- Four tests cover it: a listing does not move either file's mtime, a listing of 290 tokens stays far inside the `with` budget, concurrent listings run together, and a read still sees the latest write and survives a reopen.
