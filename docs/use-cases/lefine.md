# Lefine API provider

Router supports Lefine as a persisted, encrypted API-key provider with native
OpenAI Chat Completions forwarding. Lefine's public integration reference
documents the `https://lefine.pro/v1` base, Bearer authentication,
`POST /chat/completions`, JSON responses, and SSE streaming.

## Configure

Pass the key through standard input or name an environment variable available
to the Router process. The Lefine kind refuses a key placed directly in argv.

```bash
pass show lefine/api-key | router providers add \
  --name lefine \
  --kind lefine \
  --base-url https://lefine.pro/v1 \
  --models workflow/orator \
  --api-key-stdin
```

`--models` contains exact operator-configured fallback IDs; Router does not
ship a Lefine model list. The example above is the exact ID in the current
[public Lefine integration reference](https://lefine.pro/@anon-96a64f98/c/dff960f28d699ced505526f6.org),
not a Router default. Omit it when the live catalog is sufficient, or repeat
the command with the provider's current exact IDs if catalog fallback is
required.

Adding the same name replaces it by default. Add `--if-absent` to keep an
existing record. In either mode every candidate remains staged until its
Bearer key positively passes `GET /v1/models`; rejection, rate limiting,
malformed data, timeout, or uncertain persistence cannot displace the active
encrypted record.

## Discovery and routing

Router prefers Lefine's authenticated `GET /v1/models` response, preserves the
exact IDs and metadata, and deduplicates repeated IDs. If a previously accepted
provider's catalog later becomes unavailable, only exact IDs explicitly stored
in `--models` remain visible. With neither live nor configured IDs, discovery
fails closed.

Lefine is visible only to signed Router clients with a fixture-tested native
OpenAI Chat Completions protocol: OpenCode, Grok CLI, and Qwen Code. It is not
offered to Claude Code, Codex, Gemini CLI, Cursor, or the generic Agent merely
because those client kinds exist.

Chat request JSON, roles, tool calls, finish reasons, token usage, error bodies,
SSE frames, and safe provider response headers pass through unchanged. Router
replaces only the Bearer credential and filters hop-by-hop, ingress identity,
forwarding, and Router-internal headers.

## Usage

The public reference does not document a non-inference subscription or quota
source. Router therefore reports an explicit `usage_source_unavailable` state
instead of estimating usage:

```bash
LINK_ASSISTANT_TOKEN=<opencode-client-token> router usage lefine --json
```

A real catalog smoke test runs only when `LEFINE_API_KEY` is explicitly present
in the test environment. It performs no inference request, verifies the log
projection redacts the key, and never prints the key. Its test output explicitly
reports `RUN` or `SKIP`. End-to-end generation is a separate opt-in check and
runs only when `LEFINE_INFERENCE_ACCEPTANCE=1` is also set; the repository's
normal live credential gate never consumes model tokens.
