---
bump: patch
---

### Fixed
- `deploy --mode host` no longer panics with "Cannot start a runtime from within a runtime" while it probes the host's model catalogs. The probe now runs on its own thread (#662).
- `deploy --mode host` blocks a deploy only for a run that is actually alive. A run without a lease whose process has exited is classified as stale and no longer reported as a live run (#663).
- `/api/models` and the native Anthropic, OpenAI and Codex catalogs now keep `router_available` and `router_unavailable_reason`. Before, the projection dropped them, so the `router with claude` picker never labelled an exhausted z.ai row `(unavailable)` and the pre-launch warning never fired (#664).
- The z.ai exhaustion message no longer ends in a double period ("recharge..") (#664).
- `router doctor` also inspects the default deploy root's data directory and names every directory it read, so an exhaustion recorded by a deployment is no longer reported as "none" (#664).
- Right after a restart, `/api/models` no longer omits a healthy subscription's models or calls it degraded. Router waits up to 20 seconds for the first catalog refresh before it accepts connections. A subscription whose catalog has not been refreshed yet is reported under `starting_providers`, never `degraded_providers` (#665).
