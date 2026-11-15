"""Complete receiving group in fresh sequential Bun processes; no test filtering."""
import hashlib
import json
from pathlib import Path
import subprocess
import sys

root = Path.cwd()
base = root / 'ci-logs/issue-784-restart-2'
files = ['cohort-target-compiler', 'typed-target-compiler',
         'enclosing-source-composition', 'method-namespace-registry',
         'owned-enclosing-module-bindings', 'project-enclosing-namespace',
         'project-facade-retention', 'project-method-owner-scope',
         'project-method-refusals', 'source-method-project']
paths = ['tools/translation/test/' + name + '.test.mjs' for name in files]
def inputs():
    return [{'path': path, 'sha256': hashlib.sha256((root / path).read_bytes()).hexdigest()}
            for path in paths + ['tools/translation/project.mjs',
                                 'tools/translation/test/target-compiler.mjs',
                                 'tools/translation/test/cohort-targets.mjs',
                                 'tools/translation/test/typed-targets.mjs']]
before = inputs()
records = []
for name, path in zip(files, paths):
    prefix = 'method-fresh-bun-' + name
    receipt = base / (prefix + '.memory.json')
    command = [sys.executable, '-B', 'experiments/issue-784/run-observed-check.py',
               '--log', str(base / (prefix + '.log')), '--receipt', str(receipt),
               '--', 'bun', 'test', './' + path]
    result = subprocess.run(command, cwd=root, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    print(result.stdout.decode(), end='', flush=True)
    record = {'file': path, 'observerExitCode': result.returncode,
              'resource': json.loads(receipt.read_bytes()) if receipt.exists() else None}
    records.append(record)
after = inputs()
report = {'schema': 'complete-method-receiving-fresh-bun-v1',
          'before': before, 'after': after, 'inputsUnchanged': before == after,
          'records': records, 'allCompleteFilesPassed':
          before == after and all(row['observerExitCode'] == 0 for row in records),
          'originalCasesAndDeadlinesUnchanged': True,
          'runtimeParity': False, 'fullGateQualified': False}
with (base / 'method-fresh-bun-receipt.json').open('x') as output:
    json.dump(report, output)
raise SystemExit(0 if report['allCompleteFilesPassed'] else 1)
