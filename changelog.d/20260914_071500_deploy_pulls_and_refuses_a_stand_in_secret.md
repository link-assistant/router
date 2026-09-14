---
bump: patch
---

### Fixed

- `router deploy` now fetches an absent image from its registry instead of refusing, and refuses a stand-in signing secret with an actionable message instead of an opaque one. Both failures were unreachable until v1.10.0 published the image the default names: with no published `ghcr.io/link-assistant/router:<version>` to find, the only way to obtain one during development was `--build`, so the default path of the default command had never been run end to end on a machine that had not built the image itself. It failed twice over — first at the image step, which only ever built and never pulled, and then at container creation, where the stand-in secret installed for non-serving commands reached the process API and surfaced as `nul byte found in provided data`, naming the mechanism rather than the mistake. An explicit `--build` still wins over the registry, because deploying a local tree is what it is for and quietly pulling a same-tagged image would run something other than what was asked for. A pull is a mutation like any other, so a converged deployment still performs none: the idempotence test now counts pulls too.
