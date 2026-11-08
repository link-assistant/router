"""Supplement the immutable ASCII packet with complete final regression evidence."""
import base64
import gzip
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess

base = Path('ci-logs/issue-784-restart-2')
target = Path('docs/case-studies/issue-784/evidence/current-ascii-predecessor.json.gz')
members = []


def retain(path, raw):
    members.append(dict(path=str(path), bytes=len(raw),
                        sha256=hashlib.sha256(raw).hexdigest(),
                        base64=base64.b64encode(raw).decode()))


for label in ['current-ascii-predecessor-node', 'current-ascii-predecessor-bun',
              'current-ascii-predecessor-portable-node', 'current-ascii-predecessor-portable-bun']:
    for suffix in ['.log', '.memory.json', '.observer.log']:
        path = base / (label + suffix)
        retain(path, path.read_bytes())
    receipt = json.loads((base / (label + '.memory.json')).read_bytes())
    assert receipt['stopThresholdBytes'] == 2866933760
    assert not Path('/proc/' + str(receipt['pid'])).exists()
    for name in re.findall(r'^Complete Node deadline evidence: (.*)$',
                           (base / (label + '.log')).read_text(), re.M):
        directory = Path(name)
        terminal = json.loads((directory / 'terminal.json').read_bytes())
        assert terminal['childClosed'] and terminal['groupCleanup']['complete']
        for path in sorted(directory.rglob('*')):
            if path.is_file():
                retain(path, path.read_bytes())

paths = [
    'tools/translation/test/core-ascii-predecessor.test.mjs',
    'tools/translation/test/router-core-ascii-assets.test.mjs',
    'experiments/issue-784/core-ascii-predecessor-node-observer-original.mjs',
    'experiments/issue-784/current-ascii-deadline-plan.md',
    'experiments/issue-784/retain-ascii-predecessor-evidence.py',
    'docs/case-studies/issue-784/current-ascii-sequential.md',
]
for name in paths:
    retain(name, Path(name).read_bytes())
original = subprocess.check_output(['git', 'show',
    '3eb70fab0:tools/translation/test/router-core-ascii-assets.test.mjs'])
assert original == Path(paths[1]).read_bytes()
retain('git:3eb70fab0:' + paths[1], original)
raw = json.dumps(dict(schema='complete-ascii-predecessor-evidence-v1', members=members,
                     originalWholeAsciiTestUnchanged=True, fullGatePassed=False,
                     productionExecutableGain=0, rustExecuted=False), separators=(',', ':')).encode()
packed = gzip.compress(raw, mtime=0)
total = 0
for root in ['ci-logs', 'docs/case-studies/issue-784', 'experiments/issue-784',
             'js/node_modules/.node-case-deadlines']:
    for parent, directories, files in os.walk(root):
        if parent == 'experiments/issue-784':
            directories[:] = [name for name in directories if name != 'toolchain']
        total += sum((Path(parent) / name).stat().st_size for name in files
                     if not (Path(parent) / name).is_symlink())
assert total + len(packed) < 500000000
with target.open('xb') as output:
    output.write(packed)
assert gzip.decompress(target.read_bytes()) == raw
for row in json.loads(gzip.decompress(target.read_bytes()))['members']:
    restored = base64.b64decode(row['base64'], validate=True)
    assert len(restored) == row['bytes'] and hashlib.sha256(restored).hexdigest() == row['sha256']
print(json.dumps(dict(path=str(target), bytes=len(packed), members=len(members),
                      completeReadbackVerified=True, evidenceBytesAfter=total + len(packed))))
