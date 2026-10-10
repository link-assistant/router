"""Bounded production-server probe for unconfigured single-account cooldowns."""
import http.server
import json
import os
from pathlib import Path
import socket
import subprocess
import tempfile
import threading
import time
import urllib.error
import urllib.request

ROOT = Path(__file__).resolve().parents[2]
calls = []


class Vendor(http.server.BaseHTTPRequestHandler):
    def log_message(self, *_):
        pass

    def do_GET(self):
        self.send_error(404)

    def do_POST(self):
        calls.append(self.path)
        self.rfile.read(int(self.headers.get("Content-Length", "0")))
        body = b'{"error":{"type":"rate_limit_error","message":"rate limited"}}'
        self.send_response(429)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Retry-After", "60")
        self.end_headers()
        self.wfile.write(body)


vendor = http.server.ThreadingHTTPServer(("127.0.0.1", 0), Vendor)
thread = threading.Thread(target=vendor.serve_forever, daemon=True)
thread.start()
try:
    with tempfile.TemporaryDirectory() as temporary:
        home = Path(temporary)
        (home / "credentials.json").write_text(json.dumps({"accessToken": "vendor-probe"}))
        with socket.socket() as listener:
            listener.bind(("127.0.0.1", 0))
            port = listener.getsockname()[1]
        args = [os.environ.get("ROUTER_PROBE_BINARY", str(ROOT / "target/debug/router")), "--token-secret", "probe-secret",
                "--data-dir", str(home / "data"), "--claude-code-home", str(home),
                "--storage-policy", "text", "--upstream-provider", "anthropic",
                "--upstream-base-url", f"http://127.0.0.1:{vendor.server_port}"]
        env = os.environ.copy()
        for name in ["ACCOUNT_DIRS", "ACCOUNT_REQUEST_LIMITS", "ACCOUNT_ROUTING_STRATEGY",
                     "ACCOUNT_FORCE_MODEL_PREFIX", "ROUTER_SERVER", "ROUTER_TOKEN"]:
            env.pop(name, None)
        issued = subprocess.run(args + ["tokens", "issue", "--admin"], env=env, capture_output=True, check=True)
        token = next(line for line in issued.stdout.decode().splitlines() if line.startswith("la_sk_"))
        with (ROOT / "experiments/issue-723/single-primary-server.log").open("w") as log:
            process = subprocess.Popen(args + ["--host", "127.0.0.1", "--port", str(port)],
                                       env=env, stdout=log, stderr=log)
            try:
                until = time.monotonic() + 5
                while True:
                    try:
                        with socket.create_connection(("127.0.0.1", port), timeout=1):
                            break
                    except OSError:
                        if process.poll() is not None or time.monotonic() >= until:
                            raise RuntimeError("router did not start within five seconds")
                        time.sleep(0.05)
                request = urllib.request.Request(
                    f"http://127.0.0.1:{port}/api/management/tokens/client",
                    data=json.dumps({"client_kind": "claude-code"}).encode(),
                    headers={"Content-Type": "application/json", "Authorization": f"Bearer {token}"})
                with urllib.request.urlopen(request, timeout=5) as response:
                    token = json.load(response)["token"]
                statuses = []
                for _ in range(2):
                    request = urllib.request.Request(
                        f"http://127.0.0.1:{port}/api/services/anthropic/v1/messages",
                        data=json.dumps({"model": "native", "max_tokens": 16,
                                         "messages": [{"role": "user", "content": "hi"}]}).encode(),
                        headers={"Content-Type": "application/json", "X-Api-Key": token,
                                 "User-Agent": "claude-cli/2.1.259", "Anthropic-Version": "2023-06-01"})
                    try:
                        with urllib.request.urlopen(request, timeout=5) as response:
                            statuses.append(response.status)
                    except urllib.error.HTTPError as error:
                        statuses.append(error.code)
                        message = error.read()
                        if error.code != 429:
                            print("unexpected response:", message.decode())
                print("statuses:", statuses, "vendor calls:", len(calls))
                assert statuses == [429, 429], "a missing policy must not introduce a cooldown"
            finally:
                process.terminate()
                process.wait()
finally:
    vendor.shutdown()
    vendor.server_close()
    thread.join()
