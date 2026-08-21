---
bump: minor
---

### Fixed
- When no server is selected, `with` and `auth` use a router that is already listening locally instead of starting a managed Docker container beside it. Starting one was both the expensive branch — an image pull and a container start on a command expected to be instant — and the surprising one: the new container has its own credential directory and token store, so a subscription authorized through it was invisible to the instance already running, and vice versa (issue #250). This changes only the default; `--server`, `ROUTER_URL`/`LINK_ASSISTANT_ROUTER_URL`, and the persisted `server use` selection all still take precedence, in that order.
- A discovered endpoint is adopted only after the same `/health` handshake every other branch performs, so an unrelated service holding port 8080 is rejected rather than mistaken for the router.
- `server status` reports the router the next command will actually use, naming an `already-running local server` where it previously announced a container it was not going to start.

### Added
- `--managed` on `with` and `auth` forces a disposable managed container even when a router is listening, for CI and clean-room reproductions that want a fresh instance on purpose.
- Discovery probes the conventional port, `ROUTER_PORT`, the recorded managed port, and any port Docker publishes to loopback — so a deployment reached over an SSH tunnel or a container published on an operator-chosen port is found, rather than only the ports this crate happens to name.
