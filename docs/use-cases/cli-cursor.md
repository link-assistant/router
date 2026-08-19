# CLI: Cursor CLI (`cursor-agent`) — not implemented

**Status: not implemented.** No router version routes Cursor CLI natively, and
`with cursor-agent` fails before launch. This is a statement about what exists, not a
prediction: the adapter below is scoped and buildable, it has simply not been
built, and a contributor is welcome to take it (issue #207).

An advanced, opt-in TLS-proxy route is described under
[If you want to try it anyway](#if-you-want-to-try-it-anyway). It is unverified
and carries a real security cost, which that section states in full.

## One-line capability check

```bash
link-assistant-router with cursor-agent "hi"
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
API. Any adapter is therefore version-pinned by nature: it targets one
`cursor-agent` release and is expected to break when Cursor changes the wire
format, which it may do without notice. That is the cost to accept before
starting — not a reason the work cannot be done.

## What a minimal adapter would have to cover

The protocol investigation is complete, so the remaining work can be judged
rather than estimated. An adapter targeting one pinned `cursor-agent` release
would need:

- [ ] an HTTP/2 server speaking Connect-RPC framing (unary and server-streaming)
      on the endpoint `CURSOR_API_ENDPOINT` points at;
- [ ] the protobuf schema for `agent.v1` and the `aiserver.v1` messages the run
      path touches, captured from a pinned client build;
- [ ] the session handshake the client performs before its first turn;
- [ ] `/agent.v1.AgentService/Run` — the entry point — translating each turn to
      an existing router surface (`/v1/chat/completions` is the closest fit);
- [ ] streamed tool calls and tool results in both directions, which is where
      the shape diverges most from the chat dialects;
- [ ] the supporting `aiserver.v1` RPCs the client calls during a run;
- [ ] a recorded-fixture test per RPC, so drift is a test failure rather than a
      user-visible break;
- [ ] a version assertion that fails loudly and names the pinned release when
      the client is upgraded.

[Agent Vibes](https://github.com/funny-vibes/agent-vibes) implements a
version-specific adapter against the same boundary and is the closest available
reference for the wire format.

Nothing above depends on the router's internals beyond one existing surface, so
this can be built and reviewed independently. What it cannot be is
maintenance-free: see the pinning note above.

## If you want to try it anyway

This route is **advanced, opt-in and unverified**. It is documented because
users who accept the tradeoff currently have to rediscover it themselves, which
is worse for security than a reviewed description — not because it is
recommended, and not because it is supported.

`cursor-agent` honours the standard proxy variables and `NODE_EXTRA_CA_CERTS`,
so a TLS-terminating forward proxy with a CA the process trusts can in principle
rewrite its traffic toward the router.

Understand the cost before doing it:

- the CA you install decrypts **all** of that process's traffic, not just model
  calls. Anything else it talks to is readable by whatever holds that key;
- it still depends on Cursor's private, unversioned wire protocol, so it can
  stop working after any client upgrade;
- it is **unverified**: no test in this repository exercises it, and none of the
  guarantees the supported clients get apply here.

If you proceed, scope the trusted CA and the proxy to that one process — never
install the CA into the system trust store — and expect to maintain it yourself.
Without the Connect-RPC adapter above, a TLS proxy only relocates the traffic;
it does not translate it, so the router still has no matching route.

## Wrapper argument boundary

Cursor is rejected before launch regardless of argument placement. For
supported clients, router wrapper flags may appear before or after the client;
an explicit `--` forwards every later token verbatim. See
[with-router.md](with-router.md#arguments-interaction-and-models).

## What to do instead

Use a CLI that speaks one of the router's supported vendor protocols — every
other document in [`README.md`](README.md) covers one. If you need Cursor's
editor experience specifically, the IDE's provider settings are outside the
scope of these CLI documents.
