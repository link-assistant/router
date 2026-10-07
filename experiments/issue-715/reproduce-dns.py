#!/usr/bin/env python3
"""Bounded real Docker reproduction of the published named-instance DNS defect.

Use --fixed with a rebuilt CLI to require a resolving <=63-byte backend and
healthy relay instead. The backend/relay run the immutable published image.
All subprocesses/containers belong to this fixture and are cleaned up.
"""
import argparse
import json
import os
from pathlib import Path
import subprocess
import tempfile
import time
import uuid

ROOT = Path(__file__).resolve().parents[2]
IMAGE = 'ghcr.io/link-assistant/router@sha256:7e2a4c543b22274a83934eaff26797b34716a1778c67d25dc8e38e987ea52c7a'


def docker(*args, check=True):
    return subprocess.run(['docker', *args], capture_output=True, text=True, check=check)


def probe(container, host):
    script = "try { const r = await fetch(" + json.dumps(f'http://{host}:8080/api/health') + ", {signal: AbortSignal.timeout(5000)}); console.log(r.status); } catch(e) { console.log(e.code || e.message); process.exitCode=1; }"
    return docker('exec', container, 'bun', '-e', script, check=False)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--binary', type=Path)
    parser.add_argument('--image', default=IMAGE)
    parser.add_argument('--fixed', action='store_true')
    args = parser.parse_args()
    image = args.image
    binary = args.binary
    if binary is None:
        binary = ROOT/'target/issue-715-published-router'
        binary.parent.mkdir(parents=True, exist_ok=True)
        container = docker('create', image).stdout.strip()
        try:
            docker('cp', f'{container}:/usr/local/bin/link-assistant-router', str(binary))
        finally:
            docker('rm', container)
        binary.chmod(0o700)
    for length in [13, 32]:
        instance = 'n' + uuid.uuid4().hex[:length-1]
        with tempfile.TemporaryDirectory(prefix='issue-715-dns-') as temporary:
            root = Path(temporary)
            env = {**os.environ, 'HOME': temporary, 'CLAUDE_CONFIG_DIR': str(root/'.claude'), 'TOKEN_SECRET': 'issue-715-fixture-secret'}
            import socket
            with socket.socket() as listener:
                listener.bind(('127.0.0.1', 0))
                port = listener.getsockname()[1]
            log = ROOT/'ci-logs'/f'dns-{length}-{"fixed" if args.fixed else "before"}.log'
            log.parent.mkdir(parents=True, exist_ok=True)
            with log.open('w') as output:
                process = subprocess.Popen([str(binary.resolve()), 'deploy', '--instance', instance, '--mode', 'container', '--claude-credentials', 'isolated', '--image', image, '--root', temporary, '--data-dir', str(root/'client-state'), '--port', str(port)], env=env, stdout=output, stderr=output)
                try:
                    deadline = time.monotonic()+90
                    while time.monotonic() < deadline and not (root/'state/current').exists():
                        if process.poll() is not None:
                            raise AssertionError(f'deployment exited early: {log.read_text()}')
                        time.sleep(.2)
                    assert (root/'state/current').exists(), 'candidate not selected within fixture budget'
                    backend = (root/'state/current').read_text().strip()
                    relay = f'router-deploy-relay-{instance}'
                    direct = probe(backend, '127.0.0.1')
                    named = probe(backend, backend)
                    print(f'{length}-character instance: backend length={len(backend)}, loopback={direct.stdout.strip()}, hostname={named.stdout.strip()}', flush=True)
                    assert direct.returncode == 0 and direct.stdout.strip() == '200'
                    if args.fixed:
                        assert len(backend) <= 63 and named.stdout.strip() == '200' and named.returncode == 0
                        assert probe(relay, backend).stdout.strip() == '200'
                        assert probe(relay, '127.0.0.1').stdout.strip() == '200'
                        assert process.wait(30) == 0
                    else:
                        assert len(backend) > 63 and named.returncode != 0
                finally:
                    if process.poll() is None:
                        process.terminate()
                        try:
                            process.wait(5)
                        except subprocess.TimeoutExpired:
                            process.kill(); process.wait()
                    owned = docker('ps', '-aq', '--filter', f'label=com.link-assistant.router.deploy.root={temporary}').stdout.split()
                    for container in owned:
                        docker('rm', '-f', container, check=False)
                    docker('network', 'rm', f'router-deploy-network-{instance}', check=False)
                    # The backend creates root-owned fixture files; remove only
                    # this owned temporary root's contents before TempDir cleanup.
                    docker('run', '--rm', '--entrypoint', '/bin/sh', '-v', f'{temporary}:/fixture', image, '-c', 'find /fixture -mindepth 1 -maxdepth 1 -exec rm -rf -- {} +')


if __name__ == '__main__':
    main()
