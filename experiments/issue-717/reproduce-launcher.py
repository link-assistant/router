#!/usr/bin/env python3
"""Check quiet launch against any Router binary with an isolated fake Claude.

Usage: python3 experiments/issue-717/reproduce-launcher.py /path/to/router
No real vendor, subscription, user profile or credential store is used.
"""
import base64
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import threading


class RouterFixture(BaseHTTPRequestHandler):
    def log_message(self, *_):
        pass

    def do_GET(self):
        status, body = {
            '/api/health': (200, {'status': 'ok'}),
            '/api/management/tokens': (401, {'error': 'ordinary token'}),
            '/api/models': (200, {'data': [
                {'id': 'glm-5.3', 'owned_by': 'z.ai', 'router_available': False,
                 'router_unavailable_reason': 'z.ai billing exhausted (code 1113)'},
                {'id': 'glm-5.3-flash', 'owned_by': 'z.ai'},
            ]}),
        }.get(self.path, (404, {}))
        data = json.dumps(body).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(data)))
        self.end_headers()
        self.wfile.write(data)


binary = str(Path(sys.argv[1]).resolve())
with tempfile.TemporaryDirectory(prefix='router-717-') as root:
    home = Path(root)
    bin_dir = home / 'bin'
    bin_dir.mkdir()
    claude = bin_dir / 'claude'
    claude.write_text('#!/bin/sh\nif [ "$1" = --version ]; then echo "2.1.265 (Claude Code)"; exit 0; fi\necho FAKE_CLAUDE_LAUNCHED >&2\n')
    claude.chmod(0o755)
    profile = home / '.config/link-assistant-router/clients/claude/home'
    profile.mkdir(parents=True)
    (profile / 'settings.json').write_text('{"model":"glm-5.3"}')
    payload = base64.urlsafe_b64encode(json.dumps({
        'sub': 'run-id', 'client_kind': 'claude', 'principal_id': 'run-principal'
    }).encode()).decode().rstrip('=')
    token = f'la_sk_e30.{payload}.signature'
    server = ThreadingHTTPServer(('127.0.0.1', 0), RouterFixture)
    fixture_thread = threading.Thread(target=server.serve_forever)
    fixture_thread.start()
    try:
        environment = {**os.environ, 'HOME': str(home), 'XDG_CONFIG_HOME': str(home / '.config'),
                       'DATA_DIR': str(home / 'data'), 'PATH': str(bin_dir),
                       'DISABLE_TELEMETRY': '1'}
        for key in ('ANTHROPIC_MODEL', 'CLAUDE_CONFIG_DIR', 'VERBOSE', 'RUST_LOG'):
            environment.pop(key, None)
        result = subprocess.run([binary, 'with', '--interactive', '--server',
                                 f'http://127.0.0.1:{server.server_port}', '--token', token, 'claude'],
                                env=environment, input=b'', capture_output=True, check=False)
        logs = list((home / 'data/launcher').glob('launcher.log*'))
        report = {'exit': result.returncode, 'stdout_bytes': len(result.stdout),
                  'stderr_before_marker_bytes': len(result.stderr.split(b'FAKE_CLAUDE_LAUNCHED')[0]),
                  'launcher_logs': len(logs)}
        print(json.dumps(report, indent=2))
        print(result.stderr.decode())
        assert result.returncode == 0
        assert result.stdout == b''
        assert result.stderr == b'FAKE_CLAUDE_LAUNCHED\n', 'Router diagnostics reached the terminal'
        assert logs, 'No persistent launcher log'
        assert all(token not in log.read_text() for log in logs), 'Token leaked'
    finally:
        server.shutdown()
        fixture_thread.join()
        server.server_close()
