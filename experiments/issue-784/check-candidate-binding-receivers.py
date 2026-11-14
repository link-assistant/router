"""Execute every affected complete receiving file in both installed engines.

One resource-intensive child runs at a time. The Node runner independently
audits original lexical case deadlines. Bun uses a fresh process per full file;
its complete durations require separate comparison against those same limits.
Every failure is retained and later files still run. No test filtering occurs.
"""
import json
from pathlib import Path
import subprocess

names = ['source-copy-native-bindings', 'source-copy-module-bindings',
         'whole-owner-derive-candidate', 'whole-owner-resolver-candidate',
         'whole-owner-core-producer-candidate', 'whole-owner-core-corpus-candidate',
         'source-backed-core-sequence-stream', 'whole-owner-proof-byte-candidate',
         'proof-byte-core-stream-candidate', 'batched-proof-byte-source-candidate',
         'whole-owner-source-cst-batch']
base = Path('ci-logs/issue-784-restart-2')
results = []
for engine in ['node', 'bun']:
    groups = [names] if engine == 'node' else [[name] for name in names]
    for group in groups:
        label = 'complete' if engine == 'node' else group[0]
        prefix = 'binding-receiving-' + engine + '-' + label
        files = ['tools/translation/test/' + name + '.test.mjs' for name in group]
        leaf = (['node', 'scripts/run-node-tests.mjs', '--test-concurrency=1']
                if engine == 'node' else ['bun', 'test']) + files
        command = ['python3', '-B', 'experiments/issue-784/run-observed-check.py',
                   '--log', str(base / (prefix + '.log')),
                   '--receipt', str(base / (prefix + '-resource.json')), '--', *leaf]
        result = subprocess.run(command)
        results.append(dict(engine=engine, files=files, exitCode=result.returncode))
        print(json.dumps(results[-1]), flush=True)
with (base / 'binding-receiving-summary.json').open('x') as stream:
    json.dump(dict(results=results, completeGate=False,
                   bunDeadlinesIndependentlyCompared=False,
                   productionExecutableGain=0, runtimeParity=False), stream, indent=2)
raise SystemExit(0 if all(row['exitCode'] == 0 for row in results) else 1)
