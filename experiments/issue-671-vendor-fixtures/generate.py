#!/usr/bin/env python3
"""Write the initial vendor cassettes under tests/fixtures/vendor (issue #671).

The cassettes follow each vendor's documented wire format. Once real keys are
available, `rust-script scripts/record-vendor-fixtures.rs` re-records every
cassette that has a `record` section and scrubs it the same way.
"""
import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parents[2] / "tests" / "fixtures" / "vendor"
SCHEMA = "link-assistant-router/vendor-cassette/v1"
HAND = (
    "hand-written from the vendor's documented wire format; "
    "re-record with scripts/record-vendor-fixtures.rs"
)


def sse(events, named=True, done=False):
    lines = []
    for event in events:
        if named:
            lines.append(f"event: {event['type']}")
        lines.append("data: " + json.dumps(event, separators=(",", ":")))
        lines.append("")
    if done:
        lines += ["data: [DONE]", ""]
    return lines


def write(path, cassette):
    cassette = {"schema": SCHEMA, **cassette}
    target = ROOT / path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(cassette, indent=2, ensure_ascii=False) + "\n")


ANTHROPIC_RECORD = {
    "url": "https://api.anthropic.com/v1/messages",
    "auth_env": "ANTHROPIC_API_KEY",
    "auth_header": "x-api-key",
    "model_env": "ANTHROPIC_FIXTURE_MODEL",
    "headers": {"anthropic-version": "2023-06-01"},
}
CACHED_SYSTEM = [
    {
        "type": "text",
        "text": "You are a weather assistant. " * 200,
        "cache_control": {"type": "ephemeral"},
    }
]
WEATHER_TOOL = {
    "name": "get_weather",
    "description": "Current weather for a city",
    "input_schema": {
        "type": "object",
        "properties": {"city": {"type": "string"}},
        "required": ["city"],
    },
}
ANTHROPIC_USAGE = {
    "input_tokens": 12,
    "cache_creation_input_tokens": 1500,
    "cache_read_input_tokens": 3000,
    "cache_creation": {"ephemeral_5m_input_tokens": 1500, "ephemeral_1h_input_tokens": 0},
    "output_tokens": 1,
    "service_tier": "standard",
}
write(
    "anthropic/messages-stream-thinking-tool-cache.json",
    {
        "vendor": "anthropic",
        "description": "Streamed turn with a signed thinking block, text, a tool call and prompt-cache usage",
        "provenance": HAND,
        "record": ANTHROPIC_RECORD,
        "request": {
            "model": "{model}",
            "max_tokens": 2048,
            "stream": True,
            "thinking": {"type": "enabled", "budget_tokens": 1024},
            "system": CACHED_SYSTEM,
            "tools": [WEATHER_TOOL],
            "messages": [{"role": "user", "content": "What is the weather in Paris?"}],
        },
        "response": {
            "status": 200,
            "headers": {"content-type": "text/event-stream; charset=utf-8", "request-id": "req_scrubbed"},
            "sse": sse(
                [
                    {
                        "type": "message_start",
                        "message": {
                            "id": "msg_scrubbed_0001",
                            "type": "message",
                            "role": "assistant",
                            "model": "claude-sonnet-4-5-20250929",
                            "content": [],
                            "stop_reason": None,
                            "stop_sequence": None,
                            "usage": ANTHROPIC_USAGE,
                        },
                    },
                    {"type": "ping"},
                    {"type": "content_block_start", "index": 0, "content_block": {"type": "thinking", "thinking": "", "signature": ""}},
                    {"type": "content_block_delta", "index": 0, "delta": {"type": "thinking_delta", "thinking": "The user wants the weather in Paris, so I should call get_weather."}},
                    {"type": "content_block_delta", "index": 0, "delta": {"type": "signature_delta", "signature": "c2NydWJiZWQtdGhpbmtpbmctc2lnbmF0dXJlLTAwMDE="}},
                    {"type": "content_block_stop", "index": 0},
                    {"type": "content_block_start", "index": 1, "content_block": {"type": "text", "text": ""}},
                    {"type": "content_block_delta", "index": 1, "delta": {"type": "text_delta", "text": "Let me check the weather"}},
                    {"type": "content_block_delta", "index": 1, "delta": {"type": "text_delta", "text": " in Paris."}},
                    {"type": "content_block_stop", "index": 1},
                    {"type": "content_block_start", "index": 2, "content_block": {"type": "tool_use", "id": "toolu_scrubbed_0001", "name": "get_weather", "input": {}}},
                    {"type": "content_block_delta", "index": 2, "delta": {"type": "input_json_delta", "partial_json": ""}},
                    {"type": "content_block_delta", "index": 2, "delta": {"type": "input_json_delta", "partial_json": "{\"city\": "}},
                    {"type": "content_block_delta", "index": 2, "delta": {"type": "input_json_delta", "partial_json": "\"Paris\"}"}},
                    {"type": "content_block_stop", "index": 2},
                    {
                        "type": "message_delta",
                        "delta": {"stop_reason": "tool_use", "stop_sequence": None},
                        "usage": {
                            "input_tokens": 12,
                            "cache_creation_input_tokens": 1500,
                            "cache_read_input_tokens": 3000,
                            "output_tokens": 48,
                        },
                    },
                    {"type": "message_stop"},
                ]
            ),
        },
        "expect": {"text": "Let me check the weather in Paris.", "tool": "get_weather", "tool_arguments": {"city": "Paris"}, "charged_tokens": 4560},
    },
)
write(
    "anthropic/messages-cache-read.json",
    {
        "vendor": "anthropic",
        "description": "Non-streamed turn answered from the prompt cache",
        "provenance": HAND,
        "record": ANTHROPIC_RECORD,
        "request": {
            "model": "{model}",
            "max_tokens": 256,
            "system": CACHED_SYSTEM,
            "messages": [{"role": "user", "content": "Say hello."}],
        },
        "response": {
            "status": 200,
            "headers": {"content-type": "application/json", "request-id": "req_scrubbed"},
            "json": {
                "id": "msg_scrubbed_0002",
                "type": "message",
                "role": "assistant",
                "model": "claude-sonnet-4-5-20250929",
                "content": [{"type": "text", "text": "Hello!"}],
                "stop_reason": "end_turn",
                "stop_sequence": None,
                "usage": {
                    "input_tokens": 20,
                    "cache_creation_input_tokens": 0,
                    "cache_read_input_tokens": 4000,
                    "cache_creation": {"ephemeral_5m_input_tokens": 0, "ephemeral_1h_input_tokens": 0},
                    "output_tokens": 15,
                    "service_tier": "standard",
                },
            },
        },
        "expect": {"text": "Hello!", "charged_tokens": 4035},
    },
)
for status, kind, message, headers in [
    (529, "overloaded_error", "Overloaded", {}),
    (429, "rate_limit_error", "This request would exceed your organization's rate limit.", {"retry-after": "17"}),
    (400, "invalid_request_error", "messages: at least one message is required", {}),
    (500, "api_error", "Internal server error", {}),
]:
    write(
        f"anthropic/error-{status}-{kind.replace('_', '-')}.json",
        {
            "vendor": "anthropic",
            "description": f"HTTP {status} {kind} error envelope",
            "provenance": "hand-written from the documented error envelope; vendor errors cannot be provoked on demand, so it is not re-recorded",
            "record": None,
            "request": {"model": "{model}", "max_tokens": 16, "messages": [{"role": "user", "content": "hi"}]},
            "response": {
                "status": status,
                "headers": {"content-type": "application/json", "request-id": "req_scrubbed", **headers},
                "json": {"type": "error", "error": {"type": kind, "message": message}, "request_id": "req_scrubbed"},
            },
            "expect": {"status": status, "error_type": kind},
        },
    )

RESPONSES_RECORD = {
    "url": "https://api.openai.com/v1/responses",
    "auth_env": "OPENAI_API_KEY",
    "auth_header": "authorization",
    "model_env": "OPENAI_FIXTURE_MODEL",
    "headers": {},
}
resp_usage = {
    "input_tokens": 5200,
    "input_tokens_details": {"cached_tokens": 4096},
    "output_tokens": 64,
    "output_tokens_details": {"reasoning_tokens": 32},
    "total_tokens": 5264,
}
reasoning = {"id": "rs_scrubbed_0001", "type": "reasoning", "summary": [], "encrypted_content": "c2NydWJiZWQtZW5jcnlwdGVkLXJlYXNvbmluZw=="}
message = {
    "id": "msg_scrubbed_0001",
    "type": "message",
    "status": "completed",
    "role": "assistant",
    "content": [{"type": "output_text", "text": "Hello from the cache.", "annotations": []}],
}
base = {"id": "resp_scrubbed_0001", "object": "response", "model": "gpt-5-2025-08-07"}
write(
    "openai_responses/responses-stream-cached.json",
    {
        "vendor": "openai-responses",
        "description": "Streamed Responses turn with encrypted reasoning and cached input tokens",
        "provenance": HAND,
        "record": RESPONSES_RECORD,
        "request": {
            "model": "{model}",
            "stream": True,
            "store": False,
            "include": ["reasoning.encrypted_content"],
            "instructions": "You are terse. " * 300,
            "input": [{"role": "user", "content": [{"type": "input_text", "text": "Say hello."}]}],
        },
        "response": {
            "status": 200,
            "headers": {"content-type": "text/event-stream; charset=utf-8", "x-request-id": "req_scrubbed"},
            "sse": sse(
                [
                    {"type": "response.created", "sequence_number": 0, "response": {**base, "status": "in_progress", "output": []}},
                    {"type": "response.in_progress", "sequence_number": 1, "response": {**base, "status": "in_progress", "output": []}},
                    {"type": "response.output_item.added", "sequence_number": 2, "output_index": 0, "item": {**reasoning, "encrypted_content": None}},
                    {"type": "response.output_item.done", "sequence_number": 3, "output_index": 0, "item": reasoning},
                    {"type": "response.output_item.added", "sequence_number": 4, "output_index": 1, "item": {**message, "status": "in_progress", "content": []}},
                    {"type": "response.content_part.added", "sequence_number": 5, "item_id": "msg_scrubbed_0001", "output_index": 1, "content_index": 0, "part": {"type": "output_text", "text": "", "annotations": []}},
                    {"type": "response.output_text.delta", "sequence_number": 6, "item_id": "msg_scrubbed_0001", "output_index": 1, "content_index": 0, "delta": "Hello from"},
                    {"type": "response.output_text.delta", "sequence_number": 7, "item_id": "msg_scrubbed_0001", "output_index": 1, "content_index": 0, "delta": " the cache."},
                    {"type": "response.output_text.done", "sequence_number": 8, "item_id": "msg_scrubbed_0001", "output_index": 1, "content_index": 0, "text": "Hello from the cache."},
                    {"type": "response.content_part.done", "sequence_number": 9, "item_id": "msg_scrubbed_0001", "output_index": 1, "content_index": 0, "part": message["content"][0]},
                    {"type": "response.output_item.done", "sequence_number": 10, "output_index": 1, "item": message},
                    {"type": "response.completed", "sequence_number": 11, "response": {**base, "status": "completed", "output": [reasoning, message], "usage": resp_usage}},
                ]
            ),
        },
        "expect": {"text": "Hello from the cache.", "charged_tokens": 5264},
    },
)

CHAT_RECORD = {
    "url": "https://api.openai.com/v1/chat/completions",
    "auth_env": "OPENAI_API_KEY",
    "auth_header": "authorization",
    "model_env": "OPENAI_CHAT_FIXTURE_MODEL",
    "headers": {},
}
chat_usage = {
    "prompt_tokens": 2048,
    "completion_tokens": 12,
    "total_tokens": 2060,
    "prompt_tokens_details": {"cached_tokens": 1920, "audio_tokens": 0},
    "completion_tokens_details": {"reasoning_tokens": 0, "audio_tokens": 0, "accepted_prediction_tokens": 0, "rejected_prediction_tokens": 0},
}
chunk = {"id": "chatcmpl-scrubbed0001", "object": "chat.completion.chunk", "created": 1700000000, "model": "gpt-4.1-2025-04-14", "system_fingerprint": "fp_scrubbed", "service_tier": "default"}
write(
    "openai_chat/chat-stream-cached.json",
    {
        "vendor": "openai-chat",
        "description": "Streamed Chat Completions turn with include_usage and cached prompt tokens",
        "provenance": HAND,
        "record": CHAT_RECORD,
        "request": {
            "model": "{model}",
            "stream": True,
            "stream_options": {"include_usage": True},
            "messages": [
                {"role": "system", "content": "You are terse. " * 300},
                {"role": "user", "content": "Say hello."},
            ],
        },
        "response": {
            "status": 200,
            "headers": {"content-type": "text/event-stream; charset=utf-8", "x-request-id": "req_scrubbed"},
            "sse": sse(
                [
                    {**chunk, "choices": [{"index": 0, "delta": {"role": "assistant", "content": "", "refusal": None}, "logprobs": None, "finish_reason": None}], "usage": None},
                    {**chunk, "choices": [{"index": 0, "delta": {"content": "Hello"}, "logprobs": None, "finish_reason": None}], "usage": None},
                    {**chunk, "choices": [{"index": 0, "delta": {"content": " there!"}, "logprobs": None, "finish_reason": None}], "usage": None},
                    {**chunk, "choices": [{"index": 0, "delta": {}, "logprobs": None, "finish_reason": "stop"}], "usage": None},
                    {**chunk, "choices": [], "usage": chat_usage},
                ],
                named=False,
                done=True,
            ),
        },
        "expect": {"text": "Hello there!", "charged_tokens": 2060},
    },
)
write(
    "openai_chat/chat-cached.json",
    {
        "vendor": "openai-chat",
        "description": "Non-streamed Chat Completions turn with cached prompt tokens",
        "provenance": HAND,
        "record": CHAT_RECORD,
        "request": {
            "model": "{model}",
            "messages": [
                {"role": "system", "content": "You are terse. " * 300},
                {"role": "user", "content": "Say hello."},
            ],
        },
        "response": {
            "status": 200,
            "headers": {"content-type": "application/json", "x-request-id": "req_scrubbed"},
            "json": {
                "id": "chatcmpl-scrubbed0002",
                "object": "chat.completion",
                "created": 1700000000,
                "model": "gpt-4.1-2025-04-14",
                "choices": [{"index": 0, "message": {"role": "assistant", "content": "Hello there!", "refusal": None, "annotations": []}, "logprobs": None, "finish_reason": "stop"}],
                "usage": chat_usage,
                "service_tier": "default",
                "system_fingerprint": "fp_scrubbed",
            },
        },
        "expect": {"text": "Hello there!", "charged_tokens": 2060},
    },
)

GEMINI_RECORD = {
    "url": "https://generativelanguage.googleapis.com/v1beta/models/{model}:streamGenerateContent?alt=sse",
    "auth_env": "GEMINI_API_KEY",
    "auth_header": "x-goog-api-key",
    "model_env": "GEMINI_FIXTURE_MODEL",
    "headers": {},
    "code_assist_envelope": True,
}
gemini_usage = {
    "promptTokenCount": 3000,
    "candidatesTokenCount": 20,
    "totalTokenCount": 3044,
    "cachedContentTokenCount": 2048,
    "thoughtsTokenCount": 24,
    "promptTokensDetails": [{"modality": "TEXT", "tokenCount": 3000}],
    "cacheTokensDetails": [{"modality": "TEXT", "tokenCount": 2048}],
}
write(
    "gemini/stream-generate-content-cached.json",
    {
        "vendor": "gemini-code-assist",
        "description": "Code Assist streamGenerateContent turn with cached content tokens",
        "provenance": HAND,
        "record": GEMINI_RECORD,
        "request": {
            "contents": [{"role": "user", "parts": [{"text": "Say hello."}]}],
            "systemInstruction": {"parts": [{"text": "You are terse. " * 300}]},
        },
        "response": {
            "status": 200,
            "headers": {"content-type": "text/event-stream"},
            "sse": [
                line
                for event in [
                    {"response": {"candidates": [{"content": {"role": "model", "parts": [{"text": "Hello"}]}}], "usageMetadata": {"promptTokenCount": 3000, "totalTokenCount": 3000, "cachedContentTokenCount": 2048}, "modelVersion": "gemini-2.5-pro", "responseId": "scrubbed0001"}, "traceId": "scrubbed"},
                    {"response": {"candidates": [{"content": {"role": "model", "parts": [{"text": " there!"}]}, "finishReason": "STOP"}], "usageMetadata": gemini_usage, "modelVersion": "gemini-2.5-pro", "responseId": "scrubbed0001"}, "traceId": "scrubbed"},
                ]
                for line in ("data: " + json.dumps(event, separators=(",", ":")), "")
            ],
        },
        "expect": {"text": "Hello there!", "charged_tokens": 3044},
    },
)
print("wrote", sorted(str(p.relative_to(ROOT)) for p in ROOT.rglob("*.json")))
