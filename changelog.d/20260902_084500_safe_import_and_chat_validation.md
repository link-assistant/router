---
bump: patch
---

### Fixed

- Validate the required Chat Completions `messages` field before provider selection or translation, returning a local OpenAI error without an upstream request for every routing mode (#387).
- Make Claude, Codex, Gemini, and Qwen credential imports fail closed: validate the refresh chain in an isolated durable store, probe the persisted fresh token through the non-inference vendor catalog, and only then promote the authoritative destination under the shared credential lock. Retain uncertain successors, reject unusable recovery state and filesystem aliases, honor the allowlisted Qwen OAuth resource origin, document Gemini's client-secret prerequisite, remove the rejected/unverified force bypass, and expose `--safe-refresh-chain-import-v1` as a stable deployment capability assertion (#385).
