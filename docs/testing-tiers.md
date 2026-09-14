# Test tiers

Router has four tiers. Each one states what it covers, what it needs, and how to
run it, so a contributor deciding whether a change is safe — and a downstream
project asking "is this path actually proven end to end, or does it merely
parse?" — can both get an answer (issue #567).

The rule that matters most is the last one: **a run says which tiers it did not
execute.** A suite of four hundred tests where fifty quietly returned early
still prints `400 passed`. That is the failure this layout exists to prevent —
not missing tests, but missing tests that read as present ones.

| Tier | Covers | Needs | Runs in CI |
| --- | --- | --- | --- |
| 1 — unit | Pure logic. No process, no network. | Nothing | Every change |
| 2 — integration | Router's own surfaces against mocks and fixtures: routing, translation, token boundaries, storage. | Nothing | Every change |
| 3 — real client, no credentials | Actual vendor binaries against a Router mock: launch, argument construction, generated settings, protocol shape. | Vendor CLIs on `PATH` | Every change, plus nightly |
| 4 — live, credentialed | Real client, real Router, real provider. That a model answers, that a launch profile produces the intended presentation, that a catalog pins what the user selected, that a withdrawal actually withdraws. | A real subscription | Manual dispatch only |

## Running each tier

Tiers 1–3 are the default. A checkout with no credentials runs them and passes:

```bash
cargo test
```

Tier 3 additionally needs the vendor binaries installed; `.github/workflows/real-clients.yml`
installs them and runs the same tests against a loopback-only Router mock, with
no vendor credential and no paid inference.

Tier 4 is opt-in, and each test is enabled by its own protected variable:

| Variable | Enables |
| --- | --- |
| `ROUTER_LIVE_ZAI_API_KEY` | z.ai Coding Plan: usage normalization, genuine thinking through Claude Code, gateway model selection |
| `ROUTER_LIVE_CLAUDE_CREDENTIAL_JSON` | An Anthropic subscription's usage source |
| `ROUTER_LIVE_CODEX_CREDENTIAL_JSON` | Codex usage source and native stream identity |

Run the live tier locally against your own subscription:

```bash
ROUTER_LIVE_ZAI_API_KEY=… cargo test --test subscription_usage_live_test -- --nocapture
```

`--nocapture` is what surfaces the per-test `RUN:` and `SKIP` lines; without it
`cargo` hides the output of passing tests, and a skip becomes invisible again.

**Pass the key through the environment, never on a command line.** Argv is
visible in `ps` and in shell history. `providers add --api-key-stdin` exists for
the same reason (issue #314).

### Tier 2 tests that need a container runtime

`router deploy` is tier 2 — it speaks to a container runtime rather than to a
vendor, and it spends nothing — but it cannot run where Docker is absent. Those
tests name an already-built image rather than building one, because the
Dockerfile's `cargo build --release` takes far too long to run inside a test:

```bash
docker build -t router:local .            # once
ROUTER_DEPLOY_TEST_IMAGE=router:local cargo test --test deploy_docker_test -- --test-threads=1
```

A published image works too, and is much faster than building one:

```bash
docker pull ghcr.io/link-assistant/router:1.10.0
ROUTER_DEPLOY_TEST_IMAGE=ghcr.io/link-assistant/router:1.10.0 \
  cargo test --test deploy_docker_test -- --test-threads=1
```

The image is named rather than pulled by the tests themselves: a test that
reaches a registry fails when the network does, which says nothing about the code
under test. `router deploy` *does* pull an absent image — that is how it works on
a machine that has never built one — and the pull decision is pinned against a
fake runtime in `src/deploy_tests.rs`.

`--test-threads=1` because every test in that file drives the one deployment
container, so they cannot run concurrently.

Without a runtime or an image the tests skip, and say so through the same
`tiers::unavailable` path as tier 4 — a container-less checkout must not see red,
but a test that silently no-ops reports success for work it never did. The
converge properties themselves (a second run performs no action, a stopped
container is restored, `--status` changes nothing) are pinned in
`src/deploy_tests.rs` against a fake runtime, so they run everywhere, always.

## Skips are visible, and counted

A missing credential is a skip rather than an error: a contributor without a
subscription must never see red from tier 4. But it is never silent. Every
live-tier test resolves its credential through `tests/common/tiers.rs`, which on
absence prints the tier, the test, and the variable that would enable it:

```
SKIP [tier4-live-credentialed] real_zai_thinking_reaches_claude_verbose_output: \
  ROUTER_LIVE_ZAI_API_KEY is not set; this property is not proven by this run.
```

Only the variable's *name* is ever printed. `tiers::skipped_live_tests()` returns
the count for a harness that wants to assert on it without parsing output.

## In CI

Tier 4 runs from `.github/workflows/live-tier.yml`, on `workflow_dispatch` only,
and reads its credentials from repository secrets. It deliberately does not run
on pull requests: a fork has no secrets, and a tier that fails for want of a
credential would block unrelated work.

## What tier 4 owns

These are whole-path properties — client launch, environment, catalog, upstream —
that no unit test is positioned to see. Each regressed at least once and was
caught by a human running a real client by hand:

- **Launch profile and generated settings** — a presentation default missing from
  the Router-owned profile collapsed completed thinking (issue #560).
- **Model selection and pinning** — a gateway model pinned by catalog position
  rather than recency started every session on the oldest model the provider
  served (issue #563).
- **Catalog advertisement** — capability resolved per provider rather than per
  model made any per-model difference unrepresentable (issue #565).
- **Credential withdrawal** — `auth clear --all` reported a clean deployment
  while API-key providers kept live keys (issue #561).
- **Streamed thinking and tool loops** — genuine provider thinking must survive
  translation, and only a real provider emits it.

Recorded replay (issue #566) covers some of the same ground without credentials,
and is the cheaper regression net once a recording exists; it does not replace
tier 4, because a recording cannot notice that the vendor changed its catalog.
