#!/usr/bin/env python3
"""Issue #784: minimal Anthropic Messages mock that records every POST body.

Used to see how a Claude Code release advertises its tools (direct `tools[]`
entries versus deferred names announced in message text) without Router.
Usage: claude-capture-mock.py <port> <output-dir>
"""
import json
import pathlib
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

PORT = int(sys.argv[1])
OUT = pathlib.Path(sys.argv[2])
OUT.mkdir(parents=True, exist_ok=True)
COUNT = [0]


def sse(event, data):
    return f"event: {event}\ndata: {json.dumps(data)}\n\n".encode()


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def do_GET(self):
        self.send_response(404)
        self.end_headers()

    def do_HEAD(self):
        self.do_GET()

    def do_POST(self):
        body = self.rfile.read(int(self.headers.get("content-length", "0")))
        COUNT[0] += 1
        (OUT / f"{COUNT[0]:03d}{self.path.replace('/', '_')[:60]}.json").write_bytes(body)
        if "/messages" not in self.path or "count_tokens" in self.path:
            self.send_response(200)
            self.send_header("content-type", "application/json")
            self.end_headers()
            self.wfile.write(b'{"input_tokens":1}')
            return
        message = {"id": "msg_1", "type": "message", "role": "assistant", "model": "claude-x",
                   "content": [], "stop_reason": None, "stop_sequence": None,
                   "usage": {"input_tokens": 1, "output_tokens": 1}}
        self.send_response(200)
        self.send_header("content-type", "text/event-stream")
        self.end_headers()
        self.wfile.write(sse("message_start", {"type": "message_start", "message": message}))
        self.wfile.write(sse("content_block_start", {"type": "content_block_start", "index": 0,
                                                     "content_block": {"type": "text", "text": ""}}))
        self.wfile.write(sse("content_block_delta", {"type": "content_block_delta", "index": 0,
                                                     "delta": {"type": "text_delta", "text": "ok"}}))
        self.wfile.write(sse("content_block_stop", {"type": "content_block_stop", "index": 0}))
        self.wfile.write(sse("message_delta", {"type": "message_delta",
                                               "delta": {"stop_reason": "end_turn", "stop_sequence": None},
                                               "usage": {"output_tokens": 1}}))
        self.wfile.write(sse("message_stop", {"type": "message_stop"}))


ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
