---
bump: patch
---

### Fixed

- Validate the required Chat Completions `messages` field before provider selection or translation, returning a local OpenAI error without an upstream request for every routing mode (#387).
- Make Claude, Codex, Gemini, and Qwen credential imports fail closed: validate the refresh chain in an isolated durable store, probe the persisted fresh token through the non-inference vendor catalog, and only then promote the authoritative destination under the shared credential lock. Retain uncertain successors, reject unusable recovery state and filesystem aliases, honor the allowlisted Qwen OAuth resource origin, document Gemini's client-secret prerequisite, remove the rejected/unverified force bypass, and expose `--safe-refresh-chain-import-v1` as a stable deployment capability assertion (#385).
- Bind each managed launch to a signed client kind and subscriber principal, require matching client evidence at the protocol boundary, and deny generic or administrative tokens access to consumer subscriptions unless an exact operator-approved client/provider override exists (#389).
- Add the personal z.ai Coding Plan as an explicit opt-in provider with acknowledged intermediary risk, exact per-client model registries, fixed protocol endpoints, live non-inference health checks, single-subscriber authorization, and fail-closed unsupported-client overrides (#390).
