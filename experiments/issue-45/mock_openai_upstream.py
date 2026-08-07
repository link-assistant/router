#!/usr/bin/env python3
"""Minimal OpenAI-compatible upstream used to test the Anthropic bridge.

Issue #45 asks that every documented use case be tested locally. The bridge
(`/v1/messages` served from a non-Anthropic upstream) can be exercised without
any vendor subscription by pointing the router at this server with
`UPSTREAM_PROVIDER=openai-compatible`.

Endpoints:
  POST /v1/chat/completions  -> JSON reply, or SSE when {"stream": true}
  GET  /requests             -> every request body this server has received,
                                so a test can assert on the *translated* shape

Usage: python3 mock_openai_upstream.py [port]
"""

import json
import sys
from http.server import BaseHTTPRequestHandler, HTTPServer

RECEIVED = []
REPLY_TEXT = "Hello from the mock upstream."


class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def log_message(self, *_args):  # keep the test output readable
        pass

    def _send(self, status, body: bytes, content_type="application/json"):
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):  # noqa: N802 - BaseHTTPRequestHandler API
        if self.path == "/requests":
            self._send(200, json.dumps(RECEIVED).encode())
        else:
            self._send(404, b'{"error":"not found"}')

    def do_POST(self):  # noqa: N802 - BaseHTTPRequestHandler API
        length = int(self.headers.get("Content-Length", "0"))
        raw = self.rfile.read(length)
        try:
            body = json.loads(raw or b"{}")
        except json.JSONDecodeError:
            body = {"_unparsed": raw.decode("utf-8", "replace")}
        RECEIVED.append({"path": self.path, "body": body})

        if not self.path.endswith("/chat/completions"):
            self._send(404, b'{"error":"not found"}')
            return

        if body.get("stream"):
            self._stream(body)
        else:
            self._json(body)

    def _json(self, body):
        payload = {
            "id": "chatcmpl-mock-1",
            "object": "chat.completion",
            "created": 0,
            "model": body.get("model", "mock-model"),
            "choices": [
                {
                    "index": 0,
                    "message": {"role": "assistant", "content": REPLY_TEXT},
                    "finish_reason": "stop",
                }
            ],
            "usage": {"prompt_tokens": 11, "completion_tokens": 7, "total_tokens": 18},
        }
        self._send(200, json.dumps(payload).encode())

    def _stream(self, body):
        model = body.get("model", "mock-model")
        self.send_response(200)
        self.send_header("Content-Type", "text/event-stream")
        self.send_header("Cache-Control", "no-cache")
        self.send_header("Connection", "close")
        self.end_headers()

        def chunk(delta, finish=None):
            payload = {
                "id": "chatcmpl-mock-1",
                "object": "chat.completion.chunk",
                "created": 0,
                "model": model,
                "choices": [{"index": 0, "delta": delta, "finish_reason": finish}],
            }
            self.wfile.write(f"data: {json.dumps(payload)}\n\n".encode())
            self.wfile.flush()

        chunk({"role": "assistant", "content": ""})
        for piece in ("Hello", " from", " the", " mock", " upstream."):
            chunk({"content": piece})
        chunk({}, finish="stop")
        self.wfile.write(b"data: [DONE]\n\n")
        self.wfile.flush()
        self.close_connection = True


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8899
    HTTPServer(("127.0.0.1", port), Handler).serve_forever()


if __name__ == "__main__":
    main()
