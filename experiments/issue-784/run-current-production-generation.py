"""Generate every complete production output family, sequentially and unfiltered."""
import argparse
import json
from pathlib import Path
import subprocess
import sys

base = Path('ci-logs/issue-784-restart-2')
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--prefix', default='receiving-batch')
args = parser.parse_args()
if not args.prefix or any(character not in 'abcdefghijklmnopqrstuvwxyz0123456789-' for character in args.prefix):
    parser.error('a simple unique lowercase evidence prefix is required')
report_path = base / (args.prefix + '-generation.json')
head = subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip()
choices = [
    ('canonical', []),
    ('owned-canonical', ['--retain-output-text', '--owned-core-definitions']),
    ('profile-matrix', ['--profile-matrix']),
    ('owned-profile-matrix', ['--retain-output-text', '--owned-core-definitions', '--profile-matrix']),
]
records = []
if report_path.exists() or any((base / (args.prefix + '-generate-' + label + suffix)).exists()
                              for label, _ in choices for suffix in ['.log', '.memory.json']):
    raise RuntimeError('Refusing to overwrite any complete or interrupted generation evidence')
for label, arguments in choices:
    prefix = base / (args.prefix + '-generate-' + label)
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
with report_path.open('x') as output:
    json.dump(report, output)
raise SystemExit(0 if report['allCommandsPassed'] else 1)
