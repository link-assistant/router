# Current Router Gap Analysis

This assessment is based on the code in the repository as of 2026-04-23.

## What The Router Already Does Well

| Capability | Status | Evidence | Why it matters |
| --- | --- | --- | --- |
| Direct Anthropic Messages proxy | Present | [src/main.rs](../../../src/main.rs), [src/proxy.rs](../../../src/proxy.rs) | Matches Anthropic's documented gateway shape |
| Bedrock route support | Present | [src/main.rs](../../../src/main.rs), [src/proxy.rs](../../../src/proxy.rs) | Covers one official Claude Code gateway family |
| Vertex pass-through support | Present | [src/main.rs](../../../src/main.rs), [src/proxy.rs](../../../src/proxy.rs) | Covers another official Claude Code gateway family |
| Session header forwarding | Present | [src/proxy.rs](../../../src/proxy.rs) | Preserves `X-Claude-Code-Session-Id` behavior |
| Router-issued custom bearer tokens | Present | [src/token.rs](../../../src/token.rs), [src/proxy.rs](../../../src/proxy.rs) | Separates client credentials from real Claude OAuth credentials |
| OAuth credential file reader | Present | [src/oauth.rs](../../../src/oauth.rs) | Reuses Claude Code login state |
| Minimal health endpoint | Present | [src/proxy.rs](../../../src/proxy.rs) | Baseline liveness check exists |

## Main Gaps

| Capability | Status | Evidence | Gap |
| --- | --- | --- | --- |
| Persistent token storage | Missing | [src/token.rs](../../../src/token.rs) keeps revocations in memory only | Restart loses token revocation state and there is no durable token catalog |
| Token lifecycle admin surface | Missing | only `POST /api/tokens` exists in [src/main.rs](../../../src/main.rs) | No list, revoke, expire, inspect, or quota management |
| `lino-arguments` config layer | Missing | [src/config.rs](../../../src/config.rs) reads env vars manually | No config-file support and limited operator ergonomics |
| `lino-objects-codec` text storage | Missing | no dependency or integration in [Cargo.toml](../../../Cargo.toml) | Issue #7 explicitly asks for it |
| `link-cli` binary storage | Missing | no dependency or adapter in repo | Issue #7 explicitly asks for it |
| OpenAI Chat Completions | Missing | no `/v1/chat/completions` route in [src/main.rs](../../../src/main.rs) | Most comparison targets expose this first |
| OpenAI Responses API | Missing | no `/v1/responses` route | Needed for parity with newer agent stacks |
| `/v1/models` discovery | Missing | no models route | Common requirement for OpenAI-compatible clients |
| CLI subprocess backend | Missing | no Claude CLI wrapper or session-resume engine | Hard to provide rich OpenAI compatibility without it |
| Tool compatibility layer | Missing | no OpenAI tool-call translation or MCP registry exposure | Competitor differentiation is concentrated here |
| Multi-account routing | Missing | single OAuth source in [src/oauth.rs](../../../src/oauth.rs) | No quota spreading or account failover |
| Usage accounting and quotas | Missing | no usage store or middleware | Needed for team sharing and OpenRouter-like controls |
| Metrics and ops endpoints | Missing | no `/metrics`, `/ops`, or usage endpoints | Competitors increasingly expose operator surfaces |
| `box`-based containerization | Missing | [Dockerfile](../../../Dockerfile) uses `rust:1.82-slim` | Does not match issue direction |

## Strategic Read

The current repository is not "behind everywhere". It is strongest exactly where most community projects are weakest:

- official Claude Code gateway compatibility
- simple direct HTTP proxying
- clean separation between client token and real OAuth token

The correct next step is not to replace the current design. The correct next step is to add the missing product layers around it:

1. persistent auth and storage
2. stronger config and operator ergonomics
3. an additional CLI-backed compatibility backend
4. observability and routing policy

That preserves the current repo's strongest advantage while still moving toward the broader issue goal.
