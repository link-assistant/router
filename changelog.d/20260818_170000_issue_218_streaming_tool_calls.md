---
bump: minor
---

### Fixed
- A tool call from a Claude model now survives `/v1/responses` streaming. The translator handled only `message_start`, text deltas and `message_stop`, so both halves of a streamed tool call were discarded: `content_block_start`, where Anthropic announces the call with its identifier and name, had no case at all, and `input_json_delta` — the frames carrying the arguments — was dropped by an early return. A tool-only turn therefore reached the caller as an **empty** `output_text` with a normal `response.completed`: a well-formed, successful, completely empty answer that a client cannot distinguish from a real one. The same request with `stream: false` was correct throughout, and the Anthropic and Chat Completions surfaces were unaffected, which is why this survived. This blocked every agentic CLI driving a Claude model through `/v1/responses`, since those clients always stream; with issue #215 fixed in v0.89.0, it was what remained of `codex exec` against Claude.
- A turn that produced only tool calls no longer emits an empty `output_text` item. The message item is announced when the first text arrives rather than up front, so it exists only when there is something in it.
- A turn mixing text and tool calls preserves both, each in its own output slot, in the order the vendor emitted them.

### Added
- `response.function_call_arguments.delta` and `.done` are emitted as the arguments stream, using the event names the Responses dialect already uses, and the assembled arguments are asserted equal to those the non-streaming path produces from the same upstream body — the check that keeps the two translations from drifting apart again.
