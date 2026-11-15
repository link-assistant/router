#!/usr/bin/env python3
"""Run the complete gate test file against its pre-fix and current module."""
import hashlib
import json
from pathlib import Path
import subprocess
import tempfile

root = Path(__file__).resolve().parents[2]
directory = root / 'ci-logs/issue-784-restart-2'
test_path = root / 'scripts/test/check-js-first-local.test.mjs'
test = test_path.read_text()
original = subprocess.check_output([
    'git', 'show', '579511eee1cd9de9aa01ce51b73b5c4145d0526f:scripts/check-js-first-local.mjs'
], cwd=root).decode()
node = root / 'experiments/issue-784/toolchain/node20/bin/node'
rows = []
for variant in ['before', 'after']:
    with tempfile.TemporaryDirectory(prefix='.gate-fingerprint-', dir=Path(__file__).parent) as temporary:
        temporary = Path(temporary).resolve()
        module = temporary / 'original.mjs'
        module.write_text(original)
        selected = module if variant == 'before' else root / 'scripts/check-js-first-local.mjs'
        full = test
        imports = {
            './check-profile-typescript.test.mjs': root / 'scripts/test/check-profile-typescript.test.mjs',
            '../check-js-first-local.mjs': selected,
            '../review-translation-draft.mjs': root / 'scripts/review-translation-draft.mjs',
        }
        for name, path in imports.items():
            literal = "'" + name + "'"
            if full.count(literal) != 1:
                raise RuntimeError('Exact complete test import required: ' + name)
            full = full.replace(literal, json.dumps(path.as_uri()))
        full = full.replace('import.meta.url', json.dumps(test_path.as_uri()))
        case = temporary / 'complete.test.mjs'
        case.write_text(full)
        command = [str(node), '--max-old-space-size=768', '--test', '--test-concurrency=1', str(case)]
        path = directory / ('gate-fingerprint-' + variant + '.log')
        with path.open('xb') as output:
            result = subprocess.run(command, cwd=root, stdout=output, stderr=subprocess.STDOUT)
        row = {'variant': variant, 'command': command, 'exitCode': result.returncode,
               'completeTestSha256': hashlib.sha256(test.encode()).hexdigest(),
               'boundTestSha256': hashlib.sha256(full.encode()).hexdigest(),
               'moduleSha256': hashlib.sha256(selected.read_bytes()).hexdigest(),
               'scope': 'Entire test file; only three exact imports and original import.meta URL rebound. Original assertions, cases and source deadlines preserved. Temporary files removed after process termination.'}
        rows.append(row)
        print(json.dumps(row), flush=True)
        if (result.returncode == 0) != (variant == 'after'):
            raise RuntimeError('Expected the new resource regression to fail before and pass after')
with (directory / 'gate-fingerprint-before-after.json').open('x') as output:
    json.dump(rows, output)
    output.write('\n')
