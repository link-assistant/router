# CLI: Cursor CLI (`cursor-agent`) — not supported

**Status: unsupported.** This document exists so the gap is explicit rather than
silently missing from the list.

## One-line capability check

```bash
link-assistant-router with cursor "hi"
```

This exits nonzero before launching Cursor and explains the missing custom
endpoint/MCP adapter. It does not edit `~/.cursor` or silently proxy unrelated
traffic. The supported client registry is summarized in
[with-router.md](with-router.md).

## The finding

The [Cursor CLI configuration reference](https://cursor.com/docs/cli/reference/configuration)
documents `~/.cursor/cli-config.json`, `CURSOR_CONFIG_DIR`, `XDG_CONFIG_HOME`,
the standard `HTTP_PROXY` / `HTTPS_PROXY` / `NODE_USE_ENV_PROXY` variables, and
`NODE_EXTRA_CA_CERTS`.

It documents **no** custom API base URL and **no** custom provider key; model
selection is limited to Cursor-hosted models.

Note the asymmetry: the Cursor **IDE** exposes an "Override OpenAI Base URL"
setting, but `cursor-agent` — the CLI — does not expose an equivalent. Advice
written for the IDE does not transfer.

Consequently there is no supported way to point `cursor-agent` at the router,
and this repository claims none.

## The only interception route, and why we do not recommend it

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

Use a CLI that supports a configurable endpoint — every other document in
[`README.md`](README.md) covers one. If you need Cursor's editor experience
specifically, the IDE's base-URL override is the supported surface, outside the
scope of these CLI documents.

## Keeping this document honest

If Cursor adds a base-URL or custom-provider option to `cursor-agent`, this
document should be replaced with a real configuration document plus a smoke
test, in the same shape as the others.
