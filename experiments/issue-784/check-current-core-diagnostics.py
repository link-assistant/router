"""Sequential finite diagnostics; none installs source or qualifies deadlines."""
import json
from pathlib import Path
import subprocess

base = Path('ci-logs/issue-784-restart-2')
checks = [
    ('core-child-current-profile', ['python3', '-B', 'experiments/issue-784/check-profile-current-core-child.py']),
    ('large-native-buffer-node', ['node', 'experiments/issue-784/probe-large-native-buffer-callbacks.mjs']),
    ('large-native-buffer-bun', ['bun', 'experiments/issue-784/probe-large-native-buffer-callbacks.mjs']),
    ('private-native-descriptor-kind-draft', ['python3', '-B', 'experiments/issue-784/draft-private-native-descriptor-kind.py']),
    ('private-native-descriptor-kind-finite', ['node', 'experiments/issue-784/probe-private-native-descriptor-kind.mjs']),
]
results = []
for label, command in checks:
    status = subprocess.run(['python3', '-B', 'experiments/issue-784/run-observed-check.py',
                             '--log', str(base / (label + '.log')),
                             '--receipt', str(base / (label + '-resource.json')),
                             '--', *command]).returncode
    row = dict(label=label, command=command, exitCode=status)
    results.append(row)
    print(json.dumps(row), flush=True)
with (base / 'core-child-current-diagnostics-summary.json').open('x') as stream:
    json.dump(dict(results=results, sourceInstalled=False, receivingQualified=False,
                   originalDeadlinesQualified=False, productionExecutableGain=0), stream)
raise SystemExit(0 if all(row['exitCode'] == 0 for row in results) else 1)
