---
bump: patch
---

### Fixed
- A unix-socket test that cannot start the router now says why. `Router::start` spawned the process with `stderr` discarded, so when startup failed the only evidence was `router never answered on <path>` — the router's own explanation was thrown away. It failed once on macOS in CI with nothing to diagnose it by. The child's stderr is now captured and included in the panic, and the helper checks whether the process has already exited instead of waiting out the full 40-second deadline, so a startup failure is reported in about a second with the reason attached.
