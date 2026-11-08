"""Keep the full unit binding proposal, finite profile and receiving attempts."""
import base64
import gzip
import hashlib
import json
import os
from pathlib import Path
import subprocess

BASE = Path('ci-logs/issue-784-restart-2')
TARGET = Path('docs/case-studies/issue-784/evidence/current-named-unit-bindings.json.gz')
BASELINE = '619f93d8302388a09537f1a2847d0cc3eebcd047'
members = []


def retain(name, raw):
    members.append({'path': name, 'bytes': len(raw),
                    'sha256': hashlib.sha256(raw).hexdigest(),
                    'base64': base64.b64encode(raw).decode()})


for path in ['tools/translation/prepare-named-core-producers.mjs',
             'tools/translation/prepare-core-unit-matches.mjs']:
    retain('git:' + BASELINE + ':' + path,
           subprocess.check_output(['git', 'show', BASELINE + ':' + path]))
    retain(path, Path(path).read_bytes())
for path in ['tools/translation/prepare-core-unicode-predicates.mjs',
             'tools/translation/source-copy-native-bindings.mjs',
             'tools/translation/test/source-copy-module-bindings.test.mjs',
             'tools/translation/test/named-core-producers.test.mjs',
             'experiments/issue-784/profile-unit-source-preparation.mjs',
             'experiments/issue-784/review-named-unit-bindings.mjs', __file__]:
    retain(path, Path(path).read_bytes())
for prefix in ['current-unit-before-profile', 'current-named-unit-bindings-review',
               'current-unit-batch-node', 'current-unit-batch-bun',
               'current-unit-batch-bun-smol', 'current-unit-batch-bun-closed-pages']:
    for suffix in ['.log', '.memory.json', '.observer.log']:
        path = BASE / (prefix + suffix)
        retain(str(path), path.read_bytes())
for name in ['current-unit-before.cpuprofile', 'current-named-unit-bindings-proposal.json.gz',
             'current-named-unit-bindings-install.log', 'current-unit-bun-preflight-pages.json.gz',
             'current-unit-bun-preflight-pages.log']:
    path = BASE / name
    retain(str(path), path.read_bytes())
for path in sorted(Path('js/node_modules/.node-case-deadlines/complete-IhXvME').iterdir()):
    if path.is_file():
        retain(str(path), path.read_bytes())
audit = json.loads(Path('js/node_modules/.node-case-deadlines/complete-IhXvME/terminal.json').read_bytes())
assert audit['exitCode'] == 0 and audit['auditSummary']['passed']
attempts = {prefix: json.loads((BASE / (prefix + '.memory.json')).read_bytes())
            for prefix in ['current-unit-batch-bun', 'current-unit-batch-bun-smol',
                           'current-unit-batch-bun-closed-pages']}
record = {'schema': 'current-named-unit-bindings-receiving-v1', 'baseline': BASELINE,
          'fullNodeFilesPassed': True, 'nodeOriginalDeadlinesPassed': True,
          'bunAttempts': attempts, 'bunVersion': '1.4.4', 'ciBunVersion': '1.4.3',
          'finiteProfileIsBenchmark': False, 'measuredProductionFunctionGain': 0,
          'fullGatePassed': False, 'runtimeParity': False, 'rustExecuted': False,
          'members': members}
raw = json.dumps(record, separators=(',', ':')).encode()
packed = gzip.compress(raw, mtime=0)
total = 0
for root in ['ci-logs', 'docs/case-studies/issue-784', 'experiments/issue-784',
             'js/node_modules/.node-case-deadlines']:
    for parent, children, files in os.walk(root):
        if parent == 'experiments/issue-784':
            children[:] = [name for name in children if name != 'toolchain']
        total += sum((Path(parent) / name).stat().st_size for name in files
                     if not (Path(parent) / name).is_symlink())
assert total + (0 if TARGET.exists() else len(packed)) < 500_000_000
if TARGET.exists():
    assert TARGET.read_bytes() == packed
else:
    with TARGET.open('xb') as output:
        output.write(packed)
assert gzip.decompress(TARGET.read_bytes()) == raw
for row in json.loads(raw)['members']:
    restored = base64.b64decode(row['base64'], validate=True)
    assert len(restored) == row['bytes'] and hashlib.sha256(restored).hexdigest() == row['sha256']
print(json.dumps({'packet': str(TARGET), 'members': len(members), 'bytes': len(packed),
                  'nodeWholeFilesQualified': True, 'fullGateQualified': False,
                  'bunExitCodes': {name: row['exitCode'] for name, row in attempts.items()}}))
