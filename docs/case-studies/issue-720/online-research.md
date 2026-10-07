# Online research

All facts below were retrieved on 2026-10-07 unless stated otherwise. Where a
page was fetched through a documentation mirror, the mirror URL is given and
the claim is cross-checked against the upstream source tree at commit
`0f96f568` ([raw/](raw/)).

## 1. Upstream repository

- **Repository:** <https://github.com/router-for-me/CLIProxyAPI> — Go 1.26,
  Gin, MIT licence ([raw/cliproxyapi-LICENSE](raw/cliproxyapi-LICENSE)).
- **Snapshot studied:** tag `v8.0.20`, commit
  `0f96f568e4dbf6f84ad7399a74b78344c5eac7e6`, authored 2026-10-08 03:00 +0800
  ([raw/cliproxyapi-snapshot.txt](raw/cliproxyapi-snapshot.txt)).
- **Repository rules for agents** ([raw/cliproxyapi-AGENTS.md](raw/cliproxyapi-AGENTS.md)):
  payload configuration is the "final barrier" applied after every
  translation; no timeouts after the upstream connection is established except
  listed cases; tests must use controllable clocks; `/v0/management` is
  deprecated and all new work targets `/v8/management`.
- **Test corpus:** 918 `_test.go` files, 366,826 lines
  ([raw/cliproxyapi-test-inventory.txt](raw/cliproxyapi-test-inventory.txt)).
  The largest concentrations are `internal/runtime/executor` (143 files),
  `sdk/cliproxy/auth` (118), `internal/api/handlers/management` (51),
  `internal/config` (42).
- **Route inventory:** [raw/cliproxyapi-routes.txt](raw/cliproxyapi-routes.txt)
  (245 lines extracted from `server_routes.go`, `server_management.go`,
  `server_management_v8.go`).

## 2. Release history v8.0.11 → v8.0.20 (2026-10-02 → 2026-10-07)

Source: GitHub releases page of the upstream repository. Six releases in six
days; the project moves fast, which is itself an input to the plan (any parity
target is a moving one, so the sub-issues reference behaviours and tests, not
version numbers).

| Version | Date | Notable changes |
| --- | --- | --- |
| v8.0.11 | 2026-10-02 | Shared upstream provider settings (`upstream` section) applied across channels |
| v8.0.12 | 2026-10-03 | Cooldown reset exposed to plugins via callback |
| v8.0.13 | 2026-10-03 | Anthropic `pause_turn` stop reason handled in translators |
| v8.0.14–15 | 2026-10-04 | Per-account model entitlement refresh; custom catalog sources with reload |
| v8.0.16 | 2026-10-05 | Claude 5.5 thinking-signature replay fix across protocol boundaries |
| v8.0.17 | 2026-10-06 | Prompt cache options; terminal error emitted when an upstream stream is truncated |
| v8.0.18 | 2026-10-06 | Grok text-to-speech exposed through `/v1/audio/speech` |
| v8.0.19 | 2026-10-07 | Global `server.github-token` for release/asset downloads |
| v8.0.20 | 2026-10-07 | Attachments preserved through translation |

Router already has equivalents for the truncated-stream error (#668) and
signature replay (34 files reference signatures). The catalog-source reload
(v8.0.14–15) and cooldown reset (v8.0.12) map to sub-issues O and I.

## 3. Documentation

- **Landing page:** <https://help.router-for.me/> — Quick Start plus the
  "All Protocols / One Protocol / Fast" positioning. The `/configuration/`
  path returned 404 on 2026-10-07; the content lives on a Mintlify mirror.
- **Routing concepts** (<https://mintlify.wiki/router-for-me/CLIProxyAPI/concepts/routing>):
  `routing.strategy` is `round-robin` by default, `fill-first` keeps one
  credential until quota; `priority` default 0, higher first; cooldown backoff
  `min(1 s · 2^failures, 30 min)` (confirmed in `conductor.go`); retries on
  403/408/429/500/502/503/504; `request-retry` example 3,
  `max-retry-credentials` example 5, `max-retry-interval` example 30;
  `quota-exceeded.switch-project` and `switch-preview-model`;
  `streaming.bootstrap-retries` (1) and `keepalive-seconds` (15), retries only
  before first byte; per-credential `prefix`, `attributes.priority`,
  `excluded-models` wildcards, `models[].alias`; `force-model-prefix`,
  `oauth-model-alias.fork` (default false), `oauth-excluded-models`.
  Cross-check with the config example: `weighted-round-robin` is a third
  strategy with integer `weight` (default 1, max 1,000,000, non-positive
  excludes), `session-affinity` default false with TTL `1h` and
  `session-affinity-subagents: true`, `retry.max-retry-credentials: 0` means
  all.
- **Advanced configuration** (<https://mintlify.wiki/router-for-me/CLIProxyAPI/configuration/advanced>):
  payload rule types `default`, `default-raw`, `override`, `override-raw`,
  `filter`, each scoped by `models` patterns and optional `protocol`
  (`openai`, `gemini`, `claude`, `codex`, `antigravity`); filter rules run
  first; per-credential `headers` on `gemini-api-key`, `claude-api-key`,
  `codex-api-key`, `openai-compatibility`, `vertex-api-key`;
  `passthrough-headers` default false and never forwards security-sensitive
  headers; global `proxy-url` (socks5/http/https) with per-credential override
  and empty string meaning direct; `ws-auth` default false.
- **Management API v8** (<https://help.router-for.me/management/api>, and
  [raw/cliproxyapi-management-api-v8.md](raw/cliproxyapi-management-api-v8.md)):
  5 consecutive authentication failures ban the client IP for about 30
  minutes; remote access requires `remote-management.allow-remote`;
  `MANAGEMENT_PASSWORD` environment override; a plaintext management key is
  bcrypt-hashed at startup; JSON reads of the config omit TURN credentials.

## 4. Ecosystem

- **cliproxy-rs** (<https://github.com/vayungodara/cliproxy-rs>): MIT Rust
  rewrite that consumes the same `config.yaml` and exposes the v8 management
  API. Strategies `round-robin`, `fill-first`, `weighted-round-robin`,
  `soonest-reset`. Self-reported parity against upstream: 835 items covered,
  707 partial, 145 missing of 1,687; 782 commits; 22 stars; RSS 80–98 MB. It is
  the closest prior art for "CLIProxyAPI in Rust" and confirms that the
  config-document model and the v8 API are the integration contract third
  parties expect. See [components-survey.md](components-survey.md).
- **Cli-Proxy-API-Management-Center** (<https://github.com/router-for-me/Cli-Proxy-API-Management-Center>):
  React 19 / TypeScript single-file `management.html`; requires CLIProxyAPI ≥
  8.0.0 and only the v8 API; needs `management.allow-remote` for non-local
  access. Any Router implementation of F/G/H that follows the v8 shapes could
  be driven by this UI.
- **EasyCLIProxyAPI** (<https://github.com/router-for-me/EasyCLIProxyAPI>):
  packaged installer around the upstream binary.
- **Third-party tooling built on the management API** (all found via GitHub
  search on 2026-10-07): CPA-Manager-Plus, panel4cliproxyapi,
  cliproxyapi-dashboard, CPA-X, CLIProxyAPI_Tray, CPA-Tray-Powershell,
  CLIProxyPoolWidget, Quotio and quotio-desktop, AIUsage, cc-status-line,
  proxypal, vibeproxy, ccs, claude-dialects, claude-proxy-vscode,
  vscode-universal-chat-provider, all-api-hub, panopticon-cli, infinitus,
  pi-cloud, LinJun, webbrain. Their existence shows demand for (a) usage and
  quota read-outs per credential, (b) cooldown/credential status, (c)
  configuration editing over HTTP, which is why F, G and H are in scope.
- **Alternative routers in the same niche:** 9Router
  (<https://github.com/decolua/9router>), OmniRoute
  (<https://github.com/diegosouzapw/OmniRoute>). Both offer OAuth-pool
  routing with web dashboards; neither has a security model comparable to
  Router's signed client-kind tokens.

## 5. Facts that changed the plan

1. Model-level cooling (`TestCodexModelLevelCoolingPreservesSiblingModel`)
   is a tested upstream behaviour Router lacks → I is a first-wave item.
2. The management brute-force lockout exists upstream and is absent in
   Router → N blocks the surface-expanding sub-issues F and G.
3. The v8 config document is what every ecosystem tool speaks → F follows the
   v8 shapes where they do not conflict with Router's flag names.
4. Six releases in a week → sub-issues cite behaviours and test names, never
   version numbers, and D2/P port corpora in a form that can be refreshed.
