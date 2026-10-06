"""Bounded regression probes of Linux-verifier version selection, without Docker."""
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / 'scripts/verify-contracts-in-linux.sh'


class VersionSelection(unittest.TestCase):
    def run_policy(self, policy=None, missing=()):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            docker = root / 'docker'
            docker.write_text('#!/usr/bin/env python3\nimport json,os,sys\n'
                              'if sys.argv[1] != "info":\n'
                              ' print(json.dumps(sys.argv[1:]))\n')
            docker.chmod(0o755)
            for name, version in [('claude', '2.1.289'), ('codex', '0.158.0'), ('opencode', '1.19.1')]:
                if name not in missing:
                    client = root / name
                    client.write_text(f'#!/bin/sh\necho "{name} {version}"\n')
                    client.chmod(0o755)
            env = dict(os.environ, PATH=f'{root}:/usr/bin:/bin')
            for key in list(env):
                if key.startswith('ROUTER_REAL_CLIENT_'):
                    del env[key]
            args = ['bash', str(SCRIPT), '--area', 'real-clients']
            if policy:
                args += ['--client-versions', policy]
            result = subprocess.run(args, env=env, text=True, capture_output=True, timeout=20)
            self.assertEqual(result.returncode, 0, result.stderr)
            argv = json.loads(result.stdout)
            envs = {}
            for index, arg in enumerate(argv):
                if arg == '--env' and '=' in argv[index + 1]:
                    key, value = argv[index + 1].split('=', 1)
                    envs[key] = value
            return envs, argv, result.stderr

    def test_default_uses_installed_versions(self):
        envs, _, _ = self.run_policy()
        self.assertEqual(envs['ROUTER_REAL_CLIENT_CLAUDE_VERSION'], '2.1.289')
        self.assertEqual(envs['ROUTER_REAL_CLIENT_CODEX_VERSION'], '0.158.0')
        self.assertEqual(envs['ROUTER_REAL_CLIENT_CLAUDE_SOURCE'], 'installed')
        self.assertEqual(envs['ROUTER_REAL_CLIENT_CLAUDE_HOST_VERSION'], '2.1.289')

    def test_missing_client_falls_back_individually(self):
        envs, _, stderr = self.run_policy(missing=('opencode',))
        self.assertEqual(envs['ROUTER_REAL_CLIENT_CLAUDE_VERSION'], '2.1.289')
        self.assertEqual(envs['ROUTER_REAL_CLIENT_OPENCODE_VERSION'], '1.18.29')
        self.assertEqual(envs['ROUTER_REAL_CLIENT_OPENCODE_SOURCE'], 'ci-pin')
        self.assertIn('not installed', stderr)

    def test_ci_policy_is_consumed_and_reports_drift(self):
        envs, argv, stderr = self.run_policy('ci')
        self.assertEqual(envs['ROUTER_REAL_CLIENT_CLAUDE_VERSION'], '2.1.265')
        self.assertEqual(envs['ROUTER_REAL_CLIENT_CLAUDE_SOURCE'], 'ci-pin')
        self.assertNotIn('--client-versions', argv)
        self.assertIn('2.1.289', stderr)
        self.assertIn('warning', stderr)

    def test_latest_policy_is_consumed(self):
        envs, argv, _ = self.run_policy('latest')
        self.assertEqual(envs['ROUTER_REAL_CLIENT_CLAUDE_VERSION'], 'latest')
        self.assertEqual(envs['ROUTER_REAL_CLIENT_CLAUDE_SOURCE'], 'latest')
        self.assertNotIn('--client-versions', argv)


if __name__ == '__main__':
    unittest.main()
