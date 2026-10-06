"""Finite generated-client probes against a running Router and loopback upstream."""
import json
import os
import socket
import subprocess
import tempfile
import time
import urllib.request
from pathlib import Path
from link_assistant_router import Router
from link_assistant_router.testing import mock_upstream, temporary_home

ROOT = Path(__file__).resolve().parents[3]
home = temporary_home(); upstream = mock_upstream()
with socket.socket() as listener:
    listener.bind(('127.0.0.1', 0)); port = listener.getsockname()[1]
origin = f'http://127.0.0.1:{port}'
environment = {**os.environ, **home.env, 'TOKEN_SECRET':'http-client-fixture-secret', 'TOKEN_ADMIN_KEY':'http-client-fixture-admin',
               'STORAGE_POLICY':'text', 'UPSTREAM_PROVIDER':'openai-compatible', 'OPENAI_COMPATIBLE_BASE_URL':upstream.origin,
               'OPENAI_COMPATIBLE_API_KEY':'http-client-fixture-key', 'UPSTREAM_ALLOW_PRIVATE_NETWORKS':'loopback',
               'ROUTER_VALIDATE_HTTP_CONTRACTS':'1'}
binary = str(ROOT/'target/debug/router')
router = Router(binary=binary, env=environment, allow_download=False)
process = None
try:
    with (ROOT/'target/http-clients/router.log').open('wb') as log:
        process = subprocess.Popen([binary, '--port', str(port), 'serve'], env=environment, stdout=log, stderr=log, start_new_session=True)
        for attempt in range(100):
            try:
                with urllib.request.urlopen(origin+'/api/health', timeout=1) as response:
                    assert response.read().decode() == 'ok'; break
            except OSError:
                if process.poll() is not None: raise RuntimeError('Router failed; inspect target/http-clients/router.log')
                time.sleep(.1)
        else: raise RuntimeError('Router did not become healthy')
        request = urllib.request.Request(origin+'/api/management/tokens/client', data=json.dumps({'client_kind':'codex'}).encode(), headers={'Authorization':'Bearer '+environment['TOKEN_ADMIN_KEY'], 'Content-Type':'application/json'})
        with urllib.request.urlopen(request, timeout=10) as response:
            token = json.load(response)['token']
        environment.update(ROUTER_HTTP_ORIGIN=origin, ROUTER_HTTP_ADMIN_TOKEN=environment['TOKEN_ADMIN_KEY'], ROUTER_HTTP_CLIENT_TOKEN=token)
        subprocess.run(['go','test','-count=1','-run','TestRealRouterContracts','-timeout','60s','./...'], cwd=ROOT/'target/http-clients/go', env=environment, check=True)
        subprocess.run(['php',str(ROOT/'experiments/issue-697/http-clients/php.php'),str(ROOT/'target/http-clients/php')], env=environment, check=True)
        java = ROOT/'target/http-clients/java'
        classpath = os.pathsep.join([str(java/'target/classes'), str(java/'target/test-classes'), (java/'target/classpath').read_text().strip()])
        subprocess.run(['java','-Xmx256m','-cp',classpath,'router.client.RouterProbe'], env=environment, check=True)
finally:
    if process is not None:
        import signal
        try: os.killpg(process.pid, signal.SIGKILL)
        except ProcessLookupError: pass
        process.wait()
    upstream.close(); home.close()
