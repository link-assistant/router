"""Run full source-contract cases and the separate finite scalar trace probe."""
import json
from pathlib import Path
import subprocess

base = Path('ci-logs/issue-784-restart-2')
case = 'tools/translation/test/native-buffer-json-dag-source.test.mjs'
commands = [
    ('source-node', ['node', 'scripts/run-node-tests.mjs', '--test-concurrency=1', case]),
    ('source-bun', ['bun', 'test', case]),
    ('traced-child', ['python3', '-B', 'experiments/issue-784/check-core-hook-native-buffer-trace.py']),
]
results = []
for label, command in commands:
    prefix = 'native-buffer-json-dag-' + label
    status = subprocess.run(['python3', '-B', 'experiments/issue-784/run-observed-check.py',
                             '--log', str(base / (prefix + '.log')),
                             '--receipt', str(base / (prefix + '-resource.json')), '--', *command]).returncode
    row = dict(label=label, command=command, exitCode=status)
    results.append(row)
    print(json.dumps(row), flush=True)
with (base / 'native-buffer-json-dag-source-trace-summary.json').open('x') as stream:
    json.dump(dict(results=results, originalLimitsChanged=False,
                   diagnosticChildQualifiesOriginalDeadline=False,
                   fullGatePassed=False, productionExecutableGain=0), stream)
raise SystemExit(0 if all(row['exitCode'] == 0 for row in results) else 1)
