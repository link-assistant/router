---
bump: patch
---

### Fixed
- A release whose changelog entry exceeds GitHub's undocumented 125,000-character body limit is now published, truncated, with a line saying so and linking the complete entry in `CHANGELOG.md`. The API rejects an oversized body with a bare HTTP 422 and no explanation, so v0.116.0 — built, tested, tagged and pushed — ended with no release page and a failing pipeline. The previous release came in at 122,652 characters, which is why this surfaced only now.
