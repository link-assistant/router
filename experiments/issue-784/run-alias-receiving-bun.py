"""Run each complete affected receiving file in a fresh sequential Bun process."""
import hashlib
import json
from pathlib import Path
import subprocess

root = Path(__file__).resolve().parents[2]
directory = root / 'ci-logs/issue-784-restart-2'
names = [
    'builtin-json-equality-hint', 'builtin-plan-json-composition',
    'builtin-proof-json-composition', 'completed-json-eligibility',
    'builtin-source-meta-string-keys', 'source-producer-freshness',
    'source-producer-evolution', 'invocation-local-freezer', 'static-source-release',
]
inputs = [root / 'tools/translation/test' / (name + '.test.mjs') for name in names]
inputs += [root / 'tools/translation' / name for name in [
    'compiler-alias-source-evolution.mjs', 'prepare-compiler-alias-history.mjs',
    'prepare-builtin-source-meta-string-keys.mjs',
    'test/fixtures/compiler-data-alias-history.mjs',
    'proof-scanner-source-evolution.mjs', 'prepare-invocation-local-freezer.mjs',
    'prepare-static-source-release.mjs', 'prepare-real-source-fixtures.mjs',
    'extensions/original-class-definition-birth.mjs',
    'prepare-original-class-birth.mjs', 'extensions/host-contracts.mjs',
]]


def identities():
    rows = []
    for path in inputs:
        with path.open('rb') as source:
            digest = hashlib.file_digest(source, 'sha256').hexdigest()
        rows.append({'path': path.relative_to(root).as_posix(),
                     'bytes': path.stat().st_size, 'sha256': digest})
    return rows


target = directory / 'alias-existing-bun-results.json'
if target.exists() or any((directory / ('alias-existing-bun-' + name + '.log')).exists()
                          for name in names):
    raise RuntimeError('Refusing to overwrite a receiving attempt')
before = identities()
results = []
for index, name in enumerate(names):
    log = directory / ('alias-existing-bun-' + name + '.log')
    receipt = directory / ('alias-existing-bun-' + name + '-memory.json')
    command = ['python3', 'experiments/issue-784/run-observed-check.py',
               '--log', str(log.relative_to(root)),
               '--receipt', str(receipt.relative_to(root)), '--',
               'bun', 'test', '--max-concurrency=1',
               'tools/translation/test/' + name + '.test.mjs']
    completed = subprocess.run(command, cwd=root, check=False)
    observation = json.loads(receipt.read_text()) if receipt.exists() else None
    results.append({'name': name, 'exitCode': completed.returncode,
                    'log': log.relative_to(root).as_posix(),
                    'receipt': receipt.relative_to(root).as_posix(),
                    'observation': observation})
    print(json.dumps({'completed': name, 'exitCode': completed.returncode}), flush=True)
    if observation is None or observation['stopped']:
        break
after = identities()
unrun = names[len(results):]
passed = before == after and not unrun and all(row['exitCode'] == 0 for row in results)
with target.open('x') as output:
    json.dump({'engine': subprocess.check_output(['bun', '--version']).decode().strip(),
               'sourceHead': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=root).decode().strip(),
               'inputsBefore': before, 'inputsAfter': after, 'inputsUnchanged': before == after,
               'results': results, 'unrun': unrun, 'passed': passed,
               'scope': 'Complete original files, fresh sequential processes, unchanged case deadlines.'}, output, indent=2)
    output.write('\n')
raise SystemExit(0 if passed else 1)
