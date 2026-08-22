---
bump: minor
---

### Added
- `router auth claude --from-claude-home` and `router auth codex --from-codex-home` adopt an existing vendor login, the way `auth gh --from-gh-config` already could. The surface removed credentials uniformly but acquired them uniformly only for GitHub, so provisioning a headless deployment meant knowing each provider's path, copying files by hand, and getting the permissions right (issue #274). The import copies the credential *document* rather than re-serializing a parsed token: `SubscriptionToken` models no `id_token`, and Codex derives its account id from that field on every read, so a round-trip would drop what the next read depends on. On macOS the live Claude credential is in the login Keychain rather than the file beside it, and the import prefers whichever is genuinely newer — the same rule the serving path uses. It reports where the credential came from, when it expires, whether it carries a refresh token, and whether the vendor still accepts it, so an already-dead credential is caught at import time rather than as a `401` later.
- The vendor-CLI rung of credential recovery covers Codex, with `--codex-cli-bin` / `CODEX_CLI_BIN` alongside the existing Claude option. A Codex credential is an OAuth chain with the same single-use rotation, so recovering one automatically while requiring an operator for the other drew a line the credentials do not (issue #275). Each provider's binary is opt-in on its own, and a provider with no known probe yields no client rather than one carrying another vendor's arguments.
- `ROUTER_VENDOR_REFRESH_ARGS_CLAUDE` and `ROUTER_VENDOR_REFRESH_ARGS_CODEX` override the recovery probe for one provider. The existing global form cannot express "one probe for Claude, another for Codex", so a deployment running both had to accept one client receiving the other's command line.

### Changed
- The README states what the recovery rung costs: the probe is a real inference request, because that is what forces a refresh. `claude auth status` was measured as a cheaper candidate and rejected — against a credential expired by 42 hours it reported `loggedIn: true` and left the credential untouched, while the model probe took the refresh path and cleared the dead chain. Adopting it would have disabled the rung while appearing to make it cheaper. The finding is recorded next to the probe so it is not rediscovered.
- `--debug-file` is passed only to Claude Code, which is the client that has it. `codex` rejects the flag outright, so the Codex probe would have failed argument parsing before ever reaching the credential.

### Fixed
- The login-flow tests no longer fail intermittently on full-suite runs. Every timeout in that file is the budget for a PTY handshake with the stand-in CLI, not a property under test; twenty seconds was ample alone and marginal when the whole suite competes for CPU, which surfaced as two different tests failing on full runs while passing 5/5 in isolation.
