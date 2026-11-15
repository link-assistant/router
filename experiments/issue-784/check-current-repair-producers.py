"""Run complete receiving checks sequentially with existing resource observation."""
import json
from pathlib import Path
import subprocess
import sys

base = Path('ci-logs/issue-784-restart-2')
checks = [
    ('guarded-import-current', ['node', 'tools/translation/prepare-guarded-proof-receiving-imports.mjs', '--check']),
    ('scan-import-current', ['node', 'tools/translation/prepare-guarded-proof-receiving-imports.mjs', '--check', '--scan-costs']),
    ('method-project-current', ['node', 'tools/translation/prepare-project-facade-retention.mjs', '--check']),
    ('owned-binding-current', ['node', 'tools/translation/prepare-owned-enclosing-bindings.mjs', '--check']),
    ('equation-current', ['node', 'tools/translation/prepare-concrete-equation-transaction.mjs', '--check']),
    ('equation-refusal-bun', ['bun', 'test', './tools/translation/test/private-parser-equation-refusal.test.mjs']),
    ('equation-original-node', ['node', 'scripts/run-node-tests.mjs', 'tools/translation/test/concrete-equation-transaction.test.mjs']),
    ('equation-original-bun', ['bun', 'test', './tools/translation/test/concrete-equation-transaction.test.mjs']),
]
records = []
for label, command in checks:
    prefix = base / ('current-repair-' + label)
    receipt = prefix.with_suffix('.memory.json')
    result = subprocess.run([sys.executable, '-B', 'experiments/issue-784/run-observed-check.py',
                             '--log', str(prefix.with_suffix('.log')), '--receipt', str(receipt),
                             '--', *command], stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    print(result.stdout.decode(), end='', flush=True)
    records.append({'label': label, 'exitCode': result.returncode,
                    'resource': json.loads(receipt.read_bytes()) if receipt.exists() else None})
report = {'schema': 'current-repair-complete-producer-checks-v1', 'records': records,
          'allPassed': all(row['exitCode'] == 0 for row in records), 'fullGateQualified': False}
with (base / 'current-repair-producer-checks.json').open('x') as output:
    json.dump(report, output)
raise SystemExit(0 if report['allPassed'] else 1)
