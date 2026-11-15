"""Complete source checks in sequence; retain every result including failures."""
import json
import subprocess
from pathlib import Path

commands = [
    ('assets', ['node', 'scripts/sync-rust-assets.mjs', '--check']),
    ('bun-reverse-source', ['node', 'scripts/prepare-bun-reverse-files.mjs', '--check']),
    ('syntax', ['node', 'scripts/lint-js-first.mjs']),
    ('workflow', ['node', 'scripts/check-js-first-workflows.mjs']),
    ('api-types', ['npm', 'run', 'typecheck', '--prefix', 'js']),
    ('native-api-types', ['npm', 'run', 'native:typecheck', '--prefix', 'js']),
    ('native-node', ['npm', 'run', 'native:test', '--prefix', 'js']),
    ('native-bun', ['npm', 'run', 'native:test:bun', '--prefix', 'js']),
    ('native-ts-freshness', ['node', 'scripts/regenerate-native-typescript.mjs', '--check']),
    ('native-ts-strict', ['node', 'scripts/check-native-typescript.mjs']),
    ('native-ts-complete', ['node', 'scripts/run-node-tests.mjs',
                            '--outer-timeout-ms=900000',
                            'tools/translation/js-to-rust/test/native-typescript.test.mjs']),
    ('strict-parity', ['node', 'scripts/check-router-parity.mjs', '--strict']),
]
output = Path('experiments/issue-784')
results = []
for label, command in commands:
    path = output / ('final-' + label + '.log')
    with path.open('wb') as log:
        result = subprocess.run(command, stdout=log, stderr=subprocess.STDOUT)
    results.append({'label': label, 'command': command, 'exitCode': result.returncode,
                    'completeLog': str(path)})
    (output / 'final-checks.json').write_text(json.dumps(results, indent=2) + '\n')
    print(label, result.returncode, flush=True)
raise SystemExit(any(row['exitCode'] != 0 for row in results))
