---
bump: patch
---

### Changed
- Every dependency is at its latest published version. `links-notation` 0.13 → 0.14 and `lino-objects-codec` 0.3 → 0.4 are major bumps: both back the links-notation storage layer, so the whole suite was run against them rather than the build alone. Six transitive crates moved within their existing constraints (`cc`, `h2`, `icu_provider`, `quinn-proto`, `zerovec`, `zerovec-derive`); `h2` 0.4.16 → 0.4.18 is the one worth naming, since it carries the HTTP/2 framing the proxy relays through.
