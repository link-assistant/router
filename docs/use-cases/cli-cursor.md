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
`https://api2.cursor.sh`). `CURSOR_CONFIG_DIR` and `CURSOR_DATA_DIR` provide the
temporary-isolation mechanism a future `with cursor` adapter can use.

The override is not sufficient by itself. `cursor-agent` speaks Connect-RPC
using Cursor-private `agent.v1.AgentService` and `aiserver.v1.*` services; it
does not speak OpenAI, Anthropic, Gemini, or MCP. The router does not implement
that handshake and RPC surface yet, so pointing `CURSOR_API_ENDPOINT` at it
would only produce unmatched routes. Support is therefore deferred because of
the missing protocol adapter, not because the endpoint cannot be changed.

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

If you attempt it, you are on your own, and you should scope the trusted CA and
the proxy to that process only.

## What to do instead

Use a CLI that speaks one of the router's supported vendor protocols — every
other document in [`README.md`](README.md) covers one. If you need Cursor's
editor experience specifically, the IDE's provider settings are outside the
scope of these CLI documents.

## Keeping this document honest

When the router implements the minimum `agent.v1`/`aiserver.v1` handshake and
completion surface, replace this refusal with a real configuration document
and a smoke test against the actual `cursor-agent` binary.
