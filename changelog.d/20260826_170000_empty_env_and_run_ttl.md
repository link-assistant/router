---
bump: minor
---

### Security
- An empty `XDG_CONFIG_HOME`, `HOME` or `APPDATA` is treated as unset rather than as a configured value. `var_os` returns `Some("")` for a set-but-empty variable, so the fallback chain never ran, the config root became the empty string, and the router wrote `server.json` — holding a live `la_sk_` token — into whatever directory the command happened to run from. A resolved root that is not absolute is now refused outright rather than used, and the same treatment covers the client home and the clients' own override variables (issue #340).

### Changed
- The per-run token `with` mints defaults to 24 hours rather than 1. The token is revoked when the client exits, so the run already bounds its life; the clock was a second bound that could only fire early, and at one hour it routinely did — an interactive session that outlived the hour died mid-work. `--run-ttl-hours` still overrides it (issue #341).

### Fixed
- An expired router token says whose token it was. A bare `401 Token has expired` let the client render its own `Please run /login` advice, which points at the model provider's credential — a different thing entirely, which re-authenticating does not change. The message now names the router and `--run-ttl-hours` (issue #341).
