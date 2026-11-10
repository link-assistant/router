"""Run the complete affected graph/history cohorts sequentially in both engines.

Keep every failure and original deadline. The independent Node audit and Bun
duration comparison are still required; this script never issues a green gate.
"""
import json
from pathlib import Path
import subprocess

names = ['project-ingress-native-boundary', 'whole-owner-core-producer-candidate',
         'project-concrete-batch', 'project-concrete-review',
         'project-progress-source-history', 'core-adoption-progress',
         'project-namespace-progress', 'project-rule-pipeline',
         'project-enclosing-namespace']
base = Path('ci-logs/issue-784-restart-2')
results = []
for engine in ['node', 'bun']:
    groups = [names] if engine == 'node' else [[name] for name in names]
    for group in groups:
        label = 'complete' if engine == 'node' else group[0]
        prefix = 'project-ingress-after-' + engine + '-' + label
        files = ['tools/translation/test/' + name + '.test.mjs' for name in group]
        leaf = (['node', 'scripts/run-node-tests.mjs', '--test-concurrency=1']
                if engine == 'node' else ['bun', 'test']) + files
        command = ['python3', '-B', 'experiments/issue-784/run-observed-check.py',
                   '--log', str(base / (prefix + '.log')),
                   '--receipt', str(base / (prefix + '-resource.json')), '--', *leaf]
        result = subprocess.run(command)
        results.append(dict(engine=engine, files=files, exitCode=result.returncode))
        print(json.dumps(results[-1]), flush=True)
with (base / 'project-ingress-after-summary.json').open('x') as stream:
    json.dump(dict(results=results, completeGate=False,
                   bunDeadlinesIndependentlyCompared=False,
                   productionExecutableGain=0, runtimeParity=False), stream, indent=2)
raise SystemExit(0 if all(row['exitCode'] == 0 for row in results) else 1)
