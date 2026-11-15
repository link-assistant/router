"""Receive all original Core cases and both complete DAG control files."""
import json
from pathlib import Path
import subprocess

base = Path('ci-logs/issue-784-restart-2')
groups = [
    ('core', ['whole-owner-core-producer-candidate']),
    ('controls', ['complete-closed-json-dag-hook-wire', 'closed-json-dag-byte-index']),
]
results = []
for engine in ['node', 'bun']:
    for label, names in groups:
        leaves = [names] if engine == 'node' else [[name] for name in names]
        for names in leaves:
            label = label if engine == 'node' else names[0]
            prefix = 'core-hook-dag-' + engine + '-' + label
            files = ['tools/translation/test/' + name + '.test.mjs' for name in names]
            command = (['node', 'scripts/run-node-tests.mjs', '--test-concurrency=1']
                       if engine == 'node' else ['bun', 'test']) + files
            observed = ['python3', '-B', 'experiments/issue-784/run-observed-check.py',
                        '--log', str(base / (prefix + '.log')),
                        '--receipt', str(base / (prefix + '-resource.json')), '--', *command]
            row = dict(engine=engine, label=label, files=files,
                       exitCode=subprocess.run(observed).returncode)
            results.append(row)
            print(json.dumps(row), flush=True)
with (base / 'core-hook-dag-summary.json').open('x') as stream:
    json.dump(dict(results=results, originalLimitsChanged=False,
                   completeGate=False, productionExecutableGain=0), stream)
raise SystemExit(0 if all(row['exitCode'] == 0 for row in results) else 1)
