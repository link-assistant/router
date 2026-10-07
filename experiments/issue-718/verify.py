#!/usr/bin/env python3
"""Exercise a real Router with inherited terminal output and an isolated home."""
import json
import os
from pathlib import Path
import signal
import socket
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request

binary = Path(sys.argv[1] if len(sys.argv) > 1 else "target/debug/router").resolve()
with tempfile.TemporaryDirectory(prefix="router-operational-log-") as temporary:
    home = Path(temporary)
    with socket.socket() as reserved:
        reserved.bind(("127.0.0.1", 0))
        port = reserved.getsockname()[1]
    # Strip inherited credential roots, tokens, and IPC settings.
    environment = {"PATH": os.environ.get("PATH", ""), "HTTP_PROXY": "http://127.0.0.1:9",
                   "HTTPS_PROXY": "http://127.0.0.1:9", "ALL_PROXY": "http://127.0.0.1:9",
                   "NO_PROXY": "127.0.0.1,localhost"}
    environment.update({
        "HOME": str(home), "XDG_CONFIG_HOME": str(home / "config"),
        "DATA_DIR": str(home / "data"), "CLAUDE_CODE_HOME": str(home / "claude"),
        "CODEX_HOME": str(home / "codex"), "GEMINI_HOME": str(home / "gemini"),
        "QWEN_HOME": str(home / "qwen"),
        "TOKEN_SECRET": "isolated-test-signing-secret",
        "TOKEN_ADMIN_KEY": "isolated-test-admin-secret",
        "ROUTER_HOST": "127.0.0.1", "ROUTER_PORT": str(port),
        "DISABLE_LOGIN_API": "true", "VERBOSE": "false", "RUST_LOG": "info",
    })
    # stdout/stderr are inherited; persistence must be Router's responsibility.
    process = subprocess.Popen([str(binary), "serve"], env=environment)
    try:
        deadline = time.monotonic() + 30
        while time.monotonic() < deadline:
            try:
                urllib.request.urlopen(f"http://127.0.0.1:{port}/api/health", timeout=1).close()
                break
            except (urllib.error.URLError, TimeoutError):
                assert process.poll() is None, "Router exited during startup"
                time.sleep(0.1)
        else:
            raise AssertionError("Router did not become ready")
        request = urllib.request.Request(
            f"http://127.0.0.1:{port}/api/services/anthropic/v1/messages?access_token=synthetic-query-secret",
            data=json.dumps({"model": "claude-opus-5", "messages": []}).encode(),
            headers={"Content-Type": "application/json", "x-api-key": "synthetic-client-secret"},
        )
        try:
            urllib.request.urlopen(request, timeout=5).close()
        except urllib.error.HTTPError as error:
            assert error.code == 401
        process.send_signal(signal.SIGTERM)
        assert process.wait(timeout=10) == 0
        log_path = home / "data/logs/operational.log"
        log = log_path.read_text()
        for event in ("process_start", "status=401", "SIGTERM", "process_exit", "exit_code=0"):
            assert event in log, f"Missing {event}: {log}"
        for secret in ("synthetic-query-secret", "synthetic-client-secret", "isolated-test-signing-secret", "isolated-test-admin-secret"):
            assert secret not in log, f"Leaked {secret}"
        if os.name == "posix":
            assert log_path.stat().st_mode & 0o777 == 0o600
            assert log_path.parent.stat().st_mode & 0o777 == 0o700
        print(log)
        print("PASS: persistent lifecycle, request failure, SIGTERM, exit, redaction and permissions")
    finally:
        if process.poll() is None:
            process.kill()
        process.wait()
