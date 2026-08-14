# CLI: Cursor CLI (`cursor-agent`) — not supported

**Status: unsupported.** This document exists so the gap is explicit rather than
silently missing from the list.

## One-line capability check

```bash
link-assistant-router with cursor "hi"
```

This exits nonzero before launching Cursor and explains the missing Connect-RPC
adapter. It does not edit `~/.cursor` or silently proxy unrelated
traffic. The supported client registry is summarized in
[with-router.md](with-router.md).

## The finding

The shipped CLI honours the undocumented `CURSOR_API_ENDPOINT` override (an
explicit endpoint argument wins, then this variable, then
`https://api2.cursor.sh`). `CURSOR_CONFIG_DIR` and `CURSOR_DATA_DIR` are the
available temporary-isolation controls.

The override is not sufficient by itself. `cursor-agent` speaks Connect-RPC
using Cursor-private `agent.v1.AgentService` and `aiserver.v1.*` services; it
does not speak OpenAI, Anthropic, Gemini, or MCP. Pointing
`CURSOR_API_ENDPOINT` at an HTTP model proxy therefore produces unmatched
routes.

The protocol investigation is complete: the minimum useful adapter is an
HTTP/2 bidirectional Connect-RPC implementation of
`/agent.v1.AgentService/Run`, including Cursor's session handshake, protobuf
schema, streamed tool calls/results, and the supporting `aiserver.v1` RPCs.
[Agent Vibes](https://github.com/funny-vibes/agent-vibes) independently reaches
the same boundary and implements a version-specific adapter aligned to Cursor
message dumps. That evidence also makes the maintenance and security cost
clear: this is a private, unversioned application protocol, not a stable vendor
API. Native Cursor routing is therefore unsupported by design and is not an
advertised router capability.

## Why a generic TLS proxy does not supply the missing adapter

`cursor-agent` honours the standard proxy variables and `NODE_EXTRA_CA_CERTS`,
so a TLS-terminating forward proxy with a CA the process trusts could in
principle rewrite its traffic toward the router.

We deliberately do not document that as a supported configuration:

- it requires installing a CA that can decrypt all of the agent's traffic, not
  just model calls — a significant security decision;
- it depends on Cursor's private wire protocol, which is undocumented and can
  change without notice;
- it is **unverified**: no test in this repository exercises it.

## Wrapper argument boundary

Cursor is rejected before launch regardless of argument placement. For
supported clients, router wrapper flags may appear before or after the client;
an explicit `--` forwards every later token verbatim. See
[with-router.md](with-router.md#arguments-interaction-and-models).

If you attempt it, you are on your own, and you should scope the trusted CA and
the proxy to that process only.

## What to do instead

Use a CLI that speaks one of the router's supported vendor protocols — every
other document in [`README.md`](README.md) covers one. If you need Cursor's
editor experience specifically, the IDE's provider settings are outside the
scope of these CLI documents.
