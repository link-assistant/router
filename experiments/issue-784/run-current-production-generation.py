"""Generate every complete production output family, sequentially and unfiltered."""
import json
from pathlib import Path
import subprocess
import sys

base = Path('ci-logs/issue-784-restart-2')
head = subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip()
choices = [
    ('canonical', []),
    ('owned-canonical', ['--retain-output-text', '--owned-core-definitions']),
    ('profile-matrix', ['--profile-matrix']),
    ('owned-profile-matrix', ['--retain-output-text', '--owned-core-definitions', '--profile-matrix']),
]
records = []
for label, arguments in choices:
    prefix = base / ('receiving-batch-generate-' + label)
    receipt = prefix.with_suffix('.memory.json')
    command = ['node', 'scripts/translate-router.mjs', '--progress', *arguments]
    result = subprocess.run([sys.executable, '-B', 'experiments/issue-784/run-observed-check.py',
                             '--log', str(prefix.with_suffix('.log')), '--receipt', str(receipt),
                             '--', *command], stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    print(result.stdout.decode(), end='', flush=True)
    records.append({'family': label, 'exitCode': result.returncode,
                    'resource': json.loads(receipt.read_bytes()) if receipt.exists() else None})
report = {'schema': 'complete-current-production-generation-v1', 'headAtStart': head,
          'headAtEnd': subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip(),
          'records': records, 'allCommandsPassed': all(row['exitCode'] == 0 for row in records),
          'freshnessChecksPassed': False, 'fullGateQualified': False, 'runtimeParity': False}
with (base / 'receiving-batch-generation.json').open('x') as output:
    json.dump(report, output)
raise SystemExit(0 if report['allCommandsPassed'] else 1)
