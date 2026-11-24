"""Retain source-mismatch repair with its failed/unrun receiving evidence."""
import base64
import gzip
import hashlib
import json
import os
from pathlib import Path
import subprocess

BASE = Path('ci-logs/issue-784-restart-2')
TARGET = Path('docs/case-studies/issue-784/evidence/current-named-core-host-repair.json.gz')
baseline = '4e9fad88f28552f9e78da53084e4dcc50fdbe3c3'
paths = ['tools/translation/prepare-named-core-producers.mjs',
         'tools/translation/test/named-core-producers.test.mjs']
members = []


def retain(name, raw):
    members.append({'path': name, 'bytes': len(raw),
                    'sha256': hashlib.sha256(raw).hexdigest(),
                    'base64': base64.b64encode(raw).decode()})


for path in paths:
    retain('git:' + baseline + ':' + path,
           subprocess.check_output(['git', 'show', baseline + ':' + path]))
    retain(path, Path(path).read_bytes())
for path in ['tools/translation/prepare-core-unit-matches.mjs',
             'tools/translation/prepare-core-unicode-predicates.mjs',
             'experiments/issue-784/profile-current-named-core-process.mjs', __file__]:
    retain(path, Path(path).read_bytes())
for prefix in ['current-named-core-before', 'current-named-core-after-node',
               'current-named-core-after-bun']:
    for suffix in ['.log', '.memory.json', '.observer.log']:
        path = BASE / (prefix + suffix)
        retain(str(path), path.read_bytes())
for name in ['current-named-core-producer-check.log', 'current-named-core-before-profile.log']:
    path = BASE / name
    retain(str(path), path.read_bytes())
for name in ['complete-2qguij', 'complete-i4SRMa']:
    directory = Path('js/node_modules/.node-case-deadlines') / name
    for path in sorted(directory.rglob('*')):
        if path.is_file():
            retain(str(path), path.read_bytes())
before = json.loads((BASE / 'current-named-core-before.memory.json').read_bytes())
after = json.loads((BASE / 'current-named-core-after-node.memory.json').read_bytes())
bun = json.loads((BASE / 'current-named-core-after-bun.memory.json').read_bytes())
assert before['exitCode'] == after['exitCode'] == 1
assert not before['stopped'] and not after['stopped']
assert bun['exitCode'] == 143 and bun['stopped']
record = {'schema': 'current-named-core-host-repair-v1', 'baseline': baseline,
          'producerFreshnessPassed': True, 'nodeBehavioralPasses': 6,
          'nodeOriginalDeadlineBreaches': 1, 'nodeWholeFileQualified': False,
          'bunCompletedPasses': 4, 'bunRemainingCases': 'unrun after resource stop',
          'bunWholeFileQualified': False, 'profiler': 'Refused before signal: target already exited; no CPU samples.',
          'members': members, 'measuredProductionFunctionGain': 0,
          'fullGatePassed': False, 'runtimeParity': False, 'rustExecuted': False}
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
    with TARGET.open('xb') as stream:
        stream.write(packed)
assert gzip.decompress(TARGET.read_bytes()) == raw
for row in json.loads(raw)['members']:
    restored = base64.b64decode(row['base64'], validate=True)
    assert len(restored) == row['bytes'] and hashlib.sha256(restored).hexdigest() == row['sha256']
print(json.dumps({'packet': str(TARGET), 'bytes': len(packed), 'members': len(members),
                  'nodeQualified': False, 'bunQualified': False}))
