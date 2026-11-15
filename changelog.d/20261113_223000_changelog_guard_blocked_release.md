---
bump: patch
---

### Fixed
- The pending changelog fragment guard now tells a release that left fragments behind (issue #337, still a failure) from releases that are merely blocked: when every pending fragment postdates the latest release tag it warns instead of failing, so unblocking the default branch is not itself blocked by the backlog it needs to release.
