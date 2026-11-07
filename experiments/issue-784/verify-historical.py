"""Run complete affected files sequentially; preserve original case deadlines."""
import json
import subprocess
from pathlib import Path

folder = Path('tools/translation/js-to-rust/test')
names = ['callback-inputs', 'captured-primitives', 'closures', 'completions',
         'historical-native-source', 'implicit-completion', 'scoped-payloads',
         'sequence-patterns', 'source-calls', 'source-constructors',
         'static-native-performance']
files = [str(folder / (name + '.test.mjs')) for name in names]
results = []
output = Path('experiments/issue-784')

def run(label, command):
    path = output / (label + '.log')
    with path.open('wb') as log:
        result = subprocess.run(command, stdout=log, stderr=subprocess.STDOUT)
    results.append({'label': label, 'command': command, 'exitCode': result.returncode,
                    'completeLog': str(path)})
    (output / 'historical-checks.json').write_text(json.dumps(results, indent=2) + '\n')
    print(label, result.returncode, flush=True)

run('historical-node-repaired', ['node', 'scripts/run-node-tests.mjs',
    '--outer-timeout-ms=900000', '--test-concurrency=1', *files])
for name, path in zip(names, files):
    run('historical-bun-' + name, ['bun', 'test', path])
raise SystemExit(any(row['exitCode'] != 0 for row in results))
