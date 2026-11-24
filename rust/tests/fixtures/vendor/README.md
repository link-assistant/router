# Vendor cassettes

Recorded vendor exchanges replayed through Router by
`tests/vendor_fixture_replay_test.rs` (and, for Gemini, by the in-crate
rechunking tests in `src/gemini/stream_tests.rs`). Issue #671.

Each file is one exchange in the `link-assistant-router/vendor-cassette/v1`
format:

| Field | Meaning |
| --- | --- |
| `vendor`, `description` | What the exchange shows. |
| `provenance` | Hand-written from the documented wire format, or recorded (and when). |
| `record` | How to re-record: `url`, `auth_env`, `auth_header`, `model_env`, extra `headers`, and `code_assist_envelope` for Gemini. `null` for exchanges that cannot be provoked on demand (5xx, 529, 429). |
| `request` | The vendor request body; `"model": "{model}"` is filled from `model_env`. |
| `response` | `status`, kept `headers`, and either `sse` (one array entry per line) or `json`. |
| `expect` | What a client must see: `text`, `tool`, `tool_arguments`, `charged_tokens` (every vendor-reported token, cached ones included), or `status` and `error_type`. |

| Directory | Upstream dialect | Surfaces replayed through |
| --- | --- | --- |
| `anthropic/` | Messages (streamed thinking + tool use + cache creation/read, non-streamed cache read, 400/429/500/529 errors) | Anthropic Messages, OpenAI Chat, OpenAI Responses |
| `openai_responses/` | Codex Responses stream with reasoning and cached input | Codex Responses, OpenAI Chat, OpenAI Responses, Anthropic Messages (fails closed on the reasoning item; still charged) |
| `openai_chat/` | Chat Completions with cached prompt, streamed and not | OpenAI Chat via an OpenAI-compatible upstream |
| `gemini/` | Code Assist `streamGenerateContent` with cached content | Native, Chat and Responses stream translators (in-crate) |

## Re-recording

```sh
ANTHROPIC_API_KEY=... ANTHROPIC_FIXTURE_MODEL=... \
OPENAI_API_KEY=... OPENAI_FIXTURE_MODEL=... OPENAI_CHAT_FIXTURE_MODEL=... \
GEMINI_API_KEY=... GEMINI_FIXTURE_MODEL=... \
  rust-script scripts/record-vendor-fixtures.rs [--only anthropic/]
```

The script re-sends each `request`, replaces `response` with the vendor's
answer, and scrubs ids, signatures, encrypted reasoning state and timestamps.
Cassettes whose key variable is unset are skipped. Review the `expect` block
and the diff before committing, then run
`cargo test -j2 --test vendor_fixture_replay_test`.

`rust-script scripts/record-vendor-fixtures.rs --check` validates every
cassette offline (schema, placeholders, no credentials); CI runs it.
