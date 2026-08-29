---
bump: patch
---

### Fixed
- The token store is opened once per process and held, rather than opened, mapped, built and torn down on every access. `BinaryTokenStore` now keeps one `PersistentStore` behind a reader-writer lock, so concurrent readers share it and a writer excludes them (issue #357).
- Opening the store no longer parses the whole graph. Decoding every record walks one link per byte of every string, which at 306 records took about 1.9 s, and a process that only writes never needed the result — the parse is now deferred to the first read that actually wants it. Opening the dual store went from 1.91 s to 7.3 ms.
- Recovery on open runs only when a transaction journal is present. It previously read both projections and committed them back on every open, paying a full parse and a full rebuild even when there was nothing to recover — which every `router with` invocation paid.
- A store file too short to hold the legacy `LARTOK01` magic is no longer misread as a legacy file. This was invisible while a store only ever appeared fully built, and became reachable once a store can be observed while it is being filled: about half of eight concurrent `tokens issue` processes failed with `invalid legacy binary magic header`.
