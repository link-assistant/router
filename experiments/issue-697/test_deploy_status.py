#!/usr/bin/env python3
"""Bounded real-binary status reproduction without a daemon or credentials."""
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]
BINARY = Path(os.environ.get("ROUTER_STATUS_BINARY", ROOT / "target/debug/router"))


class DeploymentStatus(unittest.TestCase):
    def check_status(self, mode, corrupt=False):
        with tempfile.TemporaryDirectory(prefix="router-status-") as directory:
            home = Path(directory)
            tools = home / "bin"
            tools.mkdir()
            docker = tools / "docker"
            docker.write_text("#!/usr/bin/python3\nimport sys\n"
                              "if sys.argv[1] in ('info', 'version'): print('25.0.0'); sys.exit(0)\n"
                              "sys.exit(1)\n")
            docker.chmod(0o700)
            root = home / "deploy"
            if corrupt:
                (root / "state").mkdir(parents=True)
                (root / "state/active").write_text("corrupt")
            env = {key: value for key, value in os.environ.items()
                   if not key.startswith(('ROUTER_', 'TOKEN_', 'SERVER_', 'LINK_ASSISTANT_ROUTER_SERVER',
                                          'LINK_ASSISTANT_ROUTER_TOKEN'))}
            env.update(HOME=str(home), XDG_CONFIG_HOME=str(home / '.config'),
                       PATH=str(tools), TOKEN_SECRET="isolated-status-fixture")
            result = subprocess.run([str(BINARY), 'deploy', '--mode', mode, '--image', 'fixture:v1.0.0',
                                     '--status', '--root', str(root), '--json'],
                                    env=env, capture_output=True, text=True, timeout=30)
            response = json.loads(result.stdout)
            data = response['data']
            self.assertEqual(data.get('schema'), 'link-assistant-router/local-deployment/v1', response)
            self.assertEqual(data['mode'], mode)
            self.assertEqual(data['deployment_root'], str(root))
            self.assertTrue(data['status_is_read_only'])
            self.assertIsNone(data['host_process'])
            self.assertIsInstance(data['blockers'], list)
            self.assertNotIn('output', data)
            return data

    def test_host_status(self):
        self.check_status('host')

    def test_container_status(self):
        self.check_status('container')

    def test_inconsistent_container_status(self):
        data = self.check_status('container', corrupt=True)
        self.assertEqual(data['status'], 'inconsistent')
        self.assertEqual(data['blockers'][0]['name'], 'inconsistent-state')


if __name__ == '__main__':
    unittest.main()
