#!/usr/bin/env python3
"""Run the actual embedded remote consumers with old/new inventory fixtures."""
import json
import re
import subprocess
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BASELINE = '--baseline' in sys.argv
if BASELINE:
    sys.argv.remove('--baseline')


def source(name):
    path = 'src/deploy/' + name
    if BASELINE:
        return subprocess.check_output(['git', 'show', 'origin/main:' + path], cwd=ROOT, text=True)
    return (ROOT / path).read_text()


class RemoteInventories(unittest.TestCase):
    record = {'id': 'fixture', 'label': 'deploy', 'revoked': False,
              'expires_at': 4_294_967_295, 'client_kind': 'codex', 'principal_id': 'fixture'}

    def run_consumer(self, kind, document):
        if kind == 'deploy-token':
            script = re.search(r"docker exec -i .*? bun -e '\n(.*?)' >/dev/null", source('remote_settings.sh'), re.S)[1]
            answer = subprocess.run(['bun', '-e', script], input=json.dumps(document), text=True,
                                    capture_output=True, timeout=10)
        elif kind == 'checkpoint':
            script = source('data_checkpoint.js').split("if (inventory.status !== 0)", 1)[1]
            script = script.split("save('tokens.json'", 1)[0]
            prefix = 'const inventory=' + json.dumps({'status': 0, 'stdout': json.dumps(document)}) + ';'
            answer = subprocess.run(['bun', '-e', prefix + 'if(inventory.status!==0)' + script +
                                     'process.exit(records.length===1?0:1);'],
                                    text=True, capture_output=True, timeout=10)
        else:
            script = source('remote_agent.sh').split('const inventory=spawnSync(', 1)[1]
            script = script.split('const catalogs=[];', 1)[0]
            # Inject only the process response; execute the real decoder/filter.
            script = script.split(';', 1)[1]
            prefix = 'const inventory=' + json.dumps({'status': 0, 'stdout': json.dumps(document)}) + ';'
            answer = subprocess.run(['bun', '-e', prefix + script + 'process.exit(records.length===1?0:1);'],
                                    text=True, capture_output=True, timeout=10)
        return answer.returncode

    def test_legacy_inventory_is_preserved(self):
        for kind in ['deploy-token', 'preservation', 'checkpoint']:
            with self.subTest(kind=kind):
                self.assertEqual(self.run_consumer(kind, [self.record]), 0)

    def test_versioned_inventory_is_preserved(self):
        document = {'schema': 'link-assistant-router/tokens-list/v1', 'operation': 'tokens.list',
                    'success': True, 'exit_code': 0, 'data': [self.record], 'diagnostics': []}
        for kind in ['deploy-token', 'preservation', 'checkpoint']:
            with self.subTest(kind=kind):
                self.assertEqual(self.run_consumer(kind, document), 0)

    def test_failed_inventory_is_not_treated_as_valid(self):
        for kind in ['deploy-token', 'preservation', 'checkpoint']:
            with self.subTest(kind=kind):
                self.assertNotEqual(self.run_consumer(kind, {'operation': 'tokens.list', 'success': False,
                                                            'data': [self.record]}), 0)

    def test_unrelated_operation_is_not_treated_as_an_inventory(self):
        for kind in ['deploy-token', 'preservation', 'checkpoint']:
            with self.subTest(kind=kind):
                self.assertNotEqual(self.run_consumer(kind, {'operation': 'providers.list', 'success': True,
                                                            'data': [self.record]}), 0)


if __name__ == '__main__':
    unittest.main()
